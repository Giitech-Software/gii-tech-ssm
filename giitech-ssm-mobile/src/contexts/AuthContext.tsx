import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { idToEmail } from "../utils/idToEmail";
import { resetTenantId, setTenantId } from "../config/tenant";

type AuthContextValue = {
  user: User | null;
  role: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantCode: string | null;
  tenantLogoUrl: string | null;
  displayName: string | null;
  loading: boolean;
  login: (id: string, password: string) => Promise<string>;
  resetPassword: (id: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [tenantId, setTenantIdState] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantCode, setTenantCode] = useState<string | null>(null);
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);

        if (!firebaseUser) {
          setRole(null);
          setTenantIdState(null);
          setTenantName(null); setTenantCode(null); setTenantLogoUrl(null);
          resetTenantId();
          setDisplayName(null);
          setLoading(false);
          return;
        }

        try {
          const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
          const profile = snapshot.data();
          setRole(typeof profile?.role === "string" ? profile.role : null);
          setTenantIdState(typeof profile?.tenantId === "string" ? profile.tenantId : null);
          setTenantId(profile?.tenantId);
          const tenantSnapshot = profile?.tenantId ? await getDoc(doc(db, "tenants", String(profile.tenantId))) : null;
          const tenant = tenantSnapshot?.data();
          setTenantName(typeof tenant?.schoolName === "string" ? tenant.schoolName : null);
          setTenantCode(typeof tenant?.schoolCode === "string" ? tenant.schoolCode : String(profile?.tenantId || ""));
          setTenantLogoUrl(typeof tenant?.logoUrl === "string" ? tenant.logoUrl : null);
          setDisplayName(
            typeof profile?.displayName === "string"
              ? profile.displayName
              : firebaseUser.displayName
          );
        } catch (error) {
          console.warn("Unable to load the signed-in user profile:", error);
          // Keep Firebase authentication active when a tenant/profile read is
          // temporarily denied or unavailable. The user should see an error,
          // not be redirected to login as though they signed out.
          setDisplayName(firebaseUser.displayName);
        } finally {
          setLoading(false);
        }
      }),
    []
  );

  const value = useMemo(
    () => ({
      user,
      role,
      tenantId,
      tenantName,
      tenantCode,
      tenantLogoUrl,
      displayName,
      loading,
      login: async (id: string, password: string) => {
        let credentials;
        try {
          credentials = await signInWithEmailAndPassword(auth, idToEmail(id), password);
        } catch (error) {
          const code = String((error as { code?: string })?.code || "");
          if (code === "auth/network-request-failed") throw new Error("No internet connection. Check your network and try again.");
          if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") throw new Error("Incorrect school ID or password.");
          throw error;
        }
        const profile = (await getDoc(doc(db, "users", credentials.user.uid))).data();
        if (profile?.status === "disabled" || profile?.status === "pending" || profile?.locked === true) {
          await signOut(auth);
          throw new Error(profile?.status === "pending" ? "This account is awaiting administrator approval." : "This account is currently disabled. Contact your administrator.");
        }
        return typeof profile?.role === "string" ? profile.role : "";
      },
      resetPassword: async (id: string) => {
        const normalized = id.trim();
        await sendPasswordResetEmail(auth, normalized.includes("@") ? normalized.toLowerCase() : idToEmail(normalized));
      },
      logout: () => signOut(auth),
    }),
    [displayName, loading, role, tenantId, tenantName, tenantCode, tenantLogoUrl, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
