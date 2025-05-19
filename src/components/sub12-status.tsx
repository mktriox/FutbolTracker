
'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button";
import { useRankings, useMatches } from "@/lib/store";
import type { ClubRanking, Division } from "@/types"; 
import { TOTAL_MATCHES_PER_TEAM, SUB12_POINTS_DISTRIBUTION, NUMBER_OF_TEAMS, DIVISIONS } from "@/types"; 
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus, Info, CheckCircle, Hourglass } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 

export function Sub12Status() {
  const { rankings: rawRankings, loading: rankingsLoading, isSub12Finalized, finalizeSub12Points, checkSub12Completion } = useRankings();
  const { matches, loading: matchesLoading, countSub12Matches } = useMatches();
  const [sortedSub12Rankings, setSortedSub12Rankings] = useState<ClubRanking[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClubRanking['categoryStats']['Sub12'] | null; direction: 'ascending' | 'descending' }>({ key: 'points', direction: 'descending' });
  const [canManuallyFinalize, setCanManuallyFinalize] = useState(false);
  const [sub12Progress, setSub12Progress] = useState(0);
  const [selectedDivision, setSelectedDivision] = useState<Division | 'all'>('all'); 

  const loading = rankingsLoading || matchesLoading;

  useEffect(() => {
    if (!loading) {
      const globallySorted = [...rawRankings]
        .sort((a, b) => {
          const statsA = a.categoryStats.Sub12;
          const statsB = b.categoryStats.Sub12;

          if (sortConfig.key === null) return a.name.localeCompare(b.name);

          const aValue = statsA[sortConfig.key];
          const bValue = statsB[sortConfig.key];

          if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (bValue !== aValue) {
                 return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
            }
             if (sortConfig.key === 'points') {
                if (statsB.goalDifference !== statsA.goalDifference) {
                   return statsB.goalDifference - statsA.goalDifference;
                }
                if (statsB.goalsFor !== statsA.goalsFor) {
                   return statsB.goalsFor - statsA.goalsFor;
                }
             }
          }
          return a.name.localeCompare(b.name);
        });

      const filteredRankings = selectedDivision === 'all'
        ? globallySorted
        : globallySorted.filter(club => club.division === selectedDivision);

      setSortedSub12Rankings(filteredRankings);

      const sub12Completed = checkSub12Completion(rawRankings); // Pasar rankings actuales
      setCanManuallyFinalize(sub12Completed && !isSub12Finalized);

       const playedGamesCount = countSub12Matches();
       const totalPossibleGames = (NUMBER_OF_TEAMS * (NUMBER_OF_TEAMS - 1));
       const progressPercentage = totalPossibleGames > 0 ? Math.min(100, Math.round((playedGamesCount / totalPossibleGames) * 100)) : 0;
       setSub12Progress(progressPercentage);
    }
  }, [rawRankings, loading, sortConfig, isSub12Finalized, checkSub12Completion, countSub12Matches, selectedDivision]);


  const requestSort = (key: keyof ClubRanking['categoryStats']['Sub12']) => {
     let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key) {
       direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    } else {
        direction = (key === 'points' || key === 'goalDifference' || key === 'goalsFor') ? 'descending' : 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof ClubRanking['categoryStats']['Sub12']) => {
    if (sortConfig.key !== key) return <Minus className="h-3 w-3 inline ml-1 opacity-30" />;
    if (sortConfig.direction === 'ascending') return <ArrowUp className="h-3 w-3 inline ml-1 text-accent" />;
    return <ArrowDown className="h-3 w-3 inline ml-1 text-accent" />;
  };

   const handleManualFinalize = () => {
     if (canManuallyFinalize) {
       finalizeSub12Points(rawRankings); // Pasar rankings actuales
     }
   };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            Ranking Categoría Sub12 {selectedDivision === 'all' ? '(General)' : `- ${selectedDivision === 'Primera' ? 'Primera División' : 'Segunda División'}`}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Posiciones de la categoría Sub12. Los puntos de esta tabla no se suman directamente a la general
            hasta que finalicen todos los partidos de esta categoría. Seleccione una división para ver el rendimiento
            de los equipos de esa división en el campeonato Sub12 unificado.
          </CardDescription>
           <div className="pt-2 w-full sm:max-w-xs">
             <Select
               value={selectedDivision}
               onValueChange={(value) => setSelectedDivision(value as Division | 'all')}
             >
               <SelectTrigger>
                 <SelectValue placeholder="Filtrar por división..." />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todas las Divisiones (Global)</SelectItem>
                 {DIVISIONS.map((div) => (
                   <SelectItem key={div} value={div}>
                     {div === 'Primera' ? 'Primera División' : 'Segunda División'}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] text-center cursor-pointer" onClick={() => requestSort('points')}># {getSortIcon('points')}</TableHead><TableHead className="cursor-pointer min-w-[120px] sm:min-w-[150px]" onClick={() => requestSort('points')}>Club</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('points')}>Pts {getSortIcon('points')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('played')}>PJ {getSortIcon('played')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('won')}>PG {getSortIcon('won')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('drawn')}>PE {getSortIcon('drawn')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('lost')}>PP {getSortIcon('lost')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('goalsFor')}>GF {getSortIcon('goalsFor')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('goalsAgainst')}>GC {getSortIcon('goalsAgainst')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('goalDifference')}>DG {getSortIcon('goalDifference')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: selectedDivision === 'all' ? rawRankings.length : rawRankings.filter(c => c.division === selectedDivision).length || 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 sm:w-32" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-6 sm:w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-6 sm:w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-6 sm:w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-6 sm:w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-6 sm:w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-6 sm:w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-6 sm:w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-6 sm:w-8 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sortedSub12Rankings.length > 0 ? (
                sortedSub12Rankings.map((club, index) => {
                  const stats = club.categoryStats.Sub12;
                  return (
                    <TableRow key={club.id} className="transition-colors duration-300">
                      <TableCell className="text-center font-medium">{index + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">{club.name} <span className="text-xs text-muted-foreground">({club.division})</span></TableCell>
                      <TableCell className="text-center font-semibold">{stats.points}</TableCell>
                      <TableCell className="text-center">{stats.played}</TableCell>
                      <TableCell className="text-center">{stats.won}</TableCell>
                      <TableCell className="text-center">{stats.drawn}</TableCell>
                      <TableCell className="text-center">{stats.lost}</TableCell>
                      <TableCell className="text-center">{stats.goalsFor}</TableCell>
                      <TableCell className="text-center">{stats.goalsAgainst}</TableCell>
                      <TableCell className="text-center">{stats.goalDifference > 0 ? `+${stats.goalDifference}` : stats.goalDifference}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    No hay datos de ranking Sub12 disponibles para {selectedDivision === 'all' ? 'todas las divisiones' : (selectedDivision === 'Primera' ? 'Primera División' : 'Segunda División')}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Card>
         <CardHeader>
           <CardTitle className="text-xl sm:text-2xl">Estado de Finalización Sub12</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
             {loading ? (
                 <Skeleton className="h-10 w-full" />
             ) : isSub12Finalized ? (
               <Alert variant="default" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                 <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                 <AlertTitle className="text-green-800 dark:text-green-200">Finalizado</AlertTitle>
                 <AlertDescription className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                   Los puntos de bonificación de la categoría Sub12 ya han sido calculados y añadidos a la tabla general.
                 </AlertDescription>
               </Alert>
             ) : (
                <>
                    <Alert variant="default" className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                        <Hourglass className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <AlertTitle className="text-yellow-800 dark:text-yellow-200">Pendiente</AlertTitle>
                        <AlertDescription className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                         La bonificación de puntos Sub12 se calculará automáticamente cuando todos los equipos (considerando todas las divisiones para Sub12) hayan jugado sus {TOTAL_MATCHES_PER_TEAM} partidos (ida y vuelta).
                        </AlertDescription>
                     </Alert>
                     <div className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm font-medium text-muted-foreground">
                            <span>Progreso de Partidos Sub12 Jugados (Total)</span>
                            <span>{sub12Progress}%</span>
                        </div>
                        <Progress value={sub12Progress} aria-label={`${sub12Progress}% de partidos Sub12 jugados`} />
                     </div>

                    {canManuallyFinalize && (
                         <Alert variant="destructive">
                           <Info className="h-4 w-4" />
                           <AlertTitle>Finalización Manual Disponible</AlertTitle>
                           <AlertDescription className="text-xs sm:text-sm">
                             El sistema detecta que todos los partidos Sub12 requeridos ({TOTAL_MATCHES_PER_TEAM} por equipo) han sido registrados.
                             Puedes finalizar la categoría manualmente para añadir los puntos de bonificación a la tabla general ahora.
                             <Button onClick={handleManualFinalize} size="sm" className="mt-2 ml-auto block w-full sm:w-auto">
                                Finalizar Sub12 Ahora
                             </Button>
                           </AlertDescription>
                         </Alert>
                    )}
                </>
             )}
             <div>
                <h4 className="font-semibold mb-2 text-sm sm:text-base">Distribución de Puntos de Bonificación (General):</h4>
                <ul className="list-disc pl-5 text-xs sm:text-sm space-y-1 text-muted-foreground">
                   {SUB12_POINTS_DISTRIBUTION.map((points, index) => (
                       <li key={index}>Posición {index + 1}: <span className="font-medium text-foreground">{points}</span> puntos</li>
                   ))}
                    {rawRankings.length > SUB12_POINTS_DISTRIBUTION.length && ( // Para el equipo número 16 en adelante
                        <li>Posiciones {SUB12_POINTS_DISTRIBUTION.length + 1} en adelante: <span className="font-medium text-foreground">{SUB12_POINTS_DISTRIBUTION[SUB12_POINTS_DISTRIBUTION.length - 1] ?? 0}</span> puntos</li>
                    )}
                </ul>
             </div>
         </CardContent>
       </Card>
    </div>
  );
}
