import { useEffect, useState } from "react";
import api, { formatRupiah } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const STATUS_LABEL = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  pembayaran_diterima: "Pembayaran Diterima",
  diproses: "Diproses",
  dimasak: "Dimasak",
  siap_diantar: "Siap Diantar",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export default function KasirHistory() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ paid: 0, total: 0, count: 0 });

  const load = () => {
    api.get("/orders", { params: {} }).then((r) => {
      const filtered = r.data.filter((o) => o.created_at.startsWith(date));
      setOrders(filtered);
      const paid = filtered.filter((o) => o.payment_status === "paid");
      setSummary({
        paid: paid.reduce((s, o) => s + o.total, 0),
        total: filtered.length,
        count: paid.length,
      });
    });
  };
  useEffect(() => { load(); }, [date]); // eslint-disable-line

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Riwayat</p>
          <h1 className="font-heading text-4xl mt-1">Riwayat Transaksi</h1>
        </div>
        <div className="flex gap-2 items-end">
          <div><Label>Tanggal</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="history-date" /></div>
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total Transaksi" value={summary.total} />
        <Stat label="Dibayar Lunas" value={summary.count} />
        <Stat label="Pendapatan" value={formatRupiah(summary.paid)} accent />
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-left">
              <Th>No. Pesanan</Th><Th>Meja</Th><Th>Total</Th><Th>Metode</Th><Th>Status</Th><Th>Waktu</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border/60">
                <td className="p-3 font-mono text-xs">#{o.order_number}</td>
                <td className="p-3">{o.table_number}</td>
                <td className="p-3 font-medium">{formatRupiah(o.total)}</td>
                <td className="p-3 capitalize">{o.payment_method}</td>
                <td className="p-3">{STATUS_LABEL[o.status]}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleTimeString("id-ID")}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Tidak ada transaksi pada tanggal ini</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60"}`}>
      <p className={`text-[11px] tracking-[0.12em] uppercase ${accent ? "opacity-80" : "text-muted-foreground"} font-semibold`}>{label}</p>
      <p className="font-heading text-2xl lg:text-3xl mt-2 leading-none">{value}</p>
    </div>
  );
}
function Th({ children }) { return <th className="p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">{children}</th>; }
