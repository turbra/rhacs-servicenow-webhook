---
title: Webhook Payload Reference
description: >-
  Shape of the RHACS Generic Webhook JSON payload, with the exact paths the
  handler reads and which paths it ignores.
page_type: reference
topic_family: reference
---

# Webhook Payload Reference

RHACS Generic Webhook emits a JSON envelope with one top-level `alert` object.
This page documents what the handler reads. Paths not listed are ignored by
the current handler.

## Top-Level Envelope

```json
{
  "alert": { ... },
  "auditLog": { ... }
}
```

Only `alert` is consumed. `auditLog` is emitted in some RHACS versions but
the handler never references it.

## Fields The Handler Reads

| JSON path                                           | Purpose in Incident                         | Required for non-default output |
| --------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| `alert.policy.name`                                 | `short_description` + description           | yes                             |
| `alert.policy.severity`                             | severity mapping + description              | yes                             |
| `alert.policy.description`                          | description line                            | optional                        |
| `alert.policy.rationale`                            | description line                            | optional                        |
| `alert.policy.remediation`                          | description line                            | optional                        |
| `alert.clusterName`                                 | description line                            | optional                        |
| `alert.namespace`                                   | description line                            | optional                        |
| `alert.deployment.name`                             | description line                            | optional                        |
| `alert.deployment.type`                             | description line                            | optional                        |
| `alert.violations[0].message`                       | description Violation block                 | optional                        |
| `alert.violations[0].time`                          | description event time                      | optional                        |
| `alert.violations[0].keyValueAttrs.attrs[].key/value` | pod, container, command, user, groups lookup | optional                     |

## Key/Value Attribute Keys

Within `violations[0].keyValueAttrs.attrs`, the handler matches these keys
case-insensitively and writes the matched value into the description:

| Key        | Incident line label | Typical source                                              |
| ---------- | ------------------- | ----------------------------------------------------------- |
| `pod`      | Pod                 | Kubernetes Actions policies (exec, port-forward)            |
| `container`| Container           | Kubernetes Actions policies                                 |
| `commands` | Command             | Exec/port-forward policies                                  |
| `Username` | User                | Kubernetes audit user attribute                             |
| `Groups`   | Groups              | Kubernetes audit groups list                                |

Note the literal spelling: `commands` (plural, lowercase) and `Username` /
`Groups` (capitalized). These are RHACS-chosen attribute keys; do not silently
rename them without updating the handler.

## Minimal Valid Payload

This payload will produce an Incident successfully:

```json
{
  "alert": {
    "policy": {
      "name": "Kubernetes Actions: Exec into Pod",
      "severity": "HIGH_SEVERITY"
    }
  }
}
```

Result: `short_description = "ACS policy violation: Kubernetes Actions: Exec into Pod (HIGH_SEVERITY)"`,
urgency 1, impact 2. Everything else empty.

## Realistic Exec-into-Pod Payload

```json
{
  "alert": {
    "policy": {
      "name": "Kubernetes Actions: Exec into Pod",
      "severity": "HIGH_SEVERITY",
      "description": "Alerts when Kubernetes API receives request to execute command in container",
      "rationale": "'pods/exec' is non-standard approach for interacting with containers.",
      "remediation": "Restrict RBAC access to the 'pods/exec' resource."
    },
    "clusterName": "local-cluster",
    "namespace": "gibson",
    "deployment": {
      "name": "gibson-deployment",
      "type": "Deployment"
    },
    "violations": [
      {
        "message": "Kubernetes API received exec '/bin/bash' request into pod 'garbage' container 'kserve-container'",
        "time": "2026-02-12T15:22:22.276480996Z",
        "keyValueAttrs": {
          "attrs": [
            { "key": "pod",       "value": "garbage" },
            { "key": "container", "value": "kserve-container" },
            { "key": "commands",  "value": "/bin/bash" },
            { "key": "Username",  "value": "zero-cool" },
            { "key": "Groups",    "value": "ocp-admins, system:authenticated:oauth, system:authenticated" }
          ]
        }
      }
    ]
  }
}
```

See the Incident this payload produces in [Exec-into-Pod Use Case]({{ '/use-case-exec-into-pod.html' | relative_url }}#expected-incident).

## Paths The Handler Ignores

Currently unused by the handler but present in typical RHACS 4.x payloads:

- `alert.id` — RHACS alert UUID, useful for dedup
- `alert.firstOccurred`, `alert.time` — alert-level timestamps
- `alert.deployment.id`, `alert.deployment.labels`, `alert.deployment.annotations`
- `alert.violations[1..N]` — only index 0 is read
- `alert.processViolation` — process-indicator policies
- `alert.networkFlowInfo` — network policies

If you need any of these in the Incident, extend the handler. See the
extension surfaces in [Capabilities → Extension points]({{ '/capabilities.html' | relative_url }}#extension-points).
