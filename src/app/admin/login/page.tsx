import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-5 py-20">
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-accent">( Lawyers only )</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight">Sign in to verify sources</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Accounts are issued by the site owner. Every decision you record is kept with your email and the exact text
        you reviewed.
      </p>
      <LoginForm />
    </div>
  );
}
