import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X, CheckCircle2, AlertCircle, Info, XCircle, type LucideIcon } from 'lucide-react';
import { blobs } from '@/lib/db';

export const inputClass =
  'w-full rounded-xl border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm text-content transition-colors focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15';

const VARIANTS = {
  primary:
    'bg-accent-600 text-white shadow-sm hover:bg-accent-700 active:scale-[0.97]',
  secondary:
    'bg-surface-card text-content ring-1 ring-surface-border shadow-sm hover:bg-surface-hover hover:ring-surface-border active:scale-[0.97]',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-[0.97]',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.97]',
  ghost:
    'text-content-muted hover:bg-surface-hover active:scale-[0.97]',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-surface-card p-6 shadow-card ring-1 ring-surface-border transition-all duration-300 ${
        interactive ? 'hover:shadow-card-hover hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  desc,
  actions,
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-content md:text-3xl">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-content-faint">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-surface-card shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <h2 className="text-lg font-bold text-content">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-1.5 text-content-faint transition-colors hover:bg-surface-hover hover:text-content"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-surface-border px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border bg-surface-muted py-16 text-center animate-fade-in">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50 text-accent-400">
        <Icon size={28} />
      </div>
      <p className="text-base font-semibold text-content-muted">{title}</p>
      {desc && <p className="mt-1.5 max-w-sm text-sm text-content-faint">{desc}</p>}
    </div>
  );
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-surface-border ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-l from-accent-600 to-accent-400 transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'error' | 'accent';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-surface-hover text-content-muted ring-surface-border',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    warning: 'bg-amber-50 text-amber-700 ring-amber-100',
    error: 'bg-rose-50 text-rose-700 ring-rose-100',
    accent: 'bg-accent-50 text-accent-700 ring-accent-100',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<(type: ToastType, message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

const TOAST_ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};
const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-surface-card ring-emerald-100 dark:ring-emerald-900/40',
  error: 'bg-surface-card ring-rose-100 dark:ring-rose-900/40',
  info: 'bg-surface-card ring-accent-100 dark:ring-accent-900/40',
  warning: 'bg-surface-card ring-amber-100 dark:ring-amber-900/40',
};
const TOAST_ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  info: 'text-accent-500',
  warning: 'text-amber-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-content shadow-lg ring-1 animate-slide-down ${TOAST_STYLES[toast.type]}`}
            >
              <Icon size={18} className={TOAST_ICON_COLORS[toast.type]} />
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useBlobUrl(key: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!key) return;
    let active = true;
    let created: string | null = null;
    blobs.get(key).then((blob) => {
      if (!active || !blob) return;
      created = URL.createObjectURL(blob);
      setUrl(created);
    });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [key]);
  return url;
}

export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm text-content-muted">
      <span className="flex justify-between">
        {label}
        <span className="font-medium text-content-faint">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-accent-600"
      />
    </label>
  );
}

export function Thumb({ blobKey, className = '' }: { blobKey: string | null; className?: string }) {
  const url = useBlobUrl(blobKey);
  return url ? (
    <img src={url} alt="" className={`object-cover ${className}`} />
  ) : (
    <div className={`skeleton ${className}`} />
  );
}
