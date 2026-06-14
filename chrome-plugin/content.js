(function () {
  chrome.runtime.onMessage.addListener((data) => {
    if (data.action === "rewind" || data.action === "fastForward") {
      const videos = Array.from(document.querySelectorAll("video"));
      if (videos.length === 0) return;

      // 1. 寻找当前处于播放状态且没有结束的视频
      let targetVideo = videos.find(v => !v.paused && !v.ended);

      // 2. 如果没有播放中的视频，但当前页面是处于激活/可见状态，取第一个视频
      if (!targetVideo && document.visibilityState === "visible") {
        targetVideo = videos[0];
      }

      if (targetVideo) {
        if (data.action === "rewind") {
          console.log("[Ulanzi Control] Rewinding video by 5 seconds");
          targetVideo.currentTime = Math.max(0, targetVideo.currentTime - 5);
        } else if (data.action === "fastForward") {
          console.log("[Ulanzi Control] Fast-forwarding video by 5 seconds");
          targetVideo.currentTime = Math.min(targetVideo.duration || (targetVideo.currentTime + 5), targetVideo.currentTime + 5);
        }
      }
    }
  });
})();
