import * as React from "react";

/** Long-form legal page layout. */
export function ProsePage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-14 sm:px-8">
      <p className="mb-5 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-accent">( {eyebrow} )</p>
      <h1 className="font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">{title}</h1>
      {updated && <p className="mt-4 text-sm text-muted-foreground">Last updated {updated}</p>}
      <div className="mt-10 space-y-5 leading-relaxed [&_h2]:mt-12 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:leading-snug [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2 [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-semibold [&_p]:text-foreground/85 [&_li]:text-foreground/85">
        {children}
      </div>
    </div>
  );
}

export function DraftNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger">{children}</p>
  );
}
