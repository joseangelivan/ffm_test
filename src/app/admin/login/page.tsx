import AdminLoginForm from '@/components/admin-login-form';
import { authenticateAdmin } from '@/actions/auth';

export default function AdminLoginPage() {
  return <AdminLoginForm authenticateAdmin={authenticateAdmin} />;
}
