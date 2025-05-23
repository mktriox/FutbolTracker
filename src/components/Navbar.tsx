
'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserCircle, ShieldCheck, Settings } from 'lucide-react';
import { ThemeToggleButton } from './theme-toggle-button';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import Link from 'next/link';

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    signOut();
  };
  
  // No renderizar la barra de navegación en la página de inicio de sesión
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary hover:text-primary/90 transition-colors">
          Futbol Tracker
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <ThemeToggleButton />
          {status === 'loading' ? (
            <Button variant="ghost" size="sm" disabled>Loading...</Button>
          ) : status === 'authenticated' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 px-2 sm:px-3">
                  <UserCircle className="h-5 w-5" /> 
                  <span className="hidden sm:inline text-sm font-medium">{session.user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                    {session.user.email} ({ (session.user as any).role})
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Acceder al rol a través de session.user.role */} {/* Acceder al rol a través de session.user.role */}

                {(session.user as any).role === 'ADMIN' && (
                   <DropdownMenuItem onClick={() => router.push('/admin/clubs')}>
                       <Settings className="mr-2 h-4 w-4" />
                       <span>Administrar Clubes</span>
                   </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90"> {/* Cerrar sesión */}
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login" className="flex items-center">
                <LogIn className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Login</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
