import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Clock,
  TrendingUp,
  Users,
  QrCode,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const DemoPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Mock data
  const stats = {
    today_revenue: 2450000,
    today_orders: 28,
    pending_orders: 3,
    total_menu_items: 45,
  };

  const recentOrders = [
    {
      id: "ORD001",
      table: "Bàn 5",
      items: ["Phở Bò", "Trà Đá x2"],
      total: 75000,
      status: "completed",
      time: "10 phút trước",
    },
    {
      id: "ORD002",
      table: "Bàn 12",
      items: ["Cơm Tấm", "Cà Phê Sữa"],
      total: 70000,
      status: "pending",
      time: "5 phút trước",
    },
    {
      id: "ORD003",
      table: "Bàn 3",
      items: ["Bún Chả", "Trà Chanh"],
      total: 65000,
      status: "processing",
      time: "2 phút trước",
    },
  ];

  const menuItems = [
    {
      id: 1,
      name: "Phở Bò",
      category: "Món Chính",
      price: 65000,
      available: true,
    },
    {
      id: 2,
      name: "Bún Chả",
      category: "Món Chính",
      price: 55000,
      available: true,
    },
    {
      id: 3,
      name: "Cơm Tấm",
      category: "Món Chính",
      price: 45000,
      available: true,
    },
    {
      id: 4,
      name: "Cà Phê Sữa Đá",
      category: "Đồ Uống",
      price: 25000,
      available: true,
    },
    {
      id: 5,
      name: "Trà Đá",
      category: "Đồ Uống",
      price: 5000,
      available: false,
    },
    {
      id: 6,
      name: "Chè Ba Màu",
      category: "Tráng Miệng",
      price: 20000,
      available: true,
    },
  ];

  const tables = [
    { id: 1, number: "Bàn 1", status: "available" },
    { id: 2, number: "Bàn 2", status: "available" },
    { id: 3, number: "Bàn 3", status: "occupied" },
    { id: 4, number: "Bàn 4", status: "available" },
    { id: 5, number: "Bàn 5", status: "occupied" },
    { id: 6, number: "Bàn 6", status: "available" },
    { id: 7, number: "Bàn 7", status: "reserved" },
    { id: 8, number: "Bàn 8", status: "available" },
  ];

  const statCards = [
    {
      title: "Doanh thu hôm nay",
      value: `${stats.today_revenue.toLocaleString("vi-VN")} đ`,
      icon: DollarSign,
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: "Đơn hàng hôm nay",
      value: stats.today_orders,
      icon: ShoppingBag,
      color: "from-blue-500 to-cyan-600",
    },
    {
      title: "Đơn đang xử lý",
      value: stats.pending_orders,
      icon: Clock,
      color: "from-orange-500 to-amber-600",
    },
    {
      title: "Tổng món ăn",
      value: stats.total_menu_items,
      icon: Package,
      color: "from-purple-500 to-pink-600",
    },
  ];

  const getStatusBadge = (status) => {
    const variants = {
      completed: { label: "Hoàn thành", className: "bg-green-100 text-green-700" },
      pending: { label: "Chờ xử lý", className: "bg-yellow-100 text-yellow-700" },
      processing: { label: "Đang làm", className: "bg-blue-100 text-blue-700" },
    };
    return variants[status] || variants.pending;
  };

  const getTableStatus = (status) => {
    const variants = {
      available: { label: "Trống", className: "bg-green-100 text-green-700" },
      occupied: { label: "Có khách", className: "bg-red-100 text-red-700" },
      reserved: { label: "Đã đặt", className: "bg-orange-100 text-orange-700" },
    };
    return variants[status] || variants.available;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Quay lại
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">M</span>
                </div>
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Minitake Demo
                  </span>
                  <p className="text-xs text-gray-500">Chế độ xem thử</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <QrCode className="h-3 w-3 mr-1" />
                Demo Mode
              </Badge>
              <Button
                onClick={() => navigate("/admin/register")}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                Đăng ký ngay
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dashboard Demo
          </h1>
          <p className="text-gray-600">
            Trải nghiệm giao diện quản lý Minitake với dữ liệu mẫu
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="orders">Đơn hàng</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="tables">Bàn</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={index}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
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
                      <div className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Hoạt động gần đây
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.slice(0, 3).map((order) => {
                    const statusInfo = getStatusBadge(order.status);
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{order.id}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-700">{order.table}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {order.items.join(", ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600 mb-1">
                            {order.total.toLocaleString("vi-VN")} đ
                          </p>
                          <Badge className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách đơn hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentOrders.map((order) => {
                    const statusInfo = getStatusBadge(order.status);
                    return (
                      <div
                        key={order.id}
                        className="p-4 border rounded-lg hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">
                                {order.id}
                              </h3>
                              <Badge className={statusInfo.className}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {order.table} • {order.time}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">
                              {order.total.toLocaleString("vi-VN")} đ
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-700">
                            <strong>Món:</strong> {order.items.join(", ")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách món ăn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg ${
                        item.available
                          ? "hover:border-emerald-300"
                          : "opacity-60 bg-gray-50"
                      } transition-colors`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {item.category}
                          </p>
                        </div>
                        {item.available ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <p className="text-xl font-bold text-emerald-600">
                          {item.price.toLocaleString("vi-VN")} đ
                        </p>
                        <Badge
                          className={
                            item.available
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {item.available ? "Còn hàng" : "Hết hàng"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý bàn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {tables.map((table) => {
                    const statusInfo = getTableStatus(table.status);
                    return (
                      <div
                        key={table.id}
                        className={`p-6 border-2 rounded-xl text-center transition-all cursor-pointer ${
                          table.status === "available"
                            ? "border-green-300 hover:border-green-500 hover:shadow-lg"
                            : table.status === "occupied"
                              ? "border-red-300 hover:border-red-500"
                              : "border-orange-300 hover:border-orange-500"
                        }`}
                      >
                        <div className="text-3xl font-bold mb-2 text-gray-700">
                          {table.number.split(" ")[1]}
                        </div>
                        <Badge className={`${statusInfo.className} w-full`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA Banner */}
        <Card className="mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 border-none text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-3">
              Thích giao diện này?
            </h2>
            <p className="text-emerald-50 mb-6 text-lg">
              Đăng ký ngay để sử dụng đầy đủ tính năng Minitake cho quán của bạn
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-emerald-600 hover:bg-gray-100"
                onClick={() => navigate("/admin/register")}
              >
                Đăng ký miễn phí
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-emerald-700"
                onClick={() => navigate("/")}
              >
                Tìm hiểu thêm
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DemoPage;
