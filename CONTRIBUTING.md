# Contributing

## Layout

- `skills/company-background-check/`: the skill itself, and the only folder that gets installed
  - `SKILL.md`: the instructions and the report outline
  - `scripts/ch-check.mjs`: the Companies House check. No dependencies, nothing to build. It runs on Node 18+ (the first with built-in `fetch`), but the README asks for 22+ because older versions are end of life
  - `scripts/pdf-text-macos.js`: reads scanned PDF accounts with macOS text recognition, one of several ways SKILL.md lists for reading PDFs. Not covered by the script tests, so try it on a real scanned filing after changing it
  - `references/report-shell.html`: the page template the report is filled into
- `tests/`: the mock API, fictional scenarios and the script test runner
- `evals/`: whole-skill test cases

## Test data is fictional

Company numbers use the `ZZ` prefix, which Companies House never issues, and no test names a real company or person. Keep it that way:

- Before adding a fictional name, search for it on the Companies House register. Names that look invented are sometimes registered: one in an early draft of these tests was.
- Real companies only go in the gitignored `tests/private/` folder.

## Script tests

These check the Companies House script against a mock of the API, with the clock frozen so age-based flags stay stable. They are free, offline and take a few seconds:

```bash
node tests/run.mjs            # every scenario
node tests/run.mjs phoenix    # scenarios whose name contains "phoenix"
```

Each file in `tests/scenarios/` describes one fictional company: the API responses it needs and the flags and fields the script must return.

The script is tested against the mock, not the live service, so run a change against a real company before relying on it.

## Skill evals

The cases in `evals/` run the whole skill, in the format `claude plugin eval` reads. They are real, billed model runs:

```bash
claude plugin eval . --allow-tools Write Edit Bash WebSearch WebFetch
```

Eval runs have no network, not even localhost, so each case sets `EVAL_CH_OFFLINE=1`. The script then answers its requests from the scenario fixtures through `tests/offline-fetch.mjs` instead of calling the registers. `node tests/run.mjs` runs the scenarios that way too, to keep it in step with the mock.

The evals run on the real clock, so they only assert things that do not depend on a company's age.
