# Contributing

## Layout

- `skills/company-background-check/`: the skill itself, and the only folder that gets installed
  - `SKILL.md`: the instructions and the report outline
  - `scripts/ch-check.mjs`: the Companies House check. No dependencies, nothing to build. It runs on Node 18+ (the first with built-in `fetch`), but the README asks for 22+ because older versions are end of life
  - `scripts/site-pages.mjs`: lists a company website's own pages from its sitemap and home page links, picks out the sentences on each that claim customers, partners, funding or testimonials, collects its social profile links, and with `--directory` checks directory profiles for a LinkedIn link
  - `scripts/pdf-text-macos.js`: reads scanned PDF accounts with macOS text recognition, one of several ways SKILL.md lists for reading PDFs. Not covered by the script tests, so try it on a real scanned filing after changing it
  - `references/report-shell.html`: the page template the report is filled into
- `tests/`: the mock API, fictional scenarios and the script test runner
- `evals/`: whole-skill test cases

## Keep the report simple

The reader is an employee or job seeker deciding about a job, not an analyst. Every visible addition costs them reading time, so it has to earn its place. Check a change against these before opening a PR:

- Follow the plain language rules in SKILL.md for any new wording, including labels and headings. Prefer the word a reader already knows over the precise term an analyst would use: "Parent (ownership register)", not "Inferred parent".
- Keep the eleven report sections and the eight scorecard areas. Fit new findings into the section they belong to, or "Not checked and limits".
- Show new content only when it applies. When there is nothing to show, write one sentence or leave it out, never an empty table or panel. A simple company should get a report about as long as before.
- Put a limit on any list or table that can grow, and say below it how many items were left out, with a link to the full record. The timeline's 10-row cap is the example.
- State each fact once. If a detail block backs up a summary line, the summary gives the conclusion and the block gives the evidence, without repeating each other.
- Work that makes the checks more accurate without changing what the reader sees is always welcome. A visible addition needs a reason in the PR description, written from the reader's side: what decision it helps them make.
- Put agent instructions that only some companies need in a reference file, and have SKILL.md load it under a stated condition, as it does with `references/evidence-and-funding.md`.
- When a PR changes the report, attach two rendered reports for fictional companies: one simple company with nothing unusual and one the change is aimed at. A PR is public, so never attach a report on a real company.
- Copy uses sentence case and no em dashes, matching SKILL.md.

## Test data is fictional

Company numbers use the `ZZ` prefix, which Companies House never issues, and no test names a real company or person. Keep it that way:

- Before adding a fictional name, search for it on the Companies House register. Names that look invented are sometimes registered: one in an early draft of these tests was.
- Real companies only go in the gitignored `tests/private/` folder.

## Script tests

These check the Companies House script against a mock of the API, with the clock frozen so age-based flags stay stable. They are free, offline and take a few seconds:

```bash
node tests/run.mjs            # every scenario
node tests/run.mjs phoenix    # scenarios whose name contains "phoenix"
node --test tests/*.test.mjs  # the website page lister
```

Each file in `tests/scenarios/` describes one fictional company: the API responses it needs and the flags and fields the script must return.

The script is tested against the mock, not the live service, so run a change against a real company before relying on it.

## Skill evals

The cases in `evals/` run the whole skill, in the format `claude plugin eval` reads. They are real, billed model runs:

```bash
claude plugin eval . --allow-tools Write Edit Bash WebSearch WebFetch
```

Eval runs have no network, not even localhost, so each case sets `EVAL_CH_OFFLINE=1`. The script then answers its requests from the scenario fixtures through `tests/offline-fetch.mjs` instead of calling the registers. `node tests/run.mjs` runs the scenarios that way too, to keep it in step with the mock. Each prompt ends with a note that the company is fictional: the ZZ numbers do not exist on the real register, and without the note the agent can look one up, decide the check is broken and stop.

The evals run on the real clock, so they only assert things that do not depend on a company's age.
