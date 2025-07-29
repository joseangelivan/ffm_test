
'use client';

import { Suspense } from 'react';
import { authenticateAdmin } from '@/actions/auth';
import AdminLoginForm from '@/components/admin-login-form';
import Loading from '@/app/loading';
import { useLocale } from '@/lib/i18n';

export default function AdminLoginPage() {
    const { t } = useLocale();
    // The server component now renders a client component responsible for the form and Suspense.
    return (
        <Suspense fallback={<Loading />}>
            <AdminLoginForm 
                authenticateAdmin={authenticateAdmin} 
                t={{
                    title: t('adminLogin.title'),
                    description: t('adminLogin.description'),
                    emailLabel: t('adminLogin.email'),
                    passwordLabel: t('adminLogin.password'),
                    loginButton: t('adminLogin.loginButton'),
                    returnToMainLogin: t('adminLogin.returnToMainLogin'),
                    loggingIn: t('login.loggingIn'),
                    errorTitle: t('toast.errorTitle'),
                    showPassword: t('login.showPassword'),
                    hidePassword: t('login.hidePassword'),
                }}
                tErrorKeys={{
                    invalidCredentials: t('toast.adminLogin.invalidCredentials'),
                    missingCredentials: t('toast.adminLogin.missingCredentials'),
                    sessionError: t('toast.adminLogin.sessionError'),
                    serverError: t('toast.adminLogin.serverError'),
                }}
            />
        </Suspense>
    );
}
