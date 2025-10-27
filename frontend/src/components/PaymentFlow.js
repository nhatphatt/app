import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Wallet,
  CreditCard,
  Loader2,
  Check,
  X,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const PaymentFlow = ({ order, onSuccess, onCancel, open }) => {
  const [step, setStep] = useState("select"); // select, processing, success, failed
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [polling, setPolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const paymentMethods = [
    {
      id: "cash",
      name: "Tiền mặt",
      icon: <Wallet className="h-6 w-6" />,
      description: "Thanh toán tại quầy",
      color: "bg-green-100 text-green-700",
    },
    {
      id: "bank_qr",
      name: "Chuyển khoản QR",
      icon: <QrCode className="h-6 w-6" />,
      description: "Quét mã QR ngân hàng",
      color: "bg-blue-100 text-blue-700",
    },
  ];

  // Countdown timer for QR expiry
  useEffect(() => {
    if (paymentData?.expires_at && step === "processing") {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(paymentData.expires_at).getTime();
        const diff = expiry - now;

        if (diff <= 0) {
          clearInterval(interval);
          setStep("failed");
          toast.error("Mã thanh toán đã hết hạn");
        } else {
          setTimeLeft(Math.floor(diff / 1000));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [paymentData, step]);

  const handleSelectMethod = async (method) => {
    setSelectedMethod(method);
    setStep("processing");

    try {
      const response = await axios.post(`${API_BASE}/payments/initiate`, {
        order_id: order.id,
        payment_method: method.id,
        customer_info: {
          name: order.customer_name,
          phone: order.customer_phone,
        },
      });

      setPaymentData(response.data);

      // Start polling for non-cash payments
      if (method.id !== "cash") {
        startPolling(response.data.payment_id);
      }
    } catch (error) {
      toast.error("Không thể khởi tạo thanh toán");
      setStep("failed");
    }
  };

  const startPolling = (paymentId) => {
    setPolling(true);

    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(
          `${API_BASE}/payments/${paymentId}/poll`,
        );

        if (response.data.status === "paid") {
          clearInterval(pollInterval);
          setPolling(false);
          setStep("success");
          toast.success("Thanh toán thành công!");
          setTimeout(() => onSuccess(response.data), 2000);
        } else if (
          response.data.status === "expired" ||
          response.data.status === "failed"
        ) {
          clearInterval(pollInterval);
          setPolling(false);
          setStep("failed");
        }
      } catch (error) {
        // Polling error - will retry on next interval
      }
    }, 3000);

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">Chọn phương thức thanh toán</h3>
        <div className="text-3xl font-bold text-emerald-600">
          {order.total.toLocaleString("vi-VN")} đ
        </div>
      </div>

      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => handleSelectMethod(method)}
            className="w-full p-4 border-2 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 flex items-center gap-4 transition-all group"
          >
            <div className={`p-3 rounded-lg ${method.color}`}>
              {method.icon}
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-lg group-hover:text-emerald-700">
                {method.name}
              </p>
              <p className="text-sm text-gray-500">{method.description}</p>
            </div>
            <div className="text-emerald-600">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCashPayment = () => (
    <div className="text-center space-y-6 py-4">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
        <Wallet className="h-12 w-12 text-green-600" />
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-2">Thanh toán tiền mặt</h3>
        <p className="text-gray-600 mb-4">Vui lòng thanh toán số tiền</p>
        <div className="text-4xl font-bold text-emerald-600 mb-2">
          {order.total.toLocaleString("vi-VN")} đ
        </div>
        <p className="text-sm text-gray-500">tại quầy thu ngân</p>
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          <p className="font-medium text-yellow-800">Đang chờ xác nhận</p>
        </div>
        <p className="text-sm text-yellow-700">
          Nhân viên sẽ xác nhận thanh toán của bạn
        </p>
      </div>

      <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />

      <p className="text-xs text-gray-400">
        Bàn: <strong>{order.table_number}</strong>
      </p>
    </div>
  );

  const renderQRPayment = () => (
    <div className="text-center space-y-4">
      <h3 className="text-xl font-bold">Quét mã QR để thanh toán</h3>

      <div className="bg-white p-4 rounded-xl border-2 inline-block shadow-lg">
        {paymentData?.qr_code_url ? (
          <img
            src={paymentData.qr_code_url}
            alt="QR Code thanh toán"
            className="w-64 h-64"
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
            <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-3xl font-bold text-emerald-600">
          {order.total.toLocaleString("vi-VN")} đ
        </div>

        {paymentData?.bank_info && (
          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-500">Ngân hàng:</span>
              <span className="col-span-2 font-semibold">
                {paymentData.bank_info.bank_name}
              </span>

              <span className="text-gray-500">Số TK:</span>
              <span className="col-span-2 font-mono font-semibold">
                {paymentData.bank_info.account_number}
              </span>

              <span className="text-gray-500">Chủ TK:</span>
              <span className="col-span-2 font-semibold">
                {paymentData.bank_info.account_name}
              </span>

              <span className="text-gray-500">Nội dung:</span>
              <span className="col-span-2 font-mono text-emerald-600 font-bold">
                {paymentData.bank_info.content}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 justify-center mb-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <p className="font-medium text-blue-800">
            Đang chờ xác nhận thanh toán
          </p>
        </div>
        {timeLeft && (
          <p className="text-sm text-blue-600 font-mono">
            Hết hạn sau: {formatTime(timeLeft)}
          </p>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Vui lòng chuyển khoản đúng nội dung để hệ thống tự động xác nhận
      </p>

      {/* TEST BUTTON - Remove in production */}
      {process.env.NODE_ENV === "development" && paymentData && (
        <Button
          onClick={async () => {
            try {
              await axios.post(`${API_BASE}/webhooks/test-payment`, {
                payment_id: paymentData.payment_id,
                amount: order.total,
              });
              toast.success("✅ Test webhook sent! Đợi polling check...");
            } catch (error) {
              toast.error("❌ Test failed: " + error.message);
            }
          }}
          variant="outline"
          className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
        >
          🧪 TEST: Simulate Payment Success
        </Button>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-6 py-8">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
        <Check className="h-12 w-12 text-green-600" />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-green-600 mb-2">
          Thanh toán thành công!
        </h3>
        <p className="text-gray-600">Cảm ơn bạn đã sử dụng dịch vụ</p>
        <p className="text-sm text-gray-500 mt-2">
          Đơn hàng: <strong>{order.id?.substring(0, 8).toUpperCase()}</strong>
        </p>
      </div>
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
        <p className="text-green-800 font-medium">
          Hóa đơn đã được gửi đến nhà hàng
        </p>
      </div>
    </div>
  );

  const renderFailed = () => (
    <div className="text-center space-y-6 py-8">
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <X className="h-12 w-12 text-red-600" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-red-600 mb-2">
          Thanh toán thất bại
        </h3>
        <p className="text-gray-600">
          Vui lòng thử lại hoặc chọn phương thức khác
        </p>
      </div>
      <Button
        onClick={() => {
          setStep("select");
          setSelectedMethod(null);
          setPaymentData(null);
        }}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        Thử lại
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {step === "select" && renderMethodSelection()}
        {step === "processing" &&
          selectedMethod?.id === "cash" &&
          renderCashPayment()}
        {step === "processing" &&
          selectedMethod?.id === "bank_qr" &&
          renderQRPayment()}
        {step === "success" && renderSuccess()}
        {step === "failed" && renderFailed()}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentFlow;
