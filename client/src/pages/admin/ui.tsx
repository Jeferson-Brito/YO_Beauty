import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function Panel({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-blush-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-magenta-700 sm:text-3xl">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-ink-700">
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
    <label className="flex items-center gap-2 text-sm text-ink-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="text-sm text-magenta-700">{children}</p>;
}

export function PrimaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className="btn-cart max-w-xs">
      {children}
    </button>
  );
}

export function PageHeader({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-4xl text-magenta-700">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">{hint}</p>
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
      className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${selected ? 'border-magenta-600 bg-magenta-600 text-white' : 'border-transparent hover:border-blush-200 hover:bg-blush-50'}`}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className={`mt-0.5 block text-xs ${selected ? 'text-white/80' : 'text-ink-500'}`}>{meta}</span>
    </button>
  );
}
