
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { ClubRanking, MatchResult, Suspension, Category, TeamStats, Player, PlayerInput, Division, MatchResultInput } from '@/types';
import { INITIAL_CLUBS, CATEGORIES, initialTeamStats, SUB12_POINTS_DISTRIBUTION, TOTAL_MATCHES_PER_TEAM, NUMBER_OF_TEAMS } from '@/types';
import { calculateAge, formatRut, validateRut, formatDate } from './utils'; // Import calculateAge, formatRut, validateRut, formatDate
import { match } from 'assert';
const RANKING_KEY = 'futbol_tracker_rankings';
const MATCHES_KEY = 'futbol_tracker_matches';
const SUSPENSIONS_KEY = 'futbol_tracker_suspensions';
const SUB12_FINALIZED_KEY = 'futbol_tracker_sub12_finalized'; // Key to store Sub12 finalization status
const PLAYERS_KEY = 'futbol_tracker_players'; // Key for player data
const DATE3_PASSED_KEY = 'futbol_tracker_date3_passed';

function safelyParseJSON<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue; // Cannot access localStorage on server
  }
  try {
    const item = window.localStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      // Basic migration: Ensure categoryStats and division exists
      if (key === RANKING_KEY && Array.isArray(parsed)) {
         return parsed.map((club: any) => { // Use any for club during migration
             let wasMigrated = false;
             if (!club.categoryStats) {
                 console.log(`Migrating club ${club.id} (${club.name}): Adding categoryStats`);
                 club.categoryStats = CATEGORIES.reduce((acc, category) => {
                    acc[category] = initialTeamStats();
                    return acc;
                 }, {} as Record<Category, TeamStats>);
                 wasMigrated = true;
             }
             const initialClubData = INITIAL_CLUBS.find(ic => ic.id === club.id);
             if (!club.division || (initialClubData && club.division !== initialClubData.division)) {
                const newDivision = initialClubData ? initialClubData.division : 'Segunda'; // Default to Segunda if not found
                console.log(`Migrating/Updating club ${club.id} (${club.name}): Setting division to '${newDivision}'`);
                club.division = newDivision;
                wasMigrated = true;
             }

             let generalPoints = 0;
             let generalPlayed = 0;
             let generalWon = 0;
             let generalDrawn = 0;
             let generalLost = 0;
             let generalGoalsFor = 0;
             let generalGoalsAgainst = 0;

             Object.entries(club.categoryStats).forEach(([cat, stats]) => {
                const categoryStats = stats as TeamStats;
                if (cat !== 'Sub12') {
                    generalPoints += (stats as TeamStats).points;
                    generalPlayed = Math.max(generalPlayed, categoryStats.played); // Max played games for overall
                    generalWon += categoryStats.won; // Summing wins can be debated, depends on how general table is interpreted
                    generalDrawn += categoryStats.drawn;
                    generalLost += categoryStats.lost;
                    generalGoalsFor += categoryStats.goalsFor;
                    generalGoalsAgainst += categoryStats.goalsAgainst;
                }
             });
             club.points = generalPoints;
             club.played = generalPlayed;
             club.won = generalWon;
             club.drawn = generalDrawn;
             club.lost = generalLost;
             club.goalsFor = generalGoalsFor;
             club.goalsAgainst = generalGoalsAgainst;
             club.goalDifference = generalGoalsFor - generalGoalsAgainst;


             const defaultStats = initialTeamStats();
             for (const statKey in defaultStats) {
                 if (club[statKey as keyof TeamStats] === undefined) {
                     console.log(`Migrating club ${club.id} (${club.name}): Adding missing stat '${statKey}'`);
                     (club as any)[statKey] = defaultStats[statKey as keyof TeamStats];
                     wasMigrated = true;
                 }
             }
              return club as ClubRanking; // Cast back to ClubRanking
         }) as T;
      }
      if (key === MATCHES_KEY && Array.isArray(parsed)) {
          return parsed.map((match: any) => ({ // Use any for match during migration
              ...match,
              date: new Date(match.date)
          })) as T;
      }
       if (key === SUSPENSIONS_KEY && Array.isArray(parsed)) {
           return parsed.map((suspension: any) => ({ // Use any for suspension
               ...suspension,
               startDate: new Date(suspension.startDate),
               endDate: new Date(suspension.endDate), // endDate is exclusive (day player is free)
               playerRut: formatRut(suspension.playerRut),
           })) as T;
       }
       if (key === PLAYERS_KEY && Array.isArray(parsed)) {
           return parsed.map((player: any) => ({ // Use any for player
               ...player,
               birthDate: new Date(player.birthDate),
               registrationDate: player.registrationDate ? new Date(player.registrationDate) : new Date(),
               age: calculateAge(new Date(player.birthDate)),
               rut: formatRut(player.rut),
           })) as T;
       }
      return parsed;
    }
    if (key === RANKING_KEY) {
        console.log("No rankings found in localStorage. Initializing with default clubs.");
        return INITIAL_CLUBS.map(club => { // Ensure full structure on init
            const generalStats = initialTeamStats();
             let generalPoints = 0;
             let generalPlayed = 0;
             let generalWon = 0;
             let generalDrawn = 0;
             let generalLost = 0;
             let generalGoalsFor = 0;
             let generalGoalsAgainst = 0;

            Object.entries(club.categoryStats).forEach(([cat, stats]) => {
                if (cat !== 'Sub12') {
                    generalPoints += (stats as TeamStats).points;
                    generalPlayed = Math.max(generalPlayed, stats.played);
                    generalWon += stats.won;
                    generalDrawn += stats.drawn;
                    generalLost += stats.lost;
                    generalGoalsFor += stats.goalsFor;
                    generalGoalsAgainst += stats.goalsAgainst;
                }
            });
            return {
                ...club,
                points: generalPoints,
                played: generalPlayed,
                won: generalWon,
                drawn: generalDrawn,
                lost: generalLost,
                goalsFor: generalGoalsFor,
                goalsAgainst: generalGoalsAgainst,
                goalDifference: generalGoalsFor - generalGoalsAgainst,
            };
        }) as T;
    }
    return defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key “${key}”:`, error);
     if (key === RANKING_KEY) {
        console.log("Error during parsing rankings. Initializing with default clubs as fallback.");
        return INITIAL_CLUBS as T;
    }
    return defaultValue;
  }
}

function safelySetJSON(key: string, value: any) {
   if (typeof window === 'undefined') {
    console.warn(`Cannot set localStorage key “${key}” on server.`);
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key “${key}”:`, error);
  }
}

