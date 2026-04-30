import { db } from '../services/firebaseConfig';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

const usersToSeed = [
  { "id": "user_rengasamy", "name": "Ranga", "email": "rengasamy@thetopclassentertainment.com", "role": "allrounder", "battingHand": "left", "bowlingHand": "left", "bowlingType": "fast", "hasProfile": true, "photoURL": "", "qrCode": "user_rengasamy_a1b2c3d", "lastUpdated": "April 28, 2026 at 3:49:30 PM UTC+5:30" },
  { "id": "user_mohanraj", "name": "Mohan", "email": "mohanraj@thetopclassentertainment.com", "role": "allrounder", "battingHand": "right", "bowlingHand": "right", "bowlingType": "spin", "hasProfile": true, "photoURL": "", "qrCode": "user_mohanraj_e5f6g7h", "lastUpdated": "April 28, 2026 at 3:49:30 PM UTC+5:30" },
  { "id": "user_ashwinkrish555", "name": "Ashwin", "email": "ashwinkrish555@gmail.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "", "qrCode": "user_ashwinkrish555_i9j0k1l", "lastUpdated": "April 28, 2026 at 3:49:30 PM UTC+5:30" },
  { "id": "user_p4", "name": "Vijay", "email": "player4@onescorer.com", "role": "batsman", "battingHand": "left", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "", "qrCode": "user_p4_m2n3o4p", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_p5", "name": "Sanjay", "email": "player5@onescorer.com", "role": "wicketkeeper", "battingHand": "right", "bowlingHand": "none", "bowlingType": "none", "hasProfile": true, "photoURL": "", "qrCode": "user_p5_q5r6s7t", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_p6", "name": "Karthik", "email": "player6@onescorer.com", "role": "bowler", "battingHand": "right", "bowlingHand": "right", "bowlingType": "fast", "hasProfile": true, "photoURL": "", "qrCode": "user_p6_u8v9w0x", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_p7", "name": "Arun", "email": "player7@onescorer.com", "role": "allrounder", "battingHand": "left", "bowlingHand": "left", "bowlingType": "fast", "hasProfile": true, "photoURL": "", "qrCode": "user_p7_y1z2a3b", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_p8", "name": "Prakash", "email": "player8@onescorer.com", "role": "bowler", "battingHand": "right", "bowlingHand": "right", "bowlingType": "spin", "hasProfile": true, "photoURL": "", "qrCode": "user_p8_c4d5e6f", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_p9", "name": "Deepak", "email": "player9@onescorer.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "", "qrCode": "user_p9_g7h8i9j", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_p10", "name": "Mani", "email": "player10@onescorer.com", "role": "bowler", "battingHand": "left", "bowlingHand": "left", "bowlingType": "fast", "hasProfile": true, "photoURL": "", "qrCode": "user_p10_k0l1m2n", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_p11", "name": "Naveen", "email": "player11@onescorer.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "", "qrCode": "user_p11_o3p4q5r", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_suresh", "name": "Suresh", "email": "suresh@thetopclassentertainment.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "", "qrCode": "user_suresh_s6t7u8v", "lastUpdated": "April 30, 2026 at 1:30:00 PM UTC+5:30" },
  { "id": "user_dinesh", "name": "Dinesh", "email": "dinesh@thetopclassentertainment.com", "role": "allrounder", "battingHand": "left", "bowlingHand": "left", "bowlingType": "fast", "hasProfile": true, "photoURL": "", "qrCode": "user_dinesh_w9x0y1z", "lastUpdated": "April 30, 2026 at 1:30:00 PM UTC+5:30" },
  { "id": "user_kumar", "name": "Kumar", "email": "kumar@thetopclassentertainment.com", "role": "wicketkeeper", "battingHand": "right", "bowlingHand": "none", "bowlingType": "none", "hasProfile": true, "photoURL": "", "qrCode": "user_kumar_a2b3c4d", "lastUpdated": "April 30, 2026 at 1:30:00 PM UTC+5:30" },
  { "id": "user_rs4", "name": "Rajesh", "email": "rs_p4@onescorer.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "", "qrCode": "user_rs4_e5f6g7h", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_rs5", "name": "Vicky", "email": "rs_p5@onescorer.com", "role": "allrounder", "battingHand": "right", "bowlingHand": "right", "bowlingType": "spin", "hasProfile": true, "photoURL": "", "qrCode": "user_rs5_i8j9k0l", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_rs6", "name": "Bala", "email": "rs_p6@onescorer.com", "role": "bowler", "battingHand": "right", "bowlingHand": "right", "bowlingType": "fast", "hasProfile": true, "photoURL": "", "qrCode": "user_rs6_m1n2o3p", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_rs7", "name": "Guna", "email": "rs_p7@onescorer.com", "role": "bowler", "battingHand": "left", "bowlingHand": "left", "bowlingType": "spin", "hasProfile": true, "photoURL": "", "qrCode": "user_rs7_q4r5s6t", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_rs8", "name": "Madan", "email": "rs_p8@onescorer.com", "role": "batsman", "battingHand": "left", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "", "qrCode": "user_rs8_u7v8w9x", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_rs9", "name": "Abhi", "email": "rs_p9@onescorer.com", "role": "bowler", "battingHand": "right", "bowlingHand": "right", "bowlingType": "fast", "hasProfile": true, "photoURL": "", "qrCode": "user_rs9_y0z1a2b", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_rs10", "name": "Ram", "email": "rs_p10@onescorer.com", "role": "allrounder", "battingHand": "right", "bowlingHand": "right", "bowlingType": "medium", "hasProfile": true, "photoURL": "", "qrCode": "user_rs10_c3d4e5f", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" },
  { "id": "user_rs11", "name": "Siva", "email": "rs_p11@onescorer.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "", "qrCode": "user_rs11_g6h7i8j", "lastUpdated": "April 30, 2026 at 6:00:00 PM UTC+5:30" }
]

export const seedUsers = async () => {
  console.log("Starting users seeding...");
  for (const user of usersToSeed) {
    try {
      const userDoc = doc(db, 'users', user.id);
      await setDoc(userDoc, {
        ...user,
        lastUpdated: Timestamp.now() // Using current time for simplicity, or could parse the string if needed
      });

      // Also seed the email to UID mapping for easy lookup
      const emailMapDoc = doc(db, 'emailToUid', user.email.toLowerCase());
      await setDoc(emailMapDoc, { uid: user.id });

      console.log(`Seeded user: ${user.name} (${user.id})`);
    } catch (e) {
      console.error(`Failed to seed user ${user.id}:`, e);
    }
  }
  console.log("Users seeding complete!");
};
