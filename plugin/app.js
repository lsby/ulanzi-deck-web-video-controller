
import fs from "fs";
import net from "net";
import path from "path";
import { exec } from "child_process";
import UlanzideckApi from "../libs/node/ulanzideckApi.js";
import Utils from "../libs/node/utils.js";
import { 记录调试日志 } from "../libs/node/logger.js";

const 应用标识 = "com.lsby.webVideoControl";
const 插件根目录 = Utils.getPluginPath();
const 日志目录路径 = path.join(插件根目录, "logs");

// 写入调试日志到文件
function 写入调试日志(日志内容) {
  记录调试日志(日志目录路径, 日志内容);
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

const 公钥Base64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhcrWYd2sdVUTCySEgif8uln3zfftebuVijbz0gIc2nf/XHLPaVpa6sNtXZAyzrIxq88T0qe6IYdnU5pQBN3wklm0Ugn8Ig1SJKYy5QpC054Fkmk3wac4G+YoTTg8QjIikCAxGtXD3VkudO7MG/GS+l1VnTJHrwz91e6swH6KvyE2Trl8yAoENOsQFALm7sS9Q5gJV7okBXRMWm4leZX5V9W7PRzMM69H05Y51BwZn5xDREW42Ic/T4EXBSjMcIkXYCnK4Rf+18XaD5+CnRgIPuOnc5gdqkqe/eqSPM4hj1waU+m1VxdKmKDY5uy/pEWxeYone96aycVdEwOIJGqYJQIDAQAB";
const 扩展标识 = "fickakookgdjnejinipbbgohcbbaohef";

// 初始化扩展的 key 与注册表
function 初始化扩展与注册表() {
  const 扩展配置文件路径 = path.join(
    插件根目录,
    "chrome-plugin",
    "manifest.json",
  );
  if (fs.existsSync(扩展配置文件路径)) {
    try {
      const 配置 = JSON.parse(fs.readFileSync(扩展配置文件路径, "utf8"));
      if (配置.key !== 公钥Base64) {
        配置.key = 公钥Base64;
        fs.writeFileSync(扩展配置文件路径, JSON.stringify(配置, null, 2), "utf8");
        写入调试日志("已更新 chrome-plugin/manifest.json 中的公钥 (key) 配置");
      }
    } catch (写入文件错误) {
      写入调试日志(`更新 manifest.json 失败: ${写入文件错误.message}`);
    }
  }
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
  } else if (动作名称 === "mediaPlayPause") {
    写入调试日志("触发：视频播放暂停");
    广播控制指令("playPause");
  } else {
    写入调试日志(`未知的动作名称: ${动作名称}`);
  }
});

// 处理属性面板发送的自定义事件
接口实例.on("sendToPlugin", (事件数据) => {
  写入调试日志(`接收到属性面板消息: ${JSON.stringify(事件数据)}`);
  const 载荷 = 事件数据.payload || {};
  if (载荷.动作 === "打开文件夹") {
    写入调试日志(`正在打开插件文件夹: ${插件根目录}`);
    exec(`explorer.exe "${插件根目录.replace(/\//g, "\\")}"`, (执行错误) => {
      // 忽略 explorer 正常退出但可能报非0退出码的情况
    });
  } else if (载荷.动作 === "执行安装") {
    const 脚本目录 = path.join(插件根目录, "scripts").replace(/\//g, "\\");
    const 脚本文件 = path.join(脚本目录, "install.cmd");
    写入调试日志(`正在请求管理员权限执行安装脚本: ${脚本文件}`);
    exec(`powershell -Command "Start-Process cmd -ArgumentList '/c \\\"${脚本文件}\\\"' -Verb RunAs -WorkingDirectory '${脚本目录}'"`, (执行错误) => {
      if (执行错误) {
        写入调试日志(`请求安装脚本管理员权限执行失败: ${执行错误.message}`);
      }
    });
  } else if (载荷.动作 === "执行卸载") {
    const 脚本目录 = path.join(插件根目录, "scripts").replace(/\//g, "\\");
    const 脚本文件 = path.join(脚本目录, "uninstall.cmd");
    写入调试日志(`正在请求管理员权限执行卸载脚本: ${脚本文件}`);
    exec(`powershell -Command "Start-Process cmd -ArgumentList '/c \\\"${脚本文件}\\\"' -Verb RunAs -WorkingDirectory '${脚本目录}'"`, (执行错误) => {
      if (执行错误) {
        写入调试日志(`请求卸载脚本管理员权限执行失败: ${执行错误.message}`);
      }
    });
  } else if (载荷.动作 === "打开说明文档") {
    const 说明文档 = path.join(插件根目录, "docs", "user-guide.html").replace(/\//g, "\\");
    写入调试日志(`正在打开本地说明文档: ${说明文档}`);
    exec(`start "" "${说明文档}"`, (执行错误) => {
      if (执行错误) {
        写入调试日志(`打开本地说明文档失败: ${执行错误.message}`);
      }
    });
  }
});
