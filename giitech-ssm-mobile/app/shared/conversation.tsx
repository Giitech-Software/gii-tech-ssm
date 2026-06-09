import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { MessagePageShell } from "../../src/components/MessagePageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import {
  createMessageId,
  fetchMessageInbox,
  findConversation,
  formatMessageDate,
  validateRecipientEmail,
  type MessageInbox,
} from "../../src/services/messagingService";

export default function ConversationPage() {
  const { recipient } = useLocalSearchParams<{ recipient?: string }>();
  const { user, role } = useAuth();
  const { queueWrite } = useSync();
  const [inbox, setInbox] = useState<MessageInbox | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const recipientEmail = useMemo(() => {
    if (!user?.email || !recipient) return "";
    try {
      return validateRecipientEmail(recipient, user.email);
    } catch {
      return "";
    }
  }, [recipient, user]);

  const load = useCallback(async () => {
    if (!user?.email || !recipientEmail) return;
    setLoading(true);
    setError("");
    try {
      setInbox(await fetchMessageInbox(user.uid, user.email));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load this conversation.");
    } finally {
      setLoading(false);
    }
  }, [recipientEmail, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const conversation = findConversation(inbox, recipientEmail);

  const send = async () => {
    if (!user?.email || !recipientEmail || !text.trim()) return;
    setSending(true);
    setError("");
    setMessage("");
    try {
      const timestamp = new Date().toISOString();
      const result = await queueWrite({
        path: `messages/${createMessageId(user.uid)}`,
        type: "set",
        merge: false,
        serverTimestampFields: ["timestamp"],
        data: {
          sender: user.email,
          participants: [user.email, recipientEmail],
          text: text.trim(),
          timestamp,
          role: role || "",
          read: false,
        },
      });
      setText("");
      setMessage(result === "synced" ? "Message sent." : "Message saved offline and queued.");
      await load();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send this message.");
    } finally {
      setSending(false);
    }
  };

  if (!recipientEmail) {
    return (
      <MessagePageShell subtitle="The selected school email address is not valid." title="Conversation unavailable">
        <Text className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          Return to the inbox and choose a valid school member.
        </Text>
      </MessagePageShell>
    );
  }

  return (
    <MessagePageShell subtitle={`Secure conversation with ${recipientEmail}`} title="Conversation">
      <StudentDataState error={error} loading={loading} offline={inbox?.source === "cache"} onRefresh={load} />
      <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
        {!loading && !conversation?.messages.length && (
          <Text className="py-6 text-center text-sm text-slate-500">
            No messages yet. Send the first message below.
          </Text>
        )}
        {conversation?.messages.map((chatMessage) => {
          const sentByUser = chatMessage.sender.toLowerCase() === user?.email?.toLowerCase();
          return (
            <View
              className={`mb-3 max-w-[86%] rounded-2xl p-4 ${sentByUser ? "self-end bg-teal-700" : "self-start bg-slate-100"}`}
              key={chatMessage.id}
            >
              <Text className={`text-sm leading-5 ${sentByUser ? "text-white" : "text-slate-700"}`}>
                {chatMessage.text}
              </Text>
              <Text className={`mt-2 text-xs ${sentByUser ? "text-teal-100" : "text-slate-400"}`}>
                {formatMessageDate(chatMessage.timestamp)}
                {chatMessage.pending ? " | queued" : ""}
              </Text>
            </View>
          );
        })}
      </View>
      {!!message && <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</Text>}
      <View className="mt-4 rounded-3xl border border-teal-100 bg-white p-4">
        <TextInput
          className="min-h-24 rounded-2xl bg-slate-50 px-4 py-4 text-base text-slate-900"
          multiline
          onChangeText={setText}
          placeholder="Write a message..."
          placeholderTextColor="#94a3b8"
          textAlignVertical="top"
          value={text}
        />
        <Pressable
          className="mt-3 items-center rounded-2xl bg-teal-700 px-4 py-4 active:bg-teal-800"
          disabled={sending || !text.trim()}
          onPress={send}
        >
          {sending ? <ActivityIndicator color="#ffffff" /> : <Text className="text-sm font-bold text-white">Send message</Text>}
        </Pressable>
      </View>
    </MessagePageShell>
  );
}
