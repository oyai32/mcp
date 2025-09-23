import express from "express";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// SSE 客户端存储
const clients = new Set<express.Response>();

// SSE 端点
app.get("/sse", (req, res) => {
  console.log("新的 SSE 连接建立");

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ type: "connected", message: "SSE Server Connected" })}\n\n`);
  clients.add(res);

  req.on('close', () => {
    console.log("SSE 连接断开");
    clients.delete(res);
  });
});

// 广播消息函数
function broadcastMessage(message: any) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  clients.forEach(client => {
    try {
      client.write(data);
    } catch (error: any) {
      console.error("发送消息错误:", error);
      clients.delete(client);
    }
  });
}

// 加法工具端点
app.post("/tool/add-oyyl", async (req, res) => {
  try {
    const { a, b } = req.body;
    
    if (typeof a !== 'number' || typeof b !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: "参数 a 和 b 必须是数字" 
      });
    }

    console.log(`调用加法工具: ${a} + ${b}`);
    const result = a + b;
    const resultText = `${a} + ${b} = ${result} 计算成功 oyyl`;
    
    // 广播结果
    broadcastMessage({
      type: "tool_result",
      tool: "add-oyyl",
      input: { a, b },
      result: resultText,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      result: resultText
    });
  } catch (error: any) {
    console.error("工具调用错误:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 健康检查
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    clients: clients.size,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 SSE 服务器运行在 http://localhost:${port}`);
  console.log(`📡 SSE 端点: http://localhost:${port}/sse`);
  console.log(`🔧 工具端点: POST http://localhost:${port}/tool/add-oyyl`);
  console.log(`❤️  健康检查: http://localhost:${port}/health`);
});