import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getQueuedWrites, readCachedData, writeCachedData } from "./offlineStore";

const CACHE_SCOPE = "message-inbox";

type TimestampLike = {
  seconds?: number;
  toDate?: () => Date;
};

export type ChatMessage = {
  id: string;
  sender: string;
  participants: string[];
  text: string;
  timestamp: unknown;
  role: string;
  read: boolean;
  pending: boolean;
};

export type MessageConversation = {
  recipient: string;
  messages: ChatMessage[];
  lastMessage: ChatMessage;
  unreadCount: number;
};

export type MessageInbox = {
  conversations: MessageConversation[];
  loadedAt: string;
  source: "live" | "cache";
};

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();

  const timestamp = value as TimestampLike;
  if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
  if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export function formatMessageDate(value: unknown) {
  const milliseconds = toMillis(value);
  return milliseconds ? new Date(milliseconds).toLocaleString() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateRecipientEmail(value: string, senderEmail: string) {
  const recipient = normalizeEmail(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error("Enter a valid school email address.");
  }
  if (recipient === normalizeEmail(senderEmail)) {
    throw new Error("Choose another school member.");
  }
  return recipient;
}

export function createMessageId(userId: string) {
  return `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function queuedMessages(userId: string, senderEmail: string) {
  return getQueuedWrites().then((writes) =>
    writes
      .filter((write) => write.ownerUid === userId && write.path.startsWith("messages/"))
      .map((write) => {
        const data = write.data || {};
        return {
          id: write.path.slice("messages/".length),
          sender: String(data.sender || senderEmail),
          participants: Array.isArray(data.participants)
            ? data.participants.map((participant) => String(participant))
            : [],
          text: String(data.text || ""),
          timestamp: data.timestamp || write.createdAt,
          role: String(data.role || ""),
          read: data.read === true,
          pending: true,
        } satisfies ChatMessage;
      })
  );
}

function groupConversations(messages: ChatMessage[], senderEmail: string) {
  const normalizedSender = normalizeEmail(senderEmail);
  const grouped = new Map<string, ChatMessage[]>();

  messages.forEach((message) => {
    const recipient = message.participants.find(
      (participant) => normalizeEmail(participant) !== normalizedSender
    );
    if (!recipient) return;
    const normalizedRecipient = normalizeEmail(recipient);
    grouped.set(normalizedRecipient, [...(grouped.get(normalizedRecipient) || []), message]);
  });

  return [...grouped.entries()]
    .map(([recipient, conversationMessages]) => {
      const sorted = conversationMessages.sort(
        (left, right) => toMillis(left.timestamp) - toMillis(right.timestamp)
      );
      return {
        recipient,
        messages: sorted,
        lastMessage: sorted[sorted.length - 1],
        unreadCount: sorted.filter(
          (message) => normalizeEmail(message.sender) !== normalizedSender && !message.read
        ).length,
      };
    })
    .sort((left, right) => toMillis(right.lastMessage.timestamp) - toMillis(left.lastMessage.timestamp));
}

async function liveMessages(senderEmail: string) {
  const snapshot = await getDocs(
    query(
      collection(db, "messages"),
      where("participants", "array-contains", senderEmail),
      orderBy("timestamp", "desc")
    )
  );
  return snapshot.docs.map((item) => {
    const message = item.data();
    return {
      id: item.id,
      sender: String(message.sender || ""),
      participants: Array.isArray(message.participants)
        ? message.participants.map((participant: unknown) => String(participant))
        : [],
      text: String(message.text || ""),
      timestamp: message.timestamp,
      role: String(message.role || ""),
      read: message.read === true,
      pending: false,
    } satisfies ChatMessage;
  });
}

export async function fetchMessageInbox(userId: string, senderEmail: string): Promise<MessageInbox> {
  const cached = await readCachedData<MessageInbox | null>(CACHE_SCOPE, userId, null);

  try {
    const [messages, pendingMessages] = await Promise.all([
      liveMessages(senderEmail),
      queuedMessages(userId, senderEmail),
    ]);
    const messageMap = new Map<string, ChatMessage>(
      messages.map((message) => [message.id, message])
    );
    pendingMessages.forEach((message) => messageMap.set(message.id, message));
    const result: MessageInbox = {
      conversations: groupConversations([...messageMap.values()], senderEmail),
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData(CACHE_SCOPE, userId, result);
    return result;
  } catch (error) {
    const pendingMessages = await queuedMessages(userId, senderEmail);
    if (cached || pendingMessages.length) {
      const cachedMessages = cached?.conversations.flatMap((conversation) => conversation.messages) || [];
      const messageMap = new Map(cachedMessages.map((message) => [message.id, message]));
      pendingMessages.forEach((message) => messageMap.set(message.id, message));
      return {
        conversations: groupConversations([...messageMap.values()], senderEmail),
        loadedAt: cached?.loadedAt || new Date().toISOString(),
        source: "cache",
      };
    }
    throw error;
  }
}

export function findConversation(inbox: MessageInbox | null, recipient: string) {
  const normalizedRecipient = normalizeEmail(recipient);
  return inbox?.conversations.find((conversation) => conversation.recipient === normalizedRecipient) || null;
}
