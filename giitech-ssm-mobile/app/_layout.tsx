import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { SyncProvider } from "../src/contexts/SyncContext";

function RouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading || pathname === "/") return;

    if (!user) {
      router.replace("/");
      return;
    }

    const section = pathname.split("/").filter(Boolean)[0];
    const allowed =
      section === "admin"
        ? role === "admin" || role === "superadmin"
        : section === "superadmin"
          ? role === "superadmin"
          : section === "teacher"
            ? role === "teacher"
            : section === "student"
              ? role === "student"
              : section === "parent"
                ? role === "parent"
                : section === "staff"
                  ? role === "staff"
                  : true;

    if (!allowed) router.replace("/");
  }, [loading, pathname, role, router, user]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SyncProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <RouteGuard />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </SyncProvider>
    </AuthProvider>
  );
}
