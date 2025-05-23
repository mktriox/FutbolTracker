

import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from '@/components/Navbar'; // Importar Navbar
import SessionProviderWrapper from '@/components/SessionProviderWrapper';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Futbol Tracker',
  description: 'Manage your soccer championship easily.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <SessionProviderWrapper>
          
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
              <Navbar /> {/* Añadir Navbar aquí */}
              <main className="flex-grow"> {/* Añadir etiqueta main para el área de contenido */}
                {children}
              </main>
              <Toaster />
            </ThemeProvider>
          
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
