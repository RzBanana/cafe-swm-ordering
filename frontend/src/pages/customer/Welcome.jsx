import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Coffee, ArrowRight, History as HistoryIcon } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Welcome() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { tableNumber, setTableNumber } = useCart();
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(tableNumber || "");

  useEffect(() => {
    api.get("/tables").then((r) => setTables(r.data)).catch(() => {});
    const fromQr = params.get("meja") || params.get("table");
    if (fromQr) {
      setTableNumber(fromQr);
      setSelected(fromQr);
    }
  }, [params, setTableNumber]);

  const start = () => {
    if (!selected) return;
    setTableNumber(selected);
    navigate("/menu");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background grain">
      {/* Hero */}
      <div className="relative h-[55vh] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/9409791/pexels-photo-9409791.jpeg"
          alt="SWM Cafe Interior"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-background" />
        <div className="relative z-10 max-w-md mx-auto px-6 pt-16">
          <div className="flex items-center gap-2 text-primary-foreground/90 mb-3">
            <Coffee size={22} className="text-amber-200" />
            <span className="text-xs tracking-[0.2em] uppercase font-semibold">SWM Cafe</span>
          </div>
          <h1 className="font-heading text-5xl sm:text-6xl text-white leading-[1.05] tracking-tight">
            Selamat
            <br />
            <span className="italic font-normal">datang.</span>
          </h1>
          <p className="mt-4 text-white/80 text-base max-w-sm leading-relaxed">
            Pesan favoritmu langsung dari meja. Cukup pilih nomor meja dan mulai memesan.
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="-mt-14 z-20 max-w-md mx-auto w-full px-6 pb-10">
        <div className="bg-card rounded-2xl border border-border/60 shadow-xl p-6 space-y-5">
          <div>
            <label className="text-xs tracking-[0.15em] uppercase font-semibold text-muted-foreground">
              Nomor Meja
            </label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="mt-2 h-12 text-base" data-testid="table-select">
                <SelectValue placeholder="Pilih nomor meja" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.number} data-testid={`table-option-${t.number}`}>
                    Meja {t.number} ({t.seats} kursi)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            data-testid="start-order-button"
            disabled={!selected}
            onClick={start}
            className="w-full h-12 text-base shadow-md group"
          >
            Mulai Pesan
            <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <button
            data-testid="history-button"
            onClick={() => navigate("/history")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mx-auto transition-colors"
          >
            <HistoryIcon size={14} /> Lihat riwayat pesanan
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Atau scan QR Code di meja untuk akses cepat
        </p>
      </div>

      {/* Staff footer link */}
      <div className="mt-auto py-6 text-center">
        <a
          href="/login"
          data-testid="staff-login-link"
          className="text-xs text-muted-foreground hover:text-primary tracking-wider uppercase"
        >
          Login Staff
        </a>
      </div>
    </div>
  );
}
