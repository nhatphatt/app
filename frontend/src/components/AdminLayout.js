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
  Store,
  Bell,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout, getAuthUser } from "@/utils/auth";
import { toast } from "sonner";
import api from "@/utils/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

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
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Tổng quan" },
    { path: "/admin/orders", icon: ShoppingBag, label: "Đơn hàng" },
    { path: "/admin/menu", icon: Menu, label: "Thực đơn" },
    { path: "/admin/tables", icon: Grid3x3, label: "Bàn & QR" },
    { path: "/admin/inventory", icon: Package, label: "Kho hàng" },
    { path: "/admin/staff", icon: Users, label: "Nhân viên" },
    { path: "/admin/promotions", icon: Tag, label: "Khuyến mãi" },
    { path: "/admin/payments", icon: CreditCard, label: "Thanh toán" },
    { path: "/admin/settings", icon: Settings, label: "Cài đặt" },
  ];

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`bg-card border-r border-border transition-all duration-300 flex flex-col ${sidebarOpen ? "w-72" : "w-20"
          }`}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {store?.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="h-full w-full object-cover rounded-lg"
                  />
                ) : (
                  <Store className="h-6 w-6" />
                )}
              </div>
              <div className="flex flex-col truncate">
                <span className="font-bold text-foreground truncate">
                  {store?.name || "Minitake"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Quản lý nhà hàng
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {store?.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="h-full w-full object-cover rounded-lg"
                  />
                ) : (
                  <Store className="h-6 w-6" />
                )}
              </div>
            </div>
          )}

          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!sidebarOpen && (
          <div className="flex justify-center py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                    ? "bg-primary text-primary-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {sidebarOpen && <span>{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center"}`}>
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}`} />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.name || "Admin"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4 w-1/3">
            <div className="relative w-full max-w-md hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-card"></span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
