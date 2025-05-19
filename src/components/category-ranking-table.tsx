
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
import type { ClubRanking, Category, TeamStats, Division } from "@/types"; 
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface CategoryRankingTableProps {
  category: Category;
  division: Division; 
}

type SortableKey = keyof TeamStats;

export function CategoryRankingTable({ category, division }: CategoryRankingTableProps) {
  const { rankings: rawRankings, loading } = useRankings();
  const [sortedRankings, setSortedRankings] = useState<ClubRanking[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKey | null; direction: 'ascending' | 'descending' }>({ key: 'points', direction: 'descending' });

  useEffect(() => {
    if (!loading && category && division) {
      const filteredByDivision = rawRankings.filter(club => club.division === division);
      const sorted = [...filteredByDivision].sort((a, b) => {
        const statsA = a.categoryStats[category];
        const statsB = b.categoryStats[category];

        if (!statsA || !statsB) return 0;

        if (sortConfig.key === null) return a.name.localeCompare(b.name);

        const aValue = statsA[sortConfig.key];
        const bValue = statsB[sortConfig.key];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (bValue !== aValue) {
               return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
            }
        }

        if (sortConfig.key === 'points') {
            if (statsB.goalDifference !== statsA.goalDifference) {
            return statsB.goalDifference - statsA.goalDifference;
            }
            if (statsB.goalsFor !== statsA.goalsFor) {
            return statsB.goalsFor - statsA.goalsFor;
            }
        } else if (sortConfig.key === 'goalDifference') {
             if (statsB.goalsFor !== statsA.goalsFor) {
                return statsB.goalsFor - statsA.goalsFor;
             }
        }
        return a.name.localeCompare(b.name);
      });
      setSortedRankings(sorted);
    }
  }, [rawRankings, loading, category, division, sortConfig]);

  const requestSort = (key: SortableKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key) {
       direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    } else {
       direction = (key === 'points' || key === 'goalDifference' || key === 'goalsFor') ? 'descending' : 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableKey) => {
     if (sortConfig.key !== key) return <Minus className="h-3 w-3 inline ml-1 opacity-30" />;
     if (sortConfig.direction === 'ascending') return <ArrowUp className="h-3 w-3 inline ml-1 text-accent" />;
     return <ArrowDown className="h-3 w-3 inline ml-1 text-accent" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Ranking: {division === 'Primera' ? 'Primera División' : 'Segunda División'} - Categoría {category}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Posiciones específicas de la categoría y división seleccionada.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>{/* Ensure no whitespace between TableHead elements */}
              <TableHead className="w-[40px] text-center cursor-pointer" onClick={() => requestSort('points')}># {getSortIcon('points')}</TableHead><TableHead className="cursor-pointer min-w-[120px] sm:min-w-[150px]" onClick={() => requestSort('points')}>Club</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('points')}>Pts {getSortIcon('points')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('played')}>PJ {getSortIcon('played')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('won')}>PG {getSortIcon('won')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('drawn')}>PE {getSortIcon('drawn')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('lost')}>PP {getSortIcon('lost')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('goalsFor')}>GF {getSortIcon('goalsFor')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('goalsAgainst')}>GC {getSortIcon('goalsAgainst')}</TableHead><TableHead className="text-center cursor-pointer w-[50px] sm:w-[60px]" onClick={() => requestSort('goalDifference')}>DG {getSortIcon('goalDifference')}</TableHead>
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
              sortedRankings.map((club, index) => {
                const stats = club.categoryStats[category];
                if (!stats) {
                  return (
                    <TableRow key={club.id}>
                      <TableCell colSpan={10} className="text-center text-destructive-foreground bg-destructive">
                        Error: Datos no encontrados para {club.name} en categoría {category}.
                      </TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={club.id} className="transition-colors duration-300">
                    <TableCell className="text-center font-medium">{index + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {club.name}{' '}
                      {index < 3 && '🏆'}
                    </TableCell>

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
                  No hay datos de ranking disponibles para la categoría {category} en la {division === 'Primera' ? 'Primera División' : 'Segunda División'}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

