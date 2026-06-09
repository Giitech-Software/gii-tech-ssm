import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { CommunicationResult } from "../services/communicationService";

export function useCommunicationData<T>(
  fetchData: (userId: string, role: string) => Promise<CommunicationResult<T>>,
  fallbackMessage: string
) {
  const { user, role } = useAuth();
  const [result, setResult] = useState<CommunicationResult<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user || !role) return;
    setLoading(true);
    setError("");
    try {
      setResult(await fetchData(user.uid, role));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : fallbackMessage);
    } finally {
      setLoading(false);
    }
  }, [fallbackMessage, fetchData, role, user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { result, loading, error, load };
}
