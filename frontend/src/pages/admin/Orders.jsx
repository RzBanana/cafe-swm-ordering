import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import api, { formatRupiah, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  { v: "dibatalkan", l: "Dibatalkan" },
];

const STATUS_COLOR = {
  menunggu_pembayaran: "bg-amber-100 text-amber-800",
  pembayaran_diterima: "bg-blue-100 text-blue-800",
  diproses: "bg-indigo-100 text-indigo-800",
  dimasak: "bg-purple-100 text-purple-800",
  siap_diantar: "bg-emerald-100 text-emerald-800",
  selesai: "bg-green-100 text-green-800",
  dibatalkan: "bg-red-100 text-red-800",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [estimasi, setEstimasi] = useState("");

  const load = () => {
    const params = filter === "all" ? {} : { status: filter };
    api.get("/orders", { params }).then((r) => setOrders(r.data));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filter]);

  // Real-time updates with sound + desktop notif for new orders
  useWebSocket("/api/events/staff", (msg) => {
    load();
    if (msg?.event === "order_created" && msg.order) {
      notifyNewOrder(msg.order, () => {
        setDetail(msg.order);
        setStatusDraft(msg.order.status);
      });
    }
  });

  const updateStatus = async (oid) => {
    try {
      await api.patch(`/orders/${oid}/status`, {
        status: statusDraft,
        estimasi_menit: estimasi ? Number(estimasi) : null,
      });
      toast.success("Status diperbarui");
      setDetail(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const cancel = async (oid) => {
    if (!window.confirm("Batalkan pesanan ini?")) return;
    await api.delete(`/orders/${oid}`);
    toast.success("Pesanan dibatalkan");
    setDetail(null);
    load();
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Pesanan</p>
          <h1 className="font-heading text-4xl mt-1">Kelola Pesanan</h1>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56" data-testid="filter-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-left">
              <Th>No. Pesanan</Th><Th>Meja</Th><Th>Total</Th><Th>Metode</Th><Th>Status</Th><Th>Waktu</Th><Th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border/60" data-testid={`order-row-${o.order_number}`}>
                <td className="p-3 font-mono text-xs">#{o.order_number}</td>
                <td className="p-3">{o.table_number}</td>
                <td className="p-3 font-medium">{formatRupiah(o.total)}</td>
                <td className="p-3 capitalize">{o.payment_method}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[o.status] || ""}`}>{statusLabel(o.status)}</span></td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setDetail(o); setStatusDraft(o.status); setEstimasi(o.estimasi_menit || ""); }} data-testid={`view-order-${o.order_number}`}>
                    <Eye size={14} />
                  </Button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">Belum ada pesanan</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">Pesanan #{detail.order_number}</DialogTitle>
                <p className="text-sm text-muted-foreground">Meja {detail.table_number} · {new Date(detail.created_at).toLocaleString("id-ID")}</p>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1 text-sm">
                  {detail.items.map((i, idx) => (
                    <div key={idx} className="border-b border-border/40 pb-1">
                      <div className="flex justify-between">
                        <span>{i.qty}× {i.name}</span>
                        <span className="font-medium">{formatRupiah(i.price * i.qty)}</span>
                      </div>
                      {i.note && <p className="text-xs text-muted-foreground italic">— {i.note}</p>}
                    </div>
                  ))}
                </div>
                <div className="bg-secondary/40 rounded-lg p-3 text-sm space-y-1">
                  <Row k="Subtotal" v={formatRupiah(detail.subtotal)} />
                  <Row k="Pajak" v={formatRupiah(detail.tax)} />
                  <Row k="Total" v={formatRupiah(detail.total)} bold />
                  <Row k="Metode" v={statusLabel(detail.payment_method)} />
                  <Row k="Status Bayar" v={detail.payment_status === "paid" ? "Lunas" : "Belum"} />
                </div>
                <div>
                  <Label>Update Status</Label>
                  <Select value={statusDraft} onValueChange={setStatusDraft}>
                    <SelectTrigger data-testid="status-draft"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimasi Waktu (menit)</Label>
                  <Input type="number" value={estimasi} onChange={(e) => setEstimasi(e.target.value)} placeholder="15" data-testid="estimasi-input" />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => cancel(detail.id)} className="text-destructive">
                  <X size={14} className="mr-1" /> Batalkan
                </Button>
                <Button onClick={() => updateStatus(detail.id)} data-testid="update-status-button">Simpan</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function statusLabel(s) { return STATUS_OPTIONS.find((o) => o.v === s)?.l || s; }
function Th({ children, className = "" }) { return <th className={`p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold ${className}`}>{children}</th>; }
function Row({ k, v, bold }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className={bold ? "font-heading text-primary" : "font-medium"}>{v}</span></div>;
}
