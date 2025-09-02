import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n.tsx';
import { getSession } from '@/lib/auth';
import { getSettings, getActiveTheme } from '@/actions/admin';
import { cn } from '@/lib/utils';
import type { Theme } from '@/actions/themes';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Follow For Me',
  description: 'Aplicación de seguimiento de dispositivos en tiempo real.',
};

function applyThemeToBody(themeData: Theme | null, newThemeId: string): string {
    const themeClasses: string[] = [];
    // A custom theme is always dark.
    if (newThemeId === 'dark' || themeData) {
        themeClasses.push('dark');
    }
    return themeClasses.join(' ');
}

function getThemeStyle(themeData: Theme | null): React.CSSProperties {
    if (!themeData) return {};
    
    const style: { [key: string]: string } = {};
    Object.entries(themeData).forEach(([key, value]) => {
        if (key.endsWith('_hsl') && value) {
            const cssVar = `--${key.replace('_hsl', '').replace(/_/g, '-')}`;
            style[cssVar] = value;
        }
    });
    return style as React.CSSProperties;
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  
  // Only fetch from DB if a session exists
  const settings = session ? await getSettings(session) : null;
  
  const initialLocale = settings?.language || 'pt-BR';
  
  // Theme logic for logged-in users
  const initialThemeId = settings?.theme || 'light';
  const themeData = session ? await getActiveTheme(settings) : null;
  
  const bodyClassName = applyThemeToBody(themeData, initialThemeId);
  const bodyStyle = getThemeStyle(themeData);

  return (
    <LocaleProvider initialLocale={initialLocale}>
        <html lang={initialLocale.split('-')[0]} className={cn('h-full', bodyClassName)} style={bodyStyle}>
        <body className={cn("h-full font-body antialiased", inter.variable)}>
            {children}
            <Toaster />
        </body>
        </html>
    </LocaleProvider>
  );
}
