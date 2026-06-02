import { useEffect, useState } from "react";
import { Package, TableProperties, Users, ScrollText, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import api, { formatRupiah } from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [daily, setDaily] = useState([]);

  useEffect(() => {
    api.get("/reports/summary").then((r) => setStats(r.data));
    // last 14 days
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 13);
    api
      .get("/reports/daily", {
        params: { date_from: from.toISOString(), date_to: to.toISOString() },
      })
      .then((r) => setDaily(r.data.rows));
  }, []);

  if (!stats) return <p className="text-muted-foreground">Memuat...</p>;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Overview</p>
        <h1 className="font-heading text-4xl mt-1">Dashboard Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">Ringkasan operasional Cafe SWM hari ini.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Kpi
          testId="kpi-revenue"
          label="Pendapatan Hari Ini"
          value={formatRupiah(stats.today_revenue)}
          accent
          Icon={TrendingUp}
        />
        <Kpi testId="kpi-orders" label="Total Pesanan" value={stats.total_orders} Icon={ScrollText} />
        <Kpi testId="kpi-products" label="Total Produk" value={stats.total_products} Icon={Package} />
        <Kpi testId="kpi-tables" label="Total Meja" value={stats.total_tables} Icon={TableProperties} />
        <Kpi testId="kpi-employees" label="Total Pegawai" value={stats.total_employees} Icon={Users} />
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl border border-border/60 p-5">
        <div className="flex justify-between items-baseline mb-4">
          <div>
            <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-semibold">
              Grafik Pendapatan
            </p>
            <h2 className="font-heading text-2xl mt-1">14 Hari Terakhir</h2>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(14 53% 49%)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(14 53% 49%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(34 25% 88%)" />
              <XAxis dataKey="date" tickFormatter={(d) => d?.slice(5)} fontSize={11} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} fontSize={11} />
              <Tooltip
                formatter={(v) => formatRupiah(v)}
                contentStyle={{
                  background: "hsl(38 28% 97%)",
                  border: "1px solid hsl(34 25% 82%)",
                  borderRadius: 8,
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(14 53% 49%)" fill="url(#g1)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniCard label="Pesanan Baru" value={stats.new_orders} color="bg-amber-100 text-amber-700" />
        <MiniCard label="Sedang Diproses" value={stats.processing_orders} color="bg-blue-100 text-blue-700" />
        <MiniCard label="Selesai Hari Ini" value={stats.done_orders} color="bg-emerald-100 text-emerald-700" />
      </div>
    </div>
  );
}

function Kpi({ label, value, Icon, accent, testId }) {
  return (
    <div
      data-testid={testId}
      className={`rounded-2xl p-4 border ${
        accent ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-[11px] tracking-[0.12em] uppercase ${accent ? "opacity-80" : "text-muted-foreground"} font-semibold`}>
          {label}
        </p>
        <Icon size={16} className={accent ? "opacity-80" : "text-muted-foreground"} />
      </div>
      <p className="font-heading text-2xl lg:text-3xl mt-2 leading-none">{value}</p>
    </div>
  );
}

function MiniCard({ label, value, color }) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-4">
      <div className={`size-12 rounded-xl flex items-center justify-center font-heading text-xl ${color}`}>
        {value}
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}
