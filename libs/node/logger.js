import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const 当前文件名 = fileURLToPath(import.meta.url);
const 当前目录名 = path.dirname(当前文件名);
// 配置文件在项目的根目录，即从 libs/node 往上退两级
const 配置文件路径 = path.resolve(当前目录名, "..", "..", "config.json");

/**
 * 获取符合 时间戳-log.log 格式的文件名，支持同秒内序号自增以防重名
 * @param {number} 序号 - 同一秒内的尝试自增序号
 * @returns {string} 格式化后的文件名
 */
function 获取时间戳文件名(序号 = 0) {
  const 现在 = new Date();
  const 年 = 现在.getFullYear();
  const 月 = String(现在.getMonth() + 1).padStart(2, "0");
  const 日 = String(现在.getDate()).padStart(2, "0");
  const 时 = String(现在.getHours()).padStart(2, "0");
  const 分 = String(现在.getMinutes()).padStart(2, "0");
  const 秒 = String(现在.getSeconds()).padStart(2, "0");
  const 后缀 = 序号 > 0 ? `_${序号}` : "";
  return `${年}${月}${日}-${时}${分}${秒}${后缀}-log.log`;
}

/**
 * 记录调试日志并自动进行日志滚动
 * @param {string} 日志目录 - 写入日志的目录路径
 * @param {string} 日志内容 - 需要写入的日志文本
 */
export function 记录调试日志(日志目录, 日志内容) {
  let 配置 = {
    debug: false,
    maxLines: 1000,
    maxFiles: 5
  };

  // 1. 读取配置文件
  try {
    if (fs.existsSync(配置文件路径)) {
      const 配置文件内容 = fs.readFileSync(配置文件路径, "utf8");
      const 解析后的配置 = JSON.parse(配置文件内容);
      配置 = { ...配置, ...解析后的配置 };
    }
  } catch (读取错误) {
    // 读取或解析配置失败，使用默认配置，这里不向控制台报错以避免干扰主流程
  }

  // 2. 如果未开启 debug，则不记录日志
  if (!配置.debug) {
    return;
  }

  // 3. 确保日志目录存在
  try {
    if (!fs.existsSync(日志目录)) {
      fs.mkdirSync(日志目录, { recursive: true });
    }
  } catch (创建目录错误) {
    console.error("创建日志目录失败:", 创建目录错误);
    return;
  }

  // 4. 获取最新的日志文件
  let 目标日志文件名 = "";
  const 日志文件匹配正则 = /^\d{8}-\d{6}(_\d+)?-log\.log$/;

  try {
    const 目录下所有文件 = fs.readdirSync(日志目录);
    const 匹配的日志文件列表 = 目录下所有文件.filter(文件名 => 日志文件匹配正则.test(文件名));
    
    if (匹配的日志文件列表.length > 0) {
      // 升序排序，由于文件名以 YYYYMMDD-HHmmss 开头，排序结果天然对应时间顺序
      匹配的日志文件列表.sort();
      
      const 最新文件名 = 匹配的日志文件列表[匹配的日志文件列表.length - 1];
      const 最新文件路径 = path.join(日志目录, 最新文件名);
      
      let 行数 = 0;
      if (fs.existsSync(最新文件路径)) {
        const 文件内容 = fs.readFileSync(最新文件路径, "utf8");
        行数 = (文件内容.match(/\n/g) || []).length;
      }
      
      if (行数 < 配置.maxLines) {
        // 未超行数，继续写入当前最新的文件
        目标日志文件名 = 最新文件名;
      }
    }
  } catch (读取目录错误) {
    console.error("读取日志目录失败:", 读取目录错误);
  }

  // 5. 如果没有找到可用文件（或是最新文件已写满），则创建新的时间戳文件
  if (!目标日志文件名) {
    let 尝试序号 = 0;
    let 临时文件名 = 获取时间戳文件名(尝试序号);
    while (fs.existsSync(path.join(日志目录, 临时文件名))) {
      尝试序号++;
      临时文件名 = 获取时间戳文件名(尝试序号);
    }
    目标日志文件名 = 临时文件名;
  }

  const 最终日志路径 = path.join(日志目录, 目标日志文件名);

  // 6. 写入日志
  const 现在时间 = new Date();
  const 时间戳前缀 = `[${现在时间.toLocaleString("zh-CN", { hour12: false })}]`;
  const 格式化日志 = `${时间戳前缀} ${日志内容}\n`;
  try {
    fs.appendFileSync(最终日志路径, 格式化日志, "utf8");
  } catch (写入错误) {
    console.error("写入日志文件失败:", 写入错误);
    return;
  }

  // 7. 防无限膨胀：检查文件总数是否超限，超限则删除旧文件
  try {
    const 目录下所有文件 = fs.readdirSync(日志目录);
    const 匹配的日志文件列表 = 目录下所有文件.filter(文件名 => 日志文件匹配正则.test(文件名));
    
    if (匹配的日志文件列表.length > 配置.maxFiles) {
      匹配的日志文件列表.sort();
      const 超出数量 = 匹配的日志文件列表.length - 配置.maxFiles;
      for (let 索引 = 0; 索引 < 超出数量; 索引++) {
        try {
          fs.unlinkSync(path.join(日志目录, 匹配的日志文件列表[索引]));
        } catch (删除文件错误) {
          // 忽略单个文件删除失败
        }
      }
    }
  } catch (清理旧日志错误) {
    console.error("清理旧日志文件失败:", 清理旧日志错误);
  }
}

