import DashboardClient from '@/components/dashboard-client';

// In a real application, you would fetch this data from your database
// based on the authenticated user's session.
const mockUser = {
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  avatarUrl: 'https://placehold.co/100x100.png',
};

const mockDevices = [
  { id: 'dev-001', name: 'Personal Phone', type: 'smartphone', status: 'Online', lastLocation: '40.7128, -74.0060', battery: 85 },
  { id: 'dev-002', name: 'Company Car', type: 'car', status: 'Online', lastLocation: '34.0522, -118.2437', battery: 92 },
  { id: 'dev-003', name: 'Childs Watch', type: 'watch', status: 'Online', lastLocation: '40.7135, -74.0055', battery: 62 },
  { id: 'dev-004', name: 'Asset Tracker 1', type: 'esp32', status: 'Offline', lastLocation: '48.8566, 2.3522', battery: null },
];

export default async function DashboardPage() {
  // Here you would typically get user session and fetch data
  return <DashboardClient user={mockUser} devices={mockDevices} />;
}
