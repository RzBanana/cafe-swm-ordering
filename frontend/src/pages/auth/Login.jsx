import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coffee, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(username, password);
      toast.success(`Selamat datang, ${user.name}`);
      navigate(user.role === "admin" ? "/admin" : "/kasir");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: hero */}
      <div className="hidden lg:block relative w-1/2">
        <img
          src="https://images.pexels.com/photos/20825644/pexels-photo-20825644.jpeg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/40 to-transparent" />
        <div className="relative z-10 p-14 h-full flex flex-col justify-between text-white">
          <div className="flex items-center gap-2">
            <Coffee size={28} className="text-amber-200" />
            <span className="text-xs tracking-[0.25em] uppercase font-semibold">SWM Cafe</span>
          </div>
          <div>
            <h1 className="font-heading text-6xl leading-[0.95] tracking-tight">
              Setiap cangkir,
              <br />
              <span className="italic font-normal">setiap cerita.</span>
            </h1>
            <p className="mt-4 text-white/80 max-w-md">
              Portal staff untuk mengelola pesanan, pembayaran, dan operasi harian cafe.
            </p>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Coffee size={22} className="text-primary" />
            <span className="text-xs tracking-[0.25em] uppercase font-semibold">SWM Cafe</span>
          </div>

          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold">Login Staff</p>
          <h2 className="font-heading text-4xl mt-1">Selamat datang kembali.</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Masuk untuk akses dashboard kasir atau admin.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="u">Username</Label>
              <div className="relative mt-1.5">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="u"
                  data-testid="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="p">Password</Label>
              <div className="relative mt-1.5">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="p"
                  data-testid="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>
            <Button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="w-full h-11 shadow-md"
            >
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <div className="mt-8 text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3 space-y-1">
            <p className="font-semibold text-foreground">Demo:</p>
            <p>Admin: <span className="font-mono">admin / admin123</span></p>
            <p>Kasir: <span className="font-mono">kasir / kasir123</span></p>
          </div>

          <a
            href="/"
            data-testid="login-back-home"
            className="block text-center text-xs text-muted-foreground hover:text-primary mt-6"
          >
            ← Kembali ke menu pelanggan
          </a>
        </div>
      </div>
    </div>
  );
}
