---
name: "company-background-check"
description: "Run a background check on a UK company as an employer: Companies House records, accounts, directors, parent companies, phoenix-company patterns, Gazette insolvency notices, tribunal decisions, funding, redundancies, media coverage and reviews, delivered as a printable HTML report with a scorecard. Use whenever the user wants to vet, check or research a company they work for, are applying to or have an offer from."
---

# Company background check

Produce a due-diligence report on a company from the point of view of someone who works there or might. The reader wants to know: is this company financially sound, are the people running it trustworthy, and is anything on the public record a warning sign.

Two things matter more than anything else:

- **Flags, not verdicts.** Every claim links to its evidence. Name-based matches are leads to verify, and the report says so. A wrong accusation about a named director is worse than a missed flag.
  - State what the record shows and when: "Placeholder Ltd entered creditors' voluntary liquidation on 2024-03-01", not what it means about anyone. Never call a company or person fraudulent, dishonest, a scam, a rogue or a "phoenix operator", and never guess at motives, in the report or in the chat. "Phoenix pattern" names a pattern in the records, not a person.
  - Say whose record it is. A parent's or another company's finding is theirs, and a director's other companies are theirs, not the employer's.
- **Same layout every time.** Reports get compared side by side, so the template in step 4 is fixed.

## Input

A company name or company number. A job ad, website or location helps disambiguate.

People usually know a business by its brand, and the brand is often not a registered company. If the name has no match on the register, or the matches are plainly a different business, find the legal entity first: search `<brand> "trading as"`, read the footer, terms and privacy pages of its website, and look at supplier listings and news. Confirm the company number, run the check on that entity, pass the brand to the script with `--aka`, and say at the top of the report which company you checked and why. If the brand has passed between companies, check the one operating it now and cover the earlier ones under the phoenix check.

If several companies match the name, ask which one before going further (the script exits 3 with candidates).

If the company is not UK-registered, skip step 1, say so in sections 2 and 3, and use the country's public company register through web search if it has one.

## Step 1 - Companies House (UK companies)

### Path A: the API script (preferred)

Needs Node 18 or later. Run `node --version` first: if it errors or hangs, `node` is probably a broken version-manager shim, so look for a real binary (for example under `~/.nvm/versions/node/*/bin/`) and call that by its full path, or tell the user Node is missing. Do not rewrite the script in another language.

Also needs a free API key in the `COMPANIES_HOUSE_API_KEY` environment variable (created at developer.company-information.service.gov.uk). If it is not set, ask the user for it once. Never print the key or write it into the report.

Run `scripts/ch-check.mjs` from this skill's folder as it is, and write its output to a temp directory. Do not copy, edit or rewrite it: its checks are deterministic so results stay comparable between runs.

```bash
node <skill folder>/scripts/ch-check.mjs "<company number or name>" --aka "<brand, product or website names>" > ch.json
```

`--aka` is optional but worth filling in. Companies House only knows registered names, and many companies trade under a different one: a company registered as "{Name} Holdings Ltd" may sell a product called "{Brand}". Pass every brand, product and website name you can find so the name matching sees them.

Exit codes: `0` JSON report on stdout, `2` no key or API unreachable (use path B), `3` ambiguous name (candidates on stdout, ask the user).

The JSON has `company`, `directors` (active directors plus individual owners who are not directors, each with a `role`), `pscs`, `flags` (already sorted by severity, each with an evidence URL) and `meta` (caps hit, caveats). If `meta.people_without_officer_record` names anyone, the script found no officer record for that owner, so check their other companies by hand as in Path B step 3. Use the flags as given; add context, do not upgrade or drop them. There are two exceptions: the trading-name check below can raise a phoenix rating, and a tribunal decision you have read can raise the tribunal lead.

`company.accounts.history` holds up to three years of accounts, newest first: net assets, cash, average employees and turnover where the filing tagged them, and `format` (`ixbrl`, `pdf` or `unavailable`). The script only reads iXBRL. For the latest year, and for the year before it when the latest has no comparatives, open any `pdf` filing from the filing history and read the same four figures and the going-concern note by hand. Apply the accounts rules below to what you read, and say in "Not checked and limits" which years were read by hand.

`company.gazette` holds the corporate insolvency notices from The Gazette in the last five years that carry this company's number. A petition to wind up appears there weeks before Companies House shows anything, so the script flags one from the last 24 months as high and any other notice as medium. `meta.gazette_name_only` lists notices that matched a name but not the number: open each, and treat it as this company's only if the address or a director's name confirms it, then rate it as the script would and say you did so by hand. If `company.gazette.failed_searches` is not empty, search The Gazette by hand for those names and note it in "Not checked and limits".

