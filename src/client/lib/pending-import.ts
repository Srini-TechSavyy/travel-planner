const PENDING_KEY = "tripmate_pending_import";
const PENDING_DRAFT_ID_KEY = "tripmate_pending_draft_id";

export function stashPendingImport(draftTripId: string): void {
  sessionStorage.setItem(PENDING_DRAFT_ID_KEY, draftTripId);
  sessionStorage.setItem(PENDING_KEY, "1");
}

export function consumePendingImport(): string | null {
  const draftId = sessionStorage.getItem(PENDING_DRAFT_ID_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_DRAFT_ID_KEY);
  return draftId;
}

export function hasPendingImport(): boolean {
  return sessionStorage.getItem(PENDING_KEY) === "1";
}
