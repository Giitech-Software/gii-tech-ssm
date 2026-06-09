import type { ReactNode } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

type StudentPageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function StudentPageShell({ title, subtitle, children }: StudentPageShellProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="px-5 py-6">
        <Pressable className="mb-5 self-start rounded-xl bg-white px-4 py-3" onPress={router.back}>
          <Text className="text-sm font-bold text-slate-700">Back to dashboard</Text>
        </Pressable>
        <View className="rounded-3xl bg-slate-950 p-6">
          <Text className="text-xs font-bold uppercase tracking-widest text-sky-400">
            Student workspace
          </Text>
          <Text className="mt-3 text-3xl font-black text-white">{title}</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-300">{subtitle}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
