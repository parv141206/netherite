#!/usr/bin/env bun
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createNetheriteMcpServer } from "./server";

async function run() {
  const server = createNetheriteMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🟢 Netherite Sovereign MCP Server running on stdio");
}

run().catch((err) => {
  console.error("🔴 Netherite MCP Server fatal error:", err);
  process.exit(1);
});
