---
name: broadcast-router:spin-up-connector-manager
description: >
  Builds and starts the Connector Manager (CM) locally against staging resources.
  The CM runs a Thrift server on port 9451 that the Sender calls to dispatch jobs
  to downstream connectors.

  Use this skill whenever the user wants to run the connector manager locally, start
  the CM service, or set up the full local broadcast stack. Also use it when the user
  says "start the connector manager", "run CM locally", or "spin up connector manager".

  Run broadcast-router:spin-up-sender first if you also want the sender running locally.
---

# Connector Manager — Spin Up

The Connector Manager (CM) handles dispatching broadcast jobs to downstream connectors.
Logs stream to `/tmp/connector-manager.log`. All gradle commands run from the nova repo
root (`/Users/dinhbao/src/nova`).

---

## Quick-start checklist

Before running anything, check what's already done:

```bash
# Docker running?
docker info > /dev/null 2>&1 && echo "Docker: ok" || echo "Docker: NOT running"

# Staging secrets exported?
grep -q "export " ~/.zshenv && echo "secrets: ok" || echo "secrets: missing"
```

If all boxes are checked, jump straight to **Regular Startup** below.

---

## One-Time Setup

Only needed on a fresh machine. Skip any step that's already done.

### 1A — Redpanda, /etc/hosts, and secrets *(once per machine)*

These are all handled by `broadcast-router:spin-up-router`. Run that skill first if you
haven't already — it covers Docker, Redpanda, /etc/hosts, and the staging secrets export.

### 1B — No config file fix needed

Unlike the router and sender, CM uses `staging.properties` directly with no local override
file, so there's no include path to fix.

---

## Regular Startup

Run these every time you want to start the Connector Manager.

### Step 1 — Find the Consul IP

```bash
aws-vault exec staging-engineer -- aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=*consul*" \
  --query "Reservations[].Instances[].[PrivateIpAddress,Tags[?Key=='Name'].Value|[0],State.Name]" \
  --output text
```

Pick any running `vpc-stag2-consul-*` IP (e.g. `172.22.125.116`).

### Step 2 — Build the Connector Manager

```bash
cd /Users/dinhbao/src/nova && \
aws-vault exec staging-engineer -- ./gradlew -p projects/one-build :nova-root:connector-manager-service:installDist
```

Jars land at:
`/Users/dinhbao/src/nova/projects/connector-framework/connector-manager-service/build/install/connector-manager-service/lib/`

Note: The build always outputs to the main repo (`/Users/dinhbao/src/nova`), not a worktree.

### Step 3 — Start the Connector Manager

Must be run from the nova repo root so the relative `config/us/staging.properties` path resolves:

```bash
cd /Users/dinhbao/src/nova && \
CONSUL_HOST=<consul-ip> \
aws-vault exec staging-engineer -- java \
  -classpath "/Users/dinhbao/src/nova/projects/connector-framework/connector-manager-service/build/install/connector-manager-service/lib/*" \
  -server \
  -XX:-OmitStackTraceInFastThrow \
  -Dnova.config=config/us/staging.properties \
  -Dlog4j.configurationFile=/Users/dinhbao/src/nova/projects/connector-framework/connector-manager-service/src/tooling/resources/log4j2.xml \
  -Djava.util.logging.manager=org.apache.logging.log4j.jul.LogManager \
  com.amplitude.connector.manager.service.ConnectorManagementServer > /tmp/connector-manager.log 2>&1 &
echo "Connector Manager PID: $!"
```

Confirm startup:

```bash
grep "Starting connector-manager-service thrift server" /tmp/connector-manager.log
```

Expected:
```
INFO  com.amplitude.connector.manager.service.ConnectorManagementServer - Starting connector-manager-service thrift server on port: 9451
```

---

## Known limitations

- **`SocketException: Host is down`** errors in the log are expected and ignorable.
  The CM tries to reach various stag services that aren't accessible from the laptop;
  this doesn't affect its ability to serve Thrift requests on port 9451.

- CM uses staging Consul for service discovery, so connector registrations come from
  the stag environment. You'll see stag connectors registered, not local ones.
