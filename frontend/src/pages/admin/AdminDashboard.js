import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Gift,
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
} from "recharts";
import api from "@/utils/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
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
      setTopItems(itemsRes.data);
      setRecentOrders(ordersRes.data);
      setPaymentMethods(paymentsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      toast.error("Không thể tải dữ liệu thống kê");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Doanh thu hôm nay",
      value: stats ? `${stats.today_revenue.toLocaleString("vi-VN")} đ` : "0 đ",
      icon: DollarSign,
      color: "from-emerald-500 to-teal-600",
      testId: "today-revenue",
    },
    {
      title: "Đơn hàng hôm nay",
      value: stats ? stats.today_orders : 0,
      icon: ShoppingBag,
      color: "from-blue-500 to-cyan-600",
      testId: "today-orders",
    },
    {
      title: "Doanh thu tháng này",
      value: stats ? `${stats.month_revenue.toLocaleString("vi-VN")} đ` : "0 đ",
      icon: DollarSign,
      color: "from-green-500 to-emerald-600",
      testId: "month-revenue",
    },
    {
      title: "Đơn hàng tháng này",
      value: stats ? stats.month_orders : 0,
      icon: ShoppingBag,
      color: "from-indigo-500 to-blue-600",
      testId: "month-orders",
    },
    {
      title: "Giá trị TB đơn hàng",
      value: stats
        ? `${stats.avg_order_value.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ`
        : "0 đ",
      icon: TrendingUp,
      color: "from-violet-500 to-purple-600",
      testId: "avg-order",
    },
    {
      title: "Tổng khách hàng",
      value: stats ? stats.total_customers : 0,
      icon: Users,
      color: "from-pink-500 to-rose-600",
      testId: "total-customers",
    },
    {
      title: "Khách hàng mới (tháng)",
      value: stats ? stats.new_customers_month : 0,
      icon: Users,
      color: "from-cyan-500 to-blue-600",
      testId: "new-customers",
    },
    {
      title: "Đơn đang xử lý",
      value: stats ? stats.pending_orders : 0,
      icon: Clock,
      color: "from-orange-500 to-amber-600",
      testId: "pending-orders",
    },
    {
      title: "Đơn chưa thanh toán",
      value: stats ? stats.unpaid_orders : 0,
      icon: CreditCard,
      color: "from-red-500 to-pink-600",
      testId: "unpaid-orders",
    },
    {
      title: "Tổng bàn",
      value: stats ? `${stats.occupied_tables}/${stats.total_tables}` : "0/0",
      icon: Table2,
      color: "from-teal-500 to-green-600",
      testId: "tables",
    },
    {
      title: "Khuyến mãi đang chạy",
      value: stats ? stats.active_promotions : 0,
      icon: Gift,
      color: "from-yellow-500 to-orange-600",
      testId: "promotions",
    },
    {
      title: "Tổng món ăn",
      value: stats ? stats.total_menu_items : 0,
      icon: Package,
      color: "from-purple-500 to-pink-600",
      testId: "total-items",
    },
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      preparing: "bg-blue-100 text-blue-800",
      ready: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status) => {
    const texts = {
      pending: "Chờ xử lý",
      preparing: "Đang chuẩn bị",
      ready: "Sẵn sàng",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };
    return texts[status] || status;
  };

  const getPaymentMethodText = (method) => {
    const texts = {
      cash: "Tiền mặt",
      bank_qr: "Chuyển khoản",
      momo: "MoMo",
      zalopay: "ZaloPay",
      vnpay: "VNPay",
      pending: "Chưa chọn",
      unknown: "Khác",
    };
    return texts[method] || method;
  };

  const getPaymentMethodColor = (method) => {
    const colors = {
      cash: "bg-green-100 text-green-800",
      bank_qr: "bg-blue-100 text-blue-800",
      momo: "bg-pink-100 text-pink-800",
      zalopay: "bg-cyan-100 text-cyan-800",
      vnpay: "bg-orange-100 text-orange-800",
      pending: "bg-gray-100 text-gray-600",
      unknown: "bg-gray-100 text-gray-600",
    };
    return colors[method] || "bg-gray-100 text-gray-600";
  };

  const COLORS = [
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  const AlertIcon = ({ type }) => {
    switch (type) {
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Tổng quan hoạt động cửa hàng</p>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Card
              key={index}
              className={`border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
                alert.type === "error"
                  ? "border-red-500"
                  : alert.type === "warning"
                    ? "border-yellow-500"
                    : "border-blue-500"
              }`}
              onClick={() => navigate(alert.action)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertIcon type={alert.type} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {alert.title}
                    </h3>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate("/admin/orders")}
          className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all flex flex-col items-center gap-2"
        >
          <ShoppingBag className="h-6 w-6" />
          <span className="font-medium">Xem đơn hàng</span>
        </button>
        <button
          onClick={() => navigate("/admin/menu")}
          className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all flex flex-col items-center gap-2"
        >
          <Plus className="h-6 w-6" />
          <span className="font-medium">Thêm món ăn</span>
        </button>
        <button
          onClick={() => navigate("/admin/promotions")}
          className="p-4 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg hover:shadow-lg transition-all flex flex-col items-center gap-2"
        >
          <Gift className="h-6 w-6" />
          <span className="font-medium">Khuyến mãi</span>
        </button>
        <button
          onClick={() => navigate("/admin/tables")}
          className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex flex-col items-center gap-2"
        >
          <Table2 className="h-6 w-6" />
          <span className="font-medium">Quản lý bàn</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="overflow-hidden hover:shadow-lg transition-shadow animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu 7 ngày gần nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `${value.toLocaleString("vi-VN")} đ`}
                  labelStyle={{ color: "#000" }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Doanh thu" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Phương thức thanh toán</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.method}: ${entry.count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Chưa có dữ liệu thanh toán
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Items and Least Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 món bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.top_selling.length > 0 ? (
              <div className="space-y-3">
                {topItems.top_selling.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Đã bán: {item.quantity} phần
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {item.revenue.toLocaleString("vi-VN")} đ
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>

        {/* Least Selling */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 món ít bán nhất</CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.least_selling.length > 0 ? (
              <div className="space-y-3">
                {topItems.least_selling.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Đã bán: {item.quantity} phần
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">
                        {item.revenue.toLocaleString("vi-VN")} đ
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Đơn hàng gần đây</CardTitle>
            <button
              onClick={() => navigate("/admin/orders")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Xem tất cả →
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium text-gray-600">
                      Mã đơn
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">
                      Khách hàng
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">
                      Bàn
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">
                      Tổng tiền
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">
                      Thanh toán
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">
                      Trạng thái
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">
                      Thời gian
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/admin/orders`)}
                    >
                      <td className="p-3">
                        <span className="text-sm font-mono text-gray-600">
                          #{order.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium">
                            {order.customer_name || "Khách"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.customer_phone}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {order.table_number || "-"}
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-semibold text-green-600">
                          {order.total.toLocaleString("vi-VN")} đ
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getPaymentMethodColor(order.payment_method || "pending")}`}
                        >
                          {getPaymentMethodText(
                            order.payment_method || "pending",
                          )}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Chưa có đơn hàng nào
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
