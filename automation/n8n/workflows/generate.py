"""Writes the n8n workflow exports in this folder. Run from automation/:
    python3 n8n/workflows/generate.py
Hand-edit nothing in the JSON; change this file and re-run, so the approval
pattern stays identical across workflows.

The approval pattern (Phase 3 fix): the email carries ONE button that opens a
confirm page; the decision is a required form field submitted with POST. An email
link scanner that fetches the page submits nothing, so it cannot approve.
"""
import json
import pathlib
import sys
import uuid

HERE = pathlib.Path(__file__).parent
# An optional output directory, so the drift test can generate elsewhere and compare.
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE
# Stable ids: a re-run produces the same file, so diffs show real changes only.
ns = uuid.UUID("6f1c9a52-3b7e-4a0f-9d6e-0c7a1f2b3c4d")


def nid(name: str) -> str:
    return str(uuid.uuid5(ns, name))


def webhook(wf: str, path: str, credential: str) -> dict:
    return {
        "id": nid(f"{wf}:webhook"), "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2,
        "position": [0, 0], "webhookId": nid(f"{wf}:webhook-id"),
        "parameters": {"httpMethod": "POST", "path": path, "authentication": "headerAuth",
                       "responseMode": "onReceived", "options": {}},
        "credentials": {"httpHeaderAuth": {"id": "", "name": credential}},
    }


def guard(wf: str, kind: str, extra: list) -> dict:
    conditions = [
        {"id": nid(f"{wf}:c-kind"), "leftValue": "={{ $json.body.kind }}", "rightValue": kind,
         "operator": {"type": "string", "operation": "equals"}},
        *extra,
    ]
    return {
        "id": nid(f"{wf}:guard"), "name": "Is a valid request?", "type": "n8n-nodes-base.if", "typeVersion": 2,
        "position": [240, 0],
        "parameters": {"conditions": {"options": {"caseSensitive": True, "typeValidation": "strict"},
                                      "combinator": "and", "conditions": conditions}, "options": {}},
    }


def approval_guards(wf: str) -> list:
    return [
        {"id": nid(f"{wf}:c-url"), "leftValue": "={{ $json.body.callback_url }}", "rightValue": "https://api.trigger.dev/",
         "operator": {"type": "string", "operation": "startsWith"}},
        {"id": nid(f"{wf}:c-hash"), "leftValue": "={{ $json.body.content_hash }}", "rightValue": "^[0-9a-f]{64}$",
         "operator": {"type": "string", "operation": "regex"}},
    ]


def confirm_page(wf: str, subject: str, message: str, title: str) -> dict:
    return {
        "id": nid(f"{wf}:ask"), "name": "Ask the owner (confirm page)", "type": "n8n-nodes-base.emailSend", "typeVersion": 2.1,
        "position": [480, -100],
        "parameters": {
            "operation": "sendAndWait",
            "fromEmail": "SET-BEFORE-ACTIVATING@example.invalid",
            "toEmail": "SET-BEFORE-ACTIVATING@example.invalid",
            "subject": subject,
            "message": message,
            # A form, not approve/reject links: the decision only exists once the form is POSTed.
            "responseType": "customForm",
            "defineForm": "fields",
            "formFields": {"values": [
                {"fieldLabel": "Decision", "fieldType": "dropdown", "requiredField": True,
                 "fieldOptions": {"values": [{"option": "Reject"}, {"option": "Approve"}]}},
                {"fieldLabel": "I have read the text exactly as it will be published", "fieldType": "dropdown",
                 "requiredField": True, "fieldOptions": {"values": [{"option": "Yes"}]}},
            ]},
            "options": {
                "messageButtonLabel": "Open the confirm page",
                "responseFormTitle": title,
                "responseFormDescription": "Choose Approve or Reject and submit. Nothing is decided until you press Submit.",
                "responseFormButtonLabel": "Submit decision",
                "limitWaitTime": {"values": {"limitType": "afterTimeInterval", "resumeAmount": 72, "resumeUnit": "hours"}},
            },
        },
        "credentials": {"smtp": {"id": "", "name": "Newpoint approvals SMTP"}},
    }


