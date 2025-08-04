
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
    getActiveTheme,
} from './admin';

export { authenticateUser } from './user';

export { getDbPool } from '@/lib/db';
export { handleLogoutAction, type SessionPayload } from '@/lib/session';
export { getSession } from '@/lib/session';
export { sendAdminFirstLoginEmail } from '@/lib/mailer';

export type { Admin, UserSettings } from './admin';
