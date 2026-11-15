"use client";

import { useRouter } from "next/navigation";
import { QueryBox } from "@/components/query-box";
import { useQueryState } from "@/components/query-context";
import type { DomainId } from "@/config/domains";

/** The home-page query box. Hands the question to /ask in memory, not in the URL. */
export function HomeQuery() {
  const router = useRouter();
  const { submit, hint, setHint } = useQueryState();
  return (
    <QueryBox
      hint={hint}
      onHintChange={setHint}
      onSubmit={(query, h) => {
        submit({ query, hint: h });
        router.push("/ask");
      }}
    />
  );
}

/** "Ask about Employment" on a domain card: preselects the area, then opens /ask. */
export function DomainAskLink({ id, title }: { id: DomainId; title: string }) {
  const router = useRouter();
  const { setHint } = useQueryState();
  return (
    <button
      type="button"
      onClick={() => {
        setHint(id);
        router.push("/ask");
      }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
    >
      Ask about {title} <span aria-hidden>→</span>
    </button>
  );
}
