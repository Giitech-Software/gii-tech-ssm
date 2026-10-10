import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function SharedPageShell({
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
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerClassName="px-5 pb-10 pt-6" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Pressable className="mb-5 self-start rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm" onPress={router.back}>
          <Text className="text-sm font-bold text-primary">Back to dashboard</Text>
        </Pressable>
        <View className="rounded-3xl border border-blue-900 bg-primary p-6 shadow-lg shadow-blue-900/20">
          <Text className="text-xs font-bold uppercase tracking-widest text-sky-200">
            School updates
          </Text>
          <Text className="mt-3 text-3xl font-black text-white">{title}</Text>
          <Text className="mt-2 text-sm leading-5 text-blue-100">{subtitle}</Text>
        </View>
        <View className="mt-2">{children}</View>
      </ScrollView></KeyboardAvoidingView>
    </SafeAreaView>
  );
}
