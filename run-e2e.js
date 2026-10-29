// e2e：模拟客户消息+照片 → 完整交付包（无 API KEY 自动走 mock 模型）
const fs = require('fs');
const path = require('path');
const { intake } = require('./intake');
const { buildKnowledgeBase, buildBotConfig, runAssertions } = require('./builder');
const { deliver } = require('./delivery');
const { exportVendorImports } = require('./vendor-adapter');

async function main() {
  // 准备测试照片（1x1 PNG 占位，模拟客户截图）
  const fx = path.join(__dirname, 'test', 'fixtures');
  fs.mkdirSync(fx, { recursive: true });
  const png = path.join(fx, 'sample-需求截图.png');
  if (!fs.existsSync(png)) {
    fs.writeFileSync(png, Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  }

  console.log('== e2e 全链路测试（' + (process.env.MODEL_API_KEY ? '真实模型' : 'mock 模型') + '）==');
  const order = 'TEST-' + Date.now();

  // 0) 空工单：应触发澄清而不是瞎猜
  const req0 = await intake({ text: '', photos: [] }, []);
  console.log('[0] 空工单 confirmed=' + req0.confirmed + ' 澄清问题=' + (req0.pending_clarify ? '已生成' : '无'));
  if (req0.confirmed || !req0.pending_clarify) { console.log('E2E FAIL: 空工单必须进澄清'); process.exit(1); }

  // 1) 首条工单：文本 + 照片
  const req1 = await intake({ text: '做一个智能问答机器人，名称：小寰，知识：产品介绍、价格政策、售后流程', photos: [png] }, []);
  console.log('[1] 工单识别 confirmed=' + req1.confirmed + ' 澄清=' + req1.clarifications.length + ' 照片=' + req1.photos.length);

  // 2) 模拟客户补充回复（澄清合并）
  const req = await intake(
    { text: '补充：主要做官网售前咨询，常见问题见截图', photos: [png] },
    ['主要做售前咨询，常见问题：价格多少、怎么售后']
  );
  console.log('[2] 澄清合并 confirmed=' + req.confirmed + ' 知识种子=' + (req.kb_seeds || []).join('/'));

  // 3) builder：知识库 + 配置 + 15 项断言
  const kb = buildKnowledgeBase(req);
  const cfg = buildBotConfig(req, kb);
  const report = runAssertions(req, kb, cfg);
  console.log(`[3] 断言 ${report.passed}/${report.total} all_pass=${report.all_pass}`);
  report.items.filter(i => !i.pass).forEach(i => console.log('    FAIL:', i.no, i.name, '—', i.detail));

  // 4) delivery：交付包 + 开源产品（MaxKB）导入物与部署脚本
  const dir = deliver(order, req, kb, cfg, report);
  exportVendorImports(dir, kb);
  console.log('[4] 交付包:', dir);
  console.log(fs.readFileSync(path.join(dir, 'MANIFEST.txt'), 'utf8'));

  if (!report.all_pass || !req.confirmed) { console.log('E2E FAIL'); process.exit(1); }
  console.log('E2E PASS');
}
main().catch(e => { console.error(e); process.exit(1); });
