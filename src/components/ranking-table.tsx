
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
import { useRankings } from "@/lib/store";
import type { ClubRanking, Division, TeamStats } from "@/types"; 
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RankingTableProps {
  division: Division;
}

type SortableGeneralKey = keyof Omit<ClubRanking, 'categoryStats' | 'id' | 'division'> | 'name';


export function RankingTable({ division }: RankingTableProps) {
  const { rankings: rawRankings, loading, isSub12Finalized } = useRankings();
  const [sortedRankings, setSortedRankings] = useState<ClubRanking[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortableGeneralKey | null; direction: 'ascending' | 'descending' }>({ key: 'points', direction: 'descending' });
  
  useEffect(() => {
    if (!loading && division) {
        if (rawRankings.length === 0 || !rawRankings.some(club => club.division === division)) { // Verificación de división
          console.warn(`Datos de ranking vacíos o faltan datos para la división: ${division}.`);
          // setSortedRankings([]); // Limpiar rankings ordenados si los datos son problemáticos
          return;
        }

      const filteredByDivision = rawRankings.filter(club => club.division === division);
      const sorted = [...filteredByDivision].sort((a, b) => {
        if (sortConfig.key === null) return 0; 

        if (sortConfig.key === 'points') {
            if (b.points !== a.points) {
                return sortConfig.direction === 'ascending' ? a.points - b.points : b.points - a.points;
            }
            if (b.goalDifference !== a.goalDifference) {
                return sortConfig.direction === 'ascending' ? a.goalDifference - b.goalDifference : b.goalDifference - a.goalDifference;
            }
            if (b.goalsFor !== a.goalsFor) {
                return sortConfig.direction === 'ascending' ? a.goalsFor - b.goalsFor : b.goalsFor - a.goalsFor;
            }
        } else if (sortConfig.key === 'name') {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA < nameB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (nameA > nameB) return sortConfig.direction === 'ascending' ? 1 : -1;
        } else {
            const aValue = a[sortConfig.key as keyof TeamStats];
            const bValue = b[sortConfig.key as keyof TeamStats];

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            }
        }

        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
      setSortedRankings(sorted);
    }
  }, [rawRankings, loading, sortConfig, division]);

  const requestSort = (key: SortableGeneralKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key) {
       direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    } else {
       direction = (key === 'points' || key === 'goalDifference' || key === 'goalsFor') ? 'descending' : 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableGeneralKey) => {
     if (sortConfig.key !== key) return <Minus className="h-3 w-3 inline ml-1 opacity-30" />;
     if (sortConfig.direction === 'ascending') return <ArrowUp className="h-3 w-3 inline ml-1 text-accent" />;
     return <ArrowDown className="h-3 w-3 inline ml-1 text-accent" />;
  };

  const getRowClass = (index: number): string => {
    const numTeams = sortedRankings.length;
    // En Segunda división ascienden los 3 primeros equipos
    if (division === 'Segunda' && index < 3 && numTeams > 3) return 'bg-green-100 dark:bg-green-900';
    // En Primera división, los 3 primeros lugares (podrían tener bonificación o clasificar a algo)
    if (division === 'Primera' && index < 3 && numTeams > 3) return 'bg-green-100 dark:bg-green-900';
    // En Primera división descienden los 3 últimos equipos
    if (division === 'Primera' && numTeams > 3 && index >= numTeams - 3) return 'bg-red-100 dark:bg-red-900'; 
    return '';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Tabla de Posiciones: {division === 'Primera' ? 'Primera División' : 'Segunda División'}</CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
           {isSub12Finalized
             ? "Puntos generales incluyen bonificación Sub12."
             : "Puntos generales no incluyen bonificación Sub12 (pendiente finalización)."
           }
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Info className="h-4 w-4 cursor-help" />
               </TooltipTrigger>
               <TooltipContent>
                 <p className="max-w-xs text-xs">
                   La tabla general suma los puntos de todas las categorías adultas.
                   Al finalizar todos los partidos de Sub12, se asigna una bonificación
                   de puntos a la tabla general según la posición final en esa categoría (100% al 1ro, 90% al 2do, etc.).
                   PJ, PG, PE, PP, GF, GC, DG en esta tabla reflejan el rendimiento general (excl. Sub12) o el de la categoría principal del club.
                 </p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px] cursor-pointer text-center" onClick={() => requestSort('points')}># {getSortIcon('points')}</TableHead><TableHead className="cursor-pointer min-w-[120px] sm:min-w-[150px]" onClick={() => requestSort('name')}>Club {getSortIcon('name')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('points')}>Pts {getSortIcon('points')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('played')}>PJ {getSortIcon('played')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('won')}>PG {getSortIcon('won')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('drawn')}>PE {getSortIcon('drawn')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('lost')}>PP {getSortIcon('lost')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('goalsFor')}>GF {getSortIcon('goalsFor')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('goalsAgainst')}>GC {getSortIcon('goalsAgainst')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('goalDifference')}>DG {getSortIcon('goalDifference')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: rawRankings.filter(c => c.division === division).length || 5 }).map((_, index) => ( 
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
            ) : sortedRankings.length > 0 ? (
              sortedRankings.map((club, index) => (
                <TableRow key={club.id} className={cn(getRowClass(index), "transition-colors duration-300")}>
                  <TableCell className="text-center font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{club.name}</TableCell>
                  <TableCell className="text-center font-semibold">{club.points}</TableCell>
                  <TableCell className="text-center">{club.played}</TableCell>
                  <TableCell className="text-center">{club.won}</TableCell>
                  <TableCell className="text-center">{club.drawn}</TableCell>
                  <TableCell className="text-center">{club.lost}</TableCell>
                  <TableCell className="text-center">{club.goalsFor}</TableCell>
                  <TableCell className="text-center">{club.goalsAgainst}</TableCell>
                  <TableCell className="text-center">{club.goalDifference > 0 ? `+${club.goalDifference}` : club.goalDifference}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No hay datos de ranking disponibles para la {division === 'Primera' ? 'Primera División' : 'Segunda División'}. Ingrese resultados de partidos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