`company.parents` follows owners that are companies up to three levels, to the UK parent. Each parent gets the register and Gazette checks but not the director checks, and its findings come back as flags prefixed `parent_` with the same severity, because a parent's insolvency or winding-up reaches the subsidiary's staff too. Present each one as the parent's, never the employer's own: "Parent {name}: …". `meta.parents_not_followed` lists owners registered abroad, with no UK number or beyond three levels. Name them under "Not checked and limits", and for a foreign parent run one web search for insolvency or administration news under its name.

Three employer registers come back as context:

- `company.gender_pay_gap` lists the company's gender pay gap filings by company number, newest first. Employers with 250 or more staff must file, so the size band is the most reliable headcount you have; report it with the years filed in section 8. A late filing is worth a line, not a flag.
- `company.sponsor_register` says whether the company is on the Home Office register of licensed visa sponsors, matched on its name. It lists current sponsors only, so "not found" means not licensed now, never that a licence was revoked. Report it in section 8 and never flag it.
- `company.tribunal_decisions` lists employment tribunal decisions from the last six years that name the company as a respondent, raised together as one low flag. The list says nothing about who won. Open each decision from the last three years whose categories involve pay, wages or dismissal, and read the outcome. If one went against the company, raise the flag to medium, name the decision and link it. Report a claim the company won as context, not as a flag.

### Accounts rules

The script raises these flags from iXBRL accounts. Apply them by hand to PDF accounts and in path B.

- **Going concern** (high): the latest accounts or audit report state a *material uncertainty* about the company continuing as a going concern. The routine audit sentence saying no material uncertainty was found does not count.
- **Net liabilities** (medium): net assets below zero at the latest year end.
- **Net assets fall** (medium): net assets more than halved since the year before, while still positive.
- **Headcount fall** (medium): average employees down by more than a quarter on the year before. Skip it when the earlier year had fewer than 5 employees, where one person leaving is not a trend.

### Path B: public pages (no key, or the script exits 2)

Some environments block outbound API calls. The same data is on the public Companies House site:

1. Web-search `<company name> Companies House` and open the company's page on find-and-update.company-information.service.gov.uk.
2. Read the overview (status, incorporation date, accounts and confirmation statement due dates, previous names), then the People, Filing history, Charges and Insolvency tabs. Open the latest two sets of accounts from the filing history and apply the accounts rules above. Search thegazette.co.uk for corporate insolvency notices under each current and previous name, and rate the ones that show the company number as the script does: a petition to wind up in the last 24 months is high, any other insolvency notice from the last five years is medium.
3. For an owner that is a UK company, open its Companies House page and check its status, filings, insolvency and Gazette notices the same way, up to three levels.
4. Open the appointments page of each active director and of each individual owner (find owners with the officer search, matching name and birth month), and apply the phoenix test below by hand.
5. Record in "Not checked and limits" that path B was used and what could not be opened.

### What counts as a phoenix pattern

A phoenix company is a new company continuing the business of one that went insolvent, usually leaving its debts behind. It is legal in some forms, but it is the pattern that most often leaves staff unpaid. Look at each director's and each individual owner's other companies that are insolvent or dissolved with insolvency history, and count the signals: similar name, same registered postcode (now or previously), same SIC code, and the target company being incorporated within about 3 years of the old one closing.

- Insolvency plus a similar name plus one more signal: **strong** (high severity).
- Insolvency plus any one other signal: **possible** (medium).
- One dissolved company with no insolvency is normal housekeeping, not a flag.
- A members' voluntary liquidation is a solvent wind-up: the directors declare the company can pay its debts in full, and groups use it to close subsidiaries they no longer need. It is not insolvency. The script marks these `solvent_liquidation` and leaves them out of the phoenix test and the Insolvent count. In path B, open the Insolvency tab before counting a liquidation as insolvency.
- **Serial cycling**: two or more closed companies in the last 10 years that share the target's name (current or previous names on either side) or its registered postcode. Some operators open a new company every year or two, move the business across and close or merge the old one, so each step looks harmless and only the chain gives it away. Medium at two, high at three or more or when any of them was insolvent. List the chain in date order with each company's years.

Companies House does not record that one company's business was merged into another. The chain of shared directors, names and addresses is the evidence: present it as that, and do not state a merger as fact unless a filing or news source confirms it.

If the director resigned from the old company well before it failed, say so; it weakens the link.

**Trading-name check (do this by hand).** The register does not record what a company traded as, so the script cannot see that an insolvent company with an unrelated registered name sold the same product the target is now named after. For every company in `failed_companies` with the `insolvency` signal, find out what it traded as: search `<old company name> trading as`, read its Gazette notices, look for a brand page on a company-data site, and check the target's website for old terms and conditions naming a different company. If it traded under the target's name or brand, count that as a similar name and re-rate with the rules above. Say in the report that you raised the rating by hand and link the evidence.

