import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Loader2, Upload, FileJson } from "lucide-react";
import api from "@/utils/api";
import { toast } from "sonner";

const MenuManagement = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    display_order: 0,
  });
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    image_url: "",
    is_available: true,
  });

  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        api.get("/categories"),
        api.get("/menu-items"),
      ]);
      setCategories(categoriesRes.data);
      setMenuItems(itemsRes.data);
    } catch (error) {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, categoryForm);
        toast.success("Cập nhật danh mục thành công");
      } else {
        await api.post("/categories", categoryForm);
        toast.success("Thêm danh mục thành công");
      }
      setCategoryDialogOpen(false);
      setCategoryForm({ name: "", display_order: 0 });
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Có lỗi xảy ra");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa danh mục này?")) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Xóa danh mục thành công");
      fetchData();
    } catch (error) {
      toast.error("Không thể xóa danh mục");
    }
  };

  // Menu item handlers
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...itemForm,
      price: parseFloat(itemForm.price),
    };
    try {
      if (editingItem) {
        await api.put(`/menu-items/${editingItem.id}`, payload);
        toast.success("Cập nhật món ăn thành công");
      } else {
        await api.post("/menu-items", payload);
        toast.success("Thêm món ăn thành công");
      }
      setItemDialogOpen(false);
      setItemForm({
        name: "",
        description: "",
        price: "",
        category_id: "",
        image_url: "",
        is_available: true,
      });
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Có lỗi xảy ra");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa món này?")) return;
    try {
      await api.delete(`/menu-items/${id}`);
      toast.success("Xóa món ăn thành công");
      fetchData();
    } catch (error) {
      toast.error("Không thể xóa món ăn");
    }
  };

  const handleDeleteAllItems = async () => {
    const itemCount = menuItems.length;
    if (itemCount === 0) {
      toast.error("Không có món ăn nào để xóa");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa TẤT CẢ ${itemCount} món ăn?\n\nHành động này KHÔNG THỂ HOÀN TÁC!`,
    );

    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirm = window.confirm(
      `Xác nhận lần cuối: Xóa ${itemCount} món ăn?\n\nNhấn OK để tiếp tục xóa.`,
    );

    if (!doubleConfirm) return;

    try {
      setLoading(true);
      const response = await api.delete("/menu-items");
      toast.success(`Đã xóa ${response.data.deleted_count} món ăn thành công`);
      fetchData();
    } catch (error) {
      toast.error(
        "Không thể xóa món ăn: " +
          (error.response?.data?.detail || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    try {
      setImportLoading(true);
      const data = JSON.parse(jsonInput);
      const response = await api.post("/menu-items/bulk-import", data);

      const { categories_created, items_success, items_failed, errors } =
        response.data;

      let successMsg = [];
      if (categories_created > 0) {
        successMsg.push(`${categories_created} danh mục`);
      }
      if (items_success > 0) {
        successMsg.push(`${items_success} món ăn`);
      }

      if (successMsg.length > 0) {
        toast.success(`Đã thêm ${successMsg.join(" và ")} thành công!`);
      }

      if (errors && errors.length > 0) {
        const errorMessages = errors
          .map((e) => `${e.item_name}: ${e.error}`)
          .join("\n");
        toast.error(`${items_failed} món bị lỗi:\n${errorMessages}`);
      }

      setBulkImportDialogOpen(false);
      setJsonInput("");
      fetchData();
    } catch (error) {
      if (error.message && error.message.includes("JSON")) {
        toast.error("JSON không hợp lệ. Vui lòng kiểm tra lại định dạng.");
      } else if (error.response?.data?.detail) {
        // Handle FastAPI detail error
        const detail = error.response.data.detail;
        if (typeof detail === "string") {
          toast.error(`Không thể import menu: ${detail}`);
        } else if (Array.isArray(detail)) {
          // Validation errors from FastAPI
          const errors = detail
            .map((err) => `${err.loc.join(".")}: ${err.msg}`)
            .join(", ");
          toast.error(`Lỗi validation: ${errors}`);
        } else {
          toast.error(`Không thể import menu: ${JSON.stringify(detail)}`);
        }
      } else if (error.response?.data) {
        toast.error(
          `Không thể import menu: ${JSON.stringify(error.response.data)}`,
        );
      } else if (error.message) {
        toast.error(`Không thể import menu: ${error.message}`);
      } else {
        toast.error(
          "Không thể import menu. Vui lòng kiểm tra console để biết thêm chi tiết.",
        );
      }
    } finally {
      setImportLoading(false);
    }
  };

  const getExampleJson = () => {
    return JSON.stringify(
      {
        categories: [
          {
            name: "Món Chính",
            display_order: 1,
          },
          {
            name: "Đồ Uống",
            display_order: 2,
          },
          {
            name: "Tráng Miệng",
            display_order: 3,
          },
        ],
        items: [
          {
            name: "Phở Bò",
            description: "Phở bò truyền thống Hà Nội",
            price: 65000,
            category_name: "Món Chính",
            image_url: "",
            is_available: true,
          },
          {
            name: "Bún Chả",
            description: "Bún chả Hà Nội đặc trưng",
            price: 55000,
            category_name: "Món Chính",
            image_url: "",
            is_available: true,
          },
          {
            name: "Cơm Tấm",
            description: "Cơm tấm sườn bì chả",
            price: 45000,
            category_name: "Món Chính",
            image_url: "",
            is_available: true,
          },
          {
            name: "Trà Đá",
            description: "Trà đá mát lạnh",
            price: 5000,
            category_name: "Đồ Uống",
            image_url: "",
            is_available: true,
          },
          {
            name: "Cà Phê Sữa Đá",
            description: "Cà phê phin truyền thống",
            price: 25000,
            category_name: "Đồ Uống",
            image_url: "",
            is_available: true,
          },
          {
            name: "Chè Ba Màu",
            description: "Chè đậu đỏ, đậu xanh, thạch",
            price: 20000,
            category_name: "Tráng Miệng",
            image_url: "",
            is_available: true,
          },
        ],
      },
      null,
      2,
    );
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
            Quản lý Menu
          </h1>
          <p className="text-gray-600">Quản lý danh mục và món ăn</p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories">Danh mục</TabsTrigger>
          <TabsTrigger value="items">Món ăn</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={categoryDialogOpen}
              onOpenChange={setCategoryDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ name: "", display_order: 0 });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm danh mục
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Sửa danh mục" : "Thêm danh mục mới"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Tên danh mục</Label>
                    <Input
                      id="cat-name"
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Ví dụ: Cafe, Trà sữa..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-order">Thứ tự hiển thị</Label>
                    <Input
                      id="cat-order"
                      type="number"
                      value={categoryForm.display_order}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          display_order: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingCategory ? "Cập nhật" : "Thêm"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{category.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryForm({
                            name: category.name,
                            display_order: category.display_order,
                          });
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Thứ tự: {category.display_order}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Menu Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-between items-center">
            <Button
              variant="destructive"
              onClick={handleDeleteAllItems}
              disabled={menuItems.length === 0 || loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Xóa tất cả món ({menuItems.length})
            </Button>

            <div className="flex gap-2">
              <Dialog
                open={bulkImportDialogOpen}
                onOpenChange={setBulkImportDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => {
                      setJsonInput(getExampleJson());
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import từ JSON
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileJson className="h-5 w-5 text-emerald-600" />
                      Import Menu từ JSON
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Hướng dẫn:</Label>
                      <div className="text-sm text-gray-600 space-y-1 mt-2">
                        <p>
                          • Thêm mảng{" "}
                          <code className="bg-gray-100 px-1 rounded">
                            categories
                          </code>{" "}
                          để tự động tạo danh mục mới (nếu danh mục đã tồn tại
                          sẽ bỏ qua)
                        </p>
                        <p>
                          • Sử dụng{" "}
                          <code className="bg-gray-100 px-1 rounded">
                            category_name
                          </code>{" "}
                          trong items để chỉ định danh mục (không phân biệt hoa
                          thường)
                        </p>
                        <p>
                          • Giá{" "}
                          <code className="bg-gray-100 px-1 rounded">
                            price
                          </code>{" "}
                          là số (không cần dấu phẩy hay chấm phân cách hàng
                          nghìn)
                        </p>
                        <p>
                          •{" "}
                          <code className="bg-gray-100 px-1 rounded">
                            is_available
                          </code>{" "}
                          có thể là true hoặc false
                        </p>
                        <p className="text-emerald-600 font-medium mt-2">
                          💡 Bạn có thể import toàn bộ menu chỉ với 1 file JSON!
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="json-input">JSON Data:</Label>
                      <textarea
                        id="json-input"
                        className="w-full min-h-[400px] p-4 border rounded-md font-mono text-sm"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder="Dán JSON của bạn vào đây..."
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBulkImportDialogOpen(false);
                          setJsonInput("");
                        }}
                        disabled={importLoading}
                      >
                        Hủy
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleBulkImport}
                        disabled={importLoading || !jsonInput.trim()}
                      >
                        {importLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Đang import...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Import Menu
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setEditingItem(null);
                      setItemForm({
                        name: "",
                        description: "",
                        price: "",
                        category_id: "",
                        image_url: "",
                        is_available: true,
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm món ăn
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Sửa món ăn" : "Thêm món mới"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleItemSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="item-name">Tên món</Label>
                        <Input
                          id="item-name"
                          value={itemForm.name}
                          onChange={(e) =>
                            setItemForm({ ...itemForm, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="item-price">Giá (VNĐ)</Label>
                        <Input
                          id="item-price"
                          type="number"
                          value={itemForm.price}
                          onChange={(e) =>
                            setItemForm({ ...itemForm, price: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item-category">Danh mục</Label>
                      <Select
                        value={itemForm.category_id}
                        onValueChange={(value) =>
                          setItemForm({ ...itemForm, category_id: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn danh mục" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item-desc">Mô tả</Label>
                      <Input
                        id="item-desc"
                        value={itemForm.description}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item-image">URL hình ảnh</Label>
                      <Input
                        id="item-image"
                        value={itemForm.image_url}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            image_url: e.target.value,
                          })
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      {editingItem ? "Cập nhật" : "Thêm"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => {
              const category = categories.find(
                (c) => c.id === item.category_id,
              );
              return (
                <Card
                  key={item.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{item.name}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingItem(item);
                            setItemForm({
                              name: item.name,
                              description: item.description,
                              price: item.price.toString(),
                              category_id: item.category_id,
                              image_url: item.image_url,
                              is_available: item.is_available,
                            });
                            setItemDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {item.price.toLocaleString("vi-VN")} đ
                    </p>
                    <p className="text-xs text-gray-500">
                      Danh mục: {category?.name}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MenuManagement;
