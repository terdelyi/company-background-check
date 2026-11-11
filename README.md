<img src=".github/logo.png" alt="" width="200">

# Company background check

[![skills.sh](https://skills.sh/b/terdelyi/company-background-check)](https://skills.sh/terdelyi/company-background-check)

A Claude skill that runs a background check on a UK company from the point of view of someone who works there, or is thinking about it. Give it a company name or number and it produces a printable HTML report with a risk rating and scorecard at the top and the evidence underneath.

## What it checks

- **Companies House:** status, filings, charges, insolvency history, directors and owners
- **Directors' other companies:** phoenix companies and companies opened and closed in quick succession
- **Accounts:** net assets, cash, headcount and turnover for up to three years, and going-concern warnings
- **Parent companies:** followed up to the UK parent
- **The Gazette:** winding-up petitions and other insolvency notices
- **Employer registers:** employment tribunal decisions, gender pay gap filings and the visa sponsor register
- **The web:** funding, redundancies, press coverage, late payment, minimum wage naming and employee reviews

Every flag links to its evidence. Anything matched on a name alone is reported as a lead to verify, never as a finding.

## Install

Claude Code and other agents:

```bash
npx skills add terdelyi/company-background-check -g
```

claude.ai: zip the `skills/company-background-check` folder and upload it under Settings → Capabilities → Skills.

## Setup

You need Node 22 or later (nothing to install) and a free Companies House API key. Sign in or register on the [Companies House developer hub](https://developer.company-information.service.gov.uk/manage-applications), create a live application and add a REST key to it, then make it available as `COMPANIES_HOUSE_API_KEY`. In Claude Code, add it to `~/.claude/settings.json`:

```json
{
  "env": {
    "COMPANIES_HOUSE_API_KEY": "your-key-here"
  }
}
```

Without a key the skill falls back to the public Companies House pages, which is slower and less complete.

## Use

```
/company-background-check <company name or number>
```

Or just ask, for example "check this company before I accept the offer". The registered name or company number works best, because many companies trade under a different name.

## Limits

- UK companies only.
- Glassdoor and LinkedIn have no public API, so reviews are often missing.
- Each run downloads about 30 MB of public register data.
- The report is put together by an AI from public sources. It can miss things or get them wrong, and it is not legal or financial advice. Check anything important at the source before you act on it.

## Keep reports private

A report puts real companies and real people's names next to risk flags. The skill is written to state only what public records show and to label name matches as leads, but a report is still a private working note for your own decision. It never publishes one for you. If you share a report or quote it publicly, you are responsible for what you publish, including under the law of defamation. Check every claim at its source first, and leave out people's names unless you need them.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the tests and the rules on test data.

## License

MIT, see `LICENSE`.
