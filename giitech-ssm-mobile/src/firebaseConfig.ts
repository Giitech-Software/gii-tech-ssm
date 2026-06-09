// Shared Firebase client configuration for the Expo app.
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import Constants from "expo-constants";

const expoConfig = Constants.expoConfig || {};
const extra = (expoConfig as { extra?: Record<string, string> }).extra || {};

const firebaseConfig = {
  apiKey: extra.apiKey ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: extra.authDomain ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: extra.projectId ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    extra.storageBucket ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    extra.messagingSenderId ??
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: extra.appId ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId:
    extra.measurementId ?? process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
