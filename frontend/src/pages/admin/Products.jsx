import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api, { formatRupiah, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const EMPTY = { name: "", category_id: "", price: 0, description: "", image: "", status: "ready" };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/categories").then((r) => setCategories(r.data));
  };
  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, category_id: categories[0]?.id || "" });
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...p });
    setOpen(true);
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editing) {
        await api.patch(`/products/${editing.id}`, payload);
        toast.success("Produk diperbarui");
      } else {
        await api.post("/products", payload);
        toast.success("Produk ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Hapus produk "${p.name}"?`)) return;
    await api.delete(`/products/${p.id}`);
    toast.success("Produk dihapus");
    load();
  };

  const toggleStatus = async (p) => {
    const newStatus = p.status === "ready" ? "sold_out" : "ready";
    await api.patch(`/products/${p.id}/status`, null, { params: { status: newStatus } });
    load();
  };

  const catName = (id) => categories.find((c) => c.id === id)?.name || "-";

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Produk</p>
          <h1 className="font-heading text-4xl mt-1">Kelola Produk</h1>
        </div>
        <Button onClick={openNew} data-testid="add-product-button">
          <Plus size={14} className="mr-1" /> Tambah Produk
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-left">
              <Th>Produk</Th>
              <Th>Kategori</Th>
              <Th>Harga</Th>
              <Th>Status</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border/60" data-testid={`product-row-${p.id}`}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="size-12 rounded-md object-cover" />
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">{catName(p.category_id)}</td>
                <td className="p-3 font-medium">{formatRupiah(p.price)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={p.status === "ready"}
                      onCheckedChange={() => toggleStatus(p)}
                      data-testid={`status-toggle-${p.id}`}
                    />
                    <Badge variant={p.status === "ready" ? "default" : "destructive"}>
                      {p.status === "ready" ? "Ready" : "Sold Out"}
                    </Badge>
                  </div>
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)} data-testid={`edit-product-${p.id}`}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(p)} data-testid={`delete-product-${p.id}`}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {editing ? "Edit Produk" : "Tambah Produk"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Produk</Label>
              <Input
                data-testid="product-name-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger data-testid="product-category-select">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Harga (Rp)</Label>
              <Input
                data-testid="product-price-input"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                data-testid="product-desc-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Gambar (Upload JPG/PNG/WebP)</Label>
              <Input type="file" accept="image/*" onChange={handleImage} data-testid="product-image-input" />
              {form.image && <img src={form.image} alt="" className="mt-2 h-24 rounded-md object-cover" />}
              <p className="text-xs text-muted-foreground mt-1">Atau paste URL:</p>
              <Input
                value={form.image || ""}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.status === "ready"}
                onCheckedChange={(v) => setForm({ ...form, status: v ? "ready" : "sold_out" })}
              />
              <span className="text-sm">{form.status === "ready" ? "Ready (Tersedia)" : "Sold Out"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={save} data-testid="save-product-button">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold ${className}`}>{children}</th>;
}
