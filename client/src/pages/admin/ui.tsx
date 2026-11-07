import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function Panel({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="admin-panel rounded-2xl border border-blush-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="admin-panel-title">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="admin-field block text-sm text-ink-700">
      <span className="font-medium">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-ink-500">{hint}</span> : null}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ''}`} />;
}

export function Area(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field min-h-28 rounded-2xl ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field rounded-2xl bg-white ${props.className ?? ''}`} />;
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="admin-check flex min-h-11 items-center gap-3 text-sm text-ink-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p role="status" className="admin-notice text-sm text-magenta-700">{children}</p>;
}

export function PrimaryButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`btn-cart max-w-xs ${className}`}>
      {children}
    </button>
  );
}

export function PageHeader({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="admin-page-heading mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="workspace-eyebrow mb-2">Gestão da loja</p>
        <h1 className="admin-page-title">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink-500">{hint}</p>
      </div>
      {action}
    </div>
  );
}

export function ItemButton({
  selected,
  title,
  meta,
  onClick,
}: {
  selected: boolean;
  title: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`admin-item-button w-full rounded-xl border px-4 py-3 text-left transition ${selected ? 'border-blush-200 bg-blush-50 text-magenta-900' : 'border-transparent hover:border-blush-200 hover:bg-blush-50'}`}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="mt-1 block text-xs text-ink-500">{meta}</span>
    </button>
  );
}
