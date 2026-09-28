# ai-native-sdlc-discovery-demo

This is the isolated **development-test** rehearsal repository for the
`decisions-v1` discovery loop, initial ownership delivery, and a subsequent
maintenance iteration. It was prepared from the ownership-free
[source](https://github.com/huangyingting/ai-native-sdlc) at
`80cb3c30588754e39fcab792aefe89cad7d1ce85`.

The rehearsal is complete: [ownership Intent #1](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/issues/1) and
[maintenance continuation #17](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/issues/17) were delivered and accepted
against actual immutable images. [Maintenance attempt #8](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/issues/8) was
cancelled after real Green failures; its frozen evidence was preserved rather
than rewritten. The final application includes ownership and database readiness.

Start with the source repository's canonical
**[discovery-to-maintenance report](https://github.com/huangyingting/ai-native-sdlc/blob/main/docs/brownfield-discovery-maintenance-rehearsal.md)**,
including its
[ordered presentation and reproduction steps](https://github.com/huangyingting/ai-native-sdlc/blob/main/docs/brownfield-discovery-maintenance-rehearsal.md#8-present-or-reproduce-the-result).
It records the real decisions, failures, corrections, CI, image digests, runtime
observations, and acceptance links rather than duplicating evidence here.

Scripted actions used the repository owner's explicit authorization. They are
not independent Human review, genuine Human acceptance, or evidence of three
completed Human-led rehearsals. The illustrated ownership case study below
describes an earlier, separate run. Do not reset either completed demo.

Demonstrations and tooling for exploring AI-native software delivery with
GitHub Copilot CLI, dynamic agent orchestration, OpenTelemetry traces, and
Issue-to-PR workflows.

## Start here

| What you want to do | Where to begin |
|---|---|
| Present this completed discovery and maintenance run | [Actual evidence and ordered presentation steps](https://github.com/huangyingting/ai-native-sdlc/blob/main/docs/brownfield-discovery-maintenance-rehearsal.md#8-present-or-reproduce-the-result) |
| Inspect the earlier separate ownership demo | [Illustrated case study](docs/brownfield-human-gated-delivery-case-study.md) |
| Run a new AI-native delivery cycle | **[Step-by-step walkthrough: start with preparation](docs/brownfield-human-gated-delivery-walkthrough.md#1-prepare-the-repository)** |
| Understand Intent/Spec/Plan gaps and improvements | [Early-stage research and implementation status](docs/ai-native-sdlc-early-stage-research.md) |
| Run only the service-desk application | [Application quick start](demos/it-service-desk/README.md) |
| Explore Copilot orchestration patterns | [Agent orchestration guide](docs/copilot-cli-agent-orchestration-patterns.md) |

For a fresh ownership run, use the ownership-free **source** to prepare a
**new isolated repository**. The existing
[completed demo](https://github.com/huangyingting/ai-native-sdlc-demo) already
has ownership; use it for inspection or replay, not as a fresh baseline.
This repository also already has ownership and readiness; do not use it as the
ownership-free source for another initial ownership run.
The walkthrough is the main path. The [toolkit README](tools/brownfield-demo/README.md)
and [setup reference](docs/brownfield-human-gated-delivery.md) provide command
details and troubleshooting when that path links to them.

## Projects

- [`demos/it-service-desk/`](demos/it-service-desk/) — independent Next.js and
  SQLite service-desk demonstration.
- [`tools/trace-viewer/`](tools/trace-viewer/) — dependency-free trace model,
  renderer, composite action, and GitHub Pages client.
- [`tools/brownfield-demo/`](tools/brownfield-demo/README.md) — isolated demo
  preparation, read-only preflight, digest-bound container presentation, and
  replay from real delivery evidence.
- [`.github/`](.github/) — issue forms, workflow automation, and publishing
  adapters.

## Final verified delivery

- [Implementation PR #23](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/pull/23), protected merge
  `d361ce032b0f729f62b165c23c4f79bb56f29b92`.
- [Publish/verify attempt 2](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/actions/runs/36381916918/attempts/2).
- [Actual digest-bound acceptance](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/issues/17#issuecomment-5864107648).
- 50 application tests, lint, build, and real container smoke passed.
- Healthy readiness 200, fault-injected readiness 503, liveness 200 in both,
  and repaired readiness 200 were observed against the same digest.
- Fifty real readiness probes and a same-volume restart preserved every field
  of the populated four-ticket dataset.

```text
ghcr.io/huangyingting/ai-native-sdlc-discovery-demo-it-service-desk@sha256:1fab5706994daec051dbd183ea42a23ab0e74e2caeefeef1e48454fe17aaa5bb
```

The [application runbook](demos/it-service-desk/README.md#liveness-and-database-readiness)
explains endpoint contracts and safe local repair. Read-only replay records
trusted `runtimeStatus: accepted`; `acceptance.complete: false` intentionally
excludes this development-test execution from genuine Human/Demo Ready claims.

## Validate

Use Node.js 24 and run:

```sh
npm test
```

Each demo owns its dependencies and additional validation commands.

## Set up the brownfield demo

For a first run, follow the walkthrough's
[ordered operator setup](docs/brownfield-human-gated-delivery-walkthrough.md#1-prepare-the-repository):
prepare, inspect, publish, configure, then preflight. Setup alone does not
create a repository or publish its workflows.

After publishing your new repository, an explicitly single-owner preview is:

```sh
npm run setup:brownfield -- --repo OWNER/NEW_DEMO_REPO --single-owner
```

Replace `OWNER/NEW_DEMO_REPO` with that selected repository, not the source.
This previews prerequisites without changing GitHub. **Full `--apply` creates
missing managed rulesets, including protection for an unprotected `main`.**
Do not assume the target is unprotected or replace its existing policy.
The original source repository's `main` is intentionally unprotected; do not
apply full setup there without explicit agreement. See the
[setup guide](docs/brownfield-human-gated-delivery.md#run-the-setup-script)
for secure token entry, existing-Intent recovery, and remaining manual checks.
If you are the only Human reviewer, use the explicit
[`--single-owner` demo mode](docs/brownfield-human-gated-delivery.md#single-owner-demo-mode)
for the TDD Tests and Implementation PR gates without GitHub's native
independent-review requirement. New Spec/Plan reviews take place on the parent
Intent Issue and do not have that native PR restriction.

For new Intents, **Brownfield Delivery · Documents** publishes full rendered
Spec and Plan revisions on that Issue. Humans explicitly submit custom
`/sdlc revise spec` or `/sdlc revise plan` commands with feedback, then approve
the latest version with commands such as `/sdlc approve spec v2` and
`/sdlc approve plan v1`. Ordinary discussion does not run AI or approve a stage.
Revisions and approval snapshots are saved in Git before handoff to the
existing Tests/Implementation PR flow. Legacy document-PR Intents remain in
Spec/Plan PR mode; they are not automatically migrated.

The source configuration enables `specReadiness: "decisions-v1"` for newly
initialized runs. Spec review includes a discovery brief and blocking Q-n
questions. A configured Spec reviewer records an answer or explicit deferment;
each decision triggers a new Spec, clears previous Spec approval and Plan, and
must be incorporated before fresh approval. Existing runs keep their original
profile. Follow the [decision loop instructions](docs/brownfield-human-gated-delivery.md#discovery-and-decision-readiness)
and the current Issue hub, not fixed version numbers from an old rehearsal.

The workflows, including `brownfield-human-gated-delivery-documents.yml`, must
already be published on remote `main` and registered by GitHub. Setup cannot
register a missing workflow; it can enable an existing disabled workflow.
Setup also requires the trusted `runs.mjs`, `run-core.mjs`, and `state-store.mjs`
modules under `.github/brownfield-human-gated-delivery/scripts/` on remote `main`.
Document generation uses read-only Copilot CLI in Actions and additionally
requires `copilot-requests: write` and Copilot CLI entitlement; it never receives
the existing write-enabled `COPILOT_ASSIGN_TOKEN`. See the setup guide before
running this workflow; local documentation does not establish remote deployment.

For all Issue-based (`issue-v1`) runs, including existing ones after upgrade,
a verified image is **awaiting Human acceptance**, not
complete. A configured Implementation reviewer tests the exact published digest
and submits `/sdlc accept sha256:<64hex>` with observed results on subsequent
lines; the configured quorum must accept the current verification attempt.
Only that acceptance closes the Intent and removes its engineering branch.
Document and trusted run-record branches remain for replay. Run controls and
rejection are documented in the [command reference](docs/brownfield-human-gated-delivery.md#run-controls-and-human-acceptance).
Only legacy document-PR runs keep their original automatic-close behavior.

Start the presentation toolkit with `npm run demo:brownfield -- help`; use its
[README](tools/brownfield-demo/README.md) for exact commands and safety boundaries.
The [presenter runbook](docs/brownfield-human-gated-delivery-walkthrough.md#presenter-runbook-and-readiness)
requires three actual completed isolated rehearsals before claiming **Demo
Ready**. An [illustrated case study](docs/brownfield-human-gated-delivery-case-study.md)
records a completed, explicitly authorized `development-test` run, including
its real image, failures, and recovery. It does not count toward genuine Human
acceptance or the three-live-run readiness gate.

## Documentation

- [This repository's discovery-to-maintenance report](https://github.com/huangyingting/ai-native-sdlc/blob/main/docs/brownfield-discovery-maintenance-rehearsal.md)
  — completed real execution, including failed maintenance and its accepted
  continuation; maintained canonically in the ownership-free source.
- [Intent, Spec, and Plan research](docs/ai-native-sdlc-early-stage-research.md)
  — ten early-stage pain points, evidence-based demo coverage, the implemented
  discovery/decision slice, and the remaining proposed improvements.
- [Illustrated delivery case study](docs/brownfield-human-gated-delivery-case-study.md)
  — the actual ownership rehearsal, architecture, screenshots, review decisions,
  failures and fixes, and linked evidence with explicit limitations.
- [Step-by-step brownfield demo](docs/brownfield-human-gated-delivery-walkthrough.md)
  — run the human Intent, iterative Spec/Plan reviews, TDD, and verified delivery
  demonstration through GitHub Web, then accept the verified result.
- [Repository guide](docs/repository-guide.md) — structure, local development,
  workflows, trace publishing, security, and operations.
- [Brownfield Human-Gated Delivery demo](docs/brownfield-human-gated-delivery.md)
  — safely evolve an existing application through Intent, Spec, Plan, TDD,
  implementation, delivery, and Human Review gates.
- [Agent orchestration patterns](docs/copilot-cli-agent-orchestration-patterns.md)
  — pattern selection, execution diagrams, and trace evidence.
- [Adding a demo](docs/repository-guide.md#adding-a-demo)
- [IT service desk](demos/it-service-desk/README.md)
- [Trace viewer](tools/trace-viewer/README.md)
- [Agent instructions](AGENTS.md)
