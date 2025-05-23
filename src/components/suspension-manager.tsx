
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider, // Proveedor de Tooltip añadido
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarIcon, Edit, CheckCircle, XCircle } from "lucide-react"; 
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRankings, useSuspensions, usePlayers } from "@/lib/store";
import type { SuspensionUnit, Suspension, Player } from "@/types";

import { cn, calculateEndDate, formatDate, isSuspended, validateRut, formatRut } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInCalendarDays } from "date-fns";


const suspensionUnits = ['days', 'dates', 'months'] as const;

const suspensionSchema = z.object({
  playerRut: z.string()
    .min(1, { message: "Debe ingresar un RUT." })
    .refine(validateRut, { message: "RUT inválido." }),
  startDate: z.date({ required_error: "Debe seleccionar una fecha de inicio." }),
  duration: z.coerce.number().int().min(1, { message: "La duración debe ser al menos 1." }),
  unit: z.enum(suspensionUnits, { required_error: "Debe seleccionar una unidad." }),
  reason: z.string().optional(),
});

type SuspensionFormValues = z.infer<typeof suspensionSchema>;

const defaultFormValues: SuspensionFormValues = {
    playerRut: "",
    startDate: new Date(), 
    duration: 1,
    unit: "dates" as SuspensionUnit,
    reason: "",
};


