// delivery：交付物落盘 + 回归测试报告 + 部署文档（远程辅助，客户自备云服务器）
const fs = require('fs');
const path = require('path');

function deliver(orderId, req, kb, cfg, report) {
  const dir = path.join(__dirname, 'out', orderId);
  fs.mkdirSync(dir, { recursive: true });
  const j = (name, obj) => fs.writeFileSync(path.join(dir, name), JSON.stringify(obj, null, 2), 'utf8');

  j('requirement.json', req);
  j('knowledge-base.json', kb);
  j('bot-config.json', cfg);
  j('test-report.json', report);

  const md = [
    '# 回归测试报告',
    '- 订单：' + orderId,
    '- 生成时间：' + new Date().toISOString(),
    '- 断言结果：' + report.passed + '/' + report.total + (report.all_pass ? '（全部通过）' : '（存在失败，禁止交付）'),
    '',
    '| # | 断言 | 结果 | 说明 |',
    '|---|---|---|---|',
    ...report.items.map(i => `| ${i.no} | ${i.name} | ${i.pass ? 'PASS' : 'FAIL'} | ${i.detail} |`),
    '',
    '> 验收依据：以本回归测试报告为准。'
  ];
  fs.writeFileSync(path.join(dir, 'test-report.md'), md.join('\n'), 'utf8');

  fs.writeFileSync(path.join(dir, 'deploy-guide.md'), [
    '# 部署指南（远程辅助部署，客户自备云服务器）',
    '1. 服务器要求：2核4G、Ubuntu 22.04+，开放 443 端口。',
    '2. 拷贝 bot-config.json / knowledge-base.json 至部署目录。',
    '3. 模型密钥经环境变量注入，不写入任何文件。',
    '4. 启用 HTTPS（客户提供证书或 Let\u0027s Encrypt 自动签发）。',
    '5. 按本包 test-report.md 逐项回归，全部 PASS 后上线。'
  ].join('\n'), 'utf8');

  const manifest = fs.readdirSync(dir);
  fs.writeFileSync(path.join(dir, 'MANIFEST.txt'), '交付清单:\n' + manifest.join('\n'), 'utf8');
  return dir;
}

module.exports = { deliver };
