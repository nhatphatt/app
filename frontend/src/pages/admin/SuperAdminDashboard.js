import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../contexts/LoadingContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Users,
  ShoppingCart,
  DollarSign,
  Crown,
  Zap,
  TrendingUp,
  UtensilsCrossed,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "@/utils/api";
import { toast } from "sonner";
import { getAuthUser, removeAuthToken, removeAuthUser } from "@/utils/auth";
import { Button } from "@/components/ui/button";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();
  const [data, setData] = useState(null);

  useEffect(() => {
    const user = getAuthUser();
    if (!user || user.role !== "super_admin") {
      removeAuthToken();
      removeAuthUser();
      navigate("/admin/login", { replace: true });
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    showLoading("Đang tải dữ liệu...");
    try {
      const res = await api.get("/super-admin/dashboard");
      setData(res.data);
    } catch (error) {
      toast.error("Không thể tải dữ liệu dashboard");
    } finally {
      hideLoading();
    }
  };

  if (!data) return null;

  const statCards = [
    {
      label: "Tổng cửa hàng",
      value: data.total_stores,
      icon: Building,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Tổng người dùng",
      value: data.total_users,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Tổng đơn hàng",
      value: data.total_orders.toLocaleString(),
      icon: ShoppingCart,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Tổng món trong hệ thống",
      value: data.total_menu_items,
      icon: UtensilsCrossed,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const subCards = [
    {
      label: "Đơn hôm nay",
      value: data.today_orders,
      sub: data.today_revenue > 0 ? `${data.today_revenue.toLocaleString()}đ` : "0đ",
      icon: TrendingUp,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      label: "Gói Pro",
      value: data.pro_stores,
      icon: Crown,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Gói Starter",
      value: data.starter_stores,
      icon: Zap,
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
    {
      label: "Doanh thu subscription",
      value: `${data.total_revenue.toLocaleString()}đ`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h1>
          <p className="text-gray-500 text-sm mt-1">
            Dashboard quản trị Super Admin
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {subCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                  {s.sub && <div className="text-xs text-emerald-600 font-medium">{s.sub}</div>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      {data.orders_by_day.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Đơn hàng 7 ngày gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.orders_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) =>
                    name === "revenue"
                      ? [`${Number(value).toLocaleString()}đ`, "Doanh thu"]
                      : [value, "Đơn hàng"]
                  }
                  labelFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                  }}
                />
                <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} name="orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-1 gap-6">

        {/* Top Stores by Revenue */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Top doanh thu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_stores.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>
            )}
            {data.top_stores.map((store, i) => (
              <div
                key={store.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  i === 0
                    ? "bg-amber-100 text-amber-700"
                    : i === 1
                    ? "bg-gray-200 text-gray-600"
                    : "bg-orange-100 text-orange-600"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {store.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {store.order_count || 0} đơn hàng
                  </div>
                </div>
                <div className="text-sm font-semibold text-emerald-600">
                  {Number(store.revenue || 0).toLocaleString()}đ
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
