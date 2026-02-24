import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Tag,
  Percent,
  Gift,
  Users,
  Calendar,
  Clock,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/utils/api";

const PromotionManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    promotion_type: "percentage", // percentage, fixed_amount, buy_x_get_y, combo
    discount_value: "",
    start_date: "",
    end_date: "",
    apply_to: "all", // all, category, items, order_total
    category_ids: [],
    item_ids: [],
    min_order_value: "",
    max_discount_amount: "",
    payment_methods: [], // cash, bank_qr, momo, etc
    time_restrictions: {
      enabled: false,
      start_time: "",
      end_time: "",
      days_of_week: [], // 0-6 (Sunday-Saturday)
    },
    member_only: false,
    is_active: true,
    usage_limit: "",
    usage_count: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promotionsRes, categoriesRes, itemsRes] = await Promise.all([
        api.get("/promotions"),
        api.get("/categories"),
        api.get("/menu-items"),
      ]);
      setPromotions(promotionsRes.data);
      setCategories(categoriesRes.data);
      setMenuItems(itemsRes.data);
    } catch (error) {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        min_order_value: formData.min_order_value
          ? parseFloat(formData.min_order_value)
          : null,
        max_discount_amount: formData.max_discount_amount
          ? parseFloat(formData.max_discount_amount)
          : null,
        usage_limit: formData.usage_limit
          ? parseInt(formData.usage_limit)
          : null,
      };

      if (editingPromotion) {
        await api.put(`/promotions/${editingPromotion.id}`, payload);
        toast.success("Cập nhật khuyến mãi thành công");
      } else {
        await api.post("/promotions", payload);
        toast.success("Thêm khuyến mãi thành công");
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa khuyến mãi này?")) return;
    try {
      await api.delete(`/promotions/${id}`);
      toast.success("Xóa khuyến mãi thành công");
      fetchData();
    } catch (error) {
      toast.error("Không thể xóa khuyến mãi");
    }
  };

  const handleToggleActive = async (promotion) => {
    try {
      await api.put(`/promotions/${promotion.id}`, {
        ...promotion,
        is_active: !promotion.is_active,
      });
      toast.success(
        promotion.is_active
          ? "Đã tạm dừng khuyến mãi"
          : "Đã kích hoạt khuyến mãi"
      );
      fetchData();
    } catch (error) {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      promotion_type: "percentage",
      discount_value: "",
      start_date: "",
      end_date: "",
      apply_to: "all",
      category_ids: [],
      item_ids: [],
      min_order_value: "",
      max_discount_amount: "",
      payment_methods: [],
      time_restrictions: {
        enabled: false,
        start_time: "",
        end_time: "",
        days_of_week: [],
      },
      member_only: false,
      is_active: true,
      usage_limit: "",
      usage_count: 0,
    });
    setEditingPromotion(null);
  };

  const getPromotionTypeName = (type) => {
    const types = {
      percentage: "Giảm %",
      fixed_amount: "Giảm tiền",
      buy_x_get_y: "Mua X tặng Y",
      combo: "Combo giá đặc biệt",
    };
    return types[type] || type;
  };

  const getApplyToName = (applyTo) => {
    const names = {
      all: "Toàn đơn hàng",
      category: "Theo danh mục",
      items: "Theo món",
      order_total: "Hóa đơn tối thiểu",
    };
    return names[applyTo] || applyTo;
  };

  const isPromotionActive = (promotion) => {
    if (!promotion.is_active) return false;
    const now = new Date();
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);
    return now >= start && now <= end;
  };

  const getStatusBadge = (promotion) => {
    if (!promotion.is_active) {
      return <Badge className="bg-gray-100 text-gray-700">Tạm dừng</Badge>;
    }
    if (isPromotionActive(promotion)) {
      return <Badge className="bg-green-100 text-green-700">Đang hoạt động</Badge>;
    }
    const now = new Date();
    const start = new Date(promotion.start_date);
    if (now < start) {
      return <Badge className="bg-blue-100 text-blue-700">Sắp diễn ra</Badge>;
    }
    return <Badge className="bg-red-100 text-red-700">Đã hết hạn</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Quản lý Khuyến mãi
          </h1>
          <p className="text-gray-600">
            Tạo và quản lý các chương trình khuyến mãi cho cửa hàng
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              onClick={resetForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Tạo khuyến mãi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPromotion ? "Chỉnh sửa khuyến mãi" : "Tạo khuyến mãi mới"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Thông tin cơ bản
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Tên khuyến mãi *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="VD: Giảm 20% cho món chính"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Mô tả chi tiết về chương trình khuyến mãi"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Promotion Type & Value */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Loại & giá trị khuyến mãi
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="promotion_type">Loại khuyến mãi *</Label>
                    <Select
                      value={formData.promotion_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, promotion_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Giảm theo %</SelectItem>
                        <SelectItem value="fixed_amount">Giảm tiền cố định</SelectItem>
                        <SelectItem value="buy_x_get_y">Mua X tặng Y</SelectItem>
                        <SelectItem value="combo">Combo đặc biệt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="discount_value">
                      Giá trị giảm *{" "}
                      {formData.promotion_type === "percentage" ? "(%)" : "(VNĐ)"}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_value: e.target.value,
                        })
                      }
                      placeholder={
                        formData.promotion_type === "percentage" ? "20" : "50000"
                      }
                      required
                    />
                  </div>
                  {formData.promotion_type === "percentage" && (
                    <div>
                      <Label htmlFor="max_discount">Giảm tối đa (VNĐ)</Label>
                      <Input
                        id="max_discount"
                        type="number"
                        value={formData.max_discount_amount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_discount_amount: e.target.value,
                          })
                        }
                        placeholder="100000"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="min_order">Đơn hàng tối thiểu (VNĐ)</Label>
                    <Input
                      id="min_order"
                      type="number"
                      value={formData.min_order_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          min_order_value: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Time Period */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Thời gian áp dụng
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Ngày bắt đầu *</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">Ngày kết thúc *</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Apply To */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Đối tượng áp dụng
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apply_to">Áp dụng cho</Label>
                    <Select
                      value={formData.apply_to}
                      onValueChange={(value) =>
                        setFormData({ ...formData, apply_to: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toàn bộ đơn hàng</SelectItem>
                        <SelectItem value="category">Theo danh mục</SelectItem>
                        <SelectItem value="items">Theo món cụ thể</SelectItem>
                        <SelectItem value="order_total">
                          Hóa đơn (theo tổng tiền)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.apply_to === "category" && (
                    <div>
                      <Label>Chọn danh mục</Label>
                      <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                        {categories.map((cat) => (
                          <div key={cat.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`cat-${cat.id}`}
                              checked={formData.category_ids.includes(cat.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    category_ids: [
                                      ...formData.category_ids,
                                      cat.id,
                                    ],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    category_ids: formData.category_ids.filter(
                                      (id) => id !== cat.id
                                    ),
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <Label
                              htmlFor={`cat-${cat.id}`}
                              className="cursor-pointer"
                            >
                              {cat.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.apply_to === "items" && (
                    <div>
                      <Label>Chọn món ăn</Label>
                      <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                        {menuItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`item-${item.id}`}
                              checked={formData.item_ids.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    item_ids: [...formData.item_ids, item.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    item_ids: formData.item_ids.filter(
                                      (id) => id !== item.id
                                    ),
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <Label
                              htmlFor={`item-${item.id}`}
                              className="cursor-pointer"
                            >
                              {item.name} -{" "}
                              {item.price.toLocaleString("vi-VN")}đ
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Điều kiện bổ sung
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="member_only">Chỉ dành cho thành viên</Label>
                    <Switch
                      id="member_only"
                      checked={formData.member_only}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, member_only: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">Kích hoạt ngay</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="usage_limit">Giới hạn số lần sử dụng</Label>
                    <Input
                      id="usage_limit"
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) =>
                        setFormData({ ...formData, usage_limit: e.target.value })
                      }
                      placeholder="Không giới hạn"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  {editingPromotion ? "Cập nhật" : "Tạo khuyến mãi"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Promotions List */}
      <div className="grid grid-cols-1 gap-4">
        {promotions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Tag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Chưa có khuyến mãi nào
              </h3>
              <p className="text-gray-500 mb-6">
                Tạo chương trình khuyến mãi đầu tiên để thu hút khách hàng
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tạo khuyến mãi ngay
              </Button>
            </CardContent>
          </Card>
        ) : (
          promotions.map((promotion) => (
            <Card
              key={promotion.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{promotion.name}</CardTitle>
                      {getStatusBadge(promotion)}
                    </div>
                    {promotion.description && (
                      <p className="text-sm text-gray-600">
                        {promotion.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(promotion)}
                      title={
                        promotion.is_active
                          ? "Tạm dừng"
                          : "Kích hoạt"
                      }
                    >
                      {promotion.is_active ? (
                        <Pause className="h-4 w-4 text-orange-600" />
                      ) : (
                        <Play className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingPromotion(promotion);
                        setFormData({
                          ...promotion,
                          start_date: promotion.start_date?.slice(0, 16),
                          end_date: promotion.end_date?.slice(0, 16),
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(promotion.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Loại khuyến mãi</p>
                    <p className="font-semibold">
                      {getPromotionTypeName(promotion.promotion_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Giá trị giảm</p>
                    <p className="font-semibold text-emerald-600">
                      {promotion.promotion_type === "percentage"
                        ? `${promotion.discount_value}%`
                        : `${promotion.discount_value.toLocaleString("vi-VN")}đ`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Áp dụng cho</p>
                    <p className="font-semibold">
                      {getApplyToName(promotion.apply_to)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Thời gian</p>
                    <p className="text-sm">
                      {new Date(promotion.start_date).toLocaleDateString("vi-VN")}{" "}
                      - {new Date(promotion.end_date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
                {promotion.min_order_value > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-600">
                      Đơn hàng tối thiểu:{" "}
                      <strong>
                        {promotion.min_order_value.toLocaleString("vi-VN")}đ
                      </strong>
                    </p>
                  </div>
                )}
                {promotion.usage_limit && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      Đã sử dụng: {promotion.usage_count || 0} /{" "}
                      {promotion.usage_limit}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PromotionManagement;
