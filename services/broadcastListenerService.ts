import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { sendLocalNotification } from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFIED_MATCHES_KEY = 'notified_match_ids';

/**
 * Starts a real-time listener that notifies the user when a new match begins
 */
export async function startBroadcastListener() {
  // Load existing notified IDs to avoid double notifications
  let notifiedIds: string[] = [];
  try {
    const saved = await AsyncStorage.getItem(NOTIFIED_MATCHES_KEY);
    if (saved) notifiedIds = JSON.parse(saved);
  } catch (e) {
    console.error('Error loading notified IDs', e);
  }

  const q = query(
    collection(db, 'matches'),
    where('status', '==', 'live')
  );

  return onSnapshot(q, async (snapshot) => {
    const newNotifiedIds = [...notifiedIds];
    let hasChanges = false;

    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const matchData = change.doc.data();
        const matchId = change.doc.id;

        // Only notify if we haven't seen this match ID before
        // and it was updated recently (within the last 5 minutes)
        // to avoid notifying about ancient live matches on app restart
        const lastUpdated = matchData.lastUpdated as Timestamp;
        const reflectsRecentStart = lastUpdated && (Date.now() - lastUpdated.toMillis()) < 300000;

        if (!notifiedIds.includes(matchId) && reflectsRecentStart) {
          sendLocalNotification(
            '🏏 New Match Started!',
            `${matchData.team1} vs ${matchData.team2} at ${matchData.groundName || 'Unknown Ground'}`,
            { matchId }
          );
          newNotifiedIds.push(matchId);
          hasChanges = true;
        } else if (!notifiedIds.includes(matchId)) {
          // If it's an old match but we haven't seen it, mark it as seen without notifying
          newNotifiedIds.push(matchId);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      notifiedIds = newNotifiedIds;
      await AsyncStorage.setItem(NOTIFIED_MATCHES_KEY, JSON.stringify(newNotifiedIds));
    }
  });
}
