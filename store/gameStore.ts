import { router } from 'expo-router';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Player {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  ballsBowled: number;
  wickets: number;
  runsGiven: number;
  isOut?: boolean;
  // role: 'batsman' | 'bowler';
  // status: 'active' | 'out';
  role: string,
  status: string,
  isReserve?: boolean
}

export interface BallRecord {
  runs: number;
  isExtra: boolean;
  isNoBall: boolean;
  extraType?: 'wide' | 'no-ball' | 'lb' | 'bye';
  batsmanName: string;
  bowlerName: string;
  batsmanId: string;
  bowlerId: string;
  isWicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'stumped' | 'run-out';
  runOutBatsman?: string;
  runOutBatsmanId?: string;
  runOutRuns?: number;
  isFour?: boolean;
  isSix?: boolean;
  replacedBatsmanName?: string;
  replacedBatsmanId?: string;
}

export interface Team {
  name: string;
  players: Player[];
}

export interface OverData {
  overNumber: number;
  innings: number;
  deliveries: BallRecord[];
}

export interface UndoOperation {
  type: 'wicket_restore';
  details: any;
}

export interface GameState {
  initialStriker: Player | null;
  initialNonStriker: Player | null;
  currentInningsNumber: 1 | 2;

  teams: Team[];
  tossWinner: string | null;
  battingTeam: string | null;
  bowlingTeam: string | null;
  striker: Player | null;
  nonStriker: Player | null;
  currentBowler: Player | null;
  lastSelectedBowler: Player | null;
  ballHistory: BallRecord[];
  firstInningsBallHistory: BallRecord[];
  totalOvers: number;
  secondInningsOver: number;
  target: number | null;
  matchDate: Date;
  matchCompleted: boolean;
  awaitingSecondInningsStart: boolean;
  oversData: OverData[];
  firstInningsOversData: OverData[];
  previousStriker: Player | null;

  setTeams: (teams: Team[]) => void;
  setTossWinner: (team: string) => void;
  setBattingTeam: (team: string) => void;
  setBowlingTeam: (team: string) => void;
  setStriker: (player: Player | null) => void;
  setNonStriker: (player: Player | null) => void;
  setCurrentBowler: (player: Player | null) => void;
  setTotalOvers: (overs: number) => void;
  updateScore: (record: BallRecord) => void;
  undoLastBall: () => void;
  swapBatsmen: () => void;
  startSecondInnings: () => void;
  startNewMatch: () => void;
  checkDuplicateName: (teamIndex: number, name: string) => boolean;
  setSecondInningsOver: (overs: number) => void;
  setAwaitingSecondInningsStart: (flag: boolean) => void;
  setPreviousStriker: (player: Player | null) => void;

  batsmanToReplace: 'striker' | 'non-striker' | null;
  showBatsmanSelectModal: boolean;
  setBatsmanToReplace: (end: 'striker' | 'non-striker' | null) => void;
  setShowBatsmanSelectModal: (show: boolean) => void;

  undoStack: UndoOperation[];
  clearUndoStack: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      initialStriker: null,
      currentInningsNumber: 1,
      initialNonStriker: null,
      teams: [],
      tossWinner: null,
      battingTeam: null,
      bowlingTeam: null,
      striker: null,
      nonStriker: null,
      currentBowler: null,
      lastSelectedBowler: null,
      ballHistory: [],
      firstInningsBallHistory: [],
      totalOvers: 0,
      secondInningsOver: 0,

      target: null,
      matchDate: new Date(),
      matchCompleted: false,
      awaitingSecondInningsStart: false,
      oversData: [],
      firstInningsOversData: [], // <-- Store first innings overs
      previousStriker: null,

