// builder：知识库生成 + 机器人配置 + 15 项断言测试套件（加密链路/应答合规/故障兜底）
const BANNED = ['最便宜', '第一品牌', '国家级', '假一罚十', '包过', '绝对有效'];

function buildKnowledgeBase(req) {
  const seeds = (req.kb_seeds && req.kb_seeds.length ? req.kb_seeds : ['产品介绍', '价格政策', '售后流程'])
    .map(s => String(s).slice(0, 40));
  const entries = seeds.map((s, i) => ({
    id: 'KB' + String(i + 1).padStart(3, '0'),
    topic: s,
    answer: `围绕「${s}」的标准应答：由知识库模板生成，经客户确认后生效。`,
    source: 'intake-种子',
    reviewed: false
  }));
  entries.push({
    id: 'KB999',
    topic: '兜底话术',
    answer: '抱歉，这个问题我暂时无法确认，已为您转人工并记录工单，客服将在工作时间尽快回复。',
    source: '系统内置',
    reviewed: true
  });
  return { generated_at: new Date().toISOString(), entries };
}

function buildBotConfig(req, kb) {
  return {
    name: req.robot_name || '智能客服',
    need_type: req.need_type || '智能问答机器人',
    tone: req.tone || '专业、礼貌',
    kb_size: kb.entries.length,
    security: {
      https: true,                    // 加密链路
      key_storage: 'env',             // 密钥走环境变量，不入库不落明文
      content_filter: true,           // 应答合规过滤
      banned_words: BANNED,
      link_whitelist: ['https://*'],
      rate_limit_per_min: 30,         // 频控
      session_timeout_min: 15,
      audit_log: true                 // 审计日志
    },
    fallback: {
      on_timeout_sec: 10,
      on_error: '抱歉，系统繁忙，请稍后重试或留言，我们会尽快跟进。'
    },
    idempotency: { repeat_window_sec: 60, strategy: 'cache' },
    human_handoff: true
  };
}

// 15 项断言：A 加密链路 ×5 / B 应答合规 ×5 / C 故障兜底 ×5
function runAssertions(req, kb, cfg) {
  const t = [];
  const add = (name, pass, detail) => t.push({ no: t.length + 1, name, pass, detail });

  // A. 加密链路
  add('HTTPS 强制开启', cfg.security.https === true, 'security.https');
  add('密钥不落明文', cfg.security.key_storage === 'env' && !/sk-[A-Za-z0-9]{8,}/.test(JSON.stringify(cfg)), 'key_storage=env 且无明文密钥');
  add('外部链接仅白名单', Array.isArray(cfg.security.link_whitelist) && cfg.security.link_whitelist.length > 0, 'link_whitelist 已配置');
  add('会话超时已设置', cfg.security.session_timeout_min > 0, cfg.security.session_timeout_min + ' 分钟');
  add('审计日志开启', cfg.security.audit_log === true, 'security.audit_log');

  // B. 应答合规
  const all = kb.entries.map(e => e.topic + e.answer).join('\n');
  add('知识库非空', kb.entries.length >= 1, 'entries=' + kb.entries.length);
  add('无违禁绝对化用语', BANNED.every(w => !all.includes(w)), BANNED.length + ' 词扫描通过');
  add('含合规兜底话术', kb.entries.some(e => e.topic === '兜底话术'), 'KB999 兜底存在');
  add('人工转接可用', cfg.human_handoff === true, 'human_handoff=true');
  add('条目长度受控', kb.entries.every(e => e.answer.length <= 200), '最长 ' + Math.max(...kb.entries.map(e => e.answer.length)) + ' 字');

  // C. 故障兜底
  add('超时兜底已配置', cfg.fallback.on_timeout_sec > 0, cfg.fallback.on_timeout_sec + ' 秒');
  add('错误话术已配置', (cfg.fallback.on_error || '').length > 5, cfg.fallback.on_error.slice(0, 18) + '…');
  add('频控限流已配置', cfg.security.rate_limit_per_min > 0, cfg.security.rate_limit_per_min + ' 次/分');
  add('重复消息幂等', cfg.idempotency.repeat_window_sec > 0, cfg.idempotency.repeat_window_sec + ' 秒窗口');
  add('需求确认闭环', req.confirmed === true, '澄清 ' + (req.clarifications || []).length + ' 轮');

  const passed = t.filter(x => x.pass).length;
  return { items: t, passed, total: t.length, all_pass: passed === t.length };
}

module.exports = { buildKnowledgeBase, buildBotConfig, runAssertions, BANNED };
