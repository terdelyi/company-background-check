# Evidence, funding and ownership

Use this reference when backing, legitimacy, ownership or conflicting financial claims need closer examination. Keep the eleven report sections and existing risk rules. Distinguish a recorded concern from uncertainty about the evidence.

## Resolve the entity before collecting claims

Start with the supplied website. Read its footer, terms, privacy and about pages for the operator's registered name, number and jurisdiction. Cross-check the register and another business identifier, such as sector or directors. Record the domain, brand and relevant employer or contracting entity.

Search funding and press only after this match. Exclude namesakes, including companies using the same brand on a different domain. A website alone does not prove which entity operates it. Ask only when plausible candidates remain after using the supplied context.

## Keep a claim ledger

Keep these notes for material claims; carry attribution into the report.

| Field | Record |
|---|---|
| Entity | Registered name, company number and jurisdiction |
| Claim | Exact amount, currency, accounting label or asserted relationship |
| Dates | Event or accounting period, publication date and retrieval date/time |
| Source | Exact URL, publisher and filing identifier or page where available |
| Inspection | Full document, rendered page, indexed filing text, snippet or company statement |
| Assessment | Supported as a filed fact, independently corroborated, attributed report, inference or unresolved |

Prefer filings for what was filed and original announcements for what was announced. Neither proves present cash or successful delivery. Treat syndicated copies as one evidence origin. Keep conflicting versions and dates; do not choose the larger figure or latest snippet without reconciling them.

## Recover inaccessible evidence without overstating it

If retrieval fails, try the public filing page, an alternative format linked there, then search for the exact company number and filing. Use indexed primary-source text only when it identifies the document and period and preserves labels, units and signs. Cross-check totals, repeated equity figures or comparatives. Describe secondary summaries as corroboration, never as the original filing.

Label this route "Indexed filing text; original document not inspected". Do not claim a PDF was read, a complete note was absent or an audit conclusion was checked from an excerpt. After these alternatives, retain unknown values and the source link. Failed retrieval is a coverage limitation, not adverse company evidence.

## Reconcile the money

- Record whether each amount is a single round, cumulative funding, debt, grant, valuation, acquisition consideration or cash. Record the currency and whether it is announced, committed, closed, estimated or independently evidenced. An investor's name in promotional material does not prove a paid subscription.
- Compare dates, investors and underlying allotments before treating articles as separate rounds. Never add a cumulative total to a round it may include. A replacement or corrected filing is not automatically another transaction. Leave incompatible estimates unresolved rather than manufacturing a precise total.
- Distinguish nominal share capital from issue proceeds and share premium. An allotment or statement-of-capital headline alone does not establish cash received, so open the SH01 form. Its "Amount paid" is per share and includes any premium: multiply it by the number allotted for the money raised, and check whether the form says the shares were allotted for cash. Read a replacement form for the same allotment instead of the original, and count the allotment once.
- Preserve accounting labels. Current assets may include receivables and are not cash. Net assets are not valuation. Negative equity describes a balance-sheet date, not proven current cash insolvency. Explain any later reported financing separately; do not remove the historical flag without the required evidence.
- Do not infer today's workforce from a historic average employee count, especially zero. Directors, contractors and later hires may be outside that figure. Date each headcount estimate and distinguish payroll employees from profile counts.
- Do not calculate current runway without current unrestricted cash and a supported net monthly burn estimate for a compatible period. Historical payroll cover is a narrower ratio, not runway. If these inputs are absent, say runway is unknown and request them.

## Trace control over time

Separate active corporate controllers, minority shareholders, ceased controllers, advisers and commercial partners. A corporate PSC holding more than 25% but no more than 50% is not automatically a parent; require evidence of control, such as majority voting rights, board-appointment rights or accounts identifying a parent. Follow confirmed control links and record their basis and effective dates.

PSC entries can describe indirect rights. Call the relationship inferred unless documentary evidence confirms it. Name an immediate parent only when the evidence establishes that step in the chain.

Treat cessation of PSC status as the end of that declared control, not proof every share was sold. Ownership bands are not exact percentages or a full cap table. If reported dilution conflicts with PSC bands, report the discrepancy and request the current shareholder register and fully diluted cap table. Say "No current corporate parent identified in the records checked" when appropriate; do not rule out wider relationships.

## Material events after the accounts

