import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getQueuedWrites, readCachedData, writeCachedData } from "./offlineStore";

const CACHE_SCOPE = "admin-communications";

export type Audience = "all" | "admin" | "teacher" | "student" | "parent";
export type CommunicationCategory = "announcement" | "alert" | "info";
export type EventType = "academic" | "exam" | "holiday" | "meeting" | "activity";

export type AdminAnnouncement = {
  id: string;
  title: string;
  message: string;
  audience: Audience;
  category: CommunicationCategory;
  published: boolean;
  pending: boolean;
};

export type AdminCalendarEvent = {
  id: string;
  title: string;
  description: string;
  eventType: EventType;
  audience: Audience;
  startDate: string;
  endDate: string;
  location: string;
  pending: boolean;
};

export type AdminNotification = {
  id: string;
  title: string;
  message: string;
  category: CommunicationCategory;
  target: string;
  recipientRoles: string[];
  route: string;
  active: boolean;
  pending: boolean;
};

export type AdminCommunicationData = {
  announcements: AdminAnnouncement[];
  events: AdminCalendarEvent[];
  notifications: AdminNotification[];
  loadedAt: string;
  source: "live" | "cache";
};

function audience(value: unknown): Audience {
  return value === "admin" || value === "teacher" || value === "student" || value === "parent" ? value : "all";
}

function category(value: unknown): CommunicationCategory {
  return value === "alert" || value === "info" ? value : "announcement";
}

function eventType(value: unknown): EventType {
  return value === "exam" || value === "holiday" || value === "meeting" || value === "activity" ? value : "academic";
}

function announcementFromData(id: string, data: Record<string, unknown>, pending = false): AdminAnnouncement {
  return { id, title: String(data.title || "School announcement"), message: String(data.message || ""), audience: audience(data.audience), category: category(data.category), published: data.published !== false, pending };
}

function eventFromData(id: string, data: Record<string, unknown>, pending = false): AdminCalendarEvent {
  return { id, title: String(data.title || "School event"), description: String(data.description || ""), eventType: eventType(data.eventType), audience: audience(data.audience), startDate: String(data.startDate || ""), endDate: String(data.endDate || ""), location: String(data.location || ""), pending };
}

function notificationFromData(id: string, data: Record<string, unknown>, pending = false): AdminNotification {
  return { id, title: String(data.title || "School notification"), message: String(data.message || ""), category: category(data.category), target: String(data.target || "all"), recipientRoles: Array.isArray(data.recipientRoles) ? data.recipientRoles.map(String) : [], route: String(data.route || ""), active: data.active !== false, pending };
}

function merge<T extends { id: string }>(records: T[], writes: Awaited<ReturnType<typeof getQueuedWrites>>, userId: string, collectionName: string, fromData: (id: string, data: Record<string, unknown>, pending?: boolean) => T) {
  const values = new Map(records.map((item) => [item.id, item]));
  writes.filter((write) => write.ownerUid === userId && write.path.startsWith(`${collectionName}/`)).forEach((write) => {
    const id = write.path.slice(collectionName.length + 1);
    if (write.type === "delete") values.delete(id);
    else values.set(id, fromData(id, { ...(values.get(id) || {}), ...(write.data || {}) }, true));
  });
  return [...values.values()];
}

function overlay(data: AdminCommunicationData, writes: Awaited<ReturnType<typeof getQueuedWrites>>, userId: string) {
  return {
    ...data,
    announcements: merge(data.announcements, writes, userId, "schoolAnnouncements", announcementFromData),
    events: merge(data.events, writes, userId, "calendarEvents", eventFromData).sort((left, right) => left.startDate.localeCompare(right.startDate)),
    notifications: merge(data.notifications, writes, userId, "notifications", notificationFromData),
  };
}

export async function fetchAdminCommunications(userId: string): Promise<AdminCommunicationData> {
  const cached = await readCachedData<AdminCommunicationData | null>(CACHE_SCOPE, userId, null);
  const writes = await getQueuedWrites();
  try {
    const [announcements, events, notifications] = await Promise.all([
      getDocs(collection(db, "schoolAnnouncements")),
      getDocs(collection(db, "calendarEvents")),
      getDocs(collection(db, "notifications")),
    ]);
    const result = overlay({ announcements: announcements.docs.map((item) => announcementFromData(item.id, item.data())), events: events.docs.map((item) => eventFromData(item.id, item.data())), notifications: notifications.docs.map((item) => notificationFromData(item.id, item.data())), loadedAt: new Date().toISOString(), source: "live" }, writes, userId);
    await writeCachedData(CACHE_SCOPE, userId, result);
    return result;
  } catch (error) {
    if (!cached) throw error;
    return { ...overlay(cached, writes, userId), source: "cache" };
  }
}

export function communicationDocumentId(prefix: "ANN" | "EVT" | "NTF") {
  return `${prefix}-M-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
