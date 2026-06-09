import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchParentData, type ParentData } from "../services/parentDetailService";

export function useParentData() {
  const { user } = useAuth();
  const [data, setData] = useState<ParentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      setData(await fetchParentData(user.uid));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load family records.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, load };
}
