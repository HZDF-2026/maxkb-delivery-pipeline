// intake：客户消息（文本+照片）→ 结构化需求 JSON；缺字段自动澄清，最多 2 轮
const fs = require('fs');
const path = require('path');
const { chat, parseJSONLoose } = require('./model');

const REQUIRED = ['need_type', 'robot_name', 'kb_seeds'];
const MAX_CLARIFY = 2;

async function extract(text) {
  try {
    return parseJSONLoose(await chat([
      { role: 'system', content: 'INTAKE_EXTRACT：需求识别器，仅输出JSON：need_type/robot_name/doc_channel/kb_seeds/tone' },
      { role: 'user', content: text }
    ]));
  } catch {
    return { need_type: '智能问答机器人', robot_name: '智能客服', doc_channel: /照片|截图|附件/.test(text), kb_seeds: [], tone: '专业、礼貌' };
  }
}

async function intake(msg, history = []) {
  // msg: { text, photos: [本地路径] }
  const photos = (msg.photos || []).map(p => {
    if (!fs.existsSync(p)) return `[附件:${path.basename(p)}(缺失)]`;
    const kb2 = Math.ceil(fs.statSync(p).size / 1024);
    return `[附件:${path.basename(p)}(已接收,${kb2}KB,已存档)]`;
  });
  const full = [msg.text || '', ...photos].filter(Boolean).join('\n');
  let req = Object.assign(await extract(full), {
    raw_text: msg.text || '',
    photos,
    received_at: new Date().toISOString()
  });

  // 澄清循环（≤2 轮）
  req.clarifications = [];
  for (let round = 1; round <= MAX_CLARIFY; round++) {
    const missing = REQUIRED.filter(k => !req[k] || (Array.isArray(req[k]) && !req[k].length));
    if (!missing.length) break;
    const question = await chat([
      { role: 'system', content: 'CLARIFY：生成一条简短澄清问题。' },
      { role: 'user', content: '缺失字段：' + missing.join(',') }
    ]);
    const answer = history[round - 1] || '';
    req.clarifications.push({ round, question, answer });
    if (!answer) { req.pending_clarify = question; break; } // 等客户回复
    const patch = await extract(full + '\n客户补充：' + answer);
    if (!(patch.kb_seeds || []).length) patch.kb_seeds = req.kb_seeds; // 保留既有种子，防覆盖
    req = Object.assign(req, patch);
    req.kb_seeds = [...new Set(req.kb_seeds)];
  }
  const hasSignal = (msg.text || '').trim() || photos.length;
  if (!(req.kb_seeds || []).length && hasSignal) { req.kb_seeds = ['产品介绍', '价格政策', '售后流程']; req.kb_fallback = true; } // 有实质内容才给通用种子
  req.confirmed = REQUIRED.every(k => req[k] && (!Array.isArray(req[k]) || req[k].length));
  return req;
}

module.exports = { intake, REQUIRED };
