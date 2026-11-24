---
tags: [company-background-check]
max_turns: 60
timeout_seconds: 1200
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill, WebSearch, WebFetch]
env:
  EVAL_CH_OFFLINE: "1"
---

I'm interviewing with https://placeholder-opco.example/, the trading name of Placeholder Opco Ltd, company number ZZ000043. Can you run a background check? I collected this public material on 24 November 2026.

| Source and date | Supplied text |
|---|---|
| https://placeholder-opco.example/about, 20 November 2026 | "Founded in 2023 by Alpha Fortythree Example. Remote, London HQ." |
| https://placeholder-opco.example/customers, 20 November 2026 | "Trusted by a leading international law firm, now in a live pilot." No firm, date or outcome is named. |
| https://placeholder-opco.example/news, 20 November 2026 | "Backed by angel investors." No investor or amount is named. |
| https://legal-podcast.example/episode-42, 8 July 2026 | Interview with Alpha Fortythree Example, founder of Placeholder Opco, about the product. It does not mention customers or funding. |
| https://opco-chips.example/, 20 November 2026 | A much larger, unrelated US hardware company also trading as "Opco", with its own funding news and reviews. |

(Test setup: the company, people and sources are fictional. The .example URLs are supplied material, so do not browse them, and web searches will find nothing else about this company. Run the bundled check normally against the offline records for ZZ000043 in tests/scenarios/43-late-filings.mjs. Do not purchase searches or contact anyone. Complete the report without modifying the script or fixtures.)
