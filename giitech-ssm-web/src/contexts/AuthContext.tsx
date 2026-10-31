// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { app, auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import { idToEmail } from "../utils/idToEmail";
import { getFunctions, httpsCallable } from "firebase/functions";
import { resetTenantId, setTenantId as setTenantScopeId } from "../config/tenant";

interface AuthContextType {
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
  signup: (
    id: string,
    password: string,
    role: string,
    displayName: string,
    extraData?: Record<string, any> // ðŸ†• new optional parameter
  ) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantCode, setTenantCode] = useState<string | null>(null);
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Record<string, any>;
            setRole((data.role as string) || null);
            setTenantId((data.tenantId as string) || null);
            setTenantScopeId(data.tenantId);
            const tenantSnapshot = data.tenantId ? await getDoc(doc(db, "tenants", String(data.tenantId))) : null;
            const tenant = tenantSnapshot?.data();
            setTenantName(typeof tenant?.schoolName === "string" ? tenant.schoolName : null);
            setTenantCode(typeof tenant?.schoolCode === "string" ? tenant.schoolCode : String(data.tenantId || ""));
            setTenantLogoUrl(typeof tenant?.logoUrl === "string" ? tenant.logoUrl : null);
            setDisplayName(
              (data.displayName as string) ||
                firebaseUser.displayName ||
                null
            );
          } else {
            setRole(null);
            setTenantId(null);
            resetTenantId();
            setTenantName(null); setTenantCode(null); setTenantLogoUrl(null);
            setDisplayName(firebaseUser.displayName || null);
          }
        } catch (err) {
          console.warn("Failed to load user doc:", err);
          // Keep the authenticated session and role when a tenant read is
          // temporarily unavailable. A branding error must not look like logout.
          setDisplayName(firebaseUser.displayName || null);
        }
      } else {
        setRole(null);
        setTenantId(null);
        resetTenantId();
        setTenantName(null); setTenantCode(null); setTenantLogoUrl(null);
        setDisplayName(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (id: string, password: string) => {
    const email = idToEmail(id);
    let credentials;
    try {
      credentials = await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const code = String((error as { code?: string })?.code || "");
      if (code === "auth/network-request-failed") throw new Error("No internet connection. Check your network and try again.");
      if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") throw new Error("Incorrect school ID or password.");
      throw error;
    }
    const profile = await getDoc(doc(db, "users", credentials.user.uid));
    const data = profile.data() as Record<string, any> | undefined;
    if (data?.status === "disabled" || data?.status === "pending" || data?.locked === true) {
      await signOut(auth);
      throw new Error(data?.status === "pending" ? "This account is awaiting administrator approval." : "This account is currently disabled. Contact your administrator.");
    }
    return String(data?.role || "");
  };

  const resetPassword = async (id: string) => {
    const normalizedId = id.trim();
    if (!normalizedId) throw new Error("Enter your school ID or email first.");
    const requestReset = httpsCallable<{ identifier: string }, { status: string }>(getFunctions(app, "africa-south1"), "requestPasswordReset");
    await requestReset({ identifier: normalizedId });
  };

  /**
   * signup: create a new user account (SuperAdmin/Admin action).
   *
   * Supports dropdown-based extraData for Firestore (classId, stream, subject, etc.)
   */
  const signup = async (
    id: string,
    password: string,
    roleName: string,
    displayNameParam: string,
    extraData: Record<string, any> = {} // ðŸ†• optional extras
  ) => {
    if (!displayNameParam?.trim()) {
      throw new Error("Display name is required.");
    }

    // All administrator-created accounts now go through the trusted backend.
    // Keep the old implementation below temporarily for rollback/reference; this
    // return makes the client-side Auth creation path unreachable.
    const managed = httpsCallable<{ id?: string; password: string; role: string; displayName: string; extra?: Record<string, any> }, { id: string }>(
      getFunctions(undefined, "africa-south1"),
      "createManagedUser",
    );
    const result = await managed({
      id: id.trim() || undefined,
      password,
      role: roleName,
      displayName: displayNameParam.trim(),
      extra: {
        ...extraData,
        streamId: extraData.streamId || extraData.stream || "",
        departmentId: extraData.departmentId || extraData.department || "",
        subject: extraData.subject || extraData.subjectId || "",
      },
    });
    return result.data.id;

    /* Legacy client-side provisioning retained below for rollback reference.
    // Ensure unique ID or auto-generate
    let finalId = id;
    try {
      if (!id || id.trim() === "") {
        finalId = await generateUserId(roleName);
      } else {
        const q = query(collection(db, "users"), where("id", "==", id));
        const existing = await getDocs(q);
        if (!existing.empty) {
          throw new Error(`User ID "${id}" already exists.`);
        }
      }
    } catch (error) {
      throw signupError(error, id.trim() ? "checking the user ID" : "generating the user ID");
    }

    const email = idToEmail(finalId);
    const secondaryAppName = `secondary-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuthInstance(secondaryApp);

    let createdUser: User | null = null;
    let signupStep = "creating the authentication account";

    try {
      // 1ï¸âƒ£ Create Firebase Auth user
      const uc = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      createdUser = uc.user;

      // 2ï¸âƒ£ Add the user and role profile atomically
      signupStep = "saving the user profile";
      const batch = writeBatch(db);
      batch.set(doc(db, "users", createdUser.uid), {
        uid: createdUser.uid,
        id: finalId,
        role: roleName,
        email,
        displayName: displayNameParam,
        createdAt: serverTimestamp(),
        status: "active",
        tenantId: TENANT_ID,
        ...extraData, // ðŸ†• add dropdown data (class, stream, subject, etc.)
      });

      // 3ï¸âƒ£ Role-specific collections
      const baseProfile = {
        userId: createdUser.uid,
        tenantId: TENANT_ID,
        displayName: displayNameParam,
        email,
        createdAt: serverTimestamp(),
      };

      const role = roleName.toLowerCase();

      if (role === "student") {
        batch.set(doc(db, "students", finalId), {
          ...baseProfile,
          studentId: finalId,
          classId: extraData.classId || "",
          stream: extraData.stream || "",
          department: extraData.department || "",
          dob: extraData.dob || "",
          gender: extraData.gender || "",
          admissionDate: extraData.admissionDate || "",
          parentId: extraData.parentId || "",
        });
      } else if (role === "teacher") {
        batch.set(doc(db, "teachers", finalId), {
          ...baseProfile,
          teacherId: finalId,
          department: extraData.department || "",
          subject: extraData.subject || "",
        });
      } else if (role === "admin") {
        batch.set(doc(db, "admins", finalId), {
          ...baseProfile,
          adminId: finalId,
        });
      } else if (role === "parent") {
        batch.set(doc(db, "parents", finalId), {
          ...baseProfile,
          parentId: finalId,
          studentIds: extraData.studentIds || [],
        });
      } else if (role === "staff") {
        batch.set(doc(db, "staff", finalId), {
          ...baseProfile,
          staffId: finalId,
          department: extraData.department || "",
        });
      }

      await batch.commit();

      // 3ï¸âƒ£ Sync displayName in Auth
      try {
        await updateProfile(createdUser, { displayName: displayNameParam });
      } catch (uErr) {
        console.warn("Failed to update displayName:", uErr);
      }

      return finalId;
    } catch (err: any) {
      if (createdUser) {
        try {
          await deleteAuthUser(createdUser);
        } catch (delErr) {
          console.warn("Failed to delete orphaned Auth user:", delErr);
        }
      }
      throw signupError(err, signupStep);
    } finally {
      try {
        await secondaryAuth.signOut();
      } catch (_) {}
      try {
        await deleteApp(secondaryApp);
      } catch (_) {}
    }
    */
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    if (!user) return;

    const timeoutMs = 3 * 60 * 1000;
    let lastActivityAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let loggingOut = false;

    const clearTimer = () => {
      if (timer) clearTimeout(timer);
    };

    const scheduleLogout = () => {
      clearTimer();
      timer = setTimeout(() => {
        if (Date.now() - lastActivityAt >= timeoutMs && !loggingOut) {
          loggingOut = true;
          void logout().finally(() => { loggingOut = false; });
        } else {
          scheduleLogout();
        }
      }, Math.max(0, timeoutMs - (Date.now() - lastActivityAt)));
    };

    const recordActivity = () => {
      if (loggingOut) return;
      lastActivityAt = Date.now();
      scheduleLogout();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastActivityAt >= timeoutMs) void logout();
        else scheduleLogout();
      }
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll", "pointermove"] as const;
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibility);
    scheduleLogout();

    return () => {
      clearTimer();
      events.forEach((event) => window.removeEventListener(event, recordActivity));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user]);

  const value = useMemo(
    () => ({ user, role, tenantId, tenantName, tenantCode, tenantLogoUrl, displayName, loading, login, resetPassword, logout, signup }),
    [user, role, tenantId, tenantName, tenantCode, tenantLogoUrl, displayName, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

