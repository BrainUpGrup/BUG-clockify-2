import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { ThemeLayersProvider } from '@/context/theme-customizer-context';
import { TimerProvider } from '@/context/timer-context';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Brain Up Hub | Suite Oficial de Aplicaciones',
  description: 'Hub centralizado e interconectado de aplicaciones de Brain Up Grup con control horario Clockify, TaskFlow y gobernanza de permisos.',
  icons: {
    icon: '/logo.png',
  },
};

import { NotificationProvider } from '@/context/notifications-context';
import { FloatingTimerCompanion } from '@/components/timer/floating-timer-companion';
import { AppShell } from '@/components/layout/app-shell';
import { FeedbackProvider } from '@/components/ui/feedback-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={montserrat.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans min-h-screen bg-[var(--hub-bg,#F8F6FC)] text-[#4A4A4A] antialiased selection:bg-[#8E0E75] selection:text-white">
        <AuthProvider>
          <ThemeLayersProvider>
            <TimerProvider>
              <NotificationProvider>
                <AppShell>
                  {children}
                </AppShell>
                <FloatingTimerCompanion />
                <FeedbackProvider />
              </NotificationProvider>
            </TimerProvider>
          </ThemeLayersProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
