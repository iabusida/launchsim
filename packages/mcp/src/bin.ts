#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLaunchsimServer } from "./server.js";

const server = createLaunchsimServer();
const transport = new StdioServerTransport();
await server.connect(transport);
