
'use client';

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingTable } from "@/components/ranking-table";
import { MatchResultsForm } from "@/components/match-results-form";
import { SuspensionManager } from "@/components/suspension-manager";
import { Sub12Status } from "@/components/sub12-status";
import { CategoryRankingTable } from "@/components/category-ranking-table";
import { PlayerRegistrationForm } from "@/components/player-registration-form";
import { PlayerList } from "@/components/player-list";
import { useRouter, useSearchParams } from "next/navigation";
import { Trophy, ClipboardList, ScanSearch, BarChart3, ListChecks, UserPlus, Users, Settings, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, type Category, DIVISIONS, type Division, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { useRankings } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import SeriesPenaltyManager from "@/components/SeriesPenaltyManager";

export default function Home() {  
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(CATEGORIES[0]);
  const [selectedDivision, setSelectedDivision] = useState<Division>(DIVISIONS[0]);
  const { handlePromotionRelegation } = useRankings();
  const { toast } = useToast();

  const triggerPromotionRelegation = () => {
    handlePromotionRelegation();
    toast({
      title: "Temporada Finalizada",
      description: "Ascensos y descensos procesados. ¡Nueva temporada iniciada!",
      variant: "default",
      duration: 5000,
    });
  };

  // Mostrar estado de carga
 // if (status === 'loading') { // Si el estado es cargando
   // return ( // Retorna un div
     // <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"> {/* Ajusta la altura considerando la barra de navegación */}
       // <Loader2 className="h-12 w-12 animate-spin text-primary" /> // Icono de carga animado
       // <p className="ml-4 text-lg text-muted-foreground">Cargando sesión...</p> // Mensaje de carga
      //</div>

    //);
  //}

    // Asegurarse de que searchParams no sea nulo y usar un valor por defecto si lo es
    const tabValue = searchParams ? searchParams.get("tab") : null;
    // Establecer la pestaña inicial basada en el parámetro 'tab' o 'ranking' por defecto
    const initialTab = tabValue || "ranking";
    
    //const canAccessAdminFeatures = (session?.user as any)?.role === UserRole.ADMIN;
    //const canAccessSecretaryFeatures = (session?.user as any)?.role === UserRole.SECRETARY || (session?.user as any)?.role === UserRole.ADMIN || (session?.user as any)?.role === UserRole.ADMINISTRATIVE;
    //const canAccessAdministrativeFeatures = (session?.user as any)?.role === UserRole.ADMINISTRATIVE || (session?.user as any)?.role === UserRole.ADMIN;



  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-8">
      <header className="mb-6 md:mb-8 text-center relative">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">Futbol Tracker</h1>
        <p className="text-md sm:text-lg text-muted-foreground">Campeonato de Fútbol Amateur</p>
        {/* ThemeToggleButton ahora está en Navbar */}
      </header>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 mb-6 text-xs sm:text-sm overflow-x-auto pb-2">
          <TabsTrigger value="ranking" className="flex items-center gap-1 sm:gap-2">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" /> Ranking General
          </TabsTrigger>
          <TabsTrigger value="sub12" className="flex items-center gap-1 sm:gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" /> Estado Sub12
          </TabsTrigger>
          <TabsTrigger value="categoryRanking" className="flex items-center gap-1 sm:gap-2">
            <ListChecks className="h-4 w-4 sm:h-5 sm:w-5" /> Ranking Categoría
          </TabsTrigger>          
          <TabsTrigger value="registerPlayer" className="flex items-center gap-1 sm:gap-2">
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" /> Registrar Jugador
            </TabsTrigger>
           <TabsTrigger value="playerList" className="flex items-center gap-1 sm:gap-2">
             <Users className="h-4 w-4 sm:h-5 sm:w-5" /> Listado Jugadores
           </TabsTrigger>
           <TabsTrigger value="results" className="flex items-center gap-1 sm:gap-2">
              <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" /> Ingresar Resultados
            </TabsTrigger>
            <TabsTrigger value="suspensions" className="flex items-center gap-1 sm:gap-2">
              <ScanSearch className="h-4 w-4 sm:h-5 sm:w-5" /> Suspensiones (RUT)
            </TabsTrigger>
          <TabsTrigger value="championshipManagement" className="flex items-center gap-1 sm:gap-2">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" /> Gestión Torneo
            </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking">
           <div className="space-y-4">
             <div className="max-w-full sm:max-w-xs">
               <Select
                 value={selectedDivision}
                 onValueChange={(value) => setSelectedDivision(value as Division)}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Seleccionar división..." />
                 </SelectTrigger>
                 <SelectContent>
                   {DIVISIONS.map((div) => (
                     <SelectItem key={div} value={div}>
                       División {div}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <RankingTable division={selectedDivision} />
           </div>
        </TabsContent>
         <TabsContent value="sub12">
           <Sub12Status />
        </TabsContent>
        <TabsContent value="categoryRanking">
           <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="max-w-full sm:max-w-xs">
                   <Select
                     value={selectedDivision}
                     onValueChange={(value) => setSelectedDivision(value as Division)}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Seleccionar división..." />
                     </SelectTrigger>
                     <SelectContent>
                       {DIVISIONS.map((div) => (
                         <SelectItem key={div} value={div}>
                           División {div}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="max-w-full sm:max-w-xs">
                   <Select
                     value={selectedCategory}
                     onValueChange={(value) => setSelectedCategory(value as Category)}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Seleccionar categoría..." />
                     </SelectTrigger>
                     <SelectContent>
                       {CATEGORIES.map((cat) => (
                         <SelectItem key={cat} value={cat}>
                           {cat}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
            </div>

                {selectedCategory && selectedDivision ? (
               <CategoryRankingTable category={selectedCategory} division={selectedDivision} />
             ) : (
                <p className="text-muted-foreground text-center p-4">Seleccione división y categoría para ver el ranking.</p>
             )}
           </div>
        </TabsContent>

          <TabsContent value="registerPlayer">
            <PlayerRegistrationForm />
          </TabsContent>

        <TabsContent value="playerList">
            <PlayerList />
        </TabsContent>

          <TabsContent value="results">
            <MatchResultsForm />
          </TabsContent>


          <TabsContent value="suspensions">
            <SuspensionManager />
          </TabsContent>


           <TabsContent value="championshipManagement">
             <SeriesPenaltyManager />
             <div className="mt-6 space-y-4 p-4 border rounded-lg shadow">
               <h2 className="text-xl sm:text-2xl font-semibold text-primary">Gestión del Campeonato</h2>
               <p className="text-sm sm:text-base text-muted-foreground">
                 Al finalizar la temporada actual, presione el siguiente botón para procesar los ascensos y descensos
                 entre la Primera y Segunda División. Esto también reiniciará las tablas de posiciones para la nueva temporada.
                 Asegúrese de que todos los partidos hayan sido ingresados y la categoría Sub12 haya sido finalizada.
               </p>
               <Button
                 onClick={triggerPromotionRelegation}
                 variant="destructive"
                 className="w-full md:w-auto text-sm sm:text-base"
               >
                 Finalizar Temporada y Aplicar Ascensos/Descensos
               </Button>
               <div className="mt-4 p-3 bg-secondary/30 rounded-md border border-secondary">
                  <h3 className="font-medium text-lg mb-1">Proceso de Ascenso/Descenso:</h3>
                  <ul className="list-disc list-inside text-xs sm:text-sm text-muted-foreground space-y-1">
                      <li>Los <strong>2 equipos con menor puntaje</strong> en la tabla general de la <strong>Primera División</strong> descenderán a Segunda División.</li>
                      <li>Los <strong>2 equipos con mayor puntaje</strong> en la tabla general de la <strong>Segunda División</strong> ascenderán a Primera División.</li>
                      <li>Las estadísticas de todos los equipos (puntos, PJ, PG, etc.) se reiniciarán para la nueva temporada.</li>
                      <li>La finalización de la categoría Sub12 se reiniciará.</li>
                  </ul>
               </div>
             </div>
           </TabsContent>

      </Tabs>
    </div>
  );
}
