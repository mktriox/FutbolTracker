import { CATEGORIES, Category, ClubRanking, initialClubRanking, initialTeamStats, TeamStats } from "./types";

const primeraDivisionClubs = [
  initialClubRanking('club-1', 'Colo Colo', 'Primera'),
  initialClubRanking('club-2', 'Universidad de Chile', 'Primera'),
  initialClubRanking('club-3', 'Union Española', 'Primera'),
  initialClubRanking('club-4', 'Universidad Catolica', 'Primera'),
  initialClubRanking('club-5', 'Cobreloa', 'Primera'),
  initialClubRanking('club-6', 'Cobresal', 'Primera'),
  initialClubRanking('club-7', 'Huachipato', 'Primera'),
  initialClubRanking('club-8', 'Ñublense', 'Primera'),
  initialClubRanking('club-9', 'Everton', 'Primera'),
  initialClubRanking('club-10', 'Union La Calera', 'Primera'),
  initialClubRanking('club-11', 'Palestino', 'Primera'),
  initialClubRanking('club-12', 'Audax Italiano', 'Primera'),
  initialClubRanking('club-13', 'Coquimbo Unido', 'Primera'),
  initialClubRanking('club-14', 'Deportes Copiapo', 'Primera'),
  initialClubRanking('club-15', 'Magallanes', 'Primera'),
  initialClubRanking('club-16', 'Curico Unido', 'Primera'),
];

const segundaDivisionClubs = [
  initialClubRanking('club-17', 'Deportes Concepcion', 'Segunda'),
  initialClubRanking('club-18', 'Deportes Temuco', 'Segunda'),
  initialClubRanking('club-19', 'Deportes Valdivia', 'Segunda'),
  initialClubRanking('club-20', 'Iberia', 'Segunda'),
  initialClubRanking('club-21', 'Lota Schwager', 'Segunda'),
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
  initialClubRanking('club-32', 'Union Española', 'Primera'), // Was 'Unión', now 'Union Española' to avoid exact duplicate name if Unión also refers to club-3
];


export const INITIAL_CLUBS: ClubRanking[] = [
    ...primeraDivisionClubs,
    ...segundaDivisionClubs,
    ].map(club => ({
    ...club,
    ...initialTeamStats(), // Ensure general stats are reset
    points: 0, // Explicitly set general points to 0
    // Ensure division is correctly assigned based on its source array
    division: primeraDivisionClubs.some(pc => pc.id === club.id) ? 'Primera' : 'Segunda',
    categoryStats: CATEGORIES.reduce((acc, category) => {
        // If the club already has categoryStats (from initialClubRanking), use them, otherwise initialize
        acc[category] = club.categoryStats && club.categoryStats[category] ? { ...club.categoryStats[category] } : initialTeamStats();
        return acc;
    }, {} as Record<Category, TeamStats>),
}));


export const SUB12_POINTS_DISTRIBUTION: number[] = [
    100, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, // For 15 teams
    25, // For 16th team if exists and so on
];

export const NUMBER_OF_TEAMS_PER_DIVISION = 16;
export const TOTAL_MATCHES_PER_TEAM_IN_DIVISION = (NUMBER_OF_TEAMS_PER_DIVISION - 1) * 2;

// TOTAL_MATCHES_PER_TEAM in Sub12 considers all teams from both divisions if Sub12 is unified
export const TOTAL_MATCHES_PER_TEAM_SUB12_UNIFIED = (INITIAL_CLUBS.length - 1) * 2;
export const NUMBER_OF_TEAMS = INITIAL_CLUBS.length;

// Kept for compatibility, but logic for Sub12 completion should use TOTAL_MATCHES_PER_TEAM_SUB12_UNIFIED
export const TOTAL_MATCHES_PER_TEAM = (INITIAL_CLUBS.length - 1) * 2;

    
