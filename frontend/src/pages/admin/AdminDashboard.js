import React, { useState, useEffect } from "react";
import { useLoading } from "../../contexts/LoadingContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Clock,
  Users,
  Table2,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Info,
  XCircle,
  Plus,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import api from "@/utils/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [topItems, setTopItems] = useState({
    top_selling: [],
    least_selling: [],
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const { showLoading, hideLoading } = useLoading();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    showLoading('Đang tải dữ liệu...');
    try {
      const [statsRes, chartRes, itemsRes, ordersRes, paymentsRes, alertsRes] =
        await Promise.all([
          api.get("/analytics/dashboard"),
          api.get("/analytics/revenue-chart?days=7"),
          api.get("/analytics/top-items?limit=5"),
          api.get("/analytics/recent-orders?limit=10"),
          api.get("/analytics/payment-methods"),
          api.get("/analytics/alerts"),
        ]);

      setStats(statsRes.data);
      setRevenueChart(chartRes.data);
      setTopItems(itemsRes.data || []);
      setRecentOrders(ordersRes.data || []);
      setPaymentMethods(paymentsRes.data);
      setAlerts(alertsRes.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Không thể tải dữ liệu thống kê");
    } finally {
      hideLoading();
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const statCards = [
    {
      title: "Doanh thu hôm nay",
      value: stats ? formatCurrency(stats.today_revenue) : "0 ₫",
      icon: DollarSign,
      trend: "+12.5%",
      trendUp: true,
      description: "So với hôm qua",
      color: "text-emerald-600",
      bg: "bg-emerald-100/50",
    },
    {
      title: "Đơn hàng hôm nay",
      value: stats ? stats.today_orders : 0,
      icon: ShoppingBag,
      trend: "+5.2%",
      trendUp: true,
      description: "So với hôm qua",
      color: "text-blue-600",
      bg: "bg-blue-100/50",
    },
    {
      title: "Khách hàng mới",
      value: stats ? stats.new_customers_month : 0,
      icon: Users,
      trend: "+2.4%",
      trendUp: true,
      description: "Trong tháng này",
      color: "text-violet-600",
      bg: "bg-violet-100/50",
    },
    {
      title: "Đang xử lý",
      value: stats ? stats.pending_orders : 0,
      icon: Clock,
      trend: "Cần xử lý ngay",
      trendUp: false,
      description: "Đơn hàng chờ",
      color: "text-amber-600",
      bg: "bg-amber-100/50",
    },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700 hover:bg-amber-100/80",
      preparing: "bg-blue-100 text-blue-700 hover:bg-blue-100/80",
      ready: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80",
      completed: "bg-slate-100 text-slate-700 hover:bg-slate-100/80",
      cancelled: "bg-red-100 text-red-700 hover:bg-red-100/80",
    };
    const labels = {
      pending: "Chờ xử lý",
      preparing: "Đang chuẩn bị",
      ready: "Sẵn sàng",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };
    return (
      <Badge variant="secondary" className={`${styles[status]} border-0`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];


  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Tổng quan hoạt động kinh doanh của nhà hàng hôm nay.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/admin/orders")} className="bg-primary hover:bg-primary/90">
            <ShoppingBag className="mr-2 h-4 w-4" /> Quản lý đơn hàng
          </Button>
          <Button variant="outline" onClick={() => fetchAllData()}>
            <Activity className="mr-2 h-4 w-4" /> Làm mới
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <div className={`p-2 rounded-full ${stat.bg} ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
                </div>
                <div className="flex items-center mt-1">
                  {stat.trendUp !== undefined && (
                    <span className={`text-xs font-medium flex items-center ${stat.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                      {stat.trend}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-2">
                    {stat.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Doanh thu 7 ngày qua</CardTitle>
            <CardDescription>Biểu đồ thể hiện xu hướng doanh thu trong tuần</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={revenueChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card className="lg:col-span-3 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Món bán chạy nhất</CardTitle>
            <CardDescription>Top 5 món ăn được yêu thích nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topItems.top_selling.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm mr-4">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} đơn hàng</p>
                  </div>
                  <div className="font-medium text-sm text-foreground">
                    {formatCurrency(item.revenue)}
                  </div>
                </div>
              ))}
              {topItems.top_selling.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Chưa có dữ liệu</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Đơn hàng gần đây</CardTitle>
              <CardDescription>Danh sách 10 đơn hàng mới nhất</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/orders")}>
              Xem tất cả
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Mã đơn</th>
                    <th className="px-4 py-3">Khách hàng</th>
                    <th className="px-4 py-3">Tổng tiền</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 rounded-r-lg">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate("/admin/orders")}
                    >
                      <td className="px-4 py-3 font-medium">#{order.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{order.customer_name || "Khách vãng lai"}</span>
                          <span className="text-xs text-muted-foreground">{order.table_number ? `Bàn ${order.table_number}` : "Mang về"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-muted-foreground">
                        Chưa có đơn hàng nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Phương thức thanh toán</CardTitle>
            <CardDescription>Tỷ lệ sử dụng các phương thức</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {paymentMethods.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [value, props.payload.payload.method]}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Chưa có dữ liệu
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
