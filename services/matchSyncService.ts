import { db } from './firebaseConfig';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection, 
  query, 
  where, 
  onSnapshot, 
  Timestamp,
  deleteDoc
} from 'firebase/firestore';

export interface GlobalMatch {
  id: string; // Using a unique device/match ID
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  overs: string;
  wickets: number;
  groundName: string;
  tournamentName: string;
  lastUpdated: Timestamp;
  status: 'live' | 'completed';
  battingTeam: string;
  matchResult?: string;
}

/**
 * Recursively removes undefined values from an object (Firestore doesn't allow them)
 */
const cleanObject = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      const val = obj[key];
      if (val !== undefined) {
        newObj[key] = cleanObject(val);
      }
    }
    return newObj;
  }
  return obj;
};

/**
 * Syncs the current match state to Firestore
 */
export const syncMatchToCloud = async (matchId: string, data: Partial<GlobalMatch>) => {
  try {
    const cleanedData = cleanObject(data);
    const matchDoc = doc(db, 'matches', matchId);
    await setDoc(matchDoc, {
      ...cleanedData,
      lastUpdated: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error syncing match to cloud:', error);
  }
};

/**
 * Syncs the entire match object (teams, ball history, etc) to a separate collection
 */
export const syncFullMatchDetails = async (matchId: string, fullData: any) => {
  try {
    const cleanedData = cleanObject(fullData);
    const detailsDoc = doc(db, 'matchDetails', matchId);
    await setDoc(detailsDoc, {
      ...cleanedData,
      lastUpdated: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error syncing full match details:', error);
  }
};

/**
 * Removes a match from the global live feed
 */
export const removeMatchFromCloud = async (matchId: string) => {
  try {
    await deleteDoc(doc(db, 'matches', matchId));
  } catch (error) {
    console.error('Error removing match from cloud:', error);
  }
};

/**
 * Listens for live matches from all users
 */
export const listenForLiveMatches = (callback: (matches: GlobalMatch[]) => void) => {
  const q = query(
    collection(db, 'matches'), 
    where('status', '==', 'live')
  );

  return onSnapshot(q, (snapshot) => {
    const matches: GlobalMatch[] = [];
    snapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() } as GlobalMatch);
    });
    // Sort by last updated (newest first)
    matches.sort((a, b) => b.lastUpdated.toMillis() - a.lastUpdated.toMillis());
    callback(matches);
  });
};

/**
 * Listens for recently completed matches
 */
export const listenForPastMatches = (limitCount: number = 20, callback: (matches: GlobalMatch[]) => void) => {
  const q = query(
    collection(db, 'matches'), 
    where('status', '==', 'completed')
  );

  return onSnapshot(q, (snapshot) => {
    const matches: GlobalMatch[] = [];
    snapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() } as GlobalMatch);
    });
    // Sort by last updated (newest first)
    matches.sort((a, b) => b.lastUpdated.toMillis() - a.lastUpdated.toMillis());
    callback(matches.slice(0, limitCount));
  });
};

/**
 * Fetches the full match details for viewing
 */
export const getMatchDetails = async (matchId: string) => {
  try {
    const detailsDoc = doc(db, 'matchDetails', matchId);
    const snap = await getDoc(detailsDoc);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching match details:', error);
    return null;
  }
};
