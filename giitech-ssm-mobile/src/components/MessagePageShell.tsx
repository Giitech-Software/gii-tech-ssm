import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

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
      <ScrollView contentContainerClassName="px-5 py-6" keyboardShouldPersistTaps="handled">
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
      </ScrollView>
    </SafeAreaView>
  );
}
