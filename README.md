# company-background-check

A Claude skill that runs a background check on a UK company from the point of view of someone who works there, or is thinking about it. Give it a company name or number and it produces a printable HTML report with a scorecard at the top and the evidence underneath.

## What it checks

It starts with the Companies House record: status, filings, charges, insolvency history, directors and owners. It then follows each director, and each individual owner who is not a director, into their other companies and looks for two patterns. One is the phoenix, where a new company carries on the business of one that went insolvent. The other is serial cycling, where related companies are opened and closed every year or two so that each step looks harmless.

From the same free public sources it reads:

- **The accounts:** net assets, cash, average headcount and turnover for up to three years, and any going-concern warning.
- **Parent companies:** owners that are companies, followed up to the UK parent.
- **The Gazette:** winding-up petitions and other insolvency notices, which appear weeks before Companies House shows anything.
- **Employer registers:** employment tribunal decisions, gender pay gap filings (for headcount) and the visa sponsor register.

After that it searches the web for funding and acquisitions, redundancies, press coverage, late payment of suppliers, minimum wage naming and employee reviews.

Every flag links to its evidence. Anything matched on a name alone is reported as a lead to verify, never as a finding.

## The report

The output is one self-contained HTML file that works offline and prints on A4. It opens with an overall risk rating (low, medium or high) and the same eight areas every time, each marked Concern, Caution, Clear or No data. The detail follows in eleven sections in a fixed order, so two reports can be compared side by side. A "Verify next" section lists the checks the skill could not finish that would most change the picture.

## Requirements

You need Node 18 or later and a free Companies House API key. `node --version` has to work in the shell Claude uses; a broken version-manager shim will stop the script. Create the key at https://developer.company-information.service.gov.uk as a REST key on a live application, and make it available as `COMPANIES_HOUSE_API_KEY`.

Without a key, or anywhere the API is blocked, the skill falls back to reading the public Companies House pages through web search. That works, but it is slower and less complete.

## Install

For Claude Code, clone the repo into your personal skills folder:

```bash
git clone git@github.com:terdelyi/company-background-check.git ~/.claude/skills/company-background-check
```

Then add the key to `~/.claude/settings.json`:

```json
{
  "env": {
    "COMPANIES_HOUSE_API_KEY": "your-key-here"
  }
}
```

For claude.ai, upload the folder with `SKILL.md`, `scripts/` and `references/`. The skill needs all three.

## Use

```
/company-background-check <company name or number>
```

A company number works too and avoids any ambiguity. You can also just ask, for example "check this company before I accept the offer".

Many companies trade under a name that is not their registered one. With only a brand name, the skill first has to find the legal entity behind it through web search, so give the registered name or number if you have it.

## Limits

The Companies House script is tested against a mock of the API (see Testing), not the live service. Treat the first real runs as part of the testing.

Companies House does not record trading names or mergers, so those parts rely on web research and are labelled as such. Glassdoor and LinkedIn have no public API and forbid scraping, so reviews come only from what search results show and are often missing. The registry checks cover UK companies only.

Each run downloads about 30 MB of public register data (the gender pay gap files and the sponsor register).

The report is put together by an AI from public sources. It can miss things or get them wrong. It is not legal or financial advice, so check anything important at the source before you act on it.

## Keep reports private

A report puts real companies and real people's names next to risk flags. The skill is written to state only what public records show and to label name matches as leads, but a report is still a private working note for your own decision. It never publishes one for you. If you share a report or quote it publicly, you are responsible for what you publish, including under the law of defamation. Check every claim at its source first, and leave out people's names unless you need them.

## Testing

All test data is fictional. Company numbers use the `ZZ` prefix, which Companies House never issues, and no test names a real company or person. Keep it that way:

- Before adding a fictional name, search for it on the Companies House register. Names that look invented are sometimes registered: one in an early draft of these tests was.
- Real companies only go in the gitignored `tests/private/` folder.

**Script tests** check the Companies House script against a mock of the API, with the clock frozen so age-based flags stay stable. They are free, offline and take a few seconds:

```bash
node tests/run.mjs            # every scenario
node tests/run.mjs phoenix    # scenarios whose name contains "phoenix"
```

Each file in `tests/scenarios/` describes one fictional company: the API responses it needs and the flags and fields the script must return.

**Skill evals** in `evals/` run the whole skill, in the format `claude plugin eval` reads. They are real, billed model runs. Start the mock first so the skill talks to it instead of the live API:

```bash
node tests/mock-server.mjs 8787 &
export COMPANIES_HOUSE_API_KEY=test
for v in CH_API_BASE CH_DOC_API_BASE GAZETTE_BASE GPG_BASE GOVUK_BASE; do export $v=http://127.0.0.1:8787; done
claude plugin eval . --allow-tools Write,Edit,Bash
```

The evals run on the real clock, so they only assert things that do not depend on a company's age.

Neither folder ships in release archives (`.gitattributes` excludes them).

## Files

- `SKILL.md`: the instructions and the report outline.
- `scripts/ch-check.mjs`: the Companies House check. Node 18+, no dependencies, nothing to build or install.
- `references/report-shell.html`: the page template the report is filled into.
- `tests/`: the mock API, fictional scenarios and the script test runner.
- `evals/`: whole-skill test cases.

## License

MIT, see `LICENSE`.
