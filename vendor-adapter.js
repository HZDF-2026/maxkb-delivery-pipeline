// vendor-adapter：把交付物对接到开源产品（主选 MaxKB，备选 FastGPT）
// MaxKB: GPL-3.0，客户私有化部署无额外义务，保留版权即可
const fs = require('fs');
const path = require('path');

const csvEscape = s => (s = String(s), /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);

function exportVendorImports(targetDir, kb) {
  // MaxKB 知识库导入格式：问题,内容
  const maxkb = ['问题,内容', ...kb.entries.map(e => [csvEscape(e.topic), csvEscape(e.answer)].join(','))].join('\r\n');
  fs.writeFileSync(path.join(targetDir, 'maxkb-kb-import.csv'), '\ufeff' + maxkb, 'utf8');

  // FastGPT 导入格式：index,content
  const fg = ['index,content', ...kb.entries.map((e, i) => [i, csvEscape(e.topic + '\n' + e.answer)].join(','))].join('\r\n');
  fs.writeFileSync(path.join(targetDir, 'fastgpt-kb-import.csv'), '\ufeff' + fg, 'utf8');

  fs.writeFileSync(path.join(targetDir, 'install-product.sh'), [
    '#!/usr/bin/env bash',
    '# 产品一键部署脚本（客户云服务器 Ubuntu，需已装 Docker 与 docker-compose）',
    '# 产品：MaxKB（开源知识库问答系统，GPL-3.0，版权归原项目，保留版权声明）',
    'set -e',
    '',
    'echo "[1/3] 拉起 MaxKB 单容器..."',
    'docker run -d --name=maxkb --restart=always -p 8080:8080 -v ~/.maxkb:/var/lib/postgresql/data -v ~/.python-packages:/opt/maxkb/app/sandbox/python-packages 1panel/maxkb',
    '',
    'echo "[2/3] 等待启动并冒烟..."',
    'sleep 40',
    'code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080 || true)',
    '[ "$code" = "200" ] || { echo "冒烟失败 HTTP=$code，请查看 docker logs maxkb"; exit 1; }',
    'echo "冒烟通过：HTTP 200"',
    '',
    'echo "[3/3] 后续人工步骤："',
    'echo " 1) 浏览器打开 http://<服务器IP>:8080，默认账号见交付说明，首次登录立即改密"',
    'echo " 2) 模型管理 -> 添加模型：OpenAI 兼容接口，填客户自己的 API KEY（HTTPS）"',
    'echo " 3) 知识库 -> 导入 maxkb-kb-import.csv"',
    'echo " 4) 按 test-report.md 逐项回归后上线"'
  ].join('\n'), 'utf8');

  fs.writeFileSync(path.join(targetDir, 'PRODUCT-NOTES.md'), [
    '# 产品说明（开源产品改造）',
    '- 本交付基于开源产品 MaxKB（https://github.com/1panel-dev/MaxKB，GPL-3.0）',
    '- 我方提供：需求识别、知识库制作（maxkb-kb-import.csv）、机器人配置（bot-config.json）、部署脚本、回归测试报告',
    '- 产品本体版权与许可归原项目；客户私有化部署无需额外授权，保留版权声明即可',
    '- 备选格式 fastgpt-kb-import.csv 适用于 FastGPT（https://github.com/labring/FastGPT）',
    '- 导入兜底：若 CSV 导入预览列不匹配，改用「导入文本/文档」方式粘贴知识库内容即可'
  ].join('\n'), 'utf8');

  // 重新生成 MANIFEST（包含新增文件）
  const manifest = fs.readdirSync(targetDir);
  fs.writeFileSync(path.join(targetDir, 'MANIFEST.txt'), '交付清单:\n' + manifest.join('\n'), 'utf8');
  return manifest;
}

module.exports = { exportVendorImports };
