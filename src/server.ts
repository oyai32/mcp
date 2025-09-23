import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
});

// Add an addition tool
server.registerTool(
  "add-oyyl",
  {
    title: "Addition Tool",
    description: "用于计算任意两个数字的加法，包括小数和整数。无论数字大小都可以使用此工具进行精确计算。", // 必写，使用自然语言告诉大模型，这个工具是干什么的
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) + " 计算成功 oyyl" }],
  })
);

// Add a dynamic greeting resource
server.registerResource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  {
    title: "Greeting Resource", // Display name for UI
    description: "Dynamic greeting generator",
  },
  async (uri, { name }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Hello, ${name}!`,
      },
    ],
  })
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);

// 启动服务器
// async function main() {
//   const transport = new StdioServerTransport();
//   await server.connect(transport);
//   console.error("MCP Server 已启动，等待连接...");
// }

// main().catch((error) => {
//   console.error("服务器错误:", error);
//   process.exit(1);
// });
