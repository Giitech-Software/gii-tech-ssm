import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getQueuedWrites, readCachedData, writeCachedData } from "./offlineStore";
import { fetchParentStudentIds } from "./parentDetailService";
import { fetchStudentProfile } from "./studentDetailService";

type TimestampLike = {
  seconds?: number;
  toDate?: () => Date;
};

export type CommunicationResult<T> = {
  data: T;
  loadedAt: string;
  source: "live" | "cache";
};

export type SchoolAnnouncement = {
  id: string;
  title: string;
  message: string;
  audience: string;
  category: "announcement" | "alert" | "info";
  published: boolean;
  createdAt?: unknown;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  eventType: string;
  audience: string;
  startDate: string;
  endDate: string;
  location: string;
};

export type WorkflowNotification = {
  id: string;
  title: string;
  message: string;
  category: "announcement" | "alert" | "info";
  route: string;
  target: string;
  recipientUserId: string;
  recipientRoles: string[];
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function chunks(values: string[], size = 10) {
  const uniqueValues = [...new Set(values.filter(Boolean))];
  return Array.from({ length: Math.ceil(uniqueValues.length / size) }, (_, index) =>
    uniqueValues.slice(index * size, index * size + size)
  );
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();

  const timestamp = value as TimestampLike;
  if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
  if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export function formatCommunicationDate(value: unknown) {
  const milliseconds = toMillis(value);
  return milliseconds ? new Date(milliseconds).toLocaleString() : "";
}

async function withCache<T>(
  scope: string,
  userId: string,
  fetchLiveData: () => Promise<T>,
  overlayQueue?: (data: T, writes: Awaited<ReturnType<typeof getQueuedWrites>>) => T
): Promise<CommunicationResult<T>> {
  const writes = overlayQueue ? await getQueuedWrites() : [];
  try {
    const result: CommunicationResult<T> = {
      data: overlayQueue ? overlayQueue(await fetchLiveData(), writes) : await fetchLiveData(),
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData(scope, userId, result);
    return result;
  } catch (error) {
    const cached = await readCachedData<CommunicationResult<T> | null>(scope, userId, null);
    if (cached) return { ...cached, data: overlayQueue ? overlayQueue(cached.data, writes) : cached.data, source: "cache" };
    throw error;
  }
}

export function fetchAnnouncements(userId: string, role: string) {
  return withCache<SchoolAnnouncement[]>("announcements", userId, async () => {
    const snapshot = await getDocs(
      query(
        collection(db, "schoolAnnouncements"),
        where("published", "==", true),
        where("audience", "in", ["all", role])
      )
    );

    return snapshot.docs
      .map((item) => {
        const announcement = item.data();
        return {
          id: item.id,
          title: String(announcement.title || "School announcement"),
          message: String(announcement.message || ""),
          audience: String(announcement.audience || "all"),
          category: announcement.category === "alert" || announcement.category === "info"
            ? announcement.category
            : "announcement",
          published: announcement.published !== false,
          createdAt: announcement.createdAt,
        } satisfies SchoolAnnouncement;
      })
      .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
  }, (records, writes) => overlayRecords(records, writes, userId, "schoolAnnouncements", announcementFromData)
    .filter((item) => item.published && (item.audience === "all" || item.audience === role)));
}

export function fetchCalendarEvents(userId: string, role: string) {
  return withCache<CalendarEvent[]>("calendar-events", userId, async () => {
    const snapshot = await getDocs(
      query(collection(db, "calendarEvents"), where("audience", "in", ["all", role]))
    );

    return snapshot.docs
      .map((item) => {
        const event = item.data();
        return {
          id: item.id,
          title: String(event.title || "School event"),
          description: String(event.description || ""),
          eventType: String(event.eventType || "academic"),
          audience: String(event.audience || "all"),
          startDate: String(event.startDate || ""),
          endDate: String(event.endDate || ""),
          location: String(event.location || ""),
        } satisfies CalendarEvent;
      })
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
  }, (records, writes) => overlayRecords(records, writes, userId, "calendarEvents", calendarFromData)
    .filter((item) => item.audience === "all" || item.audience === role));
}

async function notificationStudentIds(userId: string, role: string) {
  if (role === "parent") return fetchParentStudentIds(userId);
  if (role === "student") return [(await fetchStudentProfile(userId)).studentId];
  return [];
}

export function fetchNotifications(userId: string, role: string) {
  return withCache<WorkflowNotification[]>("notifications", userId, async () => {
    const studentIds = await notificationStudentIds(userId, role);
    const notificationCollection = collection(db, "notifications");
    const snapshots = await Promise.all([
      getDocs(query(notificationCollection, where("recipientUserId", "==", userId))),
      getDocs(query(notificationCollection, where("recipientRoles", "array-contains", role))),
      ...chunks(["all", ...studentIds]).map((targets) =>
        getDocs(query(notificationCollection, where("target", "in", targets)))
      ),
    ]);
    const notifications = new Map<string, WorkflowNotification>();

    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((item) => {
        const notification = item.data();
        if (notification.active === false) return;
        notifications.set(item.id, {
          id: item.id,
          title: String(notification.title || "School notification"),
          message: String(notification.message || ""),
          category: notification.category === "alert" || notification.category === "info"
            ? notification.category
            : "announcement",
          route: String(notification.route || ""),
          target: String(notification.target || ""),
          recipientUserId: String(notification.recipientUserId || ""),
          recipientRoles: Array.isArray(notification.recipientRoles) ? notification.recipientRoles.map(String) : [],
          active: notification.active !== false,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
        });
      });
    });

    return [...notifications.values()].sort(
      (left, right) =>
        toMillis(right.updatedAt || right.createdAt) - toMillis(left.updatedAt || left.createdAt)
    );
  }, (records, writes) => overlayRecords(records, writes, userId, "notifications", notificationFromData)
    .filter((item) => item.active !== false && (item.target === "all" || item.recipientUserId === userId || item.recipientRoles.includes(role))));
}

function overlayRecords<T extends { id: string }>(
  records: T[],
  writes: Awaited<ReturnType<typeof getQueuedWrites>>,
  userId: string,
  collectionName: string,
  fromData: (id: string, data: Record<string, unknown>) => T
) {
  const values = new Map(records.map((item) => [item.id, item]));
  writes
    .filter((write) => write.ownerUid === userId && write.path.startsWith(`${collectionName}/`))
    .forEach((write) => {
      const id = write.path.slice(collectionName.length + 1);
      if (write.type === "delete") values.delete(id);
      else values.set(id, fromData(id, { ...(values.get(id) || {}), ...(write.data || {}) }));
    });
  return [...values.values()];
}

function announcementFromData(id: string, data: Record<string, unknown>): SchoolAnnouncement {
  return {
    id,
    title: String(data.title || "School announcement"),
    message: String(data.message || ""),
    audience: String(data.audience || "all"),
    category: data.category === "alert" || data.category === "info" ? data.category : "announcement",
    published: data.published !== false,
    createdAt: data.createdAt,
  };
}

function calendarFromData(id: string, data: Record<string, unknown>): CalendarEvent {
  return {
    id,
    title: String(data.title || "School event"),
    description: String(data.description || ""),
    eventType: String(data.eventType || "academic"),
    audience: String(data.audience || "all"),
    startDate: String(data.startDate || ""),
    endDate: String(data.endDate || ""),
    location: String(data.location || ""),
  };
}

function notificationFromData(id: string, data: Record<string, unknown>): WorkflowNotification {
  return {
    id,
    title: String(data.title || "School notification"),
    message: String(data.message || ""),
    category: data.category === "alert" || data.category === "info" ? data.category : "announcement",
    route: String(data.route || ""),
    target: String(data.target || ""),
    recipientUserId: String(data.recipientUserId || ""),
    recipientRoles: Array.isArray(data.recipientRoles) ? data.recipientRoles.map(String) : [],
    active: data.active !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
