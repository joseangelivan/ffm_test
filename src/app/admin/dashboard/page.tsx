import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import AdminDashboardClient from '@/components/admin-dashboard-client';

const mockCondominios = [
    { id: 'condo-001', name: 'Residencial Jardins', address: 'Rua das Flores, 123', devices: 15, residents: 45, doormen: 3 },
    { id: 'condo-002', name: 'Condomínio Morada do Sol', address: 'Av. Principal, 456', devices: 25, residents: 80, doormen: 5 },
    { id: 'condo-003', name: 'Parque das Águas', address: 'Alameda dos Pássaros, 789', devices: 8, residents: 22, doormen: 2 },
];

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

export default async function AdminDashboardPage() {
  const sessionToken = cookies().get('session')?.value;
  const session = await getSession(sessionToken);

  if (!session) {
    redirect('/admin/login');
  }

  return <AdminDashboardClient initialCondominios={mockCondominios} />;
}
