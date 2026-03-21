import { useEffect, useState } from "react";
import { fetchStreams, addStream, deleteStream } from "../../services/StreamService";
import { fetchClasses } from "../../services/ClassService"; // ✅ link to classes
import { PlusCircle, Trash2, Loader2 } from "lucide-react";

export default function StreamPage() {
  const [streams, setStreams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [newStream, setNewStream] = useState({ name: "", classId: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // --- Load Streams and Classes ---
  const loadStreams = async () => {
    setLoading(true);
    try {
      const [streamsData, classesData] = await Promise.all([
        fetchStreams(),
        fetchClasses(),
      ]);
      setStreams(streamsData);
      setClasses(classesData);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to load streams or classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStreams();
  }, []);

  // --- Add Stream ---
  const handleAddStream = async () => {
    if (!newStream.name.trim() || !newStream.classId.trim()) {
      setMessage("⚠️ Please select both Stream Name and Class");
      return;
    }

    try {
      setLoading(true);
      await addStream(newStream.name, newStream.classId);
      setNewStream({ name: "", classId: "" });
      setMessage("✅ Stream added successfully!");
      await loadStreams();
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to add stream");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // --- Delete Stream ---
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this stream?")) return;
    try {
      await deleteStream(id);
      setStreams(streams.filter((s) => s.id !== id));
      setMessage("🗑️ Stream deleted");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to delete stream");
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-700">Manage Streams</h1>

      {message && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">{message}</div>
      )}

      {/* --- Add Stream Form --- */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Stream Name"
          value={newStream.name}
          onChange={(e) => setNewStream({ ...newStream, name: e.target.value })}
          className="border p-2 rounded flex-1 min-w-[200px]"
        />

        <select
          value={newStream.classId}
          onChange={(e) => setNewStream({ ...newStream, classId: e.target.value })}
          className="border p-2 rounded flex-1 min-w-[200px]"
        >
          <option value="">Select Class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.classId}>
              {cls.classId} — {cls.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleAddStream}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
          disabled={loading}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
          Add Stream
        </button>
      </div>

      {/* --- Table --- */}
      {loading ? (
        <p className="text-gray-500">Loading streams...</p>
      ) : (
        <table className="w-full bg-white shadow rounded">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-3 text-left">Stream ID</th>
              <th className="p-3 text-left">Stream Name</th>
              <th className="p-3 text-left">Class</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {streams.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No streams found.
                </td>
              </tr>
            ) : (
              streams.map((stream) => {
                const relatedClass = classes.find(
                  (cls) => cls.classId === stream.classId
                );
                return (
                  <tr key={stream.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-500">{stream.streamId || stream.id}</td>
                    <td className="p-3">{stream.name}</td>
                    <td className="p-3">
                      {relatedClass
                        ? `${relatedClass.classId} — ${relatedClass.name}`
                        : stream.classId || "—"}
                    </td>
                    <td className="p-3">
                      {stream.createdAt?.toDate
                        ? stream.createdAt.toDate().toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDelete(stream.id)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
