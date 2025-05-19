
'use client';

import { useState, useEffect } from 'react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { usePlayers, useRankings } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import type { Player } from '@/types';
import { formatDate, calculateAge } from '@/lib/utils';

export function PlayerList() {
    const { players, getPlayersByClub, loading: playersLoading } = usePlayers();
    const { rankings, loading: rankingsLoading } = useRankings();
    const [selectedClubId, setSelectedClubId] = useState<string | undefined>(undefined);
    const [clubPlayers, setClubPlayers] = useState<Player[]>([]);

    const loading = playersLoading || rankingsLoading;

    useEffect(() => {
        if (selectedClubId && !loading) {
            setClubPlayers(getPlayersByClub(selectedClubId).sort((a, b) => a.lastName.localeCompare(b.lastName)));
        } else {
            setClubPlayers([]);
        }
    }, [selectedClubId, players, getPlayersByClub, loading]);

    const generatePdf = () => {
        if (!selectedClubId || clubPlayers.length === 0) return;

        const selectedClub = rankings.find(c => c.id === selectedClubId);
        if (!selectedClub) return;

        const doc = new jsPDF();
        const title = `Listado de Jugadores - ${selectedClub.name} (${selectedClub.division})`;
        const generationDate = `Generado el: ${formatDate(new Date())}`;

        doc.setFontSize(18);
        doc.text(title, 14, 22);

        doc.setFontSize(10);
        doc.text(generationDate, 14, 30);

        const head = [['RUT', 'Nombre Completo', 'Fecha Nac.', 'Edad', 'Categoría', 'Fecha Registro']];
        const body = clubPlayers.map(player => [
            player.rut,
            `${player.firstName} ${player.lastName}`,
            formatDate(player.birthDate),
            calculateAge(player.birthDate).toString(), 
            player.category,
            formatDate(player.registrationDate)
        ]);

        autoTable(doc, {
            startY: 40,
            head: head,
            body: body,
            theme: 'striped', 
            headStyles: { fillColor: [41, 128, 185] }, 
            didDrawPage: (data) => {
                doc.setFontSize(10);
                const pageCount = (doc.internal as any).getNumberOfPages(); 
                doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });


        doc.save(`listado_jugadores_${selectedClub.name.replace(/\s+/g, '_')}.pdf`);
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Listado de Jugadores por Club</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Seleccione un club para ver sus jugadores y generar un PDF.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {loading ? (
                     <div className="space-y-4">
                        <Skeleton className="h-10 w-full max-w-xs" />
                        <Skeleton className="h-64 w-full" />
                     </div>
                 ) : (
                    <>
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                           <div className="w-full sm:w-auto sm:flex-1">
                               <Select
                                   value={selectedClubId}
                                   onValueChange={(value) => setSelectedClubId(value)}
                               >
                                   <SelectTrigger className="w-full max-w-xs">
                                       <SelectValue placeholder="Seleccionar club..." />
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
                            <Button
                                onClick={generatePdf}
                                disabled={!selectedClubId || clubPlayers.length === 0}
                                className="w-full sm:w-auto"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Generar PDF
                            </Button>
                        </div>

                        {selectedClubId && (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>RUT</TableHead>
                                            <TableHead>Nombre Completo</TableHead>
                                            <TableHead className="text-center">Fecha Nac.</TableHead>
                                            <TableHead className="text-center">Edad</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead className="text-center">Fecha Registro</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clubPlayers.length > 0 ? (
                                            clubPlayers.map((player) => (
                                                <TableRow key={player.id}>
                                                    <TableCell className="font-mono whitespace-nowrap">{player.rut}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{`${player.firstName} ${player.lastName}`}</TableCell>
                                                    <TableCell className="text-center whitespace-nowrap">{formatDate(player.birthDate)}</TableCell>
                                                    <TableCell className="text-center">{player.age}</TableCell>
                                                    <TableCell>{player.category}</TableCell>
                                                    <TableCell className="text-center whitespace-nowrap">{formatDate(player.registrationDate)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    {selectedClubId
                                                        ? "No hay jugadores registrados para este club."
                                                        : "Seleccione un club para ver la lista."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </>
                 )}
            </CardContent>
        </Card>
    );
}

