"""Web Push (VAPID + service worker subscription) endpoint tests."""
import os
import re
import uuid
import base64
import asyncio
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "cafe_swm_database")


@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"}, timeout=30)
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def kasir_token():
    r = requests.post(f"{API}/auth/login", json={"username": "kasir", "password": "kasir123"}, timeout=30)
    assert r.status_code == 200
    return r.json()["token"]


def _fake_sub(endpoint=None, valid_key=False):
    endpoint = endpoint or f"https://fcm.googleapis.com/fcm/send/TEST_{uuid.uuid4().hex}"
    if valid_key:
        # Generate a real P-256 public key so pywebpush proceeds to HTTP send
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        priv = ec.generate_private_key(ec.SECP256R1())
        pub_bytes = priv.public_key().public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint,
        )  # 65 bytes starting with 0x04
        p256dh = base64.urlsafe_b64encode(pub_bytes).decode().rstrip("=")
    else:
        p256dh = base64.urlsafe_b64encode(os.urandom(65)).decode().rstrip("=")
    return {
        "endpoint": endpoint,
        "keys": {
            "p256dh": p256dh,
            "auth": base64.urlsafe_b64encode(os.urandom(16)).decode().rstrip("="),
        },
    }


# ---------- VAPID public key ----------
class TestVapidPublicKey:
    def test_returns_88char_b64url_starting_with_B(self):
        r = requests.get(f"{API}/push/vapid-public-key")
        assert r.status_code == 200
        data = r.json()
        assert "public_key" in data
        pk = data["public_key"]
        assert isinstance(pk, str)
        assert len(pk) == 87 or len(pk) == 88, f"unexpected len {len(pk)}: {pk}"
        # base64url charset
        assert re.fullmatch(r"[A-Za-z0-9_\-]+=*", pk)
        assert pk.startswith("B"), "uncompressed P-256 public key must start with 'B' (0x04 prefix)"

    def test_no_auth_required(self):
        r = requests.get(f"{API}/push/vapid-public-key", headers={"Authorization": "Bearer not-a-real-token"})
        assert r.status_code == 200


# ---------- Subscribe / Unsubscribe ----------
class TestSubscribe:
    def test_staff_subscribe_ok(self, mongo):
        sub = _fake_sub()
        body = {**sub, "role": "staff", "order_id": None}
        r = requests.post(f"{API}/push/subscribe", json=body)
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True}
        doc = mongo.push_subscriptions.find_one({"endpoint": sub["endpoint"]})
        assert doc is not None
        assert doc["role"] == "staff"
        assert doc["keys"]["p256dh"] == sub["keys"]["p256dh"]
        # cleanup
        mongo.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})

    def test_customer_subscribe_with_order_id(self, mongo):
        sub = _fake_sub()
        oid = f"TEST_order_{uuid.uuid4().hex[:8]}"
        body = {**sub, "role": "customer", "order_id": oid}
        r = requests.post(f"{API}/push/subscribe", json=body)
        assert r.status_code == 200
        doc = mongo.push_subscriptions.find_one({"endpoint": sub["endpoint"]})
        assert doc is not None
        assert doc["role"] == "customer"
        assert doc["order_id"] == oid
        mongo.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})

    def test_duplicate_subscribe_is_upsert(self, mongo):
        sub = _fake_sub()
        body1 = {**sub, "role": "staff"}
        body2 = {**sub, "role": "customer", "order_id": "ord-xyz"}
        r1 = requests.post(f"{API}/push/subscribe", json=body1)
        r2 = requests.post(f"{API}/push/subscribe", json=body2)
        assert r1.status_code == 200 and r2.status_code == 200
        cnt = mongo.push_subscriptions.count_documents({"endpoint": sub["endpoint"]})
        assert cnt == 1, f"expected exactly 1 record (upsert), got {cnt}"
        # second body's role should win
        doc = mongo.push_subscriptions.find_one({"endpoint": sub["endpoint"]})
        assert doc["role"] == "customer"
        assert doc["order_id"] == "ord-xyz"
        mongo.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})

    def test_unsubscribe_removes_row(self, mongo):
        sub = _fake_sub()
        requests.post(f"{API}/push/subscribe", json={**sub, "role": "staff"})
        assert mongo.push_subscriptions.find_one({"endpoint": sub["endpoint"]}) is not None
        r = requests.post(f"{API}/push/unsubscribe", json={**sub, "role": "staff"})
        assert r.status_code == 200
        assert r.json() == {"ok": True}
        assert mongo.push_subscriptions.find_one({"endpoint": sub["endpoint"]}) is None


