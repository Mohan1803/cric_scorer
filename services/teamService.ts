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
  battingHand?: 'right' | 'left';
  bowlingHand?: 'right' | 'left';
}

export interface Team {
  id?: string;
  name: string;
  ownerId: string;
  players: TeamPlayer[];
  playerIds?: string[];
  playerEmails?: string[]; // Added for 100% reliable indexing
  name_lowercase?: string; // For case-insensitive search
  createdAt: Timestamp;
}

/**
 * Creates a new team in Firestore
 */
export const createTeam = async (team: Omit<Team, 'createdAt'>) => {
  try {
    const teamData = {
      ...team,
      playerIds: team.players.map(p => p.id),
      playerEmails: team.players.map(p => p.email.toLowerCase()),
      name_lowercase: team.name.toLowerCase(),
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
 * Repairs a team document by adding missing search indices (playerEmails)
 */
export const repairTeamIndices = async (team: Team) => {
  if (team.playerEmails && team.playerEmails.length === team.players.length) return;
  
  try {
    const docRef = doc(db, 'teams', team.id!);
    const playerEmails = team.players.map(p => p.email.toLowerCase());
    const playerIds = team.players.map(p => p.id);
    
    await setDoc(docRef, { 
      playerEmails,
      playerIds,
      name_lowercase: team.name.toLowerCase()
    }, { merge: true });
    
    console.log(`[TeamRepair] Successfully updated indices for team: ${team.name}`);
  } catch (error) {
    console.error(`[TeamRepair] Failed for ${team.name}:`, error);
  }
};

/**
 * Fetches teams where the user is either the owner OR a player
 */
export const getMyTeams = async (userId: string, email?: string) => {
  try {
    console.log(`[TeamSync] Fetching teams for: ${userId} (${email})`);
    
    const qOwner = query(collection(db, 'teams'), where('ownerId', '==', userId));
    const queries = [getDocs(qOwner)];
    
    if (email) {
      const qEmail = query(collection(db, 'teams'), where('playerEmails', 'array-contains', email.toLowerCase()));
      queries.push(getDocs(qEmail));
    }
    
    const snapshots = await Promise.all(queries);
    const teamsMap = new Map<string, Team>();
    
    snapshots.forEach(snap => {
      snap.docs.forEach(doc => {
        teamsMap.set(doc.id, { id: doc.id, ...doc.data() } as Team);
      });
    });
    
    const finalTeams = Array.from(teamsMap.values()).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    
    // Self-Healing: If user is owner, check if repair is needed
    finalTeams.forEach(team => {
      if (team.ownerId === userId && (!team.playerEmails || team.playerEmails.length === 0 || !team.name_lowercase)) {
        repairTeamIndices(team);
      }
    });

    console.log(`[TeamSync] Found ${finalTeams.length} total involvements`);
    return finalTeams;
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
};

/**
 * Searches all teams in the system by name prefix
 */
export const searchAllTeams = async (nameQuery: string) => {
  if (!nameQuery || nameQuery.length < 2) return [];
  const lower = nameQuery.toLowerCase();
  try {
    // Search using the lowercase field for true case-insensitivity
    const qLowercase = query(
      collection(db, 'teams'), 
      where('name_lowercase', '>=', lower),
      where('name_lowercase', '<=', lower + '\uf8ff')
    );
    
    // Fallback search using original name (for legacy data)
    const capitalized = nameQuery.charAt(0).toUpperCase() + nameQuery.slice(1);
    const qOriginal = query(
      collection(db, 'teams'),
      where('name', '>=', capitalized),
      where('name', '<=', capitalized + '\uf8ff')
    );

    const [snapLower, snapOriginal] = await Promise.all([getDocs(qLowercase), getDocs(qOriginal)]);
    const teamsMap = new Map<string, Team>();
    
    snapLower.docs.forEach(doc => teamsMap.set(doc.id, { id: doc.id, ...doc.data() } as Team));
    snapOriginal.docs.forEach(doc => teamsMap.set(doc.id, { id: doc.id, ...doc.data() } as Team));
    
    return Array.from(teamsMap.values()).slice(0, 5);
  } catch (error) {
    console.error('Error searching all teams:', error);
    return [];
  }
};