      setTeams: (teams: Team[]) => set({ teams }),
      setTossWinner: (team: string) => set({ tossWinner: team }),
      setBattingTeam: (team: string) => set({ battingTeam: team }),
      setBowlingTeam: (team: string) => set({ bowlingTeam: team }),
      setStriker: (player: Player | null) => set((state) => {
        // If this is the first striker being set, also set initialStriker
        if (!state.initialStriker) {
          return { striker: player, initialStriker: player };
        }
        return { striker: player };
      }),
      setNonStriker: (player: Player | null) => set((state) => {
        // If this is the first non-striker being set, also set initialNonStriker
        if (!state.initialNonStriker) {
          return { nonStriker: player, initialNonStriker: player };
        }
        return { nonStriker: player };
      }),
      setCurrentBowler: (player: Player | null) => set((state) => ({
        currentBowler: player,
        lastSelectedBowler: player || state.lastSelectedBowler
      })),
      setTotalOvers: (overs: number) => set({ totalOvers: overs }),
      setSecondInningsOver: (overs: number) => set({ secondInningsOver: overs }),
      setAwaitingSecondInningsStart: (flag: boolean) => set({ awaitingSecondInningsStart: flag }),
      setPreviousStriker: (player: Player | null) => set({ previousStriker: player }),

      batsmanToReplace: null,
      showBatsmanSelectModal: false,

      setBatsmanToReplace: (end: 'striker' | 'non-striker' | null) => set({ batsmanToReplace: end }),
      setShowBatsmanSelectModal: (show: boolean) => set({ showBatsmanSelectModal: show }),

      // Undo stack and operations
      undoStack: [],
      clearUndoStack: () => set({ undoStack: [] }),

      swapBatsmen: () => {
        const state = get();
        set({ striker: state.nonStriker, nonStriker: state.striker });
      },

      startSecondInnings: () => {
        const state = get();
        console.log('BEFORE second innings:', {
          teams: state.teams,
          battingTeam: state.battingTeam,
          bowlingTeam: state.bowlingTeam,
        });
        const firstInningsScore = state.ballHistory.reduce(
          (sum, b) => sum + b.runs + (b.isExtra && (b.extraType === 'wide' || b.extraType === 'no-ball') ? 1 : 0), 0);
        set({
          target: firstInningsScore,
          battingTeam: state.bowlingTeam,
          bowlingTeam: state.battingTeam,
          striker: null,
          nonStriker: null,
          currentBowler: null,
          ballHistory: [],
          firstInningsBallHistory: [...state.ballHistory],
          firstInningsOversData: [...state.oversData], // <-- Save first innings overs
          awaitingSecondInningsStart: false,
          initialStriker: null,
          initialNonStriker: null,
          oversData: [], // <-- Reset oversData for second innings
          currentInningsNumber: 2, // <-- Ensure second innings logic works
          batsmanToReplace: null,
          showBatsmanSelectModal: false,
        });
        const after = get();
        console.log('AFTER second innings:', {
          teams: after.teams,
          battingTeam: after.battingTeam,
          bowlingTeam: after.bowlingTeam,
        });
      },

      startNewMatch: () => {
        set({
          initialStriker: null,
          initialNonStriker: null,
          currentInningsNumber: 1,
          teams: [],
          tossWinner: null,
          battingTeam: null,
          bowlingTeam: null,
          striker: null,
          nonStriker: null,
          currentBowler: null,
          lastSelectedBowler: null,
          ballHistory: [],
          firstInningsBallHistory: [],
          totalOvers: 0,
          secondInningsOver: 0,
          target: null,
          matchDate: new Date(),
          matchCompleted: false,
          awaitingSecondInningsStart: false,
          oversData: [],
          firstInningsOversData: [],
          previousStriker: null,
          batsmanToReplace: null,
          showBatsmanSelectModal: false,
          undoStack: [],
        });
      },



      checkDuplicateName: (teamIndex: any, name: any) => {
        const state: any = get();
        return state.teams[teamIndex]?.players.some(
          (p: any) => p.name.toLowerCase() === name.toLowerCase()
        ) || false;
      },




