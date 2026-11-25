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

A company name, company number or website. A job ad or location helps disambiguate.

When a website is supplied, start there before searching the brand alone. Match its operator's registered name, number and jurisdiction from the footer, terms, privacy or about pages to the register and another business identifier. Keep this entity and domain attached to funding, ownership and news claims throughout the check; a better-known namesake on another domain is not the same business.

People usually know a business by its brand, and the brand is often not a registered company. If the name has no match on the register, or the matches are plainly a different business, find the legal entity first: search `<brand> "trading as"`, read the footer, terms and privacy pages of its website, and look at supplier listings and news. Confirm the company number, run the check on that entity, pass the brand to the script with `--aka`, and say at the top of the report which company you checked and why. If the brand has passed between companies, check the one operating it now and cover the earlier ones under the phoenix check.

If several companies still match after checking the supplied website, location and other context, ask which one before going further (the script exits 3 with candidates). When the context resolves the entity, run the script with its company number instead of asking the user to choose again.

If the company is not UK-registered, skip step 1, say so in sections 2 and 3, and use the country's public company register through web search if it has one.

For questions about financial backing, legitimacy, corporate ownership or conflicting claims, read [Evidence, funding and ownership](references/evidence-and-funding.md). Use its claim ledger and reconciliation checks within the existing employer-focused report, not as extra mandatory sections.

## Step 1 - Companies House (UK companies)

### Path A: the API script (preferred)

Needs Node 18 or later. Run `node --version` first: if it errors or hangs, `node` is probably a broken version-manager shim, so look for a real binary (for example under `~/.nvm/versions/node/*/bin/`) and call that by its full path, or tell the user Node is missing. Do not rewrite the script in another language.

Also needs a free API key in the `COMPANIES_HOUSE_API_KEY` environment variable (created at developer.company-information.service.gov.uk). Do not check for it yourself: run the script, and if it exits 2 with "COMPANIES_HOUSE_API_KEY not set", continue with path B. Ask about configuring a key only if the user requested the API path or a material check cannot be completed through public sources. Never print the key or write it into the report.

Run `scripts/ch-check.mjs` from this skill's folder as it is, and write its output to a temp directory. Do not copy, edit or rewrite it: its checks are deterministic so results stay comparable between runs.

```bash
node <skill folder>/scripts/ch-check.mjs "<company number or name>" --aka "<brand, product or website names>" > ch.json
```

Fill in `--aka` before the first run. Companies House only knows registered names, and many companies trade under a different one: a company registered as "{Name} Holdings Ltd" may sell a product called "{Brand}", or rebrand to initials without changing its registered name. The script searches The Gazette, tribunal decisions, court judgments and the sponsor register under every name it is given, and matches directors' other companies against them, so a missing brand is a missed check. Open the company's website first (its home page, footer and about page) and pass every brand, trading name, product and website name you find. If later research turns up one you did not pass, run the script again with it added and use the new output. The report header lists only trading names, the names the company itself trades under, and only when one differs from the registered name. Products go to the script but not into the header.

Exit codes: `0` JSON report on stdout, `2` no key or API unreachable (use path B), `3` ambiguous name (candidates on stdout, ask the user).

The JSON has `company`, `directors` (active directors plus individual owners who are not directors, each with a `role`), `pscs`, `flags` (already sorted by severity, each with an evidence URL and a `record` of `own`, `parent` or `director` saying whose record it comes from) and `meta` (caps hit, caveats). If `meta.people_without_officer_record` names anyone, the script found no officer record for that owner, so check their other companies by hand as in Path B step 3. Use the script flags with source-linked context. Change a flag only where a specific rule below calls for it. Link the evidence for any change, including the judgment when a court outcome changes the rating.

`company.accounts.history` holds up to five years of accounts, newest first: net assets, net current assets, cash, average employees, turnover, profit and staff costs where the filing tagged them, `payroll_months_in_cash` (cash divided by a month of staff costs), and `format` (`ixbrl`, `pdf` or `unavailable`). The script only reads iXBRL. For the latest year, and for the year before it when the latest has no comparatives, read any `pdf` year as in "Reading PDF accounts" below: the same four figures and the going-concern note. Apply the accounts rules below to what you read, and say in "Not checked and limits" which years were read by hand.

