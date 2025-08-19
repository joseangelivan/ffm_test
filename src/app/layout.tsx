import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { LocaleProvider } from '@/lib/i18n.tsx';
import { getSession } from '@/lib/auth';
import { getSettings, getActiveTheme } from '@/actions/admin';
import { cn } from '@/lib/utils';
import type { Theme } from '@/actions/themes';

export const metadata: Metadata = {
  title: 'Follow For Me',
  description: 'Aplicación de seguimiento de dispositivos en tiempo real.',
};

function applyThemeToBody(themeData: Theme | null, newThemeId: string): string {
    const themeClasses: string[] = [];
    if (newThemeId === 'dark') {
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
  const settings = await getSettings(session);
  
  const initialLocale = settings?.language || 'pt-BR';
  const initialThemeId = settings?.theme || 'light';
  const themeData = await getActiveTheme(settings);
  
  const bodyClassName = applyThemeToBody(themeData, initialThemeId);
  const bodyStyle = getThemeStyle(themeData);

  return (
    <html lang={initialLocale.split('-')[0]} className={cn('h-full', bodyClassName)} style={bodyStyle}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased h-full">
        <LocaleProvider initialLocale={initialLocale}>
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