      updateScore: (record: any) => {
        const state = get();
        if (state.matchCompleted || state.awaitingSecondInningsStart) {
          console.log('Innings/Match already over. Blocking updateScore.');
          return;
        }
        const newBallHistory = [...state.ballHistory, record];
        const legalDeliveries = state.ballHistory.filter((b) =>
          !b.isExtra || (b.extraType === 'bye' || b.extraType === 'lb')
        ).length;

        // Calculate the current over number based on legal deliveries
        const currentOverNumber = Math.floor(legalDeliveries / 6);

        // Track overs correctly
        let updatedOversData = [...state.oversData];
        let lastOver = updatedOversData[updatedOversData.length - 1];

        if (!lastOver || lastOver.overNumber !== currentOverNumber) {
          updatedOversData.push({ overNumber: currentOverNumber, deliveries: [record], innings: state.currentInningsNumber });
        } else {
          lastOver.deliveries.push(record);
        }

        const totalRuns = record.runs + (record.isExtra && (record.extraType === 'wide' || record.extraType === 'no-ball') ? 1 : 0);
        const isFour = record.isFour ?? record.runs === 4;
        const isSix = record.isSix ?? record.runs === 6;

        let tempStriker = state.striker;
        let tempNonStriker = state.nonStriker;

        const updatedTeams = state.teams.map((team) => ({
          ...team,
          players: team.players.map((player) => {
            const isBowler = player.id === record.bowlerId;
            const isStriker = player.id === state.striker?.id;
            const isNonStriker = player.id === state.nonStriker?.id;

            // Bowler updates
            if (isBowler) {
              return {
                ...player,
                ballsBowled: player.ballsBowled + (record.isExtra && (record.extraType === 'wide' || record.extraType === 'no-ball') ? 0 : 1),
                runsGiven: player.runsGiven + totalRuns,
                wickets: player.wickets + (record.isWicket && record.wicketType !== 'run-out' ? 1 : 0),
              };
            }

            // Determine if this player is the one who got out
            let isOut = record.isWicket && record.wicketType !== 'run-out' && isStriker;
            if (record.isWicket && record.wicketType === 'run-out') {
              if (
                (record.runOutBatsmanId === player.id) ||
                (record.runOutBatsman === 'striker' && isStriker) ||
                (record.runOutBatsman === 'non-striker' && isNonStriker) ||
                (record.runOutBatsman === state.striker?.name && isStriker) ||
                (record.runOutBatsman === state.nonStriker?.name && isNonStriker)
              ) {
                isOut = true;
              }
            }

            // Batsman updates
            if (isStriker || isNonStriker) {
              const addRuns = isStriker ? (record.isNoBall ? record.runs : (record.isExtra ? 0 : record.runs)) : 0;
              const addBall = isStriker ? (record.isExtra && (record.extraType === 'wide') ? 0 : 1) : 0;

              return {
                ...player,
                runs: player.runs + addRuns,
                balls: player.balls + addBall,
                fours: player.fours + (isStriker && record.extraType !== 'wide' && isFour ? 1 : 0),
                sixes: player.sixes + (isStriker && isSix ? 1 : 0),
                status: isOut ? 'out' : player.status,
                isOut: isOut ? true : player.isOut,
              };
            }

            return player;
          }),
        }));

        // Strike Rotation Logic
        const isLegalDelivery = !record.isExtra || (record.extraType === 'bye' || record.extraType === 'lb');
        const newLegalBalls = legalDeliveries + (isLegalDelivery ? 1 : 0);
        const isLastLegalBall = isLegalDelivery && (newLegalBalls % 6 === 0);

        let shouldSwap = false;
        // Rule 1: Swap on odd runs
        if (record.runs % 2 === 1) {
          shouldSwap = !shouldSwap;
        }
        // Rule 2: Swap at end of over
        if (isLastLegalBall) {
          shouldSwap = !shouldSwap;
        }

        if (shouldSwap) {
          [tempStriker, tempNonStriker] = [tempNonStriker, tempStriker];
        }

        // Final updates object
        let finalUpdates: Partial<GameState> = {
          teams: updatedTeams,
          ballHistory: newBallHistory,
          oversData: updatedOversData,
          striker: tempStriker,
          nonStriker: tempNonStriker
        };

        // Synchronize current players from updated teams
        const allPlayers = updatedTeams.flatMap(t => t.players);
        if (tempStriker) {
          finalUpdates.striker = allPlayers.find(p => p.id === tempStriker.id) || tempStriker;
        }
        if (tempNonStriker) {
          finalUpdates.nonStriker = allPlayers.find(p => p.id === tempNonStriker.id) || tempNonStriker;
        }
        if (state.currentBowler) {
          finalUpdates.currentBowler = allPlayers.find(p => p.id === state.currentBowler?.id) || state.currentBowler;
        }

        // Handle Wicket State Updates
        if (record.isWicket) {
          const prevStriker = state.striker ? { ...state.striker } : null;
          const prevNonStriker = state.nonStriker ? { ...state.nonStriker } : null;
          const prevTeams = JSON.parse(JSON.stringify(state.teams));

          finalUpdates.undoStack = [
            ...state.undoStack,
            {
              type: 'wicket_restore',
              details: { striker: prevStriker, nonStriker: prevNonStriker, teams: prevTeams },
            },
          ];

          // Determine which SLOT is now out (it might have swapped)
          if (record.wicketType === 'run-out') {
            const outId = record.runOutBatsmanId || (record.runOutBatsman === 'striker' ? state.striker?.id : (record.runOutBatsman === 'non-striker' ? state.nonStriker?.id : null));
            finalUpdates.batsmanToReplace = tempStriker?.id === outId ? 'striker' : 'non-striker';
          } else {
            // Normal wicket: the batsman who was the striker at the START of the ball is out
            finalUpdates.batsmanToReplace = tempStriker?.id === state.striker?.id ? 'striker' : 'non-striker';
          }
          finalUpdates.showBatsmanSelectModal = true;
        }

        // Innings End / Match Complete
        const score = newBallHistory.reduce((sum, b) => sum + b.runs + (b.isExtra && (b.extraType === 'wide' || b.extraType === 'no-ball') ? 1 : 0), 0);
        const wickets = newBallHistory.filter((b) => b.isWicket).length;
        const battingTeamPlayers = state.teams.find((t) => t.name === state.battingTeam)?.players || [];
        const isAllOut = wickets >= (battingTeamPlayers.length - 1);
        const oversDone = Math.floor(newLegalBalls / 6) >= state.totalOvers;

        if (state.currentInningsNumber === 1 && (isAllOut || oversDone)) {
          finalUpdates.target = score;
          finalUpdates.firstInningsBallHistory = [...newBallHistory];
          finalUpdates.awaitingSecondInningsStart = true;
        }

        if (state.currentInningsNumber === 2 && state.target !== null) {
          const secondInningsOversDone = Math.floor(newLegalBalls / 6) >= state.totalOvers;
          const isTargetAchieved = score > state.target;
          const isTied = score === state.target;
          const isInningsComplete = isTargetAchieved || isAllOut || secondInningsOversDone;

          if (isInningsComplete && !state.matchCompleted) {
            finalUpdates.matchCompleted = true;
            const alertMessage = isTargetAchieved ? `${state.battingTeam} wins by ${10 - wickets} wicket(s)!` : (isTied ? `The match is tied!` : `${state.bowlingTeam} wins by ${state.target - score} run(s)!`);
            alert(alertMessage);
            router.push('/full-scorecard');
          }
        }

        set(finalUpdates);
      },

