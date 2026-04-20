import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'cric_scorer_device_id';

/**
 * Gets the unique device ID, generating one if it doesn't exist
 */
export async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (e) {
    console.error('Error managing device ID', e);
    return 'anonymous';
  }
}
