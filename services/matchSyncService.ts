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
  creatorId?: string;
  creatorEmail?: string;
  playerNames?: string[];
  playerEmails?: string[];
  team1?: {
    name: string;
    score: number;
    wickets: number;
    overs: string;
    ballData: any[]; // Detailed ball records for analytics
  };
  team2?: {
    name: string;
    score: number;
    wickets: number;
    overs: string;
    ballData: any[]; // Detailed ball records for analytics
  };
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
    // Sort by last updated (newest first) with safety checks
    matches.sort((a, b) => {
      const timeA = a.lastUpdated?.toMillis?.() || 0;
      const timeB = b.lastUpdated?.toMillis?.() || 0;
      return timeB - timeA;
    });
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
    // Sort by last updated (newest first) with safety checks
    matches.sort((a, b) => {
      const timeA = a.lastUpdated?.toMillis?.() || 0;
      const timeB = b.lastUpdated?.toMillis?.() || 0;
      return timeB - timeA;
    });
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

/**
 * Listens for real-time updates to a specific match's full details
 */
export const listenToMatchDetails = (matchId: string, callback: (data: any) => void) => {
  const detailsDoc = doc(db, 'matchDetails', matchId);
  return onSnapshot(detailsDoc, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      callback(null);
    }
  });
};

/**
 * Registers a device as 'Available' for pairing
 */
export const registerPairingNode = async (deviceId: string, data: any) => {
  try {
    const nodeDoc = doc(db, 'pairingNodes', deviceId);
    await setDoc(nodeDoc, {
      ...data,
      deviceId,
      lastSeen: Timestamp.now(),
      status: 'searching'
    }, { merge: true });
  } catch (error) {
    console.error('Error registering pairing node:', error);
  }
};

/**
 * Listens for other devices currently in pairing mode
 */
export const listenForNearbyNodes = (callback: (nodes: any[]) => void) => {
  const q = query(
    collection(db, 'pairingNodes'),
    where('status', '==', 'searching')
  );

  return onSnapshot(q, (snapshot) => {
    const nodes: any[] = [];
    snapshot.forEach((doc) => {
      // Filter by last 5 minutes locally if needed, but for now take all active
      nodes.push({ id: doc.id, ...doc.data() });
    });
    callback(nodes);
  });
};

/**
 * Removes a pairing node when leaving the screen
 */
export const removePairingNode = async (deviceId: string) => {
  try {
    await deleteDoc(doc(db, 'pairingNodes', deviceId));
  } catch (error) {
    console.error('Error removing pairing node:', error);
  }
};
