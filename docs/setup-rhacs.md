---
title: RHACS Setup
description: >-
  Create a Generic Webhook notifier in RHACS and attach it to the policies
  that should open ServiceNow Incidents.
page_type: setup
topic_family: setup
---

# RHACS Setup

The ServiceNow endpoint must already exist. If it does not, finish
[ServiceNow Setup]({{ '/setup-servicenow.html' | relative_url }}) first —
policy attachment against a 404 endpoint is a silent misconfiguration.

## Prerequisites

- RHACS Central reachable and healthy
- Admin role in RHACS (`Admin` or equivalent)
- ServiceNow endpoint URL from [ServiceNow Setup → step 3]({{ '/setup-servicenow.html' | relative_url }}#3-record-the-endpoint-url)
- ServiceNow integration user credentials

## 1. Create The Generic Webhook Notifier

In the RHACS console:

**Platform Configuration → Integrations → Notifier Integrations → Generic Webhook → New Integration**

| Field            | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| Integration name | `ServiceNow`                                                     |
| Endpoint         | `https://<instance>.service-now.com/api/rhacs/alert`             |
| Skip TLS verify  | ❌ (leave off outside lab environments)                           |
| Enable audit log | Optional                                                         |
| Username         | ServiceNow integration user                                      |
| Password         | Integration user password (or API token if using OAuth flow)     |

Click **Test** before saving. A successful test lands a ServiceNow Incident
titled `ACS policy violation: Test (UNKNOWN_SEVERITY)` (the test payload
carries no policy name or severity).

## 2. Attach The Notifier To Policies

**Platform Configuration → Policy Management**

For each policy that should produce a ServiceNow Incident:

1. Open the policy
2. **Action → Edit Policy**
3. In **Notifications**, add `ServiceNow`
4. Save

Attach deliberately. Every attached policy that fires opens an Incident — see
[Dedup + Storm Control]({{ '/use-case-dedup-storm-control.html' | relative_url }}).

## 3. Recommended Starter Set

Start with policies that produce low-volume, high-signal alerts:

| Policy                                        | Why                                                      |
| --------------------------------------------- | -------------------------------------------------------- |
| Kubernetes Actions: Exec into Pod             | Rare, high-context events, easy to triage                |
| Kubernetes Actions: Impersonate Privileged User | Classic privilege escalation signal                    |
| Fixable Severity at least Important           | CVE pressure with a known fix                            |
| Secret Mounted as Environment Variable        | Config drift catch, low volume per cluster               |

Avoid attaching high-volume policies (`Ubuntu Package Manager in Image`,
broad CVE findings) to the ServiceNow notifier until you have storm control
in place.

## 4. Validate End-to-End

From a lab cluster, trigger a known policy:

```bash
oc exec -n gibson garbage -c kserve-container -- /bin/bash
```

Confirm:

- RHACS shows the violation under **Violations**
- ServiceNow shows a new Incident within seconds
- Incident `Description` contains cluster, namespace, deployment, pod, container, command, user, groups

If the Incident is missing fields, go to [Handler Script Reference]({{ '/reference-handler-script.html' | relative_url }})
and verify the payload field names against [Webhook Payload Reference]({{ '/reference-webhook-payload.html' | relative_url }}).

## Related

- [Severity Mapping]({{ '/use-case-severity-mapping.html' | relative_url }}) — tune ITIL priority before broad rollout
- [Exec-into-Pod Use Case]({{ '/use-case-exec-into-pod.html' | relative_url }}) — full operator flow from trigger to assigned Incident
