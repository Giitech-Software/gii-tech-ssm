import { Stack } from "expo-router";
import "../global.css";
import { AuthProvider } from "../src/contexts/AuthContext";
import { SyncProvider } from "../src/contexts/SyncContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SyncProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SyncProvider>
    </AuthProvider>
  );
}
