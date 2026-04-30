import { db } from './firebaseConfig';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  photoURL?: string;
  role?: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  battingHand?: 'right' | 'left';
  bowlingHand?: 'right' | 'left';
  bowlingType?: 'fast' | 'medium' | 'off_spin' | 'leg_spin';
  qrCode?: string;
  hasProfile: boolean;
  lastUpdated: Timestamp;
}

/**
 * Saves or updates a user profile in Firestore
 */
export const saveUserProfile = async (profile: UserProfile) => {
  try {
    const userDoc = doc(db, 'users', profile.id);
    await setDoc(userDoc, {
      ...profile,
      lastUpdated: Timestamp.now(),
    }, { merge: true });

    // Also store a mapping of email to UID for easy lookup
    const emailMapDoc = doc(db, 'emailToUid', profile.email.toLowerCase());
    await setDoc(emailMapDoc, { uid: profile.id });

    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    return false;
  }
};

/**
 * Fetches a user profile by ID
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = doc(db, 'users', uid);
    const snap = await getDoc(userDoc);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Searches for a user profile by email
 */
export const findUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    const emailLower = email.toLowerCase();
    const q = query(collection(db, 'users'), where('email', '==', emailLower));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

/**
 * Uploads a profile picture to Firebase Storage
 */
export const uploadProfilePicture = async (userId: string, uri: string): Promise<string | null> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `profiles/${userId}`);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return null;
  }
};
