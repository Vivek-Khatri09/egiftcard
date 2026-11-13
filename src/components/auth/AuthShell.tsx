export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      <div className="card p-6 sm:p-8">{children}</div>
      {footer && <div className="mt-5 text-center text-sm text-ink-soft">{footer}</div>}
    </div>
  );
}
