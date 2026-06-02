import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tags,
  TableProperties,
  Users,
  ScrollText,
  BarChart3,
  User,
  Coffee,
  LogOut,
  ListOrdered,
  History,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Pesanan", Icon: ScrollText },
  { to: "/admin/products", label: "Produk", Icon: Package },
  { to: "/admin/categories", label: "Kategori", Icon: Tags },
  { to: "/admin/tables", label: "Meja", Icon: TableProperties },
  { to: "/admin/employees", label: "Pegawai", Icon: Users },
  { to: "/admin/reports", label: "Laporan", Icon: BarChart3 },
  { to: "/admin/profile", label: "Profil", Icon: User },
];

const KASIR_NAV = [
  { to: "/kasir", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/kasir/orders", label: "Pesanan Masuk", Icon: ListOrdered },
  { to: "/kasir/history", label: "Riwayat", Icon: History },
  { to: "/kasir/profile", label: "Profil", Icon: User },
];

export default function DashboardLayout({ role = "admin" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = role === "admin" ? ADMIN_NAV : KASIR_NAV;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/60 bg-card sticky top-0 h-screen">
        <div className="p-6 border-b border-border/60">
          <Link to="/" className="flex items-center gap-2">
            <Coffee size={22} className="text-primary" />
            <div>
              <p className="font-heading text-lg leading-none">SWM Cafe</p>
              <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mt-1">
                {role === "admin" ? "Admin Panel" : "Kasir Panel"}
              </p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <n.Icon size={16} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              {(user?.name || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" data-testid="sidebar-user-name">
                {user?.name}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
            data-testid="logout-button"
          >
            <LogOut size={14} className="mr-1" /> Keluar
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed inset-x-0 top-0 z-40 bg-card border-b border-border/60">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Coffee size={18} className="text-primary" />
            <span className="font-heading text-base">SWM Cafe</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="mobile-logout">
            <LogOut size={14} />
          </Button>
        </div>
        <div className="flex overflow-x-auto border-t border-border/60 px-2 py-1 gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `shrink-0 px-3 py-1.5 rounded-md text-xs ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
      </div>

      <main className="flex-1 lg:ml-0 pt-24 lg:pt-0 p-4 lg:p-8 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
