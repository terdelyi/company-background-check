---
name: "company-background-check"
description: "Run a background check on a UK company as an employer: Companies House records, accounts, directors, parent companies, phoenix-company patterns, Gazette insolvency notices, tribunal decisions, funding, redundancies, media coverage and reviews, delivered as a printable HTML report with a scorecard. Use whenever the user wants to vet, check or research a company they work for, are applying to or have an offer from."
---

# Company background check

Produce a due-diligence report on a company from the point of view of someone who works there or might. The reader wants to know: is this company financially sound, are the people running it trustworthy, and is anything on the public record a warning sign.

Two things matter more than anything else:

- **Flags, not verdicts.** Every claim links to its evidence. Name-based matches are leads to verify, and the report says so. A wrong accusation about a named director is worse than a missed flag.
  - State what the record shows and when: "Placeholder Ltd entered creditors' voluntary liquidation on 2024-03-01", not what it means about anyone. Never call a company or person fraudulent, dishonest, a scam, a rogue or a "phoenix operator", and never guess at motives, in the report or in the chat. "Phoenix pattern" names a pattern in the records, not a person.
  - Say whose record it is. A parent's or another company's finding is theirs, and a director's other companies are theirs, not the employer's. In the red flags table, a flag that is not the employer's own record carries a tag naming whose it is: "Parent company" for `parent`, "Director's other company" for `director`, "Group company" or "Another company" for findings you add by hand.
- **Same layout every time.** Reports get compared side by side, so the template in step 4 is fixed.

## Input

A company name or company number. A job ad, website or location helps disambiguate.

People usually know a business by its brand, and the brand is often not a registered company. If the name has no match on the register, or the matches are plainly a different business, find the legal entity first: search `<brand> "trading as"`, read the footer, terms and privacy pages of its website, and look at supplier listings and news. Confirm the company number, run the check on that entity, pass the brand to the script with `--aka`, and say at the top of the report which company you checked and why. If the brand has passed between companies, check the one operating it now and cover the earlier ones under the phoenix check.

If several companies match the name, ask which one before going further (the script exits 3 with candidates).

If the company is not UK-registered, skip step 1, say so in sections 2 and 3, and use the country's public company register through web search if it has one.

## Step 1 - Companies House (UK companies)

### Path A: the API script (preferred)

Needs Node 18 or later. Run `node --version` first: if it errors or hangs, `node` is probably a broken version-manager shim, so look for a real binary (for example under `~/.nvm/versions/node/*/bin/`) and call that by its full path, or tell the user Node is missing. Do not rewrite the script in another language.

Also needs a free API key in the `COMPANIES_HOUSE_API_KEY` environment variable (created at developer.company-information.service.gov.uk). Do not check for it yourself: run the script, and if it exits 2 with "COMPANIES_HOUSE_API_KEY not set", ask the user for the key once, or use path B if they have none. Never print the key or write it into the report.

Run `scripts/ch-check.mjs` from this skill's folder as it is, and write its output to a temp directory. Do not copy, edit or rewrite it: its checks are deterministic so results stay comparable between runs.

```bash
node <skill folder>/scripts/ch-check.mjs "<company number or name>" --aka "<brand, product or website names>" > ch.json
```

Fill in `--aka` before the first run. Companies House only knows registered names, and many companies trade under a different one: a company registered as "{Name} Holdings Ltd" may sell a product called "{Brand}", or rebrand to initials without changing its registered name. The script searches The Gazette, tribunal decisions and the sponsor register under every name it is given, and matches directors' other companies against them, so a missing brand is a missed check. Open the company's website first (its home page, footer and about page) and pass every brand, trading name, product and website name you find. If later research turns up one you did not pass, run the script again with it added and use the new output. The report header lists only trading names, the names the company itself trades under, and only when one differs from the registered name. Products go to the script but not into the header.

Exit codes: `0` JSON report on stdout, `2` no key or API unreachable (use path B), `3` ambiguous name (candidates on stdout, ask the user).

The JSON has `company`, `directors` (active directors plus individual owners who are not directors, each with a `role`), `pscs`, `flags` (already sorted by severity, each with an evidence URL and a `record` of `own`, `parent` or `director` saying whose record it comes from) and `meta` (caps hit, caveats). If `meta.people_without_officer_record` names anyone, the script found no officer record for that owner, so check their other companies by hand as in Path B step 3. Use the flags as given; add context, do not upgrade or drop them. There are two exceptions: the trading-name check below can raise a phoenix rating, and a tribunal decision you have read can raise a tribunal lead.

