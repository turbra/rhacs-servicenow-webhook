(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
    function get(obj, path, defVal) {
        try {
            var cur = obj;
            var parts = path.split('.');
            for (var i = 0; i < parts.length; i++) {
                if (cur == null) return defVal;
                cur = cur[parts[i]];
            }
            return (cur === undefined || cur === null) ? defVal : cur;
        } catch (e) {
            return defVal;
        }
    }

    function kv(attrs, key) {
        // attrs is like: [{key:"pod",value:"..."}, ...]
        if (!attrs || !attrs.length) return "";
        for (var i = 0; i < attrs.length; i++) {
            if ((attrs[i].key || "").toLowerCase() === key.toLowerCase())
                return attrs[i].value || "";
        }
        return "";
    }

    var data = JSON.parse(request.body.dataString || "{}");

    var policyName   = get(data, "alert.policy.name", "unknown policy");
    var severity     = get(data, "alert.policy.severity", "UNKNOWN_SEVERITY");
    var policyDesc   = get(data, "alert.policy.description", "");
    var rationale    = get(data, "alert.policy.rationale", "");
    var remediation  = get(data, "alert.policy.remediation", "");

    var clusterName  = get(data, "alert.clusterName", "unknown cluster");
    var namespace    = get(data, "alert.namespace", "unknown");
    var deployName   = get(data, "alert.deployment.name", "unknown");
    var deployType   = get(data, "alert.deployment.type", "workload");

    var violation0   = get(data, "alert.violations.0", {});
    var vMessage     = get(violation0, "message", "");
    var vTime        = get(violation0, "time", "");
    var attrs        = get(violation0, "keyValueAttrs.attrs", []);

    var pod          = kv(attrs, "pod");
    var container    = kv(attrs, "container");
    var command      = kv(attrs, "commands");
    var username     = kv(attrs, "Username");
    var groups       = kv(attrs, "Groups");

    // Map ACS severity to ITIL-ish urgency/impact (tweak as you like)
    // ServiceNow: 1=High, 2=Medium, 3=Low (by default)
    var urgency = 3, impact = 3;
    switch (severity) {
        case "CRITICAL_SEVERITY":
            urgency = 1; impact = 1; break;
        case "HIGH_SEVERITY":
            urgency = 1; impact = 2; break;
        case "MEDIUM_SEVERITY":
            urgency = 2; impact = 2; break;
        case "LOW_SEVERITY":
            urgency = 3; impact = 3; break;
        default:
            urgency = 3; impact = 3; break;
    }

    var descLines = [];
    descLines.push("Source: Red Hat Advanced Cluster Security (ACS)");
    descLines.push("Policy: " + policyName + " (" + severity + ")");
    if (policyDesc) descLines.push("Policy description: " + policyDesc);
    if (rationale)  descLines.push("Rationale: " + rationale);
    if (remediation) descLines.push("Remediation: " + remediation);
    descLines.push("");
    descLines.push("Cluster: " + clusterName);
    descLines.push("Workload: " + deployType + " / " + deployName);
    descLines.push("Namespace: " + namespace);
    if (pod) descLines.push("Pod: " + pod);
    if (container) descLines.push("Container: " + container);
    if (command) descLines.push("Command: " + command);
    if (username) descLines.push("User: " + username);
    if (groups) descLines.push("Groups: " + groups);
    if (vTime) descLines.push("Event time: " + vTime);
    if (vMessage) {
        descLines.push("");
        descLines.push("Violation:");
        descLines.push(vMessage);
    }

    var description = descLines.join("\n");

    var incident = new GlideRecord("incident");
    incident.initialize();

    incident.setValue("short_description",
        "ACS policy violation: " + policyName + " (" + severity + ")");

    incident.setValue("description", description);

    // OPTIONAL: also post to activity stream (customer-visible)
    // incident.setValue("comments", description);

    incident.setValue("urgency", urgency);
    incident.setValue("impact", impact);

    var sysId = incident.insert();

    gs.info("[ACS] created incident sys_id=" + sysId);
    gs.info("[ACS] desc AFTER insert=" + description);

    response.setStatus(201);
    response.setBody({ sys_id: sysId });
})(request, response);