import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import { rateLimit, rateLimitReset, RATE_POLICIES } from './rate-limit';
import { audit } from './audit';
import { logger } from './logger';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();

        // Rate limit por email (melhor seria email+IP, mas o IP não chega aqui
        // de forma confiável dentro do authorize() — o middleware cuida da parte IP).
        const rl = rateLimit(`login:${email}`, RATE_POLICIES.login);
        if (!rl.allowed) {
          await audit({ action: 'auth.login_rate_limited', metadata: { email } });
          logger.warn({ email, resetMs: rl.resetMs }, '[auth] login rate-limited');
          return null;
        }

        const user = await db.user.findFirst({
          where: { email, deletedAt: null, isActive: true },
        });
        if (!user) {
          await audit({ action: 'auth.login_failed', metadata: { email, reason: 'not_found' } });
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          await audit({
            action: 'auth.login_failed',
            actorId: user.id,
            entity: 'User',
            entityId: user.id,
            metadata: { email, reason: 'bad_password' },
          });
          return null;
        }

        // Login OK — limpa rate limit do email
        rateLimitReset(`login:${email}`);

        db.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {});

        await audit({
          action: 'auth.login_success',
          actorId: user.id,
          entity: 'User',
          entityId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.userType,
          role: user.role,
          clientId: user.clientId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        // @ts-expect-error - we injected these on authorize()
        token.userType = user.userType;
        // @ts-expect-error
        token.role = user.role;
        // @ts-expect-error
        token.clientId = user.clientId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.userType = token.userType;
        session.user.role = token.role;
        session.user.clientId = token.clientId;
      }
      return session;
    },
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl;

      // Rotas públicas
      if (
        pathname === '/' ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/esqueci-senha') ||
        pathname.startsWith('/primeiro-acesso') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/cron') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon')
      ) {
        return true;
      }

      if (!auth) return false;

      const userType = (auth.user as any)?.userType;

      if (pathname.startsWith('/admin')) {
        return userType === 'AGENT';
      }
      if (pathname.startsWith('/portal')) {
        return userType === 'CLIENT_CONTACT' || userType === 'AGENT';
      }

      return true;
    },
  },
});
