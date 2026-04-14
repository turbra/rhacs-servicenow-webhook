---
title: Incident Fields Reference
description: >-
  Which ServiceNow Incident fields the integration populates, which form views
  expose them, and how to surface content in the Activity stream.
page_type: reference
topic_family: reference
---

# Incident Fields Reference

What lands on the Incident record after a successful POST.

## Fields Populated

| Field                     | Populated? | Source                                                                   |
| ------------------------- | ---------- | ------------------------------------------------------------------------ |
| `number`                  | auto       | ServiceNow assigns                                                       |
| `sys_id`                  | auto       | ServiceNow assigns, returned to RHACS                                    |
| `short_description`       | yes        | `"ACS policy violation: <name> (<severity>)"`                            |
| `description`             | yes        | Multi-line summary (see [Handler Script Reference]({{ '/reference-handler-script.html' | relative_url }}#description-payload-shape)) |
| `urgency`                 | yes        | Mapped from severity                                                     |
| `impact`                  | yes        | Mapped from severity                                                     |
| `priority`                | derived    | Computed by ServiceNow from urgency × impact                              |
| `caller_id`               | integration user | ACL default — the authenticated webhook caller                      |
| `assignment_group`        | no         | Add with an Assignment Rule or extend the handler                        |
| `comments` / `work_notes` | no         | Optional extension (see [Activity stream visibility](#activity-stream-visibility)) |
| `u_acs_*` custom fields   | no         | Only if you extend the handler and add the custom fields to the table    |

## Form-View Gotcha: Description Missing

`description` is set on the record but may not render on the form you open.

Root cause: the **Self Service** form view often omits the `Description`
field. Field exists on the record, but not on the view.

Fix once per form view, not per Incident:

1. Open an Incident
2. **Configure → Form Layout** (or **Configure → Form Design**)
3. Add **Description** to the Selected column
4. Save

Verify with: open the record in **List View → hamburger → Personalize List
Columns** and confirm `Description` renders.

## Activity Stream Visibility

`description` is static on the form. If your operators rely on the Activity
stream, populate one of these:

| Field         | Who sees it                        |
| ------------- | ---------------------------------- |
| `comments`    | Customer-visible, Activity stream  |
| `work_notes`  | Internal, Activity stream          |

Extension snippet (paste below the existing `description` set):

```js
// Mirror description into work_notes for Activity stream visibility
incident.setValue("work_notes", description);
```

Pick `comments` instead if your process expects requester-facing updates.

## Priority Matrix Reference

ServiceNow default priority matrix (urgency × impact):

| urgency \ impact | 1 High | 2 Med  | 3 Low  |
| ---------------- | ------ | ------ | ------ |
| **1 High**       | 1 Crit | 2 High | 3 Mod  |
| **2 Med**        | 2 High | 3 Mod  | 4 Low  |
| **3 Low**        | 3 Mod  | 4 Low  | 5 Plan |

If your instance customized this matrix, verify mapping before treating the
severity switch in the handler as authoritative. See
[Severity Mapping Use Case]({{ '/use-case-severity-mapping.html' | relative_url }}).

## Extending The Field Set

Cleanest extension order:

1. Add custom fields to the `incident` table (`u_acs_cluster`, `u_acs_namespace`, `u_acs_policy`, `u_acs_pod`)
2. Add them to the relevant form view
3. Extend the handler to `setValue` them

Do not stuff more data into `description` as your only change — once you need
to filter or report by cluster/namespace, free-text is the wrong shape.