**Previous addresses.** A liquidator moves the registered office to their own address, so the current address of an insolvent company tells you nothing. The script compares earlier registered offices from the filing history. In path B do the same by hand, and also compare the "principal trading address" printed in the Gazette notice.

## Step 2 - Web research

Run these searches (in parallel where possible), look back about five years, and keep the most recent items first. Before using any hit, confirm it is about this company and not a namesake: check location, sector or a director's name.

| Topic | Search for | Capture |
|---|---|---|
| Funding and investment | `<name> funding round raised investment`, `<name> acquired acquisition investors` | Date, type (seed, Series A, grant, debt, acquisition), amount, investors or acquirer |
| Redundancies | `<name> redundancies layoffs job cuts`, `<name> restructuring` | Date, what happened, how many or what share of staff |
| Media coverage | `<name> news`, `<name> <CEO or founder name>` | Up to 8 items: date, outlet, headline, tone |
| Legal and financial trouble | `<name> administration insolvency winding up`, `<name> employment tribunal`, `<name> The Gazette notice`, `<name> lawsuit fine investigation` | Tribunal decisions, winding-up petitions, regulator action, unpaid wages or other money owed to staff |
| Paying suppliers | Search the company on check-payment-practices.service.gov.uk (only larger companies report) | Average days to pay and share paid within 30 days in the latest report. More than 60 days on average, or under half paid on time, is a Caution under Money |
| Minimum wage | `HMRC national minimum wage named employers <name>` and the latest gov.uk naming list | A named entry that matches the company's name and town is a medium flag under Legal and insolvency notices, linked to the list |
| Employee reviews | `<name> Glassdoor reviews`, `<name> Indeed reviews` | Rating, review count, recurring themes |
| Presence | `<name> LinkedIn`, the company website | Headcount and trend if visible, whether the site and the registered details agree, current hiring |

**Tone labels for media items.** Label each item Positive, Neutral or Negative for what it says about the company as a business and employer, not for the writer's style. Growth, funding, awards and contract wins are Positive. Layoffs, losses, disputes, regulatory action and unpaid bills are Negative. The company's own press releases and sponsored pieces are Neutral and marked "(own PR)". The overall tone is Positive, Mixed, Negative or Little coverage.

**Review sites.** Glassdoor and LinkedIn have no public API and forbid scraping, so use only what search results and openly readable pages show. Report a rating only if a source states it; otherwise write "Not found". Never estimate one.

**Directors are people.** Report only their company roles and business press. Leave out home addresses, dates of birth, family and personal social media.

## Step 3 - Risk rating

- **HIGH** - any high-severity flag from step 1 (non-active status, overdue accounts, insolvency, strike-off notice, winding-up petition in the last 24 months, going-concern material uncertainty, strong phoenix pattern, serial company cycling, disqualification with a date-of-birth match), or credible reports of insolvency or of unpaid wages or other money owed to staff.
- **MEDIUM** - any medium-severity flag, redundancies in the last 12 months, mostly negative coverage, or a review rating below 3.0.
- **LOW** - none of the above.

If Companies House could not be checked for a UK company, write the rating as "LOW (limited data)" at best. A missing check is not a clean result.

## Step 4 - The report

The report is one self-contained HTML page. Its content follows the outline below, and its look comes from the page shell described below. Fill in the outline first. All eleven sections appear every time, in this order, with these headings and table columns. If a section has nothing, keep the heading and write "Nothing found." Do not add, rename, merge or reorder sections; anything that does not fit goes in "Not checked and limits". Dates are YYYY-MM-DD. Every row that makes a claim carries a link.

Save the page as `<company-name>-background-check.html` and send it as a file. Do not publish it to a shareable URL: it puts real people's names next to risk flags, and who sees it is the user's call. In the chat, give only the risk rating with its reason and anything important you could not check; the detail lives in the file. If the user asks for plain text instead, give the outline as markdown.

