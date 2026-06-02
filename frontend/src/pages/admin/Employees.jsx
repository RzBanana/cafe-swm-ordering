import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const EMPTY = { name: "", username: "", password: "", role: "kasir" };

export default function AdminEmployees() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [resetFor, setResetFor] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [newPwd, setNewPwd] = useState("");

  const load = () => api.get("/employees").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing) {
        await api.patch(`/employees/${editing.id}`, { name: form.name, role: form.role });
      } else {
        await api.post("/employees", form);
      }
      toast.success("Tersimpan");
      setOpen(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (e) => {
    if (!window.confirm(`Hapus pegawai "${e.name}"?`)) return;
    try { await api.delete(`/employees/${e.id}`); toast.success("Dihapus"); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const reset = async () => {
    try {
      await api.post(`/employees/${resetFor.id}/reset-password`, null, { params: { new_password: newPwd } });
      toast.success("Password direset");
      setResetFor(null);
      setNewPwd("");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Pegawai</p>
          <h1 className="font-heading text-4xl mt-1">Kelola Pegawai</h1>
        </div>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }} data-testid="add-employee-button">
          <Plus size={14} className="mr-1" /> Tambah Pegawai
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-left">
              <Th>Nama</Th><Th>Username</Th><Th>Role</Th><Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-t border-border/60" data-testid={`employee-${e.username}`}>
                <td className="p-3 font-medium">{e.name}</td>
                <td className="p-3 font-mono text-xs">{e.username}</td>
                <td className="p-3"><Badge variant={e.role === "admin" ? "default" : "secondary"}>{e.role}</Badge></td>
                <td className="p-3 text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => setResetFor(e)} title="Reset Password" data-testid={`reset-${e.username}`}>
                    <KeyRound size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(e); setForm({ name: e.name, username: e.username, role: e.role, password: "" }); setOpen(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(e)}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Edit" : "Tambah"} Pegawai</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama</Label><Input data-testid="emp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Username</Label>
              <Input data-testid="emp-username" value={form.username} disabled={!!editing} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            {!editing && (
              <div><Label>Password</Label><Input data-testid="emp-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            )}
            <div>
              <Label>Jabatan</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger data-testid="emp-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kasir">Kasir</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} data-testid="save-employee">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-heading">Reset Password — {resetFor?.name}</DialogTitle></DialogHeader>
          <Input data-testid="reset-pwd-input" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Password baru" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetFor(null)}>Batal</Button>
            <Button onClick={reset} disabled={!newPwd} data-testid="reset-pwd-save">Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`p-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold ${className}`}>{children}</th>;
}
