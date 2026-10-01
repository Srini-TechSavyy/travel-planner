export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <div
        className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
