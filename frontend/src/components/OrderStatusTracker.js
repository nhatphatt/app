import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const OrderStatusTracker = ({ orderId, open, onClose }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!orderId || !open) return;

    // Fetch immediately
    fetchOrderStatus();

    // Poll every 5 seconds
    const interval = setInterval(() => {
      if (polling) {
        fetchOrderStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId, open, polling]);

  const fetchOrderStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/public/orders/${orderId}`);
      setOrder(response.data);

      // Stop polling if order is completed or cancelled
      if (
        response.data.status === "completed" ||
        response.data.status === "cancelled"
      ) {
        setPolling(false);
      }
    } catch (error) {
      toast.error("Không thể tải trạng thái đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: {
        label: "Chờ xử lý",
        icon: Clock,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        description: "Đơn hàng của bạn đang chờ nhà hàng xác nhận",
      },
      preparing: {
        label: "Đang chuẩn bị",
        icon: RefreshCw,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        description: "Nhà hàng đang chuẩn bị món ăn của bạn",
      },
      ready: {
        label: "Sẵn sàng",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "Món ăn đã sẵn sàng",
      },
      completed: {
        label: "Hoàn thành",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "Đơn hàng đã hoàn thành. Cảm ơn bạn!",
      },
      cancelled: {
        label: "Đã hủy",
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-100",
        description: "Đơn hàng đã bị hủy",
      },
    };

    return statusMap[status] || statusMap.pending;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    if (paymentStatus === "paid") {
      return (
        <Badge className="bg-green-100 text-green-700">✓ Đã thanh toán</Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-700">Chưa thanh toán</Badge>
    );
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) {
    return null;
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Trạng thái đơn hàng</span>
            {polling && (
              <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Đang cập nhật
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order ID */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Mã đơn hàng</p>
            <p className="text-lg font-mono font-semibold">
              #{order.id.substring(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Status Card */}
          <div
            className={`${statusInfo.bgColor} rounded-xl p-6 text-center space-y-3`}
          >
            <div className="flex justify-center">
              <div
                className={`w-16 h-16 ${statusInfo.bgColor} rounded-full flex items-center justify-center ${
                  polling && order.status === "pending" ? "animate-pulse" : ""
                }`}
              >
                <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
              </div>
            </div>
            <div>
              <h3 className={`text-xl font-bold ${statusInfo.color}`}>
                {statusInfo.label}
              </h3>
              <p className="text-sm text-gray-700 mt-2">
                {statusInfo.description}
              </p>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bàn:</span>
              <span className="font-semibold">
                {order.table_number || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Trạng thái thanh toán:
              </span>
              {getPaymentStatusBadge(order.payment_status)}
            </div>

            <div className="border-t pt-3">
              <p className="text-sm text-gray-600 mb-2">Chi tiết:</p>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium">
                      {(item.price * item.quantity).toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-semibold">Tổng cộng:</span>
              <span className="text-xl font-bold text-emerald-600">
                {order.total.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {/* Note */}
          {order.note && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Ghi chú:</strong> {order.note}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={fetchOrderStatus}
              variant="outline"
              className="flex-1"
              disabled={!polling}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              Đóng
            </Button>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-center text-gray-500">
            {polling
              ? "Trạng thái đơn hàng sẽ tự động cập nhật mỗi 5 giây"
              : "Đơn hàng đã hoàn tất"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderStatusTracker;
