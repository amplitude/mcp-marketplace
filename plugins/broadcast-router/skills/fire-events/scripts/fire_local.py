#!/usr/bin/env python3
"""
Fire test events directly to the local Redpanda portal_events_local topic,
bypassing the HTTP API and hitting the BroadcastRouter directly.

Replicates what LocalPortalTestProducer.java does, with the same wire format:
  - Key:   UTF-8 JSON {"orgId": ..., "appId": ..., "ampId": ...}
  - Value: 0x01 version byte + ZSTD-compressed newline-joined event JSON

Usage:
    python fire_local.py                          # 10 events with defaults
    python fire_local.py --count 50 --users 5    # 50 events across 5 users
    python fire_local.py --org-id 167943 --app-id 508225
    python fire_local.py --event-types "page_viewed,purchase_completed"
    python fire_local.py --dry-run               # print without sending

Requirements:
    pip install kafka-python zstandard

The BroadcastRouter must already be running locally (use broadcast-router:spin-up).
"""

import argparse
import json
import random
import string
import time
from datetime import datetime, timezone

try:
    from kafka import KafkaProducer
except ImportError:
    raise SystemExit("Missing dependency: pip install kafka-python")

try:
    import zstandard as zstd
except ImportError:
    raise SystemExit("Missing dependency: pip install zstandard")


# Matches the stag org/app used in LocalPortalTestProducer.java
DEFAULT_ORG_ID    = 167943
DEFAULT_APP_ID    = 508225
DEFAULT_BOOTSTRAP = "127.0.0.1:31092"
DEFAULT_TOPIC     = "portal_events_local"

DEFAULT_EVENT_TYPES = [
    "page_viewed", "button_clicked", "search_performed", "item_added_to_cart",
    "checkout_started", "purchase_completed", "sign_up", "login", "logout", "feature_used",
]

EVENT_PROPERTIES = {
    "page_viewed":        {"page": ["home", "pricing", "docs", "dashboard", "settings"]},
    "button_clicked":     {"button_name": ["cta", "nav_link", "submit", "cancel", "learn_more"]},
    "search_performed":   {"query_length": list(range(1, 50))},
    "item_added_to_cart": {"item_id": list(range(1000, 9999)), "price": [9.99, 19.99, 49.99, 99.99]},
    "checkout_started":   {"cart_size": list(range(1, 10))},
    "purchase_completed": {"revenue": [9.99, 19.99, 49.99, 99.99], "currency": ["USD", "EUR"]},
    "sign_up":            {"method": ["google", "email", "github"]},
    "login":              {"method": ["google", "email", "github"]},
    "logout":             {},
    "feature_used":       {"feature_name": ["chart", "cohort", "experiment", "session_replay"]},
}


def random_id(prefix: str = "", length: int = 6) -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=length))
    return f"{prefix}-{suffix}" if prefix else suffix


def make_event(app_id: int, user_id: str, amplitude_id: int, event_type: str) -> dict:
    props = {k: random.choice(v) for k, v in EVENT_PROPERTIES.get(event_type, {}).items() if v}
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    return {
        "app": app_id,
        "amplitude_id": amplitude_id,
        "event_type": event_type,
        "device_id": f"dev-{random_id(length=8)}",
        "user_id": user_id,
        "event_properties": props,
        "user_properties": {"plan": random.choice(["free", "plus", "pro", "enterprise"])},
        "os_name": random.choice(["web", "ios", "android"]),
        "country": random.choice(["US", "GB", "DE", "FR", "JP"]),
        "version_name": "1.0.0",
        "event_time": now,
        "server_upload_time": now,
        "processed_time": now,
    }


def encode_key(org_id: int, app_id: int, amp_id: int) -> bytes:
    """Replicates OrgAppAmpSerializer: JSON-encode the key fields as UTF-8."""
    return json.dumps(
        {"orgId": org_id, "appId": app_id, "ampId": amp_id}, separators=(",", ":")
    ).encode("utf-8")


