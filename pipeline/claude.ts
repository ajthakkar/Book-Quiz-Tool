/* One place that calls the Claude API, so every script uses the same model and settings.
   Needs ANTHROPIC_API_KEY (or an `ant auth login` profile). */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export type Usage = { input: number; output: number; cacheRead: number };
export const usage: Usage = { input: 0, output: 0, cacheRead: 0 };

/**
 * Ask for JSON that matches `schema`. Large shared context (a chapter, a book) goes in
 * `context` and is cached, so several requests about the same chapter don't pay for it twice.
 */
export async function ask<T extends z.ZodType>(opts: {
  system: string;
  context?: string;
  prompt: string;
  schema: T;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<T>> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (opts.context) content.push({ type: "text", text: opts.context, cache_control: { type: "ephemeral" } });
  content.push({ type: "text", text: opts.prompt });

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    // If a safety classifier declines, the API retries on a fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? "high", format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content }],
  });

  usage.input += response.usage.input_tokens;
  usage.output += response.usage.output_tokens;
  usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;

  if (response.stop_reason === "refusal") throw new Error("The model declined this request.");
  if (response.stop_reason === "max_tokens") throw new Error("Response was cut off; raise maxTokens.");
  if (!response.parsed_output) throw new Error("Response didn't match the schema.");
  return response.parsed_output as z.infer<T>;
}

/** Rough cost in dollars at Claude Opus 5.5 list prices ($4 / $20 per million tokens, cache reads $0.20). */
export function cost(u: Usage = usage): number {
  return ((u.input - u.cacheRead) * 4 + u.cacheRead * 0.2 + u.output * 20) / 1e6;
}
