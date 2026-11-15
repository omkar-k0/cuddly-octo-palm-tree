import { gating } from "@/config/gating";
import { LocalFileRetriever } from "./local";
import type { Retriever } from "./types";

export * from "./types";

let retriever: Retriever | undefined;

/** The retriever used by the pipeline. Swap the implementation here. */
export function getRetriever(): Retriever {
  retriever ??= new LocalFileRetriever(process.cwd(), gating.minRetrievalScore);
  return retriever;
}
