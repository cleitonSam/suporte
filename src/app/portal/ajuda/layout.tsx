import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function AjudaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userLoggedIn = !!session?.user;

  return (
    <>
      {children}
    </>
  );
}
