# ITSM — Requirement & Issue Management (md-viewer)

**Who reads this:** anyone who files, cuts, builds or accepts an issue on this board, before the first one.

**The rules live in the canon, not here.** Statuses, resolutions, labels, priorities, titles, acceptance, evidence and the closing procedure are defined once in
[`issue-workflow.md`](https://github.com/neckarshore-ai/neckarshore-planning/blob/main/docs/reference/issue-workflow.md).
This file carries only what is **local to this board**, and it names what it drops, so nobody reads a gap as an oversight
([Local Additions](https://github.com/neckarshore-ai/neckarshore-planning/blob/main/docs/reference/issue-workflow.md#local-additions--what-a-product-file-still-carries)).
It follows the setup of the Kaze and MuscleCat boards, adapted where md-viewer is a different kind of thing.

**The constellation:** md-viewer is ours: one organisation, one repository. It is a personal power tool with light building-in-public intent, not a product ([backlog.md](backlog.md)). It has two surfaces, the Finder Quick Action on macOS and the web app at [md.neckarshore.ai](https://md.neckarshore.ai). The repository is **public**: anyone can read it and file an issue. Since 2026-11-07 the backlog is the issues; [backlog.md](backlog.md) points to them.

## Who holds the roles

Responsibilities are defined in the canon ([Roles](https://github.com/neckarshore-ai/neckarshore-planning/blob/main/docs/reference/issue-workflow.md#roles)).

| Name | Role | What that means when you read it in an issue |
|------|------|----------------------------------------------|
| **German** | Business / Service Owner · Tester | Decides direction, priority and acceptance, and uses the tool himself. When an issue says a decision is his, it is settled, not a proposal. |
| **Linus** | Developer (owner-persona) | Builds md-viewer and owns its source. Changes land through pull requests. |
| **Bob** | Developer for CI and test plumbing | Works on assignment by MASCHIN (for example #38 and #40). |
| **Wendy** | Product Owner | Writes the requirements you read: cuts issues, sets acceptance criteria and scope boundaries. Writes no code. Maintains this file and the labels. |

## Prefix vocabulary

Every new issue title opens with a bracketed prefix naming the part of md-viewer it touches
([Issue Titles](https://github.com/neckarshore-ai/neckarshore-planning/blob/main/docs/reference/issue-workflow.md#issue-titles)).
The vocabulary is **closed**: a new prefix is a deliberate decision, not a free-text field. Prefixes are English. Titles written before 2026-11-07 keep their form.

| Prefix | What it covers |
|--------|----------------|
| `[Delivery]` | Build, size of the shipped file, changelog gate, deploy |
| `[Finder]` | The Finder Quick Action, `bin/mdview`, install and uninstall |
| `[Housekeeping]` | Residue and tidying that reaches no user |
| `[Principle]` | A stance recorded as a decision rather than left as a state |
| `[Proposal]` | An observation offered for cutting, not yet a requirement |
| `[Render]` | What the rendered pane shows on both surfaces: Markdown features, code blocks, printing |
| `[Security]` | Sanitising, the malicious-input corpus, nothing leaving the machine |
| `[Source pane]` | The raw pane: highlighting, the gutter |
| `[Split view]` | The two panes together: divider, mobile tabs, scroll sync |
| `[Tests]` | The test suite itself: reliability, guards, counts |
| `[Web]` | The web app around the viewer: opening a file, page chrome, themes, sharing, search |

## The `P1` anchor

Priorities are defined in the canon
([Priority Scale](https://github.com/neckarshore-ai/neckarshore-planning/blob/main/docs/reference/issue-workflow.md#priority-scale-p0p3-p99)).
What is local is **what `P1` means here: the safety promise leads it.** The README promises that a downloaded `.md` containing scripts cannot run code, that the web app uploads nothing, and that the viewer works offline as one self-contained file. A defect that lets a file run code, sends content off the machine, or stops a file from opening breaks that promise. A display defect does not.

## The evidence surface for acceptance

Acceptance is **by hand, on the Founder's Mac**: in Finder through the Quick Action, and in a browser at md.neckarshore.ai after the deploy, at desktop and at phone width
([Acceptance](https://github.com/neckarshore-ai/neckarshore-planning/blob/main/docs/reference/issue-workflow.md#acceptance),
[Evidence When Building](https://github.com/neckarshore-ai/neckarshore-planning/blob/main/docs/reference/issue-workflow.md#evidence-when-building)).
Below that sits the automated evidence: the required checks `smoke` and `e2e` (Playwright, including the security corpus). A criterion that only a person can judge says so in the issue. A walk is handed over in the form of Kaze's device walk, without the device:
[Handing over a device walk](https://github.com/neckarshore-mmps/kaze/blob/main/docs/ITSM.md#handing-over-a-device-walk).

## The closing check

Run the canon's procedure
([The Closing Check](https://github.com/neckarshore-ai/neckarshore-planning/blob/main/docs/reference/issue-workflow.md#the-closing-check))
at the start of every session on this board, with:

```sh
REPO=neckarshore-mmps/md-viewer
```

## Milestones and merges — the local part

**Milestones are release milestones named by version (`v0.6.0`), assigned after the release from `CHANGELOG.md`.** md-viewer has releases but no store, so the canon's type (b) applies (retrospective, never a plan), with the version in place of a build number. None exists yet, because no release has been cut under this process.

**The Founder merges** (his decision of 2026-11-07, recorded on PR #49). The persona merge script covers Kaze, MuscleCat and their two websites only.

## What is different here

| Difference | Why |
|------------|-----|
| No device, no store, no mobile acceptance skill | Acceptance happens in Finder and in a browser. The skill for phone acceptance does not apply; only its hand-over form is borrowed. |
| Release milestones instead of build milestones | See above: versions are md-viewer's unit of delivery. |
| Public repository | Anyone can file an issue. No requirement lives only behind a link to one of our private repositories: links there are sources, never the only place a rule stands. No personal data in issues. |
| Own issue templates that set no status | The organisation's default templates (`neckarshore-mmps/.github`) put `to-do` on every new issue. This repository's templates replace them, so an issue from anyone arrives untriaged and `to-do` stays the Founder's. |
| No negative list | md-viewer's principles stand in the README (self-contained and offline, safe, nothing uploaded) and in [backlog.md](backlog.md) (a personal power tool, not a product). The templates check against them. |
| No AI triage pipeline | Triage is done by a person. |

## Maintaining this file

The Product Owner maintains this document, the templates and the label set through pull requests, never the application code. Changes to a **rule** belong in the canon; this file only grows a row when something is genuinely local to md-viewer.
