
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField, // Campo del formulario
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription, // Agregado para información de partido existente
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { useRankings, useMatches } from "@/lib/store";
import { CATEGORIES, type Category, type ClubRanking, type TeamStats, type MatchResult, type MatchResultInput } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Skeleton } from "@/components/ui/skeleton"; 

const createResultsSchema = () => {
  const resultsSchemaObject = CATEGORIES.reduce((acc, category) => {
    acc[category] = z.object({
       localGoals: z.coerce.number().int().min(0).nullable(),
       visitorGoals: z.coerce.number().int().min(0).nullable(),
    });
    return acc;
  }, {} as Record<Category, z.ZodObject<{ localGoals: z.ZodNullable<z.ZodNumber>; visitorGoals: z.ZodNullable<z.ZodNumber> }>>);

  return z.object({
    localClubId: z.string({ required_error: "Debe seleccionar un equipo local." }),
    visitorClubId: z.string({ required_error: "Debe seleccionar un equipo visitante." }),
    date: z.date({ required_error: "Debe seleccionar una fecha." }),
    results: z.object(resultsSchemaObject),
  }).refine(data => data.localClubId !== data.visitorClubId, {
     message: "El equipo local y visitante no pueden ser el mismo.",
     path: ["visitorClubId"],
  }).refine(data => {
    // At least one category must have results if submitting
    // Al menos una categoría debe tener resultados si se está enviando
    return CATEGORIES.some(category => 
        data.results[category].localGoals !== null && data.results[category].visitorGoals !== null
    )
  }, {
      message: "Debe ingresar resultados para al menos una categoría.",
      path: ["results"] // Path for overall results error
  });
};


type MatchResultsFormValues = z.infer<ReturnType<typeof createResultsSchema>>;

const defaultValues: MatchResultsFormValues = {
    localClubId: "",
    visitorClubId: "",
    date: new Date(), 
    results: CATEGORIES.reduce((acc, category) => {
      acc[category] = { localGoals: null, visitorGoals: null };
      return acc;
    }, {} as Record<Category, { localGoals: number | null, visitorGoals: number | null }>)
};


