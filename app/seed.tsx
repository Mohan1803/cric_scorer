
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { colors } from './theme';

export default function SeedData() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState('');

  const seedTeam = async (name: string, data: any) => {
    setStatus('seeding');
    setLastAction(name);
    setError(null);
    try {
      await addDoc(collection(db, 'teams'), {
        ...data,
        name_lowercase: data.name.toLowerCase(),
        createdAt: Timestamp.now()
      });
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unknown error');
      setStatus('error');
    }
  };

  const seedUsers = async () => {
    setStatus('seeding');
    setLastAction('Users');
    setError(null);
    try {
      for (const user of usersToSeed) {
        const userDoc = doc(db, 'users', user.id);
        await setDoc(userDoc, {
          ...user,
          lastUpdated: Timestamp.now()
        }, { merge: true });

        const emailMapDoc = doc(db, 'emailToUid', user.email.toLowerCase());
        await setDoc(emailMapDoc, { uid: user.id }, { merge: true });
      }
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unknown error');
      setStatus('error');
    }
  };

  const usersToSeed = [
    { "id": "user_rengasamy", "name": "Ranga", "email": "rengasamy@thetopclassentertainment.com", "role": "allrounder", "battingHand": "left", "bowlingHand": "right", "bowlingType": "fast", "hasProfile": true, "photoURL": "", "qrCode": "user_rengasamy_a1b2c3d" },
    { "id": "user_mohanraj", "name": "Mohan", "email": "mohanraj@thetopclassentertainment.com", "role": "allrounder", "battingHand": "right", "bowlingHand": "right", "bowlingType": "spin", "hasProfile": true, "photoURL": "" },
    { "id": "user_ashwinkrish555", "name": "Ashwin", "email": "ashwinkrish555@gmail.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "" },
    { "id": "user_p4", "name": "Vijay", "email": "player4@onescorer.com", "role": "batsman", "battingHand": "left", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "" },
    { "id": "user_p5", "name": "Sanjay", "email": "player5@onescorer.com", "role": "wicketkeeper", "battingHand": "right", "bowlingHand": "none", "bowlingType": "none", "hasProfile": true, "photoURL": "" },
    { "id": "user_p6", "name": "Karthik", "email": "player6@onescorer.com", "role": "bowler", "battingHand": "right", "bowlingHand": "right", "bowlingType": "fast", "hasProfile": true, "photoURL": "" },
    { "id": "user_p7", "name": "Arun", "email": "player7@onescorer.com", "role": "allrounder", "battingHand": "left", "bowlingHand": "left", "bowlingType": "fast", "hasProfile": true, "photoURL": "" },
    { "id": "user_p8", "name": "Prakash", "email": "player8@onescorer.com", "role": "bowler", "battingHand": "right", "bowlingHand": "right", "bowlingType": "spin", "hasProfile": true, "photoURL": "" },
    { "id": "user_p9", "name": "Deepak", "email": "player9@onescorer.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "" },
    { "id": "user_p10", "name": "Mani", "email": "player10@onescorer.com", "role": "bowler", "battingHand": "left", "bowlingHand": "left", "bowlingType": "fast", "hasProfile": true, "photoURL": "" },
    { "id": "user_p11", "name": "Naveen", "email": "player11@onescorer.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "" },
    { "id": "user_suresh", "name": "Suresh", "email": "suresh@thetopclassentertainment.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "" },
    { "id": "user_dinesh", "name": "Dinesh", "email": "dinesh@thetopclassentertainment.com", "role": "allrounder", "battingHand": "left", "bowlingHand": "left", "bowlingType": "fast", "hasProfile": true, "photoURL": "" },
    { "id": "user_kumar", "name": "Kumar", "email": "kumar@thetopclassentertainment.com", "role": "wicketkeeper", "battingHand": "right", "bowlingHand": "none", "bowlingType": "none", "hasProfile": true, "photoURL": "" },
    { "id": "user_rs4", "name": "Rajesh", "email": "rs_p4@onescorer.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "" },
    { "id": "user_rs5", "name": "Vicky", "email": "rs_p5@onescorer.com", "role": "allrounder", "battingHand": "right", "bowlingHand": "right", "bowlingType": "spin", "hasProfile": true, "photoURL": "" },
    { "id": "user_rs6", "name": "Bala", "email": "rs_p6@onescorer.com", "role": "bowler", "battingHand": "right", "bowlingHand": "right", "bowlingType": "fast", "hasProfile": true, "photoURL": "" },
    { "id": "user_rs7", "name": "Guna", "email": "rs_p7@onescorer.com", "role": "bowler", "battingHand": "left", "bowlingHand": "left", "bowlingType": "spin", "hasProfile": true, "photoURL": "" },
    { "id": "user_rs8", "name": "Madan", "email": "rs_p8@onescorer.com", "role": "batsman", "battingHand": "left", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "" },
    { "id": "user_rs9", "name": "Abhi", "email": "rs_p9@onescorer.com", "role": "bowler", "battingHand": "right", "bowlingHand": "right", "bowlingType": "fast", "hasProfile": true, "photoURL": "" },
    { "id": "user_rs10", "name": "Ram", "email": "rs_p10@onescorer.com", "role": "allrounder", "battingHand": "right", "bowlingHand": "right", "bowlingType": "medium", "hasProfile": true, "photoURL": "" },
    { "id": "user_rs11", "name": "Siva", "email": "rs_p11@onescorer.com", "role": "batsman", "battingHand": "right", "bowlingHand": "right", "bowlingType": "none", "hasProfile": true, "photoURL": "" }
  ];

  const accData = {
    "name": "ACC",
    "ownerId": "user_rengasamy",
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

  const royalStrikersData = {
    "name": "Royal Strikers",
    "ownerId": "user_suresh_rs",
    "playerEmails": [
      "suresh@thetopclassentertainment.com",
      "dinesh@thetopclassentertainment.com",
      "kumar@thetopclassentertainment.com",
      "rs_p4@onescorer.com",
      "rs_p5@onescorer.com",
      "rs_p6@onescorer.com",
      "rs_p7@onescorer.com",
      "rs_p8@onescorer.com",
      "rs_p9@onescorer.com",
      "rs_p10@onescorer.com",
      "rs_p11@onescorer.com"
    ],
    "playerIds": [
      "user_suresh",
      "user_dinesh",
      "user_kumar",
      "user_rs4",
      "user_rs5",
      "user_rs6",
      "user_rs7",
      "user_rs8",
      "user_rs9",
      "user_rs10",
      "user_rs11"
    ],
    "players": [
      { "id": "user_suresh", "name": "Suresh", "email": "suresh@thetopclassentertainment.com", "role": "Batsman", "photoURL": "" },
      { "id": "user_dinesh", "name": "Dinesh", "email": "dinesh@thetopclassentertainment.com", "role": "allrounder", "photoURL": "" },
      { "id": "user_kumar", "name": "Kumar", "email": "kumar@thetopclassentertainment.com", "role": "Wicket Keeper", "photoURL": "" },
      { "id": "user_rs4", "name": "Rajesh", "email": "rs_p4@onescorer.com", "role": "Batsman", "photoURL": "" },
      { "id": "user_rs5", "name": "Vicky", "email": "rs_p5@onescorer.com", "role": "allrounder", "photoURL": "" },
      { "id": "user_rs6", "name": "Bala", "email": "rs_p6@onescorer.com", "role": "Bowler", "photoURL": "" },
      { "id": "user_rs7", "name": "Guna", "email": "rs_p7@onescorer.com", "role": "Bowler", "photoURL": "" },
      { "id": "user_rs8", "name": "Madan", "email": "rs_p8@onescorer.com", "role": "Batsman", "photoURL": "" },
      { "id": "user_rs9", "name": "Abhi", "email": "rs_p9@onescorer.com", "role": "Bowler", "photoURL": "" },
      { "id": "user_rs10", "name": "Ram", "email": "rs_p10@onescorer.com", "role": "allrounder", "photoURL": "" },
      { "id": "user_rs11", "name": "Siva", "email": "rs_p11@onescorer.com", "role": "Batsman", "photoURL": "" }
    ]
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Data Seeder</Text>

      {status === 'idle' && (
        <View style={{ gap: 20 }}>
          <TouchableOpacity style={styles.button} onPress={() => seedTeam('ACC', accData)}>
            <Text style={styles.buttonText}>Seed ACC Team</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => seedTeam('Royal Strikers', royalStrikersData)}>
            <Text style={styles.buttonText}>Seed Royal Strikers</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { backgroundColor: '#8b5cf6' }]} onPress={seedUsers}>
            <Text style={styles.buttonText}>Seed Users (Profiles)</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'seeding' && (
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: '#fff', marginTop: 10 }}>Seeding {lastAction}...</Text>
        </View>
      )}

      {status === 'success' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.successText}>Team {lastAction} added successfully!</Text>
          <TouchableOpacity style={[styles.button, { marginTop: 20 }]} onPress={() => setStatus('idle')}>
            <Text style={styles.buttonText}>Seed Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={() => router.replace('/')}>
            <Text style={[styles.buttonText, { color: '#fff' }]}>Go Home</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'error' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={[styles.button, { marginTop: 20 }]} onPress={() => setStatus('idle')}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 40 },
  button: { backgroundColor: colors.accent, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10 },
  buttonText: { color: '#000', fontWeight: 'bold' },
  successText: { color: colors.success, fontSize: 18, textAlign: 'center' },
  errorText: { color: '#ef4444', fontSize: 16, textAlign: 'center' }
});
