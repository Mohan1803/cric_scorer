
import { db } from '../services/firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const teamData = {
  "name": "ACC",
  "ownerId": "user_rengasamy",
  "createdAt": Timestamp.now(), // Firestore handles Timestamps better than strings
  "playerEmails": [
    "rengasamy@thetopclassentertainment.com",
    "mohanraj@thetopclassentertainment.com",
    "ashwinkrish555@gmail.com",
    "player4@onescorer.com",
    "player5@onescorer.com",
    "player6@onescorer.com",
    "player7@onescorer.com",
    "player8@onescorer.com",
    "player9@onescorer.com",
    "player10@onescorer.com",
    "player11@onescorer.com"
  ],
  "playerIds": [
    "user_rengasamy",
    "user_mohanraj",
    "user_ashwinkrish555",
    "user_p4",
    "user_p5",
    "user_p6",
    "user_p7",
    "user_p8",
    "user_p9",
    "user_p10",
    "user_p11"
  ],
  "players": [
    { "id": "user_rengasamy", "name": "Ranga", "email": "rengasamy@thetopclassentertainment.com", "role": "allrounder", "photoURL": "" },
    { "id": "user_mohanraj", "name": "Mohan", "email": "mohanraj@thetopclassentertainment.com", "role": "allrounder", "photoURL": "" },
    { "id": "user_ashwinkrish555", "name": "Ashwin", "email": "ashwinkrish555@gmail.com", "role": "Batsman", "photoURL": "" },
    { "id": "user_p4", "name": "Vijay", "email": "player4@onescorer.com", "role": "Batsman", "photoURL": "" },
    { "id": "user_p5", "name": "Sanjay", "email": "player5@onescorer.com", "role": "Wicket Keeper", "photoURL": "" },
    { "id": "user_p6", "name": "Karthik", "email": "player6@onescorer.com", "role": "Bowler", "photoURL": "" },
    { "id": "user_p7", "name": "Arun", "email": "player7@onescorer.com", "role": "allrounder", "photoURL": "" },
    { "id": "user_p8", "name": "Prakash", "email": "player8@onescorer.com", "role": "Bowler", "photoURL": "" },
    { "id": "user_p9", "name": "Deepak", "email": "player9@onescorer.com", "role": "Batsman", "photoURL": "" },
    { "id": "user_p10", "name": "Mani", "email": "player10@onescorer.com", "role": "Bowler", "photoURL": "" },
    { "id": "user_p11", "name": "Naveen", "email": "player11@onescorer.com", "role": "Batsman", "photoURL": "" }
  ]
};

async function seed() {
  try {
    console.log("Seeding team ACC...");
    const docRef = await addDoc(collection(db, 'teams'), teamData);
    console.log("Team added with ID: ", docRef.id);
    process.exit(0);
  } catch (e) {
    console.error("Error adding team: ", e);
    process.exit(1);
  }
}

seed();
