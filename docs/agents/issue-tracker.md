# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `grumm1728/weather-vid`.
Use the `gh` CLI from the repository directory.

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."`
- Close: `gh issue close <number> --comment "..."`

For multiline bodies, write the text to a file and use `--body-file`.
Fetch labels and comments when a workflow needs them.

## Pull requests as a triage surface

**PRs as a request surface: no.** Change this to `yes` if external
pull requests should enter the triage queue.

## Skill terminology

“Publish to the issue tracker” means create a GitHub issue.
“Fetch the relevant ticket” means read the issue and its comments.

## Wayfinding

Use an issue labeled `wayfinder:map` as the map and linked sub-issues
as child tickets. If sub-issues are unavailable, use a task list in
the map and add `Part of #<map>` to each child. Label children
`wayfinder:<type>`.

Use native GitHub issue dependencies for blockers when available;
otherwise record `Blocked by: #<number>` in the child. Select the
first open, unassigned child in map order with no open blockers.
Claim it by assigning yourself. On completion, comment with the
answer, close the child, and add a decision and link to the map.
