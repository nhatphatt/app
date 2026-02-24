import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Link as LinkIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import api from '../../utils/api';

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [importJson, setImportJson] = useState('');
  const [stats, setStats] = useState({
    total_items: 0,
    total_quantity: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
  });

  const [formData, setFormData] = useState({
    dish_name: '',
    category_name: 'Món Chính',
    quantity_in_stock: 0,
    reorder_threshold: 10,
    unit: 'phần',
  });

  const [adjustmentData, setAdjustmentData] = useState({
    adjustment_type: 'add',
    quantity: 0,
    reason: '',
  });

  const categories = ['Món Chính', 'Đồ Uống', 'Tráng Miệng', 'Khai Vị', 'Món Phụ'];

  useEffect(() => {
    fetchInventory();
    fetchStats();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, searchTerm, categoryFilter, stockFilter]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory-dishes');
      setInventory(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/inventory-dishes/stats/summary');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filterInventory = () => {
    let filtered = [...inventory];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.dish_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category_name === categoryFilter);
    }

    // Stock filter
    if (stockFilter === 'low') {
      filtered = filtered.filter((item) => item.is_low_stock && item.quantity_in_stock > 0);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter((item) => item.quantity_in_stock === 0);
    }

    setFilteredInventory(filtered);
  };

  const handleAdd = async () => {
    try {
      await api.post('/inventory-dishes', formData);
      setShowAddDialog(false);
      resetForm();
      fetchInventory();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.detail || 'Lỗi khi thêm món vào kho');
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/inventory-dishes/${currentItem.id}`, formData);
      setShowEditDialog(false);
      setCurrentItem(null);
      resetForm();
      fetchInventory();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.detail || 'Lỗi khi cập nhật món');
    }
  };

  const handleAdjust = async () => {
    try {
      await api.post(`/inventory-dishes/${currentItem.id}/adjust`, adjustmentData);
      setShowAdjustDialog(false);
      setCurrentItem(null);
      setAdjustmentData({ adjustment_type: 'add', quantity: 0, reason: '' });
      fetchInventory();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.detail || 'Lỗi khi điều chỉnh số lượng');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa món này khỏi kho?')) return;

    try {
      await api.delete(`/inventory-dishes/${id}`);
      fetchInventory();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.detail || 'Lỗi khi xóa món');
    }
  };

  const openEditDialog = (item) => {
    setCurrentItem(item);
    setFormData({
      dish_name: item.dish_name,
      category_name: item.category_name,
      quantity_in_stock: item.quantity_in_stock,
      reorder_threshold: item.reorder_threshold,
      unit: item.unit,
    });
    setShowEditDialog(true);
  };

  const openAdjustDialog = (item) => {
    setCurrentItem(item);
    setShowAdjustDialog(true);
  };

  const resetForm = () => {
    setFormData({
      dish_name: '',
      category_name: 'Món Chính',
      quantity_in_stock: 0,
      reorder_threshold: 10,
      unit: 'phần',
    });
  };

  // New functions for import and sync
  const fetchMenuItems = async () => {
    try {
      const response = await api.get('/menu-items');
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const handleImportJson = async () => {
    try {
      const data = JSON.parse(importJson);
      
      if (!data.items || !Array.isArray(data.items)) {
        alert('JSON không đúng định dạng. Cần có trường "items" là một mảng');
        return;
      }

      const response = await api.post('/inventory-dishes/bulk-import', data);
      
      alert(`Thành công: ${response.data.items_success} món, Lỗi: ${response.data.items_failed} món`);
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.log('Errors:', response.data.errors);
      }
      
      setShowImportDialog(false);
      setImportJson('');
      fetchInventory();
      fetchStats();
    } catch (error) {
      if (error.message.includes('JSON')) {
        alert('Lỗi: JSON không hợp lệ. Vui lòng kiểm tra lại cú pháp.');
      } else {
        alert(error.response?.data?.detail || 'Lỗi khi import dữ liệu');
      }
    }
  };

  const handleSyncFromMenu = async () => {
    try {
      // Get items from menu that don't exist in inventory
      const menuItemsNotInInventory = menuItems.filter(menuItem => {
        return !inventory.some(invItem => 
          invItem.dish_name.toLowerCase() === menuItem.name.toLowerCase()
        );
      });

      if (menuItemsNotInInventory.length === 0) {
        alert('Tất cả món trong menu đã có trong kho!');
        setShowSyncDialog(false);
        return;
      }

      // Get category for each menu item
      const categoriesResponse = await api.get('/categories');
      const categories = categoriesResponse.data;

      // Create inventory items from menu items
      const inventoryItems = menuItemsNotInInventory.map(menuItem => {
        const category = categories.find(c => c.id === menuItem.category_id);
        return {
          dish_name: menuItem.name,
          category_name: category?.name || 'Món Chính',
          quantity_in_stock: 0,
          reorder_threshold: 10,
          unit: 'phần'
        };
      });

      const response = await api.post('/inventory-dishes/bulk-import', {
        items: inventoryItems
      });

      alert(`Đã đồng bộ ${response.data.items_success} món từ menu!`);
      setShowSyncDialog(false);
      fetchInventory();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.detail || 'Lỗi khi đồng bộ dữ liệu');
    }
  };

  const exportToJson = () => {
    const exportData = {
      items: inventory.map(item => ({
        dish_name: item.dish_name,
        category_name: item.category_name,
        quantity_in_stock: item.quantity_in_stock,
        reorder_threshold: item.reorder_threshold,
        unit: item.unit
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ kho hàng? Hành động này không thể hoàn tác!')) return;
    try {
      await api.delete('/inventory-dishes/delete-all');
      toast.success('Đã xóa toàn bộ kho hàng');
      fetchInventory();
      fetchStats();
    } catch (error) {
      toast.error('Lỗi khi xóa kho hàng');
    }
  };

  const getStockStatusBadge = (item) => {
    if (item.quantity_in_stock === 0) {
      return <Badge variant="destructive">Hết hàng</Badge>;
    } else if (item.is_low_stock) {
      return <Badge variant="warning" className="bg-yellow-500">Tồn kho thấp</Badge>;
    } else {
      return <Badge variant="success" className="bg-green-500">Còn hàng</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản Lý Kho Món Ăn</h1>
          <p className="text-gray-500 mt-1">Quản lý tồn kho và số lượng món ăn</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSyncDialog(true)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Đồng Bộ Menu
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import JSON
          </Button>
          <Button variant="outline" onClick={exportToJson}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          {inventory.length > 0 && (
            <Button variant="destructive" onClick={handleDeleteAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa tất cả
            </Button>
          )}
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm Món
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Số Món</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_items}</div>
            <p className="text-xs text-muted-foreground">món trong kho</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Số Lượng</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_quantity}</div>
            <p className="text-xs text-muted-foreground">tổng tồn kho</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tồn Kho Thấp</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.low_stock_count}</div>
            <p className="text-xs text-muted-foreground">cần nhập thêm</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hết Hàng</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.out_of_stock_count}</div>
            <p className="text-xs text-muted-foreground">đã hết hàng</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Tìm kiếm món..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Lọc theo loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Lọc tồn kho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="low">Tồn kho thấp</SelectItem>
                <SelectItem value="out">Hết hàng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {stats.low_stock_count > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            Có {stats.low_stock_count} món đang tồn kho thấp. Vui lòng nhập thêm hàng.
          </AlertDescription>
        </Alert>
      )}

      {/* Inventory Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên Món</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead className="text-center">Tồn Kho</TableHead>
                <TableHead className="text-center">Ngưỡng Cảnh Báo</TableHead>
                <TableHead className="text-center">Đơn Vị</TableHead>
                <TableHead className="text-center">Trạng Thái</TableHead>
                <TableHead className="text-right">Hành Động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Không tìm thấy món nào trong kho
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.dish_name}</TableCell>
                    <TableCell>{item.category_name}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          item.quantity_in_stock === 0
                            ? 'text-red-600 font-bold'
                            : item.is_low_stock
                            ? 'text-yellow-600 font-bold'
                            : 'text-green-600 font-bold'
                        }
                      >
                        {item.quantity_in_stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{item.reorder_threshold}</TableCell>
                    <TableCell className="text-center">{item.unit}</TableCell>
                    <TableCell className="text-center">{getStockStatusBadge(item)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustDialog(item)}
                        >
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm Món Vào Kho</DialogTitle>
            <DialogDescription>Nhập thông tin món ăn mới vào kho</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tên Món</Label>
              <Input
                value={formData.dish_name}
                onChange={(e) => setFormData({ ...formData, dish_name: e.target.value })}
                placeholder="Ví dụ: Phở Bò"
              />
            </div>

            <div>
              <Label>Loại Món</Label>
              <Select
                value={formData.category_name}
                onValueChange={(value) => setFormData({ ...formData, category_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Số Lượng Tồn Kho</Label>
              <Input
                type="number"
                value={formData.quantity_in_stock}
                onChange={(e) =>
                  setFormData({ ...formData, quantity_in_stock: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>Ngưỡng Cảnh Báo</Label>
              <Input
                type="number"
                value={formData.reorder_threshold}
                onChange={(e) =>
                  setFormData({ ...formData, reorder_threshold: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>Đơn Vị</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phần">Phần</SelectItem>
                  <SelectItem value="ly">Ly</SelectItem>
                  <SelectItem value="chai">Chai</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="gói">Gói</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleAdd}>Thêm Món</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh Sửa Món</DialogTitle>
            <DialogDescription>Cập nhật thông tin món trong kho</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tên Món</Label>
              <Input
                value={formData.dish_name}
                onChange={(e) => setFormData({ ...formData, dish_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Loại Món</Label>
              <Select
                value={formData.category_name}
                onValueChange={(value) => setFormData({ ...formData, category_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Số Lượng Tồn Kho</Label>
              <Input
                type="number"
                value={formData.quantity_in_stock}
                onChange={(e) =>
                  setFormData({ ...formData, quantity_in_stock: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>Ngưỡng Cảnh Báo</Label>
              <Input
                type="number"
                value={formData.reorder_threshold}
                onChange={(e) =>
                  setFormData({ ...formData, reorder_threshold: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>Đơn Vị</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phần">Phần</SelectItem>
                  <SelectItem value="ly">Ly</SelectItem>
                  <SelectItem value="chai">Chai</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="gói">Gói</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleEdit}>Cập Nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Quantity Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Điều Chỉnh Số Lượng</DialogTitle>
            <DialogDescription>
              Điều chỉnh số lượng tồn kho cho: {currentItem?.dish_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Kiểu Điều Chỉnh</Label>
              <Select
                value={adjustmentData.adjustment_type}
                onValueChange={(value) =>
                  setAdjustmentData({ ...adjustmentData, adjustment_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Thêm Vào Kho</SelectItem>
                  <SelectItem value="subtract">Trừ Khỏi Kho</SelectItem>
                  <SelectItem value="set">Đặt Số Lượng Mới</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Số Lượng</Label>
              <Input
                type="number"
                value={adjustmentData.quantity}
                onChange={(e) =>
                  setAdjustmentData({ ...adjustmentData, quantity: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>Lý Do</Label>
              <Input
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                placeholder="Ví dụ: Nhập hàng mới, Hàng hỏng..."
              />
            </div>

            {currentItem && (
              <Alert>
                <AlertDescription>
                  Tồn kho hiện tại: <strong>{currentItem.quantity_in_stock}</strong>{' '}
                  {currentItem.unit}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleAdjust}>Điều Chỉnh</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Import JSON Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import JSON - Nhập Hàng Loạt</DialogTitle>
            <DialogDescription>
              Nhập dữ liệu kho từ file JSON. Format: {`{"items": [...]}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Dán nội dung JSON vào đây:</Label>
              <textarea
                className="w-full h-64 p-3 border rounded-md font-mono text-sm"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder={`{
  "items": [
    {
      "dish_name": "Phở Bò",
      "category_name": "Món Chính",
      "quantity_in_stock": 50,
      "reorder_threshold": 10,
      "unit": "phần"
    }
  ]
}`}
              />
            </div>

            <Alert>
              <AlertDescription>
                <strong>Hướng dẫn:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>JSON phải có trường "items" là một mảng</li>
                  <li>Mỗi món cần có: dish_name, category_name, quantity_in_stock, reorder_threshold, unit</li>
                  <li>Món trùng tên sẽ bị bỏ qua</li>
                  <li>Hoặc click "Export JSON" để xem format mẫu</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleImportJson} disabled={!importJson.trim()}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync from Menu Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Đồng Bộ Từ Menu
              </div>
            </DialogTitle>
            <DialogDescription>
              Tự động tạo mục kho cho các món trong menu chưa có trong kho
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <LinkIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>Chức năng này sẽ:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Quét tất cả món trong menu</li>
                  <li>Tìm món chưa có trong kho</li>
                  <li>Tự động tạo mục kho với số lượng ban đầu = 0</li>
                  <li>Giữ nguyên các món đã có trong kho</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Tổng món trong menu:</p>
                  <p className="text-2xl font-bold">{menuItems.length}</p>
                </div>
                <div>
                  <p className="text-gray-500">Đã có trong kho:</p>
                  <p className="text-2xl font-bold">
                    {menuItems.filter(menuItem => 
                      inventory.some(invItem => 
                        invItem.dish_name.toLowerCase() === menuItem.name.toLowerCase()
                      )
                    ).length}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Sẽ tạo mới:</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {menuItems.filter(menuItem => 
                      !inventory.some(invItem => 
                        invItem.dish_name.toLowerCase() === menuItem.name.toLowerCase()
                      )
                    ).length}
                  </p>
                </div>
              </div>
            </div>

            {menuItems.filter(menuItem => 
              !inventory.some(invItem => 
                invItem.dish_name.toLowerCase() === menuItem.name.toLowerCase()
              )
            ).length === 0 && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription>
                  ✅ Tất cả món trong menu đã có trong kho. Không cần đồng bộ.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleSyncFromMenu}
              disabled={menuItems.filter(menuItem => 
                !inventory.some(invItem => 
                  invItem.dish_name.toLowerCase() === menuItem.name.toLowerCase()
                )
              ).length === 0}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Đồng Bộ Ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;
