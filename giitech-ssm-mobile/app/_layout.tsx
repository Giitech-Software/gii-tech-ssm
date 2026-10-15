import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppState, View, type AppStateStatus } from "react-native";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
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

    if (!user && pathname !== "/signup") {
      router.replace("/");
      return;
    }

    const section = pathname.split("/").filter(Boolean)[0];
    const allowed =
      section === "admin"
        ? role === "admin" || role === "superadmin"
        : section === "superadmin"
          ? role === "superadmin" || (role === "admin" && pathname === "/superadmin/accounts")
          : section === "teacher"
            ? role === "teacher" || role === "admin" || role === "superadmin"
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

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;

function InactivityGuard({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const lastActivityAt = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggingOut = useRef(false);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const scheduleLogout = useCallback(() => {
    clearTimer();
    if (!user) return;
    const remaining = Math.max(0, INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivityAt.current));
    timer.current = setTimeout(() => {
      if (Date.now() - lastActivityAt.current >= INACTIVITY_TIMEOUT_MS && !loggingOut.current) {
        loggingOut.current = true;
        void logout().finally(() => {
          loggingOut.current = false;
        });
      }
    }, remaining);
  }, [clearTimer, logout]);

  const recordActivity = useCallback(() => {
    if (!user || loggingOut.current) return;
    lastActivityAt.current = Date.now();
    scheduleLogout();
  }, [scheduleLogout, user]);

  useEffect(() => {
    if (!user) {
      clearTimer();
      return;
    }
    lastActivityAt.current = Date.now();
    scheduleLogout();
    return clearTimer;
  }, [clearTimer, scheduleLogout, user]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (!user) return;
      if (nextState === "active") {
        if (Date.now() - lastActivityAt.current >= INACTIVITY_TIMEOUT_MS) {
          void logout();
        } else {
          scheduleLogout();
        }
      } else {
        scheduleLogout();
      }
    });
    return () => subscription.remove();
  }, [logout, scheduleLogout, user]);

  return <View className="flex-1" onTouchStart={recordActivity}>{children}</View>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SyncProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <InactivityGuard>
            <RouteGuard />
            <Stack screenOptions={{ headerShown: false }} />
          </InactivityGuard>
        </SafeAreaProvider>
      </SyncProvider>
    </AuthProvider>
  );
}
