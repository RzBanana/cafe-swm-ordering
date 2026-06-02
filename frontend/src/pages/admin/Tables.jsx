import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, QrCode, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminTables() {
  const [tables, setTables] = useState([]);
  const [open, setOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ number: "", seats: 4 });

  const load = () => api.get("/tables").then((r) => setTables(r.data));
  useEffect(() => { load(); }, []);

  const baseUrl = window.location.origin;

  const save = async () => {
    try {
      const payload = { number: form.number, seats: Number(form.seats) };
      if (editing) await api.patch(`/tables/${editing.id}`, payload);
      else await api.post("/tables", payload);
      toast.success("Tersimpan");
      setOpen(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (t) => {
    if (!window.confirm(`Hapus meja ${t.number}?`)) return;
    await api.delete(`/tables/${t.id}`);
    toast.success("Dihapus");
    load();
  };

  const downloadQr = (t) => {
    const svg = document.getElementById(`qr-${t.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 600; canvas.height = 600;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 50, 50, 500, 500);
      const link = document.createElement("a");
      link.download = `qr-meja-${t.number}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Meja</p>
          <h1 className="font-heading text-4xl mt-1">Kelola Meja & QR</h1>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ number: "", seats: 4 }); setOpen(true); }} data-testid="add-table-button">
          <Plus size={14} className="mr-1" /> Tambah Meja
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tables.map((t) => (
          <div key={t.id} className="bg-card border border-border/60 rounded-xl p-4" data-testid={`table-${t.number}`}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Nomor Meja</p>
            <p className="font-heading text-3xl text-primary mt-1">{t.number}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.seats} kursi</p>
            <div className="flex gap-1 mt-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setQrOpen(t)} data-testid={`qr-${t.number}`}>
                <QrCode size={12} className="mr-1" /> QR
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setForm({ number: t.number, seats: t.seats }); setOpen(true); }}>
                <Pencil size={12} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove(t)}>
                <Trash2 size={12} className="text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit" : "Tambah"} Meja</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nomor Meja</Label><Input data-testid="table-number-input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="01" /></div>
            <div><Label>Jumlah Kursi</Label><Input data-testid="table-seats-input" type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} data-testid="save-table">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrOpen} onOpenChange={(o) => !o && setQrOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">QR Code Meja {qrOpen?.number}</DialogTitle>
          </DialogHeader>
          {qrOpen && (
            <div className="text-center">
              <div className="bg-white p-4 inline-block rounded-xl border border-border">
                <QRCodeSVG id={`qr-${qrOpen.id}`} value={`${baseUrl}/?meja=${qrOpen.number}`} size={220} level="M" />
              </div>
              <p className="text-xs text-muted-foreground mt-3 break-all">{`${baseUrl}/?meja=${qrOpen.number}`}</p>
              <Button onClick={() => downloadQr(qrOpen)} className="mt-3 w-full" data-testid="download-qr">
                <Download size={14} className="mr-1" /> Download PNG
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
