import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function MessagePageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerClassName="px-5 pb-10 pt-6" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Pressable className="mb-5 self-start rounded-xl bg-white px-4 py-3" onPress={router.back}>
          <Text className="text-sm font-bold text-slate-700">Back</Text>
        </Pressable>
        <View className="rounded-3xl bg-teal-950 p-6">
          <Text className="text-xs font-bold uppercase tracking-widest text-teal-300">
            Secure messaging
          </Text>
          <Text className="mt-3 text-3xl font-black text-white">{title}</Text>
          <Text className="mt-2 text-sm leading-5 text-teal-100">{subtitle}</Text>
        </View>
        {children}
      </ScrollView></KeyboardAvoidingView>
    </SafeAreaView>
  );
}
