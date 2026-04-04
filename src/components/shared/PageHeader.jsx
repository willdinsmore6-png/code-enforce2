export default function PageHeader({ title, description, actions }) {
  return (
    <header className="relative mb-8 rounded-2xl border border-border/70 bg-card/60 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm dark:bg-card/40 dark:ring-white/[0.06]">
      <div
        className="h-1 rounded-t-2xl bg-gradient-to-r from-primary/70 via-primary to-primary/50"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}