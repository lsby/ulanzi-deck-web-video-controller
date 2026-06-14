let nativePort = null;
let connectionStatus = "disconnected";

function connectNative() {
  if (nativePort) {
    try {
      nativePort.disconnect();
    } catch (e) {}
  }

  console.log("[Background] Connecting to native messaging host com.lsby.web_video_control...");
  try {
    nativePort = chrome.runtime.connectNative("com.lsby.web_video_control");
    connectionStatus = "connected";

    nativePort.onMessage.addListener((msg) => {
      console.log("[Background] Received message from native host:", msg);
      // 广播给所有标签页的 content.js
      chrome.tabs.query({}, (tabs) => {
        if (!tabs) return;
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, msg).catch(() => {
              // 忽略未注入 content.js 的标签页报错
            });
          }
        }
      });
    });

    nativePort.onDisconnect.addListener(() => {
      console.warn("[Background] Native messaging host disconnected.");
      nativePort = null;
      connectionStatus = "disconnected";
    });
  } catch (err) {
    console.error("[Background] Connection failed:", err.message);
    nativePort = null;
    connectionStatus = "disconnected";
  }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getStatus") {
    sendResponse({ status: connectionStatus });
  } else if (request.action === "connect") {
    connectNative();
    // 延迟一小会儿返回状态，以保证 onDisconnect 触发后能拿到准确状态
    setTimeout(() => {
      sendResponse({ status: connectionStatus });
    }, 100);
    return true; // 保持异步通道
  } else if (request.action === "disconnect") {
    if (nativePort) {
      try {
        nativePort.disconnect();
      } catch (e) {}
      nativePort = null;
    }
    connectionStatus = "disconnected";
    sendResponse({ status: connectionStatus });
  }
});

// 首次启动时仅尝试连接一次，失败后绝不进行后台定时轮询重连
connectNative();