# ---------- /push/test auth ----------
class TestPushTestEndpoint:
    def test_requires_auth(self):
        r = requests.post(f"{API}/push/test")
        assert r.status_code == 401

    def test_admin_ok(self, admin_token):
        r = requests.post(f"{API}/push/test", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_kasir_ok(self, kasir_token):
        r = requests.post(f"{API}/push/test", headers={"Authorization": f"Bearer {kasir_token}"})
        assert r.status_code == 200
        assert r.json() == {"ok": True}


# ---------- Auto-cleanup of dead subscriptions ----------
class TestAutoCleanup:
    def test_dead_endpoint_cleaned_after_push_test(self, admin_token, mongo):
        """Insert a fake subscription whose endpoint returns 410 Gone. After /push/test
        the row should be auto-removed by _send_push's 404/410 handler.
        NOTE: depends on httpbin.org reachability returning 410 (not 503). May be skipped
        when the external endpoint is rate-limited."""
        # Pre-flight check: httpbin must actually return 410, not 503
        try:
            pre = requests.get("https://httpbin.org/status/410", timeout=10)
            if pre.status_code != 410:
                pytest.skip(f"httpbin.org returned {pre.status_code}, not 410; cannot reliably test cleanup")
        except Exception as e:
            pytest.skip(f"httpbin.org unreachable: {e}")

        dead_endpoint = "https://httpbin.org/status/410"
        sub = _fake_sub(endpoint=dead_endpoint, valid_key=True)
        mongo.push_subscriptions.update_one(
            {"endpoint": dead_endpoint},
            {"$set": {**sub, "role": "staff", "order_id": None, "created_at": "2026-01-01T00:00:00"}},
            upsert=True,
        )
        assert mongo.push_subscriptions.find_one({"endpoint": dead_endpoint}) is not None
        r = requests.post(f"{API}/push/test", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        # Give the fire-and-forget cleanup a moment (httpbin can be slow)
        import time
        time.sleep(8)
        leftover = mongo.push_subscriptions.find_one({"endpoint": dead_endpoint})
        # Cleanup ourselves to be safe regardless of result
        mongo.push_subscriptions.delete_one({"endpoint": dead_endpoint})
        assert leftover is None, "dead endpoint should have been auto-removed via 404/410 handler"


# ---------- Order events trigger push fire-and-forget (no crash) ----------
class TestOrderEventsTriggerPushSafely:
    def _make_order(self):
        prods = requests.get(f"{API}/products").json()
        p = next(x for x in prods if x.get("status") == "ready")
        body = {
            "table_number": "01",
            "items": [{"product_id": p["id"], "name": p["name"], "price": p["price"], "qty": 1, "note": "TEST_push"}],
            "payment_method": "qris",
        }
        return requests.post(f"{API}/orders", json=body)

    def test_order_create_does_not_crash_with_fake_staff_sub(self, mongo):
        # Insert a fake staff subscription with unreachable endpoint
        fake = _fake_sub(endpoint="https://example.invalid/not-real")
        mongo.push_subscriptions.update_one(
            {"endpoint": fake["endpoint"]},
            {"$set": {**fake, "role": "staff", "order_id": None, "created_at": "2026-01-01T00:00:00"}},
            upsert=True,
        )
        try:
            r = self._make_order()
            assert r.status_code == 200, r.text
            assert r.json()["id"]
        finally:
            mongo.push_subscriptions.delete_one({"endpoint": fake["endpoint"]})

    def test_status_update_does_not_crash(self, kasir_token, mongo):
        # subscribe a customer with order_id; insert a staff sub too
        r = self._make_order()
        oid = r.json()["id"]
        hdr = {"Authorization": f"Bearer {kasir_token}"}
        # walk a few statuses including siap_diantar
        for st in ["pembayaran_diterima", "diproses", "dimasak", "siap_diantar", "selesai"]:
            u = requests.patch(f"{API}/orders/{oid}/status", json={"status": st}, headers=hdr)
            assert u.status_code == 200, f"status {st}: {u.text}"
        # verify final state
        g = requests.get(f"{API}/orders/{oid}").json()
        assert g["status"] == "selesai"
