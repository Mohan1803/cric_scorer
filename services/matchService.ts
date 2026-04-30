import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface BallData {
  batsmanId: string;
  bowlerId: string;
  runs: number;
  isExtra: boolean;
  extraType?: 'wide' | 'no_ball' | 'bye' | 'leg_bye';
  isWicket: boolean;
  shotType?: string;
  fieldPosition?: string; // Matches WagonWheel.tsx regions
  isBoundary?: boolean;
}

export interface FirebaseMatch {
  id?: string;
  creatorId: string;
  team1: {
    name: string;
    score: string;
    wickets: number;
    overs: string;
    ballData: BallData[];
  };
  team2: {
    name: string;
    score: string;
    wickets: number;
    overs: string;
    ballData: BallData[];
  };
  venue: string;
  tournament: string;
  date: Timestamp;
  winner: string;
  status: 'live' | 'completed';
  playerNames?: string[];
  playerEmails?: string[];
}

export const matchService = {
  // Save a completed match to Firestore
  saveMatch: async (matchData: Omit<FirebaseMatch, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'matches'), {
        ...matchData,
        date: Timestamp.now()
      });
      return docRef.id;
    } catch (e) {
      console.error('Error saving match:', e);
      return null;
    }
  },

  // Get recent matches for a user (as creator or participant)
  getRecentMatches: async (userId: string, userEmail?: string, limitCount: number = 5) => {
    try {
      const matchesRef = collection(db, 'matches');
      
      // Query 1: Where user is the creator
      const q1 = query(
        matchesRef,
        where('creatorId', '==', userId),
        limit(limitCount)
      );
      
      const queries = [getDocs(q1)];
      
      // Query 2: Where user is a participant (if email provided)
      if (userEmail) {
        const q2 = query(
          matchesRef,
          where('playerEmails', 'array-contains', userEmail.toLowerCase()),
          limit(limitCount)
        );
        queries.push(getDocs(q2));
      }
      
      const snapshots = await Promise.all(queries);
      const matchMap = new Map<string, FirebaseMatch>();
      
      snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          matchMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          } as FirebaseMatch);
        });
      });

      const allMatches = Array.from(matchMap.values());

      // Sort client-side by date descending with safety checks
      return allMatches
        .sort((a, b) => {
          const timeA = a.date?.toMillis?.() || 0;
          const timeB = b.date?.toMillis?.() || 0;
          return timeB - timeA;
        })
        .slice(0, limitCount);
    } catch (e) {
      console.error('Error fetching recent matches:', e);
      return [];
    }
  },

  // Get user stats (Wins, etc)
  getUserStats: async (userId: string, userEmail?: string) => {
    try {
      const matchesRef = collection(db, 'matches');
      
      const q1 = query(
        matchesRef,
        where('creatorId', '==', userId),
        where('status', '==', 'completed')
      );
      
      const queries = [getDocs(q1)];
      
      if (userEmail) {
        const q2 = query(
          matchesRef,
          where('playerEmails', 'array-contains', userEmail.toLowerCase()),
          where('status', '==', 'completed')
        );
        queries.push(getDocs(q2));
      }
      
      const snapshots = await Promise.all(queries);
      const matchMap = new Map<string, any>();
      
      snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          matchMap.set(doc.id, doc.data());
        });
      });

      const matches = Array.from(matchMap.values());
      const totalMatches = matches.length;
      const wins = matches.length; // Placeholder logic
      
      return {
        totalMatches,
        wins,
        rating: totalMatches > 0 ? (4.5 + (totalMatches * 0.1)).toFixed(1) : '0.0'
      };
    } catch (e) {
      console.error('Error fetching stats:', e);
      return { totalMatches: 0, wins: 0, rating: '0.0' };
    }
  },

  // GET AGGREGATED PLAYER INSIGHTS (Wagon Wheel, Shots, etc)
  getPlayerInsights: async (userId: string) => {
    try {
      const q = query(
        collection(db, 'matches'),
        where('status', '==', 'completed')
      );
      const snapshot = await getDocs(q);
      const allMatches = snapshot.docs.map(doc => doc.data() as FirebaseMatch);

      const playerBalls: BallData[] = [];
      allMatches.forEach(match => {
        [...match.team1.ballData, ...match.team2.ballData].forEach(ball => {
          if (ball.batsmanId === userId) playerBalls.push(ball);
        });
      });

      // Sort all matches by date with safety checks to identify the last 5
      const sortedMatches = allMatches.sort((a, b) => {
        const timeA = a.date?.toMillis?.() || 0;
        const timeB = b.date?.toMillis?.() || 0;
        return timeB - timeA;
      });
      const playerParticipationMatches = sortedMatches.filter(match => {
        const involvedInTeam1 = match.team1.ballData.some(b => b.batsmanId === userId || b.bowlerId === userId);
        const involvedInTeam2 = match.team2.ballData.some(b => b.batsmanId === userId || b.bowlerId === userId);
        return involvedInTeam1 || involvedInTeam2;
      });

      const last5MatchesData = playerParticipationMatches.slice(0, 5);

      // Batting Last 5 Aggregation
      const last5Batting = {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        innings: 0
      };

      // Bowling Last 5 Aggregation
      const last5Bowling = {
        runs: 0,
        balls: 0,
        wickets: 0
      };

      last5MatchesData.forEach(match => {
        const ballsAsBatsman = [...match.team1.ballData, ...match.team2.ballData].filter(b => b.batsmanId === userId);
        if (ballsAsBatsman.length > 0) {
          last5Batting.innings += 1;
          ballsAsBatsman.forEach(b => {
            last5Batting.runs += b.runs;
            last5Batting.balls += 1;
            if (b.runs === 4) last5Batting.fours += 1;
            if (b.runs === 6) last5Batting.sixes += 1;
          });
        }

        const ballsAsBowler = [...match.team1.ballData, ...match.team2.ballData].filter(b => b.bowlerId === userId);
        if (ballsAsBowler.length > 0) {
          ballsAsBowler.forEach(b => {
            last5Bowling.balls += 1;
            if (b.isWicket) last5Bowling.wickets += 1;
            // Simplified runs conceded: count all runs on balls where they were bowler
            if (!b.isExtra || b.extraType === 'no_ball' || b.extraType === 'wide') {
              last5Bowling.runs += b.runs;
            }
          });
        }
      });

      // 1. Wagon Wheel Data (Flat list of scoring balls)
      const wagonWheelBalls: { runs: number, fieldPosition?: string }[] = [];
      // 2. Shot Productivity
      const shotStats: { [key: string]: { runs: number, balls: number } } = {};
      
      playerBalls.forEach(ball => {
        if (ball.runs > 0) {
          wagonWheelBalls.push({ runs: ball.runs, fieldPosition: ball.fieldPosition });
          
          if (ball.shotType) {
            if (!shotStats[ball.shotType]) shotStats[ball.shotType] = { runs: 0, balls: 0 };
            shotStats[ball.shotType].runs += ball.runs;
            shotStats[ball.shotType].balls += 1;
          }
        }
      });

      // Calculate most productive region manually from wagonWheelBalls
      const regionCounts: { [key: string]: number } = {};
      wagonWheelBalls.forEach(b => {
        if (b.fieldPosition) {
          regionCounts[b.fieldPosition] = (regionCounts[b.fieldPosition] || 0) + b.runs;
        }
      });
      const bestRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0];

      return {
        totalRuns: playerBalls.reduce((acc, b) => acc + b.runs, 0),
        wagonWheelBalls,
        bestRegion: bestRegion ? { name: bestRegion[0], runs: bestRegion[1] } : null,
        shotStats: Object.entries(shotStats)
          .sort((a, b) => b[1].runs - a[1].runs)
          .slice(0, 5)
          .map(([type, data]) => ({ 
            type, 
            runs: data.runs, 
            avg: (data.runs / data.balls).toFixed(1) 
          })),
        totalBalls: playerBalls.length,
        last5Matches: {
          batting: {
            ...last5Batting,
            avg: last5Batting.innings > 0 ? (last5Batting.runs / last5Batting.innings).toFixed(1) : '0.0',
            sr: last5Batting.balls > 0 ? ((last5Batting.runs / last5Batting.balls) * 100).toFixed(1) : '0.0'
          },
          bowling: {
            ...last5Bowling,
            overs: (Math.floor(last5Bowling.balls / 6) + (last5Bowling.balls % 6) / 10).toFixed(1),
            econ: last5Bowling.balls > 0 ? ((last5Bowling.runs / last5Bowling.balls) * 6).toFixed(2) : '0.00'
          }
        }
      };
    } catch (e) {
      console.error('Error calculating insights:', e);
      return null;
    }
  },

  // GET COMPREHENSIVE CAREER STATS
  getPlayerStats: async (userId: string) => {
    try {
      const q = query(
        collection(db, 'matches'),
        where('status', '==', 'completed')
      );
      const snapshot = await getDocs(q);
      const allMatches = snapshot.docs.map(doc => doc.data() as FirebaseMatch);

      // Batting Stats Initialization
      const batting = {
        matches: 0,
        innings: 0,
        runs: 0,
        balls: 0,
        highest: 0,
        fifties: 0,
        hundreds: 0,
        thirties: 0,
        ducks: 0, // 0s
        fours: 0,
        sixes: 0,
        notOuts: 0
      };

      // Bowling Stats Initialization
      const bowling = {
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
        best: { wickets: 0, runs: 0 }, // BBI
        threeWickets: 0,
        fiveWickets: 0
      };

      allMatches.forEach(match => {
        // Find if user was part of this match
        let played = false;
        
        // Analyze Batting for this match
        const myBalls = [...match.team1.ballData, ...match.team2.ballData].filter(b => b.batsmanId === userId);
        if (myBalls.length > 0 || played) {
          played = true;
          batting.innings += 1;
          const matchRuns = myBalls.reduce((acc, b) => acc + b.runs, 0);
          batting.runs += matchRuns;
          batting.balls += myBalls.length;
          batting.fours += myBalls.filter(b => b.runs === 4).length;
          batting.sixes += myBalls.filter(b => b.runs === 6).length;
          
          if (matchRuns > batting.highest) batting.highest = matchRuns;
          if (matchRuns >= 100) batting.hundreds += 1;
          else if (matchRuns >= 50) batting.fifties += 1;
          else if (matchRuns >= 30) batting.thirties += 1;
          else if (matchRuns === 0) batting.ducks += 1;
        }

        // Analyze Bowling for this match
        const bowledBalls = [...match.team1.ballData, ...match.team2.ballData].filter(b => b.bowlerId === userId);
        if (bowledBalls.length > 0) {
          played = true;
          const matchWickets = bowledBalls.filter(b => b.isWicket).length;
          const matchRunsConceded = bowledBalls.filter(b => !b.isExtra || b.extraType === 'no_ball' || b.extraType === 'wide').reduce((acc, b) => acc + b.runs, 0);
          
          bowling.balls += bowledBalls.length;
          bowling.wickets += matchWickets;
          bowling.runs += matchRunsConceded;
          
          if (matchWickets >= 5) bowling.fiveWickets += 1;
          else if (matchWickets >= 3) bowling.threeWickets += 1;
          
          // Best Bowling Calculation
          if (matchWickets > bowling.best.wickets || (matchWickets === bowling.best.wickets && matchRunsConceded < bowling.best.runs)) {
            bowling.best = { wickets: matchWickets, runs: matchRunsConceded };
          }
        }

        if (played) batting.matches += 1;
      });

      return {
        batting: {
          ...batting,
          avg: batting.innings > 0 ? (batting.runs / batting.innings).toFixed(2) : '0.00',
          sr: batting.balls > 0 ? ((batting.runs / batting.balls) * 100).toFixed(2) : '0.00'
        },
        bowling: {
          ...bowling,
          overs: (Math.floor(bowling.balls / 6) + (bowling.balls % 6) / 10).toFixed(1),
          econ: bowling.balls > 0 ? ((bowling.runs / bowling.balls) * 6).toFixed(2) : '0.00'
        }
      };
    } catch (e) {
      console.error('Error calculating career stats:', e);
      return null;
    }
  }
};
