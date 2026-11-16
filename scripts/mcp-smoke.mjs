// MCP handshake smoke test: spawns `pnpm mcp` over stdio, performs the
// JSON-RPC initialize + tools/list exchange, and asserts all six triage_*
// tools are exposed. Proves the agentic surface (PRD §12) end to end.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = process.cwd();
const transport = new StdioClientTransport({
  command: "pnpm",
  args: ["--dir", root, "mcp"],
});
const client = new Client({ name: "triage-smoke", version: "0.0.0" }, { capabilities: {} });

await client.connect(transport);
const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
console.log("MCP_TOOLS=" + names.join(","));

const triageTools = names.filter((n) => n.startsWith("triage_"));
if (triageTools.length !== 6) {
  console.error(`expected 6 triage_* tools, got ${triageTools.length}: ${triageTools.join(", ")}`);
  process.exit(1);
}

await client.close();
console.log("mcp-smoke: ok (6/6 tools)");
