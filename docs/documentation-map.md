---
title: Documentation Map
description: >-
  Intent-first routing from operator problem to the correct page. Use when you
  know the question but not the title.
page_type: map
---

# Documentation Map

Pick by problem. Each route lands on the page that actually answers the
question, not a landing page that defers again.

## Route By Intent

| I need to…                                                       | Start here                                                                       | Then                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| decide if this integration is the right fit                      | [Capabilities]({{ '/capabilities.html' | relative_url }})                         | [Use cases](#practical-use-cases)                                              |
| stand up the ServiceNow side                                     | [ServiceNow Setup]({{ '/setup-servicenow.html' | relative_url }})                  | [Handler Script]({{ '/reference-handler-script.html' | relative_url }})          |
| stand up the RHACS side                                          | [RHACS Setup]({{ '/setup-rhacs.html' | relative_url }})                            | [Webhook Payload]({{ '/reference-webhook-payload.html' | relative_url }})        |
| understand what the handler actually does with a payload         | [Handler Script]({{ '/reference-handler-script.html' | relative_url }})            | [Incident Fields]({{ '/reference-incident-fields.html' | relative_url }})        |
| confirm which RHACS JSON fields the integration reads            | [Webhook Payload]({{ '/reference-webhook-payload.html' | relative_url }})          | [Handler Script]({{ '/reference-handler-script.html' | relative_url }})          |
| map RHACS severity to ServiceNow urgency + impact                | [Severity Mapping]({{ '/use-case-severity-mapping.html' | relative_url }})         | [Incident Fields]({{ '/reference-incident-fields.html' | relative_url }})        |
| triage an exec-into-pod violation end-to-end                     | [Exec-into-Pod Triage]({{ '/use-case-exec-into-pod.html' | relative_url }})        | [Handler Script]({{ '/reference-handler-script.html' | relative_url }})          |
| stop alert storms from overwhelming Incident                     | [Dedup + Storm Control]({{ '/use-case-dedup-storm-control.html' | relative_url }})| [Capabilities]({{ '/capabilities.html' | relative_url }})                        |
| troubleshoot "Description field not showing" in the Incident form| [Incident Fields]({{ '/reference-incident-fields.html' | relative_url }})          | —                                                                              |

## Page Types

| Type             | Reads like                                 | Examples                                                                                                                                                                       |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Setup            | one-time install steps, ordered            | [ServiceNow]({{ '/setup-servicenow.html' | relative_url }}), [RHACS]({{ '/setup-rhacs.html' | relative_url }})                                                                    |
| Reference        | field/line-level facts, scannable          | [Handler Script]({{ '/reference-handler-script.html' | relative_url }}), [Payload]({{ '/reference-webhook-payload.html' | relative_url }}), [Incident Fields]({{ '/reference-incident-fields.html' | relative_url }}) |
| Capabilities     | what integration does + refuses            | [Capabilities]({{ '/capabilities.html' | relative_url }})                                                                                                                       |
| Practical use case | operator workflow with problem + pattern | [Exec-into-Pod]({{ '/use-case-exec-into-pod.html' | relative_url }}), [Severity mapping]({{ '/use-case-severity-mapping.html' | relative_url }}), [Dedup]({{ '/use-case-dedup-storm-control.html' | relative_url }}) |

## Practical Use Cases

- [Exec-into-Pod Triage]({{ '/use-case-exec-into-pod.html' | relative_url }}) — RHACS catches `kubectl exec`, SNOW Incident lands with pod/container/user/command populated.
- [Severity → Urgency/Impact]({{ '/use-case-severity-mapping.html' | relative_url }}) — adjust the handler switch so ITIL priority matches RHACS severity reality.
- [Dedup + Storm Control]({{ '/use-case-dedup-storm-control.html' | relative_url }}) — keep a noisy policy from opening a thousand Incidents during an incident.

## Read Order For First-Time Setup

1. [Capabilities]({{ '/capabilities.html' | relative_url }}) — confirm this integration matches what you actually need
2. [ServiceNow Setup]({{ '/setup-servicenow.html' | relative_url }}) — endpoint exists before RHACS can POST
3. [RHACS Setup]({{ '/setup-rhacs.html' | relative_url }}) — notifier + policy attachment
4. [Exec-into-Pod Use Case]({{ '/use-case-exec-into-pod.html' | relative_url }}) — smoke-test with a known trigger
5. [Severity Mapping]({{ '/use-case-severity-mapping.html' | relative_url }}) — tune priority before real rollout