export function SuspensionManager() {
  const { rankings, loading: rankingsLoading } = useRankings();
  const { suspensions, addSuspension, updateSuspension, getActiveSuspensions, loading: suspensionsLoading } = useSuspensions();
  const { getPlayerByRut, loading: playersLoading } = usePlayers();
  const { toast } = useToast();
  const [suspensionsList, setSuspensionsList] = useState<Suspension[]>([]);
  const [editingSuspensionId, setEditingSuspensionId] = useState<string | null>(null);
  const [today, setToday] = useState(new Date());

   useEffect(() => {
     if (!suspensionsLoading) {
       setSuspensionsList(suspensions); 
     }
     const timer = setInterval(() => setToday(new Date()), 60000); 
     return () => clearInterval(timer);
   }, [suspensions, suspensionsLoading]);


  const form = useForm<SuspensionFormValues>({
    resolver: zodResolver(suspensionSchema),
    defaultValues: defaultFormValues,
    mode: "onChange",
  });

   const handleRutBlur = (e: React.FocusEvent<HTMLInputElement>) => {
     const rut = e.target.value;
     form.setValue('playerRut', formatRut(rut), { shouldValidate: true });
   };

  const handleEdit = (suspension: Suspension) => {
    setEditingSuspensionId(suspension.id);
    form.reset({
        playerRut: suspension.playerRut,
        startDate: new Date(suspension.startDate), 
        duration: suspension.duration,
        unit: suspension.unit,
        reason: suspension.reason || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingSuspensionId(null);
    form.reset(defaultFormValues);
  };


  function onSubmit(data: SuspensionFormValues) {
     const formattedRut = formatRut(data.playerRut);
     const playerInfo = getPlayerByRut(formattedRut);
     if (!playerInfo) {
         toast({
             title: "Error",
             description: `No se encontró jugador con el RUT ${formattedRut}. Registre al jugador primero.`,
             variant: "destructive",
         });
         return;
     }

     const endDate = calculateEndDate(data.startDate, data.duration, data.unit as SuspensionUnit); 

     if (editingSuspensionId) {
        const updatedSuspensionData: Suspension = {
            id: editingSuspensionId,
            playerRut: formattedRut,
            startDate: data.startDate,
            duration: data.duration,
            unit: data.unit,
            reason: data.reason,
            endDate,
        };
        updateSuspension(updatedSuspensionData);
        toast({
            title: "Castigo Actualizado",
            description: `Sanción para ${playerInfo.firstName} ${playerInfo.lastName} actualizada. Finaliza el ${formatDate(endDate)}.`,
        });
        setEditingSuspensionId(null);
     } else {
         const newSuspension: Suspension = {
             id: `susp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
             playerRut: formattedRut,
             startDate: data.startDate,
             duration: data.duration,
             unit: data.unit,
             reason: data.reason,
             endDate,
         };
         addSuspension(newSuspension);
         toast({
             title: "Castigo Registrado",
             description: `${playerInfo.firstName} ${playerInfo.lastName} (${formattedRut}) suspendido hasta ${formatDate(endDate)}.`,
         });
     }
     form.reset(defaultFormValues);
  }

   const loading = rankingsLoading || suspensionsLoading || playersLoading;

   const displayedSuspensions = suspensionsList
    .map(suspension => {
        const playerInfo = getPlayerByRut(suspension.playerRut);
        const currentlySuspended = isSuspended(suspension, today);
        const remainingDays = currentlySuspended ? differenceInCalendarDays(new Date(suspension.endDate), today) : 0;
        return {
            ...suspension,
            playerName: playerInfo ? `${playerInfo.firstName} ${playerInfo.lastName}` : 'Jugador no encontrado',
            clubName: playerInfo && rankings.find(r => r.id === playerInfo.clubId) ? rankings.find(r => r.id === playerInfo.clubId)!.name : 'Club no encontrado',
            clubDivision: playerInfo && rankings.find(r => r.id === playerInfo.clubId) ? rankings.find(r => r.id === playerInfo.clubId)!.division : 'N/A',
            category: playerInfo?.category ?? 'N/A',
            isCurrentlySuspended: currentlySuspended,
            remainingDays: remainingDays
        };
    })
    .sort((a, b) => {
        if (a.isCurrentlySuspended && !b.isCurrentlySuspended) return -1;
        if (!a.isCurrentlySuspended && b.isCurrentlySuspended) return 1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">{editingSuspensionId ? "Modificar Castigo" : "Registrar Castigo"}</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="playerRut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RUT del Jugador</FormLabel>
                    <FormControl>
                      <Input
                         placeholder="Ej: 12.345.678-9"
                         {...field}
                         onBlur={handleRutBlur}
                         disabled={!!editingSuspensionId} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

             <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Inicio Castigo</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                formatDate(field.value)
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

             <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Duración</FormLabel>
                        <FormControl>
                        <Input type="number" min="1" step="1" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unidad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Unidad" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="days">Días</SelectItem>
                            <SelectItem value="dates">Fechas (fines de semana)</SelectItem>
                            <SelectItem value="months">Meses</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                 />
             </div>

             <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describa brevemente el motivo del castigo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2">
               <Button type="submit" className="w-full sm:w-auto" disabled={loading || form.formState.isSubmitting}>
                 {editingSuspensionId ? "Actualizar Castigo" : (form.formState.isSubmitting ? "Registrando..." : "Registrar Castigo")}
                </Button>
                {editingSuspensionId && (
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCancelEdit}>
                        Cancelar Edición
                    </Button>
                )}
            </CardFooter>
          </form>
        </Form>
      </Card>

        <Card className="md:col-span-2">
             <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Jugadores Sancionados</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Lista de jugadores con sanciones.
                    <XCircle className="inline h-4 w-4 text-red-500 ml-1" /> Sanción activa.
                    <CheckCircle className="inline h-4 w-4 text-green-500 ml-1" /> Sanción cumplida.
                </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <TooltipProvider>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>RUT</TableHead><TableHead>Jugador</TableHead><TableHead>Club</TableHead><TableHead>Categoría</TableHead><TableHead>División</TableHead><TableHead className="text-center">Inicio</TableHead><TableHead className="text-center">Fin</TableHead><TableHead>Motivo</TableHead><TableHead className="text-center">Estado</TableHead><TableHead className="text-center">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             Array.from({ length: 3 }).map((_, index) => (
                                <TableRow key={index}>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-16" /></TableCell><TableCell><Skeleton className="h-5 w-16" /></TableCell><TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell><TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell><TableCell className="text-center"><Skeleton className="h-8 w-8 mx-auto" /></TableCell>
                                </TableRow>
                             ))
                        ) : displayedSuspensions.length > 0 ? (
                            displayedSuspensions.map((suspension) => {
                                    const rowClass = suspension.isCurrentlySuspended
                                        ? suspension.remainingDays <= 1 ? "bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800" 
                                          : "bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800" 
                                        : "bg-gray-100 dark:bg-gray-800"; 

                                    return (
                                        <TableRow key={suspension.id} className={cn(rowClass, "transition-colors duration-200")}>
                                            <TableCell className="font-mono whitespace-nowrap">{suspension.playerRut || 'RUT Inválido'}</TableCell>
                                            <TableCell className="whitespace-nowrap">{suspension.playerName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{suspension.clubName}</TableCell>
                                            <TableCell>{suspension.category}</TableCell>
                                            <TableCell>{suspension.clubDivision}</TableCell>
                                            <TableCell className="text-center whitespace-nowrap">{formatDate(suspension.startDate)}</TableCell>
                                            <TableCell className="text-center font-semibold whitespace-nowrap">{formatDate(suspension.endDate)}</TableCell>
                                            <TableCell className="text-xs sm:text-sm text-muted-foreground">{suspension.reason || '-'}</TableCell>
                                            <TableCell className="text-center">
                                                {suspension.isCurrentlySuspended ? (                                                        
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{`Sanción activa. Días restantes: ${suspension.remainingDays}`}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (                                                    
                                                    <Tooltip>
                                                        <TooltipTrigger asChild><CheckCircle className="h-5 w-5 text-green-500 mx-auto" /></TooltipTrigger>
                                                        <TooltipContent><p>Sanción Cumplida</p></TooltipContent>
                                                    </Tooltip>
                                                 )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                 <Button variant="outline" size="sm" onClick={() => handleEdit(suspension)} disabled={!suspension.isCurrentlySuspended && editingSuspensionId !== suspension.id}>
                                                      <Edit className="h-4 w-4 mr-1" /> Modificar
                                                 </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                        ) : (
                        <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center">
                            No hay jugadores con sanciones registradas.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
              </TooltipProvider>
            </CardContent>
        </Card>
    </div>
  );
}
