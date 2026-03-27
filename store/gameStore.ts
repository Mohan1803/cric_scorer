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
  isOut: boolean;
  status: 'not_out' | 'out' | 'batting';
  dismissalDetail?: string; // e.g., "c Fielder b Bowler"
  role: string;
  isReserve?: boolean;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
}

export interface BallRecord {
  runs: number;
  isExtra: boolean;
  isNoBall: boolean;
  extraType?: 'wide' | 'no-ball' | 'lb' | 'bye' | 'penalty';
  batsmanName: string;
  bowlerName: string;
  batsmanId: string;
  bowlerId: string;
  isWicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'stumped' | 'run-out' | 'lbw' | 'hit-wicket' | 'caught-and-bowled' | 'caught-&-bowled';
  runOutBatsman?: string;
  runOutBatsmanId?: string;
  runOutRuns?: number;
  fielderName?: string;
  fielderId?: string;
  isFour?: boolean;
  isSix?: boolean;
  replacedBatsmanName?: string;
  replacedBatsmanId?: string;
  dismissalDetail?: string;
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
          undoStack: [],
        });
      },



      checkDuplicateName: (teamIndex: any, name: any) => {
        const state: any = get();
        return state.teams[teamIndex]?.players.some(
          (p: any) => p.name.toLowerCase() === name.toLowerCase()
        ) || false;
      },




      updateScore: (record: BallRecord) => {
        const state = get();
        if (state.matchCompleted || state.awaitingSecondInningsStart) return;

        // 1. Enrich history and overs data
        const newBallHistory = [...state.ballHistory, {
          ...record,
          bowlerName: state.currentBowler?.name || record.bowlerName || '',
          dismissalDetail: record.isWicket ? (() => {
            switch (record.wicketType as any) {
              case 'caught': return `c ${record.fielderName || 'Fielder'} b ${record.bowlerName}`;
              case 'bowled': return `b ${record.bowlerName}`;
              case 'lbw': return `lbw b ${record.bowlerName}`;
              case 'stumped': return `st ${record.fielderName || 'Fielder'} b ${record.bowlerName}`;
              case 'run-out': return `run out (${record.fielderName || ''})`;
              case 'caught-and-bowled': return `c&b ${record.bowlerName}`;
              case 'hit-wicket': return `hit wicket b ${record.bowlerName}`;
              default: return `b ${record.bowlerName}`;
            }
          })() : undefined
        }];

        const legalDeliveries = state.ballHistory.filter(b => !b.isExtra || (b.extraType === 'bye' || b.extraType === 'lb')).length;
        const currentOverNumber = Math.floor(legalDeliveries / 6);
        const enrichedRecord = newBallHistory[newBallHistory.length - 1];
        let updatedOversData = [...state.oversData];
        let lastOver = updatedOversData[updatedOversData.length - 1];

        if (!lastOver || lastOver.overNumber !== currentOverNumber) {
          updatedOversData.push({ overNumber: currentOverNumber, deliveries: [enrichedRecord], innings: state.currentInningsNumber });
        } else {
          updatedOversData[updatedOversData.length - 1] = {
            ...lastOver,
            deliveries: [...lastOver.deliveries, enrichedRecord]
          };
        }

        const isLegal = !record.isExtra || (record.extraType === 'bye' || record.extraType === 'lb');
        const penaltyRuns = (record.isExtra && record.extraType === 'penalty') ? record.runs : 0;

        let tempStriker = state.striker;
        let tempNonStriker = state.nonStriker;

        // 2. Player Updates
        const updatedTeams = state.teams.map((team) => {
          const isBattingTeam = team.name === state.battingTeam;
          const isBowlingTeam = team.name === state.bowlingTeam;

          return {
            ...team,
            players: team.players.map((player) => {
              const isBowler = isBowlingTeam && player.id === record.bowlerId;
              const isStriker = isBattingTeam && player.id === state.striker?.id;
              const isNonStriker = isBattingTeam && player.id === state.nonStriker?.id;

              if (isBowler) {
                return {
                  ...player,
                  ballsBowled: player.ballsBowled + (record.extraType !== 'penalty' && isLegal ? 1 : 0),
                  runsGiven: player.runsGiven + (record.isExtra ? (record.extraType === 'wide' || record.extraType === 'no-ball' ? record.runs + 1 : (record.extraType === 'penalty' ? record.runs : 0)) : record.runs),
                  wickets: player.wickets + (record.isWicket && record.wicketType !== 'run-out' ? 1 : 0),
                };
              }

              if (isStriker) {
                let p = { ...player };
                if (record.extraType !== 'wide' && record.extraType !== 'penalty') p.balls += 1;
                if (!record.isExtra || record.extraType === 'no-ball') {
                  if (record.extraType !== 'penalty') {
                    p.runs += record.runs;
                    if (record.runs === 4) p.fours += 1;
                    if (record.runs === 6) p.sixes += 1;
                  }
                }

                let isOut = record.isWicket && record.wicketType !== 'run-out';
                if (record.wicketType === 'run-out' && (record.runOutBatsman === 'striker' || record.runOutBatsmanId === player.id)) isOut = true;

                if (isOut) {
                  const calculatedDetail = (() => {
                    switch (record.wicketType as any) {
                      case 'caught': return `c ${record.fielderName || 'Fielder'} b ${record.bowlerName}`;
                      case 'bowled': return `b ${record.bowlerName}`;
                      case 'lbw': return `lbw b ${record.bowlerName}`;
                      case 'stumped': return `st ${record.fielderName || 'Fielder'} b ${record.bowlerName}`;
                      case 'run-out': return `run out (${record.fielderName || ''})`;
                      case 'caught-&-bowled':
                      case 'caught-and-bowled': return `c&b ${record.bowlerName}`;
                      case 'hit-wicket': return `hit wicket b ${record.bowlerName}`;
                      default: return `b ${record.bowlerName}`;
                    }
                  })();
                  return { ...p, isOut: true, status: 'out' as const, dismissalDetail: calculatedDetail };
                }
                return p;
              }

              if (isNonStriker) {
                let p = { ...player };
                const isOut = record.isWicket && record.wicketType === 'run-out' && (record.runOutBatsman === 'non-striker' || record.runOutBatsmanId === player.id);
                if (isOut) {
                  return { ...p, isOut: true, status: 'out' as const, dismissalDetail: `run out (${record.fielderName || ''})` };
                }
                return p;
              }

              return player;
            }),
          };
        });

        // 3. Strike Rotation
        const newLegalBalls = legalDeliveries + (isLegal ? 1 : 0);
        const isOverEnd = isLegal && (newLegalBalls % 6 === 0);
        let shouldSwap = (record.runs % 2 === 1);
        if (isOverEnd) shouldSwap = !shouldSwap;

        if (shouldSwap) {
          [tempStriker, tempNonStriker] = [tempNonStriker, tempStriker];
        }

        let finalUpdates: Partial<GameState> = {
          teams: updatedTeams,
          ballHistory: newBallHistory,
          oversData: updatedOversData,
          striker: tempStriker,
          nonStriker: tempNonStriker,
        };

        const allPlayers = updatedTeams.flatMap(t => t.players);
        if (tempStriker) finalUpdates.striker = allPlayers.find(p => p.id === tempStriker?.id) || tempStriker;
        if (tempNonStriker) finalUpdates.nonStriker = allPlayers.find(p => p.id === tempNonStriker?.id) || tempNonStriker;
        if (state.currentBowler) finalUpdates.currentBowler = allPlayers.find(p => p.id === state.currentBowler?.id) || state.currentBowler;

        if (record.isWicket) {
          finalUpdates.showBatsmanSelectModal = true;
          const outId = record.runOutBatsmanId || (record.runOutBatsman === 'striker' ? state.striker?.id : (record.runOutBatsman === 'non-striker' ? state.nonStriker?.id : null));
          finalUpdates.batsmanToReplace = (record.wicketType === 'run-out' ? (tempStriker?.id === outId ? 'striker' : 'non-striker') : (tempStriker?.id === state.striker?.id ? 'striker' : 'non-striker'));
          finalUpdates.undoStack = [...state.undoStack, { type: 'wicket_restore', details: { striker: state.striker, nonStriker: state.nonStriker, teams: state.teams } }];
        }

        // 4. Inning Progress
        const score = newBallHistory.reduce((sum, b) => sum + b.runs + (b.isExtra && (b.extraType === 'wide' || b.extraType === 'no-ball') ? 1 : 0) + (b.isExtra && b.extraType === 'penalty' ? b.runs : 0), 0);
        const wicketsCount = newBallHistory.filter(b => b.isWicket).length;
        const currentBattingTeamPlayers = updatedTeams.find(t => t.name === state.battingTeam)?.players || [];
        const isAllOut = wicketsCount >= (currentBattingTeamPlayers.length - 1);
        const oversDone = Math.floor(newLegalBalls / 6) >= state.totalOvers;

        if (state.currentInningsNumber === 1 && (isAllOut || oversDone)) {
          finalUpdates.target = score;
          finalUpdates.firstInningsBallHistory = [...newBallHistory];
          finalUpdates.awaitingSecondInningsStart = true;
        }

        if (state.currentInningsNumber === 2 && state.target !== null) {
          const isTargetAchieved = score > state.target;
          if ((isTargetAchieved || isAllOut || oversDone) && !state.matchCompleted) {
            finalUpdates.matchCompleted = true;
            alert(isTargetAchieved ? `${state.battingTeam} wins!` : (score === state.target ? "Match Tied!" : `${state.bowlingTeam} wins!`));
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
        const totalRunsRemoved = (lastBall.isExtra && lastBall.extraType === 'penalty') ? lastBall.runs : (lastBall.runs + (lastBall.isExtra && (lastBall.extraType === 'wide' || lastBall.extraType === 'no-ball') ? 1 : 0));

        const updatedTeams = state.teams.map(team => ({
          ...team,
          players: team.players.map(player => {
            const isBattingTeam = team.name === state.battingTeam;
            const isBowlingTeam = team.name === state.bowlingTeam;

            if (isBattingTeam && player.id === lastBall.batsmanId && (wasLegal || (lastBall.isExtra && lastBall.extraType === 'no-ball'))) {
              return { ...player, runs: player.runs - lastBall.runs, balls: player.balls - 1, fours: player.fours - (lastBall.runs === 4 ? 1 : 0), sixes: player.sixes - (lastBall.runs === 6 ? 1 : 0) };
            }
            if (isBattingTeam && lastBall.isWicket && player.id === lastBall.batsmanId) {
              return { ...player, isOut: false, status: 'not_out' as const, dismissalDetail: undefined };
            }
            if (isBowlingTeam && player.id === lastBall.bowlerId) {
              return { ...player, ballsBowled: player.ballsBowled - (wasLegal ? 1 : 0), runsGiven: player.runsGiven - totalRunsRemoved, wickets: player.wickets - (lastBall.isWicket && lastBall.wicketType !== 'run-out' ? 1 : 0) };
            }
            return player;
          }),
        }));

        let tempStriker = state.striker;
        let tempNonStriker = state.nonStriker;
        const isOverEndOfRemovedBall = wasLegal && (legalBallsCount + 1) % 6 === 0;
        let shouldReverseSwap = (lastBall.runs % 2 === 1);
        if (isOverEndOfRemovedBall) shouldReverseSwap = !shouldReverseSwap;

        if (shouldReverseSwap && !lastBall.isWicket) {
          [tempStriker, tempNonStriker] = [tempNonStriker, tempStriker];
        }

        const updatedOversData = [...state.oversData];
        const lastOverIndex = updatedOversData.length - 1;
        if (lastOverIndex >= 0) {
          const deliveries = [...updatedOversData[lastOverIndex].deliveries];
          deliveries.pop();
          if (deliveries.length === 0) updatedOversData.pop();
          else updatedOversData[lastOverIndex] = { ...updatedOversData[lastOverIndex], deliveries };
        }

        let finalUpdates: Partial<GameState> = { teams: updatedTeams, ballHistory: newBallHistory, oversData: updatedOversData, striker: tempStriker, nonStriker: tempNonStriker };

        if (lastBall.isWicket && state.undoStack.length > 0) {
          const lastUndo = state.undoStack[state.undoStack.length - 1];
          if (lastUndo.type === 'wicket_restore') {
            finalUpdates.striker = lastUndo.details.striker;
            finalUpdates.nonStriker = lastUndo.details.nonStriker;
            finalUpdates.teams = lastUndo.details.teams;
            finalUpdates.undoStack = state.undoStack.slice(0, -1);
          }
        }

        const lastLegalBall = [...newBallHistory].reverse().find(b => !b.isExtra || (b.extraType === 'bye' || b.extraType === 'lb'));
        if (lastLegalBall) {
          const allPlayers = finalUpdates.teams?.flatMap(t => t.players) || updatedTeams.flatMap(t => t.players);
          finalUpdates.currentBowler = allPlayers.find(p => p.id === lastLegalBall.bowlerId) || null;
        }

        if (newBallHistory.length === 0) {
          finalUpdates.currentBowler = state.lastSelectedBowler;
          finalUpdates.striker = state.initialStriker;
          finalUpdates.nonStriker = state.initialNonStriker;
        }

        const battingTeamPlayers = (finalUpdates.teams || updatedTeams).find(t => t.name === state.battingTeam)?.players || [];
        const isComplete = (Math.floor(legalBallsCount / 6) >= state.totalOvers) || (newBallHistory.filter(b => b.isWicket).length >= (battingTeamPlayers.length - 1));
        if (!isComplete) finalUpdates.awaitingSecondInningsStart = false;

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
