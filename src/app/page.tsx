import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const userType = (session.user as any).userType;
  if (userType === 'AGENT') {
    redirect('/admin');
  }
  redirect('/portal');
}
