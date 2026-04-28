import { db } from './firebaseConfig';
import { 
  doc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp,
  addDoc
} from 'firebase/firestore';

export interface TeamPlayer {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  role: string;
}

export interface Team {
  id?: string;
  name: string;
  ownerId: string;
  players: TeamPlayer[];
  createdAt: Timestamp;
}

/**
 * Creates a new team in Firestore
 */
export const createTeam = async (team: Omit<Team, 'createdAt'>) => {
  try {
    const teamData = {
      ...team,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'teams'), teamData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating team:', error);
    return null;
  }
};

/**
 * Fetches teams owned by a user
 */
export const getMyTeams = async (userId: string) => {
  try {
    const q = query(collection(db, 'teams'), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
};
