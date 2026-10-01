type Props = {
  message: string;
  onDismiss: () => void;
};

export function Toast({ message, onDismiss }: Props) {
  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-teal-200 bg-white px-4 py-3 shadow-lg sm:left-auto sm:right-6"
      role="status"
    >
      <p className="text-sm font-medium text-slate-800">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-sm text-teal-700 hover:underline"
      >
        OK
      </button>
    </div>
  );
}