def complete_token(wf: str) -> dict:
    return {
        "id": nid(f"{wf}:complete"), "name": "Complete the Trigger.dev token", "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2, "position": [840, -160],
        "parameters": {
            "method": "POST", "url": "={{ $('Webhook').item.json.body.callback_url }}",
            "sendBody": True, "specifyBody": "json",
            # Approved only by an explicit, submitted "Approve" with the read-confirmation; any other submission rejects.
            "jsonBody": "={{ JSON.stringify({ approved: !!($json.data && $json.data['Decision'] === 'Approve' && $json.data['I have read the text exactly as it will be published'] === 'Yes'), content_hash: $('Webhook').item.json.body.content_hash }) }}",
            "options": {"timeout": 30000},
        },
    }


def decided(wf: str) -> dict:
    """Only a submitted decision completes the token. When n8n's own wait runs out it
    does nothing, so Trigger.dev's timeout fires instead (a timeout, not a rejection,
    and for review replies the reminder §5.2 requires)."""
    return {
        "id": nid(f"{wf}:decided"), "name": "Was a decision submitted?", "type": "n8n-nodes-base.if", "typeVersion": 2,
        "position": [600, -100],
        "parameters": {"conditions": {"options": {"caseSensitive": True, "typeValidation": "loose"}, "combinator": "and",
                                      "conditions": [{"id": nid(f"{wf}:c-decided"), "leftValue": "={{ $json.data && $json.data['Decision'] }}",
                                                      "rightValue": "", "operator": {"type": "string", "operation": "notEmpty", "singleValue": True}}]},
                       "options": {}},
    }


def no_decision(wf: str) -> dict:
    return {"id": nid(f"{wf}:nodecision"), "name": "No decision: let the token time out", "type": "n8n-nodes-base.noOp",
            "typeVersion": 1, "position": [840, 40], "parameters": {}}


def dropped(wf: str) -> dict:
    return {"id": nid(f"{wf}:drop"), "name": "Invalid request: dropped", "type": "n8n-nodes-base.noOp", "typeVersion": 1,
            "position": [480, 120], "parameters": {}}


def note(wf: str, text: str) -> dict:
    return {"id": nid(f"{wf}:note"), "name": "Note", "type": "n8n-nodes-base.stickyNote", "typeVersion": 1,
            "position": [-40, -380], "parameters": {"color": 5, "width": 780, "height": 240, "content": text}}


SETTINGS = {"executionOrder": "v1", "errorWorkflow": "SET-TO-KORET-OPS-ALERT-WORKFLOW-ID",
            "saveDataSuccessExecution": "none", "saveDataErrorExecution": "none", "saveManualExecutions": False}


def approval_workflow(wf: str, name: str, path: str, credential: str, kind: str, subject: str, message: str, title: str, about: str) -> dict:
    return {
        "name": name,
        "nodes": [webhook(wf, path, credential), guard(wf, kind, approval_guards(wf)),
                  confirm_page(wf, subject, message, title), decided(wf), complete_token(wf), no_decision(wf),
                  dropped(wf), note(wf, about)],
        "connections": {
            "Webhook": {"main": [[{"node": "Is a valid request?", "type": "main", "index": 0}]]},
            "Is a valid request?": {"main": [[{"node": "Ask the owner (confirm page)", "type": "main", "index": 0}],
                                             [{"node": "Invalid request: dropped", "type": "main", "index": 0}]]},
            "Ask the owner (confirm page)": {"main": [[{"node": "Was a decision submitted?", "type": "main", "index": 0}]]},
            "Was a decision submitted?": {"main": [[{"node": "Complete the Trigger.dev token", "type": "main", "index": 0}],
                                                   [{"node": "No decision: let the token time out", "type": "main", "index": 0}]]},
        },
        "settings": SETTINGS, "active": False, "pinData": {}, "tags": [],
    }


