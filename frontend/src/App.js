import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

// Customer
import Welcome from "@/pages/customer/Welcome";
import Menu from "@/pages/customer/Menu";
import Cart from "@/pages/customer/Cart";
import Tracking from "@/pages/customer/Tracking";
import History from "@/pages/customer/History";

// Auth
import Login from "@/pages/auth/Login";
import ThermalReceipt from "@/pages/ThermalReceipt";

// Admin
import AdminLayout from "@/components/layouts/DashboardLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminProducts from "@/pages/admin/Products";
import AdminCategories from "@/pages/admin/Categories";
import AdminTables from "@/pages/admin/Tables";
import AdminEmployees from "@/pages/admin/Employees";
import AdminOrders from "@/pages/admin/Orders";
import AdminReports from "@/pages/admin/Reports";
import AdminProfile from "@/pages/admin/Profile";

// Kasir
import KasirDashboard from "@/pages/kasir/Dashboard";
import KasirOrders from "@/pages/kasir/Orders";
import KasirHistory from "@/pages/kasir/History";

function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && !(role === "kasir" && user.role === "admin")) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Customer */}
            <Route path="/" element={<Welcome />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/track/:orderId" element={<Tracking />} />
            <Route path="/history" element={<History />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/print/:orderId" element={<ThermalReceipt />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminLayout role="admin" />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="tables" element={<AdminTables />} />
              <Route path="employees" element={<AdminEmployees />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>

            {/* Kasir */}
            <Route
              path="/kasir"
              element={
                <ProtectedRoute role="kasir">
                  <AdminLayout role="kasir" />
                </ProtectedRoute>
              }
            >
              <Route index element={<KasirDashboard />} />
              <Route path="orders" element={<KasirOrders />} />
              <Route path="history" element={<KasirHistory />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
