import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Receipt } from "lucide-react";
import api, { formatRupiah } from "@/lib/api";

const STATUS_LABEL = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  pembayaran_diterima: "Pembayaran Diterima",
  diproses: "Diproses",
  dimasak: "Dimasak",
  siap_diantar: "Siap Diantar",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export default function History() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem("swm_history") || "[]");
    Promise.all(
      ids.map((id) =>
        api
          .get(`/orders/${id}`)
          .then((r) => r.data)
          .catch(() => null)
      )
    ).then((list) => {
      setOrders(list.filter(Boolean));
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button
            data-testid="history-back"
            onClick={() => navigate("/")}
            className="size-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground">Riwayat</p>
            <p className="font-heading text-xl leading-none">Pesanan Saya</p>
          </div>
        </div>
      </div>
      <div className="max-w-md mx-auto px-5 pt-5 space-y-3">
        {loading && <p className="text-center text-muted-foreground py-10">Memuat...</p>}
        {!loading && orders.length === 0 && (
          <div className="text-center py-20" data-testid="empty-history">
            <Receipt size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Belum ada riwayat pesanan.</p>
          </div>
        )}
        {orders.map((o) => (
          <Link
            key={o.id}
            to={`/track/${o.id}`}
            data-testid={`history-card-${o.id}`}
            className="block bg-card rounded-xl border border-border/60 p-4 hover:shadow transition"
          >
            <div className="flex justify-between">
              <p className="font-heading text-base">#{o.order_number}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                {STATUS_LABEL[o.status] || o.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Meja {o.table_number} · {new Date(o.created_at).toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {o.items.length} item · {o.items.map((i) => `${i.qty}× ${i.name}`).slice(0, 2).join(", ")}
              {o.items.length > 2 ? "..." : ""}
            </p>
            <p className="font-heading text-primary text-lg mt-2">{formatRupiah(o.total)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
