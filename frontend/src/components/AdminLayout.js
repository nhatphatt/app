import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Menu,
  ShoppingBag,
  Settings,
  LogOut,
  ChevronLeft,
  Grid3x3,
  CreditCard,
  Tag,
  Package,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout, getAuthUser } from "@/utils/auth";
import { toast } from "sonner";
import api from "@/utils/api";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAuthUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [store, setStore] = useState(null);

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    try {
      const response = await api.get("/stores/me");
      setStore(response.data);
    } catch (error) {
      console.error("Failed to fetch store:", error);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Đăng xuất thành công");
    navigate("/admin/login");
  };

  const menuItems = [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/menu", icon: Menu, label: "Quản lý Menu" },
    { path: "/admin/tables", icon: Grid3x3, label: "Quản lý Bàn" },
    { path: "/admin/orders", icon: ShoppingBag, label: "Đơn hàng" },
    { path: "/admin/inventory", icon: Package, label: "Kho Món Ăn" },
    { path: "/admin/staff", icon: Users, label: "Nhân Viên" },
    { path: "/admin/promotions", icon: Tag, label: "Khuyến mãi" },
    { path: "/admin/payments", icon: CreditCard, label: "Thanh toán" },
    { path: "/admin/settings", icon: Settings, label: "Cài đặt" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-br from-emerald-600 to-teal-700 text-white transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex items-center gap-3">
                  {store?.logo && (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                  <h1 className="font-bold text-xl">
                    {store?.name || "Minitake"}
                  </h1>
                </div>
              )}
              {!sidebarOpen && store?.logo && (
                <img
                  src={store.logo}
                  alt={store?.name}
                  className="h-8 w-8 object-contain rounded-lg bg-white/10 p-1 mx-auto"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <ChevronLeft
                  className={`h-5 w-5 transition-transform ${!sidebarOpen && "rotate-180"}`}
                />
              </Button>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-white text-emerald-700 font-medium"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-white/20">
            {sidebarOpen && user && (
              <div className="mb-4 px-4">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-white/70">{user.email}</p>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full text-white hover:bg-white/10 justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {sidebarOpen && <span className="ml-3">Đăng xuất</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
