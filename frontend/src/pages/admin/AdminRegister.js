import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/utils/api';
import { setAuthToken, setAuthUser } from '@/utils/auth';
import { Loader2, Store } from 'lucide-react';

const AdminRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    store_name: '',
    store_slug: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.store_slug)) {
      toast.error('Slug chỉ được chứa chữ thường, số và dấu gạch ngang');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', formData);
      setAuthToken(response.data.access_token);
      setAuthUser(response.data.user);
      toast.success('Đăng ký thành công!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-2">
            <Store className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Đăng ký Minitake</CardTitle>
          <CardDescription className="text-base">Tạo cửa hàng và bắt đầu quản lý</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên của bạn</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nguyễn Văn A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_name">Tên cửa hàng</Label>
              <Input
                id="store_name"
                type="text"
                placeholder="Quán Cafe ABC"
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_slug">Slug (URL cửa hàng)</Label>
              <Input
                id="store_slug"
                type="text"
                placeholder="cafe-abc"
                value={formData.store_slug}
                onChange={(e) => setFormData({ ...formData, store_slug: e.target.value.toLowerCase() })}
                required
              />
              <p className="text-xs text-gray-500">Khách hàng sẽ truy cập: /menu/{formData.store_slug || 'slug-cua-ban'}</p>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng ký...
                </>
              ) : (
                'Đăng ký'
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Đã có tài khoản? </span>
            <Link to="/admin/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Đăng nhập
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegister;