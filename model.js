// 模型适配器：OpenAI 兼容接口可配置；无 API KEY 时自动降级为 mock（规则式），保证全链路可测
const CFG = {
  baseURL: process.env.MODEL_BASE_URL || '',
  apiKey: process.env.MODEL_API_KEY || '',
  model: process.env.MODEL_NAME || 'gpt-4o-mini',
  mock: !process.env.MODEL_API_KEY
};

async function chat(messages) {
  if (CFG.mock) return mockChat(messages);
  const res = await fetch(CFG.baseURL.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CFG.apiKey },
    body: JSON.stringify({ model: CFG.model, messages, temperature: 0.2 })
  });
  if (!res.ok) throw new Error('模型调用失败 HTTP ' + res.status);
  const data = await res.json();
  return data.choices[0].message.content;
}

function parseJSONLoose(s) {
  const i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i < 0 || j < 0) throw new Error('no json');
  return JSON.parse(s.slice(i, j + 1));
}

// mock：规则式识别，无 KEY 也能跑通全链路
function mockChat(messages) {
  const sys = (messages[0] && messages[0].content) || '';
  const user = messages.map(m => (typeof m.content === 'string' ? m.content : '')).join('\n');
  if (sys.includes('INTAKE_EXTRACT')) {
    const name = (user.match(/名称[：:]\s*([^\n，。]+)/) || [])[1];
    const kb = (user.match(/(?:知识|话术|FAQ)[：:]*([^\n]+)/g) || [])
      .map(s => s.replace(/^[^\u4e00-\u9fa5A-Za-z]*/, '').split(/[、，,；;]/))
      .flat().map(s => s.trim()).filter(s => s.length >= 2 && s.length <= 20).slice(0, 8);
    return JSON.stringify({
      need_type: /问答|客服|咨询|售后|售前/.test(user) ? '智能问答机器人' : '业务助手',
      robot_name: (name || '智能客服').trim(),
      doc_channel: /照片|图片|截图|附件/.test(user),
      kb_seeds: kb,
      tone: '专业、礼貌'
    });
  }
  if (sys.includes('CLARIFY')) return '您好，为更快配置机器人，请补充：主要服务场景与常见问题示例。';
  return 'OK';
}

module.exports = { chat, parseJSONLoose, CFG };