social = approval_workflow(
    "social", "Newpoint · social post approval", "newpoint-social-approval", "Newpoint social approval webhook",
    "social.approval_requested",
    "=Newpoint {{ $json.body.channel }} post for {{ $json.body.scheduled_for }}: approve?",
    "=Channel: {{ $json.body.channel }}\nScheduled: {{ $json.body.scheduled_for }}\nExpires: {{ $json.body.expires_at }}\n\n"
    "POST TEXT\n{{ $json.body.body }}\n\n"
    "IMAGE\n{{ $json.body.media.length ? $json.body.media[0].url + '\\nAlt text: ' + $json.body.media[0].alt : 'none' }}\n\n"
    "COMPLIANCE\n{{ $json.body.compliance.passed ? 'Passed automated review' : 'AUTOMATED REVIEW DID NOT PASS after three rounds. Approve only if you have read the notes below and you are sure the post is accurate and appropriate.' }} "
    "(round {{ $json.body.compliance.rounds }})\nRules flagged: {{ $json.body.compliance.rules.join(', ') || 'none' }}\n"
    "Notes: {{ $json.body.compliance.review_notes.join(' | ') || 'none' }}\n\n"
    "Approving publishes exactly this text and image at the scheduled time. Any later edit voids the approval.",
    "Approve this Newpoint post?",
    "## Newpoint social approval (automation/n8n/README.md §9)\nTrigger.dev `social.approval` POSTs the draft and a one-time token URL here. "
    "The owner decides on a **confirm page** (a form POST, so link scanners cannot approve); this workflow then POSTs `{approved, content_hash}` "
    "to the token URL. No Trigger.dev key lives in n8n. With no decision, n8n posts nothing and Trigger.dev's 72 h timeout expires the post.",
)

gbp = approval_workflow(
    "gbp-reply", "Newpoint · GBP review reply approval", "newpoint-gbp-reply-approval", "Newpoint GBP reply approval webhook",
    "gbp.reply_approval_requested",
    "={{ $json.body.reminder ? 'REMINDER: ' : '' }}Reply to a {{ $json.body.rating }}-star Google review: approve?",
    "={{ $json.body.reminder ? 'This is the reminder: the first request ran out after 72 hours. If this one runs out too, nothing is posted.\\n\\n' : '' }}"
    "THE REVIEW, AS GOOGLE SHOWS IT ({{ $json.body.rating }} stars, by {{ $json.body.reviewer || 'a Google user' }})\n"
    "{{ $json.body.review_text || '(rating only, no text)' }}\n\n"
    "THE DRAFT REPLY\n{{ $json.body.draft }}\n\n"
    "BEFORE YOU APPROVE, CHECK EACH LINE OF THE REPLY:\n"
    "- It does not say or hint that this person is or was a patient (no visit, wait, appointment, treatment, care or feeling better).\n"
    "- It names no one: not the reviewer, not a provider.\n"
    "- It repeats nothing from the review and mentions no detail of it.\n"
    "- It uses no clinical or health word.\n"
    "An automated check looked for these, but it cannot catch everything; you are the last check. "
    "Approving posts exactly this reply, publicly, under the practice's name.",
    "Approve this reply to a Google review?",
    "## Newpoint GBP review reply approval (automation/n8n/README.md §10)\nTrigger.dev `gbp.reply-drafter` POSTs the raw review, the draft and a "
    "one-time token URL. The owner decides on a confirm page (form POST). Never auto-posts. With no decision, n8n posts nothing and "
    "Trigger.dev's 72 h timeout sends one reminder, then expires the reply.",
)

