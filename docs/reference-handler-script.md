---
title: Handler Script Reference
description: >-
  Field-level behavior of scripts/acs-alert.js — the Scripted REST handler
  that parses RHACS payloads and writes ServiceNow Incidents.
page_type: reference
topic_family: reference
source_path: scripts/acs-alert.js
---

# Handler Script Reference

Behavioral reference for [`scripts/acs-alert.js`](https://github.com/turbra/rhacs-servicenow-webhook/blob/main/scripts/acs-alert.js).
Scan for the field you care about — this page is not a walkthrough.

## Entry Contract

| Aspect   | Value                                                          |
| -------- | -------------------------------------------------------------- |
| Trigger  | HTTP POST to the Scripted REST Resource (default `/api/rhacs/alert`) |
| Input    | JSON body, RHACS Generic Webhook payload                       |
| Output   | `201` with `{ "sys_id": "<incident-sys_id>" }`                 |
| Side effect | New record in the `incident` table                          |

## Field Extraction

The handler reads these paths from the JSON payload. Full payload documented in
[Webhook Payload Reference]({{ '/reference-webhook-payload.html' | relative_url }}).

| Variable       | Source path                                     | Default                |
| -------------- | ----------------------------------------------- | ---------------------- |
| `policyName`   | `alert.policy.name`                             | `"unknown policy"`     |
| `severity`     | `alert.policy.severity`                         | `"UNKNOWN_SEVERITY"`   |
| `policyDesc`   | `alert.policy.description`                      | `""`                   |
| `rationale`    | `alert.policy.rationale`                        | `""`                   |
| `remediation`  | `alert.policy.remediation`                      | `""`                   |
| `clusterName`  | `alert.clusterName`                             | `"unknown cluster"`    |
| `namespace`    | `alert.namespace`                               | `"unknown"`            |
| `deployName`   | `alert.deployment.name`                         | `"unknown"`            |
| `deployType`   | `alert.deployment.type`                         | `"workload"`           |
| `vMessage`     | `alert.violations[0].message`                   | `""`                   |
| `vTime`        | `alert.violations[0].time`                      | `""`                   |
| `pod`          | `violations[0].keyValueAttrs.attrs[key=pod].value`        | `""`         |
| `container`    | `violations[0].keyValueAttrs.attrs[key=container].value`  | `""`         |
| `command`      | `violations[0].keyValueAttrs.attrs[key=commands].value`   | `""`         |
| `username`     | `violations[0].keyValueAttrs.attrs[key=Username].value`   | `""`         |
| `groups`       | `violations[0].keyValueAttrs.attrs[key=Groups].value`     | `""`         |

Only `violations[0]` is read. Multi-violation alerts lose detail beyond the
first entry. See [Capabilities → What it does not do]({{ '/capabilities.html' | relative_url }}#what-it-does-not-do).

## Severity → Urgency + Impact

```js
switch (severity) {
  case "CRITICAL_SEVERITY": urgency = 1; impact = 1; break;
  case "HIGH_SEVERITY":     urgency = 1; impact = 2; break;
  case "MEDIUM_SEVERITY":   urgency = 2; impact = 2; break;
  case "LOW_SEVERITY":      urgency = 3; impact = 3; break;
  default:                  urgency = 3; impact = 3; break;
}
```

Effect in ServiceNow:

| RHACS severity      | Urgency | Impact | Priority\* |
| ------------------- | ------- | ------ | ---------- |
| CRITICAL_SEVERITY   | 1 High  | 1 High | 1 Critical |
| HIGH_SEVERITY       | 1 High  | 2 Med  | 2 High     |
| MEDIUM_SEVERITY     | 2 Med   | 2 Med  | 3 Moderate |
| LOW_SEVERITY        | 3 Low   | 3 Low  | 4 Low      |
| (anything else)     | 3 Low   | 3 Low  | 4 Low      |

\* Priority is computed by ServiceNow from the urgency/impact matrix.

Rationale and alternatives: [Severity Mapping Use Case]({{ '/use-case-severity-mapping.html' | relative_url }}).

## Incident Record Written

| Incident field        | Value                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| `short_description`   | `"ACS policy violation: " + policyName + " (" + severity + ")"`           |
| `description`         | Multi-line summary (see below)                                            |
| `urgency`             | Mapped from severity                                                      |
| `impact`              | Mapped from severity                                                      |

No `comments`, no `work_notes`, no custom fields are written by default. To
surface content in the Activity stream, see [Incident Fields Reference]({{ '/reference-incident-fields.html' | relative_url }}#activity-stream-visibility).

## Description Payload Shape

The handler concatenates these lines, skipping empties:

```text
Source: Red Hat Advanced Cluster Security (ACS)
Policy: <policyName> (<severity>)
Policy description: <policyDesc>
Rationale: <rationale>
Remediation: <remediation>

Cluster: <clusterName>
Workload: <deployType> / <deployName>
Namespace: <namespace>
Pod: <pod>
Container: <container>
Command: <command>
User: <username>
Groups: <groups>
Event time: <vTime>

Violation:
<vMessage>
```

Pod/container/command/user/groups/event-time/violation lines are only emitted
when the corresponding field is non-empty.

## Logging

```js
gs.info("[ACS] created incident sys_id=" + sysId);
gs.info("[ACS] desc AFTER insert=" + description);
```

Full payload contents land in **System Logs → System Log → All**. The log
message carries PII-adjacent data (usernames, groups, commands). Keep log
retention in mind.

## Related

- [Webhook Payload Reference]({{ '/reference-webhook-payload.html' | relative_url }}) — JSON shape before parsing
- [Incident Fields Reference]({{ '/reference-incident-fields.html' | relative_url }}) — downstream effect of each field
- [Capabilities]({{ '/capabilities.html' | relative_url }}) — what the handler refuses to do
