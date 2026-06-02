"""Tests for new SSE + ESC/POS features."""
import os
import json
import time
import threading
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def kasir_headers():
    r = requests.post(f"{API}/auth/login", json={"username": "kasir", "password": "kasir123"}, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _make_order(payment_method="qris"):
    prods = requests.get(f"{API}/products").json()
    p = next(x for x in prods if x["status"] == "ready")
    body = {
        "table_number": "01",
        "items": [{"product_id": p["id"], "name": p["name"], "price": p["price"], "qty": 1, "note": "SSE-TEST"}],
        "payment_method": payment_method,
    }
    return requests.post(f"{API}/orders", json=body).json()


def _read_sse(url, events_list, stop_evt, timeout=15):
    """Background reader that appends parsed JSON events to events_list."""
    try:
        with requests.get(url, stream=True, timeout=timeout) as r:
            assert r.status_code == 200
            assert "text/event-stream" in r.headers.get("content-type", "")
            current_event = None
            for raw in r.iter_lines(decode_unicode=True):
                if stop_evt.is_set():
                    break
                if raw is None:
                    continue
                if raw.startswith(":"):
                    events_list.append({"_keepalive": raw})
                    continue
                if raw.startswith("event:"):
                    current_event = raw.split(":", 1)[1].strip()
                    continue
                if raw.startswith("data:"):
                    payload = raw[5:].strip()
                    try:
                        obj = json.loads(payload)
                    except Exception:
                        obj = {"_raw": payload}
                    if current_event:
                        obj["_event"] = current_event
                        current_event = None
                    events_list.append(obj)
    except Exception as e:
        events_list.append({"_error": str(e)})


class TestSSE:
    def test_sse_staff_ready_event(self):
        """First message must be event:ready with channel:staff."""
        events = []
        stop = threading.Event()
        t = threading.Thread(target=_read_sse, args=(f"{API}/events/staff", events, stop, 8))
        t.start()
        # Wait up to 5s for ready event
        deadline = time.time() + 5
        while time.time() < deadline and not any(e.get("_event") == "ready" for e in events):
            time.sleep(0.2)
        stop.set()
        t.join(timeout=5)
        ready = [e for e in events if e.get("_event") == "ready"]
        assert ready, f"No ready event received. Got: {events}"
        assert ready[0].get("channel") == "staff"

    def test_sse_order_channel_ready_and_keepalive(self):
        """Per-order channel sends ready event with the right channel name."""
        order = _make_order()
        oid = order["id"]
        events = []
        stop = threading.Event()
        t = threading.Thread(target=_read_sse, args=(f"{API}/events/order/{oid}", events, stop, 8))
        t.start()
        deadline = time.time() + 5
        while time.time() < deadline and not any(e.get("_event") == "ready" for e in events):
            time.sleep(0.2)
        stop.set()
        t.join(timeout=5)
        ready = [e for e in events if e.get("_event") == "ready"]
        assert ready
        assert ready[0].get("channel") == f"order:{oid}"

    def test_sse_order_created_broadcast(self):
        """Creating an order broadcasts order_created to /events/staff."""
        events = []
        stop = threading.Event()
        t = threading.Thread(target=_read_sse, args=(f"{API}/events/staff", events, stop, 12))
        t.start()
        # Wait for ready
        time.sleep(1.5)
        order = _make_order("qris")
        # Wait for broadcast
        deadline = time.time() + 6
        while time.time() < deadline and not any(e.get("event") == "order_created" for e in events):
            time.sleep(0.2)
        stop.set()
        t.join(timeout=5)
        created = [e for e in events if e.get("event") == "order_created"]
        assert created, f"No order_created received. Events: {events}"
        # Verify the created order is in the events
        ids = [e.get("order", {}).get("id") for e in created]
        assert order["id"] in ids

    def test_sse_order_updated_broadcast_on_status(self, kasir_headers):
        """PATCH status broadcasts order_updated to BOTH staff and per-order channels."""
        order = _make_order("qris")
        oid = order["id"]
        staff_events, order_events = [], []
        stop = threading.Event()
        t1 = threading.Thread(target=_read_sse, args=(f"{API}/events/staff", staff_events, stop, 12))
        t2 = threading.Thread(target=_read_sse, args=(f"{API}/events/order/{oid}", order_events, stop, 12))
        t1.start(); t2.start()
        time.sleep(1.5)
        r = requests.patch(f"{API}/orders/{oid}/status",
                           json={"status": "diproses", "estimasi_menit": 10}, headers=kasir_headers)
        assert r.status_code == 200
        deadline = time.time() + 6
        while time.time() < deadline and (
            not any(e.get("event") == "order_updated" and e.get("order", {}).get("id") == oid for e in staff_events)
            or not any(e.get("event") == "order_updated" for e in order_events)
        ):
            time.sleep(0.2)
        stop.set()
        t1.join(timeout=5); t2.join(timeout=5)
        staff_hits = [e for e in staff_events if e.get("event") == "order_updated" and e.get("order", {}).get("id") == oid]
        order_hits = [e for e in order_events if e.get("event") == "order_updated"]
        assert staff_hits, f"staff missing update. {staff_events}"
        assert order_hits, f"order channel missing update. {order_events}"
        assert order_hits[0]["order"]["status"] == "diproses"

    def test_sse_order_updated_on_qris_pay(self):
        order = _make_order("qris")
        oid = order["id"]
        staff_events = []
        stop = threading.Event()
        t = threading.Thread(target=_read_sse, args=(f"{API}/events/staff", staff_events, stop, 10))
        t.start()
        time.sleep(1.5)
        pay = requests.post(f"{API}/orders/{oid}/qris-pay")
        assert pay.status_code == 200
        deadline = time.time() + 5
        while time.time() < deadline and not any(
            e.get("event") == "order_updated" and e.get("order", {}).get("id") == oid for e in staff_events
        ):
            time.sleep(0.2)
        stop.set()
        t.join(timeout=5)
        hits = [e for e in staff_events if e.get("event") == "order_updated" and e.get("order", {}).get("id") == oid]
        assert hits


class TestEscpos:
    def test_escpos_bytes(self):
        order = _make_order("tunai")
        oid = order["id"]
        r = requests.get(f"{API}/orders/{oid}/escpos")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/octet-stream")
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd and f"struk-{order['order_number']}.bin" in cd
        data = r.content
        # Must start with ESC @ initialize
        assert data[:2] == b"\x1b\x40"
        # Must end with full-cut GS V 0
        assert data.endswith(b"\x1d\x56\x00")
        # Should contain order number, table, total
        assert order["order_number"].encode() in data
        assert b"Meja" in data
        assert b"TOTAL" in data

    def test_escpos_not_found(self):
        r = requests.get(f"{API}/orders/nonexistent-id-xyz/escpos")
        assert r.status_code == 404
