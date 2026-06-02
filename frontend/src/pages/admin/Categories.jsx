import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminCategories() {
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", icon: "🍽️" });

  const load = () => api.get("/categories").then((r) => setCats(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing) await api.patch(`/categories/${editing.id}`, form);
      else await api.post("/categories", form);
      toast.success("Tersimpan");
      setOpen(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Hapus kategori "${c.name}"?`)) return;
    await api.delete(`/categories/${c.id}`);
    toast.success("Dihapus");
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Kategori</p>
          <h1 className="font-heading text-4xl mt-1">Kelola Kategori</h1>
        </div>
        <Button
          onClick={() => { setEditing(null); setForm({ name: "", icon: "🍽️" }); setOpen(true); }}
          data-testid="add-category-button"
        >
          <Plus size={14} className="mr-1" /> Tambah
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cats.map((c) => (
          <div key={c.id} className="bg-card border border-border/60 rounded-xl p-4 flex items-center gap-3" data-testid={`category-${c.id}`}>
            <div className="size-12 rounded-lg bg-secondary flex items-center justify-center text-2xl">{c.icon}</div>
            <div className="flex-1">
              <p className="font-heading text-xl">{c.name}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setForm({ name: c.name, icon: c.icon }); setOpen(true); }}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => remove(c)}>
              <Trash2 size={14} className="text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit" : "Tambah"} Kategori</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama</Label><Input data-testid="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Icon (emoji)</Label><Input data-testid="cat-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} data-testid="save-category">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
