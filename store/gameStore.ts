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
}

export interface BallRecord {
  runs: number;
  isExtra: boolean;
  extraType?: 'wide' | 'no-ball';
  batsmanName: string;
  bowlerName: string;
  isWicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'stumped' | 'run-out';
  runOutBatsman?: string;
  runOutRuns?: number;
  isFour?: boolean;
  isSix?: boolean;
}

export interface Team {
  name: string;
  players: Player[];
}

interface GameState {
  teams: Team[];
  tossWinner: string | null;
  battingTeam: string | null;
  bowlingTeam: string | null;
  striker: Player | null;
  nonStriker: Player | null;
  currentBowler: Player | null;
  ballHistory: BallRecord[];
  firstInningsBallHistory: BallRecord[];
  totalOvers: number;
  currentInnings: 1 | 2;
  target: number | null;
  matchDate: Date;
  matchCompleted: boolean;
  secondInningsOver: number,
  setTeams: (teams: Team[]) => void;
  setTossWinner: (team: string) => void;
  setBattingTeam: (team: string) => void;
  setBowlingTeam: (team: string) => void;
  setStriker: (player: Player) => void;
  setNonStriker: (player: Player) => void;
  setCurrentBowler: (player: Player) => void;
  setTotalOvers: (overs: number) => void;
  updateScore: (record: BallRecord) => void;
  undoLastBall: () => void;
  swapBatsmen: () => void;
  startSecondInnings: () => void;
  startNewMatch: () => void;
  checkDuplicateName: (teamIndex: number, name: string) => boolean;
  setSecondInningsOver: (overs: number) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  teams: [],
  tossWinner: null,
  battingTeam: null,
  bowlingTeam: null,
  striker: null,
  nonStriker: null,
  currentBowler: null,
  ballHistory: [],
  firstInningsBallHistory: [],
  totalOvers: 0,
  secondInningsOver: 0,
  currentInnings: 1,
  target: null,
  matchDate: new Date(),
  matchCompleted: false,

  setTeams: (teams) => set({ teams }),
  setTossWinner: (team) => set({ tossWinner: team }),
  setBattingTeam: (team) => set({ battingTeam: team }),
  setBowlingTeam: (team) => set({ bowlingTeam: team }),
  setStriker: (player) => set({ striker: player }),
  setNonStriker: (player) => set({ nonStriker: player }),
  setCurrentBowler: (player) => set({ currentBowler: player }),
  setTotalOvers: (overs) => set({ totalOvers: overs }),
  setSecondInningsOver: (overs) => set({ secondInningsOver: overs }),

  checkDuplicateName: (teamIndex, name) => {
    const state = get();
    return state.teams[teamIndex]?.players.some(
      (player) => player.name.toLowerCase() === name.toLowerCase()
    ) || false;
  },