def encode_value(events: list) -> bytes:
    """
    Replicates ZstdCompressor.compress() without a dictionary:
      byte[0] = version (1)
      byte[1:] = standard ZSTD-compressed payload
    Payload is newline-joined compact JSON events.
    """
    payload = "\n".join(json.dumps(e, separators=(",", ":")) for e in events).encode("utf-8")
    compressed = zstd.ZstdCompressor().compress(payload)
    return bytes([1]) + compressed


def main():
    parser = argparse.ArgumentParser(description="Fire test events to local BroadcastRouter via Redpanda.")
    parser.add_argument("--bootstrap",   default=DEFAULT_BOOTSTRAP)
    parser.add_argument("--topic",       default=DEFAULT_TOPIC)
    parser.add_argument("--partition",   type=int, default=0)
    parser.add_argument("--org-id",      type=int, default=DEFAULT_ORG_ID)
    parser.add_argument("--app-id",      type=int, default=DEFAULT_APP_ID)
    parser.add_argument("--count",       type=int, default=10,  help="Total events to send (default: 10)")
    parser.add_argument("--batch-size",  type=int, default=5,   help="Events per Kafka message (default: 5)")
    parser.add_argument("--users",       type=int, default=3,   help="Simulated user count (default: 3)")
    parser.add_argument("--user-prefix", default="local-test-user")
    parser.add_argument("--event-types", default=None,          help="Comma-separated event types")
    parser.add_argument("--delay",       type=float, default=0.0)
    parser.add_argument("--dry-run",     action="store_true")
    args = parser.parse_args()

    event_types = (
        [e.strip() for e in args.event_types.split(",")] if args.event_types else DEFAULT_EVENT_TYPES
    )
    users = [(random_id(args.user_prefix), random.randint(100000, 999999)) for _ in range(args.users)]

    # Prompt for org/app if not provided — they must match an org with active syncs in staging
    if args.org_id == DEFAULT_ORG_ID and args.app_id == DEFAULT_APP_ID:
        print("Which org/app should events be fired for?")
        print(f"  (press Enter to use defaults: org={DEFAULT_ORG_ID}, app={DEFAULT_APP_ID})")
        org_input = input("  orgId: ").strip()
        app_input = input("  appId: ").strip()
        if org_input:
            args.org_id = int(org_input)
        if app_input:
            args.app_id = int(app_input)
        print()

    print(f"Bootstrap : {args.bootstrap}")
    print(f"Topic     : {args.topic}  partition={args.partition}")
    print(f"Org/App   : {args.org_id} / {args.app_id}")
    print(f"Users     : {args.users}  (e.g. {users[0][0]})")
    print(f"Events    : {args.count} total, {args.batch_size} per message")
    print(f"Dry run   : {args.dry_run}\n")

    producer = None
    if not args.dry_run:
        producer = KafkaProducer(
            bootstrap_servers=[args.bootstrap],
            key_serializer=None,
            value_serializer=None,
            acks="all",
            retries=3,
        )

    total_sent, batch_num = 0, 0
    try:
        while total_sent < args.count:
            size = min(args.batch_size, args.count - total_sent)
            user_id, amp_id = random.choice(users)
            events = [make_event(args.app_id, user_id, amp_id, random.choice(event_types)) for _ in range(size)]
            key   = encode_key(args.org_id, args.app_id, amp_id)
            value = encode_value(events)

            batch_num += 1
            print(f"Batch {batch_num:>3}: {size} events, user={user_id}, amp_id={amp_id} … ", end="", flush=True)

            if args.dry_run:
                print(f"[dry-run] key={key.decode()}, value={len(value)}B compressed")
                print(f"          sample: {json.dumps(events[0], indent=10)}")
            else:
                rec = producer.send(args.topic, key=key, value=value, partition=args.partition).get(timeout=10)
                print(f"OK (offset={rec.offset}, partition={rec.partition})")

            total_sent += size
            if args.delay and total_sent < args.count:
                time.sleep(args.delay)
    finally:
        if producer:
            producer.flush()
            producer.close()

    print(f"\nDone. {total_sent} events {'(dry-run) ' if args.dry_run else ''}sent to {args.topic}.")
    if not args.dry_run:
        print("Check router logs: tail -f /tmp/broadcast-router.log")


if __name__ == "__main__":
    main()
