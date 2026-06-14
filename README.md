# Ulanzi Deck 网页视频控制器 (Web Video Controller)

这是一个为 Ulanzi Deck 实体控制台设计的插件及配套浏览器扩展，用于**在不切换窗口焦点、不产生屏幕闪烁的前提下，一键控制浏览器网页视频的快进与快退**。

## 💡 开发初衷 (Motivation)

在日常使用电脑时，我们经常会**一边看视频**（如技术教程、网课或娱乐视频），**一边在其他软件中忙碌**（如敲代码、记笔记或打游戏）。

在多任务并行的场景下，难免会因为一时走神而错过几句关键内容。以往想要回退进度，往往需要极其繁琐的步骤：**“中断手头工作 -> 切换到浏览器窗口 -> 鼠标拖动进度条或用键盘微调 -> 重新切回原工作窗口”**，非常打断专注状态。

为了解决这个痛点，我写了这个插件。它能让你在**完全不切换当前窗口焦点、不中断手头工作**的前提下，通过 Ulanzi Deck 的物理按键，一键微调后台视频的播放进度，方便随时回退重听或快速跳过。

## 🌟 核心特色

- **无焦点干扰**：无需激活浏览器窗口或改变焦点，即可对网页视频（如 Bilibili、YouTube 等）进行快退 5 秒或快进 5 秒控制。
- **原生消息传递 (Native Messaging)**：采用 Chrome/Edge 原生进程通道，不占用任何本地网络端口（无 TCP/UDP 冲突风险）。
- **命名管道 (Named Pipe) IPC**：使用 Windows 本地命名管道与 Ulanzi 后台通信，达到 0 轮询开销与毫秒级瞬时响应。
- **手动连接管理**：提供精美的浏览器 Action Popup 弹窗，支持一键连接/断开，不使用时完全不产生额外能耗。
- **自动注册系统**：Ulanzi 插件首次启动时，会自动为主程序生成唯一的密钥对并自动在当前 Windows 用户的 `HKCU` 注册表中注册原生通道，开箱即用。

---

## 🛠️ 项目结构

```text
com.lsby.webVideoControl.ulanziPlugin/
├── assets/icons/          # Ulanzi 实体键与侧边栏所需的精美图标
├── chrome-plugin/         # 浏览器扩展目录
│   ├── manifest.json      # 扩展 Manifest V3 配置文件（已声明公钥以固定 ID）
│   ├── background.js      # 扩展服务工作线程 (Service Worker)，负责连接原生宿主
│   ├── content.js         # 页面注入脚本，控制当前活动视频的播放进度
│   ├── host.js / host.bat # 原生消息宿主，桥接命名管道和浏览器 stdin/stdout
│   ├── popup.html/js      # 手动控制连接与断开的精美弹窗界面
│   └── icon.png           # 扩展全局图标
├── plugin/
│   ├── app.js             # Ulanzi 后端主程序，配置注册表、启动命名管道并监听物理键
│   └── extension-key.json # 本地持久化密钥（保证您的扩展 ID 永久固定为 fickakookgdjnejinipbbgohcbbaohef）
├── scripts/
│   └── uninstall.cmd      # 独立的一键注册表残留清理脚本
└── manifest.json          # Ulanzi 平台描述文件
```

---

## 🚀 安装与使用步骤

### 1. 部署插件文件夹

- 第一步必须将本插件项目（包含 `package.json` 及所有子文件夹与代码）复制或移动到 Ulanzi 插件的指定运行目录中：
  `%APPDATA%\Ulanzi\UlanziDeck\Plugins\com.lsby.web_video_control.ulanziPlugin` （可在文件资源管理器地址栏直接输入进入，对应 `C:\Users\<您的用户名>\AppData\Roaming\...`）
- **重要**：请确保该文件夹下直接存在 `package.json` 文件，否则 Ulanzi Deck 客户端将无法识别、加载和拉起此插件后端。

### 2. 运行 Ulanzi 插件后端

- 确保您的 Ulanzi Deck 客户端处于运行状态（这会自动加载刚才部署的插件）。
- 客户端启动后，会自动运行插件内的 `plugin/app.js`，该脚本会自动完成如下步骤：
  1. 它会自动读取或生成 `plugin/extension-key.json`；
  2. 动态写入绝对路径到宿主清单并注册到 Windows 注册表的 Edge 和 Chrome 下（`HKCU` 无需管理员权限）；
  3. 启动本地命名管道服务 `\\.\pipe\com.lsby.webVideoControl`。

### 3. 在浏览器中安装扩展程序

- 打开您的 Chrome 或 Edge 浏览器，进入扩展管理页面（如 **`edge://extensions/`**）。
- 开启右上角或左侧的 **“开发人员模式”**。
- 点击 **“加载解压的扩展程序” (Load unpacked)**，选择本项目根目录下的 **`chrome-plugin`** 文件夹。
- 加载成功后即可看到本插件的专属蓝色双三角图标，其 Extension ID 自动被固定为 `fickakookgdjnejinipbbgohcbbaohef`。

### 4. 一键建立连接

- 在浏览器右上角扩展栏中，点击我们本插件的图标。
- 在弹出的精美面板中，点击 **“点击连接 Ulanzi”**。
- 状态指示灯会瞬间转绿并显示为 **“已连接”**，这代表本地管道和浏览器原生通道已成功对接。

### 5. 物理按键绑定

- 打开 Ulanzi 客户端配置界面，将 **“视频快退” (mediaRewind)** 和 **“视频快进” (mediaFastForward)** 拖曳至您的按键上。
- 打开任意带有视频播放器的网页（如 Bilibili 播放页面），按动物理按键，即可体验零延迟的快进退！

---

## 🧹 卸载说明

如果您未来需要移除该插件并保持系统洁净：

1. 在浏览器扩展管理中**删除**本扩展；
2. 双击运行 **`scripts/uninstall.cmd`**，它会自动安全地将 Windows 注册表中的原生宿主注册项（`com.lsby.web_video_control`）清理干净。
