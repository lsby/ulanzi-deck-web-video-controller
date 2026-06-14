const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const actionBtn = document.getElementById("actionBtn");

let currentStatus = "disconnected";

function updateUI(status) {
  currentStatus = status;
  if (status === "connected") {
    statusDot.className = "status-dot connected";
    statusText.innerText = "已连接";
    statusText.style.color = "#52c41a";
    actionBtn.innerText = "断开连接";
    actionBtn.className = "btn disconnect";
  } else {
    statusDot.className = "status-dot";
    statusText.innerText = "未连接";
    statusText.style.color = "#ff4d4f";
    actionBtn.innerText = "点击连接 Ulanzi";
    actionBtn.className = "btn";
  }
}

// 获取初始状态
chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
  if (response && response.status) {
    updateUI(response.status);
  }
});

// 点击按钮事件
actionBtn.addEventListener("click", () => {
  if (currentStatus === "connected") {
    chrome.runtime.sendMessage({ action: "disconnect" }, (response) => {
      if (response && response.status) {
        updateUI(response.status);
      }
    });
  } else {
    actionBtn.innerText = "正在连接...";
    chrome.runtime.sendMessage({ action: "connect" }, (response) => {
      if (response && response.status) {
        updateUI(response.status);
      }
    });
  }
});
