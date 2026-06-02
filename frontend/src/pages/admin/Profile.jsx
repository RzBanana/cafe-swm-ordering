import { useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminProfile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [photo, setPhoto] = useState(user?.photo || "");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  const handlePhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result);
    r.readAsDataURL(f);
  };

  const saveProfile = async () => {
    try {
      const { data } = await api.patch("/auth/profile", { name, photo });
      const merged = { ...user, name: data.name, photo: data.photo };
      localStorage.setItem("swm_user", JSON.stringify(merged));
      setUser(merged);
      toast.success("Profil diperbarui");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const changePwd = async () => {
    try {
      await api.post("/auth/change-password", { old_password: oldPwd, new_password: newPwd });
      toast.success("Password berhasil diganti");
      setOldPwd(""); setNewPwd("");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Profil</p>
        <h1 className="font-heading text-4xl mt-1">Profil Saya</h1>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div className="flex items-center gap-4">
          {photo ? (
            <img src={photo} alt="" className="size-20 rounded-full object-cover" />
          ) : (
            <div className="size-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading text-3xl">
              {(name || "U")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs tracking-wider uppercase text-muted-foreground">Username</p>
            <p className="font-mono">{user?.username}</p>
            <p className="text-xs tracking-wider uppercase text-muted-foreground mt-1">Role</p>
            <p className="capitalize">{user?.role}</p>
          </div>
        </div>
        <div>
          <Label>Nama Lengkap</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name" />
        </div>
        <div>
          <Label>Foto Profil</Label>
          <Input type="file" accept="image/*" onChange={handlePhoto} data-testid="profile-photo" />
        </div>
        <Button onClick={saveProfile} data-testid="save-profile">Simpan Profil</Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <h2 className="font-heading text-2xl">Ganti Password</h2>
        <div><Label>Password Lama</Label><Input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} data-testid="old-pwd" /></div>
        <div><Label>Password Baru</Label><Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} data-testid="new-pwd" /></div>
        <Button onClick={changePwd} disabled={!oldPwd || !newPwd} data-testid="change-pwd-button">Ganti Password</Button>
      </div>
    </div>
  );
}
