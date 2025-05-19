
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
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRankings, usePlayers } from "@/lib/store"; 
import { CATEGORIES, type Category, type PlayerInput } from "@/types";
import { cn, validateRut, formatRut, calculateAge, formatDate } from "@/lib/utils"; 
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";

const playerSchema = z.object({
  rut: z.string()
    .min(1, { message: "Debe ingresar un RUT." })
    .refine(validateRut, { message: "RUT inválido." }),
  firstName: z.string().min(1, { message: "Debe ingresar un nombre." }),
  lastName: z.string().min(1, { message: "Debe ingresar un apellido." }),
  birthDate: z.date({ required_error: "Debe seleccionar una fecha de nacimiento." })
    .refine(date => date <= new Date(), { message: "La fecha de nacimiento no puede ser futura." }), 
  clubId: z.string({ required_error: "Debe seleccionar un club." }),
  category: z.enum(CATEGORIES, { required_error: "Debe seleccionar una categoría." }),
});

type PlayerFormValues = z.infer<typeof playerSchema>;

export function PlayerRegistrationForm() {
  const { rankings, loading: rankingsLoading } = useRankings();
  const { addPlayer, getPlayerByRut, loading: playersLoading } = usePlayers(); 
  const { toast } = useToast();
  const [clubOpen, setClubOpen] = useState(false);

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
        rut: "",
        firstName: "",
        lastName: "",
        clubId: undefined,
        category: undefined,
    },
    mode: "onChange",
  });

  const handleRutBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const rut = e.target.value;
    const formattedRut = formatRut(rut);
    form.setValue('rut', formattedRut, { shouldValidate: true });

    if (validateRut(formattedRut)) {
        const existingPlayer = getPlayerByRut(formattedRut);
        if (existingPlayer) {
             toast({
                 title: "Jugador ya registrado",
                 description: `El jugador ${existingPlayer.firstName} ${existingPlayer.lastName} con RUT ${formattedRut} ya existe.`,
                 variant: "destructive" 
             });
        }
    }
  };

  function onSubmit(data: PlayerFormValues) {
     const existingPlayer = getPlayerByRut(data.rut);
     if (existingPlayer) {
         toast({
             title: "Error al registrar",
             description: `El jugador con RUT ${data.rut} ya existe.`,
             variant: "destructive"
         });
         return; 
     }

    const playerData: PlayerInput = {
      ...data,
      rut: formatRut(data.rut), 
    };

    addPlayer(playerData);

    const age = calculateAge(data.birthDate);
    toast({
      title: "Jugador Registrado",
      description: `${data.firstName} ${data.lastName} (RUT: ${playerData.rut}, Edad: ${age}) registrado en ${rankings.find(c => c.id === data.clubId)?.name} (${data.category}).`,
    });
    form.reset(); 
  }

  const loading = rankingsLoading || playersLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Registrar Nuevo Jugador</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="rut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUT</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 12.345.678-9" {...field} onBlur={handleRutBlur} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombres</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingrese nombres" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellidos</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingrese apellidos" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Nacimiento</FormLabel>
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
                            disabled={(date) => date > new Date()} 
                            initialFocus
                            captionLayout="dropdown-buttons" 
                            fromYear={1950} 
                            toYear={new Date().getFullYear()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                      {field.value && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Edad calculada: {calculateAge(field.value)} años
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                       control={form.control}
                       name="clubId"
                       render={({ field }) => (
                         <FormItem className="flex flex-col">
                           <FormLabel>Club</FormLabel>
                           <Popover open={clubOpen} onOpenChange={setClubOpen}>
                             <PopoverTrigger asChild>
                               <FormControl>
                                 <Button
                                   variant="outline"
                                   role="combobox"
                                   aria-expanded={clubOpen}
                                   className={cn(
                                     "w-full justify-between",
                                     !field.value && "text-muted-foreground"
                                   )}
                                 >
                                   {field.value
                                     ? rankings.find((club) => club.id === field.value)?.name
                                     : "Seleccionar club"}
                                   <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                 </Button>
                               </FormControl>
                             </PopoverTrigger>
                             <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command>
                                 <CommandInput placeholder="Buscar club..." />
                                 <CommandList>
                                   <CommandEmpty>No se encontró el club.</CommandEmpty>
                                   <CommandGroup>
                                     {rankings.sort((a,b) => a.name.localeCompare(b.name)).map((club) => (
                                       <CommandItem
                                         value={`${club.name} (${club.division})`}
                                         key={club.id}
                                         onSelect={() => {
                                           form.setValue("clubId", club.id)
                                           setClubOpen(false)
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar categoría" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={loading || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Registrando..." : "Registrar Jugador"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

