import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingBag, ChevronLeft, Search } from "lucide-react";
import api from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export default function Menu() {
  const navigate = useNavigate();
  const { tableNumber, addItem, count } = useCart();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!tableNumber) navigate("/");
    Promise.all([api.get("/categories"), api.get("/products")]).then(([c, p]) => {
      setCategories(c.data);
      setProducts(p.data);
    });
  }, [tableNumber, navigate]);

  const filtered = products.filter((p) => {
    if (activeCat !== "all" && p.category_id !== activeCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openProduct = (p) => {
    if (p.status === "sold_out") return;
    setSelected(p);
    setQty(1);
    setNote("");
  };

  const confirmAdd = () => {
    addItem(selected, qty, note);
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button
            data-testid="back-to-welcome"
            onClick={() => navigate("/")}
            className="size-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/70 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground">SWM Cafe</p>
            <p className="font-heading text-lg leading-none" data-testid="header-table-number">
              Meja {tableNumber}
            </p>
          </div>
        </div>
        <div className="max-w-md mx-auto px-5 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="menu-search"
              placeholder="Cari menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-secondary/40"
            />
          </div>
        </div>
        {/* Category pills */}
        <div className="max-w-md mx-auto px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <CatPill active={activeCat === "all"} onClick={() => setActiveCat("all")} testId="cat-all">
            Semua
          </CatPill>
          {categories.map((c) => (
            <CatPill
              key={c.id}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
              testId={`cat-${c.name.toLowerCase()}`}
            >
              <span className="mr-1">{c.icon}</span>
              {c.name}
            </CatPill>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-md mx-auto px-5 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p, idx) => (
            <button
              key={p.id}
              data-testid={`product-card-${p.id}`}
              onClick={() => openProduct(p)}
              className="text-left rounded-xl overflow-hidden bg-card border border-border/60 hover:shadow-md transition fade-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="aspect-square relative overflow-hidden bg-secondary">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                {p.status === "sold_out" && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-white text-xs tracking-[0.2em] uppercase font-bold border border-white px-3 py-1">
                      Sold Out
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.4em]">{p.name}</h3>
                <p className="font-heading text-primary text-lg mt-1">{formatRupiah(p.price)}</p>
              </div>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">Tidak ada menu ditemukan.</p>
        )}
      </div>

      {/* Sticky cart bar */}
      {count > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30">
          <div className="max-w-md mx-auto px-5 pb-5">
            <Button
              data-testid="go-to-cart-button"
              onClick={() => navigate("/cart")}
              className="w-full h-14 text-base shadow-2xl flex items-center justify-between px-5"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag size={18} />
                <Badge variant="secondary" className="px-2 py-0.5">
                  {count}
                </Badge>
                <span>Lihat Keranjang</span>
              </span>
              <span>→</span>
            </Button>
          </div>
        </div>
      )}

      {/* Product Drawer */}
      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent className="max-w-md mx-auto">
          {selected && (
            <>
              <div className="aspect-[5/3] overflow-hidden">
                <img src={selected.image} alt={selected.name} className="w-full h-full object-cover" />
              </div>
              <DrawerHeader className="text-left pb-2">
                <DrawerTitle className="font-heading text-2xl">{selected.name}</DrawerTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
                <p className="font-heading text-2xl text-primary mt-1">{formatRupiah(selected.price)}</p>
              </DrawerHeader>
              <div className="px-5 pb-5 space-y-4">
                <div>
                  <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-semibold">
                    Catatan Pesanan
                  </label>
                  <Textarea
                    data-testid="product-note"
                    placeholder="Contoh: Pedas Level 3, Tanpa Bawang..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Jumlah</p>
                  <div className="flex items-center gap-3">
                    <button
                      data-testid="qty-dec"
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="size-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center font-semibold">{qty}</span>
                    <button
                      data-testid="qty-inc"
                      onClick={() => setQty(qty + 1)}
                      className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <Button
                  data-testid="add-to-cart-button"
                  onClick={confirmAdd}
                  className="w-full h-12"
                >
                  Tambah ke Keranjang · {formatRupiah(selected.price * qty)}
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function CatPill({ active, children, onClick, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`shrink-0 px-4 h-9 rounded-full text-sm font-medium transition border ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow"
          : "bg-card text-foreground border-border hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}
