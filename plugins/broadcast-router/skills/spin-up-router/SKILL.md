---
name: broadcast-router:spin-up-router
description: >
  Spins up the Broadcast Router locally against staging resources in the nova repo.
  Handles the full setup sequence: Docker check, local Redpanda cluster, /etc/hosts
  routing, staging secrets, finding the Consul IP, fixing the config include path,
  building the router, and starting it as a background process.

  Use this skill whenever the user wants to run the broadcast router locally, start the
  router, set up local broadcast infrastructure, or debug the event streaming pipeline
  against staging. Also use it when the user says "spin up router", "start broadcast
  locally", or "get the router running".

  Run broadcast-router:spin-up-sender first if you also want the sender running locally
  (recommended for full end-to-end testing). If the sender is local, pass
  LOCAL_SENDER_HOST_IP=127.0.0.1 when starting the router.
---

# Broadcast Router — Spin Up

The nova repo lives at `/Users/dinhbao/src/nova`. Router logs stream to
`/tmp/broadcast-router.log`. All gradle commands run from the nova repo root unless stated
otherwise.

---

## Quick-start checklist

Before running anything, check what's already done:

```bash
# Docker running?
docker info > /dev/null 2>&1 && echo "Docker: ok" || echo "Docker: NOT running"

# Redpanda container exists?
docker ps -a --filter name=local-redpanda --format "{{.Status}}"

# /etc/hosts entries present?
grep -q "redpanda-0.stage2-bertha" /etc/hosts && echo "hosts: ok" || echo "hosts: missing"

# Staging secrets exported?
grep -q "export " ~/.zshenv && echo "secrets: ok" || echo "secrets: missing"

# Include path correct in router config?
grep "include " /Users/dinhbao/src/nova/.claude/worktrees/zealous-hermann-89c7a6/config/us/broadcast-router-local.properties
```

If all boxes are checked, jump straight to **Regular Startup** below.

---

## One-Time Setup

Only needed on a fresh machine or fresh worktree. Skip any step that's already done.

### 1A — Update /etc/hosts *(once per machine)*

Check:
```bash
grep -q "redpanda-0.stage2-bertha" /etc/hosts && echo "already present" || echo "missing"
```

If missing, tell the user to run this themselves (requires sudo — agent cannot do it):

```
sudo tee -a /etc/hosts << 'EOF'

# for local Redpanda hacks for streaming local
127.0.0.1 redpanda-0.stage2-bertha.k8s.amplitude.internal
127.0.0.1 redpanda-1.stage2-bertha.k8s.amplitude.internal
127.0.0.1 redpanda-2.stage2-bertha.k8s.amplitude.internal

127.0.0.1 redpanda-0.stage2-gertha.k8s.amplitude.internal
127.0.0.1 redpanda-1.stage2-gertha.k8s.amplitude.internal
127.0.0.1 redpanda-2.stage2-gertha.k8s.amplitude.internal

127.0.0.1 redpanda-0.stage-redpanda-bfreya.k8s.amplitude.internal
127.0.0.1 redpanda-1.stage-redpanda-bfreya.k8s.amplitude.internal
127.0.0.1 redpanda-2.stage-redpanda-bfreya.k8s.amplitude.internal

127.0.0.1 redpanda-0.stage-redpanda-gfreya.k8s.amplitude.internal
127.0.0.1 redpanda-1.stage-redpanda-gfreya.k8s.amplitude.internal
127.0.0.1 redpanda-2.stage-redpanda-gfreya.k8s.amplitude.internal
EOF
```

Wait for the user to confirm before continuing.

### 1B — Export staging secrets *(once per machine)*

Ask the user if they have already exported nova env vars into `~/.zshenv`. If yes, skip.

If not, tell the user to run this from the nova repo root:

```bash
cd /Users/dinhbao/src/nova
aws-vault exec us-prod-engineer -- ./gradlew -Dnova.config=config/us/staging.properties runSecretsExporter | grep export >> ~/.zshenv
source ~/.zshenv
```