// --- Rankings Hook ---
export function useRankings() {
  const matches = useMatches();
  const [rankings, setRankingsState] = useState<ClubRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSub12Finalized, setIsSub12FinalizedState] = useState<boolean>(false);
  const [isDate3Passed, setIsDate3PassedState] = useState<boolean>(false);

  useEffect(() => {
    let storedRankings = safelyParseJSON<ClubRanking[]>(RANKING_KEY, INITIAL_CLUBS);
    const storedFinalizedStatus = safelyParseJSON<boolean>(SUB12_FINALIZED_KEY, false);
    const storedDate3Passed = safelyParseJSON<boolean>(DATE3_PASSED_KEY, false);
    setRankingsState(storedRankings);
    setIsSub12FinalizedState(storedFinalizedStatus);
    setIsDate3PassedState(storedDate3Passed);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      safelySetJSON(DATE3_PASSED_KEY, isDate3Passed);
    }
  }, [isDate3Passed, loading]);

  useEffect(() => {
    if (!loading) {
      safelySetJSON(RANKING_KEY, rankings);
    }
  }, [rankings, loading]);

   useEffect(() => {
    if (!loading) {
      safelySetJSON(SUB12_FINALIZED_KEY, isSub12Finalized);
    }
  }, [isSub12Finalized, loading]);

  const setRankings = useCallback((newRankings: ClubRanking[]) => {
    return setRankingsState(newRankings);
  }, []);

  const toggleDate3Passed = useCallback(() => {
      setIsDate3PassedState(prev => !prev);
  }, []);

  const toggleSeriesDisabled = useCallback((clubId: string, category: Category, isDisabled: boolean) => {
    setRankingsState(prevRankings => {
        return prevRankings.map((club: ClubRanking) => {
            if (club.id === clubId) {
                const newClub = { ...club }; // Clone the club
                if (isDisabled) {
                    newClub.disabledSeries = newClub.disabledSeries || {} as Record<Category, boolean>;
                    newClub.disabledSeries[category] = true;
                } else {
                    newClub.disabledSeries = newClub.disabledSeries || {} as Record<Category, boolean>;
                    delete newClub.disabledSeries[category];
                    if (Object.keys(newClub.disabledSeries).length === 0) delete newClub.disabledSeries;
                }
                return newClub;
            }
            return club;
        });
    });
  }, []); 

    const checkSub12Completion = useCallback((currentRankingsToCheck?: ClubRanking[]) => {
    if (!currentRankingsToCheck || !Array.isArray(currentRankingsToCheck) || currentRankingsToCheck.length === 0) return false;
    const allTeamsParticipatingInSub12 = currentRankingsToCheck;

    if (allTeamsParticipatingInSub12.length === 0) return false;

    const requiredMatches = (allTeamsParticipatingInSub12.length - 1) * 2;
    if (requiredMatches <= 0) return true; // Or false if 0 teams means not complete

    const allTeamsPlayedEnough = allTeamsParticipatingInSub12.every(club => {
        const sub12Stats = club.categoryStats.Sub12;
        return sub12Stats && sub12Stats.played >= requiredMatches;
    });
    return allTeamsPlayedEnough;
  }, []);

  const finalizeSub12Points = useCallback((currentRankingsToUpdate: ClubRanking[]) => {
    if (isSub12Finalized) {
      console.log("Sub12 points already finalized (or re-finalizing after update).");
      // Allow re-finalization if underlying data changed
    }

    const sub12SortedRankings = [...currentRankingsToUpdate] // Use the passed rankings for sorting
      .sort((a, b) => {
        const statsA = a.categoryStats.Sub12;
        const statsB = b.categoryStats.Sub12;
        if (statsB.points !== statsA.points) return statsB.points - statsA.points;
        if (statsB.goalDifference !== statsA.goalDifference) return statsB.goalDifference - statsA.goalDifference;
        if (statsB.goalsFor !== statsA.goalsFor) return statsB.goalsFor - statsA.goalsFor;
        return a.name.localeCompare(b.name);
      });

    const updatedRankingsWithBonus = currentRankingsToUpdate.map(club => {
      const sub12Rank = sub12SortedRankings.findIndex(c => c.id === club.id);
      let bonusPoints = 0;
      if (sub12Rank >= 0 && sub12Rank < SUB12_POINTS_DISTRIBUTION.length) {
        bonusPoints = SUB12_POINTS_DISTRIBUTION[sub12Rank];
      } else if (sub12Rank >= 0) {
         bonusPoints = SUB12_POINTS_DISTRIBUTION[SUB12_POINTS_DISTRIBUTION.length - 1] ?? 0;
      }
      const generalPointsWithoutBonus = Object.entries(club.categoryStats)
        .filter(([category]) => category !== 'Sub12')
        .reduce((sum, [, stats]) => sum + stats.points, 0);
      return { ...club, points: generalPointsWithoutBonus + bonusPoints };
    });
    setRankingsState(updatedRankingsWithBonus);
    if (!isSub12Finalized) setIsSub12FinalizedState(true);
    console.log("Sub12 points (re)calculated and added to general rankings.");
  }, [isSub12Finalized]);
  const recalculateRankingsFromMatches = useCallback((matches: MatchResult[]) => {
     setRankingsState(prevRankings => {
      return prevRankings.map((club: any) => {
        // Initialize stats for each category to 0
        const newClubData = JSON.parse(JSON.stringify(club)); // Deep clone
        CATEGORIES.forEach(category => {
            if (category !== 'Sub12') {
              newClubData.categoryStats[category] = initialTeamStats();
            }
        });
        // Initialize general stats for the club
        let generalPoints = 0;
        let generalPlayed = 0;
        let generalWon = 0;
        let generalDrawn = 0;
        let generalLost = 0;
        let generalGoalsFor = 0;
        let generalGoalsAgainst = 0;

        CATEGORIES.forEach(category => {
          if (category === 'Sub12') return; // Sub12 handled later

          const isSeriesDisabledWithPenalty = newClubData.disabledSeries?.[category] && isDate3Passed;

          if (!isSeriesDisabledWithPenalty) {
           // Filter matches for this category and club
           const relevantMatches = matches.filter(match => (
             (match.localClubId === newClubData.id || match.visitorClubId === newClubData.id) &&
              match.results[category].localGoals !== null &&
              match.results[category].visitorGoals !== null
           ));

            relevantMatches.forEach(match => {
                 const isHomeMatch = match.localClubId === newClubData.id;
                 const goalsFor = isHomeMatch ? match.results[category].localGoals : match.results[category].visitorGoals;
                 const goalsAgainst = isHomeMatch ? match.results[category].visitorGoals : match.results[category].localGoals;

                if (goalsFor !== null && goalsAgainst !== null) {
                    newClubData.categoryStats[category].played++;
                    if (goalsFor > goalsAgainst) {
                        newClubData.categoryStats[category].won++;
                        newClubData.categoryStats[category].points += 3;
                    } else if (goalsFor < goalsAgainst) {
                        newClubData.categoryStats[category].lost++;
                    } else {
                        newClubData.categoryStats[category].drawn++;
                        newClubData.categoryStats[category].points += 1;
                    }
                    newClubData.categoryStats[category].goalsFor += goalsFor;
                    newClubData.categoryStats[category].goalsAgainst += goalsAgainst;
                    newClubData.categoryStats[category].goalDifference = newClubData.categoryStats[category].goalsFor - newClubData.categoryStats[category].goalsAgainst;
                }
             });
             generalPoints += newClubData.categoryStats[category].points;
             generalPlayed = Math.max(generalPlayed, newClubData.categoryStats[category].played);
             generalWon += newClubData.categoryStats[category].won;
             generalDrawn += newClubData.categoryStats[category].drawn;
             generalLost += newClubData.categoryStats[category].lost;
             generalGoalsFor += newClubData.categoryStats[category].goalsFor;
             generalGoalsAgainst += newClubData.categoryStats[category].goalsAgainst;
           } else {
               // Penalizar la serie
              const relevantMatches = matches.filter(match => (match.localClubId === newClubData.id || match.visitorClubId === newClubData.id) && match.results[category].localGoals !== null && match.results[category].visitorGoals !== null);
              const playedMatches = relevantMatches.length;              
            let remainingMatches = TOTAL_MATCHES_PER_TEAM - playedMatches;
              if(remainingMatches < 0){
                 remainingMatches = 0;
              }
              
              const playedStats = initialTeamStats();
              const filteredMatches = matches.filter(match => (
                (match.localClubId === newClubData.id || match.visitorClubId === newClubData.id) &&
                 match.results[category].localGoals !== null &&
                 match.results[category].visitorGoals !== null
              ));

              filteredMatches.forEach(match => {
                const isHomeMatch = match.localClubId === newClubData.id;


                  const goalsFor = isHomeMatch ? match.results[category].localGoals : match.results[category].visitorGoals;
                  const goalsAgainst = isHomeMatch ? match.results[category].visitorGoals : match.results[category].localGoals;



                if (goalsFor !== null && goalsAgainst !== null) {
                  playedStats.played++;
                  if (goalsFor > goalsAgainst) {
                    playedStats.won++;
                    playedStats.points += 3;
                  } else if (goalsFor < goalsAgainst) {
                    playedStats.lost++;
                  } else {
                    playedStats.drawn++;
                    playedStats.points += 1;
                  }
                  playedStats.goalsFor += goalsFor;
                  playedStats.goalsAgainst += goalsAgainst;
                }
              });
            newClubData.categoryStats[category].played = TOTAL_MATCHES_PER_TEAM;
            newClubData.categoryStats[category].won = playedStats.won;
            newClubData.categoryStats[category].drawn = playedStats.drawn;
            newClubData.categoryStats[category].lost = playedStats.lost + remainingMatches;
            newClubData.categoryStats[category].goalsFor = playedStats.goalsFor;
            newClubData.categoryStats[category].goalsAgainst = playedStats.goalsAgainst + remainingMatches;
            newClubData.categoryStats[category].goalDifference = playedStats.goalsFor - newClubData.categoryStats[category].goalsAgainst;
            newClubData.categoryStats[category].points = playedStats.points;
           }
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
    });
  }, [isDate3Passed]); 

  useEffect(() => {
    if (rankings.length > 0 && !matches.loading) {
      recalculateRankingsFromMatches(matches.matches);
    }
  }, [matches.matches, recalculateRankingsFromMatches, matches.loading]);


    useEffect(() => {
     if (!loading && checkSub12Completion(rankings) ) {
       finalizeSub12Points(rankings);
     }
   }, [loading, isSub12Finalized, checkSub12Completion, finalizeSub12Points, rankings]);

   const updateRankings = useCallback((updatedCategoryStats: { clubId: string; category: Category; stats: TeamStats }[]) => {
     setRankingsState(prevRankings => {
       let rankingsAfterUpdate = prevRankings.map(club => {
         const updatesForClub = updatedCategoryStats.filter(upd => upd.clubId === club.id);
         if (updatesForClub.length === 0) return club;

         const newClubData = JSON.parse(JSON.stringify(club)); // Deep clone for modification
         updatesForClub.forEach(update => {
           newClubData.categoryStats[update.category] = update.stats;
         });

         // Recalculate club's general stats based on its new categoryStats
         let generalPoints = 0;
         let generalPlayed = 0;
         let generalWon = 0;
         let generalDrawn = 0;
         let generalLost = 0;
         let generalGoalsFor = 0;
         let generalGoalsAgainst = 0;

         Object.entries(newClubData.categoryStats).forEach(([cat, stats]) => {
            const categoryStats = stats as TeamStats; // Explicitly assert type here
            if (cat !== 'Sub12') {
                generalPoints += categoryStats.points;
                generalPlayed = Math.max(generalPlayed, categoryStats.played);
                generalWon += categoryStats.won;
                generalDrawn += categoryStats.drawn;
                generalLost += categoryStats.lost;
                generalGoalsFor += categoryStats.goalsFor;
                generalGoalsAgainst += categoryStats.goalsAgainst;
            }
         });

         newClubData.points = generalPoints; // Points before Sub12 bonus (if applicable)
         newClubData.played = generalPlayed;
         newClubData.won = generalWon;
         newClubData.drawn = generalDrawn;
         newClubData.lost = generalLost;
         newClubData.goalsFor = generalGoalsFor;
         newClubData.goalsAgainst = generalGoalsAgainst;
         newClubData.goalDifference = generalGoalsFor - generalGoalsAgainst;

         return newClubData;
       });

       // If Sub12 is already finalized, re-apply bonus points based on potentially changed Sub12 standings
       if (isSub12Finalized) {
           const sub12Sorted = [...rankingsAfterUpdate].sort((a, b) => {
             const statsA = a.categoryStats.Sub12;
             const statsB = b.categoryStats.Sub12;
             if (statsB.points !== statsA.points) return statsB.points - statsA.points;
             if (statsB.goalDifference !== statsA.goalDifference) return statsB.goalDifference - statsA.goalDifference;
             if (statsB.goalsFor !== statsA.goalsFor) return statsB.goalsFor - statsA.goalsFor;
             return a.name.localeCompare(b.name);
           });

           rankingsAfterUpdate = rankingsAfterUpdate.map(club => {
             const sub12Rank = sub12Sorted.findIndex(c => c.id === club.id);
             let bonusPoints = 0;
             if (sub12Rank >= 0 && sub12Rank < SUB12_POINTS_DISTRIBUTION.length) {
               bonusPoints = SUB12_POINTS_DISTRIBUTION[sub12Rank];
             } else if (sub12Rank >= 0) {
               bonusPoints = SUB12_POINTS_DISTRIBUTION[SUB12_POINTS_DISTRIBUTION.length - 1] ?? 0;
             }
             // club.points already has non-Sub12 points. Add bonus.
             // Ensure club.points is a number before addition
             const currentClubPoints = typeof club.points === 'number' ? club.points : 0;
             const generalPointsWithoutBonus = Object.entries(club.categoryStats) //Correct
                .filter(([category]) => category !== 'Sub12')
                .reduce((sum, [, stats]) => sum + stats.points, 0);
             return { ...club, points: generalPointsWithoutBonus + bonusPoints };
           });
       }
       return rankingsAfterUpdate;
     });
   }, [isSub12Finalized]);

  // Function to handle promotion and relegation
  const handlePromotionRelegation = useCallback(() => {
    setRankingsState(prevRankings => {
        const primeraDivision = prevRankings.filter(club => club.division === 'Primera');
        const segundaDivision = prevRankings.filter(club => club.division === 'Segunda');

        const sortFn = (a: ClubRanking, b: ClubRanking) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        };

        primeraDivision.sort(sortFn);
        segundaDivision.sort(sortFn);

        const teamsToRelegate = primeraDivision.slice(-3); // Changed from -2 to -3
        const teamsToPromote = segundaDivision.slice(0, 3); // Changed from 0, 2 to 0, 3

        const newRankings = prevRankings.map(club => {
            const resetClubStats = {
                ...initialTeamStats(), // Reset general stats
                points: 0, // General points to 0
                categoryStats: CATEGORIES.reduce((acc, category) => {
                    acc[category] = initialTeamStats(); // Reset stats for each category
                    return acc;
                }, {} as Record<Category, TeamStats>),
            };

            if (teamsToRelegate.find(t => t.id === club.id)) {
                return { ...club, ...resetClubStats, division: 'Segunda' as Division };
            }
            if (teamsToPromote.find(t => t.id === club.id)) {
                return { ...club, ...resetClubStats, division: 'Primera' as Division };
            }
            // For teams not promoted or relegated, just reset their stats
            return { ...club, ...resetClubStats };
        });
        console.log("Promotion and relegation processed for 3 teams. All team stats reset for new season.");
        return newRankings;
    });
    setIsSub12FinalizedState(false); // Reset Sub12 finalization status for the new season
  }, []);


  return { rankings, updateRankings, loading, isSub12Finalized, finalizeSub12Points, checkSub12Completion, handlePromotionRelegation, setRankings, toggleSeriesDisabled, isDate3Passed, toggleDate3Passed, recalculateRankingsFromMatches, matchesLoading: matches.loading };
}


// --- Matches Hook ---
export function useMatches() {
  const [matches, setMatchesState] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    const storedMatches = safelyParseJSON<MatchResult[]>(MATCHES_KEY, []);
     const parsedMatches = storedMatches.map(match => ({
       ...match,
       date: new Date(match.date)
     }));
    setMatchesState(parsedMatches);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
       safelySetJSON(MATCHES_KEY, matches);
    }
  }, [matches, loading]);

  const addMatch = (newMatch: MatchResult) => {
     const matchToAdd = {
       ...newMatch,
       date: new Date(newMatch.date)
     };
    setMatchesState((prevMatches) => [...prevMatches, matchToAdd]);
  };

  const updateMatch = useCallback((updatedMatchData: MatchResult) => {
    setMatchesState(prevMatches =>
        prevMatches.map(m => (m.id === updatedMatchData.id ? { ...updatedMatchData, date: new Date(updatedMatchData.date) } : m))
    );
  }, []);


  const getMatches = useCallback(() => matches, [matches]);

   const countSub12Matches = useCallback(() => {
     return matches.filter(match =>
       match.results.Sub12.localGoals !== null && match.results.Sub12.visitorGoals !== null
     ).length;
   }, [matches]);


  return { matches: getMatches(), addMatch, updateMatch, loading, countSub12Matches };
}