Start with the year-end of the latest filed accounts, using the verified period end even if the figures could not be read. Use `company.timeline.accounts_year_end` and `events` on the API path, and the latest filed period shown on the register on the public-pages path. Exclude events on or before the start when their effective date is known. If the user specifies a different start, state it and check the source pages for any additional dates needed. If the year-end is unavailable, say so and show the material events identifiable in the sources checked, with the period covered if known.

- Use one row per material event for the matched employer. Include new or satisfied lender security, funding rounds, director appointments and departures, significant control changes, missed accounts or confirmation statements, and reported redundancies. Use the funding, redundancy and news research already done. Keep cumulative funding, routine filings and historical headcount changes in their detailed sections. Link each row to the most direct evidence.
- Put the effective date or deadline first where known. Otherwise use the filing date (the date on the register) or the source's publication date and label it as such. Record the other known dates separately. If only the filing or publication date falls in the window and the effective date is unknown, say so. Keep relevant undated items at the end marked "Date unknown" and say when their place in the period cannot be established. Keep month-only dates at month precision.
- Order the combined rows oldest first by the date shown in the first column. Merge coverage of the same round or redundancy announcement. Treat something proposed, announced or reported as such until the source establishes that it happened. Keep planned dates in the event text. An allotment filing corroborates a round when it matches, and its form gives the amount paid per share.
- Combine filing-history and register records of the same event. Check the current record, original, correction and any relevant annotations if they disagree. Use the effective date of the underlying event and cite the verified correction. Keep the filing dates distinct and record unresolved differences in section 10.
- Check the officers and significant-control registers for changes missing from filing history. Use the appointment, departure or control record as evidence where it provides the date. For a PSC details filing, confirm a material change to control before describing it as one.
- For missed filings, use the register's overdue status with the stated due date. Describe a historical late filing only when both the applicable deadline and filing are evidenced. Check any extensions before calling a filing late.

For new lender security (a charge), open the registration and the attached instrument or deed. Start with `document_url` on the API path, or use the charge's "View PDF" link from the public register. Use the PDF reading methods in [the skill](../SKILL.md#reading-pdf-accounts) if needed. Identify the assets from the operative clause or schedule and cite the document and page. Attribute any parent or other company's security to that entity. State when the charge was satisfied in part or in full if the source says which. Use `register_url` alongside the filing when the register supplies its status or effective date. Where only the satisfaction filing date is known, label it as a filing date.

If the deed is unavailable or unreadable, link the available record and explain why the pledged assets remain unverified. If you inspected the document but could not establish what the relevant clause or schedule covers, state that narrower limit. Use the register for the recorded lender and type of security. Leave the specific assets, loan proceeds and outstanding balance unknown unless the evidence supports them.

Keep the timeline compact: show at most 10 rows. When more events qualify, keep the ones most likely to change the reader's decision, such as new lender security, owner changes and director departures, and say below the table how many were left out with a link to the filing history. When there are no rows, write "No material events found in the sources checked" under the heading, with the window where known. Use no empty table. If relevant sources could not be checked, name those gaps alongside the result and include material `company.timeline.limits`, inaccessible charge documents and unresolved corrections in section 10. The timeline applies the existing rating and scorecard rules.

## Validate credibility claims at their actual scope

Separate legal existence, professional relationships, commercial traction and technical delivery. Registration supports identity; directory inclusion or accelerator membership supports that relationship, not product certification. A partner's own announcement is stronger evidence of a relationship than the company's logo wall, but still does not establish paying customers, revenue or security quality.

Distinguish a technically valid concept from a tested implementation. For material product claims, seek an independently reproducible demonstration, dated audit scope or customer evidence relevant to the user's decision. Label what was not tested. Paywall masking, placeholder text behind sign-up gates and missing public metrics are not, by themselves, signs of misconduct.

## Fit findings into the existing report

Use section 2 for dated accounts and inspection limits, section 3 for current and historical control, section 4 for attributed funding, and section 8 for corroborated relationships and product claims. Put unresolved contradictions and access limits in section 10; keep exact links in section 11. In section 9, prioritise the missing evidence most likely to change the decision: cash and burn, completed subscriptions, current ownership or a reproducible product check.

Retain the existing flag severities and scorecard rules. Explain uncertainty in the relevant area and Coverage of this check. Do not invent a fraud probability, clear a concern because funding was announced, or portray lack of validation as proof of failure.
