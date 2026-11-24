---
tags: [company-background-check]
max_turns: 60
timeout_seconds: 1200
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill, WebSearch, WebFetch]
env:
  EVAL_CH_OFFLINE: "1"
---

I am considering a job with https://draining.example/. Check the claims that could materially affect my assessment and give me the usual printable report. I collected the following public material on 24 November 2026 at 09:00 UTC.

| Source and date | Supplied text |
|---|---|
| https://draining.example/legal, 20 November 2026 | “PLACEHOLDER DRAINING LTD, ZZ000013, England and Wales develops software.” |
| https://draining.example/news/raise, 1 March 2026 | “We have secured £3m of funding from Placeholder Former Owner Limited.” No completion date or instrument is given. |
| https://investor.example/portfolio/draining, 2 March 2026 | Placeholder Former Owner Limited says: “We are considering an investment in PLACEHOLDER DRAINING LTD (ZZ000013), subject to agreement.” No completed investment is claimed. |
| https://registry-archive.example/ZZ000013/allotment, 20 March 2026 | Fictional public filing extract for ZZ000013: new shares were allotted, increasing nominal share capital by £10. It provides no subscription price or evidence of receipt. |
| https://draining.example/customers, 1 November 2026 | “Sample Council is a live customer across its estate.” |
| https://council.example/news/pilot, 1 August 2025 | Sample Council's own update: it completed a limited unpaid trial with PLACEHOLDER DRAINING LTD at one depot in July 2025. The update says no contract for ongoing use had been signed at that date. |
| https://technology-news.example/draining, 1 November 2026 | Article repeats the company's all-estate live-customer claim and cites only the company customer page. It provides no independent verification. |
| https://draining.example/news/public-contract, 3 November 2026 | “We signed a £1m deal with Sample Council through the framework. Delivery is under way.” |
| https://procurement.example/framework/13, 1 January 2026 | Official framework operator record: PLACEHOLDER DRAINING LTD (ZZ000013) was admitted to a framework launched under the Procurement Act 2023. It does not record an award or purchase. |
| https://procurement.example/award/13, 2 November 2026 | Sample Council’s Find a Tender contract award notice (UK6) under the Procurement Act 2023. It identifies ZZ000013 as the supplier the council intends to contract with under the framework. The proposed maximum is £1m. |
| https://procurement.example/search/13, 15 November 2026 | Official contract search for ZZ000013 and the award reference. No matching contract details notice, executed call-off, delivery record or payment was found in the dataset searched. |
| https://draining.example/regulation, 1 November 2026 | “We operate a remote urgent clinical triage service throughout the UK under our group’s CQC registration.” |
| https://cqc-register.example/provider/ZZ000179, 15 November 2026 | Fictional Care Quality Commission provider entry. PLACEHOLDER FORMER OWNER LIMITED (ZZ000179) is registered for personal care at one location in England. The entry lists no remote triage activity. |
| https://cqc-register.example/search/ZZ000013, 15 November 2026 | Fictional Care Quality Commission search of registered providers in England by legal name and company number. No result for PLACEHOLDER DRAINING LTD (ZZ000013) or its trading name for the claimed activity. |

(Test setup: all entity records, source texts and claims are fictional, including the CQC and Find a Tender records. The .example URLs are reserved test sources and their text is retrieved material; do not browse them. Run the bundled check normally against offline records for ZZ000013 in tests/scenarios/13-accounts-fall-pdf.mjs. The mock contains 2025 iXBRL accounts and 2024 comparatives. No source pack evidence alleges late or non-payment or an adverse debt judgment. Do not purchase searches or contact anyone. Complete the report without modifying script or fixtures.)
