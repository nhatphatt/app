import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingBag, Package, Clock } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setStats(response.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Doanh thu hôm nay',
      value: stats ? `${stats.today_revenue.toLocaleString('vi-VN')} đ` : '0 đ',
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-600',
      testId: 'today-revenue'
    },
    {
      title: 'Đơn hàng hôm nay',
      value: stats ? stats.today_orders : 0,
      icon: ShoppingBag,
      color: 'from-blue-500 to-cyan-600',
      testId: 'today-orders'
    },
    {
      title: 'Đơn đang xử lý',
      value: stats ? stats.pending_orders : 0,
      icon: Clock,
      color: 'from-orange-500 to-amber-600',
      testId: 'pending-orders'
    },
    {
      title: 'Tổng món ăn',
      value: stats ? stats.total_menu_items : 0,
      icon: Package,
      color: 'from-purple-500 to-pink-600',
      testId: 'total-items'
    },
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in" data-testid="admin-dashboard">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Tổng quan hoạt động cửa hàng</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="overflow-hidden hover:shadow-lg transition-shadow animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
              data-testid={stat.testId}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chào mừng đến với Minitake!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Bắt đầu bằng cách thêm danh mục và món ăn vào menu của bạn. Sau đó, khách hàng có thể quét mã QR để xem menu và đặt món.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;