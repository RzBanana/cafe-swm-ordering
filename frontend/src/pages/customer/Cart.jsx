import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Minus, Plus, Trash2, Edit2, Wallet, QrCode, CreditCard } from "lucide-react";
import api, { formatRupiah, formatApiError } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const METHODS = [
  { id: "tunai", label: "Tunai", desc: "Bayar di kasir", Icon: Wallet },
  { id: "qris", label: "QRIS", desc: "Scan QR Code", Icon: QrCode },
  { id: "transfer", label: "Mobile Banking", desc: "Transfer bank", Icon: CreditCard },
];

export default function Cart() {
  const navigate = useNavigate();
  const { items, tableNumber, updateQty, removeItem, updateNote, subtotal, tax, total, clear } = useCart();
  const [method, setMethod] = useState("tunai");
  const [editNote, setEditNote] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const checkout = async () => {
    if (!items.length) return;
    setLoading(true);
    try {
      const { data } = await api.post("/orders", {
        table_number: tableNumber,
        items: items.map((i) => ({
          product_id: i.product_id,
          name: i.name,
          price: i.price,
          qty: i.qty,
          note: i.note,
        })),
        payment_method: method,
      });
      // Save to local history
      const histRaw = localStorage.getItem("swm_history") || "[]";
      const hist = JSON.parse(histRaw);
      hist.unshift(data.id);
      localStorage.setItem("swm_history", JSON.stringify(hist.slice(0, 50)));
      clear();
      toast.success("Pesanan berhasil dibuat!");
      navigate(`/track/${data.id}`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  if (!tableNumber) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button
            data-testid="back-from-cart"
            onClick={() => navigate("/menu")}
            className="size-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/70 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground">Keranjang</p>
            <p className="font-heading text-xl leading-none">Meja {tableNumber}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-5 space-y-3">
        {items.length === 0 && (
          <div className="text-center py-20" data-testid="empty-cart">
            <p className="text-muted-foreground">Keranjang kosong.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/menu")}>
              Lihat Menu
            </Button>
          </div>
        )}

        {items.map((it, idx) => (
          <div
            key={`${it.product_id}-${idx}`}
            className="bg-card rounded-xl border border-border/60 p-3 flex gap-3"
            data-testid={`cart-item-${it.product_id}`}
          >
            <img src={it.image} alt={it.name} className="size-20 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm leading-tight line-clamp-2">{it.name}</h3>
                <button
                  data-testid={`remove-item-${it.product_id}`}
                  onClick={() => removeItem(it.product_id, it.note)}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-primary font-heading text-base mt-0.5">{formatRupiah(it.price)}</p>
              {it.note && (
                <div className="text-xs text-muted-foreground mt-1 italic line-clamp-2 flex items-start gap-1">
                  <span>{it.note}</span>
                  <button
                    data-testid={`edit-note-${it.product_id}`}
                    onClick={() => {
                      setEditNote({ pid: it.product_id, old: it.note });
                      setNoteDraft(it.note);
                    }}
                    className="text-primary hover:underline ml-1"
                  >
                    <Edit2 size={11} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  data-testid={`dec-${it.product_id}`}
                  onClick={() => updateQty(it.product_id, it.note, it.qty - 1)}
                  className="size-7 rounded-full border border-border flex items-center justify-center"
                >
                  <Minus size={12} />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{it.qty}</span>
                <button
                  data-testid={`inc-${it.product_id}`}
                  onClick={() => updateQty(it.product_id, it.note, it.qty + 1)}
                  className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Payment methods */}
        {items.length > 0 && (
          <div className="pt-4">
            <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-semibold mb-2">
              Metode Pembayaran
            </p>
            <div className="space-y-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  data-testid={`payment-${m.id}`}
                  onClick={() => setMethod(m.id)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 border transition ${
                    method === m.id ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <m.Icon size={20} className={method === m.id ? "text-primary" : "text-muted-foreground"} />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                  <span
                    className={`size-4 rounded-full border-2 ${
                      method === m.id ? "border-primary bg-primary" : "border-border"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        {items.length > 0 && (
          <div className="bg-card rounded-xl border border-border/60 p-4 space-y-2">
            <Row label="Subtotal" value={formatRupiah(subtotal)} />
            <Row label="Pajak (10%)" value={formatRupiah(tax)} />
            <div className="border-t border-border/60 my-1" />
            <Row label="Grand Total" value={formatRupiah(total)} big />
          </div>
        )}
      </div>

      {/* Sticky checkout */}
      {items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30">
          <div className="max-w-md mx-auto px-5 pb-5">
            <Button
              data-testid="checkout-button"
              onClick={checkout}
              disabled={loading}
              className="w-full h-14 text-base shadow-2xl"
            >
              {loading ? "Memproses..." : `Bayar · ${formatRupiah(total)}`}
            </Button>
          </div>
        </div>
      )}

      {/* Edit note dialog */}
      <Dialog open={!!editNote} onOpenChange={(o) => !o && setEditNote(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Catatan</DialogTitle>
          </DialogHeader>
          <Textarea
            data-testid="edit-note-input"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            placeholder="Pedas Level 3, Tanpa Bawang..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNote(null)}>
              Batal
            </Button>
            <Button
              data-testid="save-note-button"
              onClick={() => {
                updateNote(editNote.pid, editNote.old, noteDraft);
                setEditNote(null);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, big }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={big ? "font-heading text-base" : "text-sm text-muted-foreground"}>{label}</span>
      <span className={big ? "font-heading text-primary text-2xl" : "text-sm font-medium"}>{value}</span>
    </div>
  );
}
