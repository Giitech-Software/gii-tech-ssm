import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchMessageInbox, type MessageInbox } from "../services/messagingService";

export function useMessageInbox() {
  const { user } = useAuth();
  const [inbox, setInbox] = useState<MessageInbox | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    setError("");
    try {
      setInbox(await fetchMessageInbox(user.uid, user.email));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { inbox, loading, error, load };
}
