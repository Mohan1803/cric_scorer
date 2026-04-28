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

  // Get recent matches for a user
  getRecentMatches: async (userId: string, limitCount: number = 5) => {
    try {
      const q = query(
        collection(db, 'matches'),
        where('creatorId', '==', userId),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const matches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseMatch[];

      // Sort client-side to avoid index requirement
      return matches.sort((a, b) => b.date.toMillis() - a.date.toMillis());
    } catch (e) {
      console.error('Error fetching recent matches:', e);
      return [];
    }
  },

  // Get user stats (Wins, etc)
  getUserStats: async (userId: string) => {
    try {
      const q = query(
        collection(db, 'matches'),
        where('creatorId', '==', userId),
        where('status', '==', 'completed')
      );
      const snapshot = await getDocs(q);
      const matches = snapshot.docs.map(doc => doc.data() as FirebaseMatch);
      
      const totalMatches = matches.length;
      // This is a simplified win check - usually you'd check if the creator's team won
      // For now we count all completed matches as part of their history
      const wins = matches.length; // Placeholder logic: for now, total completed
      
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

      // We need to look through EVERY match for this player's data
      const playerBalls: BallData[] = [];
      allMatches.forEach(match => {
        [...match.team1.ballData, ...match.team2.ballData].forEach(ball => {
          if (ball.batsmanId === userId) playerBalls.push(ball);
        });
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
        totalBalls: playerBalls.length
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
