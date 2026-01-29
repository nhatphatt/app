import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import {
  QrCode,
  TrendingUp,
  Users,
  Building2,
  Check,
  ArrowRight,
  Eye,
  LayoutDashboard,
  ShieldCheck,
  Globe,
  Brain,
  Menu,
  X,
  Star,
} from "lucide-react";

const HomePage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const stats = [
    { label: "Cửa hàng tin dùng", value: "500+", icon: Building2 },
    { label: "Đơn hàng mỗi tháng", value: "1M+", icon: TrendingUp },
    { label: "Người dùng hài lòng", value: "98%", icon: Users },
  ];

  const features = [
    {
      icon: QrCode,
      title: "QR Order & Thanh toán",
      description:
        "Khách hàng tự gọi món và thanh toán tại bàn. Giảm 30% thời gian phục vụ và nhân sự.",
      className: "md:col-span-2",
      gradient: "from-emerald-50 to-teal-50",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-100",
    },
    {
      icon: Brain,
      title: "AI Gợi ý món thông minh",
      description: "Tăng 20% giá trị đơn hàng nhờ gợi ý món ăn phù hợp.",
      className: "md:col-span-1",
      gradient: "from-purple-50 to-pink-50",
      iconColor: "text-purple-600",
      borderColor: "border-purple-100",
    },
    {
      icon: LayoutDashboard,
      title: "Dashboard Trực quan",
      description: "Theo dõi doanh thu, tồn kho real-time mọi lúc mọi nơi.",
      className: "md:col-span-1",
      gradient: "from-blue-50 to-cyan-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-100",
    },
    {
      icon: ShieldCheck,
      title: "Phân quyền & Bảo mật",
      description: "Kiểm soát chặt chẽ quyền truy cập của nhân viên.",
      className: "md:col-span-2",
      gradient: "from-orange-50 to-red-50",
      iconColor: "text-orange-600",
      borderColor: "border-orange-100",
    },
  ];

  const testimonials = [
    {
      name: "Nguyễn Văn A",
      role: "Chủ chuỗi Coffee House",
      content:
        "Minitake đã thay đổi hoàn toàn cách chúng tôi vận hành. Nhân viên đỡ vất vả hơn, khách hàng hài lòng hơn vì không phải chờ đợi.",
      rating: 5,
    },
    {
      name: "Trần Thị B",
      role: "Quản lý Nhà hàng Sen",
      content:
        "Giao diện cực kỳ dễ sử dụng. Tôi chỉ mất 15 phút để đào tạo nhân viên mới. Tính năng báo cáo rất chi tiết và hữu ích.",
      rating: 5,
    },
    {
      name: "Lê Văn C",
      role: "Founder Chill Bar",
      content:
        "Tính năng QR Order hoạt động mượt mà. Khách rất thích vì có thể xem hình ảnh món ăn trực quan trước khi gọi.",
      rating: 4,
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "0đ",
      period: "/tháng",
      description: "Dành cho quán nhỏ mới bắt đầu",
      features: [
        "Menu điện tử QR code",
        "Tối đa 10 bàn",
        "Báo cáo cơ bản",
        "Hỗ trợ qua Email",
      ],
      cta: "Dùng thử ngay",
      popular: false,
    },
    {
      name: "Pro",
      price: "199.000đ",
      period: "/tháng",
      description: "Tối ưu cho quán cafe & nhà hàng",
      features: [
        "Không giới hạn số bàn",
        "Thanh toán Online & Ví điện tử",
        "Báo cáo chuyên sâu & AI",
        "Hỗ trợ 24/7",
        "Quản lý kho cơ bản",
      ],
      cta: "Đăng ký ngay",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Liên hệ",
      period: "",
      description: "Giải pháp cho chuỗi F&B lớn",
      features: [
        "Quản lý đa chi nhánh",
        "API tích hợp riêng",
        "Tùy chỉnh thương hiệu (White label)",
        "Account Manager riêng",
        "SLA cam kết 99.9%",
      ],
      cta: "Liên hệ tư vấn",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent ${
          scrolled
            ? "bg-white/80 backdrop-blur-md border-gray-200 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate("/")}>
            <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Minitake
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Tính năng</a>
            <a href="#testimonials" className="hover:text-emerald-600 transition-colors">Khách hàng</a>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">Bảng giá</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
              onClick={() => navigate("/admin/login")}
            >
              Đăng nhập
            </Button>
            <Button
              onClick={() => navigate("/admin/register")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all hover:scale-105"
            >
              Đăng ký ngay
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-gray-600 hover:text-emerald-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
           <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-200 p-4 flex flex-col gap-4 animate-fade-in shadow-lg">
             <a href="#features" className="text-gray-600 hover:text-emerald-600 py-2" onClick={() => setMobileMenuOpen(false)}>Tính năng</a>
             <a href="#testimonials" className="text-gray-600 hover:text-emerald-600 py-2" onClick={() => setMobileMenuOpen(false)}>Khách hàng</a>
             <a href="#pricing" className="text-gray-600 hover:text-emerald-600 py-2" onClick={() => setMobileMenuOpen(false)}>Bảng giá</a>
             <div className="h-px bg-gray-100 my-2"></div>
              <Button variant="ghost" className="justify-start text-gray-600" onClick={() => navigate("/admin/login")}>Đăng nhập</Button>
              <Button className="bg-emerald-600 text-white" onClick={() => navigate("/admin/register")}>Đăng ký ngay</Button>
           </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-40 right-10 w-[600px] h-[600px] bg-teal-100/50 rounded-full blur-[100px] animate-pulse delay-1000" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 text-center max-w-5xl relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium mb-8 animate-fade-in-up backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Giải pháp quản lý F&B thế hệ mới</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-8 leading-tight animate-fade-in-up delay-100">
            Quản lý quán <span className="text-emerald-600">dễ dàng</span>
            <br />
            Kinh doanh <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">hiệu quả</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            Nền tảng All-in-one giúp bạn vận hành quán Cafe, Nhà hàng tự động hóa từ A-Z. 
            Tăng doanh thu, giảm chi phí và nâng cao trải nghiệm khách hàng.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-300">
            <Button
              size="lg"
              className="h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200 hover:shadow-2xl hover:shadow-emerald-300 transition-all hover:-translate-y-1"
              onClick={() => navigate("/admin/register")}
            >
              Bắt đầu miễn phí ngay
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
              onClick={() => navigate("/demo")}
            >
              <Eye className="mr-2 h-5 w-5" />
              Xem Demo trực tiếp
            </Button>
          </div>

          {/* Stats Strip */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 border-y border-gray-100 py-10 bg-white/50 backdrop-blur-sm animate-fade-in-up delay-500">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center group">
                <div className="flex items-center gap-3 text-4xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  <stat.icon className="w-8 h-8 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                  {stat.value}
                </div>
                <div className="text-gray-500 font-medium tracking-wide uppercase text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-32 relative bg-gray-50/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">Tính năng vượt trội</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Mọi công cụ bạn cần để vận hành trơn tru, được thiết kế tinh tế và mạnh mẽ.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card 
                key={idx} 
                className={`${feature.className} bg-white border-${feature.borderColor} shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden relative border`}
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <CardHeader className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-gray-100 group-hover:bg-white`}>
                    <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-gray-600 leading-relaxed text-lg">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-32 bg-white relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">Khách hàng nói gì?</h2>
            <p className="text-xl text-gray-600">Sự hài lòng của khách hàng là động lực phát triển của chúng tôi.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((item, idx) => (
              <Card key={idx} className="bg-gray-50 border-gray-100 hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="pt-8">
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-5 h-5 ${i < item.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} 
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-8 italic text-lg leading-relaxed">"{item.content}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">{item.name}</div>
                      <div className="text-sm text-emerald-600">{item.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 relative overflow-hidden bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">Bảng giá đơn giản</h2>
            <p className="text-xl text-gray-600">Chọn gói phù hợp với quy mô kinh doanh của bạn</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan, idx) => (
              <Card 
                key={idx} 
                className={`bg-white border-gray-200 text-gray-900 relative transition-all duration-300 ${
                  plan.popular 
                    ? "border-emerald-500 shadow-2xl shadow-emerald-100 scale-105 z-10" 
                    : "hover:border-gray-300 hover:shadow-xl"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-200">
                    Phổ biến nhất
                  </div>
                )}
                <CardHeader className="pb-8">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-gray-900 tracking-tight">{plan.price}</span>
                    <span className="text-gray-500 font-medium">{plan.period}</span>
                  </div>
                  <CardDescription className="text-gray-500 mt-4 text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                  <ul className="space-y-5">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3 text-base">
                        <div className="mt-1 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full h-14 text-lg font-semibold ${
                      plan.popular 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200" 
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}
                    onClick={() => navigate("/admin/register")}
                  >
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="py-32 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-emerald-50/50"></div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10 px-4">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 text-gray-900 tracking-tight">
            Sẵn sàng bùng nổ doanh số?
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Tham gia cùng cộng đồng 500+ chủ quán F&B thông thái ngay hôm nay.
          </p>
          <Button 
            size="lg" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-16 px-12 text-xl shadow-2xl shadow-emerald-200 rounded-full transition-all hover:scale-105"
            onClick={() => navigate("/admin/register")}
          >
            Đăng ký miễn phí ngay
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 border-t border-gray-800">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6 text-white">
                <span className="text-2xl font-bold">Minitake</span>
              </div>
              <p className="text-base leading-relaxed mb-8 text-gray-500">
                Nền tảng quản lý F&B toàn diện, giúp bạn kinh doanh hiệu quả và bền vững hơn.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                   <Globe className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all cursor-pointer font-bold">f</div>
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all cursor-pointer font-bold">in</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Sản phẩm</h4>
              <ul className="space-y-4 text-base">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Tính năng</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Bảng giá</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Phần cứng</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Công ty</h4>
              <ul className="space-y-4 text-base">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Về chúng tôi</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Tuyển dụng</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Liên hệ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-lg">Liên hệ</h4>
              <ul className="space-y-4 text-base">
                <li>Hotline: 1900 xxxx</li>
                <li>Email: support@minitake.com</li>
                <li>Địa chỉ: TP. Hồ Chí Minh, Việt Nam</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-16 pt-8 text-center text-sm text-gray-600">
            &copy; 2025 Minitake. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
