import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, User, Phone, Loader2 } from "lucide-react";
import api from "@/utils/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useLoading } from "../../contexts/LoadingContext";

const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    fetchOrders();
    // Refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get("/orders");
      setOrders(response.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      hideLoading();
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success("Cập nhật trạng thái thành công");
      fetchOrders();
    } catch (error) {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        label: "Chờ xử lý",
        variant: "outline",
        color: "text-yellow-600",
      },
      preparing: {
        label: "Đang chuẩn bị",
        variant: "outline",
        color: "text-blue-600",
      },
      ready: { label: "Sẵn sàng", variant: "outline", color: "text-green-600" },
      completed: {
        label: "Hoàn thành",
        variant: "outline",
        color: "text-gray-600",
      },
      cancelled: { label: "Đã hủy", variant: "outline", color: "text-red-600" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getPaymentMethodBadge = (method) => {
    const methodConfig = {
      cash: { label: "Tiền mặt", color: "text-green-600 bg-green-50" },
      bank_qr: { label: "Chuyển khoản", color: "text-blue-600 bg-blue-50" },
      momo: { label: "MoMo", color: "text-pink-600 bg-pink-50" },
      zalopay: { label: "ZaloPay", color: "text-cyan-600 bg-cyan-50" },
      vnpay: { label: "VNPay", color: "text-orange-600 bg-orange-50" },
      pending: { label: "Chưa chọn", color: "text-gray-600 bg-gray-50" },
      unknown: { label: "Khác", color: "text-gray-600 bg-gray-50" },
    };
    const config = methodConfig[method] || methodConfig.unknown;
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };


  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Quản lý Đơn hàng
          </h1>
          <p className="text-gray-600">Theo dõi và xử lý đơn hàng</p>
        </div>
        <Button onClick={fetchOrders} variant="outline">
          Làm mới
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Chưa có đơn hàng nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <span className="text-lg">#{order.id.slice(0, 8)}</span>
                    {getStatusBadge(order.status)}
                    {getPaymentMethodBadge(order.payment_method || "pending")}
                  </CardTitle>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", {
                      locale: vi,
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {order.customer_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{order.customer_name}</span>
                    </div>
                  )}
                  {order.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{order.customer_phone}</span>
                    </div>
                  )}
                  {order.table_number && (
                    <div className="text-gray-600">
                      Bàn:{" "}
                      <span className="font-medium">{order.table_number}</span>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Chi tiết đơn hàng:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-medium">
                          {(item.price * item.quantity).toLocaleString("vi-VN")}{" "}
                          đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note */}
                {order.note && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    <span className="font-medium">Ghi chú:</span> {order.note}
                  </div>
                )}

                {/* Total & Actions */}
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-xl font-bold text-emerald-600">
                    Tổng: {order.total.toLocaleString("vi-VN")} đ
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={order.status}
                      onValueChange={(value) =>
                        handleStatusChange(order.id, value)
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Chờ xử lý</SelectItem>
                        <SelectItem value="completed">Hoàn thành</SelectItem>
                        <SelectItem value="cancelled">Đã hủy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
