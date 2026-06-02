import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import api, { formatRupiah, API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const PIE_COLORS = ["#C05A3B", "#A0522D", "#D2A24C"];

export default function AdminReports() {
  const [tab, setTab] = useState("daily");
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
  const [dateFrom, setDateFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(today);
  const [year, setYear] = useState(new Date().getFullYear());
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [yearly, setYearly] = useState(null);
  const [byMethod, setByMethod] = useState(null);

  const loadDaily = () => api.get("/reports/daily", {
    params: { date_from: `${dateFrom}T00:00:00+00:00`, date_to: `${dateTo}T23:59:59+00:00` },
  }).then((r) => setDaily(r.data));

  const loadMonthly = () => api.get("/reports/monthly", { params: { year } }).then((r) => setMonthly(r.data));
  const loadYearly = () => api.get("/reports/yearly").then((r) => setYearly(r.data));

  useEffect(() => {
    loadDaily(); loadMonthly(); loadYearly();
    api.get("/reports/by-method").then((r) => setByMethod(r.data));
    // eslint-disable-next-line
  }, []);

  const exportXlsx = async (period) => {
    const token = localStorage.getItem("swm_token");
    let url = `${API_BASE}/reports/export?period=${period}`;
    if (period === "daily") url += `&date_from=${dateFrom}T00:00:00%2B00:00&date_to=${dateTo}T23:59:59%2B00:00`;
    if (period === "monthly") url += `&year=${year}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `laporan_${period}.xlsx`;
    a.click();
  };

  const methodChart = byMethod
    ? [
        { name: "Tunai", value: byMethod.revenue.tunai },
        { name: "QRIS", value: byMethod.revenue.qris },
        { name: "Transfer", value: byMethod.revenue.transfer },
      ].filter((x) => x.value > 0)
    : [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Laporan</p>
        <h1 className="font-heading text-4xl mt-1">Laporan Pendapatan</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="daily" data-testid="tab-daily">Harian</TabsTrigger>
          <TabsTrigger value="monthly" data-testid="tab-monthly">Bulanan</TabsTrigger>
          <TabsTrigger value="yearly" data-testid="tab-yearly">Tahunan</TabsTrigger>
          <TabsTrigger value="method" data-testid="tab-method">Per Metode</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div><Label>Dari</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="date-from" /></div>
            <div><Label>Sampai</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="date-to" /></div>
            <Button onClick={loadDaily} data-testid="apply-daily">Tampilkan</Button>
            <Button variant="outline" onClick={() => exportXlsx("daily")} data-testid="export-daily">
              <Download size={14} className="mr-1" /> Export Excel
            </Button>
          </div>
          <SummaryCard total={daily?.total_revenue || 0} />
          <ChartCard data={daily?.rows || []} xKey="date" />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <div className="flex gap-3 items-end">
            <div><Label>Tahun</Label><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-32" data-testid="year-input" /></div>
            <Button onClick={loadMonthly} data-testid="apply-monthly">Tampilkan</Button>
            <Button variant="outline" onClick={() => exportXlsx("monthly")} data-testid="export-monthly">
              <Download size={14} className="mr-1" /> Export Excel
            </Button>
          </div>
          <SummaryCard total={monthly?.total_revenue || 0} />
          <ChartCard data={monthly?.rows || []} xKey="month" />
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4">
          <Button variant="outline" onClick={() => exportXlsx("yearly")} data-testid="export-yearly">
            <Download size={14} className="mr-1" /> Export Excel
          </Button>
          <SummaryCard total={yearly?.total_revenue || 0} />
          <ChartCard data={yearly?.rows || []} xKey="year" />
        </TabsContent>

        <TabsContent value="method">
          <div className="bg-card rounded-2xl border border-border/60 p-5">
            <h2 className="font-heading text-2xl">Pendapatan per Metode Pembayaran</h2>
            <div className="h-72 mt-4">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={methodChart} dataKey="value" nameKey="name" outerRadius={100} label={(d) => formatRupiah(d.value)}>
                    {methodChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatRupiah(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ total }) {
  return (
    <div className="bg-primary text-primary-foreground rounded-2xl p-5">
      <p className="text-xs tracking-[0.2em] uppercase opacity-80 font-semibold">Total Pendapatan</p>
      <p className="font-heading text-4xl mt-1" data-testid="report-total">{formatRupiah(total)}</p>
    </div>
  );
}

function ChartCard({ data, xKey }) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5">
      <div className="h-72">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(34 25% 88%)" />
            <XAxis dataKey={xKey} fontSize={11} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} fontSize={11} />
            <Tooltip formatter={(v) => formatRupiah(v)} />
            <Bar dataKey="revenue" fill="hsl(14 53% 49%)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="w-full mt-4 text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="text-left p-2">{xKey}</th><th className="text-right p-2">Transaksi</th><th className="text-right p-2">Pendapatan</th></tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-t border-border/40">
              <td className="p-2">{r[xKey]}</td>
              <td className="p-2 text-right">{r.transactions}</td>
              <td className="p-2 text-right font-medium">{formatRupiah(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