      undoLastBall: () => {
        const state = get();
        if (state.ballHistory.length === 0) return;

        const lastBall = state.ballHistory[state.ballHistory.length - 1];
        const newBallHistory = state.ballHistory.slice(0, -1);
        const wasLegal = !lastBall.isExtra || (lastBall.extraType === 'bye' || lastBall.extraType === 'lb');

        const legalBallsCount = newBallHistory.filter(b => !b.isExtra || (b.extraType === 'bye' || b.extraType === 'lb')).length;
        const totalRunsRemoved = lastBall.runs + (lastBall.isExtra && (lastBall.extraType === 'wide' || lastBall.extraType === 'no-ball') ? 1 : 0);
        const isFour = lastBall.isFour ?? lastBall.runs === 4;
        const isSix = lastBall.isSix ?? lastBall.runs === 6;
        const isBatsmanScoringExtra = lastBall.isExtra && lastBall.extraType === 'no-ball';

        // Update player stats (reverse them)
        const updatedTeams = state.teams.map(team => ({
          ...team,
          players: team.players.map(player => {
            if (player.id === lastBall.batsmanId && (wasLegal || isBatsmanScoringExtra)) {
              return {
                ...player,
                runs: player.runs - lastBall.runs,
                balls: player.balls - 1,
                fours: player.fours - (isFour ? 1 : 0),
                sixes: player.sixes - (isSix ? 1 : 0),
              };
            }
            if (player.id === lastBall.bowlerId) {
              return {
                ...player,
                ballsBowled: player.ballsBowled - (lastBall.isExtra && (lastBall.extraType === 'wide' || lastBall.extraType === 'no-ball') ? 0 : 1),
                runsGiven: player.runsGiven - totalRunsRemoved,
                wickets: player.wickets - (lastBall.isWicket && lastBall.wicketType !== 'run-out' ? 1 : 0),
              };
            }
            return player;
          }),
        }));

        // Reverse strike rotation
        let tempStriker = state.striker;
        let tempNonStriker = state.nonStriker;

        const isOverEndOfRemovedBall = wasLegal && (legalBallsCount + 1) % 6 === 0;
        let shouldReverseSwap = false;
        if (lastBall.runs % 2 === 1) shouldReverseSwap = !shouldReverseSwap;
        if (isOverEndOfRemovedBall) shouldReverseSwap = !shouldReverseSwap;

        if (shouldReverseSwap && !lastBall.isWicket) {
          [tempStriker, tempNonStriker] = [tempNonStriker, tempStriker];
        }

        // OversData reversal
        const updatedOversData = [...state.oversData];
        const lastOverIndex = updatedOversData.length - 1;
        if (lastOverIndex >= 0) {
          const deliveries = [...updatedOversData[lastOverIndex].deliveries];
          deliveries.pop();
          if (deliveries.length === 0) {
            updatedOversData.pop();
          } else {
            updatedOversData[lastOverIndex] = { ...updatedOversData[lastOverIndex], deliveries };
          }
        }

        let finalUpdates: Partial<GameState> = {
          teams: updatedTeams,
          ballHistory: newBallHistory,
          oversData: updatedOversData,
          striker: tempStriker,
          nonStriker: tempNonStriker,
        };

        // Restoration if last ball was a wicket
        if (lastBall.isWicket && state.undoStack.length > 0) {
          const lastUndo = state.undoStack[state.undoStack.length - 1];
          if (lastUndo.type === 'wicket_restore') {
            finalUpdates.striker = lastUndo.details.striker;
            finalUpdates.nonStriker = lastUndo.details.nonStriker;
            finalUpdates.teams = lastUndo.details.teams;
            finalUpdates.undoStack = state.undoStack.slice(0, -1);
          }
        }

        // Determine Bowler after undo
        const lastLegalBall = [...newBallHistory].reverse().find(b => !b.isExtra || (b.extraType === 'bye' || b.extraType === 'lb'));
        if (lastLegalBall) {
          const allPlayers = finalUpdates.teams?.flatMap(t => t.players) || updatedTeams.flatMap(t => t.players);
          finalUpdates.currentBowler = allPlayers.find(p => p.id === lastLegalBall.bowlerId) || null;
        }

        // Edge case: Undo back to match start
        if (newBallHistory.length === 0) {
          finalUpdates.currentBowler = state.lastSelectedBowler;
          finalUpdates.striker = state.initialStriker;
          finalUpdates.nonStriker = state.initialNonStriker;
        }

        // Reset awaitingSecondInningsStart if necessary
        const battingTeamPlayers = (finalUpdates.teams || updatedTeams).find(t => t.name === state.battingTeam)?.players || [];
        const totalWickets = newBallHistory.filter(b => b.isWicket).length;
        const totalLegalOvers = Math.floor(legalBallsCount / 6);
        const stillComplete = totalLegalOvers >= state.totalOvers || totalWickets >= (battingTeamPlayers.length - 1);
        if (!stillComplete) {
          finalUpdates.awaitingSecondInningsStart = false;
        }

        set(finalUpdates);
      },
    }), {
    name: 'cric-scorer-match-state',
    storage: createJSONStorage(() => AsyncStorage),
    onRehydrateStorage: (state) => {
      return (state, error) => {
        if (state && state.matchDate && typeof state.matchDate === 'string') {
          state.matchDate = new Date(state.matchDate);
        }
      };
    },
  }));
