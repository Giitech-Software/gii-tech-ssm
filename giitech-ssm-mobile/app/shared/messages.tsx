import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { MessagePageShell } from "../../src/components/MessagePageShell";
import { StudentDataState } from "../../src/components/StudentDataState";
import { useAuth } from "../../src/contexts/AuthContext";
import { useMessageInbox } from "../../src/hooks/useMessageInbox";
import { formatMessageDate, validateRecipientEmail } from "../../src/services/messagingService";

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { inbox, loading, error, load } = useMessageInbox();
  const [recipient, setRecipient] = useState("");
  const [recipientError, setRecipientError] = useState("");

  const openConversation = (email: string) => {
    if (!user?.email) return;
    try {
      const validatedRecipient = validateRecipientEmail(email, user.email);
      setRecipientError("");
      router.push(`./conversation?recipient=${encodeURIComponent(validatedRecipient)}`);
    } catch (validationError) {
      setRecipientError(
        validationError instanceof Error ? validationError.message : "Enter a valid school email address."
      );
    }
  };

  return (
    <MessagePageShell subtitle="Continue school conversations or start one with a known school email." title="Messages">
      <StudentDataState error={error} loading={loading} offline={inbox?.source === "cache"} onRefresh={load} />
      <View className="mt-5 rounded-3xl border border-teal-100 bg-white p-5">
        <Text className="text-xs font-bold uppercase tracking-widest text-teal-700">
          New conversation
        </Text>
        <Text className="mt-2 text-sm leading-5 text-slate-500">
          Enter the school email issued to the teacher, parent, or staff member.
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
          keyboardType="email-address"
          onChangeText={setRecipient}
          onSubmitEditing={() => openConversation(recipient)}
          placeholder="member@giitech-ssm.com"
          placeholderTextColor="#94a3b8"
          value={recipient}
        />
        {!!recipientError && <Text className="mt-3 text-sm font-semibold text-red-700">{recipientError}</Text>}
        <Pressable
          className="mt-4 items-center rounded-2xl bg-teal-700 px-4 py-4 active:bg-teal-800"
          onPress={() => openConversation(recipient)}
        >
          <Text className="text-sm font-bold text-white">Open conversation</Text>
        </Pressable>
      </View>

      <Text className="mt-7 text-lg font-extrabold text-slate-900">Inbox</Text>
      {!loading && !inbox?.conversations.length && !error && (
        <Text className="mt-6 text-center text-sm text-slate-500">No messages yet.</Text>
      )}
      <View className="mt-3">
        {inbox?.conversations.map((conversation) => (
          <Pressable
            className="mb-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
            key={conversation.recipient}
            onPress={() => openConversation(conversation.recipient)}
          >
            <View className="flex-row items-start justify-between">
              <Text className="mr-3 flex-1 text-base font-extrabold text-slate-900">
                {conversation.recipient}
              </Text>
              {!!conversation.unreadCount && (
                <Text className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                  {conversation.unreadCount}
                </Text>
              )}
            </View>
            <Text className="mt-2 text-sm text-slate-600" numberOfLines={1}>
              {conversation.lastMessage.text}
            </Text>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-xs text-slate-400">
                {formatMessageDate(conversation.lastMessage.timestamp)}
              </Text>
              {conversation.lastMessage.pending && (
                <Text className="text-xs font-bold uppercase text-amber-700">Queued</Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </MessagePageShell>
  );
}
