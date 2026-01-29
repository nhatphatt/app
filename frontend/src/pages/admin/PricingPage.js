import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Zap, Crown, Sparkles } from "lucide-react";
import api from "@/utils/api";
import { toast } from "sonner";

const PricingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch current subscription
      const subRes = await api.get("/subscriptions/current");
      setCurrentSubscription(subRes.data);

      // Fetch plans
      const plansRes = await api.get("/subscriptions/plans");
      setPlans(plansRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleSelectPlan = async (planId) => {
    if (planId === "starter") {
      toast.info("Bạn đang sử dụng gói STARTER miễn phí");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/subscriptions/create-checkout", {
        plan_id: planId
      });

      if (response.data.checkout_url) {
        // Redirect to PayOS checkout
        window.location.href = response.data.checkout_url;
      } else {
        toast.error("Không thể tạo thanh toán");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Lỗi thanh toán");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateTrial = async () => {
    setLoading(true);
    try {
      const response = await api.post("/subscriptions/activate-trial");
      toast.success("Kích hoạt trial PRO 14 ngày thành công!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Lỗi kích hoạt trial");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const isPro = currentSubscription?.plan_id === "pro";
  const isTrial = currentSubscription?.status === "trial";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Chọn gói phù hợp cho cửa hàng của bạn
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Nâng cấp lên PRO để mở khóa đầy đủ tính năng thông minh cho nhà hàng của bạn
          </p>

          {/* Current Plan Badge */}
          {currentSubscription && (
            <div className="mt-6">
              <Badge variant={isPro ? "default" : "secondary"} className="text-sm px-4 py-2">
                {isTrial ? "🎁 Đang dùng thử PRO" : `Gói hiện tại: ${currentSubscription.plan_name || currentSubscription.plan_id?.toUpperCase()}`}
              </Badge>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* STARTER Plan */}
          <Card className={`relative border-2 transition-all duration-300 ${!isPro ? "border-emerald-500 shadow-xl" : "border-slate-200 shadow-lg opacity-75"}`}>
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-slate-600" />
              </div>
              <CardTitle className="text-2xl font-bold">STARTER</CardTitle>
              <CardDescription className="text-slate-600">
                Dành cho cửa hàng nhỏ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-slate-900">Miễn phí</span>
                <p className="text-sm text-slate-500 mt-1">Mãi mãi</p>
              </div>

              <ul className="space-y-3">
                {[
                  { text: "Tối đa 10 bàn", included: true },
                  { text: "QR Menu cơ bản", included: true },
                  { text: "Báo cáo doanh thu", included: true },
                  { text: "Thanh toán online", included: true },
                  { text: "AI Chatbot", included: false },
                  { text: "Báo cáo AI nâng cao", included: false },
                  { text: "Không giới hạn bàn", included: false },
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${feature.included ? "bg-emerald-100" : "bg-slate-100"}`}>
                      {feature.included ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <span className="text-slate-400 text-xs">×</span>
                      )}
                    </div>
                    <span className={feature.included ? "text-slate-700" : "text-slate-400"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={isPro ? "outline" : "default"}
                className="w-full h-12 mt-6"
                disabled={!isPro && currentSubscription}
                onClick={() => handleSelectPlan("starter")}
              >
                {isPro ? "Đang sử dụng" : currentSubscription ? "Gói hiện tại" : "Bắt đầu miễn phí"}
              </Button>
            </CardContent>
          </Card>

          {/* PRO Plan */}
          <Card className="relative border-2 border-violet-500 shadow-xl overflow-hidden">
            {/* Popular Badge */}
            <div className="absolute top-0 right-0 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              PHỔ BIẾN NHẤT
            </div>

            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-violet-600" />
              </div>
              <CardTitle className="text-2xl font-bold">PRO</CardTitle>
              <CardDescription className="text-violet-600">
                Đầy đủ tính năng thông minh
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-violet-600">199.000</span>
                <span className="text-lg text-slate-500"> VNĐ</span>
                <p className="text-sm text-slate-500 mt-1">/ tháng (chưa VAT)</p>
                <p className="text-sm text-violet-600 font-medium mt-1">
                  {formatCurrency(218900)} VNĐ/tháng (đã VAT)
                </p>
              </div>

              <ul className="space-y-3">
                {[
                  { text: "Không giới hạn bàn", included: true },
                  { text: "QR Menu cơ bản", included: true },
                  { text: "Báo cáo doanh thu", included: true },
                  { text: "Thanh toán online", included: true },
                  { text: "AI Chatbot thông minh", included: true },
                  { text: "Báo cáo AI nâng cao", included: true },
                  { text: "Hỗ trợ ưu tiên", included: true },
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${feature.included ? "bg-violet-100" : "bg-slate-100"}`}>
                      {feature.included ? (
                        <Check className="w-3 h-3 text-violet-600" />
                      ) : (
                        <span className="text-slate-400 text-xs">×</span>
                      )}
                    </div>
                    <span className={feature.included ? "text-slate-700" : "text-slate-400"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {isPro ? (
                <div className="space-y-3 mt-6">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-violet-200 text-violet-600 hover:bg-violet-50"
                    disabled
                  >
                    ✓ Đang sử dụng PRO
                  </Button>
                  {isTrial && (
                    <p className="text-xs text-center text-amber-600">
                      Trial hết hạn: {currentSubscription?.trial_ends_at}
                    </p>
                  )}
                </div>
              ) : currentSubscription && !isTrial ? (
                <Button
                  variant="default"
                  className="w-full h-12 mt-6 bg-violet-600 hover:bg-violet-700"
                  onClick={() => handleSelectPlan("pro")}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Nâng cấp lên PRO"}
                </Button>
              ) : (
                <div className="space-y-3 mt-6">
                  <Button
                    variant="default"
                    className="w-full h-12 bg-violet-600 hover:bg-violet-700"
                    onClick={handleActivateTrial}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" /> Dùng thử PRO 14 ngày MIỄN PHÍ</>}
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    Không cần thẻ, dùng thử đầy đủ tính năng PRO
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-6 text-slate-500 text-sm">
            <span>✓ Thanh toán an toàn qua PayOS</span>
            <span>✓ Hủy bất cứ lúc nào</span>
            <span>✓ Hỗ trợ 24/7</span>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
            ← Quay lại Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
