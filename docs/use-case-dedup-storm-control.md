---
title: "Use Case: Dedup + Storm Control"
description: >-
  Prevent RHACS from opening duplicate Incidents for the same underlying
  policy violation on every evaluation cycle.
page_type: use_case
topic_family: use_cases
---

# Use Case: Dedup + Storm Control

The integration writes one Incident per POST. RHACS can POST for the same
underlying violation repeatedly. Without dedup, a single misconfigured
deployment opens hundreds of Incidents in a day.

## Problem

RHACS Generic Webhook fires on each alert evaluation. For a persistent
condition (pod running as root, secret mounted as env var), the same
violation re-evaluates and re-fires until the underlying configuration
changes. The handler has no idea it has seen this policy + deployment
before.

Observable symptoms:

- Incident count climbs faster than operator throughput
- Dashboards filled with near-identical `short_description` values
- SLA breaches from sheer volume, not from individual events

## Strategy: ServiceNow-Side Dedup

Keep the handler narrow. Add a Business Rule on `incident` (Before Insert)
that collapses duplicates onto an open parent Incident.

Dedup key (recommended):

```text
policy_name + cluster + namespace + deployment
```

Pod name is too volatile — re-scheduled pods get new names and would break
the match. Deployment is the stable unit for "same problem, same workload".

## Business Rule Sketch

**System Definition → Business Rules → New**

| Field         | Value                                       |
| ------------- | ------------------------------------------- |
| Name          | `ACS Incident dedup`                        |
| Table         | `Incident [incident]`                       |
| When          | `before`                                    |
| Order         | `100`                                       |
| Insert        | ✅                                          |
| Advanced      | ✅                                          |

Script:

```js
(function executeRule(current, previous) {
  var shortDesc = current.short_description.toString();
  if (shortDesc.indexOf('ACS policy violation: ') !== 0) return;

  // Extract dedup key from description
  var desc = current.description.toString();
  var cluster = _grab(desc, /^Cluster:\s*(.+)$/m);
  var namespace = _grab(desc, /^Namespace:\s*(.+)$/m);
  var workload = _grab(desc, /^Workload:\s*[^/]+\/\s*(.+)$/m);
  var dedupKey = [shortDesc, cluster, namespace, workload].join('|');

  var gr = new GlideRecord('incident');
  gr.addQuery('short_description', shortDesc);
  gr.addQuery('state', 'IN', '1,2,3');  // New, In Progress, On Hold
  gr.addQuery('description', 'CONTAINS', 'Cluster: ' + cluster);
  gr.addQuery('description', 'CONTAINS', 'Namespace: ' + namespace);
  gr.setLimit(1);
  gr.query();

  if (gr.next()) {
    gr.work_notes = '[ACS dedup] additional occurrence at '
      + new GlideDateTime().getDisplayValue()
      + '\nKey: ' + dedupKey;
    gr.update();
    current.setAbortAction(true);  // prevent new insert
  }

  function _grab(s, re) { var m = re.exec(s); return m ? m[1].trim() : ''; }
})(current, previous);
```

Behavior:

- First violation → new Incident
- Same policy + cluster + namespace + deployment while Incident is open →
  `work_notes` append, no new Incident
- Incident closed → next violation reopens as a fresh Incident

## Why Dedup In ServiceNow, Not In The Handler

- Handler has no read access to prior Incidents without extra GlideRecord
  work — once you add that, you are building a Business Rule anyway
- Business Rules survive handler rewrites
- Dedup logic depends on Incident state (open vs closed), which is a
  ServiceNow concept, not an RHACS concept
- Operators can tune the rule without redeploying the handler

## Storm Control: Rate Limiting

Separate concern: bursts from a newly-attached policy that suddenly covers
10,000 pods.

Options, pick one:

| Control                               | Where     | Cost                              |
| ------------------------------------- | --------- | --------------------------------- |
| RHACS policy scope narrowing          | RHACS     | Free. Excludes known-noisy namespaces. |
| Webhook rate limit on the edge proxy  | Proxy     | Requires a proxy. Drops events silently. |
| ServiceNow Business Rule throttle     | ServiceNow| Add rate-limit state to a scratchpad table; complexity. |

Prefer RHACS-side scope narrowing. Dropping events at the proxy hides real
signal; throttling in ServiceNow builds state that drifts.

## Observability

Always log the dedup decision:

```js
gs.info('[ACS dedup] collapsed onto ' + gr.number + ' key=' + dedupKey);
```

Without this, "why did my new violation not create a ticket" becomes
unanswerable.

## Boundaries

- Dedup by `short_description` string match breaks if you change the
  `short_description` format in the handler. Keep them in sync.
- Matching on `description CONTAINS cluster/namespace` is brittle if you
  change the description layout. Consider adding `u_acs_cluster`,
  `u_acs_namespace` columns and matching those — see
  [Incident Fields Reference]({{ '/reference-incident-fields.html' | relative_url }}#extending-the-field-set).
- `setAbortAction(true)` aborts insert but the handler still returns `201`
  with a bogus `sys_id` (the pre-insert current). RHACS does not care, but
  your logs will show inserts that did not land in the table.

## Related

- [Capabilities → What it does not do]({{ '/capabilities.html' | relative_url }}#what-it-does-not-do)
- [Incident Fields Reference]({{ '/reference-incident-fields.html' | relative_url }}#extending-the-field-set)
- [RHACS Setup → policy attachment]({{ '/setup-rhacs.html' | relative_url }}#2-attach-the-notifier-to-policies)
