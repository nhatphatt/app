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
import { Loader2, Store, Coffee, Sparkles, Rocket } from "lucide-react";

const AdminRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    store_name: "",
    store_slug: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.store_slug)) {
      toast.error("Slug chỉ được chứa chữ thường, số và dấu gạch ngang");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/register", formData);
      setAuthToken(response.data.access_token);
      setAuthUser(response.data.user);
      toast.success("Đăng ký thành công!");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
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
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 backdrop-blur-sm bg-white/95 animate-fade-in-up">
        {/* Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-lg blur-lg opacity-20 group-hover:opacity-30 transition duration-1000"></div>

        <div className="relative">
          <CardHeader className="text-center space-y-4 pb-6">
            {/* Logo with gradient background */}
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 rounded-3xl flex items-center justify-center mb-2 shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Rocket className="w-10 h-10 text-white relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
            </div>

            {/* Title with gradient text */}
            <div>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Bắt đầu với Minitake
              </CardTitle>
              <p className="text-sm text-emerald-600/80 font-medium mt-1">
                Tạo cửa hàng trong vài phút
              </p>
            </div>

            <CardDescription className="text-base text-gray-600">
              Quản lý nhà hàng thông minh và hiện đại
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="h-11 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300"
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
                  className="h-11 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Mật khẩu
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                  className="h-11 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300"
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Thông tin cửa hàng
                  </span>
                </div>

                <div className="space-y-4">
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
                      className="h-11 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300"
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
                          store_slug: e.target.value.toLowerCase(),
                        })
                      }
                      required
                      className="h-11 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300"
                    />
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Coffee className="w-3 h-3" />
                      Menu khách hàng:{" "}
                      <span className="font-mono text-emerald-600">
                        /menu/{formData.store_slug || "slug-cua-ban"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 mt-6"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Đang tạo cửa hàng...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-5 w-5" />
                    Tạo cửa hàng miễn phí
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
            </div>

            <div className="text-center">
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
