import { ActivityIndicator, Pressable, Text, View } from "react-native";

type StudentDataStateProps = {
  error: string;
  loading: boolean;
  offline: boolean;
  onRefresh: () => void;
};

export function StudentDataState({ error, loading, offline, onRefresh }: StudentDataStateProps) {
  return (
    <View className="mt-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-500">
          {offline ? "Saved offline snapshot" : "Latest school records"}
        </Text>
        <Pressable
          className="rounded-xl bg-sky-100 px-4 py-3 active:bg-sky-200"
          disabled={loading}
          onPress={onRefresh}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#075985" />
          ) : (
            <Text className="text-sm font-bold text-sky-800">Refresh</Text>
          )}
        </Pressable>
      </View>
      {offline && (
        <Text className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          You are viewing data saved during your last successful connection.
        </Text>
      )}
      {!!error && (
        <Text className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </Text>
      )}
    </View>
  );
}
