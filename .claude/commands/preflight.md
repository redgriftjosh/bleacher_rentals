---
description: Plan a manual-style test pass over a PR before it goes to production
argument-hint: <PR number>
---

Build the preflight plan for PR
https://github.com/joshbleacherrentals/bleacher_rentals/pull/$1

This is the checklist before takeoff: what could this PR have broken, who is
allowed to do each thing, and what will be clicked to prove it. **This command
plans only — it runs nothing.** `/preflight-run` executes the approved plan.

## 1. Read the change

Read every commit and every changed file — not the description. For each
user-facing change, work out:

- what it adds or alters
- what it could have broken that is **not** in the diff (shared components,
  merges that dropped code, data written by one screen and read by another)
- which existing tests already cover it, and which do not

Look hard at merge commits. A merge can silently drop a field from a form while
leaving the database layer intact — that has already happened twice in this repo.

## 2. Permissions — the part that gets skipped

For every behaviour the PR adds or changes, answer: **who is allowed to do
this?** Go role by role: `admin`, `account_manager`, `developer`, `viewer`,
`driver` (see `WebRole` in `src/features/userAccess/logic/determineAccess.ts`).

Check each answer against
[`src/features/userAccess/permissionPageData.ts`](src/features/userAccess/permissionPageData.ts)
— the 20-entry matrix that renders the `/permissions` page every authenticated
user can read.

Then:

- **The PR adds a behaviour the matrix does not cover** → ask me who should have
  it, then add the entry.
- **The PR changes who can do something already listed** → update the entry.
- **The code and the matrix disagree** → say so plainly. One of them is wrong,
  and I need to know which before this ships.

`permissionPageData.ts` is the single source of truth. Never write a separate
permissions document — users and this command must read the same file.

## 3. Ask, then write the answers down

Where the intended behaviour is not obvious from the code, **ask me** rather
than guessing. Group the questions; do not drip-feed them.

Once I answer, record it so nobody has to ask again:

- a permission rule → `permissionPageData.ts`
- how a feature is meant to work → the relevant `docs/specs/*.md`

Answers that live only in the chat are lost.

## 4. Write the plan

Create `preflight/<version>.md`, where `<version>` is the current
`package.json` version. Use this shape:

```markdown
# Preflight — <version>

PR: #<number>
Status: planned

## Automated

| #   | Test | Role  | Covers |
| --- | ---- | ----- | ------ |
| 1   | ...  | admin | ...    |

## Human — I cannot judge these

- [ ] ...
```

Two lists, and the second matters. Playwright checks what it is told to check.
It will never notice that a button is misaligned, a colour is unreadable, or a
label is confusing. Put those in the human list so I still look.

Order the automated list by risk: permissions first, then money and language,
then everything else.

## 5. Stop

Show me both lists and every permissions change you made. Ask whether the plan
is right. **Do not run anything.**