```markdown
# Background check: {Company name}

**Checked:** {YYYY-MM-DD} | **Company no.:** {number or n/a} | **Jurisdiction:** {e.g. England and Wales}
**Risk:** {LOW | MEDIUM | HIGH} - {one sentence giving the main reason}

## 1. Red flags

| Severity | Flag | Evidence |
|---|---|---|
| {High/Medium/Low/Info} | {what was found} | [{source}]({url}) |

## 2. Company record

| Field | Value |
|---|---|
| Status | |
| Incorporated | {date} ({age}) |
| Registered office | |
| Nature of business (SIC) | |
| Previous names | |
| Last accounts | {made up to} ({type}) |
| Next accounts due | {date} {OVERDUE if so} |
| Confirmation statement | {next due} {OVERDUE if so} |
| Outstanding charges | |
| Insolvency history | |
| Source | [Companies House]({url}) |

**Financials** (up to three years, newest first; "n/a" where a figure was not tagged or stated)

| Year end | Net assets | Cash | Avg employees | Turnover | Format |
|---|---|---|---|---|---|
| {YYYY-MM-DD} | {£} | {£} | {n} | {£} | {iXBRL, PDF (read by hand) or Unavailable} |

## 3. Directors and owners

| Name | Role | Since | Other appointments | Dissolved | Insolvent | Notes |
|---|---|---|---|---|---|---|

**Owners (PSCs):** {names and level of control}
**Group:** {UK parents in order up the chain, each with its status and any finding, or "No corporate owner"; owners not followed and why}
**Phoenix check:** {None found | Possible | Strong | Serial} - {one sentence, naming the companies involved; for a chain, list them in date order with their years}

## 4. Funding and investment

| Date | Event | Amount | Investors / parties | Source |
|---|---|---|---|---|

## 5. Redundancies and layoffs

| Date | What happened | Scale | Source |
|---|---|---|---|

## 6. Media coverage

**Overall tone:** {Positive | Mixed | Negative | Little coverage}

| Date | Outlet | Headline | Tone | Link |
|---|---|---|---|---|

## 7. Employee reviews

| Site | Rating | Reviews | Recurring themes |
|---|---|---|---|

## 8. Web and LinkedIn presence

- **Website:** {url, and whether it matches the registered details}
- **LinkedIn:** {headcount and trend, or Not found}
- **Hiring:** {open roles seen, or Not found}
- **Size (gender pay gap):** {latest size band and the years filed, or "Not on the register (under 250 staff, or not filing)"}
- **Visa sponsor:** {Licensed, with type and rating | Not on the current register}

## 9. Verify next

1. {The check that would most change this picture, with a link to where to do it}
2. {The next most useful check}

## 10. Not checked and limits

- {Which Companies House path was used; caps hit; pages that could not be opened; name matches that still need verifying}

## 11. Sources

- [{title}]({url})
```

### Verify next

This section is for the reader. List the checks you could not complete that would most change the picture, most useful first, each with a link to where to do it. Three to five items. Include one question worth putting to the employer when there is one.

When the risk is Medium or High, or the latest accounts show net liabilities, one item is always a search of the register of County Court Judgments on TrustOnline (https://www.trustonline.org.uk), noting the small fee. An unpaid judgment is one of the earliest public signs that a company cannot pay its bills, and no free source shows it. Never run that search yourself: paying for it is the user's call.

The section is not a place for notes about this skill: if a run exposes a gap in the script or in these instructions, tell the user in the chat instead.

### Scorecard

The page opens with a scorecard so the reader gets the picture before the detail: the overall risk from step 3, then the same eight areas every time, in this order. Each area gets one status and one line of text.

| Area | What it covers |
|---|---|
| Company record | Status, age, filings, registered office |
| People and phoenix check | Directors, owners, phoenix and cycling patterns, disqualifications |
| Money | Accounts (net assets, cash, going concern), charges, funding, paying suppliers |
| Redundancies | Layoffs, restructuring and a falling headcount in the accounts |
| Legal and insolvency notices | Gazette notices, tribunal decisions, minimum wage naming, regulator action |
| Media coverage | Tone of press coverage |
| Employee reviews | Glassdoor, Indeed and similar |
| Coverage of this check | How complete this check was |

Statuses:

- **Concern** - a high-severity finding in that area.
- **Caution** - a medium-severity finding, or a gap that matters.
- **Clear** - checked, nothing adverse.
- **No data** - nothing to judge from.

For "Coverage of this check": Clear when the API path ran with no caps hit, Caution for path B, stale data or caps hit, Concern when the registry could not be checked at all. The scorecard never contradicts the Red flags table: every high flag shows as a Concern in its area. A `parent_` flag counts in the same area as the flag without the prefix, and the area's line names the parent.

### Page shell

The shell is `references/report-shell.html` in this skill's folder. Read it, then copy it exactly, including the whole style block, and only replace the `{placeholders}`. Do not restyle it, add scripts, or load fonts or images: the page has to work offline and print cleanly on A4. Every outline section becomes a `<section>` with an `<h2>`, without the numbers. Wrap tables in `.table-wrap`, put dates and amounts in `class="nowrap"` cells, and use the chip classes for severity and tone. The footer wording is fixed.