### 1C — Fix the include path in broadcast-router-local.properties *(once per worktree)*

```bash
grep "include " /Users/dinhbao/src/nova/.claude/worktrees/zealous-hermann-89c7a6/config/us/broadcast-router-local.properties
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

Run these every time you want to start the router.

### Step 1 — Verify Docker is running

```bash
docker info > /dev/null 2>&1 && echo "ok" || echo "Docker not running"
```

If Docker is not running, tell the user to start Docker Desktop and wait for confirmation.

### Step 2 — Start local Redpanda

If the container already exists from a previous run:
```bash
docker start local-redpanda && echo "Redpanda started"
```

If it doesn't exist yet (first time or after `docker rm`):
```bash
cd /Users/dinhbao/src/nova && ./scripts/setup-broadcast-local-redpanda.sh
```

This creates three topics:
- `portal_events_local` (8 partitions)
- `broadcast_jobs_local` (16 partitions)
- `freya_events_local` (8 partitions)

Verify:
```bash
rpk topic list --brokers=127.0.0.1:31092
```

### Step 3 — Find the Consul IP

```bash
aws-vault exec staging-engineer -- aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=*consul*" \
  --query "Reservations[].Instances[].[PrivateIpAddress,Tags[?Key=='Name'].Value|[0],State.Name]" \
  --output text
```

Pick any running `vpc-stag2-consul-*` IP (e.g. `172.22.125.116`).

### Step 4 — Build the router

```bash
cd /Users/dinhbao/src/nova && \
aws-vault exec staging-engineer -- ./gradlew -p projects/one-build :nova-root:broadcast-router-service:installDist
```

Jars land at:
`/Users/dinhbao/src/nova/projects/broadcast/broadcast-router-service/build/install/broadcast-router-service/lib/`

Note: The build always outputs to the main repo (`/Users/dinhbao/src/nova`), not a worktree.

### Step 5 — Start the router

Set `LOCAL_SENDER_HOST_IP` based on where the sender is running:
- **Local sender** (`broadcast-router:spin-up-sender` already started): use `127.0.0.1`
- **Stag sender pod** (no local sender): get the pod IP via kubectl

```bash
CONSUL_HOST=<consul-ip> LOCAL_SENDER_HOST_IP=<sender-ip> \
aws-vault exec staging-engineer -- java \
  -classpath "/Users/dinhbao/src/nova/projects/broadcast/broadcast-router-service/build/install/broadcast-router-service/lib/*" \
  -server \
  -XX:-OmitStackTraceInFastThrow \
  -Dnova.config=<absolute-path-to-config>/config/us/broadcast-router-local.properties \
  -DENV=local \
  -DMY_POD_NAME=local-router-pod \
  -DMY_POD_ID=0 \
  -Dlog4j.configurationFile=/Users/dinhbao/src/nova/projects/broadcast/broadcast-router-service/src/main/resources/broadcast/log4j2.xml \
  -Djava.util.logging.manager=org.apache.logging.log4j.jul.LogManager \
  --add-modules jdk.incubator.vector \
  com.amplitude.broadcast.router.BroadcastRouter local-router > /tmp/broadcast-router.log 2>&1 &
echo "Router PID: $!"
```

For **Cargo** Router, replace `BroadcastRouter` with `BroadcastRouterCargo`.

Confirm startup:
```bash
grep "Initialized processor" /tmp/broadcast-router.log
```

Expected:
```
INFO  com.amplitude.ingestion.AmplitudeKafkaConsumer - Initialized processor, beginning main consumer loop
```

---

## Known limitations

- **Offset management**: The router cannot move Kafka offsets properly when run locally.
  To manually advance the offset:
  ```bash
  rpk topic trim-prefix portal_events_local --partitions 0 -X brokers=127.0.0.1:31092 --offset <target-offset>
  ```

- **Shared topic**: `portal_events_local` is shared. Coordinate with other engineers to
  avoid race conditions.
