# 独立内容复核契约 v1

本契约用于 `systematic` overview 的第二遍回读。它补在覆盖审计、摘要账本和行动规则账本之后，不能由渲染器从成品摘要反推完成。最终器会拒绝缺少它、引用过期输入、漏掉页面主张或漏掉规则复核的新版系统学习交付。

## 工作顺序

1. 先固定 `page.json`、`source_map.json`、`full_text.txt`、`summary-ledger.json`、`coverage-audit.json`、`action-rule-ledger.json`、`methods.json` 和 `methodology.json`。
2. 按 `source_map.json` 的顺序重新阅读所有 `covered` 来源块。回读者先看来源，再看页面主张；不要复制现成摘要作为复核结论。
3. 对每个内容单元、摘要主张和可见行动规则写下判断及原文证据。证据可以是来源文本短引，或带 SHA-256 的页面/图像转录记录。
4. 搜索编号、步骤、分类、阶段、数量和“全部/仅有”等封闭清单。发现清单时记录原始顺序、总数和每项保留、合并或排除的去向；没有发现也记录搜索范围和原因。
5. 运行 `python scripts/content_review.py content-review.json --page page.json --knowledge-base topic.learnkb`，再运行 `finalize.py`。改动任一输入后必须重新回读并刷新记录，不能只刷新哈希。

## 精确结构

根对象只能包含以下字段：

```json
{
  "schemaVersion": "learn-from-materials/content-review-v1",
  "pageId": "与 page.json.meta.pageId 相同",
  "learningDepth": "systematic",
  "reviewedInputs": {"page": "sha256…", "full_text.txt": "sha256…"},
  "unitReviews": [{
    "unitId": "u01", "status": "completed", "sourceIds": ["s01"],
    "findings": "确认本单元的限定条件和一个未进入页面的例外。",
    "evidence": [{"kind": "text", "sourceId": "s01", "quote": "原文中的连续短引"}]
  }],
  "claimReviews": [{
    "claimId": "claim-001", "status": "supported",
    "note": "引文支持主张；范围只到本单元。",
    "evidence": [{"kind": "text", "sourceId": "s01", "quote": "原文中的连续短引"}]
  }],
  "ruleReviews": [{
    "ruleId": "rule-001", "status": "revised",
    "note": "补上前置条件和停止条件。",
    "evidence": [{"kind": "text", "sourceId": "s01", "quote": "原文中的连续短引"}]
  }],
  "enumeratedLists": {
    "status": "searched", "sourceIds": ["s01"],
    "note": "搜索了编号段、分类标题和明确数量。",
    "lists": [{
      "id": "list-001", "unitId": "u01", "expectedCount": 3,
      "countEvidence": [{"kind": "text", "sourceId": "s01", "quote": "三项"}],
      "countNote": "原文明确说三项。",
      "items": [{
        "id": "list-001-item-1", "order": 1,
        "evidence": [{"kind": "text", "sourceId": "s01", "quote": "第一项"}],
        "claimIds": ["claim-001"], "disposition": "retained", "reason": "页面保留原意"
      }]
    }]
  }
}
```

`reviewedInputs` 必须由 `content_review.py --fingerprints` 计算，且涵盖上述八个输入文件。发布时知识库输出目录改变不会使记录失效；正文、页面数据、账本、方法库或方法论改变都会使记录过期。哈希只证明“记录对应同一输入”，不证明复核者真的正确理解了输入。

每个 `unitId`、`claimId` 和可见 `ruleId` 必须恰好出现一行。主张和规则只能是 `supported` 或 `revised`，不能把仍显示在页面上的内容标成排除。证据来源必须属于该单元，文本引文必须逐字出现在对应来源块中；视觉证据必须是知识库内的相对图片路径、文件哈希和人工转录说明。一个来源块可以支持多个连续主张，不要求一页只对应一条事实。

`coverage-audit.json` 的每个 `covered` 块必须列出已知 `mappedClaims`；内容复核会反向确认每个映射主张确实有证据。真正没有可提炼内容的块可以在覆盖审计中说明原因，但不能用空映射掩盖未读内容。校验器无法发现一个从未进入账本的全新遗漏，因此“全量”仍取决于逐来源回读和人的判断。

清单的 `expectedCount` 必须等于 `items` 长度，`order` 从 1 连续递增。`retained`/`merged` 项必须指向同一单元的可见主张；`excluded` 项不得指向可见主张，并必须解释排除原因。合并不是删除原文项目，而是记录它落入哪个已有主张。

## 语义和布局边界

该记录保存独立回读者的判断，但不是数学上的零遗漏证明，也不是模型能力证明。静态脚本能验证结构、来源范围、引文存在、文件新鲜度和清单去向，不能验证引文是否充分支持解释。不要生成“自动完成”的复核行来满足门禁。

内容复核不替代浏览器验收。`finalize.py` 的初始 manifest 固定为 `status: static-only`、`layoutCheck: not-run`、`visualReview: not-run`；无法运行浏览器时如实交付这一状态。若在获准的浏览器环境运行 `scripts/verify-layout.cjs`，它会检查三主题、390–2105 的断点矩阵、六个模块、调整大小返回和框架/行动图全屏前后几何，并生成独立报告。`scripts/record_layout_review.py` 只接受与 HTML SHA-256 相同且矩阵完整的报告，生成新的 `*.layout-reviewed.delivery.json/.zip`，不覆盖旧交付。自动几何通过仍不等于人工视觉可读性通过；截图须由人查看后才能另行下结论。

旧页面可用 `finalize.py --legacy-rule-ledger` 重新打包，但这只是兼容路径，不会把旧页面伪装成有独立内容复核的新版系统学习交付。
