# maxkb-delivery-pipeline

**Ticket-to-delivery pipeline for private AI customer-service deployments.** 从客户工单到可安装交付包的无人化流水线 —— 支持开箱导入 [MaxKB](https://github.com/1Panel-dev/MaxKB) 与 [FastGPT](https://github.com/labring/FastGPT)。

客户发来一条消息 + 几张截图，流水线自动产出：

```
requirement.json        结构化需求单（缺字段自动澄清，≤2 轮）
knowledge-base.json     知识库（含合规兜底话术）
bot-config.json         机器人配置（加密链路/应答合规/故障兜底全量开关）
test-report.md/.json    15 项断言回归报告（验收依据）
maxkb-kb-import.csv     MaxKB 知识库导入格式
fastgpt-kb-import.csv   FastGPT 导入格式（备选）
install-product.sh      产品一键部署脚本（官方命令 + 冒烟检查）
deploy-guide.md         部署指南（客户自备服务器，远程辅助口径）
MANIFEST.txt            交付清单
```

任何一项断言不过，**禁止交付**——回归报告即验收依据。

## 快速开始

```bash
# 零依赖、零 API key 全链路验证（自动走 mock 模型）
node run-e2e.js

# Web 工单入口（文本 + 照片上传，本地可测）
node server.js   # http://127.0.0.1:8787
```

接真实模型（OpenAI 兼容接口）：

```bash
export MODEL_BASE_URL=https://api.deepseek.com  # 任意 OpenAI 兼容端点
export MODEL_API_KEY=sk-xxx
export MODEL_NAME=deepseek-chat
```

## 15 项断言（交付门禁）

| 类别 | 覆盖 |
|---|---|
| 加密链路 ×5 | HTTPS 强制、密钥不落明文（env 注入）、外链白名单、会话超时、审计日志 |
| 应答合规 ×5 | 知识库非空、违禁绝对化用语扫描（广告法口径）、合规兜底话术、人工转接、条目长度受控 |
| 故障兜底 ×5 | 超时兜底、错误话术、频控限流、重复消息幂等、需求确认闭环 |

新增断言只改 `builder.js` 的 `runAssertions()`，报告与门禁判定自动跟随。

## 三段式架构

```
intake.js      客户消息(文本+照片) → 结构化需求 JSON；缺字段自动澄清 ≤2 轮
builder.js     知识库生成 + 机器人配置 + 15 项断言套件
delivery.js    交付包落盘 + 回归报告 + 部署文档
vendor-adapter.js  MaxKB/FastGPT 导入物生成 + 产品部署脚本（官方命令已核对）
server.js + web/   通道1：Web 工单页（照片上传）；adapters/wecom.js 通道2：企微回调桩
```

- **模型层可插拔**：`model.js` 为 OpenAI 兼容适配器，无 KEY 自动降级 mock（规则式识别），保证 CI 可测。
- **产品组装式交付**：产品本体用官方 Docker 镜像（升级无痛），本流水线只做"需求→知识库→配置→回归→导入物"，GPL-3.0 产品私有化部署合规（保留版权即可，见交付包 PRODUCT-NOTES.md）。

## 适用场景

- AI 客服/AI 助手私有化部署的服务团队：把定制交付从"手工攒配置"变成"流水线 + 回归门禁"
- MaxKB/FastGPT 集成商：工单进来直接产出导入物与验收报告
- 需要"可验收依据"的对外交付：测试报告落盘，不靠口头承诺

## License

MIT. MaxKB 与 FastGPT 的版权与许可归各自项目。
