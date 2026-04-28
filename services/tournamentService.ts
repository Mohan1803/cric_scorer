import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface Tournament {
  id?: string;
  name: string;
  organizerId: string;
  description?: string;
  teamIds: string[];
  matchIds: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: any;
  rules: {
    overs: number;
    ballsPerOver: number;
    maxPlayers: number;
  };
  bannerURL?: string;
}

export interface TournamentFixture {
  id?: string;
  tournamentId: string;
  team1Id: string;
  team2Id: string;
  date: any;
  venue: string;
  status: 'scheduled' | 'live' | 'completed';
  matchId?: string; // Reference to the actual match document
}

/**
 * Creates a new tournament
 */
export const createTournament = async (tournamentData: Omit<Tournament, 'id' | 'createdAt' | 'matchIds' | 'teamIds'>) => {
  try {
    const docRef = await addDoc(collection(db, 'tournaments'), {
      ...tournamentData,
      teamIds: [],
      matchIds: [],
      createdAt: Timestamp.now(),
      status: 'upcoming'
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating tournament:', error);
    return null;
  }
};

/**
 * Adds a team to a tournament
 */
export const joinTournament = async (tournamentId: string, teamId: string) => {
  try {
    const tRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tRef, {
      teamIds: arrayUnion(teamId)
    });
    return true;
  } catch (error) {
    console.error('Error joining tournament:', error);
    return false;
  }
};

/**
 * Gets all tournaments organized by a user
 */
export const getMyTournaments = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'tournaments'), 
      where('organizerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return [];
  }
};

/**
 * Schedules a fixture in the tournament
 */
export const scheduleFixture = async (fixture: Omit<TournamentFixture, 'id' | 'status'>) => {
  try {
    const docRef = await addDoc(collection(db, 'tournamentFixtures'), {
      ...fixture,
      status: 'scheduled'
    });
    return docRef.id;
  } catch (error) {
    console.error('Error scheduling fixture:', error);
    return null;
  }
};

/**
 * Gets fixtures for a tournament
 */
export const getTournamentFixtures = async (tournamentId: string) => {
  try {
    const q = query(
      collection(db, 'tournamentFixtures'),
      where('tournamentId', '==', tournamentId),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentFixture));
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return [];
  }
};
