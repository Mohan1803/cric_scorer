import firestore from '@react-native-firebase/firestore';

export const saveMatchData = async (matchName: string, data: any) => {
  try {
    await firestore().collection('matches').doc(matchName).set(data);
    return true;
  } catch (error) {
    console.error('Error saving match data:', error);
    return false;
  }
};

export const getMatchData = async (matchName: string) => {
  const doc = await firestore().collection('matches').doc(matchName).get();
  // @ts-ignore
  if (doc.exists) return doc.data();
  return null;
};
