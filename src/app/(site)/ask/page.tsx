import type { Metadata } from "next";
import { AskClient } from "./ask-client";

export const metadata: Metadata = { title: "Ask a question" };

export default function AskPage() {
  return <AskClient />;
}
