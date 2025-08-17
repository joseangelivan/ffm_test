import { getSession } from '@/lib/auth';
import { getDevicesByCondoId } from '@/actions/devices';
import { getCondominioById } from '@/actions/condos';
import DashboardClient from '@/components/dashboard-client';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session || (session.type !== 'resident' && session.type !== 'gatekeeper')) {
    redirect('/login');
  }

  // A resident/gatekeeper belongs to a condominium. We need to fetch that condo ID.
  // This information should ideally be part of the session or fetched based on user ID.
  // For this implementation, we will assume the user has a condominium_id.
  
  let userCondoId: string | undefined;
  
  // A more robust implementation would fetch the user from the DB to get their condo ID
  // For now, let's simulate this by fetching the first condo and assigning its devices to the user
  // This is a placeholder for a more complex user-condo relationship logic.
  let client;
    try {
        const { getDbPool } = await import('@/lib/db');
        const pool = await getDbPool();
        client = await pool.connect();
        const tableName = session.type === 'resident' ? 'residents' : 'gatekeepers';
        const result = await client.query(`SELECT condominium_id FROM ${tableName} WHERE id = $1`, [session.id]);
        if (result.rows.length > 0) {
            userCondoId = result.rows[0].condominium_id;
        }
    } catch (error) {
        console.error("Failed to fetch user's condo ID", error);
    } finally {
        if (client) client.release();
    }


  if (!userCondoId) {
      // Handle case where user is not associated with a condo
      console.error(`User ${session.id} is not associated with any condominium.`);
      // For now, we can redirect or show an error message. Let's show an empty dashboard.
      return <DashboardClient user={session} devices={[]} />;
  }

  const devices = await getDevicesByCondoId(userCondoId) || [];

  return <DashboardClient user={session} devices={devices} />;
}
