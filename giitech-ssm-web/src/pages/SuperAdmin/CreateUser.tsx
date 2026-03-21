import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { generateUserId } from "../../utils/idGenerator";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";

interface ClassItem {
  id: string;
  name: string;
}

interface StreamItem {
  id: string;
  name: string;
}

interface SubjectItem {
  id: string;
  title: string;
}

export default function Signup() {
  const { signup, role: currentRole } = useAuth();

  // Base fields
  const [id, setId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");

  // Dynamic selections
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // Firestore data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // UI states
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔄 Load dropdown data dynamically
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        // Fetch classes
        const classSnap = await getDocs(collection(db, "classes"));
        const classList = classSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.data().title || doc.id, // fallback
        }));
        setClasses(classList);

        // Fetch streams
        const streamSnap = await getDocs(collection(db, "streams"));
        const streamList = streamSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.id,
        }));
        setStreams(streamList);

        // Fetch subjects
        const subjectSnap = await getDocs(collection(db, "subjects"));
        const subjectList = subjectSnap.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().name || doc.data().title || doc.id,
        }));
        setSubjects(subjectList);
      } catch (err) {
        console.error("Error loading dropdowns:", err);
      }
    };

    fetchDropdownData();
  }, []);

  // 🧩 Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentRole !== "superadmin") {
      setError("Only Super Admins can create accounts.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const finalId = id.trim() === "" ? await generateUserId(role) : id.trim();

      const extraData: Record<string, any> = {};
      if (role === "student") {
        extraData.classId = selectedClass || "";
        extraData.stream = selectedStream || "";
      } else if (role === "teacher") {
        extraData.subjectId = selectedSubject || "";
      }

      await signup(finalId, password, role, displayName.trim(), extraData);
      setMessage(`✅ ${role} account created successfully! User ID: ${finalId}`);

      // reset form
      setId("");
      setDisplayName("");
      setPassword("");
      setRole("student");
      setSelectedClass("");
      setSelectedStream("");
      setSelectedSubject("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-8 border border-gray-100">
        <h1 className="text-2xl font-bold text-primary text-center mb-6">
          Create New User
        </h1>

        {error && <div className="mb-4 text-red-600 text-sm font-medium">{error}</div>}
        {message && <div className="mb-4 text-green-600 text-sm font-medium">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ID */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1">User ID</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="Leave blank to auto-generate"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Full Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="e.g. John Doe"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Dynamic Fields */}
          {role === "student" && (
            <>
              {/* Class */}
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none"
                >
                  <option value="">Select Class</option>
                  {classes.length > 0 ? (
                    classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No classes found</option>
                  )}
                </select>
              </div>

              {/* Stream */}
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Stream</label>
                <select
                  value={selectedStream}
                  onChange={(e) => setSelectedStream(e.target.value)}
                  className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none"
                >
                  <option value="">Select Stream</option>
                  {streams.length > 0 ? (
                    streams.map((str) => (
                      <option key={str.id} value={str.id}>
                        {str.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No streams found</option>
                  )}
                </select>
              </div>
            </>
          )}

          {role === "teacher" && (
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none"
              >
                <option value="">Select Subject</option>
                {subjects.length > 0 ? (
                  subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.title}
                    </option>
                  ))
                ) : (
                  <option disabled>No subjects found</option>
                )}
              </select>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary text-dark py-2 rounded-md font-semibold hover:bg-accent2 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
