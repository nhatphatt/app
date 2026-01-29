import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/utils/api";
import { setAuthToken, setAuthUser } from "@/utils/auth";
import {
  Loader2,
  Store,
  Coffee,
  Check,
  Crown,
  Zap,
  CreditCard,
  ArrowLeft,
  Home,
} from "lucide-react";

const AdminRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Select Plan, 3: Payment
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    store_name: "",
    store_slug: "",
    plan_id: "starter", // starter or pro
  });
  const [paymentData, setPaymentData] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const plans = [
    {
      id: "starter",
      name: " Gói STARTER",
      price: "Miễn phí",
      description: "Dành cho cửa hàng nhỏ",
      features: [
        "Tối đa 10 bàn",
        "Menu QR cơ bản",
        "Báo cáo đơn giản",
        "Thanh toán tiền mặt",
      ],
      icon: Zap,
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "pro",
      name: " Gói PRO",
      price: "199.000₫ / tháng",
      originalPrice: "218.900₫ (VAT)",
      description: "Dành cho cửa hàng phát triển",
      features: [
        "Không giới hạn bàn",
        "AI Chatbot hỗ trợ",
        "Báo cáo AI nâng cao",
        "Thanh toán PayOS (MoMo, ZaloPay, VNPay)",
        "Hỗ trợ ưu tiên",
      ],
      icon: Crown,
      color: "from-amber-500 to-orange-500",
      popular: true,
    },
  ];

  const handleSubmitInfo = async (e) => {
    e.preventDefault();

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.store_slug)) {
      toast.error("Slug chỉ được chứa chữ thường, số và dấu gạch ngang");
      return;
    }

    setLoading(true);

    try {
      // Check if email and slug are available
      await api.post("/auth/check-availability", {
        email: formData.email,
        store_slug: formData.store_slug,
      });
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Kiểm tra thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId) => {
    setFormData({ ...formData, plan_id: planId });
    setStep(3);
  };

  const handleRegisterWithPayment = async () => {
    setProcessingPayment(true);

    try {
      if (formData.plan_id === "starter") {
        // Direct registration for STARTER
        await registerUser();
      } else {
        // Create checkout for PRO (no auth required for new registration)
        const response = await api.post("/subscriptions/create-checkout-for-registration", {
          plan_id: "pro",
          store_name: formData.store_name,
          store_slug: formData.store_slug,
          buyer_email: formData.email,
          buyer_name: formData.name,
          password: formData.password,
        });

        if (response.data.success && response.data.checkout_url) {
          // Store pending_id for completion after payment
          localStorage.setItem("pending_registration_id", response.data.pending_id);
          // Redirect to PayOS
          window.location.href = response.data.checkout_url;
        } else {
          throw new Error(response.data.detail || "Failed to create checkout");
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Đã xảy ra lỗi");
      setProcessingPayment(false);
    }
  };

  const registerUser = async () => {
    setLoading(true);

    try {
      const response = await api.post("/auth/register", {
        ...formData,
        // If PRO, the store will be created with PRO plan after payment
        // For now, create with STARTER plan, will upgrade after payment
      });

      setAuthToken(response.data.access_token);
      setAuthUser(response.data.user);
      toast.success("Đăng ký thành công!");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Đăng ký thất bại");
    } finally {
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  // Check for payment return from PayOS
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get("payment");
    const pendingId = urlParams.get("pending_id");

    if ((payment === "success" || payment === "mock") && pendingId) {
      // Complete registration after successful payment
      const completeRegistration = async () => {
        setLoading(true);
        try {
          const response = await api.post("/auth/complete-registration", {
            pending_id: pendingId,
          });

          setAuthToken(response.data.access_token);
          setAuthUser(response.data.user);
          toast.success("Đăng ký thành công với gói PRO!");
          navigate("/admin/dashboard");
        } catch (error) {
          toast.error(error.response?.data?.detail || "Hoàn tất đăng ký thất bại");
        } finally {
          setLoading(false);
        }
      };

      completeRegistration();
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Back to Home Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-emerald-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 group backdrop-blur-sm"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
        <Home className="w-4 h-4" />
        <span className="font-medium">Trang chủ</span>
      </Link>

      {/* Back Button */}
      <button
        onClick={() => step > 1 && setStep(step - 1)}
        className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 group backdrop-blur-sm"
        disabled={step === 1}
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
        <span className="font-medium">Quay lại</span>
      </button>

      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100"></div>

      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(20, 184, 166, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 40% 20%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)`,
          }}
        ></div>
      </div>

      {/* Decorative Elements - Mountains */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        {/* Back Mountain */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 300" className="w-full h-auto opacity-20">
            <path
              d="M0,200 Q200,120 400,160 T800,140 T1200,180 L1200,300 L0,300 Z"
              fill="url(#gradient1)"
            />
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop
                  offset="0%"
                  style={{ stopColor: "#10b981", stopOpacity: 0.3 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "#14b8a6", stopOpacity: 0.1 }}
                />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Front Mountain */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 250" className="w-full h-auto opacity-30">
            <path
              d="M0,150 Q300,80 600,120 T1200,130 L1200,250 L0,250 Z"
              fill="url(#gradient2)"
            />
            <defs>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop
                  offset="0%"
                  style={{ stopColor: "#059669", stopOpacity: 0.4 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "#0d9488", stopOpacity: 0.2 }}
                />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Decorative Elements - Clouds */}
      <div className="absolute top-20 left-10 w-32 h-16 bg-white/20 rounded-full blur-xl animate-float"></div>
      <div className="absolute top-32 right-20 w-40 h-20 bg-white/15 rounded-full blur-xl animate-float-delay"></div>
      <div className="absolute top-40 left-1/3 w-28 h-14 bg-white/10 rounded-full blur-xl animate-float-slow"></div>

      {/* Moon */}
      <div className="absolute top-12 right-12 w-24 h-24 bg-gradient-to-br from-yellow-100 to-amber-200 rounded-full opacity-40 blur-sm"></div>
      <div className="absolute top-14 right-14 w-20 h-20 bg-gradient-to-br from-yellow-50 to-amber-100 rounded-full opacity-60"></div>

      {/* Register Card */}
      <Card className="w-full max-w-lg relative z-10 shadow-2xl border-0 backdrop-blur-sm bg-white/95 animate-fade-in-up">
        {/* Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-lg blur-lg opacity-20"></div>

        <div className="relative">
          <CardHeader className="text-center space-y-4 pb-6">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {step === 1 && "Tạo cửa hàng của bạn"}
                {step === 2 && "Chọn gói dịch vụ"}
                {step === 3 && "Xác nhận đăng ký"}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {step === 1 && "Nhập thông tin cửa hàng"}
                {step === 2 && "Chọn gói phù hợp với bạn"}
                {step === 3 && formData.plan_id === "pro"
                  ? "Thanh toán để kích hoạt gói PRO"
                  : "Hoàn tất đăng ký"}
              </p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mt-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    step >= s
                      ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {step === 1 && (
              <form onSubmit={handleSubmitInfo} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 font-medium">
                    Tên của bạn
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="h-12 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@minitake.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="h-12 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Mật khẩu
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Tối thiểu 8 ký tự"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    minLength={6}
                    className="h-12 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="store_name"
                    className="text-gray-700 font-medium"
                  >
                    Tên cửa hàng
                  </Label>
                  <Input
                    id="store_name"
                    type="text"
                    placeholder="Quán Cafe ABC"
                    value={formData.store_name}
                    onChange={(e) =>
                      setFormData({ ...formData, store_name: e.target.value })
                    }
                    required
                    className="h-12 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="store_slug"
                    className="text-gray-700 font-medium"
                  >
                    URL cửa hàng (Slug)
                  </Label>
                  <Input
                    id="store_slug"
                    type="text"
                    placeholder="cafe-abc"
                    value={formData.store_slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        store_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                      })
                    }
                    required
                    className="h-12 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300 font-mono"
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Coffee className="w-3 h-3" />
                    Menu: /menu/{formData.store_slug || "slug-cua-ban"}
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Đang kiểm tra...
                    </>
                  ) : (
                    "Tiếp tục"
                  )}
                </Button>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {plans.map((plan) => {
                  const Icon = plan.icon;
                  const isSelected = formData.plan_id === plan.id;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-4 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded">
                          Phổ biến
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${plan.color}`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800">
                              {plan.name}
                            </h3>
                            <div className="text-right">
                              <p className="font-bold text-gray-800">
                                {plan.price}
                              </p>
                              {plan.originalPrice && (
                                <p className="text-xs text-gray-400 line-through">
                                  {plan.originalPrice}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {plan.description}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {plan.features.map((feature, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1 text-xs text-gray-600"
                              >
                                <Check className="w-3 h-3 text-emerald-500" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-12 border-gray-200 hover:bg-gray-50 text-gray-600"
                  >
                    Quay lại
                  </Button>
                  <Button
                    onClick={handleRegisterWithPayment}
                    className={`flex-1 h-12 ${
                      formData.plan_id === "pro"
                        ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white"
                        : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white"
                    } font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300`}
                    disabled={processingPayment}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : formData.plan_id === "pro" ? (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Thanh toán {plans[1].price}
                      </>
                    ) : (
                      "Đăng ký ngay"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && formData.plan_id === "pro" && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                  <Crown className="w-12 h-12 text-amber-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-800">Gói PRO</h3>
                  <p className="text-2xl font-bold text-amber-600">
                    {plans[1].price}
                  </p>
                  <p className="text-xs text-gray-500">
                    {plans[1].originalPrice}
                  </p>
                </div>

                <div className="text-sm text-gray-600 space-y-2">
                  <p>Bạn sẽ được hưởng:</p>
                  <ul className="text-left space-y-1">
                    {plans[1].features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 h-12 border-gray-200 hover:bg-gray-50 text-gray-600"
                    disabled={processingPayment}
                  >
                    Quay lại
                  </Button>
                  <Button
                    onClick={handleRegisterWithPayment}
                    className="flex-1 h-12 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    disabled={processingPayment}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang chuyển...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Thanh toán & Đăng ký
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-gray-400">
                  Thanh toán an toàn qua PayOS
                  <br />
                  (MoMo, ZaloPay, VNPay, thẻ ngân hàng)
                </p>
              </div>
            )}

            {step === 3 && formData.plan_id === "starter" && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                  <Zap className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-800">Gói STARTER</h3>
                  <p className="text-2xl font-bold text-emerald-600">Miễn phí</p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 h-12 border-gray-200 hover:bg-gray-50 text-gray-600"
                  >
                    Quay lại
                  </Button>
                  <Button
                    onClick={handleRegisterWithPayment}
                    className="flex-1 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang đăng ký...
                      </>
                    ) : (
                      "Hoàn tất đăng ký"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center pt-4 border-t border-gray-100">
              <span className="text-gray-600 text-sm">Đã có tài khoản? </span>
              <Link
                to="/admin/login"
                className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm hover:underline transition-all duration-200"
              >
                Đăng nhập ngay
              </Link>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Floating particles effect */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        @keyframes float-delay {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
        }
        @keyframes pulse-slower {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delay {
          animation: float-delay 7s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-pulse-slower {
          animation: pulse-slower 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AdminRegister;
