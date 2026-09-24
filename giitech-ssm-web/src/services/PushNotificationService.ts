import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, db } from "../firebaseConfig";

export async function registerPushDevice(userId: string) {
  if (!(await isSupported())) throw new Error("This browser does not support push notifications.");
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey) throw new Error("Push notifications are not configured yet. Add VITE_FIREBASE_VAPID_KEY to the web environment.");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  if (await Notification.requestPermission() !== "granted") throw new Error("Browser notification permission was not granted.");
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Firebase did not return a push token.");
  await updateDoc(doc(db, "users", userId), { pushTokens: arrayUnion(token) });
  return token;
}

export async function listenForForegroundPush(onNotification: (payload: unknown) => void) {
  if (!(await isSupported())) return () => undefined;
  return onMessage(getMessaging(app), onNotification);
}
