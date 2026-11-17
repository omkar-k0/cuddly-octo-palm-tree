"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { onboarding, type Country } from "@/config/onboarding";
import { site } from "@/config/site";
import { parseApplication } from "@/lib/onboarding/schema";
import { cn } from "@/lib/utils";

type Values = {
  full_name: string;
  email: string;
  phone: string;
  bar_body: string;
  enrolment_number: string;
  enrolment_year: string;
  admission_date: string;
  areas: string[];
  jurisdictions: string[];
  languages: string[];
  consent: boolean;
};

const empty: Values = {
  full_name: "",
  email: "",
  phone: "",
  bar_body: "",
  enrolment_number: "",
  enrolment_year: "",
  admission_date: "",
  areas: [],
  jurisdictions: [],
  languages: [],
  consent: false,
};

const input =
  "h-11 w-full rounded-lg border border-foreground/15 bg-card px-3 text-sm focus:border-foreground/50 focus:outline-none aria-[invalid=true]:border-danger";

const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function JoinForm() {
  const [country, setCountry] = React.useState<Country>("IN");
  const [values, setValues] = React.useState<Values>(empty);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);
  const startedAt = React.useRef(0);
  const honeypot = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const cfg = onboarding[country];
  const de = country === "DE";
  // German terms in parentheses on the German form.
  const t = (en: string, german: string) => (de ? `${en} (${german})` : en);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  };

  function switchCountry(next: Country) {
    if (next === country) return;
    setCountry(next);
    setValues((v) => ({ ...v, bar_body: "", jurisdictions: [], languages: [], enrolment_number: "", enrolment_year: "", admission_date: "" }));
    setErrors({});
    setFormError(null);
  }

  function payload() {
    const common = {
      country,
      full_name: values.full_name,
      email: values.email,
      phone: values.phone,
      bar_body: values.bar_body,
      areas: values.areas,
      jurisdictions: values.jurisdictions,
      languages: values.languages,
      consent: values.consent,
    };
    return country === "IN"
      ? { ...common, enrolment_number: values.enrolment_number, enrolment_year: values.enrolment_year.trim() === "" ? undefined : Number(values.enrolment_year) }
      : { ...common, admission_date: values.admission_date };
  }

  function focusFirstError(fields: Record<string, string>) {
    requestAnimationFrame(() => {
      const first = Object.keys(fields)[0];
      const el = first ? (document.querySelector(`[data-field="${first}"]`) as HTMLElement | null) : null;
      el?.focus();
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const body = payload();
    const check = parseApplication(body);
    if (!check.ok) {
      setErrors(check.fields);
      setFormError("Please check the highlighted fields.");
      focusFirstError(check.fields);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/lawyers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          company_website: honeypot.current?.value ?? "",
          started_at: startedAt.current,
          sent_at: Date.now(),
        }),
      });
      if (res.status === 201) {
        setDone(check.data.email);
        window.scrollTo({ top: 0 });
        return;
      }
      const json = (await res.json().catch(() => null)) as { error?: string; fields?: Record<string, string> } | null;
      if (json?.fields) {
        setErrors(json.fields);
        focusFirstError(json.fields);
      }
      setFormError(json?.error ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-xl border border-verified/30 bg-card p-6">
        <p className="flex items-center gap-2 font-serif text-2xl">
          <CheckCircle2 className="size-6 text-verified" aria-hidden /> Thank you
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Thank you. If this is a new application, our team will review it and contact you at{" "}
          <strong className="text-foreground">{done}</strong>. We may ask you for your enrolment certificate by email. You do not need to
          apply again.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          If you do not hear from us, or something above is wrong, reply to our email rather than submitting a second application.
        </p>
      </div>
    );
  }

  const err = (key: string) =>
    errors[key] ? (
      <p id={`err-${key}`} className="text-xs text-danger">
        {errors[key]}
      </p>
    ) : null;
  const aria = (key: string) => ({ "data-field": key, "aria-invalid": !!errors[key], "aria-describedby": errors[key] ? `err-${key}` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <fieldset className="space-y-3">
        <legend className="text-sm">Where are you admitted?</legend>
        <div role="radiogroup" aria-label="Country" className="inline-flex rounded-full border border-foreground/15 p-1">
          {(Object.keys(onboarding) as Country[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={country === c}
              onClick={() => switchCountry(c)}
              className={cn(
                "rounded-full px-5 py-1.5 text-sm transition-colors",
                country === c ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {onboarding[c].label}
            </button>
          ))}
        </div>
      </fieldset>

      <section className="space-y-4">
        <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">About you</h2>
        <label className="block space-y-1.5">
          <span className="text-sm">{t("Full name", "Vollständiger Name")}</span>
          <input className={input} value={values.full_name} onChange={(e) => set("full_name", e.target.value)} autoComplete="name" maxLength={120} {...aria("full_name")} />
          {err("full_name")}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm">{t("Email", "E-Mail")}</span>
            <input type="email" className={input} value={values.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" maxLength={200} {...aria("email")} />
            {err("email")}
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm">{t("Phone", "Telefon")}</span>
            <input type="tel" className={input} value={values.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder={cfg.phoneHint} maxLength={30} {...aria("phone")} />
            {err("phone")}
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">{de ? "Admission (Zulassung)" : "Enrolment"}</h2>
        <label className="block space-y-1.5">
          <span className="text-sm">{cfg.bodyLabel}</span>
          <select className={input} value={values.bar_body} onChange={(e) => set("bar_body", e.target.value)} {...aria("bar_body")}>
            <option value="">Choose…</option>
            {cfg.bodies.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          {err("bar_body")}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {country === "IN" && cfg.enrolmentNumber && (
            <label className="block space-y-1.5">
              <span className="text-sm">{cfg.enrolmentNumber.label}</span>
              <input
                className={input}
                value={values.enrolment_number}
                onChange={(e) => set("enrolment_number", e.target.value)}
                placeholder={cfg.enrolmentNumber.placeholder}
                maxLength={40}
                autoComplete="off"
                {...aria("enrolment_number")}
              />
              <span className="block text-xs text-muted-foreground">{cfg.enrolmentNumber.hint}</span>
              {err("enrolment_number")}
            </label>
          )}
          {cfg.enrolmentDate.kind === "year" ? (
            <label className="block space-y-1.5">
              <span className="text-sm">{cfg.enrolmentDate.label}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1950}
                step={1}
                className={input}
                value={values.enrolment_year}
                onChange={(e) => set("enrolment_year", e.target.value)}
                placeholder="e.g. 2015"
                {...aria("enrolment_year")}
              />
              {err("enrolment_year")}
            </label>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-sm">{cfg.enrolmentDate.label}</span>
              <input type="date" min="1950-01-01" className={input} value={values.admission_date} onChange={(e) => set("admission_date", e.target.value)} {...aria("admission_date")} />
              <span className="block text-xs text-muted-foreground">{cfg.enrolmentDate.hint}</span>
              {err("admission_date")}
            </label>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">{de ? "Practice (Tätigkeit)" : "Practice"}</h2>
        <CheckGroup
          legend={t("Areas of law you can review", "Rechtsgebiete")}
          hint={de ? "German area names will follow; for now the areas are the ones our sources cover." : undefined}
          field="areas"
          options={cfg.areas.map((a) => ({ value: a.id, label: a.title }))}
          selected={values.areas}
          onToggle={(v) => set("areas", toggle(values.areas, v))}
          error={errors.areas}
        />
        <CheckGroup
          legend={`${cfg.jurisdictionLabel} (optional)`}
          field="jurisdictions"
          options={cfg.jurisdictions.map((j) => ({ value: j, label: j }))}
          selected={values.jurisdictions}
          onToggle={(v) => set("jurisdictions", toggle(values.jurisdictions, v))}
          error={errors.jurisdictions}
          scroll
        />
        <CheckGroup
          legend={t("Languages you work in", "Sprachen")}
          field="languages"
          options={cfg.languages.map((l) => ({ value: l, label: l }))}
          selected={values.languages}
          onToggle={(v) => set("languages", toggle(values.languages, v))}
          error={errors.languages}
        />
      </section>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company website
          <input ref={honeypot} name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(e) => set("consent", e.target.checked)}
            className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
            {...aria("consent")}
          />
          <span>
            I have read the{" "}
            <Link href="/privacy#reviewer-applicants" target="_blank" className="underline underline-offset-4">
              privacy notice for reviewer applicants
            </Link>{" "}
            and agree that {site.name} may process the details above to verify my professional standing.
          </span>
        </label>
        {err("consent")}
      </div>

      <p className="rounded-xl border border-foreground/15 p-4 text-sm leading-relaxed text-muted-foreground">
        Document upload will be added before applications open fully. We may ask you for your enrolment certificate by email.
      </p>

      {formError && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="h-12 rounded-full bg-accent px-8 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}

function CheckGroup({
  legend,
  hint,
  field,
  options,
  selected,
  onToggle,
  error,
  scroll,
}: {
  legend: string;
  hint?: string;
  field: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  error?: string;
  scroll?: boolean;
}) {
  return (
    <fieldset className="space-y-2" data-field={field} tabIndex={-1} aria-describedby={error ? `err-${field}` : undefined}>
      <legend className="text-sm">{legend}</legend>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div
        className={cn(
          "grid gap-x-4 gap-y-2 rounded-lg border bg-card p-3 text-sm sm:grid-cols-2",
          error ? "border-danger" : "border-foreground/15",
          scroll && "max-h-56 overflow-y-auto",
        )}
      >
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2.5">
            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} className="size-4 shrink-0 accent-[var(--accent)]" />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`err-${field}`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
