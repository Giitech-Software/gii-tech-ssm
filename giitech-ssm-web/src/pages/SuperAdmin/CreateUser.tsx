import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { TENANT_ID } from "../../config/tenant";
import { Eye, EyeOff } from "lucide-react";

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
interface DepartmentItem { id: string; name: string; }

export default function Signup() {
  const { signup, role: currentRole } = useAuth();

  // Base fields
  const [id, setId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");

  // Dynamic selections
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // Firestore data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  // UI states
  const [message, setMessage] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 🔄 Load dropdown data dynamically
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        // Fetch classes
        const classSnap = await getDocs(query(collection(db, "classes"), where("tenantId", "==", TENANT_ID)));
        const classList = classSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.data().title || doc.id, // fallback
        }));
        setClasses(classList);

        // Fetch streams
        const streamSnap = await getDocs(query(collection(db, "streams"), where("tenantId", "==", TENANT_ID)));
        const streamList = streamSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.id,
        }));
        setStreams(streamList);

        // Fetch subjects
        const subjectSnap = await getDocs(query(collection(db, "subjects"), where("tenantId", "==", TENANT_ID)));
        const subjectList = subjectSnap.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().name || doc.data().title || doc.id,
        }));
        setSubjects(subjectList);
        const departmentSnap = await getDocs(query(collection(db, "departments"), where("tenantId", "==", TENANT_ID)));
        setDepartments(departmentSnap.docs.map((item) => ({ id: item.id, name: item.data().name || item.id })));
      } catch (err) {
        console.error("Error loading dropdowns:", err);
      }
    };

    fetchDropdownData();
  }, []);

  // 🧩 Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentRole !== "superadmin" && !(currentRole === "admin" && role === "student")) {
      setError("Administrators can create staff accounts. Super Admin access is required for other account types.");
      return;
    }

    setError("");
    setMessage("");
    setCreatedId("");
    setLoading(true);

    try {
      const extraData: Record<string, any> = {};
      if (role === "student") {
        extraData.classId = selectedClass || "";
        extraData.stream = selectedStream || "";
        extraData.departmentId = selectedDepartment || "";
      } else if (role === "teacher") {
        extraData.subjectId = selectedSubject || "";
        extraData.departmentId = selectedDepartment || "";
      } else if (role === "staff") {
        extraData.departmentId = selectedDepartment || "";
      }
      if (role === "teacher" || role === "staff") extraData.phone = phone.trim();

      const finalId = await signup(id.trim(), password, role, displayName.trim(), extraData);
      setCreatedId(finalId);
      setMessage(`${role} account created successfully.`);

      // reset form
      setId("");
      setDisplayName("");
      setPhone("");
      setPassword("");
      setRole("student");
      setSelectedClass("");
      setSelectedStream("");
      setSelectedSubject("");
      setSelectedDepartment("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-blue-50 via-white to-sky-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-900/10">
        <h1 className="text-2xl font-bold text-primary text-center mb-6">
          {role === "student" ? "Create Student" : role === "staff" ? "Create Staff" : "Create New User"}
        </h1>

        {error && <div className="mb-4 text-red-600 text-sm font-medium">{error}</div>}
        {message && (
          <div className="mb-4 border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="font-medium">{message}</p>
            <p className="mt-1">
              User ID: <strong className="text-base">{createdId}</strong>
            </p>
          </div>
        )}

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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-neutral px-3 py-2 pr-11 focus:border-primary focus:outline-none"
                placeholder="Enter password"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-primary"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {(role === "teacher" || role === "staff") && <div>
            <label className="block text-sm font-medium text-dark mb-1">Phone number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required={role === "staff"} className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none" placeholder="e.g. 024 000 0000" />
            {role === "staff" && <p className="mt-1 text-xs text-slate-500">Used for bulk SMS and WhatsApp communication.</p>}
          </div>}

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="student">Student</option>
              {currentRole === "superadmin" && <><option value="parent">Parent</option><option value="teacher">Teacher</option><option value="admin">Admin</option><option value="staff">Non-Teaching Staff</option></>}
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

              {/* Department / school section */}
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none"
                >
                  <option value="">Select Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {role === "teacher" && (
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Subject</label>
              <input list="teacher-subject-options" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} placeholder="Enter primary subject" className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none" />
              <datalist id="teacher-subject-options">{subjects.map((sub) => <option key={sub.id} value={sub.title} />)}</datalist>
            </div>
          )}

          {(role === "teacher" || role === "staff") && (
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Department</label>
              <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-full rounded-md border border-neutral px-3 py-2 focus:border-primary focus:outline-none">
                <option value="">Select Department</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
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
