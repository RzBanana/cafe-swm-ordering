import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Printer, Wallet, Check, Bell } from "lucide-react";
import api, { formatRupiah, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWebSocket } from "@/lib/useEventStream";
import { notifyNewOrder } from "@/lib/notifications";

const STATUS_OPTIONS = [
  { v: "menunggu_pembayaran", l: "Menunggu Pembayaran" },
  { v: "pembayaran_diterima", l: "Pembayaran Diterima" },
  { v: "diproses", l: "Diproses" },
  { v: "dimasak", l: "Dimasak" },
  { v: "siap_diantar", l: "Siap Diantar" },
  { v: "selesai", l: "Selesai" },
];

const ESTIMASI = [10, 15, 20, 30];

export default function KasirOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [estimasi, setEstimasi] = useState("");
  const [cashDialog, setCashDialog] = useState(false);
  const [cashReceived, setCashReceived] = useState("");

  const load = () => api.get("/orders", { params: { today: true } }).then((r) => setOrders(r.data));
  useEffect(() => { load(); }, []);

  // Live update: refresh list on any order event, with a toast + sound + desktop notif for new orders
  useWebSocket("/api/events/staff", (msg) => {
    load();
    if (msg?.event === "order_created" && msg.order) {
      toast.success(`🔔 Pesanan baru #${msg.order.order_number} dari Meja ${msg.order.table_number}`, {
        duration: 6000,
      });
      notifyNewOrder(msg.order, () => {
        navigate("/kasir/orders");
        select(msg.order);
      });
    }
    if (msg?.event === "order_updated" && msg.order) {
      setSelected((s) => (s && s.id === msg.order.id ? msg.order : s));
    }
  });

  const select = (o) => { setSelected(o); setStatusDraft(o.status); setEstimasi(o.estimasi_menit || ""); };

  const updateStatus = async () => {
    try {
      await api.patch(`/orders/${selected.id}/status`, {
        status: statusDraft,
        estimasi_menit: estimasi ? Number(estimasi) : null,
      });
      toast.success("Status diperbarui");
      load();
      setSelected(null);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const confirmCash = async () => {
    try {
      const { data } = await api.post(`/orders/${selected.id}/cash-pay`, { received: Number(cashReceived) });
      toast.success(`Pembayaran konfirm! Kembalian: ${formatRupiah(data.change)}`);
      setCashDialog(false);
      setCashReceived("");
      load();
      setSelected(null);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const change = cashReceived && selected ? Number(cashReceived) - selected.total : 0;

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-4 max-w-7xl">
      {/* List */}
      <div>
        <h1 className="font-heading text-3xl mb-4">Pesanan Hari Ini</h1>
        <div className="space-y-2">
          {orders.map((o) => (
            <button
              key={o.id}
              data-testid={`kasir-order-${o.order_number}`}
              onClick={() => select(o)}
              className={`w-full text-left p-4 rounded-xl border transition ${
                selected?.id === o.id ? "border-primary bg-primary/5" : "border-border/60 bg-card hover:bg-secondary/30"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">#{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">Meja {o.table_number} · {new Date(o.created_at).toLocaleTimeString("id-ID")}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${badgeCls(o.status)}`}>{statusLabel(o.status)}</span>
              </div>
              <div className="flex justify-between items-baseline mt-2">
                <p className="text-xs text-muted-foreground">{o.items.length} item · {o.payment_method}</p>
                <p className="font-heading text-lg text-primary">{formatRupiah(o.total)}</p>
              </div>
            </button>
          ))}
          {orders.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">Belum ada pesanan hari ini</p>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="bg-card rounded-2xl border border-border/60 p-5 sticky top-24 h-fit">
        {selected ? (
          <>
            <p className="text-xs tracking-wider uppercase text-muted-foreground">Detail Pesanan</p>
            <p className="font-heading text-2xl mt-1">#{selected.order_number}</p>
            <p className="text-sm text-muted-foreground">Meja {selected.table_number}</p>

            <div className="mt-4 space-y-1 text-sm max-h-60 overflow-y-auto">
              {selected.items.map((i, idx) => (
                <div key={idx} className="border-b border-border/40 pb-1">
                  <div className="flex justify-between">
                    <span>{i.qty}× {i.name}</span>
                    <span>{formatRupiah(i.price * i.qty)}</span>
                  </div>
                  {i.note && <p className="text-xs text-muted-foreground italic">— {i.note}</p>}
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <Row k="Subtotal" v={formatRupiah(selected.subtotal)} />
              <Row k="Pajak" v={formatRupiah(selected.tax)} />
              <Row k="Total" v={formatRupiah(selected.total)} bold />
              <Row k="Metode" v={selected.payment_method.toUpperCase()} />
              <Row k="Status Bayar" v={selected.payment_status === "paid" ? "Lunas" : "Belum"} />
              {selected.cash_received != null && (
                <>
                  <Row k="Tunai" v={formatRupiah(selected.cash_received)} />
                  <Row k="Kembalian" v={formatRupiah(selected.cash_change || 0)} />
                </>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {selected.payment_method === "tunai" && selected.payment_status === "pending" && (
                <Button onClick={() => setCashDialog(true)} className="w-full" data-testid="confirm-cash-button">
                  <Wallet size={14} className="mr-1" /> Konfirmasi Tunai
                </Button>
              )}
              <div>
                <Label>Update Status</Label>
                <Select value={statusDraft} onValueChange={setStatusDraft}>
                  <SelectTrigger data-testid="kasir-status-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimasi Waktu (menit)</Label>
                <div className="flex gap-2 mt-1">
                  {ESTIMASI.map((m) => (
                    <button key={m} onClick={() => setEstimasi(m)} className={`flex-1 h-9 rounded-md border text-sm ${estimasi == m ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={updateStatus} className="w-full" data-testid="kasir-update-status">
                <Check size={14} className="mr-1" /> Update Status
              </Button>
              <Button variant="outline" onClick={() => window.open(`/print/${selected.id}`, "_blank")} className="w-full" data-testid="kasir-print">
                <Printer size={14} className="mr-1" /> Cetak Struk Thermal
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-12">Pilih pesanan untuk melihat detail</p>
        )}
      </div>

      {/* Cash modal */}
      <Dialog open={cashDialog} onOpenChange={setCashDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-heading">Pembayaran Tunai</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-xs uppercase text-muted-foreground">Total Tagihan</p>
              <p className="font-heading text-3xl text-primary">{formatRupiah(selected?.total || 0)}</p>
            </div>
            <div>
              <Label>Uang Diterima</Label>
              <Input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} placeholder="100000" autoFocus data-testid="cash-received-input" />
            </div>
            <div className="bg-primary/5 rounded-lg p-3 text-center">
              <p className="text-xs uppercase text-muted-foreground">Kembalian</p>
              <p className={`font-heading text-3xl ${change < 0 ? "text-destructive" : "text-emerald-700"}`} data-testid="change-display">
                {formatRupiah(change > 0 ? change : 0)}
              </p>
              {change < 0 && <p className="text-xs text-destructive mt-1">Uang kurang {formatRupiah(-change)}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashDialog(false)}>Batal</Button>
            <Button onClick={confirmCash} disabled={change < 0 || !cashReceived} data-testid="cash-confirm-final">Konfirmasi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function statusLabel(s) { return STATUS_OPTIONS.find((o) => o.v === s)?.l || s; }
function badgeCls(s) {
  return {
    menunggu_pembayaran: "bg-amber-100 text-amber-800",
    pembayaran_diterima: "bg-blue-100 text-blue-800",
    diproses: "bg-indigo-100 text-indigo-800",
    dimasak: "bg-purple-100 text-purple-800",
    siap_diantar: "bg-emerald-100 text-emerald-800",
    selesai: "bg-green-100 text-green-800",
  }[s] || "bg-secondary text-foreground";
}
function Row({ k, v, bold }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className={bold ? "font-heading text-primary text-base" : "font-medium"}>{v}</span></div>;
}