`company.timeline` supplies Companies House events, evidence links and coverage limits from the records returned. Check its dates and sources, inspect charge documents, and add material events from step 2 using [Material events after the accounts](references/evidence-and-funding.md#material-events-after-the-accounts). Put the combined timeline under Company record.

`company.share_allotments` lists every share allotment form (SH01, and replacement forms such as RP01SH01) filed in the last five years, with a link to each. Reading them is required, because the money raised appears nowhere else on the register. Open every form whose `replaced` is false, using the methods in "Reading PDF accounts" for scanned forms. From each, record the number of shares allotted (the sum of the allotment table's rows, not the total in the statement of capital, which counts every share the company has issued), the "Amount paid" per share, any amount unpaid, and whether the shares were allotted for cash. Money raised is shares allotted × amount paid. A replacement form supersedes the replaced one: count each allotment once. A replaced form lists the forms that replace it in `replaced_by`. When `replacements_add_up` is true, they restate the same allotment split across those forms, so report them as one allotment and never as a conflict or a smaller allotment. Only when it is false do the records disagree. Then say so in the row and link the forms in "Verify next". Allotments in one funding round normally share the same price per share, so a matching price across forms is expected, not a reason to doubt the amount. Check every share count against the register: where `nominal_increase` is given, shares allotted × the nominal value of each share must equal it. Scanned forms are easy to misread, so when they disagree, use the count the register supports if the form's figures allow it, and otherwise show both in the row and link the form in "Verify next". Each allotment becomes a row in the Funding table.

`company.gazette` holds the corporate insolvency notices from The Gazette in the last five years that carry this company's number. A petition to wind up appears there weeks before Companies House shows anything, so the script flags one from the last 24 months as high and any other notice as medium. `meta.gazette_name_only` lists notices that matched a name but not the number: open each, and treat it as this company's only if the address or a director's name confirms it, then rate it as the script would and say you did so by hand. If `company.gazette.failed_searches` is not empty, search The Gazette by hand for those names and note it in "Not checked and limits".

`company.parents` follows active corporate PSCs with explicit majority share or voting control, or board-appointment control, up to three levels. This is an inferred control chain, not a complete shareholder register or proof of a parent's financial guarantee. Each inferred parent gets the register and Gazette checks but not the director checks, and its findings come back as flags prefixed `parent_` with the same severity. Present each one as the parent's, never the employer's own: "Parent {name}: …". Owners recorded without a company number are found by an exact name search and marked `matched_by: "name"`: say so in "Not checked and limits".

`meta.parents_not_followed` records corporate PSCs not followed and why, including ceased status, insufficient control evidence, unresolved UK registration, ambiguous names and the depth limit. Describe minority and historical owners as such in section 3 and attribute parent risk only to the inferred current parents. For a foreign inferred parent, run one web search for insolvency or administration news under its name. Say "No current corporate parent identified in the records checked" when appropriate.

For a related company marked `group_member`, `group_membership` shows the date used, its source link, the common group company and the control paths from both companies. In section 3, explain material exclusions with the closure date, the controlling links, their recorded PSC dates and how each owner was matched. Link the closure date and each PSC record. For a name-only match, link the matched profile and confirm the name it held at closure. Review relevant control change filings. Use `group_membership_gap`, `meta.group_ownership_not_followed` and incomplete entries in `meta.psc_paging` in "Not checked and limits". Keep the resulting cycling findings where group membership could not be established.

These public records come back as context:

- `company.gender_pay_gap` lists the company's gender pay gap filings by company number, newest first. Employers with 250 or more staff must file, so the size band is the most reliable headcount you have; report it with the years filed in section 8. A late filing is worth a line, not a flag.
- `company.sponsor_register` says whether the company is on the Home Office register of licensed visa sponsors, matched on its name. It lists current sponsors only, so "not found" means not licensed now, never that a licence was revoked. Report it in section 8 and never flag it.
- `company.tribunal_decisions` lists employment tribunal decisions from the last six years that name the company as a respondent, raised together as one low flag. The list says nothing about who won. Open each decision from the last three years whose categories involve pay, wages or dismissal, and read the outcome. If one went against the company, raise the flag to medium, name the decision and link it. Report a claim the company won as context, not as a flag.
- `company.court_judgments` lists judgments of the higher courts (High Court, Court of Appeal and others on Find Case Law) from the last six years whose title names the company as a party, raised together as one low flag. Most are commercial disputes, and like tribunal decisions the list says nothing about who won. Open each one, read what was decided, and describe it in a plain sentence ("a supplier sued for unpaid invoices and the court ordered the company to pay"). Raise the flag to medium when one is about unpaid wages, unpaid debts the company lost, or a winding-up petition, and name it. Report the rest as context. County court debt judgments are not on Find Case Law and are not checked.
- `company.payment_practices` holds the company's payment practice reports, found by company number: `reports` (how many), `latest` and `previous`, each with the period, average days to pay, the share of invoices paid within 30 days, 31 to 60 days and after 60 days, the share not paid within agreed terms, and a link. Only larger companies have to report, so no reports is normal and not a finding. Put the latest report in the company record. More than 60 days on average, or under half of invoices paid within 30 days, makes Money a Caution, and say whether it got better or worse than the previous report. If `search_failed` is true, search check-payment-practices.service.gov.uk by hand and say so in "Not checked and limits".

`company.ir35_size` estimates whether the company counts as small for IR35, which decides who sets a contractor's employment status: a small client leaves it to the contractor's own company, a medium or large one must decide it and give reasons. From 6 April 2026 a company is small when it meets two of these three: turnover of £15 million or less, a balance sheet total (fixed plus current assets) of £7.5 million or less, and 50 employees or fewer. `status` is `small` or `not small` when the latest accounts give two figures that agree, `probably small` when they do not but the company filed micro-entity, small or total-exemption accounts, and `unknown` otherwise. When the latest accounts are a PDF, read turnover, fixed and current assets and employees by hand and apply the same test. The figures are the company's own: when `part_of_group` is true it is small only if the whole group is, so read the parent's group accounts before calling it small. Report it in section 8 only when the reader is or may be a contractor, and point them to HMRC's off-payroll working guidance for their own case.

### Accounts rules

The script raises these flags from iXBRL accounts. Apply them by hand to PDF accounts and in path B.

- **Going concern** (high): the latest accounts or audit report state a *material uncertainty* about the company continuing as a going concern. The routine audit sentence saying no material uncertainty was found does not count.
- **Net liabilities** (medium): net assets below zero at the latest year end.
- **Net assets fall** (medium): net assets more than halved since the year before, while still positive.
- **Headcount fall** (medium): average employees in the latest year more than a quarter below the highest year in the history, so cuts spread over several years still count. Skip it when that highest year had fewer than 5 employees, where one person leaving is not a trend.
- **Late filing** (low, medium at three or more): accounts or confirmation statements filed after their deadline in the last five years. The script works out each deadline from the filing history and names every late filing with its due date. It skips accounts whose year-end was changed around that time and lists them in `meta.late_filing_unclear`: check those deadlines by hand and say in "Not checked and limits" if you cannot. In path B, apply the same deadlines by hand: first accounts 21 months after incorporation (18 for a plc), later accounts 9 months after the year-end (6 for a plc), and a confirmation statement 14 days after its review period ends.

Keep every financial conclusion tied to its accounting date. Current assets are not cash; historical net liabilities do not establish current cash insolvency, and an announced funding round does not remove the historical flag. Historical payroll cover is not current runway. Do not infer today's workforce from a historic average of zero employees.

### Reading PDF accounts

A `pdf` year carries `document`: `url` downloads the PDF without an API key, `pages` is its length, and `scanned: true` means it was filed on paper and has no text layer. In path B, the filing history's "View PDF" link is the same file. Download it with `curl -sL -o accounts.pdf "<url>"`. The figures are on the balance sheet (net assets, cash), the profit and loss account (turnover) and the employees note, and the going-concern wording is in the directors' report and the audit report.

Use the first of these that works where you are running:

1. Your own file reader, if it shows you PDF pages as images. Read only the pages you need.
2. If the PDF is not scanned: `pdftotext -layout accounts.pdf -`.
3. If it is scanned, or no text came out: on macOS, run `osascript -l JavaScript <skill folder>/scripts/pdf-text-macos.js /absolute/path/accounts.pdf [first page] [last page]`. It needs nothing installed and recognises scanned pages with the system's own text recognition. Elsewhere, if `pdftoppm` and `tesseract` are installed, run `pdftoppm -r 200 -png accounts.pdf page`, then `tesseract <page image> -` on each page you need.
4. If the document cannot be retrieved or read, try an alternative format linked by the filing page, then a targeted search for the exact company number and filing. Indexed text of the primary filing may support figures when the document, period, labels, units and signs are clear and totals or comparatives cross-check. Label the format "PDF (indexed text)" and state "Indexed filing text; original document not inspected" in the limits. Do not claim to have inspected the PDF, checked the full audit opinion or ruled out a going-concern note from an excerpt. Rate Coverage of this check as Caution.
5. If none of these works, do not install anything without asking the user. Write the year's format as "PDF (not read)" with n/a figures, link the PDF in "Verify next", and rate Coverage of this check as Caution.

Recognised text can misread digits. Before using a figure, check it against a second place it appears: net assets also appear as total equity, and the next year's accounts repeat this year's figures as comparatives.

### Path B: public pages (no key, or the script exits 2)

Some environments block outbound API calls. The same data is on the public Companies House site:

1. Web-search `<company name> Companies House` and open the company's page on find-and-update.company-information.service.gov.uk.
2. Read the overview (status, incorporation date, accounts and confirmation statement due dates, previous names), then the People, Filing history, Charges and Insolvency tabs. Open the latest two sets of accounts from the filing history, read them as in "Reading PDF accounts" and apply the accounts rules above. Search thegazette.co.uk for corporate insolvency notices under each current and previous name, and rate the ones that show the company number as the script does: a petition to wind up in the last 24 months is high, any other insolvency notice from the last five years is medium.
3. Record each corporate PSC's control basis and whether it is current or ceased. Follow a UK corporate owner as an inferred parent only when majority or board control is supported, checking its status, filings, insolvency and Gazette notices up to three levels. Keep minority, former and uncertain relationships separate; do not treat their findings as the employer's or an inferred parent's. For a cycling exclusion, check the PSC pages and filings on both sides for evidence of control at the related company's closure. Keep the related company in the check and record the gap if the date or any necessary link is unclear.
4. Open the appointments page of each active director and of each individual owner (find owners with the officer search, matching name and birth month), and apply the phoenix test below by hand.
5. Open every share allotment form (SH01 or a replacement such as RP01SH01) filed in the last five years and read it as described for `company.share_allotments` in path A.
6. Build the timeline from the overview, filing history, charges and people pages using [Material events after the accounts](references/evidence-and-funding.md#material-events-after-the-accounts). Work back to the latest filed accounts year-end and record any pages or relevant documents you could not inspect. Record that path B was used in "Not checked and limits".

### What counts as a phoenix pattern

A phoenix company is a new company continuing the business of one that went insolvent, usually leaving its debts behind. It is legal in some forms, but it is the pattern that most often leaves staff unpaid. Look at each director's and each individual owner's other companies that are insolvent or dissolved with insolvency history, and count the signals: similar name, same registered postcode (now or previously), same SIC code, and the target company being incorporated within about 3 years of the old one failing. A company fails when its insolvency case starts (a petition, a winding-up order, administration), not when it is dissolved, which can be years later.

- Insolvency plus a similar name plus one more signal: **strong** (high severity).
- Insolvency plus any one other signal: **possible** (medium).
- One dissolved company with no insolvency is normal housekeeping, not a flag.
- A members' voluntary liquidation is a solvent wind-up: the directors declare the company can pay its debts in full, and groups use it to close subsidiaries they no longer need. It is not insolvency. The script marks these `solvent_liquidation` and leaves them out of the phoenix test and the Insolvent count. In path B, open the Insolvency tab before counting a liquidation as insolvency.
- **Serial cycling**: two or more closed companies in the last 10 years that share the target's name (current or previous names on either side) or its registered postcode. Some operators open a new company every year or two, move the business across and close or merge the old one, so each step looks harmless and only the chain gives it away. Medium at two, high at three or more or when any of them failed while the director was in post. Solvent liquidations are listed in the chain but do not count towards the three for high. List the chain in date order with each company's years. The script excludes a related company that closed without insolvency only when the records support a controlling group link at dissolution or at the start of a solvent winding-up. The link may run to the employer itself or to a common corporate controller. A PSC link must be recorded by the relevant date and its recorded cessation must fall later if it has ceased.

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

Run these searches (in parallel where possible), look back about five years, and keep the most recent items first. `<name>` means the registered name and every trading name you passed to `--aka`: press, LinkedIn pages and review sites usually use the brand, so a search under the registered name alone misses them. Before using any hit, confirm it is about this company and not a namesake: check location, sector or a director's name. A short brand such as a set of initials matches many unrelated businesses, so pair it with the sector or town. When a better-known business shares the brand, run every search in the table with the website domain, the registered name or a founder's name instead of the brand alone, and name the excluded namesake once in the media section.

| Topic | Search for | Capture |
|---|---|---|
| Funding and investment | `<name> funding round raised investment`, `<name> acquired acquisition investors` | Event and publication dates, currency, amount, round versus cumulative total, announced/closed/estimated status, investors or acquirer, original source |
| Redundancies | `<name> redundancies layoffs job cuts`, `<name> restructuring`, then `<name> job cuts <year>` for each of the last five years the first results do not cover | Every round in the last five years, newest first: event and publication dates, proposed or completed, what happened, how many or what share of staff. Add any year-on-year fall in average employees from the accounts history |
| Media coverage | `"<registered name>"`, `<name> news`, `<name> <town or sector>`, the website domain in quotes, and each founder's or CEO's full name with the brand or sector, which also finds interviews and podcasts that name the person but not the company | Up to 8 items: date, outlet, headline, tone |
| Claims on the website | Run `node scripts/site-pages.mjs <website>`. It reads each of the site's pages and lists, under `claims`, the sentences about customers, case studies, pilots, partners, funding, validation and awards, plus testimonials and who they are attributed to. Consider every one of them. Open a page yourself where `claims` is null, the context of a sentence is unclear, or before crediting a quote to someone, since the list does not show which quote an attribution line belongs to. If the script lists only the home page or reports the site in `failed`, open the pages linked from the site's menu and footer instead. Then search `site:<domain> customer OR client OR "case study" OR pilot OR partner OR funding` and open any page not yet read | Up to three claims about customers, partners, funding or regulation, the ones that would matter most to someone joining. A named or described customer, case study or pilot comes before general product claims such as "holds up in court". Mark each Verified (a dated source from the other party or an official register confirms it), Contradicted, or Unverified |
| Legal and financial trouble | `<name> administration insolvency winding up`, `<name> employment tribunal`, `<name> The Gazette notice`, `<name> lawsuit fine investigation` | Tribunal decisions, winding-up petitions, regulator action, unpaid wages or other money owed to staff |
| Unpaid pensions | Search the company's name on the Pensions Regulator's published penalty notices and court orders (https://www.thepensionsregulator.gov.uk/en/document-library/enforcement-activity/penalty-notices) and `<name> pensions regulator penalty` | A named entry that matches the company's name and town is a medium flag under Legal and insolvency notices, linked to the notice |
| Minimum wage | `HMRC national minimum wage named employers <name>` and the latest gov.uk naming list | A named entry that matches the company's name and town is a medium flag under Legal and insolvency notices, linked to the list |
| Employee reviews | `<name> Glassdoor reviews`, `<name> Indeed reviews` | Rating, review count, recurring themes |
| Presence | The company website. For LinkedIn, in this order: the LinkedIn link in `social_links` from `site-pages.mjs`. If there is none, run `node scripts/site-pages.mjs <website> --directory <url>` with every directory profile found for this company during the check (such as Crunchbase, a sector index or a startup database), and use a link from `directory_profiles` where `links_company_site` is true. Only then search `site:linkedin.com/company <name>` with the domain or town | The LinkedIn company page URL, whether the site and the registered details agree, current hiring |

**Tone labels for media items.** Label each item Positive, Neutral or Negative for what it says about the company as a business and employer, not for the writer's style. Growth, funding, awards and contract wins are Positive. Layoffs, losses, disputes, regulatory action and unpaid bills are Negative. The company's own press releases and sponsored pieces are Neutral and marked "(own PR)". Interviews and profiles that mostly repeat the founders' own account are Neutral and marked "(interview)", unless the outlet reports facts it checked itself. The overall tone is Positive, Mixed, Negative or Little coverage. Media coverage is what others published about the company: the company's own blog, news pages and articles on its own website are not media items. Directory listings are not media either.

**Unverified means not confirmed, nothing more.** For an Unverified claim, say what was checked and that it found no confirmation. Do not guess why, or suggest that a person, firm or quote is not genuine, unless a source says so. Contradicted is only for a claim a source shows to be false. A link the page leaves out, such as a founder quoted as an outside expert, is stated as a fact next to the claim.

**Review sites.** Glassdoor and LinkedIn have no public API and forbid scraping, so use only what search results and openly readable pages show. Report a rating only if a source states it; otherwise write "Not found". Never estimate one. LinkedIn pages sit behind a login, so the report links the company page for the reader instead of reporting a headcount. Confirm the page is this company's from the website link, the domain or the location before linking it. Take size from the accounts and the gender pay gap register.

**Funding evidence.** Do not add a cumulative total to rounds it may include, or count corrected filings as additional raises. Nominal share capital is not cash raised: an SH01 form's "Amount paid" is per share, so multiply it by the shares allotted. Valuation is not cash in the bank, and investor promotion does not establish a paid investment. Preserve conflicting amounts with their sources and dates. Treat paywall placeholders and retrieval failures as evidence limitations, not company misconduct. Directory listings, accelerator membership and a sound product concept do not establish revenue, security certification or a tested implementation; attribute each claim at its actual scope.

**Targeted claim checks.** Read [Claim verification](references/claim-verification.md) when the user asks to verify funding, a named customer, a public contract or a regulatory claim, or when routine research finds one that could materially change the employment assessment. Check the relevant regulated activity if the business appears to carry it out. Follow only the relevant routes and use public sources. Put the evidence and its limits in the usual report.

**Directors are people.** Report only their company roles and business press. Leave out home addresses, dates of birth, family and personal social media.

## Step 3 - Risk rating

- **HIGH** - any high-severity flag from step 1 (non-active status, overdue accounts, insolvency, strike-off notice, winding-up petition in the last 24 months, going-concern material uncertainty, strong phoenix pattern, serial company cycling, disqualification with a date-of-birth match), or credible reports of insolvency or of unpaid wages or other money owed to staff.
- **MEDIUM** - any medium-severity flag, redundancies in the last 12 months, two or more rounds of redundancies in the last five years, mostly negative coverage, or a review rating below 3.0.
- **LOW** - none of the above.

If Companies House could not be checked for a UK company, write the rating as "LOW (limited data)" at best. A missing check is not a clean result. When the record was checked but is too short to say much, because the company is under two years old, has filed one set of accounts or fewer, or has no employees, write "LOW (thin record)" instead of a plain LOW. In the HTML report the rating and the scale say only "Low", and the qualifier ("Limited data" or "Thin record") goes on its own line below the rating.

Use the script's pattern flags as rated. The cycling check excludes dated group closures where the records support the link, and the phoenix and director insolvency checks account for solvent liquidation and the timing of director appointments. If a pattern flag still looks like group housekeeping after the hand checks, keep its rating and say in the flag's row what the evidence shows, with a link, such as an accounts note on closing dormant subsidiaries.

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
- Leave out technical terms the reader never needs, such as file formats, API names and script field names. Write "the digital accounts filed at Companies House", not "iXBRL", and "Companies House records", not "the API".
- Short sentences, one point each. No Latin, no "thereof", "pursuant to" or "in respect of".
- No bold run-in lead-ins ("**Label.** Text"). Where the template gives a list item or flag a label, write the label as a few words with no full stop, and the template shows it on its own line.
- Plain words never replace precision. Keep exact dates, amounts, company names and numbers, and say whose record a finding is.

### Before saving

Check the finished report against the script output and fix any gap before saving:

- Every script flag is in Red flags with its severity, unless a rule in this skill changed it.
- Every allotment in `company.share_allotments` that is not replaced has a Funding row with an amount or "Amount not read". Funding never says "Nothing found" while allotments exist.
- Section 8 has the Website, Claims on the website, LinkedIn, Hiring, Size and Visa sponsor lines, and every sentence `site-pages.mjs` listed under `claims` was considered for it.
- Every search in the step 2 table was run, including the one for each founder's or CEO's full name. Run any you skipped before saving.
- Every timeline limit and every `meta` list the skill names is either reflected in the report or covered in "Not checked and limits".

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
| Paying suppliers | {average days to pay and share paid within 30 days in the latest report, with its period. Leave the row out when the company does not report} |
| Insolvency history | |
| Source | [Companies House]({url}) |

**Financials** (up to five years, newest first; "n/a" where a figure was not tagged or stated)

| Year end | Net assets | Net current assets | Cash | Payroll cover | Avg employees | Turnover | Format |
|---|---|---|---|---|---|---|---|
| {D Mon YYYY} | {£} | {£} | {£} | {n} months | {n} | {£} | {Digital filing, PDF (read by hand), PDF (indexed text), PDF (not read) or Unavailable} |

Under the table, one short paragraph per point, in everyday words, for the latest year:

- **Net assets:** "Net assets is everything the company owns minus everything it owes." When most of it is goodwill or another intangible, name it and say what it is ("the value the company puts on its brand, customers and software"), say how much of it the company valued itself and what was paid for it if a filing shows that, and give the figure without it.
- **Net current assets:** "Net current assets compares the bills due within a year with the cash and customer payments due in the same time." When it is negative, say "A negative figure means the bills are bigger", by how much, and name the largest bill if the notes show it, such as tax owed.
- **Missing figures:** which figures the accounts do not show, and the year's profit or loss if it can be read from the notes.

Avoid "revaluation reserve", "net current liabilities", "retained profit" and "profit and loss account" here. The plain sentence carries the meaning.

**Material events after the accounts**

State the accounts year-end, then list up to 10 material events oldest first. Label effective dates, filing dates, publication dates and deadlines. Follow the [timeline guidance](references/evidence-and-funding.md#material-events-after-the-accounts) for missing dates, charge documents and the empty case.

| Date | Event | Other dates | Evidence |
|---|---|---|---|
| {D Mon YYYY and date type} | {one short sourced statement} | {other known dates, labelled} | [{source}]({url}) |

## 3. Directors and owners

| Director | Since | Other companies | Notes |
|---|---|---|---|
| {name}, with the role on a second line | {D Mon YYYY} | {count of other appointments, with how many closed and how many insolvent in brackets, such as "11 (4 closed, 1 insolvent)", or "None"} | {one or two short sentences. Failed companies and patterns go in the phoenix check and red flags, not here} |

**Owners (PSCs):** {names and level of control}
**Group:** {inferred or independently confirmed UK parents in order up the chain, each with its control basis, status and any finding; minority and historical corporate owners separately; or "No current corporate parent identified in the records checked". Name owners not followed and why}
**Phoenix check:** {Possible | Strong | Serial} - {one sentence, naming the companies involved; for a chain, list them in date order with their years}. Only when a pattern was found. When none was, leave the block out entirely and do not describe what was looked for.

Use the shell's ownership and control evidence block when there is a sourced corporate relationship or an attributed claim to evaluate. Give each item both entity names, the control basis, any known date or period, and a source link for that relationship. For script results, use each item's `psc_url` for the control evidence. The parent profile covers the parent's own status and filings. Show current parent links from the employer upwards. Label script links "Parent (ownership register)" and reserve "Parent (confirmed in accounts)" for a parent named in the accounts or other direct documentary evidence of the relationship. Use distinct labels for non-majority interests, former PSCs, former parents and unverified relationships. State a former PSC's cessation date when available. Reserve "Former parent" for evidence of former majority control. Keep name-only matches, other uncertainty and any unsupported links visible in "Not checked and limits". When using the evidence block, use the group summary for status, material findings and the overall inference, without repeating the source rows. Leave the block out when the Group line already says everything it would show, such as a single former PSC and no current parent.

## 4. Funding and investment

| Date | Event | Amount | Investors / parties | Source |
|---|---|---|---|---|

Every allotment from `company.share_allotments` (or the forms read in path B) gets its own row: shares allotted, amount paid per share, the money raised and whether it was for cash, linked to the form. If a form could not be read, the row says "Amount not read" with the reason, and "Verify next" links the form. Put scope and evidence status in Event (for example, "Reported cumulative equity funding" or "Announced seed round") and attribution in Source. Do not force a cumulative total into a transaction date: use the publisher's as-of date and label it. State below the table which totals overlap or conflict, and whether current cash, burn and runway are unknown. Keep valuation separate from funds received.

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
- **Claims on the website:** {up to three customer, partner, funding or regulatory claims, each marked Verified, Unverified or Contradicted with its source, or "None found on the pages checked"}
- **LinkedIn:** {link to the company page with "Open it to see the current headcount and recent hires", plus where the link came from when it is not the company's own site (e.g. "linked from its {directory} profile, not from its own website"), or "No company page found" when none was located}
- **Hiring:** {open roles seen, or Not found}
- **Size (gender pay gap):** {latest size band and the years filed, or "Not on the register (under 250 staff, or not filing)"}
- **Visa sponsor:** {Licensed, with type and rating | Not on the current register}
- **Size for IR35:** {Small | Not small | Probably small | Unknown}, with the figures it rests on and, for a group company, the group's size. Only when the reader is or may be a contractor

After these items, add short linked findings for public contract or regulatory claims when checked. Give the entity, evidence date and what the source establishes. Keep the limits and next checks in sections 10 and 9.

## 9. Verify next

1. {The check that would most change this picture, with a link to where to do it}
2. {The next most useful check}

## 10. Not checked and limits

- {Which Companies House path was used; caps hit; pages that could not be opened; indexed evidence not inspected as a full document; unresolved funding or ownership contradictions; name matches that still need verifying}

## 11. Sources

- [{title}]({url})
```

### Verify next

This section is for the reader. List the checks you could not complete that would most change the picture, most useful first, each with a link to where to do it. Three to five items. Include one question worth putting to the employer when there is one.

Suggest an optional paid [TrustOnline](https://www.trustonline.org.uk) lookup for County Court Judgments (CCJs) only when public evidence shows material payment risk for the employer and the result could change the reader's decision. Examples include evidence of unpaid wages or supplier debts, persistently slow supplier payments, or a recent winding-up petition about an unpaid debt. Name and link the evidence that prompted the suggestion. An overall Medium or High rating or net liabilities alone is insufficient. State that the lookup costs a fee and leave it to the reader. Do not run it or contact anyone.

The section is not a place for notes about this skill: if a run exposes a gap in the script or in these instructions, tell the user in the chat instead.

### Scorecard

The verdict box above it holds two sentences only: the main reason for the rating, at most 25 words, and one line of context, at most 20 words. Figures and secondary findings belong in the scorecard lines, not there.

The page opens with a scorecard so the reader gets the picture before the detail: the overall risk from step 3, then the same eight areas every time, in this order. Each area gets one status and one line of text.

| Area | What it covers |
|---|---|
| Company record | Status, age, filings, registered office |
| Directors and owners | Directors, owners, phoenix and cycling patterns, disqualifications. Name a pattern in the line only when one was found |
| Money | Accounts (net assets, cash, going concern), charges, funding, paying suppliers |
| Redundancies | Layoffs, restructuring and a falling headcount in the accounts over the last five years. A single round more than a year ago is listed but stays Clear |
| Legal and insolvency notices | Gazette notices, tribunal decisions, court judgments, minimum wage naming, regulator action |
| Media coverage | Tone of press coverage |
| Employee reviews | Glassdoor, Indeed and similar |
| Coverage of this check | How complete this check was |

Statuses:

- **Concern** - a high-severity finding in that area.
- **Caution** - a medium-severity finding, or a named gap that matters (say which in the line).
- **Clear** - checked, nothing adverse. Low and info flags are mentioned in the line but leave the area Clear.
- **No data** - nothing to judge from. For routine register checks (Gazette, tribunals, insolvency, redundancies) an empty result means nothing was found in the records searched, so the area is Clear. For media coverage and employee reviews, no results tell you nothing, so the area is No data. Media coverage made up only of interviews, profiles and the company's own PR is also No data, since none of it was independently reported. Apply the Coverage rule below if an empty result leaves a decision-material question unresolved.

The status and its line must agree: a line that explains a finding away cannot sit under Concern. Under Money, payroll cover under three months in the latest year is a named gap (Caution).

For "Coverage of this check", use Concern if the registry could not be checked at all. Otherwise use Caution for path B, stale data, caps hit or a named evidence gap that could change the decision, such as incomplete PSC records on a material ownership link. Use Clear when the API path ran and none of those limitations apply. Every high flag shows as a Concern in its area. A `parent_` flag counts in the same area as the flag without the prefix, and the area's line names the parent.

### Page shell

The shell is `references/report-shell.html` in this skill's folder. Read it, then copy it exactly, including the whole style block, and only replace the `{placeholders}`. Do not restyle it, add scripts, or load fonts or images: the page has to work offline and print cleanly on A4. Every outline section becomes a `<section>` with an `<h2>`, without the numbers. Wrap tables in `.table-wrap`, put dates and amounts in `class="nowrap"` cells, and use the chip classes for severity and tone. The footer wording is fixed.
