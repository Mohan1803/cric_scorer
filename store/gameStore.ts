import { router } from 'expo-router';
import { create } from 'zustand';

export interface Player {
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
  status: string
}

export interface BallRecord {
  runs: number;
  isExtra: boolean;
  isNoBall: boolean;
  extraType?: 'wide' | 'no-ball' | 'lb' | 'bye';
  batsmanName: string;
  bowlerName: string;
  isWicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'stumped' | 'run-out';
  runOutBatsman?: string;
  runOutRuns?: number;
  isFour?: boolean;
  isSix?: boolean;
  replacedBatsmanName?: string;

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
  type: 'remove_wicket' | 'remove_batsman' | 'wicket_restore';
  details: any; // You can type this more strictly if needed
}

export interface CurrentInnings {
  wickets: number;
  current_batsmen: any[];
  last_wicket_details?: any;
}

export interface GameState {
  initialStriker: Player | null;
  initialNonStriker: Player | null;
  currentInnings: CurrentInnings;
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

  // Undo stack and operations
  undoStack: UndoOperation[];
  addUndoOperation: (op: UndoOperation) => void;
  popUndoOperation: () => UndoOperation | undefined;
  clearUndoStack: () => void;
  applyUndoOperation: (op: UndoOperation) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  initialStriker: null,
  currentInnings: {
    wickets: 0,
    current_batsmen: [],
    last_wicket_details: undefined,
  },
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

  setTeams: (teams: any) => set({ teams }),
  setTossWinner: (team: any) => set({ tossWinner: team }),
  setBattingTeam: (team: any) => set({ battingTeam: team }),
  setBowlingTeam: (team: any) => set({ bowlingTeam: team }),
  setStriker: (player: any) => set((state: any) => {
    // If this is the first striker being set, also set initialStriker
    if (!state.initialStriker) {
      return { striker: player, initialStriker: player };
    }
    return { striker: player };
  }),
  setNonStriker: (player: any) => set((state: any) => {
    // If this is the first non-striker being set, also set initialNonStriker
    if (!state.initialNonStriker) {
      return { nonStriker: player, initialNonStriker: player };
    }
    return { nonStriker: player };
  }),
  setCurrentBowler: (player: any) => set((state: any) => ({
    currentBowler: player,
    lastSelectedBowler: player || state.lastSelectedBowler
  })),
  setTotalOvers: (overs: any) => set({ totalOvers: overs }),
  setSecondInningsOver: (overs: any) => set({ secondInningsOver: overs }),
  setAwaitingSecondInningsStart: (flag: any) => set({ awaitingSecondInningsStart: flag }),
  setPreviousStriker: (player: any) => set({ previousStriker: player }),

  batsmanToReplace: null,
  showBatsmanSelectModal: false,

  setBatsmanToReplace: (end: any) => set({ batsmanToReplace: end }),
  setShowBatsmanSelectModal: (show: any) => set({ showBatsmanSelectModal: show }),

  // Undo stack and operations
  undoStack: [],
  addUndoOperation: (op: any) => set((state: any) => ({ undoStack: [...state.undoStack, op] })),
  popUndoOperation: () => {
    const state: any = get();
    if (state.undoStack.length === 0) return undefined;
    const last = state.undoStack[state.undoStack.length - 1];
    set({ undoStack: state.undoStack.slice(0, -1) });
    return last;
  },
  clearUndoStack: () => set({ undoStack: [] }),
  applyUndoOperation: (undoOperation: any) => {
    // This function will update the state according to the undo operation type
    set((state) => {
      const updated = { ...state };
      if (undoOperation.type === 'remove_wicket') {
        // Undo wicket: decrement wickets and remove last_wicket_details
        if (
          updated.currentInningsNumber === 1 && typeof updated.currentInnings.wickets === 'number'
        ) {
          updated.currentInnings.wickets = Math.max(0, updated.currentInnings.wickets - 1);
        }
        if (updated.currentInnings && updated.currentInnings.last_wicket_details) {
          delete updated.currentInnings.last_wicket_details;
        }
      } else if (undoOperation.type === 'remove_batsman') {
        // Undo batsman: remove batsman from current_batsmen array
        if (
          updated.currentInningsNumber === 1 && Array.isArray(updated.currentInnings.current_batsmen)
        ) {
          updated.currentInnings.current_batsmen = updated.currentInnings.current_batsmen.filter(
            (b: any) => b.id !== undoOperation.details.id
          );
        }
      }
      return updated;
    });
  },

  swapBatsmen: () => {
    const state = get();
    set({ striker: state.nonStriker, nonStriker: state.striker });
  },

