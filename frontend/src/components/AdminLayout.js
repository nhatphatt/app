import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Menu, ShoppingBag, Settings, LogOut, ChevronLeft, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout, getAuthUser } from '@/utils/auth';
import { toast } from 'sonner';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAuthUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    toast.success('Đăng xuất thành công');
    navigate('/admin/login');
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/menu', icon: Menu, label: 'Quản lý Menu' },
    { path: '/admin/tables', icon: ShoppingBag, label: 'Quản lý Bàn' },
    { path: '/admin/orders', icon: ShoppingBag, label: 'Đơn hàng' },
    { path: '/admin/settings', icon: Settings, label: 'Cài đặt' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-br from-emerald-600 to-teal-700 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h1 className={`font-bold text-2xl ${!sidebarOpen && 'hidden'}`}>Minitake</h1>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="sidebar-toggle-btn"
              >
                <ChevronLeft className={`h-5 w-5 transition-transform ${!sidebarOpen && 'rotate-180'}`} />
              </Button>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white text-emerald-700 font-medium'
                        : 'text-white/80 hover:bg-white/10'
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
              data-testid="logout-btn"
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