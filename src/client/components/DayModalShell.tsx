import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  titleId: string;
  children: ReactNode;
  maxWidthClass?: string;
};

export function DayModalShell({
  open,
  title,
  titleId,
  children,
  maxWidthClass = "max-w-4xl",
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidthClass} overflow-y-auto rounded-2xl bg-white p-6 shadow-xl`}
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

type FormActionsProps = {
  saving: boolean;
  saveLabel: string;
  onCancel: () => void;
};

export function DayModalFormActions({
  saving,
  saveLabel,
  onCancel,
}: FormActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving…" : saveLabel}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary">
        Cancel
      </button>
    </div>
  );
}
