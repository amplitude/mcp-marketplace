---
name: broadcast-router:tear-down
description: >
  Tears down the local Broadcast environment: stops the router, sender, and connector
  manager JVM processes, stops or removes the local Redpanda Docker container, and
  optionally cleans up topics and logs.

  Use this skill whenever the user wants to stop the router, sender, or connector manager,
  shut down local broadcast infrastructure, clean up after local testing, or free up
  resources. Also use it when the user says "stop the router", "tear down broadcast",
  "shut it down", or "clean up".
---

# Broadcast Router — Tear Down

Cleanly stops the local router and Redpanda infrastructure.

---

## Step 1 — Stop the router, sender, and connector manager

```bash
pkill -f "BroadcastRouter" && echo "Router stopped" || echo "No router process found"
pkill -f "BroadcastSender" && echo "Sender stopped" || echo "No sender process found"
pkill -f "ConnectorManagementServer" && echo "Connector Manager stopped" || echo "No connector manager process found"
```

Verify they're gone:

```bash
ps aux | grep -E "BroadcastRouter|BroadcastSender|ConnectorManagementServer" | grep -v grep
```

---

## Step 2 — Stop Redpanda

To stop the container but **keep topics** for next time (faster restart):

```bash
docker stop local-redpanda && echo "Redpanda stopped"
```

To restart it later without re-creating topics:

```bash
docker start local-redpanda
```

To **fully remove** the container and all topics (clean slate):

```bash
docker rm -f local-redpanda && echo "Redpanda removed"
```

You'll need to re-run `./scripts/setup-broadcast-local-redpanda.sh` to recreate topics
next time.

---

## Step 3 — Clean up logs (optional)

```bash
rm /tmp/broadcast-router.log /tmp/broadcast-sender.log /tmp/connector-manager.log && echo "Logs cleared"
```

---

## What to preserve between sessions

- **`/etc/hosts` entries** — these are safe to leave in place; they only route stag
  Redpanda hostnames to localhost and have no effect when the container isn't running.
- **`~/.zshenv` exports** — staging secrets are fine to keep; they're scoped to the
  staging environment.
- **`config/us/broadcast-router-local.properties`** — the include path fix should be
  committed to your branch so you don't have to redo it.
