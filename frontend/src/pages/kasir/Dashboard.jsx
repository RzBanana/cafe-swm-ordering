import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Clock, CheckCircle2, ScrollText } from "lucide-react";
import api, { formatRupiah } from "@/lib/api";
import { useWebSocket } from "@/lib/useEventStream";
import { notifyNewOrder } from "@/lib/notifications";

export default function KasirDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);

  const load = () => {
    api.get("/reports/summary").then((r) => setStats(r.data));
    api.get("/orders", { params: { today: true } }).then((r) => setOrders(r.data.slice(0, 5)));
  };
  useEffect(() => { load(); }, []);

  // Auto-refresh on any order event + alert on new orders
  useWebSocket("/api/events/staff", (msg) => {
    load();
    if (msg?.event === "order_created" && msg.order) {
      notifyNewOrder(msg.order, () => (window.location.href = "/kasir/orders"));
    }
  });

  if (!stats) return <p className="text-muted-foreground">Memuat...</p>;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Kasir</p>
        <h1 className="font-heading text-4xl mt-1">Dashboard Kasir</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Pesanan Baru" value={stats.new_orders} Icon={ScrollText} testId="kpi-new" />
        <Kpi label="Diproses" value={stats.processing_orders} Icon={Clock} testId="kpi-proc" />
        <Kpi label="Selesai" value={stats.done_orders} Icon={CheckCircle2} testId="kpi-done" />
        <Kpi label="Pendapatan Hari Ini" value={formatRupiah(stats.today_revenue)} Icon={TrendingUp} accent testId="kpi-rev" />
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-5">
        <div className="flex justify-between items-baseline mb-3">
          <h2 className="font-heading text-2xl">Pesanan Terbaru</h2>
          <Link to="/kasir/orders" className="text-sm text-primary hover:underline">Lihat semua →</Link>
        </div>
        <div className="space-y-2">
          {orders.map((o) => (
            <Link key={o.id} to="/kasir/orders" className="flex justify-between items-center p-3 rounded-lg hover:bg-secondary/40 transition" data-testid={`recent-${o.order_number}`}>
              <div>
                <p className="font-medium">#{o.order_number} · Meja {o.table_number}</p>
                <p className="text-xs text-muted-foreground">{o.items.length} item · {new Date(o.created_at).toLocaleTimeString("id-ID")}</p>
              </div>
              <p className="font-heading text-lg text-primary">{formatRupiah(o.total)}</p>
            </Link>
          ))}
          {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada pesanan hari ini</p>}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, Icon, accent, testId }) {
  return (
    <div data-testid={testId} className={`rounded-2xl p-4 border ${accent ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60"}`}>
      <div className="flex items-center justify-between">
        <p className={`text-[11px] tracking-[0.12em] uppercase ${accent ? "opacity-80" : "text-muted-foreground"} font-semibold`}>{label}</p>
        <Icon size={16} className={accent ? "opacity-80" : "text-muted-foreground"} />
      </div>
      <p className="font-heading text-2xl lg:text-3xl mt-2 leading-none">{value}</p>
    </div>
  );
}
