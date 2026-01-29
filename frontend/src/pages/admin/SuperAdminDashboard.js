import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign,
  Building,
  TrendingUp,
  Users,
  CreditCard,
  RefreshCw,
  LogOut,
  Search,
  Settings,
  BarChart3,
  Store,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Wallet,
  Crown,
  Clock,
  AlertTriangle,
  ChevronRight,
  Home,
  FileText,
  PieChart,
  Layers,
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from "recharts";
import api from "@/utils/api";
import { toast } from "sonner";
import { getAuthToken, getAuthUser, removeAuthToken, removeAuthUser } from "@/utils/auth";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Data states
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [recentStores, setRecentStores] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [subscriptionDist, setSubscriptionDist] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [expiringTrials, setExpiringTrials] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("minitake_token");
    const user = getAuthUser();
    
    if (!token || !user || user.role !== "super_admin") {
      removeAuthToken();
      removeAuthUser();
      navigate("/admin/login");
      return;
    }
    
    fetchAllData();
  }, [navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, revenueRes, storesRes, paymentsRes] = await Promise.all([
        api.get("/super-admin/dashboard"),
        api.get("/super-admin/revenue?period=month"),
        api.get("/super-admin/stores?limit=10"),
        api.get("/super-admin/payments?limit=10"),
      ]);

      const dashboardData = dashboardRes.data;
      setStats(dashboardData);
      setRevenueData(revenueRes.data.data || []);
      setRecentStores(storesRes.data.stores || []);
      setRecentPayments(paymentsRes.data.payments || []);

      // Prepare subscription distribution data
      setSubscriptionDist([
        { name: "STARTER", value: dashboardData.starter_subscriptions || 0, color: "#64748b" },
        { name: "PRO", value: dashboardData.pro_subscriptions || 0, color: "#8b5cf6" },
        { name: "TRIAL", value: dashboardData.trial_subscriptions || 0, color: "#f59e0b" },
      ]);

      // Mock revenue by month data
      setRevenueByMonth([
        { month: "T1", revenue: 4500000, subscriptions: 45 },
        { month: "T2", revenue: 5200000, subscriptions: 52 },
        { month: "T3", revenue: 4800000, subscriptions: 48 },
        { month: "T4", revenue: 6100000, subscriptions: 61 },
        { month: "T5", revenue: 5500000, subscriptions: 55 },
        { month: "T6", revenue: 7200000, subscriptions: 72 },
      ]);

      // Mock expiring trials (in real app, get from API)
      setExpiringTrials([
        { store_name: "Quán Cafe ABC", days_left: 3, email: "abc@email.com" },
        { store_name: "Nhà hàng XYZ", days_left: 5, email: "xyz@email.com" },
        { store_name: "Tea House 123", days_left: 7, email: "tea@email.com" },
      ]);

    } catch (error) {
      if (error.response?.status === 401) {
        removeAuthToken();
        removeAuthUser();
        navigate("/admin/login");
      } else {
        toast.error("Không thể tải dữ liệu");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    removeAuthUser();
    navigate("/admin/login");
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-700";
      case "trial": return "bg-amber-100 text-amber-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "paid": return "bg-emerald-100 text-emerald-700";
      case "pending": return "bg-amber-100 text-amber-700";
      case "failed": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 z-50">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Minitake
          </h1>
          <p className="text-xs text-slate-400 mt-1">Super Admin Panel</p>
        </div>

        <nav className="px-4 space-y-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "overview" 
                ? "bg-violet-500/20 text-violet-300" 
                : "text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            <Home className="w-5 h-5" />
            Tổng quan
          </button>
          
          <button
            onClick={() => setActiveTab("stores")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "stores" 
                ? "bg-violet-500/20 text-violet-300" 
                : "text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            <Store className="w-5 h-5" />
            Cửa hàng
          </button>
          
          <button
            onClick={() => setActiveTab("payments")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "payments" 
                ? "bg-violet-500/20 text-violet-300" 
                : "text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            <CreditCard className="w-5 h-5" />
            Thanh toán
          </button>
          
          <button
            onClick={() => setActiveTab("revenue")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "revenue" 
                ? "bg-violet-500/20 text-violet-300" 
                : "text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Báo cáo doanh thu
          </button>
          
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "subscriptions" 
                ? "bg-violet-500/20 text-violet-300" 
                : "text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            <Layers className="w-5 h-5" />
            Subscriptions
          </button>
          
          <button
            onClick={() => navigate("/super-admin/users")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              window.location.pathname === "/super-admin/users"
                ? "bg-violet-500/20 text-violet-300" 
                : "text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            <Users className="w-5 h-5" />
            Quản lý Users
          </button>
          
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "settings" 
                ? "bg-violet-500/20 text-violet-300" 
                : "text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            <Settings className="w-5 h-5" />
            Cài đặt
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 mt-1">Tổng quan hệ thống Minitake</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Tìm kiếm cửa hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <Button onClick={fetchAllData} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Tổng cửa hàng</p>
                      <p className="text-3xl font-bold text-white mt-1">{stats?.total_stores || 0}</p>
                      <p className="text-xs text-emerald-400 flex items-center mt-2">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        +12% so với tháng trước
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Building className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Doanh thu tháng</p>
                      <p className="text-3xl font-bold text-emerald-400 mt-1">
                        {formatCurrency(stats?.total_revenue_month || 0)}
                      </p>
                      <p className="text-xs text-emerald-400 flex items-center mt-2">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        +8% so với tháng trước
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">PRO Subscriptions</p>
                      <p className="text-3xl font-bold text-violet-400 mt-1">{stats?.pro_subscriptions || 0}</p>
                      <p className="text-xs text-violet-400 flex items-center mt-2">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        +5% so với tháng trước
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-violet-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Trial Active</p>
                      <p className="text-3xl font-bold text-amber-400 mt-1">{stats?.trial_subscriptions || 0}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {stats?.trial_subscriptions || 0} đang dùng thử
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Doanh thu 30 ngày gần đây
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Biểu đồ doanh thu theo ngày
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(v) => v?.slice(0, 5) || ""} />
                      <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                        labelStyle={{ color: "#94a3b8" }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Subscription Distribution */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-violet-400" />
                    Phân bố Subscription
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    STARTER vs PRO vs TRIAL
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPie>
                      <Pie
                        data={subscriptionDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {subscriptionDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                      />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Revenue by Month & Expiring Trials */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue by Month */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    Doanh thu theo tháng
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Tổng quan 6 tháng gần nhất
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Expiring Trials */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    Trial sắp hết hạn
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Các cửa hàng cần gia hạn
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {expiringTrials.length > 0 ? (
                      expiringTrials.map((trial, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30">
                          <div>
                            <p className="font-medium text-white">{trial.store_name}</p>
                            <p className="text-sm text-slate-400">{trial.email}</p>
                          </div>
                          <Badge className={`${trial.days_left <= 3 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {trial.days_left} ngày
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-4">Không có trial nào sắp hết hạn</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Stores */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Store className="w-5 h-5 text-blue-400" />
                      Cửa hàng gần đây
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      10 cửa hàng mới nhất
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setActiveTab("stores")}>
                    Xem tất cả <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentStores.slice(0, 5).map((store, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                            <Store className="w-5 h-5 text-slate-300" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{store.name}</p>
                            <p className="text-sm text-slate-400">/{store.slug}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(store.subscription_status)}>
                          {store.plan_id?.toUpperCase() || "STARTER"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Payments */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-400" />
                      Giao dịch gần đây
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      10 giao dịch mới nhất
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setActiveTab("payments")}>
                    Xem tất cả <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentPayments.slice(0, 5).map((payment, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                        <div>
                          <p className="font-medium text-white">{formatCurrency(payment.amount || 0)}</p>
                          <p className="text-sm text-slate-400">{formatDate(payment.created_at)}</p>
                        </div>
                        <Badge className={getPaymentStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "stores" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Quản lý Cửa hàng</h2>
              <Button className="bg-violet-500 hover:bg-violet-600">
                <Store className="w-4 h-4 mr-2" />
                Thêm cửa hàng
              </Button>
            </div>
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                      <TableHead className="text-slate-400">Cửa hàng</TableHead>
                      <TableHead className="text-slate-400">Slug</TableHead>
                      <TableHead className="text-slate-400">Gói</TableHead>
                      <TableHead className="text-slate-400">Trạng thái</TableHead>
                      <TableHead className="text-slate-400">Ngày tạo</TableHead>
                      <TableHead className="text-slate-400">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentStores.map((store, idx) => (
                      <TableRow key={idx} className="border-slate-700/50 hover:bg-slate-700/30">
                        <TableCell className="text-white font-medium">{store.name}</TableCell>
                        <TableCell className="text-slate-400">/{store.slug}</TableCell>
                        <TableCell>
                          <Badge className={store.plan_id === "pro" ? "bg-violet-500/20 text-violet-400" : "bg-slate-500/20 text-slate-400"}>
                            {store.plan_id?.toUpperCase() || "STARTER"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(store.subscription_status)}>
                            {store.subscription_status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400">{formatDate(store.created_at)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                            Xem chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Lịch sử Thanh toán</h2>
              <div className="flex gap-2">
                <Button variant="outline" className="border-slate-700 text-slate-300">
                  <FileText className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                      <TableHead className="text-slate-400">Mã giao dịch</TableHead>
                      <TableHead className="text-slate-400">Cửa hàng</TableHead>
                      <TableHead className="text-slate-400">Số tiền</TableHead>
                      <TableHead className="text-slate-400">Phương thức</TableHead>
                      <TableHead className="text-slate-400">Trạng thái</TableHead>
                      <TableHead className="text-slate-400">Ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.map((payment, idx) => (
                      <TableRow key={idx} className="border-slate-700/50 hover:bg-slate-700/30">
                        <TableCell className="text-white font-mono text-sm">{payment.payment_id?.slice(0, 16)}...</TableCell>
                        <TableCell className="text-white">{payment.store_id?.slice(0, 8)}...</TableCell>
                        <TableCell className="text-emerald-400 font-medium">{formatCurrency(payment.amount || 0)}</TableCell>
                        <TableCell className="text-slate-400">{payment.payment_method || "payos"}</TableCell>
                        <TableCell>
                          <Badge className={getPaymentStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400">{formatDate(payment.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "revenue" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Báo cáo Doanh thu</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Doanh thu theo tháng</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Thống kê tổng quan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between p-4 rounded-lg bg-slate-700/30">
                    <span className="text-slate-400">Tổng doanh thu tháng này</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(stats?.total_revenue_month || 0)}</span>
                  </div>
                  <div className="flex justify-between p-4 rounded-lg bg-slate-700/30">
                    <span className="text-slate-400">Tổng doanh thu năm nay</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(stats?.total_revenue_year || 0)}</span>
                  </div>
                  <div className="flex justify-between p-4 rounded-lg bg-slate-700/30">
                    <span className="text-slate-400">Tổng cửa hàng</span>
                    <span className="text-white font-bold">{stats?.total_stores || 0}</span>
                  </div>
                  <div className="flex justify-between p-4 rounded-lg bg-slate-700/30">
                    <span className="text-slate-400">Tổng PRO subscriptions</span>
                    <span className="text-violet-400 font-bold">{stats?.pro_subscriptions || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Quản lý Subscriptions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <Crown className="w-12 h-12 text-violet-400 mx-auto mb-4" />
                  <p className="text-3xl font-bold text-white">{stats?.pro_subscriptions || 0}</p>
                  <p className="text-slate-400 mt-2">PRO Subscriptions</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <Activity className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-3xl font-bold text-white">{stats?.active_subscriptions || 0}</p>
                  <p className="text-slate-400 mt-2">Active Subscriptions</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                  <p className="text-3xl font-bold text-white">{stats?.trial_subscriptions || 0}</p>
                  <p className="text-slate-400 mt-2">Trial Subscriptions</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Cài đặt Hệ thống</h2>
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Cài đặt chung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <p className="font-medium text-white">Chế độ bảo trì</p>
                    <p className="text-sm text-slate-400">Tạm thời đóng hệ thống để bảo trì</p>
                  </div>
                  <Button variant="outline" className="border-slate-600">Bật/Tắt</Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <p className="font-medium text-white">Thông báo qua email</p>
                    <p className="text-sm text-slate-400">Gửi email khi có đăng ký mới</p>
                  </div>
                  <Button variant="outline" className="border-slate-600">Cấu hình</Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <p className="font-medium text-white">Webhook Settings</p>
                    <p className="text-sm text-slate-400">Cấu hình webhook cho PayOS</p>
                  </div>
                  <Button variant="outline" className="border-slate-600">Cấu hình</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