ops = {
    "name": "Newpoint · Koret ops alert (marketing)",
    "nodes": [
        webhook("ops", "newpoint-ops-alert", "Newpoint ops alert webhook"),
        guard("ops", "ops.alert", []),
        {"id": nid("ops:send"), "name": "Email Koret ops", "type": "n8n-nodes-base.emailSend", "typeVersion": 2.1,
         "position": [480, -100],
         "parameters": {
             "fromEmail": "SET-BEFORE-ACTIVATING@example.invalid", "toEmail": "SET-BEFORE-ACTIVATING@example.invalid",
             "subject": "=Newpoint automation: {{ $json.body.code }}",
             "emailFormat": "text",
             "text": "=Code: {{ $json.body.code }}\nPost: {{ $json.body.post_id }} ({{ $json.body.channel }})\n"
                     "In 'publishing' since {{ $json.body.since }} ({{ $json.body.minutes }} minutes).\n\n"
                     "The platform call failed or the worker died mid-call. Nothing re-posts it automatically. "
                     "Check the Facebook Page / Instagram / Google listing: if the post is live, set the row to published "
                     "with its reference; if not, re-run social.publisher or gbp.post-publisher from the Trigger.dev dashboard.",
             "options": {}},
         "credentials": {"smtp": {"id": "", "name": "Newpoint approvals SMTP"}}},
        dropped("ops"),
    ],
    "connections": {
        "Webhook": {"main": [[{"node": "Is a valid request?", "type": "main", "index": 0}]]},
        "Is a valid request?": {"main": [[{"node": "Email Koret ops", "type": "main", "index": 0}],
                                         [{"node": "Invalid request: dropped", "type": "main", "index": 0}]]},
    },
    "settings": SETTINGS, "active": False, "pinData": {}, "tags": [],
}

# PHI zone → n8n (§1, §6): the body is { kind: "action_required", at } and nothing else.
# The email says only that something is waiting and links to the staff console; it
# carries no id, count or kind of work, and must not be edited to add any.
action = {
    "name": "Newpoint · staff action required (PHI zone notice)",
    "nodes": [
        webhook("action", "newpoint-action-required", "Newpoint action-required webhook"),
        guard("action", "action_required", [
            {"id": nid("action:c-keys"), "leftValue": "={{ Object.keys($json.body).sort().join(',') }}", "rightValue": "at,kind",
             "operator": {"type": "string", "operation": "equals"}},
        ]),
        {"id": nid("action:send"), "name": "Email staff", "type": "n8n-nodes-base.emailSend", "typeVersion": 2.1,
         "position": [480, -100],
         "parameters": {
             "fromEmail": "SET-BEFORE-ACTIVATING@example.invalid", "toEmail": "SET-BEFORE-ACTIVATING@example.invalid",
             "subject": "Newpoint: something is waiting in the staff console",
             "emailFormat": "text",
             "text": "Something is waiting for the team in the Newpoint staff console. Sign in to see it: SET-CONSOLE-URL-BEFORE-ACTIVATING\n\n"
                     "This email never contains patient details. Crisis pages do not come through here: they go to the on-call phone directly.",
             "options": {}},
         "credentials": {"smtp": {"id": "", "name": "Newpoint approvals SMTP"}}},
        dropped("action"),
    ],
    "connections": {
        "Webhook": {"main": [[{"node": "Is a valid request?", "type": "main", "index": 0}]]},
        "Is a valid request?": {"main": [[{"node": "Email staff", "type": "main", "index": 0}],
                                         [{"node": "Invalid request: dropped", "type": "main", "index": 0}]]},
    },
    "settings": SETTINGS, "active": False, "pinData": {}, "tags": [],
}

for filename, workflow in [("social-approval.json", social), ("gbp-reply-approval.json", gbp), ("ops-alert.json", ops),
                           ("action-required.json", action)]:
    (OUT / filename).write_text(json.dumps(workflow, indent=2) + "\n")
    print("wrote", filename)
