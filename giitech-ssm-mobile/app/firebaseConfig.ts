// giitech-ssm-mobile/app/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import Constants from "expo-constants";

// Expo: put keys in app.json -> expo.extra or use dev .env system of your choice.
const expoConfig = Constants.expoConfig || {};
const extra = (expoConfig as { extra?: any }).extra || {};

const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY ?? process.env.FIREBASE_API_KEY,
  authDomain: extra.FIREBASE_AUTH_DOMAIN ?? process.env.FIREBASE_AUTH_DOMAIN,
  projectId: extra.FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID,
  storageBucket: extra.FIREBASE_STORAGE_BUCKET ?? process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID ?? process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: extra.FIREBASE_APP_ID ?? process.env.FIREBASE_APP_ID,
   measurementId: extra.FIREBASE_MEASUREMENT_ID ?? process.env.FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
