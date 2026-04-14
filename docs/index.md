---
title: RHACS → ServiceNow Webhook
description: >-
  Generic-Webhook integration sending RHACS policy violations to a ServiceNow
  Scripted REST endpoint that opens Incident records.
page_type: landing
---

<div class="rhacs-badge-row">
  <a href="https://github.com/turbra/rhacs-servicenow-webhook/blob/main/LICENSE"><img alt="License: Apache 2.0" src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" /></a>
</div>

<p class="rhacs-lead">
RHACS policy violation fires. ServiceNow Incident opens. One Scripted REST
handler in the middle turns the RHACS payload into a populated Incident with
severity-mapped urgency/impact, policy context, and the exact workload that
tripped.
</p>

## Pick A Starting Point

<div class="rhacs-decision-grid">
  <a class="rhacs-decision-card" href="{{ '/documentation-map.html' | relative_url }}">
    <span class="rhacs-decision-intent">I know my problem, not the page</span>
    <span class="rhacs-decision-title">Documentation Map</span>
    <span class="rhacs-decision-body">Intent-first table routing operator problems to the correct page.</span>
  </a>
  <a class="rhacs-decision-card" href="{{ '/capabilities.html' | relative_url }}">
    <span class="rhacs-decision-intent">I am evaluating fit</span>
    <span class="rhacs-decision-title">Capabilities</span>
    <span class="rhacs-decision-body">What the integration does, what it deliberately does not do, decision boundaries.</span>
  </a>
  <a class="rhacs-decision-card" href="{{ '/setup-servicenow.html' | relative_url }}">
    <span class="rhacs-decision-intent">I am installing the receiver</span>
    <span class="rhacs-decision-title">ServiceNow Setup</span>
    <span class="rhacs-decision-body">Scripted REST API + Resource definition and ACL requirements.</span>
  </a>
  <a class="rhacs-decision-card" href="{{ '/setup-rhacs.html' | relative_url }}">
    <span class="rhacs-decision-intent">I am configuring the sender</span>
    <span class="rhacs-decision-title">RHACS Setup</span>
    <span class="rhacs-decision-body">Generic Webhook notifier and policy attachment on the RHACS side.</span>
  </a>
  <a class="rhacs-decision-card" href="{{ '/use-case-exec-into-pod.html' | relative_url }}">
    <span class="rhacs-decision-intent">I want a real workflow</span>
    <span class="rhacs-decision-title">Exec-into-Pod Triage</span>
    <span class="rhacs-decision-body">Concrete end-to-end flow from exec violation to assigned SNOW Incident.</span>
  </a>
  <a class="rhacs-decision-card" href="{{ '/reference-handler-script.html' | relative_url }}">
    <span class="rhacs-decision-intent">I am reading the handler</span>
    <span class="rhacs-decision-title">Handler Script Reference</span>
    <span class="rhacs-decision-body">Field-by-field behavior of <code>scripts/acs-alert.js</code>.</span>
  </a>
</div>

## How The Integration Shapes Up

```mermaid
sequenceDiagram
    autonumber
    participant P as RHACS Policy
    participant N as RHACS Notifier<br/>(Generic Webhook)
    participant SN as ServiceNow<br/>Scripted REST
    participant INC as Incident Table

    P->>N: Violation matched
    N->>SN: POST /api/rhacs/alert<br/>JSON payload
    SN->>SN: Parse policy + violation<br/>attrs (pod, container, user)
    SN->>SN: Map severity → urgency/impact
    SN->>INC: GlideRecord insert
    INC-->>SN: sys_id
    SN-->>N: 201 { sys_id }
```

## Operating Model At A Glance

| Layer            | Responsibility                                                                 |
| ---------------- | ------------------------------------------------------------------------------ |
| RHACS policy     | Detects violation and triggers attached notifier                                |
| RHACS notifier   | POSTs JSON payload to ServiceNow endpoint                                       |
| Scripted REST    | Parses payload, builds description, maps severity, writes Incident              |
| Incident table   | Holds short_description, description, urgency, impact                           |

Narrow on purpose. No queue, no dedup store, no retry layer baked in. See
[Capabilities]({{ '/capabilities.html' | relative_url }}) for what the
integration refuses and where to extend.

## Page Families

- Setup: [ServiceNow]({{ '/setup-servicenow.html' | relative_url }}) · [RHACS]({{ '/setup-rhacs.html' | relative_url }})
- Reference: [Handler Script]({{ '/reference-handler-script.html' | relative_url }}) · [Webhook Payload]({{ '/reference-webhook-payload.html' | relative_url }}) · [Incident Fields]({{ '/reference-incident-fields.html' | relative_url }})
- Capabilities: [Decision boundaries]({{ '/capabilities.html' | relative_url }})
- Practical use cases: [Exec-into-Pod]({{ '/use-case-exec-into-pod.html' | relative_url }}) · [Severity mapping]({{ '/use-case-severity-mapping.html' | relative_url }}) · [Dedup + storm control]({{ '/use-case-dedup-storm-control.html' | relative_url }})

## External Reference

- <a href="https://www.redhat.com/en/blog/how-integrate-red-hat-advanced-cluster-security-kubernetes-servicenow">Red Hat blog: ServiceNow + RHACS via Generic Webhook</a>
- <a href="https://docs.redhat.com/en/documentation/red_hat_advanced_cluster_security_for_kubernetes/4.9/html/integrating/integrate-with-servicenow#webhook-configuring-acs_integrate-with-servicenow">RHACS 4.9 product docs: Generic Webhooks</a>
- <a href="https://developer.servicenow.com/dev.do#!/home">ServiceNow Developer Instance</a>
