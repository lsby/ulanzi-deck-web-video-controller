(function () {
  chrome.runtime.onMessage.addListener((数据) => {
    if (数据.action === "rewind" || 数据.action === "fastForward" || 数据.action === "playPause") {
      const 视频列表 = Array.from(document.querySelectorAll("video"));
      if (视频列表.length === 0) return;

      // 1. 寻找当前处于播放状态且没有结束的视频
      let 目标视频 = 视频列表.find(视频 => !视频.paused && !视频.ended);

      // 2. 如果没有播放中的视频，但当前页面是处于激活/可见状态，取第一个视频
      if (!目标视频 && document.visibilityState === "visible") {
        目标视频 = 视频列表[0];
      }

      if (目标视频) {
        if (数据.action === "rewind") {
          console.log("[Ulanzi Control] Rewinding video by 5 seconds");
          目标视频.currentTime = Math.max(0, 目标视频.currentTime - 5);
        } else if (数据.action === "fastForward") {
          console.log("[Ulanzi Control] Fast-forwarding video by 5 seconds");
          目标视频.currentTime = Math.min(目标视频.duration || (目标视频.currentTime + 5), 目标视频.currentTime + 5);
        } else if (数据.action === "playPause") {
          if (目标视频.paused) {
            console.log("[Ulanzi Control] Playing video");
            目标视频.play().catch(错误 => {
              console.error("[Ulanzi Control] Failed to play video:", 错误);
            });
          } else {
            console.log("[Ulanzi Control] Pausing video");
            目标视频.pause();
          }
        }
      }
    }
  });
})();
