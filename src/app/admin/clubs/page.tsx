
'use client';

import { ClubRanking, CATEGORIES, Category, UserRole } from '@/types';
import { useRankings } from '@/lib/store';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function ManageClubsPage() {
  const { data: session, status } = useSession();
  const { rankings, toggleSeriesDisabled, loading: rankingsLoading, isDate3Passed, toggleDate3Passed } = useRankings();
  const router = useRouter();
  const [loadedRankings, setLoadedRankings] = useState<ClubRanking[]>([]);
  const { toast } = useToast();

  useEffect(() => {

    if (status === 'unauthenticated' || (status === 'authenticated' && (session?.user as any)?.role !== UserRole.ADMIN)) {
      router.push('/login?message=Admin access required for this page.');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!rankingsLoading) {
      setLoadedRankings(rankings);
    }
  }, [rankings, rankingsLoading]);

  const handleToggleSeries = (clubId: string, category: Category, checked: boolean) => {
    toggleSeriesDisabled(clubId, category, checked);
    toast({
      title: `Serie ${category} ${checked ? 'deshabilitada' : 'habilitada'}`,
      description: `Para el club ${rankings.find(c => c.id === clubId)?.name}.`,
    });
  };

  const handleToggleDate3Passed = () => {
    toggleDate3Passed();
     toast({
       title: `Estado de Fecha 3 ${!isDate3Passed ? 'Activado' : 'Desactivado'}`,
       description: `Las penalizaciones por series no presentadas ahora ${!isDate3Passed ? 'se aplicarán' : 'no se aplicarán'} a partir de la fecha 3.`,
     });
  };
    
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Cargando sesión...</p>
      </div>
    );
  }

  if (rankingsLoading) {
     return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Cargando clubes...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-2 sm:px-4">
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Gestión General de Clubes y Torneo</CardTitle>
          <CardDescription>
            Administra las series habilitadas/deshabilitadas para cada club y configura parámetros del torneo.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <Label htmlFor="date3PassedToggle" className="text-md font-medium">
                    ¿Ha pasado la Fecha 3 del torneo?
                </Label>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="date3PassedToggle"
                        checked={isDate3Passed}
                        onCheckedChange={handleToggleDate3Passed}
                    />
                    <span className="text-sm text-muted-foreground">
                        {isDate3Passed ? "Sí, aplicar penalizaciones por series no presentadas." : "No, aún no aplicar penalizaciones."}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground">
                    Activar esta opción implica que si un club tiene una serie deshabilitada, se le considerará como partido perdido (0-1) por no presentación en esa serie a partir de la tercera fecha del campeonato.
                </p>
            </div>
        </CardContent>
      </Card>


      <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center text-foreground">Habilitación de Series por Club</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loadedRankings.sort((a, b) => a.name.localeCompare(b.name)).map((club) => (
          <Card key={club.id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-semibold text-primary">{club.name}</CardTitle>
              <CardDescription>División: {club.division}</CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-md sm:text-lg font-medium mb-2 text-foreground">Series del Club:</h3>
              <div className="space-y-2">
                {CATEGORIES.filter(cat => cat !== 'Sub12').map((category) => (
                  <div key={category} className="flex items-center justify-between p-2 border rounded-md bg-background/50">
                    <Label htmlFor={`${club.id}-${category}`} className="text-sm text-foreground flex-grow cursor-pointer">
                      {category}
                    </Label>
                    <Checkbox
                      id={`${club.id}-${category}`}
                      checked={!club.disabledSeries?.[category]} // Marcado si NO está deshabilitado (es decir, habilitado)
                      onCheckedChange={(checked) => {
                        // Pasar !checked porque si el checkbox está marcado, significa que la serie está habilitada (no deshabilitada)
                        handleToggleSeries(club.id, category, !checked);
                      }}
                      aria-label={`Habilitar/Deshabilitar serie ${category} para ${club.name}`}
                    />
                  </div>
                ))}
              </div>
                 <p className="text-xs text-muted-foreground mt-3">
                    Marcar una serie la habilita. Desmarcarla la deshabilita (implica penalización si la Fecha 3 ha pasado). Sub12 siempre habilitada.
                </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
