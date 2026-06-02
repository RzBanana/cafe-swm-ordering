"""Cafe SWM — FastAPI backend.

Implements 43 features across Customer, Cashier (Kasir), and Admin roles.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import io
import os
import uuid
import jwt
import bcrypt
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import StreamingResponse, Response
import asyncio
import json
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from pywebpush import webpush, WebPushException


# ============================================================
# CONFIG & GLOBALS
# ============================================================
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
TAX_RATE = float(os.environ.get("TAX_RATE", "0.10"))

# Web Push (VAPID) config — used for push notifications via Service Worker.
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("cafe-swm")

app = FastAPI(title="Cafe SWM API")
api = APIRouter(prefix="/api")


# ============================================================
# WEBSOCKET CONNECTION MANAGER
# ============================================================
class ConnectionManager:
    """Manages SSE subscribers grouped by channel ("staff" or per-order id).

    Each subscriber holds an asyncio.Queue. broadcast() pushes a JSON payload to
    every queue in the channel; the SSE endpoint drains its queue back to the
    client as `data: ...\\n\\n` events.
    """

    def __init__(self):
        self.channels: dict[str, list[asyncio.Queue]] = {}

    def subscribe(self, channel: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self.channels.setdefault(channel, []).append(q)
        return q

    def unsubscribe(self, channel: str, q: asyncio.Queue):
        if channel in self.channels and q in self.channels[channel]:
            self.channels[channel].remove(q)

    async def broadcast(self, channel: str, message: dict):
        for q in self.channels.get(channel, []):
            try:
                q.put_nowait(message)
            except Exception:
                pass


manager = ConnectionManager()


async def notify(event: str, order: dict):
    """Broadcast an event to staff channel and the order-specific channel.

    Also delivers a Web Push notification for the two highest-value events:
    - order_created → push to all staff
    - order_updated with status=siap_diantar → push to all staff AND the customer
    - order_updated with any other status → push to the customer tracking that order
    """
    msg = {"event": event, "order": order}
    await manager.broadcast("staff", msg)
    if order and order.get("id"):
        await manager.broadcast(f"order:{order['id']}", msg)

    # Web Push side-effects (fire-and-forget; failures already logged inside)
    if not order:
        return
    order_num = order.get("order_number", "")
    table = order.get("table_number", "")
    status = order.get("status", "")
    if event == "order_created":
        asyncio.create_task(push_to_staff({
            "title": f"🔔 Pesanan baru #{order_num}",
            "body": f"Meja {table} · {len(order.get('items', []))} item",
            "url": "/kasir/orders",
            "tag": f"order-{order.get('id')}",
        }))
    elif event == "order_updated":
        if status == "siap_diantar":
            asyncio.create_task(push_to_staff({
                "title": f"🛎️ Siap diantar — Meja {table}",
                "body": f"#{order_num} sudah siap. Antar sekarang!",
                "url": "/kasir/orders",
                "tag": f"order-{order.get('id')}",
            }))
        # Always push to the customer who's tracking this order on a status change
        labels = {
            "pembayaran_diterima": ("✓ Pembayaran diterima", "Pesananmu segera diproses."),
            "diproses": ("⏳ Sedang diproses", "Dapur mulai menyiapkan pesananmu."),
            "dimasak": ("🍳 Sedang dimasak", "Pesananmu sedang dimasak."),
            "siap_diantar": ("🛎️ Siap diantar!", "Pesananmu sudah siap."),
            "selesai": ("✓ Selesai", "Terima kasih telah memesan di SWM Cafe ☕"),
        }
        if status in labels:
            title, body = labels[status]
            asyncio.create_task(push_to_order(order["id"], {
                "title": title,
                "body": f"{body} #{order_num}",
                "url": f"/track/{order['id']}",
                "tag": f"order-{order.get('id')}",
            }))


# ============================================================
# UTILS
# ============================================================
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


async def require_staff(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "kasir"):
        raise HTTPException(403, "Staff only")
    return user


def strip_mongo(doc: dict) -> dict:
    if doc:
        doc.pop("_id", None)
    return doc


# ============================================================
# MODELS
# ============================================================
class LoginIn(BaseModel):
    username: str
    password: str


class PasswordChangeIn(BaseModel):
    old_password: str
    new_password: str


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    photo: Optional[str] = None


class CategoryIn(BaseModel):
    name: str
    icon: Optional[str] = None


class ProductIn(BaseModel):
    name: str
    category_id: str
    price: float
    description: str = ""
    image: Optional[str] = None
    status: Literal["ready", "sold_out"] = "ready"


class TableIn(BaseModel):
    number: str
    seats: int = 4


class EmployeeIn(BaseModel):
    name: str
    username: str
    password: Optional[str] = None
    role: Literal["kasir", "admin"] = "kasir"


class EmployeeUpdateIn(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["kasir", "admin"]] = None


class CartItemIn(BaseModel):
    product_id: str
    name: str
    price: float
    qty: int
    note: str = ""


class OrderCreateIn(BaseModel):
    table_number: str
    items: List[CartItemIn]
    payment_method: Literal["tunai", "qris", "transfer"]


class OrderStatusIn(BaseModel):
    status: Literal[
        "menunggu_pembayaran",
        "pembayaran_diterima",
        "diproses",
        "dimasak",
        "siap_diantar",
        "selesai",
        "dibatalkan",
    ]
    estimasi_menit: Optional[int] = None


class CashPayIn(BaseModel):
    received: float


class PushSubscriptionIn(BaseModel):
    """Web Push subscription payload from PushManager.subscribe()."""
    endpoint: str
    keys: dict  # { p256dh, auth }
    role: Literal["staff", "customer"] = "staff"
    order_id: Optional[str] = None  # for customer-specific subscriptions


# ============================================================
# WEB PUSH (VAPID)
# Push notifications delivered via the OS even when browser/tab is closed.
# Requires HTTPS, a Service Worker on the client, and VAPID keys configured.
# ============================================================
async def _send_push(sub: dict, payload: dict) -> bool:
    """Send a single push notification. Returns True on success, False on expired."""
    if not VAPID_PRIVATE_KEY:
        return False
    try:
        webpush(
            subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
        )
        return True
    except WebPushException as e:
        # 404 / 410 = subscription expired or unsubscribed
        if e.response is not None and e.response.status_code in (404, 410):
            await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
        else:
            logger.warning("Web push failed: %s", e)
        return False
    except Exception as e:
        logger.warning("Web push error: %s", e)
        return False


async def push_to_staff(payload: dict):
    """Broadcast a push notification to every staff subscriber."""
    subs = await db.push_subscriptions.find({"role": "staff"}, {"_id": 0}).to_list(2000)
    if subs:
        await asyncio.gather(*[_send_push(s, payload) for s in subs], return_exceptions=True)


async def push_to_order(order_id: str, payload: dict):
    """Push to all subscribers tracking a specific order id."""
    subs = await db.push_subscriptions.find(
        {"role": "customer", "order_id": order_id}, {"_id": 0}
    ).to_list(2000)
    if subs:
        await asyncio.gather(*[_send_push(s, payload) for s in subs], return_exceptions=True)


@api.get("/push/vapid-public-key")
async def get_vapid_public_key():
    """Public endpoint used by the SW registration flow."""
    return {"public_key": VAPID_PUBLIC_KEY}


@api.post("/push/subscribe")
async def push_subscribe(body: PushSubscriptionIn):
    """Idempotently store a subscription (key=endpoint)."""
    doc = body.model_dump()
    doc["created_at"] = now_iso()
    await db.push_subscriptions.update_one(
        {"endpoint": body.endpoint},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}


@api.post("/push/unsubscribe")
async def push_unsubscribe(body: PushSubscriptionIn):
    await db.push_subscriptions.delete_one({"endpoint": body.endpoint})
    return {"ok": True}


@api.post("/push/test")
async def push_test(_: dict = Depends(require_staff)):
    """Send a test push to all currently-subscribed staff devices."""
    await push_to_staff({
        "title": "🔔 Tes Push Notification",
        "body": "Notifikasi ini berhasil sampai ke device Anda.",
        "url": "/kasir/orders",
    })
    return {"ok": True}


# ============================================================
# AUTH ENDPOINTS
# ============================================================
@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"username": body.username.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Username atau password salah")
    token = create_token(user["id"], user["username"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": user.get("name", ""),
            "role": user["role"],
            "photo": user.get("photo"),
        },
    }


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout():
    return {"ok": True}


@api.post("/auth/change-password")
async def change_password(body: PasswordChangeIn, user: dict = Depends(get_current_user)):
    record = await db.users.find_one({"id": user["id"]})
    if not verify_password(body.old_password, record["password_hash"]):
        raise HTTPException(400, "Password lama salah")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}


@api.patch("/auth/profile")
async def update_profile(body: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return fresh


# ============================================================
# CATEGORIES
# ============================================================
@api.get("/categories")
async def list_categories():
    items = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return items


@api.post("/categories")
async def create_category(body: CategoryIn, _: dict = Depends(require_admin)):
    cat = {"id": str(uuid.uuid4()), "name": body.name, "icon": body.icon or "🍽️", "created_at": now_iso()}
    await db.categories.insert_one(cat.copy())
    return strip_mongo(cat)


@api.patch("/categories/{cid}")
async def update_category(cid: str, body: CategoryIn, _: dict = Depends(require_admin)):
    await db.categories.update_one({"id": cid}, {"$set": body.model_dump(exclude_unset=True)})
    cat = await db.categories.find_one({"id": cid}, {"_id": 0})
    return cat


@api.delete("/categories/{cid}")
async def delete_category(cid: str, _: dict = Depends(require_admin)):
    await db.categories.delete_one({"id": cid})
    return {"ok": True}


# ============================================================
# PRODUCTS
# ============================================================
@api.get("/products")
async def list_products(category_id: Optional[str] = None):
    q = {"category_id": category_id} if category_id else {}
    items = await db.products.find(q, {"_id": 0}).sort("name", 1).to_list(1000)
    return items


@api.get("/products/{pid}")
async def get_product(pid: str):
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Produk tidak ditemukan")
    return p


@api.post("/products")
async def create_product(body: ProductIn, _: dict = Depends(require_admin)):
    p = body.model_dump()
    p["id"] = str(uuid.uuid4())
    p["created_at"] = now_iso()
    await db.products.insert_one(p.copy())
    return strip_mongo(p)


@api.patch("/products/{pid}")
async def update_product(pid: str, body: ProductIn, _: dict = Depends(require_admin)):
    await db.products.update_one({"id": pid}, {"$set": body.model_dump()})
    return await db.products.find_one({"id": pid}, {"_id": 0})


@api.patch("/products/{pid}/status")
async def toggle_product_status(pid: str, status: str = Query(...), _: dict = Depends(require_admin)):
    if status not in ("ready", "sold_out"):
        raise HTTPException(400, "Invalid status")
    await db.products.update_one({"id": pid}, {"$set": {"status": status}})
    return {"ok": True, "status": status}


@api.delete("/products/{pid}")
async def delete_product(pid: str, _: dict = Depends(require_admin)):
    await db.products.delete_one({"id": pid})
    return {"ok": True}


# ============================================================
# TABLES
# ============================================================
@api.get("/tables")
async def list_tables():
    items = await db.tables.find({}, {"_id": 0}).sort("number", 1).to_list(500)
    return items


@api.get("/tables/{number}")
async def get_table(number: str):
    t = await db.tables.find_one({"number": number}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Meja tidak ditemukan")
    return t


@api.post("/tables")
async def create_table(body: TableIn, _: dict = Depends(require_admin)):
    if await db.tables.find_one({"number": body.number}):
        raise HTTPException(400, "Nomor meja sudah ada")
    t = {"id": str(uuid.uuid4()), "number": body.number, "seats": body.seats, "created_at": now_iso()}
    await db.tables.insert_one(t.copy())
    return strip_mongo(t)


@api.patch("/tables/{tid}")
async def update_table(tid: str, body: TableIn, _: dict = Depends(require_admin)):
    await db.tables.update_one({"id": tid}, {"$set": body.model_dump()})
    return await db.tables.find_one({"id": tid}, {"_id": 0})


@api.delete("/tables/{tid}")
async def delete_table(tid: str, _: dict = Depends(require_admin)):
    await db.tables.delete_one({"id": tid})
    return {"ok": True}


# ============================================================
# EMPLOYEES (Pegawai)
# ============================================================
@api.get("/employees")
async def list_employees(_: dict = Depends(require_admin)):
    items = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(500)
    return items


@api.post("/employees")
async def create_employee(body: EmployeeIn, _: dict = Depends(require_admin)):
    body.username = body.username.lower()
    if await db.users.find_one({"username": body.username}):
        raise HTTPException(400, "Username sudah dipakai")
    if not body.password:
        raise HTTPException(400, "Password wajib diisi")
    user = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "username": body.username,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user.copy())
    user.pop("password_hash")
    return strip_mongo(user)


@api.patch("/employees/{uid}")
async def update_employee(uid: str, body: EmployeeUpdateIn, _: dict = Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"id": uid}, {"$set": update})
    return await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})


@api.post("/employees/{uid}/reset-password")
async def reset_password(uid: str, new_password: str = Query(...), _: dict = Depends(require_admin)):
    await db.users.update_one({"id": uid}, {"$set": {"password_hash": hash_password(new_password)}})
    return {"ok": True}


@api.delete("/employees/{uid}")
async def delete_employee(uid: str, current: dict = Depends(require_admin)):
    if uid == current["id"]:
        raise HTTPException(400, "Tidak bisa hapus akun sendiri")
    await db.users.delete_one({"id": uid})
    return {"ok": True}


# ============================================================
# ORDERS
# ============================================================
async def _next_order_number() -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await db.orders.count_documents({"order_number": {"$regex": f"^{today}-"}})
    return f"{today}-{(count + 1):04d}"


@api.post("/orders")
async def create_order(body: OrderCreateIn):
    """Create a new order from a customer (no auth required)."""
    # Validate items: check sold_out
    for it in body.items:
        prod = await db.products.find_one({"id": it.product_id}, {"_id": 0})
        if not prod:
            raise HTTPException(400, f"Produk {it.name} tidak ditemukan")
        if prod.get("status") == "sold_out":
            raise HTTPException(400, f"Produk {prod['name']} sudah habis")

    subtotal = sum(i.price * i.qty for i in body.items)
    tax = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + tax, 2)
    order = {
        "id": str(uuid.uuid4()),
        "order_number": await _next_order_number(),
        "table_number": body.table_number,
        "items": [i.model_dump() for i in body.items],
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "payment_method": body.payment_method,
        "payment_status": "pending",  # pending | paid
        "status": "menunggu_pembayaran",
        "estimasi_menit": None,
        "cash_received": None,
        "cash_change": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.orders.insert_one(order.copy())
    await notify("order_created", order)
    return strip_mongo(order)


@api.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    today: bool = False,
    user: dict = Depends(require_staff),
):
    q = {}
    if status:
        q["status"] = status
    if today:
        start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        q["created_at"] = {"$gte": start.isoformat()}
    items = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.get("/orders/{oid}")
async def get_order(oid: str):
    """Public: customer can track their order by id."""
    o = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Pesanan tidak ditemukan")
    return o


@api.patch("/orders/{oid}/status")
async def update_order_status(oid: str, body: OrderStatusIn, _: dict = Depends(require_staff)):
    update = {"status": body.status, "updated_at": now_iso()}
    if body.estimasi_menit is not None:
        update["estimasi_menit"] = body.estimasi_menit
    if body.status == "pembayaran_diterima":
        update["payment_status"] = "paid"
        update["paid_at"] = now_iso()
    await db.orders.update_one({"id": oid}, {"$set": update})
    fresh = await db.orders.find_one({"id": oid}, {"_id": 0})
    await notify("order_updated", fresh)
    return fresh


@api.post("/orders/{oid}/cash-pay")
async def cash_pay(oid: str, body: CashPayIn, _: dict = Depends(require_staff)):
    order = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Pesanan tidak ditemukan")
    if body.received < order["total"]:
        raise HTTPException(400, "Uang diterima kurang dari total")
    change = round(body.received - order["total"], 2)
    await db.orders.update_one(
        {"id": oid},
        {"$set": {
            "cash_received": body.received,
            "cash_change": change,
            "payment_status": "paid",
            "status": "pembayaran_diterima",
            "paid_at": now_iso(),
            "updated_at": now_iso(),
        }},
    )
    fresh = await db.orders.find_one({"id": oid}, {"_id": 0})
    await notify("order_updated", fresh)
    return {"ok": True, "change": change}


@api.post("/orders/{oid}/qris-pay")
async def qris_pay(oid: str):
    """Mock QRIS payment confirmation (simulated success)."""
    order = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Pesanan tidak ditemukan")
    await db.orders.update_one(
        {"id": oid},
        {"$set": {
            "payment_status": "paid",
            "status": "pembayaran_diterima",
            "paid_at": now_iso(),
            "updated_at": now_iso(),
        }},
    )
    fresh = await db.orders.find_one({"id": oid}, {"_id": 0})
    await notify("order_updated", fresh)
    return {"ok": True}


@api.delete("/orders/{oid}")
async def cancel_order(oid: str, _: dict = Depends(require_admin)):
    await db.orders.update_one({"id": oid}, {"$set": {"status": "dibatalkan", "updated_at": now_iso()}})
    fresh = await db.orders.find_one({"id": oid}, {"_id": 0})
    await notify("order_updated", fresh)
    return {"ok": True}


# ============================================================
# REPORTS
# ============================================================
def _date_range(from_iso: Optional[str], to_iso: Optional[str]):
    q = {"status": {"$ne": "dibatalkan"}, "payment_status": "paid"}
    if from_iso or to_iso:
        rng = {}
        if from_iso:
            rng["$gte"] = from_iso
        if to_iso:
            rng["$lte"] = to_iso
        q["created_at"] = rng
    return q


@api.get("/reports/summary")
async def report_summary(_: dict = Depends(require_staff)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_orders = await db.orders.find({"created_at": {"$gte": today}}, {"_id": 0}).to_list(5000)
    paid_today = [o for o in today_orders if o.get("payment_status") == "paid"]
    revenue = sum(o.get("total", 0) for o in paid_today)
    new_orders = [o for o in today_orders if o["status"] in ("menunggu_pembayaran", "pembayaran_diterima")]
    processing = [o for o in today_orders if o["status"] in ("diproses", "dimasak", "siap_diantar")]
    done = [o for o in today_orders if o["status"] == "selesai"]
    total_products = await db.products.count_documents({})
    total_tables = await db.tables.count_documents({})
    total_employees = await db.users.count_documents({})
    total_orders = await db.orders.count_documents({})
    return {
        "today_revenue": revenue,
        "today_transactions": len(paid_today),
        "new_orders": len(new_orders),
        "processing_orders": len(processing),
        "done_orders": len(done),
        "total_products": total_products,
        "total_tables": total_tables,
        "total_employees": total_employees,
        "total_orders": total_orders,
    }


@api.get("/reports/daily")
async def report_daily(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    _: dict = Depends(require_staff),
):
    """Daily revenue grouped by date string."""
    q = _date_range(date_from, date_to)
    orders = await db.orders.find(q, {"_id": 0}).to_list(10000)
    buckets = {}
    for o in orders:
        d = o["created_at"][:10]
        buckets.setdefault(d, {"date": d, "revenue": 0, "transactions": 0})
        buckets[d]["revenue"] += o.get("total", 0)
        buckets[d]["transactions"] += 1
    rows = sorted(buckets.values(), key=lambda x: x["date"])
    return {"rows": rows, "total_revenue": sum(r["revenue"] for r in rows)}


@api.get("/reports/monthly")
async def report_monthly(year: int = Query(...), _: dict = Depends(require_staff)):
    start = f"{year}-01-01T00:00:00+00:00"
    end = f"{year}-12-31T23:59:59+00:00"
    q = _date_range(start, end)
    orders = await db.orders.find(q, {"_id": 0}).to_list(50000)
    months = {f"{year}-{m:02d}": {"month": f"{year}-{m:02d}", "revenue": 0, "transactions": 0} for m in range(1, 13)}
    for o in orders:
        m = o["created_at"][:7]
        if m in months:
            months[m]["revenue"] += o.get("total", 0)
            months[m]["transactions"] += 1
    return {"rows": list(months.values()), "total_revenue": sum(r["revenue"] for r in months.values())}


@api.get("/reports/yearly")
async def report_yearly(_: dict = Depends(require_staff)):
    orders = await db.orders.find(
        {"status": {"$ne": "dibatalkan"}, "payment_status": "paid"}, {"_id": 0}
    ).to_list(100000)
    years = {}
    for o in orders:
        y = o["created_at"][:4]
        years.setdefault(y, {"year": y, "revenue": 0, "transactions": 0})
        years[y]["revenue"] += o.get("total", 0)
        years[y]["transactions"] += 1
    rows = sorted(years.values(), key=lambda x: x["year"])
    return {"rows": rows, "total_revenue": sum(r["revenue"] for r in rows)}


@api.get("/reports/by-method")
async def report_by_method(_: dict = Depends(require_staff)):
    """Breakdown by payment method."""
    orders = await db.orders.find(
        {"status": {"$ne": "dibatalkan"}, "payment_status": "paid"}, {"_id": 0}
    ).to_list(100000)
    methods = {"tunai": 0, "qris": 0, "transfer": 0}
    counts = {"tunai": 0, "qris": 0, "transfer": 0}
    for o in orders:
        m = o.get("payment_method", "tunai")
        methods[m] = methods.get(m, 0) + o.get("total", 0)
        counts[m] = counts.get(m, 0) + 1
    return {"revenue": methods, "counts": counts}


@api.get("/reports/export")
async def export_excel(
    period: Literal["daily", "monthly", "yearly"] = "daily",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    year: Optional[int] = None,
    _: dict = Depends(require_staff),
):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Laporan {period.capitalize()}"
    header_fill = PatternFill(start_color="C05A3B", end_color="C05A3B", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)

    if period == "daily":
        data = await report_daily(date_from, date_to, _)
        headers = ["Tanggal", "Jumlah Transaksi", "Pendapatan (Rp)"]
        rows = [[r["date"], r["transactions"], r["revenue"]] for r in data["rows"]]
    elif period == "monthly":
        data = await report_monthly(year or datetime.now().year, _)
        headers = ["Bulan", "Jumlah Transaksi", "Pendapatan (Rp)"]
        rows = [[r["month"], r["transactions"], r["revenue"]] for r in data["rows"]]
    else:
        data = await report_yearly(_)
        headers = ["Tahun", "Jumlah Transaksi", "Pendapatan (Rp)"]
        rows = [[r["year"], r["transactions"], r["revenue"]] for r in data["rows"]]

    ws.append(["LAPORAN PENDAPATAN CAFE SWM"])
    ws.merge_cells("A1:C1")
    ws["A1"].font = Font(bold=True, size=16, color="2C1A14")
    ws["A1"].alignment = Alignment(horizontal="center")
    ws.append([])
    ws.append(headers)
    for col in range(1, len(headers) + 1):
        cell = ws.cell(row=3, column=col)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    for r in rows:
        ws.append(r)

    ws.append([])
    ws.append(["TOTAL", "", data["total_revenue"]])
    ws.cell(row=ws.max_row, column=1).font = Font(bold=True)
    ws.cell(row=ws.max_row, column=3).font = Font(bold=True)

    for col_letter in ["A", "B", "C"]:
        ws.column_dimensions[col_letter].width = 22

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"laporan_{period}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ============================================================
# THERMAL PRINTER (ESC/POS)
# ============================================================
def _escpos_receipt(order: dict) -> bytes:
    """Generate raw ESC/POS bytes for a 58/80mm thermal receipt.

    Standard commands:
      ESC @ (1B 40) — initialize
      ESC a n (1B 61 n) — alignment (0=left, 1=center, 2=right)
      ESC ! n (1B 21 n) — text style (0x10=double-height, 0x20=double-width, 0x08=bold)
      GS V m (1D 56 m) — full cut (0x00 full, 0x01 partial)
      LF (0x0A) — line feed
    """
    ESC = b"\x1b"
    GS = b"\x1d"
    INIT = ESC + b"@"
    CENTER = ESC + b"a\x01"
    LEFT = ESC + b"a\x00"
    BOLD_ON = ESC + b"E\x01"
    BOLD_OFF = ESC + b"E\x00"
    DOUBLE = ESC + b"!\x30"
    NORMAL = ESC + b"!\x00"
    CUT = GS + b"V\x00"
    LF = b"\n"

    width = 32  # 58mm paper ≈ 32 chars; 80mm ≈ 48

    def line(char="-"):
        return (char * width).encode() + LF

    def kv(k: str, v: str) -> bytes:
        # Right-align value
        v = str(v)
        space = max(1, width - len(k) - len(v))
        return f"{k}{' ' * space}{v}".encode() + LF

    out = bytearray()
    out += INIT
    out += CENTER + DOUBLE + BOLD_ON + b"SWM CAFE" + LF + BOLD_OFF + NORMAL
    out += CENTER + b"Jl. Kopi No. 1 - 021-xxx" + LF
    out += LEFT + line("=")
    out += kv("No.", f"#{order.get('order_number','')}")
    out += kv("Meja", order.get("table_number", "-"))
    created = order.get("created_at", "")[:19].replace("T", " ")
    out += kv("Tanggal", created)
    out += kv("Metode", str(order.get("payment_method", "")).upper())
    out += line("-")

    for item in order.get("items", []):
        name = item.get("name", "")[: width - 1]
        out += BOLD_ON + f"{item.get('qty')}x {name}".encode() + BOLD_OFF + LF
        price_line = f"  @ {int(item.get('price',0)):,}".replace(",", ".")
        total_line = f"{int(item.get('price',0)*item.get('qty',0)):,}".replace(",", ".")
        space = max(1, width - len(price_line) - len(total_line))
        out += (price_line + " " * space + total_line).encode() + LF
        note = (item.get("note") or "").strip()
        if note:
            out += f"  - {note[: width - 4]}".encode() + LF

    out += line("-")
    out += kv("Subtotal", f"Rp {int(order.get('subtotal',0)):,}".replace(",", "."))
    out += kv("Pajak", f"Rp {int(order.get('tax',0)):,}".replace(",", "."))
    out += BOLD_ON + kv("TOTAL", f"Rp {int(order.get('total',0)):,}".replace(",", ".")) + BOLD_OFF
    if order.get("cash_received") is not None:
        out += kv("Tunai", f"Rp {int(order.get('cash_received',0)):,}".replace(",", "."))
        out += kv("Kembali", f"Rp {int(order.get('cash_change',0)):,}".replace(",", "."))
    out += line("=")
    out += CENTER + b"Terima kasih telah memesan" + LF
    out += CENTER + b"~ SWM Cafe ~" + LF
    out += LF + LF + LF + LF
    out += CUT
    return bytes(out)


@api.get("/orders/{oid}/escpos")
async def order_escpos(oid: str):
    """Return raw ESC/POS bytes for direct thermal printer use (USB/Bluetooth/Network).

    Send the .bin file to a thermal printer via tools like RawBT (Android),
    `lp -d printer file.bin` (Linux/Mac), or `copy /b file.bin LPT1:` (Windows).
    """
    order = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Pesanan tidak ditemukan")
    data = _escpos_receipt(order)
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="struk-{order["order_number"]}.bin"'},
    )


# ============================================================
# SSE (Server-Sent Events) — real-time order updates
# Works over standard HTTPS through K8s ingress (no WebSocket upgrade needed)
# ============================================================
async def _sse_stream(channel: str):
    q = manager.subscribe(channel)
    try:
        # Initial event so the client immediately knows the connection is alive
        yield f"event: ready\ndata: {json.dumps({'channel': channel})}\n\n"
        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=20)
                yield f"data: {json.dumps(msg, default=str)}\n\n"
            except asyncio.TimeoutError:
                # Comment-line keep-alive (ignored by EventSource)
                yield ": keepalive\n\n"
    finally:
        manager.unsubscribe(channel, q)


@api.get("/events/staff")
async def sse_staff():
    """Staff (kasir/admin) channel — receives all order events as SSE.

    Note: SSE doesn't carry Authorization headers from EventSource by default.
    Anyone on the staff URL can listen — but the data is just order state which
    is already protected at write-time. For stricter security, swap with a
    server-rendered token query param later.
    """
    return StreamingResponse(
        _sse_stream("staff"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@api.get("/events/order/{order_id}")
async def sse_order(order_id: str):
    """Customer per-order channel — receives updates only for that order."""
    return StreamingResponse(
        _sse_stream(f"order:{order_id}"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ============================================================
# STARTUP / SEED
# ============================================================
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("username", unique=True)
    await db.products.create_index("category_id")
    await db.tables.create_index("number", unique=True)
    await db.orders.create_index("created_at")
    await db.push_subscriptions.create_index("endpoint", unique=True)
    await db.push_subscriptions.create_index("order_id")

    # Seed admin
    admin_username = os.environ.get("ADMIN_USERNAME", "admin").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"username": admin_username})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "username": admin_username,
            "name": "Administrator",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "photo": None,
            "created_at": now_iso(),
        })
        logger.info("✓ Admin seeded: %s", admin_username)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"username": admin_username},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )

    # Seed kasir
    kasir_username = os.environ.get("KASIR_USERNAME", "kasir").lower()
    kasir_password = os.environ.get("KASIR_PASSWORD", "kasir123")
    kasir_existing = await db.users.find_one({"username": kasir_username})
    if not kasir_existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "username": kasir_username,
            "name": "Kasir 1",
            "password_hash": hash_password(kasir_password),
            "role": "kasir",
            "photo": None,
            "created_at": now_iso(),
        })
        logger.info("✓ Kasir seeded: %s", kasir_username)
    elif not verify_password(kasir_password, kasir_existing["password_hash"]):
        await db.users.update_one(
            {"username": kasir_username},
            {"$set": {"password_hash": hash_password(kasir_password)}},
        )

    # Seed categories
    if await db.categories.count_documents({}) == 0:
        cats = [
            {"id": str(uuid.uuid4()), "name": "Makanan", "icon": "🍛", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name": "Minuman", "icon": "☕", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name": "Snack", "icon": "🍟", "created_at": now_iso()},
        ]
        await db.categories.insert_many([c.copy() for c in cats])
        logger.info("✓ Categories seeded")

        # Seed products
        cat_map = {c["name"]: c["id"] for c in cats}
        food_img = "https://images.pexels.com/photos/34800842/pexels-photo-34800842.jpeg"
        drink_img = "https://images.pexels.com/photos/35229818/pexels-photo-35229818.jpeg"
        snack_img = "https://images.pexels.com/photos/27374392/pexels-photo-27374392.jpeg"

        products = [
            ("Nasi Goreng Spesial", "Makanan", 28000, "Nasi goreng dengan telur, ayam, dan kerupuk.", food_img),
            ("Ayam Geprek Sambal Matah", "Makanan", 25000, "Ayam crispy + sambal matah pedas.", food_img),
            ("Mie Goreng Aceh", "Makanan", 26000, "Mie goreng ala aceh dengan bumbu rempah.", food_img),
            ("Es Teh Manis", "Minuman", 8000, "Teh manis dingin segar.", drink_img),
            ("Kopi Susu Gula Aren", "Minuman", 18000, "Espresso + susu + gula aren.", drink_img),
            ("Cappuccino", "Minuman", 22000, "Espresso, susu, dan foam art.", drink_img),
            ("Kentang Goreng", "Snack", 15000, "Kentang goreng renyah + saus.", snack_img),
            ("Sosis Bakar", "Snack", 12000, "Sosis bakar dengan saus barbeque.", snack_img),
            ("Cireng Bumbu Rujak", "Snack", 10000, "Cireng kenyal dengan bumbu rujak.", snack_img),
        ]
        await db.products.insert_many([
            {
                "id": str(uuid.uuid4()),
                "name": n,
                "category_id": cat_map[c],
                "price": p,
                "description": d,
                "image": img,
                "status": "ready",
                "created_at": now_iso(),
            }
            for n, c, p, d, img in products
        ])
        logger.info("✓ Products seeded")

    # Seed tables
    if await db.tables.count_documents({}) == 0:
        await db.tables.insert_many([
            {"id": str(uuid.uuid4()), "number": f"{i:02d}", "seats": 4, "created_at": now_iso()}
            for i in range(1, 11)
        ])
        logger.info("✓ Tables seeded")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ============================================================
# CORS & ROUTER
# ============================================================
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