`company.accounts.history` holds up to five years of accounts, newest first: net assets, net current assets, cash, average employees, turnover, profit and staff costs where the filing tagged them, `payroll_months_in_cash` (cash divided by a month of staff costs), and `format` (`ixbrl`, `pdf` or `unavailable`). The script only reads iXBRL. For the latest year, and for the year before it when the latest has no comparatives, read any `pdf` year as in "Reading PDF accounts" below: the same four figures and the going-concern note. Apply the accounts rules below to what you read, and say in "Not checked and limits" which years were read by hand.

`company.gazette` holds the corporate insolvency notices from The Gazette in the last five years that carry this company's number. A petition to wind up appears there weeks before Companies House shows anything, so the script flags one from the last 24 months as high and any other notice as medium. `meta.gazette_name_only` lists notices that matched a name but not the number: open each, and treat it as this company's only if the address or a director's name confirms it, then rate it as the script would and say you did so by hand. If `company.gazette.failed_searches` is not empty, search The Gazette by hand for those names and note it in "Not checked and limits".

`company.parents` follows owners that are companies up to three levels, to the UK parent. Each parent gets the register and Gazette checks but not the director checks, and its findings come back as flags prefixed `parent_` with the same severity, because a parent's insolvency or winding-up reaches the subsidiary's staff too. Present each one as the parent's, never the employer's own: "Parent {name}: …". Owners recorded without a company number are found by an exact name search and marked `matched_by: "name"`: say so in "Not checked and limits". `meta.parents_not_followed` lists owners registered abroad, owners whose name matched no single company, and owners beyond three levels. Name them under "Not checked and limits", and for a foreign parent run one web search for insolvency or administration news under its name.

Three employer registers come back as context:

- `company.gender_pay_gap` lists the company's gender pay gap filings by company number, newest first. Employers with 250 or more staff must file, so the size band is the most reliable headcount you have; report it with the years filed in section 8. A late filing is worth a line, not a flag.
- `company.sponsor_register` says whether the company is on the Home Office register of licensed visa sponsors, matched on its name. It lists current sponsors only, so "not found" means not licensed now, never that a licence was revoked. Report it in section 8 and never flag it.
- `company.tribunal_decisions` lists employment tribunal decisions from the last six years that name the company as a respondent, raised together as one low flag. The list says nothing about who won. Open each decision from the last three years whose categories involve pay, wages or dismissal, and read the outcome. If one went against the company, raise the flag to medium, name the decision and link it. Report a claim the company won as context, not as a flag.

### Accounts rules

The script raises these flags from iXBRL accounts. Apply them by hand to PDF accounts and in path B.

- **Going concern** (high): the latest accounts or audit report state a *material uncertainty* about the company continuing as a going concern. The routine audit sentence saying no material uncertainty was found does not count.
- **Net liabilities** (medium): net assets below zero at the latest year end.
- **Net assets fall** (medium): net assets more than halved since the year before, while still positive.
- **Headcount fall** (medium): average employees in the latest year more than a quarter below the highest year in the history, so cuts spread over several years still count. Skip it when that highest year had fewer than 5 employees, where one person leaving is not a trend.

### Reading PDF accounts

A `pdf` year carries `document`: `url` downloads the PDF without an API key, `pages` is its length, and `scanned: true` means it was filed on paper and has no text layer. In path B, the filing history's "View PDF" link is the same file. Download it with `curl -sL -o accounts.pdf "<url>"`. The figures are on the balance sheet (net assets, cash), the profit and loss account (turnover) and the employees note, and the going-concern wording is in the directors' report and the audit report.

Use the first of these that works where you are running:

1. Your own file reader, if it shows you PDF pages as images. Read only the pages you need.
2. If the PDF is not scanned: `pdftotext -layout accounts.pdf -`.
3. If it is scanned, or no text came out: on macOS, run `osascript -l JavaScript <skill folder>/scripts/pdf-text-macos.js /absolute/path/accounts.pdf [first page] [last page]`. It needs nothing installed and recognises scanned pages with the system's own text recognition. Elsewhere, if `pdftoppm` and `tesseract` are installed, run `pdftoppm -r 200 -png accounts.pdf page`, then `tesseract <page image> -` on each page you need.
4. If none of these works, do not install anything without asking the user. Write the year's format as "PDF (not read)" with n/a figures, link the PDF in "Verify next", and rate Coverage of this check as Caution.

