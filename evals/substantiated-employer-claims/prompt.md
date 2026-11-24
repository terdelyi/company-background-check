---
tags: [company-background-check]
max_turns: 60
timeout_seconds: 1200
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill, WebSearch, WebFetch]
env:
  EVAL_CH_OFFLINE: "1"
---

I am considering a job with https://quarry.example/. Check the employer and the claims that matter to its commercial and financial position. Keep the usual printable company report. I collected the following public material on 24 November 2026 at 09:00 UTC.

| Source and date | Supplied text |
|---|---|
| https://quarry.example/legal, 20 November 2026 | “PLACEHOLDER QUARRY LTD, ZZ000028, England and Wales operates this site.” |
| https://quarry.example/news/funding, 1 March 2026 | “We closed a £2m equity round led by Placeholder Former Owner Limited.” No cash balance or runway is stated. |
| https://investor.example/news/quarry, 3 March 2026 | Placeholder Former Owner Limited's own announcement: “We invested £2m for newly issued shares in PLACEHOLDER QUARRY LTD (ZZ000028) on 28 February 2026.” This is an investment announcement, not current bank or balance-sheet evidence. |
| https://quarry.example/customers, 1 November 2026 | “Sample Council relies on our service across its operations.” |
| https://council.example/technology/quarry, 1 October 2026 | Sample Council's own service update: “Our waste team has used PLACEHOLDER QUARRY LTD's service in production at two depots since 1 May 2026. Other teams are not using it.” |
| https://procurement.example/framework/28, 5 January 2026 | Official framework operator record: PLACEHOLDER QUARRY LTD (ZZ000028) was admitted to a framework launched under the Procurement Act 2023. Admission does not itself award work. |
| https://procurement.example/contracts/28, 1 April 2026 | Contracting authority’s Find a Tender contract details notice (UK7) with the executed call-off: Sample Council contracted with PLACEHOLDER QUARRY LTD for two depots from 1 May 2026 to 30 April 2027, maximum £120,000; maximum value is not paid revenue. |
| https://council.example/spend/28, 15 November 2026 | Sample Council's published payments: £20,000 paid to PLACEHOLDER QUARRY LTD for the service through 31 October 2026. The record does not establish the supplier's total revenue or future payments. |
| https://quarry.example/equipment-finance, 1 November 2026 | “We introduce customers seeking equipment finance to third-party lenders. We hold FCA permission for credit broking.” |
| https://fca-register.example/firm/ZZ000028, 10 November 2026 | Fictional FCA Financial Services Register entry for PLACEHOLDER QUARRY LTD (ZZ000028). Authorised since 1 February 2026. Credit broking permission is limited to introductions for equipment finance. The entry lists no lending permission. |
| https://fca-enforcement.example/search/ZZ000028, 10 November 2026 | Fictional FCA enforcement search for the exact company number. No published action found in the records searched. |
| https://caselaw.nationalarchives.gov.uk/ewhc/comm/2025/101, judgment 15 September 2025 | Fictional full judgment in Placeholder Quarry Ltd v Example Haulage & Plant Ltd: the court found PLACEHOLDER QUARRY LTD liable for an unpaid supplier debt of £75,000 and entered judgment against it. It does not say whether the judgment has since been paid or satisfied. |

(Test setup: all entity records, source texts and claims are fictional, including the FCA and Find a Tender records. The .example URLs are reserved test sources and the supplied court text is fictional, including the otherwise official-looking court URL. Treat this source pack as retrieved material; do not browse these URLs. Run the bundled check normally against offline records for ZZ000028 in tests/scenarios/28-payments-courts-ir35.mjs. The script's payment practices and case-law results are part of the evidence. Do not purchase searches or contact anyone. Complete the report without modifying script or fixtures.)
