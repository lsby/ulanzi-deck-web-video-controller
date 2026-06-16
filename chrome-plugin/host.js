import fs from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { 记录调试日志 } from "../libs/node/logger.js";

const __文件名 = fileURLToPath(import.meta.url);
const __目录名 = path.dirname(__文件名);
const 日志目录路径 = path.join(__目录名, "logs");

// 写入本地宿主日志以供调试
function 写入宿主日志(日志内容) {
  记录调试日志(日志目录路径, 日志内容);
}

// 写入宿主日志("宿主进程被浏览器唤醒并启动成功");

const 管道路径 = "\\\\.\\pipe\\com.lsby.webVideoControl";
let 管道套接字 = null;

// 发送原生消息给浏览器（带 4 字节的长度前缀）
function 发送原生消息(消息内容) {
  const 消息缓存 = Buffer.from(消息内容, "utf8");
  const 消息头部 = Buffer.alloc(4);
  消息头部.writeUInt32LE(消息缓存.length, 0);
  const 数据包 = Buffer.concat([消息头部, 消息缓存]);
  try {
    process.stdout.write(数据包);
  } catch (发送错误) {
    写入宿主日志(`向浏览器写数据失败: ${发送错误.message}`);
  }
}

function 连接命名管道() {
  if (管道套接字) {
    管道套接字.destroy();
  }

  写入宿主日志(`尝试连接命名管道: ${管道路径}`);
  管道套接字 = net.connect(管道路径, () => {
    写入宿主日志("成功连接到命名管道!");
  });

  管道套接字.on("data", (数据) => {
    写入宿主日志(`收到管道数据，准备转发给浏览器: ${数据.toString()}`);
    发送原生消息(数据.toString());
  });

  管道套接字.on("close", () => {
    写入宿主日志("命名管道已关闭，退出宿主进程");
    process.exit(0);
  });

  管道套接字.on("error", (套接字错误) => {
    写入宿主日志(`命名管道连接出错: ${套接字错误.message}，退出宿主进程`);
    process.exit(1);
  });
}

// 监听 stdin 以检测浏览器关闭
process.stdin.on("readable", () => {
  let 数据块;
  while ((数据块 = process.stdin.read()) !== null) {
    // 消费数据
  }
});

process.stdin.on("end", () => {
  写入宿主日志("浏览器标准输入结束 (浏览器关闭或断开)，宿主进程准备退出。");
  process.exit(0);
});

// 启动管道连接
连接命名管道();

