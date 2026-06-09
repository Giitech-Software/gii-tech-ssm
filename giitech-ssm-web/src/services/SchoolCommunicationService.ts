import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export type Audience = "all" | "admin" | "teacher" | "student" | "parent";
export type AnnouncementCategory = "announcement" | "alert" | "info";
export type CalendarEventType = "academic" | "exam" | "holiday" | "meeting" | "activity";

export interface SchoolAnnouncement {
  id: string;
  title: string;
  message: string;
  audience: Audience;
  category: AnnouncementCategory;
  published: boolean;
  createdBy?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: CalendarEventType;
  audience: Audience;
  startDate: string;
  endDate?: string;
  location?: string;
  createdBy?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export type NewAnnouncement = Omit<SchoolAnnouncement, "id" | "createdAt" | "updatedAt">;
export type NewCalendarEvent = Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">;

const byCreatedAt = <T extends { createdAt?: Timestamp | string }>(left: T, right: T) => {
  const dateOf = (value?: Timestamp | string) => value instanceof Timestamp ? value.toMillis() : new Date(value || 0).getTime();
  return dateOf(right.createdAt) - dateOf(left.createdAt);
};

export async function fetchAnnouncements(role?: string, includeDrafts = false): Promise<SchoolAnnouncement[]> {
  const announcements = collection(db, "schoolAnnouncements");
  const announcementQuery = includeDrafts
    ? announcements
    : role
      ? query(announcements, where("published", "==", true), where("audience", "in", ["all", role]))
      : query(announcements, where("published", "==", true));
  const snapshot = await getDocs(announcementQuery);
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SchoolAnnouncement)
    .filter((item) => includeDrafts || item.published)
    .filter((item) => !role || item.audience === "all" || item.audience === role)
    .sort(byCreatedAt);
}

export async function createAnnouncement(data: NewAnnouncement) {
  return addDoc(collection(db, "schoolAnnouncements"), { ...data, createdAt: serverTimestamp() });
}

export async function updateAnnouncement(id: string, data: Partial<NewAnnouncement>) {
  await updateDoc(doc(db, "schoolAnnouncements", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db, "schoolAnnouncements", id));
}

export async function fetchCalendarEvents(role?: string): Promise<CalendarEvent[]> {
  const events = collection(db, "calendarEvents");
  const eventQuery = role ? query(events, where("audience", "in", ["all", role])) : events;
  const snapshot = await getDocs(eventQuery);
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as CalendarEvent)
    .filter((item) => !role || item.audience === "all" || item.audience === role)
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
}

export async function createCalendarEvent(data: NewCalendarEvent) {
  return addDoc(collection(db, "calendarEvents"), { ...data, createdAt: serverTimestamp() });
}

export async function updateCalendarEvent(id: string, data: Partial<NewCalendarEvent>) {
  await updateDoc(doc(db, "calendarEvents", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCalendarEvent(id: string) {
  await deleteDoc(doc(db, "calendarEvents", id));
}
