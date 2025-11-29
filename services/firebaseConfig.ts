import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const createFirebaseApp = () => {
  if (getApps().length) return getApps()[0];

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  } as any;

  return initializeApp(firebaseConfig);
};

const app = createFirebaseApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

// If running with emulator flag, connect SDK to local emulators
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    // Auth emulator default host
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  } catch (err) {
    // ignore if auth not initialized yet
  }
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (err) {
    // ignore
  }
}
