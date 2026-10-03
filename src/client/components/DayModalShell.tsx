import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  titleId: string;
  subtitle?: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
};

export function DayModalShell({
  open,
  title,
  titleId,
  subtitle,
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
        className={`flex max-h-[min(90vh,44rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ${maxWidthClass}`}
      >
        <header className="shrink-0 border-b border-slate-100 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          {subtitle ? <div className="mt-0.5">{subtitle}</div> : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

type FormActionsProps = {
  saving: boolean;
  saveLabel: string;
  onCancel: () => void;
  sticky?: boolean;
};

export function DayModalFormActions({
  saving,
  saveLabel,
  onCancel,
  sticky = false,
}: FormActionsProps) {
  return (
    <div
      className={
        sticky
          ? "sticky bottom-0 -mx-5 flex flex-wrap gap-2 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur-sm"
          : "flex flex-wrap gap-2 border-t border-slate-100 pt-4"
      }
    >
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving…" : saveLabel}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary">
        Cancel
      </button>
    </div>
  );
}
