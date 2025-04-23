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
}

export interface Team {
  name: string;
  players: Player[];
}

export interface OverData {
  overNumber: number;
  deliveries: BallRecord[];
}

export interface GameState {
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
  secondInningsOver: number;
  currentInnings: 1 | 2;
  target: number | null;
  matchDate: Date;
  matchCompleted: boolean;
  awaitingSecondInningsStart: boolean;
  oversData: OverData[];


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
  setSecondInningsOver: (overs: number) => void;
  setAwaitingSecondInningsStart: (flag: boolean) => void;


  batsmanToReplace: 'striker' | 'non-striker' | null;
  showBatsmanSelectModal: boolean;
  setBatsmanToReplace: (end: 'striker' | 'non-striker' | null) => void;
  setShowBatsmanSelectModal: (show: boolean) => void;
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
  awaitingSecondInningsStart: false,
  oversData: [],

  setTeams: (teams) => set({ teams }),
  setTossWinner: (team) => set({ tossWinner: team }),
  setBattingTeam: (team) => set({ battingTeam: team }),
  setBowlingTeam: (team) => set({ bowlingTeam: team }),
  setStriker: (player) => set({ striker: player }),
  setNonStriker: (player) => set({ nonStriker: player }),
  setCurrentBowler: (player) => set({ currentBowler: player }),
  setTotalOvers: (overs) => set({ totalOvers: overs }),
  setSecondInningsOver: (overs) => set({ secondInningsOver: overs }),
  setAwaitingSecondInningsStart: (flag) => set({ awaitingSecondInningsStart: flag }),

  batsmanToReplace: null,
  showBatsmanSelectModal: false,

  setBatsmanToReplace: (end) => set({ batsmanToReplace: end }),
  setShowBatsmanSelectModal: (show) => set({ showBatsmanSelectModal: show }),

  checkDuplicateName: (teamIndex, name) => {
    const state = get();
    return state.teams[teamIndex]?.players.some(
      (player) => player.name.toLowerCase() === name.toLowerCase()
    ) || false;
  },



  updateScore: (record) => {
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
      oversData.push({ overNumber: currentOverNumber, deliveries: [record] });
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
          const addBall = record.isExtra && (record.extraType === 'no-ball' || record.extraType === 'wide') ? 0 : 1;

          return {
            ...player,
            runs: player.runs + addRuns,
            balls: player.balls + addBall,
            fours: player.fours + (isFour ? 1 : 0),
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





    if (record.isExtra && (record.extraType === 'wide')) {
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
      const updatedState = get();
      const battingTeam = updatedState.teams.find((t) => t.name === updatedState.battingTeam);
      if (battingTeam) {
        const available = battingTeam.players.filter(
          (p) =>
            p.status !== 'out' &&
            p.name !== updatedState.striker?.name &&
            p.name !== updatedState.nonStriker?.name
        );


        // if (record.wicketType === 'run-out') {
        //   if (record.runOutBatsman === 'striker') {
        //     set({
        //       striker: available[0] ?? null, // fallback
        //       nonStriker: updatedState.nonStriker,
        //     });
        //   } else {
        //     set({
        //       nonStriker: available[0] ?? null,
        //       striker: updatedState.striker,
        //     });
        //   }
        // } else {
        //   set({ striker: available[0] ?? null });
        // }


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

    if (state.currentInnings === 1 && (isAllOut || oversDone)) {
      set({
        target: score,
        firstInningsBallHistory: [...newBallHistory],
        awaitingSecondInningsStart: true,
      });
      alert(`First innings complete. Target: ${score + 1}`);
    }

    if (state.currentInnings === 2 && state.target !== null) {
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

    // Update player stats
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
            ballsBowled: player.ballsBowled - (lastBall.isExtra && (lastBall.extraType === 'wide' || lastBall.extraType === 'no-ball') ? 0 : 1),
            runsGiven: player.runsGiven - totalRuns,
            wickets: player.wickets - (lastBall.isWicket ? 1 : 0),
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

    // 🛠 Remove the last delivery from oversData
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

    set({
      teams: updatedTeams,
      ballHistory: newBallHistory,
      oversData: updatedOversData, // 🧠 <- Don't forget this
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
      currentInnings: 2,
      target: firstInningsScore,
      battingTeam: state.bowlingTeam,
      bowlingTeam: state.battingTeam,
      striker: null,
      nonStriker: null,
      currentBowler: null,
      ballHistory: [],
      firstInningsBallHistory: [...state.ballHistory],
      awaitingSecondInningsStart: false,
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
