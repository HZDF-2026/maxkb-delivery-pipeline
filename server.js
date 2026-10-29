// 通道1：Web 工单页（文本+照片上传）——本地可测
// 通道2：企微自建应用回调 = adapters/wecom.js（需公网，桩）
const http = require('http');
const fs = require('fs');
const path = require('path');
const { intake } = require('./intake');
const { buildKnowledgeBase, buildBotConfig, runAssertions } = require('./builder');
const { deliver } = require('./delivery');
const { exportVendorImports } = require('./vendor-adapter');

const PORT = process.env.PORT || 8787;
const UP = path.join(__dirname, 'uploads');
fs.mkdirSync(UP, { recursive: true });
const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };
let n = 0;

http.createServer((rq, rs) => {
  if (rq.method === 'GET' && (rq.url === '/' || rq.url.startsWith('/?'))) {
    rs.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return rs.end(fs.readFileSync(path.join(__dirname, 'web', 'index.html')));
  }
  if (rq.method === 'POST' && rq.url === '/api/ticket') {
    let body = '';
    rq.on('data', c => { body += c; });
    rq.on('end', async () => {
      try {
        const { text, photos } = JSON.parse(body);
        const saved = (photos || []).map(p => {
          const m = /^data:([^;]+);base64,(.+)$/.exec(p || '') || [];
          if (!m[2]) return null;
          const f = path.join(UP, `t${Date.now()}-${++n}${EXT[m[1]] || '.png'}`);
          fs.writeFileSync(f, Buffer.from(m[2], 'base64'));
          return f;
        }).filter(Boolean);

        const req = await intake({ text: text || '', photos: saved }, []);
        const kb = buildKnowledgeBase(req);
        const cfg = buildBotConfig(req, kb);
        const report = runAssertions(req, kb, cfg);
        const orderId = 'W' + Date.now();
        const dir = deliver(orderId, req, kb, cfg, report);
        exportVendorImports(dir, kb);

        rs.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        rs.end(JSON.stringify({
          ok: true,
          order_id: orderId,
          confirmed: req.confirmed,
          pending_clarify: req.pending_clarify || null,
          assertions: `${report.passed}/${report.total}`,
          all_pass: report.all_pass,
          delivery_dir: dir
        }, null, 2));
      } catch (e) {
        rs.writeHead(500, { 'Content-Type': 'application/json' });
        rs.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }
  rs.writeHead(404); rs.end('not found');
}).listen(PORT, () => console.log(`工单入口: http://127.0.0.1:${PORT}`));