Recognised text can misread digits. Before using a figure, check it against a second place it appears: net assets also appear as total equity, and the next year's accounts repeat this year's figures as comparatives.

### Path B: public pages (no key, or the script exits 2)

Some environments block outbound API calls. The same data is on the public Companies House site:

1. Web-search `<company name> Companies House` and open the company's page on find-and-update.company-information.service.gov.uk.
2. Read the overview (status, incorporation date, accounts and confirmation statement due dates, previous names), then the People, Filing history, Charges and Insolvency tabs. Open the latest two sets of accounts from the filing history, read them as in "Reading PDF accounts" and apply the accounts rules above. Search thegazette.co.uk for corporate insolvency notices under each current and previous name, and rate the ones that show the company number as the script does: a petition to wind up in the last 24 months is high, any other insolvency notice from the last five years is medium.
3. For an owner that is a UK company, open its Companies House page and check its status, filings, insolvency and Gazette notices the same way, up to three levels.
4. Open the appointments page of each active director and of each individual owner (find owners with the officer search, matching name and birth month), and apply the phoenix test below by hand.
5. Record in "Not checked and limits" that path B was used and what could not be opened.

### What counts as a phoenix pattern

A phoenix company is a new company continuing the business of one that went insolvent, usually leaving its debts behind. It is legal in some forms, but it is the pattern that most often leaves staff unpaid. Look at each director's and each individual owner's other companies that are insolvent or dissolved with insolvency history, and count the signals: similar name, same registered postcode (now or previously), same SIC code, and the target company being incorporated within about 3 years of the old one failing. A company fails when its insolvency case starts (a petition, a winding-up order, administration), not when it is dissolved, which can be years later.

- Insolvency plus a similar name plus one more signal: **strong** (high severity).
- Insolvency plus any one other signal: **possible** (medium).
- One dissolved company with no insolvency is normal housekeeping, not a flag.
- A members' voluntary liquidation is a solvent wind-up: the directors declare the company can pay its debts in full, and groups use it to close subsidiaries they no longer need. It is not insolvency. The script marks these `solvent_liquidation` and leaves them out of the phoenix test and the Insolvent count. In path B, open the Insolvency tab before counting a liquidation as insolvency.
- **Serial cycling**: two or more closed companies in the last 10 years that share the target's name (current or previous names on either side) or its registered postcode. Some operators open a new company every year or two, move the business across and close or merge the old one, so each step looks harmless and only the chain gives it away. Medium at two, high at three or more or when any of them failed while the director was in post. Solvent liquidations are listed in the chain but do not count towards the three for high. List the chain in date order with each company's years. A company in the target's own group, meaning a subsidiary or a sister owned by one of the target's parents, that closed without insolvency is the group tidying up, not cycling: the script marks these `group_member` and leaves them out. In path B, open the Persons with significant control tab of each closed company before counting it.

Companies House does not record that one company's business was merged into another. The chain of shared directors, names and addresses is the evidence: present it as that, and do not state a merger as fact unless a filing or news source confirms it.

A director who left the old company more than a year before it failed did not run it into insolvency, so it is not linked to them: no phoenix rating, and it does not count towards their insolvencies. The script marks these `director_left_before_failure` and dates the failure as `insolvent_from`. The same goes for a director appointed after the failure, marked `director_joined_after_failure`. In path B, check the appointment and resignation dates against the Insolvency tab. List such companies in the report only as context, and say when the director left. Directors of a company in liquidation often stay on the register with no resignation date, although their powers ended when it went into liquidation. Write that they were a director when it went into liquidation and that no resignation is recorded, not that they are a director of it.

