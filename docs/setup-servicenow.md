---
title: ServiceNow Setup
description: >-
  Create the Scripted REST API, Resource, and handler script that receives
  RHACS policy violations and writes Incident records.
page_type: setup
topic_family: setup
source_path: scripts/acs-alert.js
---

# ServiceNow Setup

Stand up the receiver before touching RHACS. RHACS will 404 against a missing
endpoint and mask the rest of your setup work.

## Prerequisites

- [ServiceNow instance with admin rights](https://developer.servicenow.com/dev.do#!/home) (a free Developer instance works)
- Permission to create Scripted REST APIs and Scripted REST Resources
- A dedicated integration user with `rest_service` + `itil` roles (recommended over reusing a human account)

## 1. Create A Scripted REST API

Navigate: **System Web Services → Scripted Web Services → Scripted REST APIs → New**

| Field                     | Value                             |
| ------------------------- | --------------------------------- |
| Name                      | `rhacs`                           |
| API ID                    | `rhacs`                           |
| Default ACLs              | `Scripted REST External Default`  |

Submit to create.

## 2. Add A POST Resource

Inside the API, open **Resources → New**.

| Field                     | Value    |
| ------------------------- | -------- |
| Name                      | `alert`  |
| HTTP method               | `POST`   |
| Requires authentication   | ✅       |
| Requires ACL authorization| ✅       |
| ACLs                      | `Scripted REST External Default` |

Paste the handler script from [`scripts/acs-alert.js`](https://github.com/turbra/rhacs-servicenow-webhook/blob/main/scripts/acs-alert.js)
into **Script**. Field-level behavior documented in [Handler Script Reference]({{ '/reference-handler-script.html' | relative_url }}).

## 3. Record The Endpoint URL

ServiceNow shows the Resource path on the Resource form.

```text
https://<instance>.service-now.com/api/<api_id>/<resource_name>
```

Concrete example:

```text
https://dev12345.service-now.com/api/rhacs/alert
```

This is the URL RHACS POSTs to. It goes into the RHACS notifier endpoint
field — see [RHACS Setup]({{ '/setup-rhacs.html' | relative_url }}).

## 4. Smoke Test With `curl`

Before attaching real policies, confirm the endpoint writes Incidents.

```bash
curl -u "integration-user:secret" \
  -H "Content-Type: application/json" \
  -X POST \
  --data '{
    "alert": {
      "policy": { "name": "Smoke Test", "severity": "LOW_SEVERITY" },
      "clusterName": "lab",
      "namespace": "default",
      "deployment": { "name": "smoke", "type": "Deployment" },
      "violations": [ { "message": "manual curl test" } ]
    }
  }' \
  https://<instance>.service-now.com/api/rhacs/alert
```

Expected: `201` with `{ "sys_id": "..." }` and a new Incident titled
`ACS policy violation: Smoke Test (LOW_SEVERITY)`.

If 401: check integration-user credentials and ACL assignment.
If 403: resource-level ACL missing on the Resource form.
If 500: look at **System Logs → System Log** for the script stack trace.

## 5. Authentication Choice

Pick one:

| Option      | When it fits                                                   |
| ----------- | -------------------------------------------------------------- |
| Basic auth  | Fastest path. Dedicated integration user with minimal roles.   |
| OAuth       | When your org already centralizes ServiceNow client credentials. |
| Mutual TLS  | Only if your RHACS notifier path sits behind a TLS-terminating proxy that can present a client cert. |

Do not reuse a human admin account. If the RHACS side is compromised, it holds
whatever roles that user has.

## Related

- [RHACS Setup]({{ '/setup-rhacs.html' | relative_url }}) — attach policies once the endpoint works.
- [Handler Script Reference]({{ '/reference-handler-script.html' | relative_url }}) — field-by-field behavior of what you just pasted.
- [Incident Fields Reference]({{ '/reference-incident-fields.html' | relative_url }}) — why `Description` may be invisible on some form views.
