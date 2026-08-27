---
description: Write the release changelog entry for a PR and bump the version
argument-hint: <PR number>
---

Write the release changelog entry for PR
https://github.com/joshbleacherrentals/bleacher_rentals/pull/$1

Read the **whole** PR — every commit and every changed file, not just the
description — then:

1. **Pick the new version** for `package.json`, incrementing from the current
   value in proportion to what this PR actually contains (patch for fixes, minor
   for new features, major for breaking changes).
2. **Create `versions/<new-version>.md`** with the entry. The filename must match
   the new `package.json` version exactly — CI checks this
   (`scripts/changelog/checkChangelog.cli.ts`), and the file has to be newly
   added in the PR.
3. **Update `version` in `package.json`** to the same number.

## Who is reading this

Two audiences, neither technical:

- **Account managers**, whose day-to-day is booking events and coordinating
  drivers. They care about what changes in the work they do every day.
- **Admins**, who run the company. They care about maintenance, practicality,
  and whether the software is making jobs easier over the long term.

Write to them, not to developers.

## How to write it

- **Short and to the point.** Only the things people will actually care about in
  this release. Leave out refactors, dependency bumps and internal plumbing
  unless they change something visible.
- **Be specific about location** — name the page, the modal, the button, the tab.
  "The language selector on the contact detail modal", not "improved contacts".
- Lead with what changed for the reader, not with how it was built.
- Match the tone and structure of the most recent file in `versions/`.

Go ahead and write the files directly.