  startSecondInnings: () => {
    const state = get();
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
    });
  },

  startNewMatch: () => {
    set({
      teams: [],
      tossWinner: null,
      battingTeam: null,
      bowlingTeam: null,
      striker: null,
      nonStriker: null,
      currentBowler: null,
      ballHistory: [],
      firstInningsBallHistory: [],
      firstInningsOversData: [], // <-- Reset first innings overs
      totalOvers: 0,
      secondInningsOver: 0,
      target: null,
      matchDate: new Date(),
      matchCompleted: false,
      awaitingSecondInningsStart: false,
      oversData: [],
      initialStriker: null,
      initialNonStriker: null,
      previousStriker: null,
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
    const newBallHistory = [...state.ballHistory, record];
    const legalDeliveries = state.ballHistory.filter((b) =>
      !b.isExtra || (b.extraType === 'bye' || b.extraType === 'lb')
    ).length;
    // Calculate the current over number based on legal deliveries
    const currentOverNumber = Math.floor(legalDeliveries / 6);
    const currentBallInOver = legalDeliveries % 6;

    // Track overs correctly
    let oversData = [...state.oversData];
    let lastOver = oversData[oversData.length - 1];

    // If it's a new over (or the first ball), create a new over entry
    if (!lastOver || lastOver.overNumber !== currentOverNumber) {
      oversData.push({ overNumber: currentOverNumber, deliveries: [record], innings: state.currentInningsNumber });
    } else {
      // If it's the same over, add to the current over's deliveries
      lastOver.deliveries.push(record);
    }

    const totalRuns = record.runs + (record.isExtra && (record.extraType === 'wide' || record.extraType === 'no-ball') ? 1 : 0);  // Total runs considering extra type
    const isFour = record.isFour ?? record.runs === 4;
    const isSix = record.isSix ?? record.runs === 6;

    const updatedTeams = state.teams.map((team) => ({
      ...team,
      players: team.players.map((player) => {
        const isBatsman = player.name === record.batsmanName;
        const isBowler = player.name === record.bowlerName;
        const isStriker = player.name === state.striker?.name;
        const isNonStriker = player.name === state.nonStriker?.name;

        // Handle bowler updates
        if (isBowler) {
          return {
            ...player,
            ballsBowled: player.ballsBowled + (record.isExtra && (record.extraType === 'wide' || record.extraType === 'no-ball') ? 0 : 1),
            runsGiven: player.runsGiven + totalRuns,
            wickets: player.wickets + (record.isWicket && record.wicketType !== 'run-out' ? 1 : 0),
          };
        }

        // Determine if this player is the one who got out (for run-outs)
        let isOut = record.isWicket && record.wicketType !== 'run-out';
        if (record.isWicket && record.wicketType === 'run-out') {
          if (
            (record.runOutBatsman === 'striker' && isStriker) ||
            (record.runOutBatsman === 'non-striker' && isNonStriker)
          ) {
            isOut = true;
          }
        }

        // Handle batsman stats (includes both striker and non-striker)
        if (isStriker) {
          const addRuns = record.isNoBall ? record.runs : (record.isExtra ? 0 : record.runs);
          const addBall = record.isExtra && (record.extraType === 'wide') ? 0 : 1;

          return {
            ...player,
            runs: player.runs + addRuns,
            balls: player.balls + addBall,
            fours: player.fours + (record.extraType !== 'wide' && isFour ? 1 : 0),
            sixes: player.sixes + (isSix ? 1 : 0),
            status: isOut ? 'out' : 'active',
          };
        }

        return player;
      }),
    }));

    const isLegalDelivery = !record.isExtra || (record.extraType === 'bye' || record.extraType === 'lb');;
    const newLegalBalls = legalDeliveries + (isLegalDelivery ? 1 : 0);
    const isLastLegalBall = isLegalDelivery && (newLegalBalls % 6 === 0);

    let shouldSwap = false;

    if (record.isExtra && (record.extraType === 'wide' || record.extraType === 'bye' || record.extraType === 'lb')) {
      shouldSwap = record.runs % 2 === 1;
    } else if (!record.isWicket) {
      if (isLastLegalBall) {
        // Last legal delivery — if runs are even, swap strike
        if (record.runs % 2 === 0) {
          shouldSwap = true;
        }
      } else {
        // Mid over — swap strike on odd runs
        if (record.runs % 2 === 1) {
          shouldSwap = true;
        }
      }
    }

    if (shouldSwap) {
      set({ striker: state.nonStriker, nonStriker: state.striker });
    }

    // Handle wicket
    if (record.isWicket) {
      // Save striker/nonStriker and their stats for undo
      const prevStriker = state.striker ? { ...state.striker } : null;
      const prevNonStriker = state.nonStriker ? { ...state.nonStriker } : null;
      const prevTeams = JSON.parse(JSON.stringify(state.teams)); // Deep clone teams for stats
      set((s: any) => ({
        undoStack: [
          ...s.undoStack,
          {
            type: 'wicket_restore',
            details: {
              striker: prevStriker,
              nonStriker: prevNonStriker,
              teams: prevTeams,
            },
          },
        ],
      }));

      const updatedState = get();
      const battingTeam = updatedState.teams.find((t) => t.name === updatedState.battingTeam);
      if (battingTeam) {
        const available = battingTeam.players.filter(
          (p) =>
            p.status !== 'out' &&
            p.name !== updatedState.striker?.name &&
            p.name !== updatedState.nonStriker?.name
        );

        if (record.wicketType === 'run-out') {
          if (record.runOutBatsman === 'striker') {
            set({
              batsmanToReplace: 'striker',
              showBatsmanSelectModal: true,
            });
          } else {
            set({
              batsmanToReplace: 'non-striker',
              showBatsmanSelectModal: true,
            });
          }
        } else {
          set({
            batsmanToReplace: 'striker',
            showBatsmanSelectModal: true,
          });
        }
      }
    }

    // Score and wickets tracking
    const score = newBallHistory.reduce(
      (sum, b) => sum + b.runs + (b.isExtra && (b.extraType === 'wide' || b.extraType === 'no-ball') ? 1 : 0),
      0
    );
    const wickets = newBallHistory.filter((b) => b.isWicket).length;
    const isAllOut = wickets >= ((state.teams.find((t) => t.name === state.battingTeam)?.players.length ?? 11) - 1);
    const oversDone = Math.floor(newLegalBalls / 6) >= state.totalOvers;

    if (state.currentInningsNumber === 1 && (isAllOut || oversDone)) {
      set({
        target: score,
        firstInningsBallHistory: [...newBallHistory],
        awaitingSecondInningsStart: true,
      });
      alert(`First innings complete. Target: ${score + 1}`);
    }

    if (state.currentInningsNumber === 2 && state.target !== null) {
      const secondInningsOversDone = Math.floor(newLegalBalls / 6) >= state.totalOvers;
      const isTargetAchieved = score > state.target;
      const isTied = score === state.target;
      const isInningsComplete = isTargetAchieved || isAllOut || secondInningsOversDone;

      if (isInningsComplete && !state.matchCompleted) {
        set({ matchCompleted: true });

        if (isTargetAchieved) {
          alert(`${state.battingTeam} wins by ${10 - wickets} wicket(s)!`);
        } else if (isTied) {
          alert(`The match is tied!`);
        } else {
          const runMargin = state.target - score;
          alert(`${state.bowlingTeam} wins by ${runMargin} run(s)!`);
        }
        router.push('/full-scorecard');
      }
    }

    set({ teams: updatedTeams, ballHistory: newBallHistory, oversData });
  },

  undoLastBall: () => {
    const state = get();
    if (state.ballHistory.length === 0) return;

    const lastBall = state.ballHistory[state.ballHistory.length - 1];
    const newBallHistory = state.ballHistory.slice(0, -1);
    const wasLegal = !lastBall.isExtra || (lastBall.extraType === 'bye' || lastBall.extraType === 'lb');

    const legalBalls = newBallHistory.filter(b => !b.isExtra || (b.extraType === 'bye' || b.extraType === 'lb')).length;
    const totalRuns = lastBall.runs + (lastBall.isExtra && (lastBall.extraType === 'wide' || lastBall.extraType === 'no-ball') ? 1 : 0);
    const isFour = lastBall.isFour ?? lastBall.runs === 4;
    const isSix = lastBall.isSix ?? lastBall.runs === 6;
    const isBatsmanScoringExtra = lastBall.isExtra && lastBall.extraType === 'no-ball';

    // Update player stats
    const updatedTeams = state.teams.map(team => ({
      ...team,
      players: team.players.map(player => {
        if (player.name === lastBall.batsmanName && (wasLegal || isBatsmanScoringExtra)) {
          return {
            ...player,
            runs: player.runs - lastBall.runs,
            balls: player.balls - 1,
            fours: player.fours - (isFour ? 1 : 0),
            sixes: player.sixes - (isSix ? 1 : 0),
          };
        }
        if (player.name === lastBall.bowlerName) {
          return {
            ...player,
            ballsBowled: player.ballsBowled - (lastBall.isExtra && (lastBall.extraType === 'wide' || lastBall.extraType === 'no-ball') ? 0 : 1),
            runsGiven: player.runsGiven - totalRuns,
            wickets: player.wickets - (lastBall.isWicket && lastBall.wicketType !== 'run-out' ? 1 : 0),
          };
        }
        return player;
      }),
    }));

    // Reverse strike if needed
    if (wasLegal) {
      const isOverEnd = legalBalls % 6 === 0;
      const strikeChanged =
        (isOverEnd && lastBall.runs % 2 === 0) ||
        (!isOverEnd && lastBall.runs % 2 === 1);

      if (strikeChanged) {
        set({ striker: state.nonStriker, nonStriker: state.striker });
      }
    }

    // Remove the last delivery from oversData
    const updatedOversData = [...state.oversData];
    const lastOverIndex = updatedOversData.length - 1;

    if (lastOverIndex >= 0) {
      const deliveries = [...updatedOversData[lastOverIndex].deliveries];
      deliveries.pop(); // remove last delivery

      if (deliveries.length === 0) {
        updatedOversData.pop(); // remove over if it’s empty
      } else {
        updatedOversData[lastOverIndex] = {
          ...updatedOversData[lastOverIndex],
          deliveries,
        };
      }
    }

    // Determine the correct currentBowler after undo
    let newCurrentBowler = null;
    const lastLegalBall = [...newBallHistory].reverse().find(b => !b.isExtra || (b.extraType === 'bye' || b.extraType === 'lb'));
    if (lastLegalBall) {
      newCurrentBowler = updatedTeams
        .flatMap(team => team.players)
        .find(player => player.name === lastLegalBall.bowlerName) || null;
    } else {
      newCurrentBowler = null;
    }

    // Restore striker and non-striker based on the last two legal balls in the new ball history
    let newStriker = state.striker;
    let newNonStriker = state.nonStriker;
    let restoredTeams = undefined;
    // If the last ball was a wicket, try to restore from undoStack
    if (lastBall.isWicket && state.undoStack.length > 0) {
      const lastUndo = state.undoStack[state.undoStack.length - 1];
      if (lastUndo.type === 'wicket_restore') {
        newStriker = lastUndo.details.striker;
        newNonStriker = lastUndo.details.nonStriker;
        restoredTeams = lastUndo.details.teams;
        set({ undoStack: state.undoStack.slice(0, -1) });
      }
    } else {
      const legalBallsArr = [...newBallHistory].filter(b => !b.isExtra || (b.extraType === 'bye' || b.extraType === 'lb'));
      if (legalBallsArr.length > 0) {
        const lastLegal = legalBallsArr[legalBallsArr.length - 1];
        newStriker = state.teams.flatMap(team => team.players).find(p => p.name === lastLegal.batsmanName) || null;
        if (legalBallsArr.length > 1) {
          const prevLegal = legalBallsArr[legalBallsArr.length - 2];
          const prevBatsman = state.teams.flatMap(team => team.players).find(p => p.name === prevLegal.batsmanName);
          if (prevBatsman && prevBatsman.name !== lastLegal.batsmanName) {
            newNonStriker = prevBatsman;
          }
        }
      } else {
        newStriker = null;
        newNonStriker = null;
      }
    }

    if (newBallHistory.length === 0) {
      set((prev) => ({
        teams: updatedTeams,
        ballHistory: newBallHistory,
        oversData: updatedOversData,
        currentBowler: prev.lastSelectedBowler,
        striker: prev.initialStriker,
        nonStriker: prev.initialNonStriker,
      }));
      set({
        batsmanToReplace: 'non-striker',
        showBatsmanSelectModal: true,
      });
    } else {
      set({
        teams: restoredTeams ? restoredTeams : updatedTeams,
        ballHistory: newBallHistory,
        oversData: updatedOversData,
        currentBowler: newCurrentBowler,
        striker: newStriker,
        nonStriker: newNonStriker,
      });
    }

    // Recalculate if innings should be over, and if not, reset awaitingSecondInningsStart
    const battingTeamPlayers = state.teams.find(t => t.name === state.battingTeam)?.players || [];
    const maxWickets = battingTeamPlayers.length - 1;
    const totalWickets = newBallHistory.filter(b => b.isWicket).length;
    const totalCompletedOvers = Math.floor(
      newBallHistory.filter(b => !b.isExtra || (b.extraType === 'bye' || b.extraType === 'lb')).length / 6
    );
    const inningsShouldEnd = totalCompletedOvers >= state.totalOvers || totalWickets >= maxWickets;
    if (!inningsShouldEnd && state.awaitingSecondInningsStart) {
      set({ awaitingSecondInningsStart: false });
    }
  },

  
}));
