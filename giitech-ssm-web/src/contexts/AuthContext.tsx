// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  updateProfile,
  createUserWithEmailAndPassword,
  deleteUser as deleteAuthUser,
  getAuth as getAuthInstance,
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { auth, db, firebaseConfig } from "../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { idToEmail } from "../utils/idToEmail";
import { generateUserId } from "../utils/idGenerator";

interface AuthContextType {
  user: User | null;
  role: string | null;
  displayName: string | null;
  loading: boolean;
  login: (id: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (
    id: string,
    password: string,
    role: string,
    displayName: string,
    extraData?: Record<string, any> // 🆕 new optional parameter
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
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
            setDisplayName(
              (data.displayName as string) ||
                firebaseUser.displayName ||
                null
            );
          } else {
            setRole(null);
            setDisplayName(firebaseUser.displayName || null);
          }
        } catch (err) {
          console.warn("Failed to load user doc:", err);
          setRole(null);
          setDisplayName(firebaseUser.displayName || null);
        }
      } else {
        setRole(null);
        setDisplayName(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (id: string, password: string) => {
    const email = idToEmail(id);
    await signInWithEmailAndPassword(auth, email, password);
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
    extraData: Record<string, any> = {} // 🆕 optional extras
  ) => {
    if (!displayNameParam?.trim()) {
      throw new Error("Display name is required.");
    }

    // Ensure unique ID or auto-generate
    let finalId = id;
    if (!id || id.trim() === "") {
      finalId = await generateUserId(roleName);
    } else {
      const q = query(collection(db, "users"), where("id", "==", id));
      const existing = await getDocs(q);
      if (!existing.empty) {
        throw new Error(`User ID "${id}" already exists.`);
      }
    }

    const email = idToEmail(finalId);
    const secondaryAppName = `secondary-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuthInstance(secondaryApp);

    let createdUser: User | null = null;

    try {
      // 1️⃣ Create Firebase Auth user
      const uc = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      createdUser = uc.user;

      // 2️⃣ Add to main users collection
      await setDoc(doc(db, "users", createdUser.uid), {
        uid: createdUser.uid,
        id: finalId,
        role: roleName,
        email,
        displayName: displayNameParam,
        createdAt: serverTimestamp(),
        ...extraData, // 🆕 add dropdown data (class, stream, subject, etc.)
      });

      // 3️⃣ Role-specific collections
      const baseProfile = {
        userId: createdUser.uid,
        displayName: displayNameParam,
        email,
        createdAt: serverTimestamp(),
      };

      const role = roleName.toLowerCase();

      if (role === "student") {
        await setDoc(doc(db, "students", finalId), {
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
        await setDoc(doc(db, "teachers", finalId), {
          ...baseProfile,
          teacherId: finalId,
          department: extraData.department || "",
          subject: extraData.subject || "",
        });
      } else if (role === "admin") {
        await setDoc(doc(db, "admins", finalId), {
          ...baseProfile,
          adminId: finalId,
        });
      } else if (role === "parent") {
        await setDoc(doc(db, "parents", finalId), {
          ...baseProfile,
          parentId: finalId,
          studentIds: extraData.studentIds || [],
        });
      }

      // 4️⃣ Sync displayName in Auth
      try {
        await updateProfile(createdUser, { displayName: displayNameParam });
      } catch (uErr) {
        console.warn("Failed to update displayName:", uErr);
      }
    } catch (err: any) {
      if (createdUser) {
        try {
          await deleteAuthUser(createdUser);
        } catch (delErr) {
          console.warn("Failed to delete orphaned Auth user:", delErr);
        }
      }
      throw err;
    } finally {
      try {
        await secondaryAuth.signOut();
      } catch (_) {}
      try {
        await deleteApp(secondaryApp);
      } catch (_) {}
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({ user, role, displayName, loading, login, logout, signup }),
    [user, role, displayName, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};