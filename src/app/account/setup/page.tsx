import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SetupForm } from "@/components/team/setup-form";

export const metadata: Metadata = { title: "Set your password" };

export default function SetupPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-5 py-20">
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-accent">( Welcome )</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight">Set your password</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-muted-foreground">Loading…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Body({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";

  if (!value) {
    return (
      <div className="mt-6 space-y-4">
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          This link is invalid or has expired. Ask your team for a new one.
        </p>
        <Link href="/admin/login" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Already set up? Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Choose a password for your account. Use at least 12 characters; a passphrase of several words is easy to remember and hard to guess.
      </p>
      <SetupForm token={value} />
    </>
  );
}
