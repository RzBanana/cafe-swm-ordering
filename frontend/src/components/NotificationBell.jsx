import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2, VolumeX, Check } from "lucide-react";
import {
  notifSettings,
  notifPermission,
  requestNotifPermission,
  playChime,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

/**
 * Compact notification control: badge + popover with sound/desktop toggles.
 * Placed in dashboard headers so kasir/admin can enable/test alerts.
 */
export default function NotificationBell() {
  const [perm, setPerm] = useState("default");
  const [sound, setSound] = useState(notifSettings.sound);
  const [desktop, setDesktop] = useState(notifSettings.desktop);

  useEffect(() => {
    setPerm(notifPermission());
  }, []);

  const enableDesktop = async () => {
    const res = await requestNotifPermission();
    setPerm(res);
    if (res === "granted") {
      notifSettings.desktop = true;
      setDesktop(true);
      toast.success("Notifikasi desktop aktif");
    } else if (res === "denied") {
      toast.error("Izin ditolak. Aktifkan dari pengaturan browser.");
    }
  };

  const toggleSound = (v) => {
    notifSettings.sound = v;
    setSound(v);
    if (v) playChime();
  };

  const toggleDesktop = (v) => {
    if (v && perm !== "granted") return enableDesktop();
    notifSettings.desktop = v;
    setDesktop(v);
  };

  const active = (sound || desktop) && (perm === "granted" || sound);
  const Icon = active ? Bell : BellOff;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative size-9 px-0"
          data-testid="notif-bell"
          title="Pengaturan Notifikasi"
        >
          <Icon size={16} />
          {active && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-emerald-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <p className="font-heading text-lg leading-none">Notifikasi Pesanan Baru</p>
        <p className="text-xs text-muted-foreground mt-1">
          Aktifkan agar kedengaran walau tab tidak aktif.
        </p>

        <div className="mt-4 space-y-3">
          <Row
            icon={sound ? Volume2 : VolumeX}
            label="Suara Bel"
            description="Bunyi ding 2x saat order baru"
            checked={sound}
            onChange={toggleSound}
            testId="toggle-sound"
          />
          <Row
            icon={Bell}
            label="Notifikasi Desktop"
            description={
              perm === "granted"
                ? "Popup muncul di luar browser"
                : perm === "denied"
                ? "Diblokir — aktifkan di setting browser"
                : "Tap untuk minta izin"
            }
            checked={desktop && perm === "granted"}
            onChange={toggleDesktop}
            disabled={perm === "denied"}
            testId="toggle-desktop"
          />
        </div>

        {perm === "default" && (
          <Button
            size="sm"
            onClick={enableDesktop}
            className="w-full mt-3"
            data-testid="enable-desktop-button"
          >
            <Bell size={14} className="mr-1" /> Aktifkan Notifikasi Desktop
          </Button>
        )}

        {perm === "granted" && (
          <p className="mt-3 text-xs text-emerald-600 flex items-center gap-1">
            <Check size={12} /> Izin notifikasi diberikan
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={playChime}
          className="w-full mt-3"
          data-testid="test-sound-button"
        >
          Tes Suara
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function Row({ icon: Icon, label, description, checked, onChange, disabled, testId }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} className="text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        data-testid={testId}
      />
    </div>
  );
}
