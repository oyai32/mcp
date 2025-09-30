import {
    McpServer,
    ResourceTemplate,
  } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
  import fs from "fs";
  import path from "path";
  import { z } from "zod";
  
  // 配置文档目录
  const DOCS_DIR = "/Users/tacy/oyyl/knowledge"; // 修改为你的文档目录
  
  // 创建 MCP 服务器
  const server = new McpServer({
    name: "component-docs-server",
    version: "1.0.0",
  });
  
  // 组件文档接口
  interface ComponentDoc {
    name: string;
    description: string;
    props?: Record<string, any>;
    examples: string[];
    filePath: string;
  }
  
  // 读取文档文件的函数
  function readComponentDocs(): ComponentDoc[] {
    const docs: ComponentDoc[] = [];
    
    try {
      if (!fs.existsSync(DOCS_DIR)) {
        console.error(`文档目录不存在: ${DOCS_DIR}`);
        return docs;
      }
  
      const files = fs.readdirSync(DOCS_DIR);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(DOCS_DIR, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            
              const lines = content.split('\n');
              const name = path.basename(file, '.md');
              const description = lines.find(line => line.startsWith('# '))?.replace('# ', '') || '';
              // 从 markdown 中提取示例代码
              const examples: string[] = [];
              let inCodeBlock = false;
              let currentCode = '';
              
              for (const line of lines) {
                // ？？ 没有结束？ oyyl
                if (line.startsWith('```')) {
                  if (inCodeBlock && currentCode) {
                    examples.push(currentCode.trim());
                    currentCode = '';
                  }
                  inCodeBlock = !inCodeBlock;
                } else if (inCodeBlock) {
                  currentCode += line + '\n';
                }
              }
              
              docs.push({
                name,
                description,
                examples: examples.length > 0 ? examples : [`# ${name} 组件\n\n暂无详细示例`],
                filePath
              });
          } catch (error) {
            console.error(`读取文件 ${filePath} 失败:`, error);
          }
        }
      }
    } catch (error) {
      console.error('读取文档目录失败:', error);
    }
    
    return docs;
  }
  
  // 注册文档资源
  server.registerResource(
    "component-docs",
    new ResourceTemplate("component://{name}", { list: undefined }),
    {
      title: "组件文档",
      description: "获取指定组件的详细文档",
    },
    async (uri, { name }) => {
        const docs = readComponentDocs();
        const component = docs.find(doc => {
          const docName = doc.name.toLowerCase();
          
          if (Array.isArray(name)) {
            // 如果是数组，检查是否包含任一名称
            return name.some(n => docName.includes(n.toLowerCase()));
          } else {
            // 如果是字符串，检查是否包含该名称
            return docName.includes(name.toLowerCase());
          }
        });
  
      if (!component) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `未找到组件 "${name}" 的文档`,
            },
          ],
        };
      }
  
      // oyyl 有 props 逻辑？
      const content = `
  # ${component.name}
  
  ${component.description}
  
  ${component.examples.length > 0 ? 
    `## 使用示例\n\n\`\`\`typescript\n${component.examples[0]}\n\`\`\`` : 
    '暂无使用示例'
  }
  
  ${component.props ? 
    `## 属性说明\n\n${Object.entries(component.props).map(([key, value]) => 
      `- **${key}**: ${value}`).join('\n')}` : 
    ''
  }
  
  文件路径: ${component.filePath}
      `.trim();
  
      return {
        contents: [
          {
            uri: uri.href,
            text: content,
          },
        ],
      };
    }
  );
  
  // 注册组件搜索工具
  server.registerTool(
    "search-component",
    {
      title: "搜索组件",
      description: "根据组件名称搜索相关组件文档并返回使用示例",
      inputSchema: { name: z.string() },
    },
    async ({ name }) => {
      const docs = readComponentDocs();
      const names = Array.isArray(name) ? name : [name];
      const loweredKeywords = names.map(n => String(n).toLowerCase());
      const matchedComponents = docs.filter(doc => {
        const docName = doc.name.toLowerCase();
        return loweredKeywords.some(keyword => docName.includes(keyword));
      });
  
      if (matchedComponents.length === 0) {
        return {
          content: [{
            type: "text",
            text: `未找到包含 "${name}" 的组件文档`
          }]
        };
      }
  
      let result = `找到 ${matchedComponents.length} 个相关组件:\n\n`;
      
      matchedComponents.forEach((component, index) => {
        result += `## ${component.name}\n`;
        result += `${component.description}\n\n`;
        
        if (component.examples.length > 0) {
          result += `**使用示例:**\n\`\`\`typescript\n${component.examples[0]}\n\`\`\`\n`;
        }
        
        result += `---\n`;
      });
  
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    }
  );
  
  // 注册列出所有组件的工具
  server.registerTool(
    "list-components",
    {
      title: "列出所有组件",
      description: "列出所有可用的组件文档",
      inputSchema: {}
    },
    async () => {
      const docs = readComponentDocs();
      
      if (docs.length === 0) {
        return {
          content: [{
            type: "text",
            text: "未找到任何组件文档"
          }]
        };
      }
  
      const componentList = docs.map(doc => 
        `- **${doc.name}**: ${doc.description || '暂无描述'}`
      ).join('\n');
  
      return {
        content: [{
          type: "text",
          text: `可用组件列表 (共 ${docs.length} 个):\n\n${componentList}`
        }]
      };
    }
  );
  
  // 启动服务器
  async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("组件文档 MCP 服务器已启动");
    console.error(`监控文档目录: ${DOCS_DIR}`);
  }
  
  main().catch((error) => {
    console.error("服务器错误:", error);
    process.exit(1);
  });