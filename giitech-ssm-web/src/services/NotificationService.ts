import { collection, getDocs, query, where, type Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type NotificationCategory = "announcement" | "alert" | "info";

export interface WorkflowNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  target?: string;
  recipientUserId?: string;
  recipientRoles?: string[];
  route?: string;
  workflow?: string;
  active?: boolean;
  read?: boolean;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

interface NotificationAudience {
  userId: string;
  role: string;
  studentIds?: string[];
}

const chunks = (values: string[], size = 10) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, index * size + size),
  );

function toMillis(value?: Timestamp | string): number {
  if (!value) return 0;
  return typeof value === "string"
    ? new Date(value).getTime()
    : value.toMillis();
}

export async function fetchNotificationsForUser({
  userId,
  role,
  studentIds = [],
}: NotificationAudience): Promise<WorkflowNotification[]> {
  const targetValues = [...new Set(["all", ...studentIds].filter(Boolean))];
  const notificationCollection = collection(db, "notifications");
  const snapshots = await Promise.all([
    getDocs(query(notificationCollection, where("recipientUserId", "==", userId))),
    getDocs(query(notificationCollection, where("recipientRoles", "array-contains", role))),
    ...chunks(targetValues).map((targets) =>
      getDocs(query(notificationCollection, where("target", "in", targets))),
    ),
  ]);
  const notifications = new Map<string, WorkflowNotification>();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((item) => {
      const notification = { id: item.id, ...item.data() } as WorkflowNotification;
      if (notification.active !== false) notifications.set(notification.id, notification);
    });
  });
  return [...notifications.values()].sort(
    (left, right) =>
      toMillis(right.updatedAt || right.createdAt) -
      toMillis(left.updatedAt || left.createdAt),
  );
}
