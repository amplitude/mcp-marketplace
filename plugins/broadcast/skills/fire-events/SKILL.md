---
name: broadcast-router:fire-events
description: >
  Fires test events directly into the local Broadcast Router via Redpanda, bypassing the
  Amplitude HTTP API. Uses fire_local.py (bundled in scripts/) which replicates the exact
  wire format of LocalPortalTestProducer.java — the same key serialization (OrgAppAmpSerializer)
  and ZSTD compression (ZstdCompressor) the router expects.

  Use this skill whenever the user wants to send test events to the local router, produce
  messages to portal_events_local, test the broadcast pipeline end-to-end, or verify the
  router is processing events. Also use it when the user says "fire events", "send test
  messages", "produce to local kafka", or "test the router".

  Requires the router to already be running (use broadcast-router:spin-up first).
---

# Broadcast Router — Fire Test Events

Produces test events directly to the local Redpanda `portal_events_local` topic using
`scripts/fire_local.py`, which replicates the exact wire format of `LocalPortalTestProducer.java`:

- **Key**: UTF-8 JSON `{"orgId":…,"appId":…,"ampId":…}` — matches `OrgAppAmpSerializer`
- **Value**: `0x01` version byte + ZSTD-compressed newline-joined event JSON — matches `ZstdCompressor`

---

## Why orgId/appId matter

The router does **not** use the orgId/appId in the Kafka message to determine routing.
Instead, on each batch it calls `ConnectorManager.getRouterSyncsForApp(appId)` to look up
which syncs are active for that app in the **staging database**. If the app has no active
syncs in staging, events are silently dropped.

The default org `167943` / app `508225` works because those have real staging syncs. To
use a different org/app, it must have active syncs configured in staging.

---

## Step 1 — Install dependencies (once)

```bash
pip3 install kafka-python zstandard
```

---

## Step 2 — Fire events

**Always ask the user for their orgId and appId before firing.** The org/app must have
active syncs configured in staging — if not, events are silently dropped by the router.
If the user doesn't know their org/app, they can find it by opening their browser dev
tools on `localhost:3030` (local Thunder) and running:
```js
fetch('/auth/member-orgs').then(r=>r.json()).then(d=>console.log(d.memberOrgs.find(o=>o.isSessionOrg)))
```

The script will prompt for orgId/appId interactively (press Enter to use the default
stag test org `167943` / app `508225`):

Defaults: 10 events, stag org `167943` / app `508225`, partition 0.

```bash
python3 .agents/skills/fire-events/scripts/fire_local.py
```

Common options:

```bash
# More events, multiple users, delay between batches
python3 fire_local.py --count 50 --batch-size 5 --users 5 --delay 0.2

# Custom org/app (must have active syncs in staging)
python3 fire_local.py --org-id <org> --app-id <app>

# Specific event types only
python3 fire_local.py --event-types "page_viewed,purchase_completed"

# Dry-run — print payloads without sending to Kafka
python3 fire_local.py --dry-run
```

---

## Step 3 — Verify

Confirm the send succeeded:
```
Batch   1: 5 events, user=local-test-user-abc123, amp_id=481234 … OK (offset=0, partition=0)
```

Then verify the router picked up and processed the messages:
```bash
tail -20 /tmp/broadcast-router.log
```

Look for batch stats — these confirm the router routed to syncs and sent to the sender:
```
INFO  BroadcastRouterKafkaProcessor - Batch processing statistics for sync 30009145 (partition: 0, app: 508225) - max latency 246 ms, job count: 5
```

If events are being silently dropped (no batch stats appear), the org/app has no active
syncs in staging. Use `discover_org_app.py` to find a valid one.
