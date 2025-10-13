import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShoppingCart, Plus, Minus, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const CustomerMenu = () => {
  const { storeSlug } = useParams();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const tableId = searchParams.get('table');
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [tableInfo, setTableInfo] = useState(null);

  const [customerInfo, setCustomerInfo] = useState({
    customer_name: '',
    customer_phone: '',
    table_number: '',
    note: '',
  });

  useEffect(() => {
    fetchMenu();
    if (tableId) {
      fetchTableInfo();
    }
  }, [storeSlug, tableId]);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API_BASE}/public/${storeSlug}/menu`);
      setStore(response.data.store);
      setCategories(response.data.categories);
      setMenuItems(response.data.menu_items);
    } catch (error) {
      toast.error('Không tìm thấy cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tables/${tableId}`);
      setTableInfo(response.data);
      setCustomerInfo(prev => ({ ...prev, table_number: response.data.table_number }));
    } catch (error) {
      console.error('Could not fetch table info:', error);
    }
  };

  const addToCart = (item) => {
    const existingItem = cart.find((i) => i.id === item.id);
    if (existingItem) {
      setCart(
        cart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    toast.success(`Đã thêm ${item.name} vào giỏ hàng`);
  };

  const updateQuantity = (itemId, delta) => {
    setCart(
      cart
        .map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter((i) => i.id !== itemId));
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }
    setCheckoutOpen(true);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const orderPayload = {
        ...customerInfo,
        items: cart.map((item) => ({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      };

      await axios.post(`${API_BASE}/public/${storeSlug}/orders`, orderPayload);
      setOrderSuccess(true);
      setCheckoutOpen(false);
      setCart([]);
      setCustomerInfo({
        customer_name: '',
        customer_phone: '',
        table_number: '',
        note: '',
      });
    } catch (error) {
      toast.error('Đặt hàng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems =
    selectedCategory === 'all'
      ? menuItems
      : menuItems.filter((item) => item.category_id === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Không tìm thấy cửa hàng</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50" data-testid="customer-menu">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
            {store.address && (
              <p className="text-sm text-gray-600">{store.address}</p>
            )}
          </div>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button
                className="relative bg-emerald-600 hover:bg-emerald-700"
                data-testid="cart-btn"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <Badge
                    className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-0.5"
                    data-testid="cart-count"
                  >
                    {cart.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg" data-testid="cart-drawer">
              <SheetHeader>
                <SheetTitle>Giỏ hàng</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Giỏ hàng trống</p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 bg-white p-3 rounded-lg border"
                          data-testid={`cart-item-${item.id}`}
                        >
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-600">
                              {item.price.toLocaleString('vi-VN')} đ
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, -1)}
                              data-testid={`decrease-${item.id}`}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, 1)}
                              data-testid={`increase-${item.id}`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.id)}
                            data-testid={`remove-${item.id}`}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4 space-y-4">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>Tổng cộng:</span>
                        <span className="text-emerald-600">
                          {getTotalPrice().toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleCheckout}
                        data-testid="checkout-btn"
                      >
                        Đặt món
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Categories Filter */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all' ? 'bg-emerald-600' : ''}
            data-testid="category-all"
          >
            Tất cả
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat.id)}
              className={selectedCategory === cat.id ? 'bg-emerald-600' : ''}
              data-testid={`category-${cat.id}`}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden hover:shadow-xl transition-shadow animate-fade-in"
              data-testid={`menu-item-${item.id}`}
            >
              {item.image_url && (
                <div className="h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-emerald-600">
                    {item.price.toLocaleString('vi-VN')} đ
                  </span>
                  <Button
                    onClick={() => addToCart(item)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid={`add-to-cart-${item.id}`}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Thêm
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent data-testid="checkout-dialog">
          <DialogHeader>
            <DialogTitle>Thông tin đặt món</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên của bạn (Tuỳ chọn)</Label>
              <Input
                id="name"
                value={customerInfo.customer_name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, customer_name: e.target.value })
                }
                placeholder="Nguyễn Văn A"
                data-testid="customer-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại (Tuỳ chọn)</Label>
              <Input
                id="phone"
                value={customerInfo.customer_phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, customer_phone: e.target.value })
                }
                placeholder="0123456789"
                data-testid="customer-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table">Số bàn (Tuỳ chọn)</Label>
              <Input
                id="table"
                value={customerInfo.table_number}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, table_number: e.target.value })
                }
                placeholder="Bàn 5"
                data-testid="table-number-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Input
                id="note"
                value={customerInfo.note}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, note: e.target.value })
                }
                placeholder="Yêu cầu đặc biệt..."
                data-testid="note-input"
              />
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span>Tổng tiền:</span>
                <span className="text-emerald-600">
                  {getTotalPrice().toLocaleString('vi-VN')} đ
                </span>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={submitting}
                data-testid="submit-order-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đặt hàng...
                  </>
                ) : (
                  'Xác nhận đặt món'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={orderSuccess} onOpenChange={setOrderSuccess}>
        <DialogContent className="text-center" data-testid="success-dialog">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl">Đặt món thành công!</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Đơn hàng của bạn đã được gửi đến bếp. Vui lòng chờ trong giây lát.
          </p>
          <Button
            onClick={() => setOrderSuccess(false)}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700"
            data-testid="close-success-btn"
          >
            Đóng
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerMenu;