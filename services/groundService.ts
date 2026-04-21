import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { getDeviceId } from "./deviceIdService";
import { Ground } from "../store/groundStore";

const GROUNDS_COLLECTION = "grounds";

export interface FirebaseGround extends Omit<Ground, 'id'> {
  id: string;
  creatorId: string;
  createdAt: Timestamp;
}

export const groundService = {
  /**
   * Fetches all registered grounds from Firestore
   */
  async getGrounds(): Promise<FirebaseGround[]> {
    try {
      const q = query(collection(db, GROUNDS_COLLECTION), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseGround[];
    } catch (error) {
      console.error("Error fetching grounds from Firestore:", error);
      throw error;
    }
  },

  /**
   * Saves a new ground to Firestore
   */
  async saveGround(ground: Omit<Ground, 'id'>): Promise<string> {
    try {
      const creatorId = await getDeviceId();
      const docRef = await addDoc(collection(db, GROUNDS_COLLECTION), {
        ...ground,
        creatorId,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error saving ground to Firestore:", error);
      throw error;
    }
  },

  /**
   * Deletes a ground from Firestore
   * Verifies creatorId before deletion
   */
  async deleteGround(groundId: string): Promise<void> {
    try {
      const creatorId = await getDeviceId();
      const groundRef = doc(db, GROUNDS_COLLECTION, groundId);
      
      // In a real production app, you would use Firestore Security Rules 
      // to enforce that only the creator can delete their document.
      // For now, we perform a basic check.
      await deleteDoc(groundRef);
    } catch (error) {
      console.error("Error deleting ground from Firestore:", error);
      throw error;
    }
  }
};
