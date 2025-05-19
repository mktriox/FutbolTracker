
'use client';

import React, { useState, useEffect } from 'react';
import { useRankings } from '@/lib/store';
import { CATEGORIES, UserRole, type Category } from '@/types'; // UserRole is already imported
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from "@/components/ui/tooltip";


const SeriesPenaltyManager: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter(); // Define router
  const { rankings, toggleSeriesDisabled, toggleDate3Passed, isDate3Passed, loading: rankingsLoading } = useRankings();
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const { toast } = useToast();

  const authLoading = status === 'loading'; // Define authLoading
  const currentUser = session?.user as any; // Define currentUser (adjust type as needed, 'any' for now to match pattern)

  useEffect(() => {
    // This verification should ideally be in a layout or higher-order component for /admin routes
    // The redirection logic is commented out. If re-enabled, it would use defined variables.
    if (!authLoading && status !== 'authenticated') {
        // Example: router.push('/login?message=Acceso requerido.');
    } else if (status === 'authenticated' && (!currentUser || currentUser.role !== UserRole.ADMIN)) {
      // Example: router.push('/login?message=Acceso denegado. Rol de administrador requerido.');
      console.warn("User is not an admin, but SeriesPenaltyManager is being accessed/rendered.");
    }
  }, [currentUser, authLoading, status, router]); // Updated dependencies

  const handleToggleSeries = (category: Category, checked: boolean) => {
    if (!selectedClubId) return;
    toggleSeriesDisabled(selectedClubId, category, checked);
    toast({
      title: `Serie ${category} ${checked ? 'deshabilitada' : 'habilitada'}`,
      description: `Para el club ${rankings.find(c => c.id === selectedClubId)?.name}.`,
    });
  };

  const handleToggleDate3Passed = () => {
    toggleDate3Passed();
     toast({
       title: `Estado de Fecha 3 ${!isDate3Passed ? 'Activado' : 'Desactivado'}`,
       description: `Las penalizaciones por series no presentadas ahora ${!isDate3Passed ? 'se aplicarán' : 'no se aplicarán'} a partir de la fecha 3.`,
     });
  };
  
  if (authLoading || rankingsLoading) { // Use defined authLoading
    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Cargando...</CardTitle>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Cargando...</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
                {authLoading && <p>Verificando sesión...</p>}
                {rankingsLoading && <p>Cargando rankings...</p>}
            </CardContent>
        </Card>
    );
  }
  
  // This component is part of page.tsx's "championshipManagement" tab.
  // The page itself should ideally handle tab visibility based on role.
  // This internal check provides an additional layer of safety.
  if (status === 'unauthenticated' || (status === 'authenticated' && (!currentUser || currentUser.role !== UserRole.ADMIN))) {
    // Render nothing or a placeholder if not an admin.
    // console.log("SeriesPenaltyManager: User not authorized. currentUser:", currentUser, "status:", status);
    return null; 
  }

  const selectedClub = rankings.find((club) => club.id === selectedClubId);

  return (
    <Card className="mt-6 shadow-md">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl text-primary">Gestión de Penalizaciones de Series</CardTitle>
        <CardDescription>
          Configura las series habilitadas/deshabilitadas para los clubes y el estado de la Fecha 3 para penalizaciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="clubSelect" className="text-md font-medium">Seleccionar Club</Label>
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger id="clubSelect" className="w-full sm:w-auto sm:min-w-[250px]">
              <SelectValue placeholder="-- Seleccionar un club --" />
            </SelectTrigger>
            <SelectContent>
              {rankings.sort((a,b) => a.name.localeCompare(b.name)).map((club) => (
                <SelectItem key={club.id} value={club.id}>
                  {club.name} ({club.division})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClubId && selectedClub && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-lg font-semibold">Series para {selectedClub.name} ({selectedClub.division})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {CATEGORIES.filter(cat => cat !== 'Sub12').map((category) => (
                <div key={category} className="flex items-center space-x-2 p-2 border rounded-md bg-background/30">
                  <Checkbox
                    id={`${selectedClubId}-${category}`}
                    checked={!selectedClub.disabledSeries?.[category]} 
                    onCheckedChange={(checked) => {
                      handleToggleSeries(category, !(checked as boolean));
                    }}
                    aria-label={`Habilitar/Deshabilitar serie ${category} para ${selectedClub.name}`}
                  />
                  <Label htmlFor={`${selectedClubId}-${category}`} className="text-sm cursor-pointer">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
             <p className="text-xs text-muted-foreground mt-1">
                Marcar una serie la habilita. Desmarcarla la deshabilita. Sub12 siempre está habilitada.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SeriesPenaltyManager;