For each failed company still linked to a director, the script also searches employment tribunal decisions that name it as respondent, at any date, attaches them as `tribunal_decisions` and raises one low `failed_company_tribunals` flag per company. Claims for unpaid wages, notice or redundancy pay at a company that failed are the clearest sign its staff were left unpaid. Open the decisions about pay and read the outcome. If one went against the company, raise the flag to medium, link it and mention it in the phoenix check. It searches the 10 most relevant companies, phoenix matches first: name `meta.failed_company_tribunals.not_searched` and `failed_searches` under "Not checked and limits". The search uses the registered name, which often runs words together ("MYHEALTHBOX") where a decision spaces them ("My Health Box"). For such a name, search the [tribunal decisions](https://www.gov.uk/employment-tribunal-decisions) by hand with the words split.

**Trading-name check (do this by hand).** The register does not record what a company traded as, so the script cannot see that an insolvent company with an unrelated registered name sold the same product the target is now named after. For every company in `failed_companies` with the `insolvency` signal, find out what it traded as: search `<old company name> trading as`, read its Gazette notices, look for a brand page on a company-data site, and check the target's website for old terms and conditions naming a different company. If it traded under the target's name or brand, count that as a similar name and re-rate with the rules above. Say in the report that you raised the rating by hand and link the evidence.

**Previous addresses.** A liquidator moves the registered office to their own address, so the current address of an insolvent company tells you nothing. The script compares earlier registered offices from the filing history. In path B do the same by hand, and also compare the "principal trading address" printed in the Gazette notice.

### Other patterns that leave staff unpaid

A phoenix is one of several legal or semi-legal setups that can leave staff owed money when a company fails. When the government pays staff of a failed employer, it caps a week's pay and pays at most 8 weeks of arrears, so the setup matters. Each check below names a pattern in the records, never a motive. Report what the record shows, and rate it as stated.

- **Employer without assets.** The script raises `employer_without_assets` (low) when a company with 10 or more staff owes more than it owns, or its short-term debts exceed its short-term assets. Find out which company owns the brand, the website domain, the customer contracts and any trade marks: the website's terms and privacy pages, the UK trade mark register (https://trademarks.ipo.gov.uk), and the group's accounts. If a related company holds them while the employer has net liabilities, raise the flag to medium and say which company holds what, with links. If the employer owns them itself, keep it low and say so.
- **Pre-pack sale.** For every insolvent company in the phoenix check that went into administration, open its filing history for the administrator's proposals and any SIP 16 statement (the administrator's report on a sale agreed before the administration started). If the business was sold to the target, or to another company of the same directors, say so and link it. It counts as a similar name in the phoenix test even when the names differ.
- **Financial year extended.** The script raises `year_end_extended` from the filing history: low for one extension in five years, medium for two or more. Lengthening the year pushes back when the next accounts are due. Mention it under Money and say when the next accounts are now due.
- **Reliance on the group.** When reading full accounts, note the amounts owed to other group companies, management charges paid to a parent, and whether the going-concern note relies on a parent's promise of support. Report these under Money as context, not as a flag, unless the parent providing support has its own finding.
- **Unpaid pension contributions.** See the Pensions Regulator row in step 2. Missing pension payments are often the first sign that a company is short of cash.
- **Contractor-only hiring.** If the company's job ads offer roles that look permanent only through an umbrella company or the worker's own limited company, mention it under section 8 as context. It moves employment rights and tax risk onto the worker.

## Step 2 - Web research

Run these searches (in parallel where possible), look back about five years, and keep the most recent items first. `<name>` means the registered name and every trading name you passed to `--aka`: press, LinkedIn pages and review sites usually use the brand, so a search under the registered name alone misses them. Before using any hit, confirm it is about this company and not a namesake: check location, sector or a director's name. A short brand such as a set of initials matches many unrelated businesses, so pair it with the sector or town.

