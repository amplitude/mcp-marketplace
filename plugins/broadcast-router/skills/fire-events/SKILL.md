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

## Step 1 — Install dependencies (once)

```bash
pip3 install kafka-python zstandard
```

---

## Step 2 — Run

Defaults: 10 events, stag org `167943` / app `508225`, partition 0.

```bash
python3 .agents/skills/fire-events/scripts/fire_local.py
```

Common options:

```bash
# More events, multiple users, delay between batches
python3 fire_local.py --count 50 --batch-size 5 --users 5 --delay 0.2

# Custom org/app (must exist in stag)
python3 fire_local.py --org-id <org> --app-id <app>

# Specific event types only
python3 fire_local.py --event-types "page_viewed,purchase_completed"

# Dry-run — print payloads without sending to Kafka
python3 fire_local.py --dry-run
```

---

## Step 4 — Verify

Confirm the send succeeded:
```
Batch   1: 5 events, user=local-test-user-abc123, amp_id=481234 … OK (offset=0, partition=0)
```

Then verify the router picked up and processed the messages:
```bash
tail -20 /tmp/broadcast-router.log
```

A successful pick-up looks like:
```
INFO  com.amplitude.broadcast.kafka.BroadcastRouterKafkaProcessor - Partitions assigned: [portal_events_local-0, ...]
```

If you see `Connection refused` on port 9990, the router received the message but can't
reach the stag broadcast-sender pod. This is expected without a port-forward. To fix:

```bash
aws-vault exec staging-engineer -- kubectl port-forward -n broadcast <sender-pod-name> 9990:9990
```
