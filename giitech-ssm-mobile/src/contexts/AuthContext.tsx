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
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { idToEmail } from "../utils/idToEmail";

type AuthContextValue = {
  user: User | null;
  role: string | null;
  displayName: string | null;
  loading: boolean;
  login: (id: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);

        if (!firebaseUser) {
          setRole(null);
          setDisplayName(null);
          setLoading(false);
          return;
        }

        try {
          const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
          const profile = snapshot.data();
          setRole(typeof profile?.role === "string" ? profile.role : null);
          setDisplayName(
            typeof profile?.displayName === "string"
              ? profile.displayName
              : firebaseUser.displayName
          );
        } catch (error) {
          console.warn("Unable to load the signed-in user profile:", error);
          setRole(null);
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
      displayName,
      loading,
      login: async (id: string, password: string) => {
        await signInWithEmailAndPassword(auth, idToEmail(id), password);
      },
      logout: () => signOut(auth),
    }),
    [displayName, loading, role, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
