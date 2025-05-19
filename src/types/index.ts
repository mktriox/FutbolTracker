
export { UserRole } from './user'; // Exportar UserRole desde los tipos de usuario

export type Category =
  | 'Sub12'
  | 'Sub14'
  | 'Sub16'
  | 'Sub18'
  | 'Senior 45'
  | 'Senior 35'
  | 'Senior 50'
  | 'Serie Segunda' 
  | 'Serie Primera' 
  | 'Serie Honor';

export const CATEGORIES: Category[] = [
  'Sub12',
  'Sub14',
  'Sub16',
  'Sub18',
  'Senior 45',
  'Senior 35',
  'Senior 50',
  'Serie Segunda',
  'Serie Primera',
  'Serie Honor',
];

export type Division = 'Primera' | 'Segunda';

export const DIVISIONS: Division[] = ['Primera', 'Segunda'];

export interface TeamStats {
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface ClubRanking extends TeamStats {
  id: string;
  name: string;
  division: Division; // División añadida
  // Estadísticas detalladas por categoría
  categoryStats: Record<Category, TeamStats>;
  disabledSeries?: Record<Category, boolean>;
}

export interface CategoryMatchResult {
  localGoals: number | null;
  visitorGoals: number | null;
}

export interface MatchResultInput {
  localClubId: string;
  visitorClubId: string;
  date: Date;
  results: Record<Category, CategoryMatchResult>;
}

export interface MatchResult extends MatchResultInput {
  id: string;
  localPoints: number;
  visitorPoints: number;
}

export type SuspensionUnit = 'days' | 'dates' | 'months'; // 'dates' representa fines de semana/días de partido

export interface SuspensionInput {
  playerRut: string;
  startDate: Date;
  duration: number;
  unit: SuspensionUnit;
  reason?: string;
}

export interface Suspension {
  id:string;
  playerRut: string;
  startDate: Date;
  duration: number;
  unit: SuspensionUnit;
  reason?: string;
  endDate: Date;
}

export interface PlayerInput {
  rut: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  clubId: string;
  category: Category;
}

export interface Player extends PlayerInput {
  id: string;
  age: number;
  registrationDate: Date;
}

export const initialTeamStats = (): TeamStats => ({
  points: 0,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
});

export const initialClubRanking = (id: string, name: string, division: Division): ClubRanking => ({
  id,
  name,
  division, // Asignar división
  points: 0,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  categoryStats: CATEGORIES.reduce((acc, category) => {
    acc[category] = initialTeamStats();
    return acc;
  }, {} as Record<Category, TeamStats>),
});

// 16 clubes originales para 'Segunda División'
const segundaDivisionClubs: ClubRanking[] = [
  initialClubRanking('club-1', 'Union Catolica', 'Segunda'),
  initialClubRanking('club-2', 'Union Mardones', 'Segunda'),
  initialClubRanking('club-3', 'Real Oriente', 'Segunda'), 
  initialClubRanking('club-4', 'Irene Frei', 'Segunda'),
  initialClubRanking('club-5', 'Colo colo Zañartu', 'Segunda'),
  initialClubRanking('club-6', 'Ferroviarios', 'Segunda'),
  initialClubRanking('club-7', 'Estadio', 'Segunda'),
  initialClubRanking('club-8', 'Roberto Mateos', 'Segunda'),
  initialClubRanking('club-9', 'Atlanta', 'Segunda'),
  initialClubRanking('club-10', 'Nacional', 'Segunda'),
  initialClubRanking('club-11', 'Vicuña Mackenna', 'Segunda'),
  initialClubRanking('club-12', 'Buenos Amigos', 'Segunda'),
  initialClubRanking('club-13', 'Zaragoza', 'Segunda'),
  initialClubRanking('club-14', 'El Sauce', 'Segunda'),
  initialClubRanking('club-15', 'Manuel Rodriguez', 'Segunda'),
  initialClubRanking('club-16', 'Lautaro', 'Segunda'), 
];

// 16 clubes originales para 'Primera División' con nombres actualizados
const primeraDivisionClubs: ClubRanking[] = [
  initialClubRanking('club-17', '21 Diciembre', 'Primera'),
  initialClubRanking('club-18', 'Avance', 'Primera'),
  initialClubRanking('club-19', 'Estrella', 'Primera'),
  initialClubRanking('club-20', 'Cruz azul', 'Primera'),
  initialClubRanking('club-21', 'Unión', 'Primera'), 
  initialClubRanking('club-22', 'Barrabases', 'Primera'),
  initialClubRanking('club-23', 'San Miguel', 'Primera'),
  initialClubRanking('club-24', 'Condor', 'Primera'),
  initialClubRanking('club-25', 'San Martin', 'Primera'),
  initialClubRanking('club-26', 'El Tejar', 'Primera'),
  initialClubRanking('club-27', 'Junior', 'Primera'),
  initialClubRanking('club-28', 'San Luis', 'Primera'),
  initialClubRanking('club-29', 'El Lucero', 'Primera'),
  initialClubRanking('club-30', 'Deportivo Chile', 'Primera'),
  initialClubRanking('club-31', 'Chillan Viejo', 'Primera'),
  initialClubRanking('club-32', 'Union Española', 'Primera'), 
];


export const INITIAL_CLUBS: ClubRanking[] = [
    ...primeraDivisionClubs,
    ...segundaDivisionClubs,
    ].map(club => ({
    ...club, 
    ...initialTeamStats(), 
    points: 0, 
    division: primeraDivisionClubs.some(pc => pc.id === club.id) ? 'Primera' : 'Segunda',
    categoryStats: CATEGORIES.reduce((acc, category) => {
        acc[category] = club.categoryStats && club.categoryStats[category] ? { ...club.categoryStats[category] } : initialTeamStats();
        return acc;
    }, {} as Record<Category, TeamStats>),
}));


export const SUB12_POINTS_DISTRIBUTION: number[] = [
    100, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, // Para 15 equipos
    25, // Para el 16º equipo si existe, y así sucesivamente para más equipos
];

export const NUMBER_OF_TEAMS_PER_DIVISION = 16; 
export const TOTAL_MATCHES_PER_TEAM_IN_DIVISION = (NUMBER_OF_TEAMS_PER_DIVISION - 1) * 2;

// TOTAL_MATCHES_PER_TEAM en Sub12 considera todos los equipos de ambas divisiones si Sub12 es unificado
export const TOTAL_MATCHES_PER_TEAM_SUB12_UNIFIED = (INITIAL_CLUBS.length - 1) * 2;
export const NUMBER_OF_TEAMS = INITIAL_CLUBS.length; 

// Mantenido por compatibilidad, pero la lógica de finalización de Sub12 debería usar TOTAL_MATCHES_PER_TEAM_SUB12_UNIFIED
export const TOTAL_MATCHES_PER_TEAM = (INITIAL_CLUBS.length - 1) * 2;
