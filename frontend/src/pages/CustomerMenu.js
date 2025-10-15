import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Check,
  Loader2,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import PaymentFlow from "@/components/PaymentFlow";
import OrderStatusTracker from "@/components/OrderStatusTracker";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const CustomerMenu = () => {
  const { storeSlug } = useParams();
  const [searchParams] = useState(
    () => new URLSearchParams(window.location.search),
  );
  const tableId = searchParams.get("table");

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [tableInfo, setTableInfo] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [statusTrackerOpen, setStatusTrackerOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetailOpen, setItemDetailOpen] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    customer_name: "",
    customer_phone: "",
    table_number: "",
    note: "",
  });

  useEffect(() => {
    fetchMenu();
    if (tableId) {
      fetchTableInfo();
    }

    // Restore payment state from localStorage if exists
    restorePaymentState();

    // Restore cart from localStorage
    restoreCart();
  }, [storeSlug, tableId]);

  // Save cart to localStorage whenever it changes (if not in payment flow)
  useEffect(() => {
    if (cart.length > 0 && !paymentOpen) {
      localStorage.setItem(`minitake_cart_${storeSlug}`, JSON.stringify(cart));
    } else if (cart.length === 0 && !paymentOpen) {
      localStorage.removeItem(`minitake_cart_${storeSlug}`);
    }
  }, [cart, paymentOpen, storeSlug]);

  const restoreCart = () => {
    const savedCart = localStorage.getItem(`minitake_cart_${storeSlug}`);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
          toast.info(`Đã khôi phục ${parsed.length} món trong giỏ hàng`);
        }
      } catch (error) {
        console.error("Failed to restore cart:", error);
        localStorage.removeItem(`minitake_cart_${storeSlug}`);
      }
    }
  };

  // Save payment state to localStorage whenever it changes
  useEffect(() => {
    if (currentOrder && paymentOpen) {
      const paymentState = {
        currentOrder,
        cart,
        customerInfo,
        paymentOpen: true,
        timestamp: new Date().getTime(),
      };
      localStorage.setItem(
        `minitake_payment_${storeSlug}`,
        JSON.stringify(paymentState),
      );
    }
  }, [currentOrder, paymentOpen, cart, customerInfo, storeSlug]);

  const restorePaymentState = () => {
    const savedState = localStorage.getItem(`minitake_payment_${storeSlug}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        const now = new Date().getTime();
        // Only restore if less than 30 minutes old
        if (now - parsed.timestamp < 30 * 60 * 1000) {
          setCurrentOrder(parsed.currentOrder);
          setCart(parsed.cart || []);
          setCustomerInfo(
            parsed.customerInfo || {
              customer_name: "",
              customer_phone: "",
              table_number: "",
              note: "",
            },
          );
          setPaymentOpen(true);
          toast.info("Đã khôi phục thông tin thanh toán");
        } else {
          // Clear expired state
          localStorage.removeItem(`minitake_payment_${storeSlug}`);
        }
      } catch (error) {
        console.error("Failed to restore payment state:", error);
        localStorage.removeItem(`minitake_payment_${storeSlug}`);
      }
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API_BASE}/public/${storeSlug}/menu`);
      setStore(response.data.store);
      setCategories(response.data.categories);
      setMenuItems(response.data.menu_items);
    } catch (error) {
      toast.error("Không tìm thấy cửa hàng");
    } finally {
      setLoading(false);
    }
  };

  const fetchTableInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tables/${tableId}`);
      setTableInfo(response.data);
      setCustomerInfo((prev) => ({
        ...prev,
        table_number: response.data.table_number,
      }));
    } catch (error) {
      // Table info fetch failed - continue without table context
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setItemDetailOpen(true);
  };

  const addToCart = (item) => {
    const existingItem = cart.find((i) => i.id === item.id);
    // Use discounted price if promotion exists
    const effectivePrice = item.has_promotion
      ? item.discounted_price
      : item.price;
    const cartItem = { ...item, price: effectivePrice };

    if (existingItem) {
      setCart(
        cart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else {
      setCart([...cart, { ...cartItem, quantity: 1 }]);
    }
    toast.success(`Đã thêm ${item.name} vào giỏ hàng`);
  };

  const addToCartFromDetail = () => {
    if (selectedItem) {
      addToCart(selectedItem);
      setItemDetailOpen(false);
    }
  };

  const updateQuantity = (itemId, delta) => {
    setCart(
      cart
        .map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity + delta } : i,
        )
        .filter((i) => i.quantity > 0),
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
      toast.error("Giỏ hàng trống");
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

      const response = await axios.post(
        `${API_BASE}/public/${storeSlug}/orders`,
        orderPayload,
      );

      // Save order and open payment dialog
      setCurrentOrder(response.data);
      setCheckoutOpen(false);
      setPaymentOpen(true);

      toast.success("Đặt món thành công! Vui lòng thanh toán");
    } catch (error) {
      toast.error("Đặt hàng thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentOpen(false);
    setOrderSuccess(true);

    // Open order status tracker
    if (currentOrder?.id) {
      setTrackingOrderId(currentOrder.id);
      setStatusTrackerOpen(true);
    }

    setCart([]);
    setCurrentOrder(null);
    setCustomerInfo({
      customer_name: "",
      customer_phone: "",
      table_number: "",
      note: "",
    });

    // Clear localStorage after successful payment
    localStorage.removeItem(`minitake_payment_${storeSlug}`);
    localStorage.removeItem(`minitake_cart_${storeSlug}`);
  };

  const handlePaymentCancel = () => {
    setPaymentOpen(false);
    setCurrentOrder(null);

    // Clear localStorage when user cancels payment
    localStorage.removeItem(`minitake_payment_${storeSlug}`);

    // Order is still created, just not paid yet
    toast.info("Bạn có thể thanh toán sau");
  };

  const filteredItems =
    selectedCategory === "all"
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logo && (
              <img
                src={store.logo}
                alt={store.name}
                className="h-12 w-12 object-contain rounded-lg"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
              {tableInfo && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-emerald-600 text-white">
                    {tableInfo.table_number}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    ({tableInfo.capacity} chỗ)
                  </span>
                </div>
              )}
              {store.address && !tableInfo && (
                <p className="text-sm text-gray-600">{store.address}</p>
              )}
            </div>
          </div>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button className="relative bg-emerald-600 hover:bg-emerald-700">
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-0.5">
                    {cart.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Giỏ hàng</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Giỏ hàng trống
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 bg-white p-3 rounded-lg border"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-600">
                              {item.price.toLocaleString("vi-VN")} đ
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, -1)}
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
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.id)}
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
                          {getTotalPrice().toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleCheckout}
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
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
            className={selectedCategory === "all" ? "bg-emerald-600" : ""}
          >
            Tất cả
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.id)}
              className={selectedCategory === cat.id ? "bg-emerald-600" : ""}
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
              className="overflow-hidden hover:shadow-xl transition-shadow animate-fade-in cursor-pointer"
              onClick={() => handleItemClick(item)}
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
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {item.name}
                    </h3>
                    {item.has_promotion && item.promotion_label && (
                      <Badge className="bg-red-500 text-white text-xs shrink-0">
                        {item.promotion_label}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    {item.has_promotion ? (
                      <>
                        <span className="text-sm text-gray-400 line-through">
                          {item.original_price.toLocaleString("vi-VN")} đ
                        </span>
                        <span className="text-xl font-bold text-red-600">
                          {item.discounted_price.toLocaleString("vi-VN")} đ
                        </span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-emerald-600">
                        {item.price.toLocaleString("vi-VN")} đ
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(item);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
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

      {/* Item Detail Dialog */}
      <Dialog open={itemDetailOpen} onOpenChange={setItemDetailOpen}>
        <DialogContent className="max-w-2xl">
          {selectedItem && (
            <>
              {selectedItem.image_url && (
                <div className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden mb-4">
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-3">
                  {selectedItem.name}
                  {selectedItem.has_promotion &&
                    selectedItem.promotion_label && (
                      <Badge className="bg-red-500 text-white">
                        {selectedItem.promotion_label}
                      </Badge>
                    )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedItem.description && (
                  <p className="text-gray-700 leading-relaxed">
                    {selectedItem.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex flex-col">
                    {selectedItem.has_promotion ? (
                      <>
                        <span className="text-lg text-gray-400 line-through">
                          {selectedItem.original_price.toLocaleString("vi-VN")}{" "}
                          đ
                        </span>
                        <span className="text-3xl font-bold text-red-600">
                          {selectedItem.discounted_price.toLocaleString(
                            "vi-VN",
                          )}{" "}
                          đ
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold text-emerald-600">
                        {selectedItem.price.toLocaleString("vi-VN")} đ
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={addToCartFromDetail}
                    className="bg-emerald-600 hover:bg-emerald-700 px-8"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Thêm vào giỏ hàng
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
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
                  setCustomerInfo({
                    ...customerInfo,
                    customer_name: e.target.value,
                  })
                }
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại (Tuỳ chọn)</Label>
              <Input
                id="phone"
                value={customerInfo.customer_phone}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    customer_phone: e.target.value,
                  })
                }
                placeholder="0123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table">Số bàn</Label>
              <Input
                id="table"
                value={customerInfo.table_number}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    table_number: e.target.value,
                  })
                }
                placeholder="Bàn 5"
                disabled={!!tableInfo}
              />
              {tableInfo && (
                <p className="text-xs text-gray-500">
                  Đã tự động nhận diện từ mã QR
                </p>
              )}
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
              />
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span>Tổng tiền:</span>
                <span className="text-emerald-600">
                  {getTotalPrice().toLocaleString("vi-VN")} đ
                </span>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đặt hàng...
                  </>
                ) : (
                  "Xác nhận đặt món"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Flow */}
      {currentOrder && (
        <PaymentFlow
          order={currentOrder}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          open={paymentOpen}
        />
      )}

      {/* Order Status Tracker */}
      {trackingOrderId && (
        <OrderStatusTracker
          orderId={trackingOrderId}
          open={statusTrackerOpen}
          onClose={() => {
            setStatusTrackerOpen(false);
            setTrackingOrderId(null);
          }}
        />
      )}

      {/* Success Dialog */}
      <Dialog open={orderSuccess} onOpenChange={setOrderSuccess}>
        <DialogContent className="text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Thanh toán thành công!
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Cảm ơn bạn đã sử dụng dịch vụ. Đang theo dõi trạng thái đơn hàng...
          </p>
          <Button
            onClick={() => {
              setOrderSuccess(false);
              // Open status tracker if not already open
              if (trackingOrderId && !statusTrackerOpen) {
                setStatusTrackerOpen(true);
              }
            }}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700"
          >
            Xem trạng thái
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerMenu;
