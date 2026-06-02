"""Cafe SWM backend regression tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://order-management-web-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def kasir_token():
    r = requests.post(f"{API}/auth/login", json={"username": "kasir", "password": "kasir123"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def kasir_headers(kasir_token):
    return {"Authorization": f"Bearer {kasir_token}"}


# ---------- AUTH ----------
class TestAuth:
    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"})
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "admin"
        assert isinstance(data["token"], str) and len(data["token"]) > 0

    def test_login_kasir(self):
        r = requests.post(f"{API}/auth/login", json={"username": "kasir", "password": "kasir123"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "kasir"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["username"] == "admin"

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- PUBLIC LISTS ----------
class TestPublic:
    def test_categories(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 3
        names = [c["name"] for c in data]
        for n in ["Makanan", "Minuman", "Snack"]:
            assert n in names

    def test_products(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 9
        for p in data:
            assert "image" in p and p["image"]
            assert "price" in p

    def test_tables(self):
        r = requests.get(f"{API}/tables")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 10
        nums = sorted([t["number"] for t in data])
        for i in range(1, 11):
            assert f"{i:02d}" in nums

    def test_orders_requires_auth(self):
        r = requests.get(f"{API}/orders")
        assert r.status_code == 401


# ---------- ORDERS ----------
class TestOrders:
    def _make_order(self, payment_method="qris"):
        prods = requests.get(f"{API}/products").json()
        p = next(x for x in prods if x["status"] == "ready")
        body = {
            "table_number": "01",
            "items": [{"product_id": p["id"], "name": p["name"], "price": p["price"], "qty": 2, "note": "TEST"}],
            "payment_method": payment_method,
        }
        return requests.post(f"{API}/orders", json=body), p

    def test_create_order_calcs_and_format(self):
        r, p = self._make_order()
        assert r.status_code == 200, r.text
        o = r.json()
        subtotal = p["price"] * 2
        tax = round(subtotal * 0.10, 2)
        assert o["subtotal"] == subtotal
        assert o["tax"] == tax
        assert o["total"] == round(subtotal + tax, 2)
        assert o["status"] == "menunggu_pembayaran"
        assert o["payment_status"] == "pending"
        # format YYYYMMDD-NNNN
        assert len(o["order_number"]) == 13 and o["order_number"][8] == "-"

    def test_get_order_public(self):
        r, _ = self._make_order()
        oid = r.json()["id"]
        g = requests.get(f"{API}/orders/{oid}")
        assert g.status_code == 200
        assert g.json()["id"] == oid

    def test_qris_pay(self):
        r, _ = self._make_order("qris")
        oid = r.json()["id"]
        pay = requests.post(f"{API}/orders/{oid}/qris-pay")
        assert pay.status_code == 200
        # GET to verify persistence
        g = requests.get(f"{API}/orders/{oid}").json()
        assert g["payment_status"] == "paid"
        assert g["status"] == "pembayaran_diterima"

    def test_cash_pay_change(self, kasir_headers):
        r, _ = self._make_order("tunai")
        order = r.json()
        oid = order["id"]
        received = order["total"] + 5000
        pay = requests.post(f"{API}/orders/{oid}/cash-pay", json={"received": received}, headers=kasir_headers)
        assert pay.status_code == 200
        assert pay.json()["change"] == 5000
        g = requests.get(f"{API}/orders/{oid}").json()
        assert g["payment_status"] == "paid"
        assert g["cash_change"] == 5000

    def test_cash_pay_insufficient(self, kasir_headers):
        r, _ = self._make_order("tunai")
        oid = r.json()["id"]
        pay = requests.post(f"{API}/orders/{oid}/cash-pay", json={"received": 1}, headers=kasir_headers)
        assert pay.status_code == 400

    def test_cash_pay_requires_auth(self):
        r, _ = self._make_order("tunai")
        oid = r.json()["id"]
        pay = requests.post(f"{API}/orders/{oid}/cash-pay", json={"received": 100000})
        assert pay.status_code == 401

    def test_update_status(self, kasir_headers):
        r, _ = self._make_order("qris")
        oid = r.json()["id"]
        u = requests.patch(f"{API}/orders/{oid}/status",
                           json={"status": "diproses", "estimasi_menit": 15},
                           headers=kasir_headers)
        assert u.status_code == 200
        g = requests.get(f"{API}/orders/{oid}").json()
        assert g["status"] == "diproses"
        assert g["estimasi_menit"] == 15

    def test_list_orders_today(self, kasir_headers):
        r = requests.get(f"{API}/orders?today=true", headers=kasir_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- ADMIN CRUD ----------
class TestAdminCRUD:
    def test_category_crud(self, admin_headers):
        c = requests.post(f"{API}/categories", json={"name": "TEST_Cat", "icon": "🧪"}, headers=admin_headers)
        assert c.status_code == 200
        cid = c.json()["id"]
        u = requests.patch(f"{API}/categories/{cid}", json={"name": "TEST_Cat2", "icon": "🧪"}, headers=admin_headers)
        assert u.status_code == 200 and u.json()["name"] == "TEST_Cat2"
        d = requests.delete(f"{API}/categories/{cid}", headers=admin_headers)
        assert d.status_code == 200

    def test_product_crud_and_sold_out(self, admin_headers):
        cats = requests.get(f"{API}/categories").json()
        cid = cats[0]["id"]
        body = {"name": "TEST_Prod", "category_id": cid, "price": 10000, "description": "t", "image": "https://x.png", "status": "ready"}
        c = requests.post(f"{API}/products", json=body, headers=admin_headers)
        assert c.status_code == 200
        pid = c.json()["id"]
        # toggle sold_out
        s = requests.patch(f"{API}/products/{pid}/status?status=sold_out", headers=admin_headers)
        assert s.status_code == 200
        g = requests.get(f"{API}/products/{pid}").json()
        assert g["status"] == "sold_out"
        # order with sold_out should fail
        order_body = {"table_number": "01", "items": [{"product_id": pid, "name": "TEST_Prod", "price": 10000, "qty": 1}], "payment_method": "qris"}
        ro = requests.post(f"{API}/orders", json=order_body)
        assert ro.status_code == 400
        # cleanup
        d = requests.delete(f"{API}/products/{pid}", headers=admin_headers)
        assert d.status_code == 200

    def test_table_crud(self, admin_headers):
        c = requests.post(f"{API}/tables", json={"number": "TEST99", "seats": 2}, headers=admin_headers)
        assert c.status_code == 200
        tid = c.json()["id"]
        d = requests.delete(f"{API}/tables/{tid}", headers=admin_headers)
        assert d.status_code == 200

    def test_employee_crud(self, admin_headers):
        body = {"name": "TEST_Emp", "username": "test_emp_x", "password": "test1234", "role": "kasir"}
        # cleanup pre-existing if any
        list_r = requests.get(f"{API}/employees", headers=admin_headers).json()
        for e in list_r:
            if e["username"] == "test_emp_x":
                requests.delete(f"{API}/employees/{e['id']}", headers=admin_headers)
        c = requests.post(f"{API}/employees", json=body, headers=admin_headers)
        assert c.status_code == 200, c.text
        uid = c.json()["id"]
        u = requests.patch(f"{API}/employees/{uid}", json={"name": "TEST_Emp2"}, headers=admin_headers)
        assert u.status_code == 200
        d = requests.delete(f"{API}/employees/{uid}", headers=admin_headers)
        assert d.status_code == 200

    def test_admin_only_endpoints_blocked_for_kasir(self, kasir_headers):
        r = requests.post(f"{API}/categories", json={"name": "X"}, headers=kasir_headers)
        assert r.status_code == 403


# ---------- AUTH MGMT ----------
class TestAuthMgmt:
    def test_change_password_and_revert(self, kasir_headers):
        r = requests.post(f"{API}/auth/change-password",
                          json={"old_password": "kasir123", "new_password": "kasir999"},
                          headers=kasir_headers)
        assert r.status_code == 200
        # login with new
        lr = requests.post(f"{API}/auth/login", json={"username": "kasir", "password": "kasir999"})
        assert lr.status_code == 200
        new_hdr = {"Authorization": f"Bearer {lr.json()['token']}"}
        # revert
        rv = requests.post(f"{API}/auth/change-password",
                           json={"old_password": "kasir999", "new_password": "kasir123"},
                           headers=new_hdr)
        assert rv.status_code == 200

    def test_profile_update(self, admin_headers):
        r = requests.patch(f"{API}/auth/profile", json={"name": "Administrator"}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["name"] == "Administrator"


# ---------- REPORTS ----------
class TestReports:
    def test_summary(self, admin_headers):
        r = requests.get(f"{API}/reports/summary", headers=admin_headers)
        assert r.status_code == 200
        for k in ["today_revenue", "total_products", "total_tables", "total_employees", "total_orders"]:
            assert k in r.json()

    def test_daily(self, admin_headers):
        r = requests.get(f"{API}/reports/daily", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        assert "rows" in body and "total_revenue" in body

    def test_monthly(self, admin_headers):
        r = requests.get(f"{API}/reports/monthly?year=2026", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()["rows"]) == 12

    def test_yearly(self, admin_headers):
        r = requests.get(f"{API}/reports/yearly", headers=admin_headers)
        assert r.status_code == 200
        assert "rows" in r.json()

    def test_export_xlsx(self, admin_headers):
        r = requests.get(f"{API}/reports/export?period=daily", headers=admin_headers)
        assert r.status_code == 200
        assert "spreadsheetml.sheet" in r.headers.get("content-type", "")
        assert len(r.content) > 100

    def test_reports_require_auth(self):
        r = requests.get(f"{API}/reports/summary")
        assert r.status_code == 401
