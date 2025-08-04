// This file is now a barrel file, re-exporting functions from the new modular structure.
// This minimizes changes needed in the UI components.

export { 
    getSettings, 
    updateSettings,
    checkAdminEmail,
    authenticateAdmin,
    handleFirstLogin,
    createAdmin,
    getAdmins,
    updateAdmin,
    deleteAdmin,
    updateAdminAccount,
    verifySessionIntegrity,
    requestEmailChange,
    verifyAdminEmailChangePin,
    generateTotpSecret,
    enableTotp,
    verifyTotp,
    hasTotpEnabled,
    disableTotp,
} from './admin';

export { authenticateUser } from './user';

export { getDbPool } from '@/lib/db';
export { getCurrentSession, handleLogoutAction, getSession } from '@/lib/session';
export { sendAdminFirstLoginEmail } from '@/lib/mailer';

export type { Admin } from './admin';

    
