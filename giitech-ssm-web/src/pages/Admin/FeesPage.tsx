import React, { useEffect, useState } from "react";
import {
  fetchFees,
  addFee,
  deleteFee,
  updateFee,
} from "../../services/FeeService";
import { fetchClasses } from "../../services/ClassService";
import { fetchStreams } from "../../services/StreamService";
import { getDepartments } from "../../services/departmentService";

const FeesPage: React.FC = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // form states
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStream, setSelectedStream] = useState("none");

  const [editFeeId, setEditFeeId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 🔹 Load data (departments, classes, streams, fees)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [deptData, classData, streamData, feeData] = await Promise.all([
          getDepartments(),
          fetchClasses(),
          fetchStreams(),
          fetchFees(),
        ]);
        setDepartments(deptData);
        setClasses(classData);
        setStreams(streamData);
        setFees(feeData);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 🔹 Auto clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // 🔹 Filter classes by department
  const filteredClasses = selectedDepartment
    ? classes.filter((cls) => cls.departmentId === selectedDepartment)
    : classes;

  // 🔹 Add fee
  const handleAddFee = async () => {
    try {
      if (!name || !amount || !selectedClass)
        throw new Error("Please fill all required fields.");

      const streamValue = selectedStream === "none" ? undefined : selectedStream;

      await addFee(name, parseFloat(amount), selectedClass, streamValue);
      setSuccess("✅ Fee added successfully!");
      setName("");
      setAmount("");
      setSelectedClass("");
      setSelectedStream("none");

      const feeData = await fetchFees();
      setFees(feeData);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 🔹 Delete fee
  const handleDelete = async (feeId: string) => {
    if (!window.confirm("Delete this fee?")) return;
    try {
      await deleteFee(feeId);
      setFees((prev) => prev.filter((f) => f.feeId !== feeId));
      setSuccess("🗑️ Fee deleted successfully!");
    } catch (err: any) {
      setError("❌ Failed to delete fee.");
    }
  };

  // 🔹 Start edit
  const handleEdit = (fee: any) => {
    setEditFeeId(fee.feeId);
    setEditData({
      name: fee.name,
      amount: fee.amount,
      classId: fee.classId,
      streamId: fee.streamId || "none",
    });
  };

  // 🔹 Save edit
  const handleUpdate = async () => {
    if (!editFeeId) return;
    try {
      await updateFee(editFeeId, {
        name: editData.name,
        amount: parseFloat(editData.amount),
        classId: editData.classId,
        streamId: editData.streamId === "none" ? null : editData.streamId,
      });
      setSuccess("✅ Fee updated successfully!");
      setEditFeeId(null);
      const refreshed = await fetchFees();
      setFees(refreshed);
    } catch (err: any) {
      setError("❌ Failed to update fee.");
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-slate-700">Manage Fees</h1>

      {error && <p className="text-red-600 mb-3">{error}</p>}
      {success && <p className="text-green-600 mb-3">{success}</p>}

      {/* --- Add Fee Form --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">Add New Fee</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Fee Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border p-2 rounded"
          />

          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedClass("");
            }}
            className="border p-2 rounded"
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.departmentId || dept.id}>
                {dept.departmentId || dept.id} — {dept.name}
              </option>
            ))}
          </select>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select Class</option>
            {filteredClasses.map((cls) => (
              <option key={cls.classId} value={cls.classId}>
                {cls.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            className="border p-2 rounded col-span-2 md:col-span-1"
          >
            <option value="none">– (No Stream)</option>
            {streams.map((str) => (
              <option key={str.streamId} value={str.streamId}>
                {str.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAddFee}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Fee
        </button>
      </div>

      {/* --- Fees Table --- */}
      {loading ? (
        <p>Loading fees...</p>
      ) : (
        <table className="w-full bg-white shadow rounded">
          <thead className="bg-slate-100 text-slate-700 text-sm uppercase">
            <tr>
              <th className="p-2 border">Fee ID</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Class</th>
              <th className="p-2 border">Stream</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-3 text-center text-slate-500">
                  No fees found.
                </td>
              </tr>
            ) : (
              fees.map((fee) => (
                <tr key={fee.feeId} className="text-sm border-b hover:bg-slate-50">
                  {editFeeId === fee.feeId ? (
                    <>
                      <td className="p-2 border text-slate-500">{fee.feeId}</td>
                      <td className="p-2 border">
                        <input
                          value={editData.name}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={editData.amount}
                          onChange={(e) =>
                            setEditData({ ...editData, amount: e.target.value })
                          }
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="p-2 border">
                        <select
                          value={editData.classId}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              classId: e.target.value,
                            })
                          }
                          className="border p-1 rounded w-full"
                        >
                          {classes.map((cls) => (
                            <option key={cls.classId} value={cls.classId}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 border">
                        <select
                          value={editData.streamId}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              streamId: e.target.value,
                            })
                          }
                          className="border p-1 rounded w-full"
                        >
                          <option value="none">– (No Stream)</option>
                          {streams.map((str) => (
                            <option key={str.streamId} value={str.streamId}>
                              {str.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 border text-center">
                        <button
                          onClick={handleUpdate}
                          className="text-green-600 hover:text-green-800 mr-2"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditFeeId(null)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 border text-slate-500">{fee.feeId}</td>
                      <td className="p-2 border">{fee.name}</td>
                      <td className="p-2 border">{fee.amount}</td>
                      <td className="p-2 border">
                        {classes.find((cls) => cls.classId === fee.classId)?.name ||
                          "-"}
                      </td>
                      <td className="p-2 border">
                        {streams.find((s) => s.streamId === fee.streamId)?.name ||
                          "–"}
                      </td>
                      <td className="p-2 border text-center">
                        <button
                          onClick={() => handleEdit(fee)}
                          className="text-blue-500 hover:text-blue-700 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(fee.feeId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FeesPage;
