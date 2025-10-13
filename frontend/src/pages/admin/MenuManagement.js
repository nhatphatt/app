import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';

const MenuManagement = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', display_order: 0 });
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    is_available: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/menu-items'),
      ]);
      setCategories(categoriesRes.data);
      setMenuItems(itemsRes.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu');
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
        toast.success('Cập nhật danh mục thành công');
      } else {
        await api.post('/categories', categoryForm);
        toast.success('Thêm danh mục thành công');
      }
      setCategoryDialogOpen(false);
      setCategoryForm({ name: '', display_order: 0 });
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa danh mục này?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Xóa danh mục thành công');
      fetchData();
    } catch (error) {
      toast.error('Không thể xóa danh mục');
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
        toast.success('Cập nhật món ăn thành công');
      } else {
        await api.post('/menu-items', payload);
        toast.success('Thêm món ăn thành công');
      }
      setItemDialogOpen(false);
      setItemForm({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        is_available: true,
      });
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa món này?')) return;
    try {
      await api.delete(`/menu-items/${id}`);
      toast.success('Xóa món ăn thành công');
      fetchData();
    } catch (error) {
      toast.error('Không thể xóa món ăn');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in" data-testid="menu-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quản lý Menu</h1>
          <p className="text-gray-600">Quản lý danh mục và món ăn</p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories" data-testid="categories-tab">Danh mục</TabsTrigger>
          <TabsTrigger value="items" data-testid="items-tab">Món ăn</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ name: '', display_order: 0 });
                  }}
                  data-testid="add-category-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm danh mục
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="category-dialog">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Tên danh mục</Label>
                    <Input
                      id="cat-name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="Ví dụ: Cafe, Trà sữa..."
                      required
                      data-testid="category-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-order">Thứ tự hiển thị</Label>
                    <Input
                      id="cat-order"
                      type="number"
                      value={categoryForm.display_order}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) })
                      }
                      data-testid="category-order-input"
                    />
                  </div>
                  <Button type="submit" className="w-full" data-testid="category-submit-btn">
                    {editingCategory ? 'Cập nhật' : 'Thêm'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="hover:shadow-lg transition-shadow" data-testid={`category-card-${category.id}`}>
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
                        data-testid={`edit-category-${category.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id)}
                        data-testid={`delete-category-${category.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Thứ tự: {category.display_order}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Menu Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setEditingItem(null);
                    setItemForm({
                      name: '',
                      description: '',
                      price: '',
                      category_id: '',
                      image_url: '',
                      is_available: true,
                    });
                  }}
                  data-testid="add-item-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm món ăn
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" data-testid="item-dialog">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Sửa món ăn' : 'Thêm món mới'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleItemSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="item-name">Tên món</Label>
                      <Input
                        id="item-name"
                        value={itemForm.name}
                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                        required
                        data-testid="item-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item-price">Giá (VNĐ)</Label>
                      <Input
                        id="item-price"
                        type="number"
                        value={itemForm.price}
                        onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                        required
                        data-testid="item-price-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-category">Danh mục</Label>
                    <Select
                      value={itemForm.category_id}
                      onValueChange={(value) => setItemForm({ ...itemForm, category_id: value })}
                      required
                    >
                      <SelectTrigger data-testid="item-category-select">
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
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      data-testid="item-desc-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-image">URL hình ảnh</Label>
                    <Input
                      id="item-image"
                      value={itemForm.image_url}
                      onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                      placeholder="https://..."
                      data-testid="item-image-input"
                    />
                  </div>
                  <Button type="submit" className="w-full" data-testid="item-submit-btn">
                    {editingItem ? 'Cập nhật' : 'Thêm'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => {
              const category = categories.find((c) => c.id === item.category_id);
              return (
                <Card key={item.id} className="hover:shadow-lg transition-shadow" data-testid={`item-card-${item.id}`}>
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
                          data-testid={`edit-item-${item.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          data-testid={`delete-item-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {item.price.toLocaleString('vi-VN')} đ
                    </p>
                    <p className="text-xs text-gray-500">Danh mục: {category?.name}</p>
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