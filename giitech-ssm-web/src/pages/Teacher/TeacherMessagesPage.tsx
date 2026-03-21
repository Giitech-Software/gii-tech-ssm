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
        ? "border border-gray-300 text-gray-700 hover:bg-gray-100"
        : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
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
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* 🔹 Left: Chat List */}
      <Card className="w-full lg:w-1/3">
        <CardContent>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-800">
            <Mail className="text-indigo-600" />
            Inbox
          </h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading chats...</p>
          ) : chatList.length === 0 ? (
            <p className="text-gray-500 text-sm">No messages yet.</p>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {chatList.map((chat) => (
                <div
                  key={chat.parentEmail}
                  onClick={() => handleSelectChat(chat.parentEmail)}
                  className={`p-3 rounded-lg cursor-pointer border ${
                    selectedChat === chat.parentEmail
                      ? "bg-indigo-50 border-indigo-400"
                      : "bg-white hover:bg-gray-50"
                  } transition`}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">
                      {chat.parentEmail}
                    </h3>
                    {chat.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {chat.lastMessage?.text || "No messages yet"}
                  </p>
                  <p className="text-xs text-gray-400">
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
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                Chat with {selectedChat}
              </h2>

              <div className="max-h-[60vh] overflow-y-auto space-y-3 p-2 bg-gray-50 rounded-lg mb-4">
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
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 text-gray-800"
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
                  className="flex-1 p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button onClick={handleSendMessage} disabled={sending}>
                  <Send className="w-4 h-4" />
                  {sending ? "Sending..." : "Send"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-20">
              Select a chat from the inbox to start messaging.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
