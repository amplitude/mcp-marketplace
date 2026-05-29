---
name: broadcast-router:spin-up-sender
description: >
  Builds and starts the Broadcast Sender locally against staging resources. The sender
  runs a Thrift server on port 9990 that the Router calls to dispatch broadcast jobs to
  downstream connectors.

  Use this skill whenever the user wants to run the broadcast sender locally, start the
  sender service, or set up the full local broadcast stack (run this before spin-up-router
  so the router can connect to it). Also use it when the user says "start the sender",
  "run broadcast sender locally", or "spin up sender".
---

# Broadcast Sender — Spin Up

The sender must be started **before** the router so the router can connect to it on port
9990 at startup. Logs stream to `/tmp/broadcast-sender.log`.

---

## Quick-start checklist

Before running anything, check what's already done:

```bash
# Redpanda running?
docker ps --filter name=local-redpanda --format "{{.Status}}"

# /etc/hosts entries present?
grep -q "redpanda-0.stage2-bertha" /etc/hosts && echo "hosts: ok" || echo "hosts: missing"

# Include path correct in sender config?
grep "include " /Users/dinhbao/src/nova/.claude/worktrees/zealous-hermann-89c7a6/config/us/broadcast-sender-local.properties
```

If all boxes are checked, jump straight to **Regular Startup** below.

---

## One-Time Setup

Only needed on a fresh machine or fresh worktree. Skip any step that's already done.

### 1A — Redpanda and /etc/hosts *(once per machine)*

These are handled by `broadcast-router:spin-up-router` Steps 1A and the Redpanda setup.
If you haven't run that skill yet, do it first.

### 1B — Fix the include path in broadcast-sender-local.properties *(once per worktree)*

```bash
grep "include " /Users/dinhbao/src/nova/.claude/worktrees/zealous-hermann-89c7a6/config/us/broadcast-sender-local.properties
```

The correct path for the worktree is:
```
include /Users/dinhbao/src/nova/.claude/worktrees/zealous-hermann-89c7a6/config/us/staging.properties
```

For the main repo it should be:
```
include /Users/dinhbao/src/nova/config/us/staging.properties
```

If the path is wrong (e.g. still Tom Zhang's machine path), use the Edit tool to fix it.

---

## Regular Startup

Run these every time you want to start the sender.

### Step 1 — Find the Consul IP

```bash
aws-vault exec staging-engineer -- aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=*consul*" \
  --query "Reservations[].Instances[].[PrivateIpAddress,Tags[?Key=='Name'].Value|[0],State.Name]" \
  --output text
```

Pick any running `vpc-stag2-consul-*` IP (e.g. `172.22.125.116`).

### Step 2 — Build the sender

```bash
cd /Users/dinhbao/src/nova && \
aws-vault exec staging-engineer -- ./gradlew -p projects/one-build :nova-root:broadcast-sender-service:installDist
```

Jars land at:
`/Users/dinhbao/src/nova/projects/broadcast/broadcast-sender-service/build/install/broadcast-sender-service/lib/`

Note: The build always outputs to the main repo (`/Users/dinhbao/src/nova`), not a worktree.

### Step 3 — Start the sender

```bash
CONSUL_HOST=<consul-ip> \
aws-vault exec staging-engineer -- java \
  -classpath "/Users/dinhbao/src/nova/projects/broadcast/broadcast-sender-service/build/install/broadcast-sender-service/lib/*" \
  -server \
  -XX:-OmitStackTraceInFastThrow \
  -Dnova.config=<absolute-path-to-config>/config/us/broadcast-sender-local.properties \
  -DENV=local \
  -DMY_POD_NAME=local-sender-pod \
  -DMY_POD_ID=0 \
  -Dlog4j.configurationFile=/Users/dinhbao/src/nova/projects/broadcast/broadcast-sender-service/src/main/resources/broadcast/log4j2.xml \
  -Djava.util.logging.manager=org.apache.logging.log4j.jul.LogManager \
  --add-modules jdk.incubator.vector \
  com.amplitude.broadcast.sender.BroadcastSender localSender > /tmp/broadcast-sender.log 2>&1 &
echo "Sender PID: $!"
```

Confirm startup:
```bash
grep "Starting broadcast sender thrift server" /tmp/broadcast-sender.log
```

Expected:
```
INFO  com.amplitude.broadcast.sender.BroadcastSender - Starting broadcast sender thrift server on port: 9990
```

---

## Notes

- **Port 80 conflict**: If the sender complains port 80 is in use:
  ```bash
  lsof -ti :80 | xargs kill -9
  ```
- **After the sender is up**, start the router with `broadcast-router:spin-up-router`,
  passing `LOCAL_SENDER_HOST_IP=127.0.0.1` so it connects to this local instance.
