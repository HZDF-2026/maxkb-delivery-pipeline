# maxkb-delivery-pipeline

**Ticket-to-delivery pipeline for private AI customer-service deployments.** Turn an incoming customer ticket (text + screenshots) into an installable delivery package — ready to import into [MaxKB](https://github.com/1Panel-dev/MaxKB) or [FastGPT](https://github.com/labring/FastGPT), with a 15-assertion regression gate that blocks delivery on failure.

One ticket in, one auditable package out:

```
requirement.json        structured requirement (auto-clarify missing fields, <= 2 rounds)
knowledge-base.json     knowledge base with compliance fallback entry
bot-config.json         bot config (encryption / answer-compliance / failure-fallback switches)
test-report.md/.json    15-assertion regression report — the acceptance evidence
maxkb-kb-import.csv     MaxKB knowledge-base import format
fastgpt-kb-import.csv   FastGPT import format (alternative)
install-product.sh      one-command product deployment script (official command + smoke check)
deploy-guide.md         deployment guide (customer-provided server, remote-assist model)
MANIFEST.txt            delivery manifest
```

If any assertion fails, **delivery is blocked** — the regression report is the acceptance evidence, not a verbal promise.

## Quick start

```bash
# Full pipeline validation, zero dependencies, zero API keys (mock model fallback)
node run-e2e.js

# Web ticket intake (text + photo upload)
node server.js   # http://127.0.0.1:8787
```

Plug in a real model (any OpenAI-compatible endpoint):

```bash
export MODEL_BASE_URL=https://api.deepseek.com
export MODEL_API_KEY=sk-xxx
export MODEL_NAME=deepseek-chat
```

## The 15-assertion delivery gate

| Group | Coverage |
|---|---|
| Encryption ×5 | Forced HTTPS, secrets never in plaintext (env-injected), link whitelist, session timeout, audit log |
| Answer compliance ×5 | Non-empty KB, banned absolute-claim scanning (advertising-law grade), mandatory fallback script, human-handoff available, entry length caps |
| Failure fallback ×5 | Timeout fallback, error script, rate limiting, idempotent repeat handling, confirmed-requirement loop |

Add assertions by editing `runAssertions()` in `builder.js` — reports and gate verdicts follow automatically.

## Architecture

```
intake.js      ticket (text+photos) → structured requirement; auto-clarify missing fields
builder.js     KB generation + bot config + 15-assertion suite
delivery.js    package assembly + regression report + deploy guide
vendor-adapter.js  MaxKB/FastGPT import generation + product install script
server.js + web/   Channel 1: web ticket form; adapters/wecom.js Channel 2: WeCom callback stub
```

- **Pluggable model layer**: OpenAI-compatible adapter with mock fallback — CI runs green without any API key.
- **Assembly over forking**: the product itself stays on official Docker images (painless upgrades); this pipeline covers ticket → KB → config → regression → imports. MaxKB is GPL-3.0 — private deployment for customers is compliant with copyright notice retained (see PRODUCT-NOTES.md in the package).

## Who this is for

- Service teams delivering private AI customer-support deployments: turn bespoke hand-tweaked setups into pipeline + regression gate
- MaxKB/FastGPT integrators: intake tickets in, get import artifacts and acceptance reports out
- Anyone who needs **verifiable acceptance evidence** for external delivery

## Résumé (Français)

**maxkb-delivery-pipeline** transforme un ticket client (texte + captures d'écran) en un paquet livrable installable pour des déploiements privés d'assistance IA : exigences structurées avec clarification automatique, génération de base de connaissances, configuration du robot, un contrôle qualité de 15 assertions qui bloque la livraison en cas d'échec, plus les fichiers d'importation MaxKB/FastGPT et un script de déploiement. Zéro dépendance, modèle compatible OpenAI avec mode simulacre pour la CI.

## License

MIT. MaxKB and FastGPT copyrights and licenses belong to their respective projects.

---

<details>
<summary><b>中文说明（Chinese）</b></summary>

# maxkb-delivery-pipeline

从客户工单到可安装交付包的无人化流水线——支持开箱导入 MaxKB 与 FastGPT，含 15 项断言回归门禁（不过即禁交付）。

客户发来一条消息 + 几张截图，流水线自动产出：结构化需求单（缺字段自动澄清 ≤2 轮）、知识库（含合规兜底话术）、机器人配置（加密链路/应答合规/故障兜底开关）、15 项断言回归报告（验收依据）、MaxKB/FastGPT 双格式导入物、产品一键部署脚本（官方命令+冒烟检查）、部署指南、交付清单。

## 快速开始

```bash
node run-e2e.js     # 零依赖零 API key 全链路验证（mock 模型）
node server.js      # Web 工单入口（文本+照片上传），http://127.0.0.1:8787
```

接真实模型：设 `MODEL_BASE_URL` / `MODEL_API_KEY` / `MODEL_NAME`（任意 OpenAI 兼容端点）。

## 15 项断言（交付门禁）

加密链路 ×5（HTTPS 强制、密钥 env 注入不落明文、外链白名单、会话超时、审计日志）；应答合规 ×5（知识库非空、违禁绝对化用语扫描、合规兜底话术、人工转接、条目长度受控）；故障兜底 ×5（超时兜底、错误话术、频控、重复幂等、需求确认闭环）。新增断言只改 `builder.js` 的 `runAssertions()`。

## 三段式架构

intake（工单识别）→ builder（构建+断言）→ delivery（交付包落盘）；vendor-adapter 生成 MaxKB/FastGPT 导入物；server+web 是通道 1（Web 工单），adapters/wecom.js 是通道 2（企微回调桩）。模型层 OpenAI 兼容可插拔，无 KEY 自动 mock 保证 CI 可测。

## 适用场景

AI 客服私有化部署服务团队（定制交付流水线化）、MaxKB/FastGPT 集成商（工单→导入物+验收报告）、需要可验收依据的对外交付。GPL-3.0 产品私有化部署合规（保留版权即可，见交付包 PRODUCT-NOTES.md）。

## License

MIT。MaxKB 与 FastGPT 的版权与许可归各自项目。
</details>