export function MatchResultsForm() {
  const { rankings, setRankings, updateRankings, loading: rankingsLoading, checkSub12Completion, finalizeSub12Points, isSub12Finalized } = useRankings();
  const { matches, addMatch, updateMatch: updateMatchInStore, loading: matchesLoading } = useMatches();
  const { toast } = useToast();
  const [formSchema, setFormSchema] = useState(() => createResultsSchema());

  const [localOpen, setLocalOpen] = useState(false)
  const [visitorOpen, setVisitorOpen] = useState(false)
  const [existingMatch, setExistingMatch] = useState<MatchResult | null>(null);


  useEffect(() => {
    setFormSchema(createResultsSchema());
  }, []);

  const form = useForm<MatchResultsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

    const watchedDate = form.watch('date');
    const watchedLocalClubId = form.watch('localClubId');
    const watchedVisitorClubId = form.watch('visitorClubId');

    useEffect(() => {
        const { date, localClubId, visitorClubId } = form.getValues();

        if (date && localClubId && visitorClubId && localClubId !== visitorClubId) {
            const foundMatch = matches.find(
                (m) =>
                    formatDate(m.date) === formatDate(date) &&
                    m.localClubId === localClubId &&
                    m.visitorClubId === visitorClubId
            );

            if (foundMatch) {
                if (existingMatch?.id !== foundMatch.id) { 
                    setExistingMatch(foundMatch);
                    const formValuesToSet: MatchResultsFormValues = {
                        date: new Date(foundMatch.date),
                        localClubId: foundMatch.localClubId,
                        visitorClubId: foundMatch.visitorClubId,
                        results: CATEGORIES.reduce((acc, category) => {
                            acc[category] = {
                                localGoals: foundMatch.results[category]?.localGoals ?? null,
                                visitorGoals: foundMatch.results[category]?.visitorGoals ?? null,
                            };
                            return acc;
                        }, {} as MatchResultsFormValues['results']),
                    };
                    form.reset(formValuesToSet);
                    toast({
                        title: "Partido Existente Cargado", // Title for existing match toast
                        description: "Resultados anteriores cargados para edición.", // Description for existing match toast
                        variant: "default"
                    });
                }
            } else {
                if (existingMatch) {
                    const currentFormValues = form.getValues();
                    form.reset({
                        ...defaultValues,
                        date: currentFormValues.date,
                        localClubId: currentFormValues.localClubId,
                        visitorClubId: currentFormValues.visitorClubId,
                    });
                    setExistingMatch(null);
                }
            }
        } else if (existingMatch) {
            form.reset(defaultValues);
            setExistingMatch(null);
        }
    }, [watchedDate, watchedLocalClubId, watchedVisitorClubId, matches, form, existingMatch, toast]);


  function onSubmit(data: MatchResultsFormValues) {
    const localClubInitial = rankings.find(c => c.id === data.localClubId);
    const visitorClubInitial = rankings.find(c => c.id === data.visitorClubId);

    if (!localClubInitial || !visitorClubInitial) {
        toast({ title: "Error", description: "Club no encontrado.", variant: "destructive" });
        return;
    }
    if (localClubInitial.division !== visitorClubInitial.division) {
        toast({ title: "Error de División", description: "Los equipos deben pertenecer a la misma división.", variant: "destructive" });
        return;
    }

    let updatedRankingsData;
    let matchDataToSave;

    if (existingMatch) {
        console.log("Actualizando partido existente:", existingMatch.id); // Updating existing match

        const { rankings: rankingsAfterRevert } = calculateRankingsUpdate(
            existingMatch,
            rankings, 
            'revert'
        );

        const {
            rankings: finalRankings,
            totalLocalMatchPoints,
            totalVisitorMatchPoints,
        } = calculateRankingsUpdate(
            { ...existingMatch, ...data, date: new Date(data.date) }, 
            rankingsAfterRevert, 
            'apply'
        );
        updatedRankingsData = finalRankings;
        matchDataToSave = {
             ...existingMatch,
             ...data,
             date: new Date(data.date), 
             localPoints: totalLocalMatchPoints,
             visitorPoints: totalVisitorMatchPoints,
             results: data.results 
        };
        updateMatchInStore(matchDataToSave); 
        setRankings(updatedRankingsData); 

        toast({
            title: "Resultados Actualizados",
            description: `Resultados para ${localClubInitial.name} vs ${visitorClubInitial.name} actualizados.`,
        });

    } else {
        console.log("Añadiendo nuevo partido"); // Adding new match
        const {
            rankings: newRankingsState,
            totalLocalMatchPoints,
            totalVisitorMatchPoints,
        } = calculateRankingsUpdate(
            { ...data, id: `match-${Date.now()}`, date: new Date(data.date) }, 
            rankings, 
            'apply'
        );
        updatedRankingsData = newRankingsState;
        matchDataToSave = {
            id: `match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            ...data,
            date: new Date(data.date),
            localPoints: totalLocalMatchPoints,
            visitorPoints: totalVisitorMatchPoints,
        };
        addMatch(matchDataToSave); 
        setRankings(updatedRankingsData); 

        toast({
            title: "Resultados Guardados",
            description: `${localClubInitial.name} vs ${visitorClubInitial.name} registrado.`,
        });
    }

     const sub12Completed = checkSub12Completion(updatedRankingsData);
     if (sub12Completed && !isSub12Finalized) {
       finalizeSub12Points(updatedRankingsData);
       toast({
         title: "¡Campeonato Sub12 Finalizado!",
         description: "Calculando y añadiendo puntos Sub12 a la tabla general.",
         variant: "default", // Variante para el toast de finalización Sub12
         duration: 5000,
       });
     }

    form.reset(defaultValues);
    setExistingMatch(null);
  }

  const getScoreInputClass = (localGoals: number | null | undefined, visitorGoals: number | null | undefined): string => {
     if (localGoals === null || visitorGoals === null || localGoals === undefined || visitorGoals === undefined) return '';
     if (localGoals > visitorGoals) return 'bg-green-100 dark:bg-green-900 border-green-500';
     if (localGoals < visitorGoals) return 'bg-red-100 dark:bg-red-900 border-red-500';
 return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-500'; // Class for drawn results
  };

  if (rankingsLoading || matchesLoading) {
      return (
        <Card>
          <CardHeader><Skeleton className="h-8 w-full max-w-xs sm:max-w-sm md:max-w-md" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      );
  }

  const visitorClubOptions = rankings.filter(club => {
    const localClubId = form.watch('localClubId');
    if (!localClubId) return true;
    const localClub = rankings.find(c => c.id === localClubId);
    return localClub && club.division === localClub.division && club.id !== localClubId;
  });


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">{existingMatch ? "Modificar Resultados del Enfrentamiento" : "Ingresar Resultados del Enfrentamiento"}</CardTitle>
         {existingMatch && (
            <CardDescription className="text-accent text-xs sm:text-sm">
                Editando partido del {formatDate(existingMatch.date)} entre {rankings.find(c=>c.id === existingMatch.localClubId)?.name} y {rankings.find(c=>c.id === existingMatch.visitorClubId)?.name}.
 Los cambios actualizarán la tabla de posiciones. {/* Description for existing match */}
            </CardDescription>
        )}
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <CardContent className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
               <FormField
                  control={form.control}
                  name="localClubId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Equipo Local</FormLabel>
                      <Popover open={localOpen} onOpenChange={setLocalOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={localOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? rankings.find(
                                    (club) => club.id === field.value
                                  )?.name
                                : "Seleccionar equipo"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                           <Command>
                            <CommandInput placeholder="Buscar equipo..." />
                            <CommandList>
                              <CommandEmpty>No se encontró el equipo.</CommandEmpty>
                              <CommandGroup>
                                {rankings.sort((a,b) => a.name.localeCompare(b.name)).map((club) => (
                                  <CommandItem
                                    value={club.name}
                                    key={club.id}
                                    onSelect={() => {
                                      const currentVisitorClubId = form.getValues("visitorClubId");
                                      form.setValue("localClubId", club.id, { shouldDirty: true, shouldTouch: true });
                                      if (club.id === currentVisitorClubId) {
                                          form.setValue("visitorClubId", "", { shouldDirty: true, shouldTouch: true });
                                      }
                                      setLocalOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        club.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {club.name} ({club.division})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

               <FormField
                  control={form.control}
                  name="visitorClubId"
                   render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Equipo Visitante</FormLabel>
                       <Popover open={visitorOpen} onOpenChange={setVisitorOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={visitorOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground",
                                !form.watch('localClubId') && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={!form.watch('localClubId')}
                            >
                              {field.value
                                ? visitorClubOptions.find(
                                    (club) => club.id === field.value
                                  )?.name
                                : "Seleccionar equipo"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar equipo..." />
                             <CommandList>
                              <CommandEmpty>No se encontró el equipo o no hay equipos en la misma división.</CommandEmpty>
                              <CommandGroup>
                                {visitorClubOptions.sort((a,b) => a.name.localeCompare(b.name)).map((club) => (
                                  <CommandItem
                                    value={club.name}
                                    key={club.id}
                                    onSelect={() => {
                                      form.setValue("visitorClubId", club.id, { shouldDirty: true, shouldTouch: true })
                                      setVisitorOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        club.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {club.name} ({club.division})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

               <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha del Partido</FormLabel>
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
                            selected={field.value instanceof Date ? field.value : undefined}
                            onSelect={(date) => {
                                field.onChange(date || null);
                                form.trigger('date');
                            }}
                            disabled={(date) =>
                              date > new Date() 
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4">
                {CATEGORIES.map((category) => (
                    <div key={category} className="space-y-2">
                        <h3 className="font-medium text-center col-span-full sm:col-span-1 lg:col-span-3">{category}</h3>
                         <div className="grid grid-cols-3 gap-2 items-center">
                            <FormField
                                control={form.control}
                                name={`results.${category}.localGoals`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="Local"
                                                min="0"
                                                step="1"
                                                className={cn("text-center", getScoreInputClass(field.value, form.watch(`results.${category}.visitorGoals`)))}
                                                {...field}
                                                onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                                                value={field.value ?? ''}
                                            />
                                        </FormControl>
                                         <FormMessage className="text-xs text-center"/>
                                    </FormItem>
                                )}
                            />
                            <span className="text-center text-muted-foreground">vs</span>
                            <FormField
                                control={form.control}
                                name={`results.${category}.visitorGoals`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="Visita"
                                                min="0"
                                                step="1"
                                                className={cn("text-center", getScoreInputClass(form.watch(`results.${category}.localGoals`), field.value))}
                                                 {...field}
                                                 onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                                                 value={field.value ?? ''}
                                            />
                                        </FormControl>
                                         <FormMessage className="text-xs text-center"/>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                ))}
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting || rankingsLoading || matchesLoading}>
                {form.formState.isSubmitting ? (existingMatch ? "Actualizando..." : "Guardando...") : (existingMatch ? "Actualizar Resultados" : "Guardar Resultados")}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
// Función de ayuda para calcular actualizaciones de clasificación
// Función de ayuda para calcular actualizaciones de ranking
function calculateRankingsUpdate(
    matchData: MatchResult | MatchResultInput & { id: string; date: Date },
    currentRankings: ClubRanking[],
    operation: 'apply' | 'revert'
): { rankings: ClubRanking[], totalLocalMatchPoints: number, totalVisitorMatchPoints: number, categoryUpdates: { clubId: string; category: Category; stats: TeamStats }[] } {
    let totalLocalMatchPoints = 0;
    let totalVisitorMatchPoints = 0;
    const categoryUpdates: { clubId: string; category: Category; stats: TeamStats }[] = [];

    const localClub = currentRankings.find(c => c.id === matchData.localClubId);
    const visitorClub = currentRankings.find(c => c.id === matchData.visitorClubId);

    if (!localClub || !visitorClub) {
        console.error("Club no encontrado en calculateRankingsUpdate"); // Club not found in calculateRankingsUpdate
        return { rankings: currentRankings, totalLocalMatchPoints: 0, totalVisitorMatchPoints: 0, categoryUpdates: [] };
    }

    const factor = operation === 'apply' ? 1 : -1;

    const newRankings = currentRankings.map(club => {
        if (club.id !== localClub.id && club.id !== visitorClub.id) {
            return club;
        }

        const isLocal = club.id === localClub.id;
        const newClubData = JSON.parse(JSON.stringify(club)); // Clonar datos del club para modificación

        CATEGORIES.forEach(category => {
            const result = matchData.results[category];
            if (result && typeof result.localGoals === 'number' && typeof result.visitorGoals === 'number') {
                const goalsScored = isLocal ? result.localGoals : result.visitorGoals;
                const goalsConceded = isLocal ? result.visitorGoals : result.localGoals;

                const currentCategoryStats = newClubData.categoryStats[category];

                currentCategoryStats.played += (1 * factor);
                currentCategoryStats.goalsFor += (goalsScored * factor);
                currentCategoryStats.goalsAgainst += (goalsConceded * factor);

                let categoryPoints = 0;
                if (goalsScored > goalsConceded) {
                    categoryPoints = 3;
                    currentCategoryStats.won += (1 * factor);
                } else if (goalsScored < goalsConceded) {
                    currentCategoryStats.lost += (1 * factor);
                } else {
                    categoryPoints = 1;
                    currentCategoryStats.drawn += (1 * factor);
                }

                currentCategoryStats.points += (categoryPoints * factor);

                if (category !== 'Sub12') {
                    if (isLocal) totalLocalMatchPoints += (categoryPoints * factor);
                    else totalVisitorMatchPoints += (categoryPoints * factor);
                }
                currentCategoryStats.goalDifference = currentCategoryStats.goalsFor - currentCategoryStats.goalsAgainst;
                categoryUpdates.push({ clubId: club.id, category: category, stats: currentCategoryStats });
            }
        });

        let generalPoints = 0;
        let generalPlayed = 0;
        let generalWon = 0;
        let generalDrawn = 0;
        let generalLost = 0;
        let generalGoalsFor = 0;
        let generalGoalsAgainst = 0;

        Object.entries(newClubData.categoryStats).forEach(([cat, stats]) => {
            const categoryStats = stats as TeamStats;
            if (cat !== 'Sub12') {
                generalPoints += categoryStats.points;
            }
            generalPlayed = Math.max(generalPlayed, categoryStats.played);
            generalWon += categoryStats.won;
            generalDrawn += categoryStats.drawn;
            generalLost += categoryStats.lost;
            generalGoalsFor += categoryStats.goalsFor;
            generalGoalsAgainst += categoryStats.goalsAgainst;
        });

        newClubData.points = generalPoints; 
        newClubData.played = generalPlayed;
        newClubData.won = generalWon;
        newClubData.drawn = generalDrawn;
        newClubData.lost = generalLost;
        newClubData.goalsFor = generalGoalsFor;
        newClubData.goalsAgainst = generalGoalsAgainst;
        newClubData.goalDifference = generalGoalsFor - generalGoalsAgainst;


        return newClubData;
    });


    return { rankings: newRankings, totalLocalMatchPoints, totalVisitorMatchPoints, categoryUpdates };
}

