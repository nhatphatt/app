import React, { useState, useEffect } from "react";
import { useLoading } from "../../contexts/LoadingContext";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/utils/api";

const PaymentsManagement = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const { showLoading, hideLoading } = useLoading();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    total_amount: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    showLoading('Đang tải dữ liệu...');
    try {
      const response = await api.get("/payments");
      setPayments(response.data || []);

      // Calculate stats
      const pending = response.data.filter((p) => p.status === "pending").length;
      const paid = response.data.filter((p) => p.status === "paid").length;
      const totalAmount = response.data
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      setStats({
        total: response.data.length,
        pending,
        paid,
        total_amount: totalAmount,
      });
    } catch (error) {
      toast.error("Không thể tải danh sách thanh toán");
    } finally {
      hideLoading();
    }
  };

  const handleConfirmCashPayment = async (paymentId) => {
    try {
      await api.post(`/payments/${paymentId}/confirm`, {
        note: "Xác nhận thanh toán tiền mặt",
      });
      toast.success("Đã xác nhận thanh toán");
      fetchPayments();
    } catch (error) {
      toast.error("Không thể xác nhận thanh toán");
    }
  };

  const handleViewDetail = (payment) => {
    setSelectedPayment(payment);
    setDetailOpen(true);
  };

  const filteredPayments = payments.filter((payment) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.order_id?.toLowerCase().includes(searchLower) ||
      payment.id?.toLowerCase().includes(searchLower) ||
      payment.customer_name?.toLowerCase().includes(searchLower) ||
      payment.customer_phone?.includes(searchTerm)
    );
  });

  const getStatusBadge = (status) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
      processing: "bg-blue-100 text-blue-800",
    };

    const labels = {
      pending: "Chờ thanh toán",
      paid: "Đã thanh toán",
      cancelled: "Đã hủy",
      expired: "Hết hạn",
      processing: "Đang xử lý",
    };

    return (
      <Badge className={variants[status] || "bg-gray-100"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPaymentMethodBadge = (method) => {
    const labels = {
      cash: "Tiền mặt",
      bank_qr: "QR Ngân hàng",
      payos: "PayOS",
      momo: "MoMo",
      zalopay: "ZaloPay",
      vnpay: "VNPay",
    };

    const variants = {
      cash: "bg-gray-100 text-gray-800",
      bank_qr: "bg-blue-100 text-blue-800",
      payos: "bg-violet-100 text-violet-800",
      momo: "bg-pink-100 text-pink-800",
      zalopay: "bg-blue-100 text-blue-800",
      vnpay: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={variants[method] || "bg-gray-100"}>
        {labels[method] || method}
      </Badge>
    );
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("vi-VN");
    } catch {
      return "-";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Quản lý Thanh toán
          </h2>
          <p className="text-slate-600">
            Xem và quản lý tất cả thanh toán đơn hàng
          </p>
        </div>
        <Button onClick={fetchPayments} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Tổng số
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Chờ thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Đã thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Tổng doanh thu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.total_amount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Tìm kiếm theo mã đơn, tên, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã thanh toán</TableHead>
              <TableHead>Đơn hàng</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Phương thức</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Không có thanh toán nào
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-sm">
                    {payment.id?.substring(0, 12)}...
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {payment.order_id?.substring(0, 12)}...
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.customer_name || "-"}</div>
                      <div className="text-sm text-slate-500">
                        {payment.customer_phone || "-"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>{getPaymentMethodBadge(payment.payment_method)}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(payment.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(payment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {payment.payment_method === "cash" &&
                        payment.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleConfirmCashPayment(payment.id)
                            }
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Payment Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết thanh toán</DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Mã thanh toán</Label>
                  <p className="font-mono text-sm">{selectedPayment.id}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Mã đơn hàng</Label>
                  <p className="font-mono text-sm">{selectedPayment.order_id}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Số tiền</Label>
                  <p className="font-bold text-lg text-green-600">
                    {formatCurrency(selectedPayment.amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Phương thức</Label>
                  <p>{getPaymentMethodBadge(selectedPayment.payment_method)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Trạng thái</Label>
                  <p>{getStatusBadge(selectedPayment.status)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Ngày tạo</Label>
                  <p className="text-sm">{formatDate(selectedPayment.created_at)}</p>
                </div>
              </div>

              {selectedPayment.paid_at && (
                <div>
                  <Label className="text-slate-500">Ngày thanh toán</Label>
                  <p className="text-sm">{formatDate(selectedPayment.paid_at)}</p>
                </div>
              )}

              {selectedPayment.bank_info && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <Label className="text-slate-500">Thông tin ngân hàng</Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Ngân hàng:</span>
                    <span className="font-medium">
                      {selectedPayment.bank_info.bank_name}
                    </span>
                    <span>Số TK:</span>
                    <span className="font-mono">
                      {selectedPayment.bank_info.account_number}
                    </span>
                    <span>Nội dung:</span>
                    <span className="font-mono text-primary font-bold">
                      {selectedPayment.bank_info.content}
                    </span>
                  </div>
                </div>
              )}

              {selectedPayment.gateway_response && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <Label className="text-slate-500 mb-2 block">
                    Phản hồi từ cổng thanh toán
                  </Label>
                  <pre className="text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedPayment.gateway_response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsManagement;
