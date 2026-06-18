import 文件系统 from 'fs';
import 路径 from 'path';
import { fileURLToPath } from 'url';

const 当前文件路径 = fileURLToPath(import.meta.url);
const 当前目录 = 路径.dirname(当前文件路径);

function 同步版本() {
  const 配置文件路径 = 路径.join(当前目录, '..', 'package.json');
  const 清单文件路径 = 路径.join(当前目录, '..', 'manifest.json');

  const 配置数据 = JSON.parse(文件系统.readFileSync(配置文件路径, 'utf8'));
  const 新版本号 = 配置数据.version;

  if (!新版本号) {
    console.error('未在 package.json 中找到版本号！');
    process.exit(1);
  }

  const 清单数据 = JSON.parse(文件系统.readFileSync(清单文件路径, 'utf8'));
  清单数据.Version = 新版本号;

  文件系统.writeFileSync(清单文件路径, JSON.stringify(清单数据, null, 2) + '\n', 'utf8');
  console.log(`成功同步版本号 ${新版本号} 到 manifest.json`);
}

同步版本();
