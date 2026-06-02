import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock, Loader2, Home, Printer } from "lucide-react";
import api, { formatRupiah, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useWebSocket } from "@/lib/useEventStream";

const STATUSES = [
  { key: "menunggu_pembayaran", label: "Menunggu Pembayaran" },
  { key: "pembayaran_diterima", label: "Pembayaran Diterima" },
  { key: "diproses", label: "Sedang Diproses" },
  { key: "dimasak", label: "Sedang Dimasak" },
  { key: "siap_diantar", label: "Siap Diantar" },
  { key: "selesai", label: "Selesai" },
];

export default function Tracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [paying, setPaying] = useState(false);
  const receiptRef = useRef(null);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line
  }, [orderId]);

  // Real-time updates via WebSocket
  useWebSocket(orderId ? `/api/events/order/${orderId}` : null, (msg) => {
    if (msg?.order) {
      setOrder(msg.order);
      if (msg.event === "order_updated") {
        const labels = {
          pembayaran_diterima: "Pembayaran diterima!",
          diproses: "Pesanan sedang diproses",
          dimasak: "Pesanan sedang dimasak",
          siap_diantar: "Pesanan siap diantar 🎉",
          selesai: "Pesanan selesai. Terima kasih!",
        };
        const lbl = labels[msg.order.status];
        if (lbl) toast.success(lbl);
      }
    }
  });

  const payQris = async () => {
    setPaying(true);
    try {
      await api.post(`/orders/${orderId}/qris-pay`);
      toast.success("Pembayaran QRIS berhasil!");
      fetchOrder();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setPaying(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const currentIdx = STATUSES.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-md mx-auto px-5 py-6 text-center">
          <p className="text-[11px] tracking-[0.2em] uppercase opacity-80">Pesanan</p>
          <h1 className="font-heading text-3xl mt-1" data-testid="order-number">
            #{order.order_number}
          </h1>
          <p className="text-sm opacity-90 mt-1">
            Meja {order.table_number} · {new Date(order.created_at).toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 -mt-5 space-y-5">
        {/* Estimasi */}
        {order.estimasi_menit && order.status !== "selesai" && (
          <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-4 shadow-sm">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="text-primary" size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Estimasi Pesanan</p>
              <p className="font-heading text-2xl text-primary leading-none mt-0.5">
                {order.estimasi_menit} Menit
              </p>
            </div>
          </div>
        )}

        {/* QRIS mock */}
        {order.payment_method === "qris" && order.payment_status === "pending" && (
          <div className="bg-card rounded-2xl border border-border/60 p-5 text-center" data-testid="qris-box">
            <p className="font-heading text-xl">Scan QRIS</p>
            <p className="text-xs text-muted-foreground mb-4">Gunakan aplikasi e-wallet untuk membayar</p>
            <div className="bg-white p-3 inline-block rounded-xl border border-border">
              <QRCodeSVG
                value={`SWM-CAFE|${order.order_number}|${order.total}`}
                size={200}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#2C1A14"
              />
            </div>
            <p className="font-heading text-xl text-primary mt-3">{formatRupiah(order.total)}</p>
            <Button data-testid="qris-confirm" onClick={payQris} disabled={paying} className="mt-3 w-full h-11">
              {paying ? "Memverifikasi..." : "Sudah Bayar (simulasi)"}
            </Button>
          </div>
        )}

        {/* Transfer instructions */}
        {order.payment_method === "transfer" && order.payment_status === "pending" && (
          <div className="bg-card rounded-2xl border border-border/60 p-5">
            <p className="font-heading text-xl mb-2">Transfer Bank</p>
            <p className="text-sm text-muted-foreground mb-3">
              Transfer ke rekening berikut lalu konfirmasi ke kasir:
            </p>
            <div className="bg-secondary/40 rounded-xl p-3 space-y-1 text-sm">
              <Row k="Bank" v="BCA" />
              <Row k="No. Rek" v="1234567890" />
              <Row k="A/N" v="SWM Cafe" />
              <Row k="Jumlah" v={formatRupiah(order.total)} highlight />
            </div>
          </div>
        )}

        {/* Cash status */}
        {order.payment_method === "tunai" && order.payment_status === "pending" && (
          <div
            className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900 p-4 text-center"
            data-testid="cash-pending"
          >
            <Wallet />
            <p className="font-heading text-lg text-amber-900 dark:text-amber-200">Menunggu Konfirmasi Kasir</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Silakan menuju kasir dan bayar tunai {formatRupiah(order.total)}
            </p>
          </div>
        )}

        {/* Status timeline */}
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-semibold mb-3">
            Status Pesanan
          </p>
          <div className="space-y-1">
            {STATUSES.map((s, idx) => {
              const done = idx <= currentIdx;
              const active = idx === currentIdx;
              return (
                <div key={s.key} className="flex items-center gap-3 py-1.5" data-testid={`status-${s.key}`}>
                  <div
                    className={`size-7 rounded-full flex items-center justify-center transition ${
                      done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    } ${active ? "ring-4 ring-primary/20 animate-soft-pulse" : ""}`}
                  >
                    {done ? <CheckCircle2 size={14} /> : <span className="text-[10px]">{idx + 1}</span>}
                  </div>
                  <p className={`text-sm ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Receipt */}
        <div ref={receiptRef} className="bg-card rounded-2xl border border-border/60 p-5 print-receipt">
          <div className="text-center border-b border-dashed border-border pb-3 mb-3">
            <p className="font-heading text-xl">SWM Cafe</p>
            <p className="text-xs text-muted-foreground">Struk Digital</p>
          </div>
          <div className="text-xs space-y-0.5">
            <Row k="No. Pesanan" v={`#${order.order_number}`} />
            <Row k="Meja" v={order.table_number} />
            <Row k="Tanggal" v={new Date(order.created_at).toLocaleString("id-ID")} />
            <Row k="Metode" v={methodLabel(order.payment_method)} />
          </div>
          <div className="border-t border-dashed border-border my-3" />
          <div className="space-y-2">
            {order.items.map((i, idx) => (
              <div key={idx} className="text-xs">
                <div className="flex justify-between">
                  <span className="flex-1">
                    {i.qty}× {i.name}
                  </span>
                  <span>{formatRupiah(i.price * i.qty)}</span>
                </div>
                {i.note && <p className="text-muted-foreground italic pl-3">— {i.note}</p>}
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-border my-3" />
          <div className="text-xs space-y-0.5">
            <Row k="Subtotal" v={formatRupiah(order.subtotal)} />
            <Row k="Pajak" v={formatRupiah(order.tax)} />
            <div className="flex justify-between font-heading text-base text-primary pt-1">
              <span>TOTAL</span>
              <span>{formatRupiah(order.total)}</span>
            </div>
            {order.cash_received != null && (
              <>
                <Row k="Tunai" v={formatRupiah(order.cash_received)} />
                <Row k="Kembalian" v={formatRupiah(order.cash_change || 0)} />
              </>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">Terima kasih telah memesan ☕</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => window.open(`/print/${orderId}`, "_blank")} data-testid="print-receipt">
            <Printer size={14} className="mr-1" /> Cetak
          </Button>
          <Button onClick={() => navigate("/")} data-testid="back-home">
            <Home size={14} className="mr-1" /> Beranda
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, highlight }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={highlight ? "font-heading text-primary text-base" : "font-medium"}>{v}</span>
    </div>
  );
}

function Wallet() {
  return (
    <div className="size-10 mx-auto mb-2 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
      <Clock className="text-amber-700 dark:text-amber-300" size={18} />
    </div>
  );
}

function methodLabel(m) {
  return { tunai: "Tunai", qris: "QRIS", transfer: "Mobile Banking" }[m] || m;
}
