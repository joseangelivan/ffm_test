import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin } from '@/actions/auth';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-key-that-is-at-least-32-bytes-long');

export default async function AdminLoginPage() {
  const sessionCookie = cookies().get('session');

  if (sessionCookie) {
    try {
      // If the token is valid, redirect to the dashboard
      await jwtVerify(sessionCookie.value, JWT_SECRET);
      redirect('/admin/dashboard');
    } catch (e) {
      // Token is invalid or expired, do nothing and show the login page
    }
  }
  
  return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}
