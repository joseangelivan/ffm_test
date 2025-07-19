
import AdminDashboardClient from '@/components/admin-dashboard-client';

const mockCondominios = [
    { id: 'condo-001', name: 'Residencial Jardins', address: 'Rua das Flores, 123', devices: 15, residents: 45, doormen: 3 },
    { id: 'condo-002', name: 'Condomínio Morada do Sol', address: 'Av. Principal, 456', devices: 25, residents: 80, doormen: 5 },
    { id: 'condo-003', name: 'Parque das Águas', address: 'Alameda dos Pássaros, 789', devices: 8, residents: 22, doormen: 2 },
];

export default async function AdminDashboardPage() {
  return <AdminDashboardClient initialCondominios={mockCondominios} />;
}