// --- Suspensions Hook ---
export function useSuspensions() {
  const [suspensions, setSuspensionsState] = useState<Suspension[]>([]);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
     const storedSuspensions = safelyParseJSON<Suspension[]>(SUSPENSIONS_KEY, []);
     const parsedSuspensions = storedSuspensions.map(suspension => ({
       ...suspension,
       startDate: new Date(suspension.startDate),
       endDate: new Date(suspension.endDate), // endDate is exclusive
       playerRut: formatRut(suspension.playerRut),
     }));
    setSuspensionsState(parsedSuspensions);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
        safelySetJSON(SUSPENSIONS_KEY, suspensions);
    }
  }, [suspensions, loading]);

  const addSuspension = (newSuspension: Suspension) => {
     const suspensionToAdd = {
       ...newSuspension,
       startDate: new Date(newSuspension.startDate),
       endDate: new Date(newSuspension.endDate), // endDate is exclusive
       playerRut: formatRut(newSuspension.playerRut),
     };
    setSuspensionsState((prevSuspensions) => [...prevSuspensions, suspensionToAdd]);
  };

  const updateSuspension = useCallback((updatedSuspension: Suspension) => {
    setSuspensionsState((prevSuspensions) =>
      prevSuspensions.map((susp) =>
        susp.id === updatedSuspension.id ? { ...updatedSuspension, playerRut: formatRut(updatedSuspension.playerRut), startDate: new Date(updatedSuspension.startDate), endDate: new Date(updatedSuspension.endDate) } : susp
      )
    );
  }, []);

   const getSuspensions = useCallback(() => suspensions, [suspensions]);

   // Returns suspensions where the player is still considered suspended (endDate has not passed)
   const getActiveSuspensions = useCallback((date: Date = new Date()) => {
     const checkDate = new Date(date);
     checkDate.setHours(0, 0, 0, 0); // Normalize to start of the day for comparison

     return suspensions.filter(s => {
         const exclusiveEndDate = new Date(s.endDate); // This is the day they become free
         exclusiveEndDate.setHours(0,0,0,0);
         // Player is suspended if checkDate is BEFORE their exclusive endDate
         return checkDate < exclusiveEndDate;
     });
   }, [suspensions]);


  return { suspensions: getSuspensions(), addSuspension, updateSuspension, getActiveSuspensions, loading };
}

