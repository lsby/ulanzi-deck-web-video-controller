import { exec as 执行命令 } from "child_process";
import crypto from "crypto";
import fs from "fs";
import net from "net";
import path from "path";
import UlanzideckApi from "../libs/node/ulanzideckApi.js";
import Utils from "../libs/node/utils.js";

const 应用标识 = "com.lsby.webVideoControl";
const 插件根目录 = Utils.getPluginPath();
const 日志文件路径 = path.join(插件根目录, "debug-log.txt");

// 写入调试日志到文件
function 写入调试日志(日志内容) {
  // const 时间戳 = `[${new Date().toLocaleString("zh-CN", { hour12: false })}]`;
  // const 格式化日志 = `${时间戳} ${日志内容}\n`;
  // console.log(日志内容);
  // try {
  //   fs.appendFileSync(日志文件路径, 格式化日志, "utf8");
  // } catch (写入错误) {
  //   console.error("写入日志文件失败:", 写入错误);
  // }
}

// 存储所有已连接的浏览器原生宿主管道套接字
const 管道连接集合 = new Set();
const 管道路径 = "\\\\.\\pipe\\com.lsby.webVideoControl";

// 启动 Windows 命名管道服务器
const 管道服务器 = net.createServer((套接字) => {
  写入调试日志("原生宿主进程已连接至命名管道");
  管道连接集合.add(套接字);

  套接字.on("close", () => {
    写入调试日志("原生宿主进程已断开命名管道连接");
    管道连接集合.delete(套接字);
  });

  套接字.on("error", (套接字错误) => {
    写入调试日志(`命名管道套接字出错: ${套接字错误.message}`);
    管道连接集合.delete(套接字);
  });
});

// 监听命名管道
管道服务器.listen(管道路径, () => {
  写入调试日志(`命名管道服务器已启动，路径: ${管道路径}`);
});

// 向所有连接的宿主发送指令
function 广播控制指令(动作类型) {
  const 指令数据 = JSON.stringify({ action: 动作类型 });
  写入调试日志(`通过命名管道发送控制指令: ${指令数据}`);
  for (const 套接字 of 管道连接集合) {
    try {
      套接字.write(指令数据);
    } catch (发送错误) {
      写入调试日志(`管道发送指令失败: ${发送错误.message}`);
    }
  }
}

// 初始化扩展的 key 与注册表
function 初始化扩展与注册表() {
  const 密钥文件路径 = path.join(插件根目录, "plugin", "extension-key.json");
  let 公钥Base64 = "";
  let 扩展标识 = "";

  // 1. 读取或生成持久化的密钥对，保证每次启动扩展 ID 保持一致
  if (fs.existsSync(密钥文件路径)) {
    try {
      const 密钥数据 = JSON.parse(fs.readFileSync(密钥文件路径, "utf8"));
      公钥Base64 = 密钥数据.publicKey;
      扩展标识 = 密钥数据.extensionId;
      写入调试日志(`已加载已有的扩展密钥，扩展标识: ${扩展标识}`);
    } catch (读取错误) {
      写入调试日志(`加载密钥文件失败，将重新生成: ${读取错误.message}`);
    }
  }

  if (!公钥Base64) {
    写入调试日志("正在生成新的扩展密钥对...");
    const { publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "der" },
    });
    公钥Base64 = publicKey.toString("base64");

    // 计算扩展标识 (Extension ID)
    const 哈希 = crypto.createHash("sha256").update(publicKey).digest("hex");
    const 前32位 = 哈希.substring(0, 32);
    for (let 索引 = 0; 索引 < 前32位.length; 索引++) {
      const 数值 = parseInt(前32位[索引], 16);
      扩展标识 += String.fromCharCode(97 + 数值);
    }

    fs.writeFileSync(
      密钥文件路径,
      JSON.stringify({ publicKey: 公钥Base64, extensionId: 扩展标识 }, null, 2),
      "utf8",
    );
    写入调试日志(`新扩展密钥已生成并保存，扩展标识: ${扩展标识}`);
  }

  // 2. 写入/更新 chrome-plugin/manifest.json 中的 key
  const 扩展配置文件路径 = path.join(
    插件根目录,
    "chrome-plugin",
    "manifest.json",
  );
  if (fs.existsSync(扩展配置文件路径)) {
    try {
      const 配置 = JSON.parse(fs.readFileSync(扩展配置文件路径, "utf8"));
      配置.key = 公钥Base64;
      fs.writeFileSync(扩展配置文件路径, JSON.stringify(配置, null, 2), "utf8");
      写入调试日志("已更新 chrome-plugin/manifest.json 中的公钥 (key) 配置");
    } catch (写入文件错误) {
      写入调试日志(`更新 manifest.json 失败: ${写入文件错误.message}`);
    }
  }

  const 宿主配置文件路径 = path.join(
    插件根目录,
    "chrome-plugin",
    "host-manifest.json",
  );
  const 宿主批处理路径 = path.join(插件根目录, "chrome-plugin", "host.bat");
  const 宿主配置 = {
    name: "com.lsby.web_video_control",
    description: "Ulanzi Deck controller host",
    path: 宿主批处理路径,
    type: "stdio",
    allowed_origins: [`chrome-extension://${扩展标识}/`],
  };
  fs.writeFileSync(宿主配置文件路径, JSON.stringify(宿主配置, null, 2), "utf8");
  写入调试日志("已生成动态的 host-manifest.json 配置文件");

  // 4. 调用 PowerShell 写入 Windows 注册表（仅限 HKCU，无需管理员权限）
  const 宿主配置文件绝对路径 = path.join(
    插件根目录,
    "chrome-plugin",
    "host-manifest.json",
  );
  const 注册表命令 = `powershell -Command "$Paths = @('HKCU:\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\com.lsby.web_video_control', 'HKCU:\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.lsby.web_video_control'); foreach ($p in $Paths) { if (-not (Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name '(Default)' -Value '${宿主配置文件绝对路径}' }"`;

  写入调试日志("开始注册原生消息宿主到注册表...");
  执行命令(注册表命令, (执行错误) => {
    if (执行错误) {
      写入调试日志(`【注册表写入失败】: ${执行错误.message}`);
    } else {
      写入调试日志("原生消息宿主已成功注册到 Edge 和 Chrome 注册表！");
    }
  });
}

// 自动执行配置初始化
初始化扩展与注册表();

const 接口实例 = new UlanzideckApi();
接口实例.connect(应用标识);

接口实例.onAdd((数据) => {
  写入调试日志(`插件按键加载: ${JSON.stringify(数据)}`);
});

// 处理按键点击事件
接口实例.onRun((数据) => {
  写入调试日志(`接收到按键运行事件: ${JSON.stringify(数据)}`);
  const 动作名称 = 数据.uuid.substring(应用标识.length + 1);

  if (动作名称 === "mediaRewind") {
    写入调试日志("触发：视频快退");
    广播控制指令("rewind");
  } else if (动作名称 === "mediaFastForward") {
    写入调试日志("触发：视频快进");
    广播控制指令("fastForward");
  } else {
    写入调试日志(`未知的动作名称: ${动作名称}`);
  }
});
