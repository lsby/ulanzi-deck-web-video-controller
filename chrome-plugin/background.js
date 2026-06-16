let 原生端口 = null;
let 连接状态 = "disconnected";
let 连接超时定时器 = null;

// 更新连接状态并广播给 popup 页面
function 更新连接状态(新状态) {
  连接状态 = 新状态;
  console.log(`[Background] 连接状态变更为: ${新状态}`);
  chrome.runtime.sendMessage({ action: "statusUpdated", status: 新状态 }).catch(() => {
    // 忽略当 popup 未打开时的广播失败报错
  });
}

function 连接原生宿主() {
  if (原生端口) {
    try {
      原生端口.disconnect();
    } catch (错误) {}
  }

  if (连接超时定时器) {
    clearTimeout(连接超时定时器);
  }

  console.log("[Background] 正在连接至原生宿主 com.lsby.web_video_control...");
  更新连接状态("connecting");

  try {
    原生端口 = chrome.runtime.connectNative("com.lsby.web_video_control");

    // 设置连接超时检测
    连接超时定时器 = setTimeout(() => {
      if (连接状态 === "connecting") {
        console.warn("[Background] 连接原生宿主超时。");
        if (原生端口) {
          try {
            原生端口.disconnect();
          } catch (错误) {}
          原生端口 = null;
        }
        更新连接状态("connect_failed");
      }
    }, 2000);

    原生端口.onMessage.addListener((消息) => {
      console.log("[Background] 收到来自原生宿主的消息:", 消息);

      // 如果收到的是握手成功消息
      if (消息 && 消息.status === "connected") {
        if (连接超时定时器) {
          clearTimeout(连接超时定时器);
        }
        更新连接状态("connected");
        return; // 不需要将握手消息转发给网页
      }

      // 广播给所有标签页的 content.js
      chrome.tabs.query({}, (标签页数组) => {
        if (!标签页数组) return;
        for (const 标签页 of 标签页数组) {
          if (标签页.id) {
            chrome.tabs.sendMessage(标签页.id, 消息).catch(() => {
              // 忽略未注入 content.js 的标签页报错
            });
          }
        }
      });
    });

    原生端口.onDisconnect.addListener(() => {
      console.warn("[Background] 原生宿主进程已断开连接。");
      if (连接超时定时器) {
        clearTimeout(连接超时定时器);
      }
      
      const 之前状态 = 连接状态;
      原生端口 = null;

      if (之前状态 === "connecting") {
        更新连接状态("connect_failed");
      } else {
        更新连接状态("disconnected");
      }
    });
  } catch (捕获错误) {
    console.error("[Background] 连接原生宿主失败:", 捕获错误.message);
    if (连接超时定时器) {
      clearTimeout(连接超时定时器);
    }
    原生端口 = null;
    更新连接状态("connect_failed");
  }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((请求, 发送者, 发送响应) => {
  if (请求.action === "getStatus") {
    发送响应({ status: 连接状态 });
  } else if (请求.action === "connect") {
    连接原生宿主();
    // 立刻返回 "connecting" 状态，让 UI 进入“正在连接”等待状态
    发送响应({ status: 连接状态 });
  } else if (请求.action === "disconnect") {
    if (连接超时定时器) {
      clearTimeout(连接超时定时器);
    }
    if (原生端口) {
      try {
        原生端口.disconnect();
      } catch (错误) {}
      原生端口 = null;
    }
    更新连接状态("disconnected");
    发送响应({ status: 连接状态 });
  }
});

// 首次启动时仅尝试连接一次，失败后绝不进行后台定时轮询重连
连接原生宿主();
