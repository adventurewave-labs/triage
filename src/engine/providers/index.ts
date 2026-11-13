import type { JudgeProvider } from "./types.js";
import { MockProvider } from "./mock.js";
import { AnthropicProvider } from "./anthropic.js";

export function getProvider(): JudgeProvider {
  const mode = process.env.TRIAGE_PROVIDER ?? "mock";
  if (mode === "anthropic") return new AnthropicProvider();
  return new MockProvider();
}

export { MockProvider, AnthropicProvider };
export type { JudgeProvider };
