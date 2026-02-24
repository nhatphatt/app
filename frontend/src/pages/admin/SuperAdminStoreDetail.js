import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useLoading } from "../../contexts/LoadingContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Building, Mail, Calendar, UtensilsCrossed, ShoppingCart,
  DollarSign, Crown, Layers, Users, Settings, TableProperties, Tag, ExternalLink,
} from "lucide-react";
import api from "@/utils/api";
import { toast } from "sonner";
import { getAuthUser, removeAuthToken, removeAuthUser } from "@/utils/auth";

const SuperAdminStoreDetail = () => {
  const { storeId } = useParams();
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
    fetchStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const fetchStore = async () => {
    showLoading("Đang tải...");
    try {
      const res = await api.get(`/super-admin/stores/${storeId}`);
      setData(res.data);
    } catch (error) {
      toast.error("Không thể tải thông tin cửa hàng");
      navigate("/super-admin/users");
    } finally {
      hideLoading();
    }
  };

  if (!data) return null;

  const stats = data.stats || {};

  const statCards = [
    { label: "Món ăn", value: stats.menu_items, icon: UtensilsCrossed, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Danh mục", value: stats.categories, icon: Layers, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Bàn", value: stats.tables, icon: TableProperties, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Đơn hàng", value: stats.orders, icon: ShoppingCart, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Doanh thu", value: `${Number(stats.total_revenue || 0).toLocaleString()}đ`, icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Khuyến mãi", value: stats.promotions, icon: Tag, color: "text-pink-600", bg: "bg-pink-50" },
  ];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin/users")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{data.name}</h1>
            <Badge className={data.plan_id === "pro" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}>
              {data.plan_id === "pro" ? "Pro" : "Starter"}
            </Badge>
            {data.is_suspended === 1 && <Badge variant="destructive">Bị khóa</Badge>}
          </div>
          <p className="text-sm text-gray-500 mt-1">/{data.slug}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`https://minitake-app.pages.dev/menu/${data.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> Xem menu
          </a>
        </Button>
      </div>

      {/* Store Info + Owner */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" /> Thông tin cửa hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Tên</span><span className="font-medium">{data.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Slug</span><span className="font-medium">{data.slug}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Địa chỉ</span><span className="font-medium">{data.address || "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">SĐT</span><span className="font-medium">{data.phone || "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Gói</span><span className="font-medium">{data.plan_id === "pro" ? "Pro" : "Starter"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Max bàn</span><span className="font-medium">{data.max_tables || "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ngày tạo</span><span className="font-medium">{formatDate(data.created_at)}</span></div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Chủ cửa hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.owner ? (
              <>
                <div className="flex justify-between"><span className="text-gray-500">Tên</span><span className="font-medium">{data.owner.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{data.owner.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Vai trò</span><span className="font-medium">{data.owner.role}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ngày tạo TK</span><span className="font-medium">{formatDate(data.owner.created_at)}</span></div>
              </>
            ) : (
              <p className="text-gray-400 text-center py-4">Không tìm thấy chủ cửa hàng</p>
            )}

            {data.subscription && (
              <>
                <hr className="my-2" />
                <div className="flex justify-between"><span className="text-gray-500">Subscription</span><Badge className="bg-emerald-100 text-emerald-700">{data.subscription.status}</Badge></div>
                <div className="flex justify-between"><span className="text-gray-500">Bắt đầu</span><span className="font-medium">{formatDate(data.subscription.start_date)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Kết thúc</span><span className="font-medium">{formatDate(data.subscription.end_date)}</span></div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Settings */}
      {data.settings && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" /> Cài đặt cửa hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {Object.entries(data.settings)
                .filter(([k]) => !["id", "store_id", "created_at", "updated_at"].includes(k))
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">{key}</span>
                    <span className="font-medium text-white max-w-[200px] truncate">
                      {value === null || value === "" ? "—" : typeof value === "boolean" || value === 0 || value === 1 ? (value ? "Bật" : "Tắt") : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tables */}
      {data.tables?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TableProperties className="h-4 w-4" /> Danh sách bàn ({data.tables.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {data.tables.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
                  <span className="font-medium">{t.table_number}</span>
                  <Badge className={t.status === "occupied" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"} variant="outline">
                    {t.status === "occupied" ? "Mở" : "Trống"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      {data.recent_orders?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Đơn hàng gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recent_orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">{o.customer_name || "Khách"}</span>
                    {o.table_number && <span className="text-gray-400 ml-2">• Bàn {o.table_number}</span>}
                    <span className="text-gray-400 ml-2">• {formatDate(o.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-600">{Number(o.total || 0).toLocaleString()}đ</span>
                    <Badge className={
                      o.status === "completed" ? "bg-green-100 text-green-700" :
                      o.status === "preparing" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    } variant="outline">
                      {o.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SuperAdminStoreDetail;
