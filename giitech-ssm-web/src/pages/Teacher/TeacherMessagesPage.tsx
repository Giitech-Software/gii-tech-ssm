// src/pages/Teacher/TeacherMessagesPage.tsx
import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { Send, Mail } from "lucide-react";

/* 🔹 Message Type */
interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  participants: string[];
  timestamp: any;
  read?: boolean;
}

/* 🔹 Reusable Local UI */
const Button = ({ onClick, children, variant = "primary", disabled }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 transition ${
      variant === "outline"
        ? "border border-slate-300 text-slate-700 hover:bg-slate-100"
        : "bg-primary text-white hover:bg-primary disabled:opacity-50"
    }`}
  >
    {children}
  </button>
);

const Card = ({ children }: any) => (
  <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
    {children}
  </div>
);

const CardContent = ({ children }: any) => <div className="p-5">{children}</div>;

export default function TeacherMessagesPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatList, setChatList] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;

  /* 🔹 Live listener for all messages involving the teacher */
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", currentUser.email),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: ChatMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];

      // Group by parent email
      const grouped: Record<string, ChatMessage[]> = {};
      data.forEach((msg) => {
        const other = msg.participants.find((p) => p !== currentUser.email);
        if (!other) return;
        if (!grouped[other]) grouped[other] = [];
        grouped[other].push(msg);
      });

      const chats = Object.entries(grouped).map(([parentEmail, msgs]) => {
        const sorted = msgs.sort(
          (a, b) => b.timestamp.seconds - a.timestamp.seconds
        );
        const unread = sorted.filter(
          (m) => m.sender !== currentUser.email && !m.read
        ).length;
        return {
          parentEmail,
          lastMessage: sorted[0],
          unreadCount: unread,
          messages: sorted.reverse(),
        };
      });

      setChatList(chats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  /* 🔹 Select chat to view messages */
  const handleSelectChat = (parentEmail: string) => {
    setSelectedChat(parentEmail);
    const chat = chatList.find((c) => c.parentEmail === parentEmail);
    if (chat) setMessages(chat.messages);
  };

  /* 🔹 Send message to selected parent */
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !currentUser) return;
    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        sender: currentUser.email,
        participants: [currentUser.email, selectedChat],
        text: newMessage.trim(),
        timestamp: new Date(),
        role: "teacher",
        read: false,
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* 🔹 Left: Chat List */}
      <Card className="w-full lg:w-1/3">
        <CardContent>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800">
            <Mail className="text-primary" />
            Inbox
          </h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading chats...</p>
          ) : chatList.length === 0 ? (
            <p className="text-slate-500 text-sm">No messages yet.</p>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {chatList.map((chat) => (
                <div
                  key={chat.parentEmail}
                  onClick={() => handleSelectChat(chat.parentEmail)}
                  className={`p-3 rounded-lg cursor-pointer border ${
                    selectedChat === chat.parentEmail
                      ? "bg-primary border-primary"
                      : "bg-white hover:bg-slate-50"
                  } transition`}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">
                      {chat.parentEmail}
                    </h3>
                    {chat.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 truncate">
                    {chat.lastMessage?.text || "No messages yet"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {chat.lastMessage?.timestamp
                      ? new Date(
                          chat.lastMessage.timestamp.seconds * 1000
                        ).toLocaleString()
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🔹 Right: Chat Window */}
      <Card className="flex-1">
        <CardContent>
          {selectedChat ? (
            <>
              <h2 className="text-lg font-semibold mb-4 text-slate-800">
                Chat with {selectedChat}
              </h2>

              <div className="max-h-[60vh] overflow-y-auto space-y-3 p-2 bg-slate-50 rounded-lg mb-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender === currentUser?.email
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-[70%] text-sm ${
                        msg.sender === currentUser?.email
                          ? "bg-primary text-white"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p className="text-xs opacity-70 mt-1 text-right">
                        {msg.timestamp
                          ? new Date(
                              msg.timestamp.seconds * 1000
                            ).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 🔹 Message Input */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary0"
                />
                <Button onClick={handleSendMessage} disabled={sending}>
                  <Send className="w-4 h-4" />
                  {sending ? "Sending..." : "Send"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-center py-20">
              Select a chat from the inbox to start messaging.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
