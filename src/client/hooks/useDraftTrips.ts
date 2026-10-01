import { useCallback, useEffect, useState } from "react";
import type { DraftTripBundle } from "../../shared/types";
import { listDraftTrips } from "../lib/draft-trips";

export function useDraftTrips(): DraftTripBundle[] {
  const [drafts, setDrafts] = useState(listDraftTrips);

  const refresh = useCallback(() => {
    setDrafts(listDraftTrips());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tripmate_drafts_v1") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("tripmate-drafts-updated", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tripmate-drafts-updated", refresh);
    };
  }, [refresh]);

  return drafts;
}
