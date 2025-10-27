import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ImageUpload from "@/components/ImageUpload";
import {
  QrCode,
  TrendingUp,
  Users,
  Sparkles,
  Building2,
  Check,
  ArrowRight,
  Target,
  Eye,
  Zap,
  ChevronRight,
} from "lucide-react";

const HomePage = () => {
  const navigate = useNavigate();
  const [logoImage, setLogoImage] = useState(null);

  const handleLogoImageChange = (imageUrl, file) => {
    setLogoImage(imageUrl);
    // Có thể upload lên server ở đây nếu cần
    console.log("Logo image changed:", file);
  };

  const features = [
    {
      icon: QrCode,
      title: "Gọi món & Thanh toán QR",
      description:
        "Khách hàng tự gọi món và thanh toán ngay tại bàn qua QR code. Menu linh hoạt, không cần thay đổi QR khi cập nhật.",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      icon: TrendingUp,
      title: "Báo cáo Thời gian Thực",
      description:
        "Theo dõi doanh thu, đơn hàng và hiệu suất kinh doanh theo thời gian thực với dashboard trực quan.",
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
    {
      icon: Users,
      title: "Quản lý Tài khoản",
      description:
        "Phân quyền chủ quán và nhân viên. Kiểm soát truy cập dễ dàng, bảo mật thông tin kinh doanh.",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
    {
      icon: Sparkles,
      title: "Gợi ý Món AI",
      description:
        "Trí tuệ nhân tạo phân tích hành vi khách hàng để gợi ý món ăn phù hợp, tăng trải nghiệm và doanh thu.",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: Building2,
      title: "Quản lý Đa Chi nhánh",
      description:
        "Quản lý nhiều cửa hàng cùng lúc. Dữ liệu tập trung, báo cáo tổng hợp toàn hệ thống.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Zap,
      title: "Tự động hóa Hoàn toàn",
      description:
        "Giảm thiểu thao tác thủ công, tối ưu quy trình phục vụ, tiết kiệm thời gian và chi phí nhân sự.",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "Miễn phí",
      description: "Dành cho quán nhỏ, mới bắt đầu số hóa",
      features: [
        "Menu điện tử QR code",
        "Quản lý bàn & đơn hàng cơ bản",
        "Thanh toán tiền mặt",
        "Báo cáo doanh thu cơ bản",
        "1 chi nhánh",
        "Hỗ trợ email",
      ],
      highlighted: false,
      ctaText: "Bắt đầu miễn phí",
    },
    {
      name: "Basic",
      price: "299.000đ/tháng",
      description: "POS bán hàng và quản lý cơ bản",
      features: [
        "Tất cả tính năng Free",
        "POS bán hàng chuyên nghiệp",
        "KDS (Kitchen Display System)",
        "Báo cáo doanh thu theo ngày/tuần/tháng",
        "Quản lý kho & nhập xuất tồn",
        "Tối đa 3 chi nhánh",
        "Hỗ trợ ưu tiên",
      ],
      highlighted: false,
      ctaText: "Dùng thử 30 ngày",
    },
    {
      name: "Standard",
      price: "699.000đ/tháng",
      description: "Tối ưu trải nghiệm khách hàng & marketing",
      features: [
        "Tất cả tính năng Basic",
        "QR Menu & Self-Order tự động",
        "Ví điện tử (MoMo, ZaloPay, VietQR)",
        "Báo cáo & phân tích nâng cao",
        "CRM quản lý khách hàng",
        "Chương trình khuyến mãi & loyalty",
        "Tối đa 5 chi nhánh",
      ],
      highlighted: true,
      badge: "Phổ biến nhất",
      ctaText: "Dùng thử 30 ngày",
    },
    {
      name: "Pro",
      price: "1.199.000đ+/tháng",
      description: "Giải pháp toàn diện cho chuỗi F&B",
      features: [
        "Tất cả tính năng Standard",
        "AI Chatbot & gợi ý món thông minh",
        "AI Upsell tự động tăng doanh thu",
        "Menu Engineering & phân tích hiệu suất món",
        "E-Invoice hóa đơn điện tử",
        "Tích hợp API tùy chỉnh",
        "Không giới hạn chi nhánh",
        "Hỗ trợ 24/7 chuyên trách",
      ],
      highlighted: false,
      ctaText: "Liên hệ tư vấn",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header/Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 group cursor-pointer"
              onClick={() => {
                // Optional: Open modal or inline upload
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      handleLogoImageChange(reader.result, file);
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
            >
              {logoImage ? (
                <img
                  src={logoImage}
                  alt="Logo"
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="text-white font-bold text-xl">M</span>
                </div>
              )}
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Minitake
              </span>
              <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                (Click to upload logo)
              </span>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate("/admin/login")}>
                Đăng nhập
              </Button>
              <Button
                onClick={() => navigate("/admin/register")}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                Đăng ký
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-5xl">
          <Badge className="mb-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
            Giải pháp F&B thông minh
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-emerald-800 to-teal-600 bg-clip-text text-transparent">
            Minitake - Quản lý F&B
            <br />
            Thông minh & Hiện đại
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Giải pháp toàn diện cho quán cafe, nhà hàng và chuỗi F&B.
            <br />
            Gọi món QR, thanh toán tự động, AI gợi ý món, báo cáo thời gian
            thực.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-lg px-8 py-6"
              onClick={() => navigate("/admin/register")}
            >
              Dùng thử miễn phí
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => navigate("/demo")}
            >
              Xem demo
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <Eye className="h-6 w-6 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">Tầm nhìn</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">
                  Trở thành nền tảng quản lý F&B hàng đầu Việt Nam, đưa công
                  nghệ và trí tuệ nhân tạo vào từng quán cafe, nhà hàng - giúp
                  ngành F&B tiến tới tự động hóa hoàn toàn.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-teal-600" />
                </div>
                <CardTitle className="text-2xl">Sứ mệnh</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">
                  Trao quyền cho chủ quán F&B với công cụ quản lý thông minh, dễ
                  sử dụng. Nâng cao trải nghiệm khách hàng thông qua công nghệ,
                  đồng thời tối ưu chi phí và hiệu quả kinh doanh.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">
              Tính năng nổi bật
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Giải pháp toàn diện cho F&B
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Từ gọi món đến thanh toán, từ báo cáo đến AI - mọi thứ bạn cần
              trong một nền tảng
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div
                    className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4`}
                  >
                    <feature.icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700">
              Bảng giá
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Chọn gói phù hợp với bạn
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Từ miễn phí đến giải pháp toàn diện - Nâng cấp linh hoạt theo nhu
              cầu kinh doanh
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-emerald-500 border-2 shadow-2xl lg:scale-105 z-10"
                    : "border-gray-200 shadow-lg"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-1 text-xs">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-xl lg:text-2xl mb-2">
                    {plan.name}
                  </CardTitle>
                  <div className="mb-2">
                    <span className="text-2xl lg:text-3xl font-bold">
                      {plan.price}
                    </span>
                  </div>
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                        : "bg-gray-900 hover:bg-gray-800"
                    }`}
                    onClick={() => navigate("/admin/register")}
                  >
                    {plan.ctaText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Sẵn sàng chuyển đổi số cho quán của bạn?
          </h2>
          <p className="text-xl mb-8 text-emerald-50">
            Tham gia cùng hàng trăm chủ quán F&B đã tin dùng Minitake.
            <br />
            Dùng thử miễn phí 30 ngày, không cần thẻ tín dụng.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              className="bg-white text-emerald-600 hover:bg-gray-100 text-lg px-8 py-6"
              onClick={() => navigate("/admin/register")}
            >
              Đăng ký chủ quán ngay
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-emerald-800 text-lg px-8 py-6"
            >
              Tư vấn miễn phí
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div
                className="flex items-center gap-2 mb-4 group cursor-pointer"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        handleLogoImageChange(reader.result, file);
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
              >
                {logoImage ? (
                  <img
                    src={logoImage}
                    alt="Logo"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="text-white font-bold">M</span>
                  </div>
                )}
                <span className="text-xl font-bold text-white">Minitake</span>
              </div>
              <p className="text-sm text-gray-400">
                Giải pháp quản lý F&B thông minh cho thời đại số
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Sản phẩm</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Tính năng
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Bảng giá
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Demo
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Tài liệu
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Liên hệ
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Công ty</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Về chúng tôi
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Tuyển dụng
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Minitake. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
