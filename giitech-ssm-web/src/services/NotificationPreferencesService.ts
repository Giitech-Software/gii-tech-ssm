import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type NotificationPreferences = { inApp: boolean; push: boolean; email: boolean; sms: boolean };
export const defaultNotificationPreferences: NotificationPreferences = { inApp: true, push: false, email: false, sms: false };

export async function getNotificationPreferences(userId: string) {
  const snapshot = await getDoc(doc(db, "users", userId));
  return { ...defaultNotificationPreferences, ...(snapshot.data()?.notificationPreferences || {}) } as NotificationPreferences;
}

export async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences) {
  await updateDoc(doc(db, "users", userId), { notificationPreferences: preferences });
}
