import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2, VolumeX, Check, Send, Smartphone } from "lucide-react";
import {
  notifSettings,
  notifPermission,
  requestNotifPermission,
  playChime,
  playPaidChime,
  playReadyChime,
  playSuccessChime,
} from "@/lib/notifications";
import {
  pushSupported,
  pushEnabled,
  subscribePush,
  unsubscribePush,
  sendTestPush,
} from "@/lib/push";
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
  const [push, setPush] = useState(pushEnabled());
  const [pushBusy, setPushBusy] = useState(false);
  const isPushSupported = pushSupported();

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

  const togglePush = async (v) => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (v) {
        const res = await subscribePush({ role: "staff" });
        if (res.ok) {
          setPush(true);
          setPerm(notifPermission());
          toast.success("Push notification aktif untuk device ini");
        } else {
          toast.error(res.error || "Gagal aktifkan push");
        }
      } else {
        await unsubscribePush();
        setPush(false);
        toast.success("Push notification dimatikan");
      }
    } finally {
      setPushBusy(false);
    }
  };

  const testPush = async () => {
    const res = await sendTestPush();
    if (res.ok) toast.success("Push terkirim — cek notifikasi OS Anda");
    else toast.error(res.error || "Gagal kirim test push");
  };

  const active = (sound || desktop || push) && (perm === "granted" || sound);
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
          {isPushSupported && (
            <Row
              icon={Smartphone}
              label="Push (Browser Tertutup)"
              description={
                push
                  ? "Aktif — notifikasi sampai walau tab/browser ditutup"
                  : "Service Worker + VAPID. Tetap masuk walau tab ditutup."
              }
              checked={push}
              onChange={togglePush}
              disabled={pushBusy || perm === "denied"}
              testId="toggle-push"
            />
          )}
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

        {isPushSupported && push && (
          <Button
            variant="outline"
            size="sm"
            onClick={testPush}
            className="w-full mt-2"
            data-testid="test-push-button"
          >
            <Send size={14} className="mr-1" /> Tes Push (OS Notification)
          </Button>
        )}

        <div className="mt-4 pt-3 border-t border-border/60">
          <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground font-semibold mb-2">
            Preview per Status
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 justify-start"
              onClick={playChime}
              data-testid="preview-new"
            >
              🔔 Pesanan Baru
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 justify-start"
              onClick={playPaidChime}
              data-testid="preview-paid"
            >
              ✓ Bayar OK
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 justify-start col-span-2 bg-primary/5 hover:bg-primary/10 text-primary font-medium"
              onClick={playReadyChime}
              data-testid="preview-ready"
            >
              🛎️ Siap Diantar (alarm)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 justify-start col-span-2"
              onClick={playSuccessChime}
              data-testid="preview-success"
            >
              ✓ Pesanan Selesai
            </Button>
          </div>
        </div>
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
