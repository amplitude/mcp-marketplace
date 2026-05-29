#!/usr/bin/env python3
"""
discover_org_app.py — Find a valid orgId/appId pair that has active syncs in staging
by querying the local Connector Manager (localhost:9451) via Thrift.

Usage:
    python3 discover_org_app.py               # resolve orgId for a specific appId
    python3 discover_org_app.py --app 508225  # look up orgId for a specific appId

How it works:
    Calls CM's getRouterSyncsForApp(appId) which returns the orgId and active sync IDs.
    CM must be running locally (broadcast-router:spin-up-connector-manager).

Note on getAppIdsWithActiveSyncs():
    CM also exposes getAppIdsWithActiveSyncs() to list ALL apps with active syncs, but
    this hits DynamoDB and will fail if the AWS session token is expired. Use --app with
    a known appId (e.g. the default 508225) to avoid that dependency.

Requires:
    pip install thrift
    Connector Manager running at localhost:9451
"""

import argparse
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
THRIFT_STUBS = os.path.join(SCRIPT_DIR, "cm_thrift_gen")
sys.path.insert(0, THRIFT_STUBS)

try:
    from thrift.transport import TSocket, TTransport
    from thrift.protocol import TBinaryProtocol
except ImportError:
    raise SystemExit("Missing dependency: pip install thrift")

try:
    from amp.connector.manager.tthrift import TConnectorManagerThriftService
except ImportError:
    raise SystemExit(
        f"Thrift stubs not found at {THRIFT_STUBS}.\n"
        "They should be bundled with this script in cm_thrift_gen/."
    )

CM_HOST = "localhost"
CM_PORT = 9451
TIMEOUT_MS = 5000
DEFAULT_APP_ID = "508225"


def make_client():
    transport = TSocket.TSocket(CM_HOST, CM_PORT)
    transport.setTimeout(TIMEOUT_MS)
    transport = TTransport.TBufferedTransport(transport)
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    client = TConnectorManagerThriftService.Client(protocol)
    transport.open()
    return client, transport


ROUTER_LOG = "/tmp/broadcast-router.log"


def discover_from_router_log():
    """
    Parse the router log to find org/app pairs that have been actively routed.
    The router logs verbose payloads like:
      [Verbose Log] Received payload for app: 508225; payload: {"app":508225,"amplitude_id":...,"user_id":...}
    And also the Kafka message key contains orgId via OrgAppAmpSerializer but that's
    not logged directly. We extract appId from the verbose log and orgId from the
    batch stats which reference sync IDs — then correlate via the payload's org context.

    Simpler: just extract appIds seen in verbose logs. The orgId must be looked up
    separately (via CM or already known).
    """
    import re

    if not os.path.exists(ROUTER_LOG):
        return []

    app_ids = set()
    pattern = re.compile(r"Received payload for app: (\d+)")
    with open(ROUTER_LOG) as f:
        for line in f:
            m = pattern.search(line)
            if m:
                app_ids.add(m.group(1))
    return sorted(app_ids, key=int)


def main():
    parser = argparse.ArgumentParser(description="Resolve orgId/appId from local CM.")
    parser.add_argument("--app", default=DEFAULT_APP_ID,
                        help=f"appId to look up (default: {DEFAULT_APP_ID})")
    parser.add_argument("--from-log", action="store_true",
                        help="Discover active appIds from router log instead of querying CM")
    args = parser.parse_args()

    if args.from_log:
        app_ids = discover_from_router_log()
        if not app_ids:
            raise SystemExit(
                f"No app IDs found in {ROUTER_LOG}.\n"
                "Fire some events first: python3 fire_local.py"
            )
        print(f"App IDs seen in router log ({len(app_ids)} total):")
        for aid in app_ids:
            print(f"  {aid}")
        print()
        print(f"To resolve orgId, run: python3 discover_org_app.py --app <appId>")
        return

    try:
        client, transport = make_client()
    except Exception as e:
        raise SystemExit(
            f"Cannot connect to CM at {CM_HOST}:{CM_PORT}: {e}\n"
            "Is the Connector Manager running? Use broadcast-router:spin-up-connector-manager.\n"
            "Tip: if CM is running but has expired AWS credentials, restart it via the skill."
        )

    try:
        syncs = client.getRouterSyncsForApp(args.app)

        if not syncs:
            raise SystemExit(
                f"App {args.app} has no active router syncs in staging.\n"
                "Try a different appId — it must have active syncs configured in staging.\n"
                "Tip: use --from-log to see which appIds the router has already processed."
            )

        org_id = syncs[0].orgId
        sync_ids = [s.id for s in syncs]
        partners = [s.partnerId for s in syncs]

        print(f"orgId  : {org_id}")
        print(f"appId  : {args.app}")
        print(f"syncs  : {list(zip(sync_ids, partners))}")
        print()
        print("Use with fire_local.py:")
        print(f"  python3 fire_local.py --org-id {org_id} --app-id {args.app}")

    except Exception as e:
        raise SystemExit(
            f"CM call failed: {e}\n"
            "CM may have expired AWS credentials — restart it via broadcast-router:spin-up-connector-manager.\n"
            "Alternatively, use --from-log to discover appIds from the router log."
        )
    finally:
        transport.close()


if __name__ == "__main__":
    main()
