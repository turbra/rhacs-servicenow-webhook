# RHACS → ServiceNow Incident Integration (Generic Webhook)

This repo contains a ServiceNow **Scripted REST API** resource that receives webhook notifications from **Red Hat Advanced Cluster Security for Kubernetes (RHACS)** and creates **Incident** records for policy violations.

> Reference guide:  
> - [Red Hat blog (ServiceNow + RHACS via Generic Webhook): ](https://www.redhat.com/en/blog/how-integrate-red-hat-advanced-cluster-security-kubernetes-servicenow)  
> - [RHACS docs (Generic Webhooks):](https://docs.redhat.com/en/documentation/red_hat_advanced_cluster_security_for_kubernetes/4.9/html/integrating/integrate-with-servicenow#webhook-configuring-acs_integrate-with-servicenow) 

---

## How it works (high level)

1. **ServiceNow** exposes a Scripted REST endpoint (HTTP POST).
2. **RHACS** sends policy violation alerts to that endpoint using a **Generic Webhook** notifier.
3. The Scripted REST resource:
   - parses the JSON payload
   - builds a human-readable summary
   - creates a ServiceNow `incident` record (and optionally logs/debugs the payload)

---

## Prerequisites

### ServiceNow
- [A ServiceNow instance (Developer/Dev is fine)](https://developer.servicenow.com/dev.do#!/home)
- Once Logged in `Request instance`
  - Choose your release and select `Request`
- Permission to create:
  - Scripted REST API
  - Scripted REST Resource

### RHACS
- RHACS installed and running (on OpenShift or Kubernetes)
- Ability to create:
  - Notifier integration (Generic Webhook)
  - Policy notification attachment (attach notifier to selected policies)

---

## ServiceNow setup

### 1) Create a Scripted REST API

Navigate to:

**System Web Services → Scripted Web Services → Scripted REST APIs → New**

Example values:

* **Name**: `rhacs`
* **API ID**: `rhacs`
* **Security - Default ACLs**: `Scripted REST External Default`

Submit to create the API.

### 2) Create a Resource (POST)

Inside your new Scripted REST API, create a new **Resource**:

* **Name**: `alert`
* **HTTP method**: `POST`

Enable:

* ✅ Requires authentication
* ✅ Requires ACL authorization
* ✅ ACLs: `Scripted REST External Default`

Paste in your handler script (see `servicenow/scripts/acs-alert.js`).

### 3) Note your endpoint URL

ServiceNow will show a **Resource path** for the API and resource.

Your final endpoint looks like:

```text
https://<your-instance>.service-now.com/api/<api_id>/<resource_name>
```

Example:

```text
https://dev12345.service-now.com/api/rhacs/alert
```

---

## RHACS setup

### 1) Create a Generic Webhook notifier

In RHACS console:

**Platform Configuration → Integrations → Notifier Integrations → Generic Webhook**

Configure:

* **Integration name**: `ServiceNow`
* **Endpoint**: `https://<your-servicenow-instance>/api/<api_id>/<resource_name>`

Authentication options:

* Basic auth (username/password)
* Or token-based headers / OAuth (depends on your ServiceNow setup)

### 2) Attach notifier to policies

In RHACS console:

**Platform Configuration → Policy Management**

* Select a policy
* **Action → Edit Policy**
* Under **Attach notifiers**, select `ServiceNow`
* Save

---

## Testing

1. Trigger a policy violation in RHACS for a policy that has the notifier attached.
2. Confirm RHACS shows an alert.
3. In ServiceNow:

   * Check **Incidents** for newly created records
   * Check **System Logs** for webhook payload/debug output (if enabled)

### Expected results (example policy: Kubernetes Actions: Exec into Pod)

After triggering the **RHACS** policy violation **`Kubernetes Actions: Exec into Pod`**, a new **ServiceNow Incident** should be created with a **Short description** similar to:

- `ACS policy violation: Kubernetes Actions: Exec into Pod (HIGH_SEVERITY)`

…and the **Incident Description** should include a formatted summary like:

```
Source: Red Hat Advanced Cluster Security (ACS)
Policy: Kubernetes Actions: Exec into Pod (HIGH_SEVERITY)
Policy description: Alerts when Kubernetes API receives request to execute command in container
Rationale: 'pods/exec' is non-standard approach for interacting with containers. Attackers with permissions could execute malicious code and compromise resources within a cluster
Remediation: Restrict RBAC access to the 'pods/exec' resource according to the Principle of Least Privilege. Limit such usage only to development, testing or debugging (non-production) activities

Cluster: local-cluster
Workload: Deployment / gibson-deployment
Namespace: gibson
Pod: garbage
Container: kserve-container
Command: /bin/bash
User: zero-cool
Groups: ocp-admins, system:authenticated:oauth, system:authenticated
Event time: 2026-02-12T15:22:22.276480996Z

Violation:
Kubernetes API received exec '/bin/bash' request into pod 'garbage' container 'kserve-container'

```

---

## Common gotcha: “Description not showing” in ServiceNow

Even if your script sets `incident.description`, it might **not appear** on the incident form depending on the **Form View** you’re using.

Example: **View: Self Service** often does not include the `Description` field by default.

Fix:

* Open the incident
* Switch to the correct view (or configure the current view)
* **Configure → Form Layout**
* Add **Description** to the selected fields

Tip:

* If you want the text to appear in the Activity stream, also populate:

  * `incident.comments` (customer-visible)
  * or `incident.work_notes` (internal)

---

## Customization ideas

* Map RHACS `severity` → ServiceNow `impact/urgency/priority`
* Add structured fields:

  * Cluster name
  * Namespace
  * Deployment name
  * Username / Groups (from key-value attrs)
  * Command / Pod / Container (for exec events)
* Store raw payload (custom field or attachment) for troubleshooting
* Deduplicate incidents (e.g., same policy+deployment within N minutes)

---

## Security notes

* Prefer a dedicated ServiceNow integration user with minimum required roles.
* Require authentication on the Scripted REST resource.
* Consider rate limiting / dedup logic to avoid alert storms.
* Treat payload data as security-sensitive (it can contain usernames, groups, commands, etc.).

---

## License

Apache License 2.0. See [`LICENSE`](./LICENSE).

Copyright 2026 Red Hat, Inc.
