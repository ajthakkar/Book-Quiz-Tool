import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import QuizApp from "@/components/QuizApp";
import type { BankFile } from "@/lib/types";

/** Read every validated bank at build time. The page ships as static HTML with the questions inside. */
function loadBanks(): BankFile[] {
  const dir = path.join(process.cwd(), "data", "bank");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as BankFile)
    .sort((a, b) => a.book.grades[0] - b.book.grades[0] || a.book.title.localeCompare(b.book.title));
}

export default function Page() {
  return <QuizApp banks={loadBanks()} />;
}