  updateScore: (record) => {
    const state = get();
    const newBallHistory = [...state.ballHistory, record];
    const legalBalls = newBallHistory.filter((ball) => !ball.isExtra).length;
    const oversCompleted = Math.floor(legalBalls / 6);
    const ballsInOver = legalBalls % 6;

    const totalRuns = record.runs + (record.isExtra ? 1 : 0);
    const isFour = record.isFour ?? record.runs === 4;
    const isSix = record.isSix ?? record.runs === 6;

    const updatedTeams = state.teams.map((team) => ({
      ...team,
      players: team.players.map((player) => {
        if (player.name === record.batsmanName && !record.isExtra) {
          return {
            ...player,
            runs: player.runs + record.runs,
            balls: player.balls + 1,
            fours: player.fours + (isFour ? 1 : 0),
            sixes: player.sixes + (isSix ? 1 : 0),
          };
        }
        if (player.name === record.bowlerName) {
          return {
            ...player,
            ballsBowled: player.ballsBowled + (record.isExtra ? 0 : 1),
            runsGiven: player.runsGiven + totalRuns,
            wickets: player.wickets + (record.isWicket ? 1 : 0),
          };
        }
        return player;
      }),
    }));

    // Handle strike rotation
    if (!record.isExtra) {
      const isLastBall = (ballsInOver + 1) % 6 === 0;
      const shouldSwap = isLastBall ? record.runs % 2 === 0 : record.runs % 2 === 1;
      if (shouldSwap) {
        set({ striker: state.nonStriker, nonStriker: state.striker });
      }
    }

    // Total score and wickets so far
    const score = newBallHistory.reduce((sum, b) => sum + b.runs + (b.isExtra ? 1 : 0), 0);
    const wickets = newBallHistory.filter((b) => b.isWicket).length;
    const isAllOut = wickets >= 10;
    const oversDone = Math.floor(legalBalls / 6) >= state.totalOvers;

    // End of 1st innings
    if (state.currentInnings === 1 && (isAllOut || oversDone)) {
      set({
        target: score,
        firstInningsBallHistory: [...newBallHistory],
      });
      alert(`First innings complete. Target: ${score + 1}`);
    }

    // End of 2nd innings - match result
    if (state.currentInnings === 2 && state.target !== null) {

      const secondInningsOversDone = Math.floor(legalBalls / 6) >= state.totalOvers;
      const isTargetAchieved = score > state.target;
      const isTied = score === state.target;
      const isInningsComplete = isTargetAchieved || isAllOut || secondInningsOversDone;

      // Only show result when the match is actually complete
      if (isInningsComplete && !state.matchCompleted) {
        set({ matchCompleted: true });

        if (isTargetAchieved) {
          alert(`${state.battingTeam} wins by ${10 - wickets} wicket(s)!`);
          router.push('/full-scorecard');
        } else if (isTied) {
          alert(`The match is tied!`);
          router.push('/full-scorecard');
        } else {
          const runMargin = state.target - score;
          alert(`${state.bowlingTeam} wins by ${runMargin} run(s)!`);
          router.push('/full-scorecard');
        }
      }
    }

    set({ teams: updatedTeams, ballHistory: newBallHistory });
  },

  undoLastBall: () => {
    const state = get();
    if (state.ballHistory.length === 0) return;

    const lastBall = state.ballHistory[state.ballHistory.length - 1];
    const newBallHistory = state.ballHistory.slice(0, -1);
    const wasLegal = !lastBall.isExtra;

    const legalBalls = newBallHistory.filter(b => !b.isExtra).length;
    const totalRuns = lastBall.runs + (lastBall.isExtra ? 1 : 0);
    const isFour = lastBall.isFour ?? lastBall.runs === 4;
    const isSix = lastBall.isSix ?? lastBall.runs === 6;

    const updatedTeams = state.teams.map(team => ({
      ...team,
      players: team.players.map(player => {
        if (player.name === lastBall.batsmanName && wasLegal) {
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
            ballsBowled: player.ballsBowled - (lastBall.isExtra ? 0 : 1),
            runsGiven: player.runsGiven - totalRuns,
            wickets: player.wickets - (lastBall.isWicket ? 1 : 0),
          };
        }
        return player;
      }),
    }));

    // Reverse strike change if needed
    if (wasLegal) {
      const isOverEnd = legalBalls % 6 === 0;

      // Determine if strike was changed on this ball
      const strikeChanged =
        (isOverEnd && lastBall.runs % 2 === 0) || // end of over + even run → strike changed
        (!isOverEnd && lastBall.runs % 2 === 1);  // mid over + odd run → strike changed

      if (strikeChanged) {
        set({ striker: state.nonStriker, nonStriker: state.striker });
      }
    }

    set({ teams: updatedTeams, ballHistory: newBallHistory });
  },


  swapBatsmen: () => {
    const state = get();
    set({ striker: state.nonStriker, nonStriker: state.striker });
  },

  startSecondInnings: () => {
    const state = get();
    const firstInningsScore = state.ballHistory.reduce(
      (sum, b) => sum + b.runs + (b.isExtra ? 1 : 0), 0);

    set({
      currentInnings: 2,
      target: firstInningsScore,
      battingTeam: state.bowlingTeam,
      bowlingTeam: state.battingTeam,
      striker: null,
      nonStriker: null,
      currentBowler: null,
      ballHistory: [],
      firstInningsBallHistory: [...state.ballHistory],
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
      totalOvers: 0,
      currentInnings: 1,
      target: null,
      matchDate: new Date(),
      matchCompleted: false,
    });
  },
}));