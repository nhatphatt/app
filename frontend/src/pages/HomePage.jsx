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
  Zap,
  Star,
  Menu,
  X,
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
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-400",
    },
    {
      icon: Brain,
      title: "AI Gợi ý món thông minh",
      description: "Tăng 20% giá trị đơn hàng nhờ gợi ý món ăn phù hợp.",
      className: "md:col-span-1",
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
    },
    {
      icon: LayoutDashboard,
      title: "Dashboard Trực quan",
      description: "Theo dõi doanh thu, tồn kho real-time mọi lúc mọi nơi.",
      className: "md:col-span-1",
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400",
    },
    {
      icon: ShieldCheck,
      title: "Phân quyền & Bảo mật",
      description: "Kiểm soát chặt chẽ quyền truy cập của nhân viên.",
      className: "md:col-span-2",
      gradient: "from-orange-500/20 to-red-500/20",
      iconColor: "text-orange-400",
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
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent ${
          scrolled
            ? "bg-gray-950/80 backdrop-blur-md border-gray-800 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate("/")}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
              M
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Minitake
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Tính năng</a>
            <a href="#testimonials" className="hover:text-emerald-400 transition-colors">Khách hàng</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">Bảng giá</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => navigate("/admin/login")}
            >
              Đăng nhập
            </Button>
            <Button
              onClick={() => navigate("/admin/register")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              Dùng thử miễn phí
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
           <div className="md:hidden absolute top-20 left-0 w-full bg-gray-950 border-b border-gray-800 p-4 flex flex-col gap-4 animate-fade-in">
             <a href="#features" className="text-gray-300 hover:text-emerald-400 py-2" onClick={() => setMobileMenuOpen(false)}>Tính năng</a>
             <a href="#testimonials" className="text-gray-300 hover:text-emerald-400 py-2" onClick={() => setMobileMenuOpen(false)}>Khách hàng</a>
             <a href="#pricing" className="text-gray-300 hover:text-emerald-400 py-2" onClick={() => setMobileMenuOpen(false)}>Bảng giá</a>
             <div className="h-px bg-gray-800 my-2"></div>
             <Button variant="ghost" className="justify-start text-gray-300" onClick={() => navigate("/admin/login")}>Đăng nhập</Button>
             <Button className="bg-emerald-600 text-white" onClick={() => navigate("/admin/register")}>Dùng thử miễn phí</Button>
           </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-40 right-10 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 text-center max-w-5xl relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-sm font-medium mb-8 animate-fade-in-up backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Giải pháp quản lý F&B thế hệ mới</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-tight animate-fade-in-up delay-100">
            Quản lý quán <span className="text-emerald-400">dễ dàng</span>
            <br />
            Kinh doanh <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">hiệu quả</span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            Nền tảng All-in-one giúp bạn vận hành quán Cafe, Nhà hàng tự động hóa từ A-Z. 
            Tăng doanh thu, giảm chi phí và nâng cao trải nghiệm khách hàng.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-300">
            <Button
              size="lg"
              className="h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-1"
              onClick={() => navigate("/admin/register")}
            >
              Bắt đầu miễn phí ngay
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg border-gray-700 text-gray-300 hover:bg-white/5 hover:text-white hover:border-gray-600 backdrop-blur-sm"
              onClick={() => navigate("/demo")}
            >
              <Eye className="mr-2 h-5 w-5" />
              Xem Demo trực tiếp
            </Button>
          </div>

          {/* Stats Strip */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 border-y border-white/5 py-10 bg-white/[0.02] backdrop-blur-sm animate-fade-in-up delay-500">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center group">
                <div className="flex items-center gap-3 text-4xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  <stat.icon className="w-8 h-8 text-gray-500 group-hover:text-emerald-500 transition-colors" />
                  {stat.value}
                </div>
                <div className="text-gray-500 font-medium tracking-wide uppercase text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-32 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Tính năng vượt trội</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">Mọi công cụ bạn cần để vận hành trơn tru, được thiết kế tinh tế và mạnh mẽ.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card 
                key={idx} 
                className={`${feature.className} bg-gray-900/40 border-gray-800 backdrop-blur-sm hover:bg-gray-800/60 transition-all duration-500 group overflow-hidden relative`}
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                
                <CardHeader>
                  <div className={`w-14 h-14 rounded-2xl bg-gray-800/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-gray-700/50 group-hover:border-gray-600`}>
                    <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 leading-relaxed text-lg">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-32 bg-gray-900/30 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Khách hàng nói gì?</h2>
            <p className="text-xl text-gray-400">Sự hài lòng của khách hàng là động lực phát triển của chúng tôi.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((item, idx) => (
              <Card key={idx} className="bg-gray-950 border-gray-800 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1">
                <CardContent className="pt-8">
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-5 h-5 ${i < item.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-700"}`} 
                      />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-8 italic text-lg leading-relaxed">"{item.content}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{item.name}</div>
                      <div className="text-sm text-emerald-400">{item.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Bảng giá đơn giản</h2>
            <p className="text-xl text-gray-400">Chọn gói phù hợp với quy mô kinh doanh của bạn</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan, idx) => (
              <Card 
                key={idx} 
                className={`bg-gray-900/60 border-gray-800 text-gray-100 backdrop-blur-md relative transition-all duration-300 ${
                  plan.popular 
                    ? "border-emerald-500/50 shadow-2xl shadow-emerald-500/10 scale-105 z-10 bg-gray-900/80" 
                    : "hover:border-gray-700 hover:bg-gray-900/80"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20">
                    Phổ biến nhất
                  </div>
                )}
                <CardHeader className="pb-8">
                  <CardTitle className="text-2xl font-bold text-white">{plan.name}</CardTitle>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white tracking-tight">{plan.price}</span>
                    <span className="text-gray-500 font-medium">{plan.period}</span>
                  </div>
                  <CardDescription className="text-gray-400 mt-4 text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                  <ul className="space-y-5">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3 text-base">
                        <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full h-14 text-lg font-semibold ${
                      plan.popular 
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" 
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/5"
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
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-600/10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-transparent to-gray-950"></div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10 px-4">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 text-white tracking-tight">
            Sẵn sàng bùng nổ doanh số?
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Tham gia cùng cộng đồng 500+ chủ quán F&B thông thái ngay hôm nay.
          </p>
          <Button 
            size="lg" 
            className="bg-emerald-500 hover:bg-emerald-400 text-white h-16 px-12 text-xl shadow-2xl shadow-emerald-500/30 rounded-full transition-all hover:scale-105"
            onClick={() => navigate("/admin/register")}
          >
            Đăng ký miễn phí ngay
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-16 border-t border-gray-900">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6 text-white">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">M</div>
                <span className="text-2xl font-bold">Minitake</span>
              </div>
              <p className="text-base leading-relaxed mb-8 text-gray-500">
                Nền tảng quản lý F&B toàn diện, giúp bạn kinh doanh hiệu quả và bền vững hơn.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-500 transition-all cursor-pointer">
                   <Globe className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-500 transition-all cursor-pointer font-bold">f</div>
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-500 transition-all cursor-pointer font-bold">in</div>
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
          <div className="border-t border-gray-900 mt-16 pt-8 text-center text-sm text-gray-600">
            &copy; 2025 Minitake. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
