---
title: "Use Case: Severity Mapping"
description: >-
  Tune the RHACS severity → ServiceNow urgency + impact mapping to match your
  ITIL priority definitions before broad rollout.
page_type: use_case
topic_family: use_cases
---

# Use Case: Severity Mapping

The default mapping is a starting point, not a law. Audit it against your
priority definitions before you attach more than a handful of policies.

## Problem

RHACS severity is a fixed 4-value enum (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
ServiceNow priority is derived from a 3×3 urgency × impact matrix the
platform team can customize. If your instance's matrix differs from stock,
the handler's switch block produces priorities that do not match the ITIL
definitions your oncall roster is tuned for.

## Default Mapping

From [`scripts/acs-alert.js`]({{ '/reference-handler-script.html' | relative_url }}#severity--urgency--impact):

| RHACS severity     | Urgency | Impact | Priority (stock matrix) |
| ------------------ | ------- | ------ | ----------------------- |
| CRITICAL_SEVERITY  | 1 High  | 1 High | 1 Critical              |
| HIGH_SEVERITY      | 1 High  | 2 Med  | 2 High                  |
| MEDIUM_SEVERITY    | 2 Med   | 2 Med  | 3 Moderate              |
| LOW_SEVERITY       | 3 Low   | 3 Low  | 4 Low                   |
| (unknown)          | 3 Low   | 3 Low  | 4 Low                   |

## Why This Mapping Is Conservative

`HIGH_SEVERITY` lands at impact 2, not impact 1. Reason: RHACS `HIGH` covers
events like "secret mounted as env var" that are worth a ticket but not
worth paging oncall at 2am for a single deployment. Keeping `P1` reserved
for `CRITICAL_SEVERITY` reduces alert fatigue.

If your org treats RHACS `HIGH` as a page-worthy event, raise impact to 1.

## Audit Checklist Before Rollout

1. Pull your instance's priority matrix:
   **System Policy → Priority Lookup Rules** (or **System Properties →
   System → priority_lookup**)
2. Confirm that `urgency=1, impact=1` produces `P1` on your instance. A
   customized matrix may have remapped this.
3. Walk each severity row with the oncall owner. Ask: "If this fires at
   3am, should someone wake up?"
4. Decide per-severity whether a ticket should auto-assign, auto-page, or
   sit in a queue.

## Changing The Mapping

Edit the switch block in [`scripts/acs-alert.js`](https://github.com/turbra/rhacs-servicenow-webhook/blob/main/scripts/acs-alert.js):

```js
switch (severity) {
  case "CRITICAL_SEVERITY": urgency = 1; impact = 1; break;
  case "HIGH_SEVERITY":     urgency = 1; impact = 1; break;  // was 1,2
  case "MEDIUM_SEVERITY":   urgency = 2; impact = 3; break;  // was 2,2
  case "LOW_SEVERITY":      urgency = 3; impact = 3; break;
  default:                  urgency = 3; impact = 3; break;
}
```

Redeploy by pasting into the Resource **Script** field. No update set, no
restart required.

## Alternative: Let ServiceNow Map It

If your platform team already has an `incident` Business Rule that sets
priority from `short_description` content, leave the handler as-is and
extend the rule.

Advantage: severity logic lives in one place with the rest of your ITIL
policy. Disadvantage: harder to test from RHACS side — you only see the
final priority, not the raw severity.

Pick one home for the logic. Splitting it across the handler and a
Business Rule guarantees drift.

## Per-Cluster Severity Bump

A common ask: "production clusters should upgrade severity by one step."

Do this in a Business Rule, not the handler. The handler has no durable
knowledge of cluster → environment mapping; a Business Rule can consult a
`cmdb_ci_kubernetes_cluster` record or a property list.

Pseudo-rule:

```js
// Before Insert on incident
if (current.short_description.toString().indexOf('cluster=prod-') !== -1
    && current.urgency > 1) {
  current.urgency--;
}
```

Handler stays generic. Environment policy stays with your CMDB.

## Boundaries

- Priority on the Incident record is computed by ServiceNow, not written by
  the handler. Overriding priority directly in the script is possible but
  fights the matrix and causes drift.
- `UNKNOWN_SEVERITY` (the test-payload default) maps to `3,3`. Tests land
  as `P4` by design — they do not wake anyone.

## Related

- [Handler Script Reference]({{ '/reference-handler-script.html' | relative_url }}#severity--urgency--impact)
- [Incident Fields Reference]({{ '/reference-incident-fields.html' | relative_url }}#priority-matrix-reference)
- [Capabilities → Extension points]({{ '/capabilities.html' | relative_url }}#extension-points)