| Topic | Search for | Capture |
|---|---|---|
| Funding and investment | `<name> funding round raised investment`, `<name> acquired acquisition investors` | Date, type (seed, Series A, grant, debt, acquisition), amount, investors or acquirer |
| Redundancies | `<name> redundancies layoffs job cuts`, `<name> restructuring`, then `<name> job cuts <year>` for each of the last five years the first results do not cover | Every round in the last five years, newest first: date, what happened, how many or what share of staff. Add any year-on-year fall in average employees from the accounts history |
| Media coverage | `<name> news`, `<name> <CEO or founder name>` | Up to 8 items: date, outlet, headline, tone |
| Legal and financial trouble | `<name> administration insolvency winding up`, `<name> employment tribunal`, `<name> The Gazette notice`, `<name> lawsuit fine investigation` | Tribunal decisions, winding-up petitions, regulator action, unpaid wages or other money owed to staff |
| Paying suppliers | Search the company on check-payment-practices.service.gov.uk (only larger companies report) | Average days to pay and share paid within 30 days in the latest report. More than 60 days on average, or under half paid on time, is a Caution under Money |
| Unpaid pensions | Search the company's name on the Pensions Regulator's published penalty notices and court orders (https://www.thepensionsregulator.gov.uk/en/document-library/enforcement-activity/penalty-notices) and `<name> pensions regulator penalty` | A named entry that matches the company's name and town is a medium flag under Legal and insolvency notices, linked to the notice |
| Minimum wage | `HMRC national minimum wage named employers <name>` and the latest gov.uk naming list | A named entry that matches the company's name and town is a medium flag under Legal and insolvency notices, linked to the list |
| Employee reviews | `<name> Glassdoor reviews`, `<name> Indeed reviews` | Rating, review count, recurring themes |
| Presence | `<name> LinkedIn`, the company website | Headcount and trend if visible, whether the site and the registered details agree, current hiring |

**Tone labels for media items.** Label each item Positive, Neutral or Negative for what it says about the company as a business and employer, not for the writer's style. Growth, funding, awards and contract wins are Positive. Layoffs, losses, disputes, regulatory action and unpaid bills are Negative. The company's own press releases and sponsored pieces are Neutral and marked "(own PR)". The overall tone is Positive, Mixed, Negative or Little coverage.

**Review sites.** Glassdoor and LinkedIn have no public API and forbid scraping, so use only what search results and openly readable pages show. Report a rating only if a source states it; otherwise write "Not found". Never estimate one.

**Directors are people.** Report only their company roles and business press. Leave out home addresses, dates of birth, family and personal social media.

## Step 3 - Risk rating

- **HIGH** - any high-severity flag from step 1 (non-active status, overdue accounts, insolvency, strike-off notice, winding-up petition in the last 24 months, going-concern material uncertainty, strong phoenix pattern, serial company cycling, disqualification with a date-of-birth match), or credible reports of insolvency or of unpaid wages or other money owed to staff.
- **MEDIUM** - any medium-severity flag, redundancies in the last 12 months, two or more rounds of redundancies in the last five years, mostly negative coverage, or a review rating below 3.0.
- **LOW** - none of the above.

If Companies House could not be checked for a UK company, write the rating as "LOW (limited data)" at best. A missing check is not a clean result. When the record was checked but is too short to say much, because the company is under two years old, has filed one set of accounts or fewer, or has no employees, write "LOW (thin record)" instead of a plain LOW. In the HTML report the rating and the scale say only "Low", and the qualifier ("Limited data" or "Thin record") goes on its own line below the rating.

The script's pattern flags (phoenix, company cycling, director insolvencies) already leave out the target's own group, solvent liquidations and failures that happened before a director joined or more than a year after they left. Use them as rated. If a pattern flag still looks like group housekeeping after the hand checks, keep its rating and say in the flag's row what the evidence shows, with a link, such as an accounts note on closing dormant subsidiaries.

## Step 4 - The report

The report is one self-contained HTML page. Its content follows the outline below, and its look comes from the page shell described below. Fill in the outline first. All eleven sections appear every time, in this order, with these headings. If a section has nothing, keep the heading and write "Nothing found." as one line, with no empty table. Do not add, rename, merge or reorder sections; anything that does not fit goes in "Not checked and limits". In tables and the company record, write dates as day, short month and year ("4 Apr 2026"). In running text, month and year is enough ("in Apr 2026", "at the end of Jun 2025") unless the exact day matters, such as a deadline. Every row that makes a claim carries a link.

### Tables

Tables carry the same columns in every report, so they can be compared, but a column or row with nothing in it only adds noise.

- Leave out a column that is n/a in every row, and say in one line under the table which figures the filings did not give and why (for example, "Micro-entity accounts do not state turnover or staff costs").
- Leave out a year whose figures are all n/a, and name it in that same line.
- A table left with one row and two or three figures reads better as a sentence: write it as one.
- In Company record, leave out rows that would say only "None" for previous names and insolvency history, and say "No previous names and no insolvency history" in one line under the table.
- Never leave out a column or row that holds a finding, such as a negative figure or an overdue date.

### Plain language

The reader is an ordinary employee or job seeker, not a lawyer or accountant. Write so they can follow every line without looking anything up, and without losing any detail that accuracy needs.

- Say what a finding means for the company and its staff, in everyday words. "The company owes more than it owns" before "net liabilities of £{amount}".
- Keep a legal or accounting term when it is the exact word on the record, because the reader may search for it or quote it to someone. Explain it in a few words the first time it appears: "entered administration (an insolvency process where an administrator takes control to rescue or sell the business)".
- These terms always get a short explanation on first use: administration, liquidation (creditors' or members' voluntary, compulsory), solvent liquidation, company voluntary arrangement, winding-up petition, Gazette notice, charge, person with significant control, going concern, material uncertainty, net assets, net current assets or liabilities, micro-entity accounts, dormant, strike-off, phoenix pattern, company cycling.
- Use the plain term where nothing is lost: "owner" for person with significant control after the first mention, "lender security" for charge, "short-term debts" for current liabilities, "closed" for dissolved.
- Short sentences, one point each. No Latin, no "thereof", "pursuant to" or "in respect of".
- No bold run-in lead-ins ("**Label.** Text"). Where the template gives a list item or flag a label, write the label as a few words with no full stop, and the template shows it on its own line.
- Plain words never replace precision. Keep exact dates, amounts, company names and numbers, and say whose record a finding is.

Save the page as `<company-name>-background-check.html` and open it in the user's browser: `open <file>` on macOS, `xdg-open <file>` on Linux, `start "" <file>` on Windows. Where there is no local browser, such as on claude.ai or in a sandbox, send it as a file instead. Do not publish it to a shareable URL: it puts real people's names next to risk flags, and who sees it is the user's call. In the chat, write one short paragraph of two or three sentences, with no lists or headings: the risk rating with its reason and anything important you could not check. Everything else, including what to verify next, lives in the file, so do not repeat it. Do not comment on this skill or its scripts in the reply. If the user asks for plain text instead, give the outline as markdown.

```markdown
# Background check: {Company name}

**Checked:** {D Mon YYYY} | **Company no.:** {number or n/a} | **Jurisdiction:** {e.g. England and Wales}
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
| Outstanding charges | {count, then the latest one's date and lender} |
| Insolvency history | |
| Source | [Companies House]({url}) |

**Financials** (up to five years, newest first; "n/a" where a figure was not tagged or stated)

| Year end | Net assets | Net current assets | Cash | Payroll cover | Avg employees | Turnover | Format |
|---|---|---|---|---|---|---|---|
| {D Mon YYYY} | {£} | {£} | {£} | {n} months | {n} | {£} | {iXBRL, PDF (read by hand), PDF (not read) or Unavailable} |

## 3. Directors and owners

| Director | Since | Other companies | Notes |
|---|---|---|---|
| {name}, with the role on a second line | {D Mon YYYY} | {count of other appointments, with how many closed and how many insolvent in brackets, such as "11 (4 closed, 1 insolvent)", or "None"} | {one or two short sentences. Failed companies and patterns go in the phoenix check and red flags, not here} |

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

The verdict box above it holds two sentences only: the main reason for the rating, at most 25 words, and one line of context, at most 20 words. Figures and secondary findings belong in the scorecard lines, not there.

The page opens with a scorecard so the reader gets the picture before the detail: the overall risk from step 3, then the same eight areas every time, in this order. Each area gets one status and one line of text.

| Area | What it covers |
|---|---|
| Company record | Status, age, filings, registered office |
| People and phoenix check | Directors, owners, phoenix and cycling patterns, disqualifications |
| Money | Accounts (net assets, cash, going concern), charges, funding, paying suppliers |
| Redundancies | Layoffs, restructuring and a falling headcount in the accounts over the last five years. A single round more than a year ago is listed but stays Clear |
| Legal and insolvency notices | Gazette notices, tribunal decisions, minimum wage naming, regulator action |
| Media coverage | Tone of press coverage |
| Employee reviews | Glassdoor, Indeed and similar |
| Coverage of this check | How complete this check was |

Statuses:

- **Concern** - a high-severity finding in that area.
- **Caution** - a medium-severity finding, or a named gap that matters (say which in the line).
- **Clear** - checked, nothing adverse. Low and info flags are mentioned in the line but leave the area Clear.
- **No data** - nothing to judge from. A search that found nothing is never Caution. For register checks (Gazette, tribunals, insolvency, redundancies) nothing found means nothing recorded, so the area is Clear. For media coverage and employee reviews, no results tell you nothing, so the area is No data.

The status and its line must agree: a line that explains a finding away cannot sit under Concern. Under Money, payroll cover under three months in the latest year is a named gap (Caution).

For "Coverage of this check": Clear when the API path ran with no caps hit, Caution for path B, stale data or caps hit, Concern when the registry could not be checked at all. The scorecard never contradicts the Red flags table: every high flag shows as a Concern in its area. A `parent_` flag counts in the same area as the flag without the prefix, and the area's line names the parent.

### Page shell

The shell is `references/report-shell.html` in this skill's folder. Read it, then copy it exactly, including the whole style block, and only replace the `{placeholders}`. Do not restyle it, add scripts, or load fonts or images: the page has to work offline and print cleanly on A4. Every outline section becomes a `<section>` with an `<h2>`, without the numbers. Wrap tables in `.table-wrap`, put dates and amounts in `class="nowrap"` cells, and use the chip classes for severity and tone. The footer wording is fixed.
