import fs from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.join(__dirname, "host-debug.log");

// 写入本地宿主日志以供调试
function writeHostLog(content) {
  // const timestamp = `[${new Date().toLocaleString("zh-CN", { hour12: false })}]`;
  // try {
  //   fs.appendFileSync(logPath, `${timestamp} ${content}\n`, "utf8");
  // } catch (e) {}
}

// writeHostLog("宿主进程被浏览器唤醒并启动成功");

const pipePath = "\\\\.\\pipe\\com.lsby.webVideoControl";
let pipeSocket = null;
let reconnectTimer = null;

// 发送原生消息给浏览器（带 4 字节的长度前缀）
function sendNativeMessage(messageStr) {
  const msgBuffer = Buffer.from(messageStr, "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(msgBuffer.length, 0);
  const packet = Buffer.concat([header, msgBuffer]);
  try {
    process.stdout.write(packet);
  } catch (err) {
    writeHostLog(`向浏览器写数据失败: ${err.message}`);
  }
}

function connectToPipe() {
  if (pipeSocket) {
    pipeSocket.destroy();
  }

  writeHostLog(`尝试连接命名管道: ${pipePath}`);
  pipeSocket = net.connect(pipePath, () => {
    writeHostLog("成功连接到命名管道!");
  });

  pipeSocket.on("data", (data) => {
    writeHostLog(`收到管道数据，准备转发给浏览器: ${data.toString()}`);
    sendNativeMessage(data.toString());
  });

  pipeSocket.on("close", () => {
    writeHostLog("命名管道已关闭，退出宿主进程");
    process.exit(0);
  });

  pipeSocket.on("error", (err) => {
    writeHostLog(`命名管道连接出错: ${err.message}，退出宿主进程`);
    process.exit(1);
  });
}

// 监听 stdin 以检测浏览器关闭
process.stdin.on("readable", () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    // 消费数据
  }
});

process.stdin.on("end", () => {
  writeHostLog("浏览器标准输入结束 (浏览器关闭或断开)，宿主进程准备退出。");
  process.exit(0);
});

// 启动管道连接
connectToPipe();
