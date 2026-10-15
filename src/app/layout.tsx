import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { ThemeLayersProvider } from '@/context/theme-customizer-context';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className={`${montserrat.className} min-h-screen bg-[var(--hub-bg,#F8F6FC)] text-[#4A4A4A] antialiased selection:bg-[#8E0E75] selection:text-white`}>
        <AuthProvider>
          <ThemeLayersProvider>
            {children}
          </ThemeLayersProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
