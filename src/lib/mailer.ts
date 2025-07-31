
'use server';

import nodemailer from 'nodemailer';
import { getSmtpConfigsForMailer } from '@/actions/smtp';
import { getAppSetting } from '@/actions/settings';
import es from '@/locales/es.json';
import pt from '@/locales/pt.json';

export async function sendEmail(to: string, subject: string, html: string): Promise<{success: boolean, message: string}> {
    const smtpConfigs = await getSmtpConfigsForMailer();

    if (smtpConfigs.length === 0) {
        console.error("No SMTP configurations found in the database.");
        return { success: false, message: 'No hay configuraciones SMTP disponibles para enviar correos.' };
    }

    for (const config of smtpConfigs) {
        try {
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: {
                    user: config.auth_user,
                    pass: config.auth_pass,
                },
            });

            const info = await transporter.sendMail({
                from: `"${config.name}" <${config.auth_user}>`,
                to: to,
                subject: subject,
                html: html,
            });

            console.log(`Message sent successfully with config "${config.name}": %s`, info.messageId);
            return { success: true, message: 'Correo enviado con éxito.' };

        } catch (error) {
            console.error(`Failed to send email with config "${config.name}". Error: ${error}`);
        }
    }

    console.error("All SMTP configurations failed.");
    return { success: false, message: 'Error del servidor: Todos los proveedores de correo fallaron.' };
}


export async function sendAdminFirstLoginEmail({ name, email, language = 'pt' }: { name: string, email: string, language?: 'es' | 'pt'}) {
    try {
        const appDomain = await getAppSetting('app_domain');
        const appUrl = appDomain || 'http://localhost:9003';
        
        const t = language === 'es' ? es : pt;
        const firstLoginUrl = new URL('/admin/first-login', appUrl).toString();
        
        const emailHtml = `
            <h1>${t.emails.adminFirstLogin.title}</h1>
            <p>${t.emails.adminFirstLogin.hello}, ${name},</p>
            <p>${t.emails.adminFirstLogin.intro}</p>
            <p>${t.emails.adminFirstLogin.pinInfo}</p>
            <ul>
                <li><strong>URL de Activación:</strong> <a href="${firstLoginUrl}">${firstLoginUrl}</a></li>
                <li><strong>Email:</strong> ${email}</li>
            </ul>
            <p>${t.emails.adminFirstLogin.thanks}<br/>${t.emails.adminFirstLogin.teamName}</p>
        `;

        return await sendEmail(email, t.emails.adminFirstLogin.subject, emailHtml);
        
    } catch(error) {
        console.error("Error sending admin first login email:", error);
        return { success: false, message: "Error del servidor al enviar el correo." }
    }
}

export async function sendEmailChangePin(name: string, newEmail: string, pin: string, language: 'es' | 'pt' = 'pt') {
    const t = language === 'es' ? es : pt;
    
    const emailHtml = `
        <h1>${t.emails.verifyNewEmail.title}</h1>
        <p>${t.emails.verifyNewEmail.hello}, ${name},</p>
        <p>${t.emails.verifyNewEmail.intro}</p>
        <p>${t.emails.verifyNewEmail.pinPrompt}</p>
        <h2>${pin}</h2>
        <p>${t.emails.verifyNewEmail.expiration}</p>
        <p>${t.emails.verifyNewEmail.thanks}</p>
    `;

    return await sendEmail(newEmail, t.emails.verifyNewEmail.subject, emailHtml);
}