// --- Players Hook ---
export function usePlayers() {
  const [players, setPlayersState] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedPlayers = safelyParseJSON<Player[]>(PLAYERS_KEY, []);
     const parsedPlayers = storedPlayers.map(player => ({
       ...player,
       birthDate: new Date(player.birthDate),
       registrationDate: player.registrationDate ? new Date(player.registrationDate) : new Date(),
       age: calculateAge(new Date(player.birthDate)),
       rut: formatRut(player.rut),
     }));
    setPlayersState(parsedPlayers);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      safelySetJSON(PLAYERS_KEY, players);
    }
  }, [players, loading]);

  const addPlayer = (newPlayerData: PlayerInput) => {
    if (!validateRut(newPlayerData.rut)) {
        console.error(`Invalid RUT provided for player: ${newPlayerData.rut}`);
        return;
    }
    const formattedRutValue = formatRut(newPlayerData.rut);

    const age = calculateAge(newPlayerData.birthDate);
    const newPlayer: Player = {
      ...newPlayerData,
      rut: formattedRutValue,
      id: `player-${formattedRutValue}-${Date.now()}`,
      age,
      birthDate: new Date(newPlayerData.birthDate),
      registrationDate: new Date()
    };
    setPlayersState((prevPlayers) => {
      if (prevPlayers.some(p => p.rut === newPlayer.rut)) {
         console.warn(`Player with RUT ${newPlayer.rut} already exists.`);
         return prevPlayers;
      }
      return [...prevPlayers, newPlayer];
    });
  };

  const getPlayerByRut = useCallback((rut: string | null | undefined): Player | undefined => {
    if (!rut) return undefined;
    const normalizedInputRut = formatRut(rut);
     return players.find(p => p.rut === normalizedInputRut);
  }, [players]);

  const getPlayersByClub = useCallback((clubId: string): Player[] => {
      return players.filter(p => p.clubId === clubId);
  }, [players]);

  const getPlayers = useCallback(() => players, [players]);

  return { players: getPlayers(), addPlayer, getPlayerByRut, getPlayersByClub, loading };
}

