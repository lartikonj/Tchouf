import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Connect to emulators in development only if using demo project
if (import.meta.env.DEV && (!import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID === "demo-project")) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectStorageEmulator(storage, "localhost", 9199);
  } catch (error) {
    // Emulators might already be connected
    console.log("Firebase emulators connection attempt:", error);
  }
}

export default app;
