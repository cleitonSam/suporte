import 'next-auth';
import type { UserType, UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      userType: UserType;
      role: UserRole;
      clientId: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    userType: UserType;
    role: UserRole;
    clientId: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    userType: UserType;
    role: UserRole;
    clientId: string | null;
  }
}
