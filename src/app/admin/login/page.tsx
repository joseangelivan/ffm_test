import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin } from '@/actions/auth';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'your-super-secret-key-that-is-at-least-32-bytes-long'
);

async function getSession(token?: string) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (error) {
        return null;
    }
}

export default async function AdminLoginPage() {
  const sessionToken = cookies().get('session')?.value;
  const session = await getSession(sessionToken);

  if (session) {
    redirect('/admin/dashboard');
  }

  return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}
