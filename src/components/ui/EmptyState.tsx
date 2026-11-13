export default function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-ink/20 bg-white/60 px-6 py-14 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
