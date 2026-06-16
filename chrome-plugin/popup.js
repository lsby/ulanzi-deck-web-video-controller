const 状态指示圆点 = document.getElementById("statusDot");
const 状态文本 = document.getElementById("statusText");
const 动作按钮 = document.getElementById("actionBtn");

let 当前状态 = "disconnected";

function 更新界面状态(状态值) {
  当前状态 = 状态值;
  if (状态值 === "connected") {
    状态指示圆点.className = "status-dot connected";
    状态文本.innerText = "已连接";
    状态文本.style.color = "#52c41a";
    动作按钮.innerText = "断开连接";
    动作按钮.className = "btn disconnect";
    动作按钮.disabled = false;
  } else if (状态值 === "connecting") {
    状态指示圆点.className = "status-dot connecting";
    状态文本.innerText = "正在连接...";
    状态文本.style.color = "#faad14";
    动作按钮.innerText = "正在连接...";
    动作按钮.className = "btn";
    动作按钮.disabled = true;
  } else if (状态值 === "connect_failed") {
    状态指示圆点.className = "status-dot";
    状态文本.innerText = "连接失败，请启动 App";
    状态文本.style.color = "#ff4d4f";
    动作按钮.innerText = "重新尝试连接";
    动作按钮.className = "btn";
    动作按钮.disabled = false;
  } else {
    状态指示圆点.className = "status-dot";
    状态文本.innerText = "未连接";
    状态文本.style.color = "#ff4d4f";
    动作按钮.innerText = "点击连接 Ulanzi";
    动作按钮.className = "btn";
    动作按钮.disabled = false;
  }
}

// 获取初始状态
chrome.runtime.sendMessage({ action: "getStatus" }, (响应内容) => {
  if (响应内容 && 响应内容.status) {
    更新界面状态(响应内容.status);
  }
});

// 监听来自后台脚本（background.js）的状态广播更新
chrome.runtime.onMessage.addListener((请求消息) => {
  if (请求消息 && 请求消息.action === "statusUpdated") {
    console.log(`[Popup] 收到状态更新广播: ${请求消息.status}`);
    更新界面状态(请求消息.status);
  }
});

// 点击按钮事件
动作按钮.addEventListener("click", () => {
  if (当前状态 === "connected") {
    chrome.runtime.sendMessage({ action: "disconnect" }, (响应内容) => {
      if (响应内容 && 响应内容.status) {
        更新界面状态(响应内容.status);
      }
    });
  } else {
    更新界面状态("connecting");
    chrome.runtime.sendMessage({ action: "connect" }, (响应内容) => {
      if (响应内容 && 响应内容.status) {
        更新界面状态(响应内容.status);
      }
    });
  }
});
