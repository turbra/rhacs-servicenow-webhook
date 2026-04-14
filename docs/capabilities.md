---
title: Capabilities
description: >-
  What this integration does, what it deliberately does not do, and the
  surfaces where you extend it without forking.
page_type: capabilities
topic_family: capabilities
source_path: scripts/acs-alert.js
---

# Capabilities

Scope statement for the integration. Read before planning extensions, before
attaching high-volume policies, and before treating an absent feature as a
bug.

## What It Does

- Accepts RHACS Generic Webhook POST at a ServiceNow Scripted REST Resource
- Parses one `alert` envelope per request
- Writes a single `incident` record per accepted request
- Maps RHACS severity to ServiceNow urgency + impact (priority derived by ServiceNow)
- Produces a fixed, multi-line `description` with cluster / namespace /
  deployment / pod / container / command / user / groups / event time /
  violation message
- Returns `201` with `{ "sys_id": "<new incident sys_id>" }`

Full field-level behavior: [Handler Script Reference]({{ '/reference-handler-script.html' | relative_url }}).

## What It Does Not Do

Deliberate omissions. Each is a design choice, not a missing feature.

| Not done                               | Why                                                                 |
| -------------------------------------- | ------------------------------------------------------------------- |
| Deduplication across repeated alerts   | RHACS resends on every evaluation cycle. Handle with a before-insert Business Rule keyed on policy + cluster + deployment. See [Dedup + Storm Control]({{ '/use-case-dedup-storm-control.html' | relative_url }}). |
| Multi-violation parsing                | Only `violations[0]` is read. Multi-event alerts lose detail beyond index 0. |
| Assignment group routing               | No `assignment_group` set. Use a ServiceNow Assignment Rule against `short_description` or severity. |
| Custom `u_acs_*` fields                | Handler writes stock fields only. Add columns to `incident` then extend the script. |
| `work_notes` / `comments` population   | Activity stream stays empty by default. Opt in — see [Activity stream visibility]({{ '/reference-incident-fields.html' | relative_url }}#activity-stream-visibility). |
| Outbound ACK back to RHACS             | RHACS does not consume the `sys_id` response. It is there for log correlation. |
| Attachment upload                      | No file payload support.                                            |
| OAuth client credential grant          | Basic auth against a dedicated integration user is the documented path. OAuth works if ServiceNow is already configured for it; the handler does not care. |
| Retry / queueing on ServiceNow outage  | RHACS Generic Webhook retries on non-2xx. Downtime windows leak alerts if retries exhaust. Pair with a queue in front (see extension points). |

## Decision Boundaries

Use this integration when:

- You want RHACS policy violations to become ITIL Incidents for oncall routing
- Your ServiceNow instance is the authoritative ticketing surface
- The policy set is curated — high-signal, low-volume events

Do not use this integration when:

- You want bidirectional sync (Incident state → RHACS alert resolution). Not supported.
- You want policy violations to land in a non-`incident` table (`sn_si_incident`, `em_event`, custom). The handler hard-codes `incident`.
- You need attachments, inline images, or structured evidence. Out of scope.
- Volume is high and you have no dedup strategy. Storms will clog the queue.

For event-bus style ingest (Security Incident Response, Event Management),
build a separate Resource that writes to `em_event` instead of extending this
handler.

## Extension Points

Three surfaces cover 90% of customization without forking the script.

### 1. Scripted REST Resource (handler script)

File: [`scripts/acs-alert.js`](https://github.com/turbra/rhacs-servicenow-webhook/blob/main/scripts/acs-alert.js)

Extend here when the change is payload-specific:

- Reading additional RHACS paths (`alert.processViolation`, `alert.networkFlowInfo`)
- Writing additional stock or `u_acs_*` fields
- Mirroring `description` into `work_notes` for Activity stream visibility

### 2. Business Rules on the `incident` table

Extend here when the change is ServiceNow-side policy:

- Dedup against an open Incident keyed on policy + cluster + deployment
- Auto-close low-severity Incidents after N days
- Enrich `caller_id` or `cmdb_ci` lookups from cluster/namespace

Business Rules survive handler rewrites. Prefer them when the logic is not
RHACS-payload-specific.

### 3. Assignment Rules / Inbound Actions

Extend here when the change is routing:

- Map severity → assignment group (`CRITICAL_SEVERITY` → SecOps, others → Platform)
- Map cluster name → CMDB CI → owner team
- Raise Major Incident for `CRITICAL_SEVERITY`

Routing via Assignment Rules keeps the handler script narrow.

## What Ships In The Repo

| Path                              | Purpose                                                   |
| --------------------------------- | --------------------------------------------------------- |
| `scripts/acs-alert.js`            | ServiceNow Scripted REST handler                          |
| `docs/`                           | This GitHub Pages site                                    |
| `README.md`                       | Project overview + quick start                            |

No update sets, no scoped app, no CI pipeline. The handler is a single script
you paste into a Scripted REST Resource.

## Related

- [Handler Script Reference]({{ '/reference-handler-script.html' | relative_url }}) — field-level behavior
- [Webhook Payload Reference]({{ '/reference-webhook-payload.html' | relative_url }}) — payload shape and ignored paths
- [Dedup + Storm Control]({{ '/use-case-dedup-storm-control.html' | relative_url }}) — the #1 extension most deployments need
