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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2, Loader2, QrCode, Download, Crown, Info, DoorOpen, DoorClosed } from "lucide-react";
import api from "@/utils/api";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { useLoading } from "../../contexts/LoadingContext";

const TablesManagement = () => {
  const [tables, setTables] = useState([]);
  const { showLoading, hideLoading } = useLoading();
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', description: '', onConfirm: null, variant: 'danger' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const [tableForm, setTableForm] = useState({
    table_number: "",
    capacity: 4,
  });

  useEffect(() => {
    fetchTables();
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await api.get("/subscriptions/current");
      setSubscription(response.data);
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await api.get("/tables");
      setTables(response.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách bàn");
    } finally {
      hideLoading();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTable) {
        await api.put(`/tables/${editingTable.id}`, tableForm);
        toast.success("Cập nhật bàn thành công");
      } else {
        await api.post("/tables", tableForm);
        toast.success("Thêm bàn thành công");
      }
      setDialogOpen(false);
      setTableForm({ table_number: "", capacity: 4 });
      setEditingTable(null);
      fetchTables();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Có lỗi xảy ra");
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      open: true,
      title: 'Xóa bàn',
      description: 'Bạn có chắc chắn muốn xóa bàn này?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/tables/${id}`);
          toast.success("Xóa bàn thành công");
          fetchTables();
          setConfirmDialog(prev => ({ ...prev, open: false }));
        } catch (error) {
          toast.error("Không thể xóa bàn");
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const toggleTableStatus = async (table) => {
    const newStatus = table.status === "occupied" ? "available" : "occupied";
    const label = newStatus === "occupied" ? "Mở bàn" : "Đóng bàn";
    try {
      await api.put(`/tables/${table.id}`, { status: newStatus });
      toast.success(`${label} ${table.table_number} thành công`);
      fetchTables();
    } catch (error) {
      toast.error(`Không thể ${label.toLowerCase()}`);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      available: { label: "Trống", color: "bg-green-100 text-green-700" },
      occupied: {
        label: "Đang phục vụ",
        color: "bg-yellow-100 text-yellow-700",
      },
      reserved: { label: "Đã đặt", color: "bg-blue-100 text-blue-700" },
    };
    const { label, color } = config[status] || config.available;
    return <Badge className={color}>{label}</Badge>;
  };

  const handleShowQR = (table) => {
    setSelectedTable(table);
    setQrDialogOpen(true);
  };

  const downloadQRCode = (table) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
      table.qr_code_url,
    )}`;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `qr-ban-${table.table_number}.png`;
    link.click();
  };

  const downloadAllQRCodes = async () => {
    if (tables.length === 0) return;
    toast.info(`Đang tải ${tables.length} mã QR...`);
    for (const table of tables) {
      if (!table.qr_code_url) continue;
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(table.qr_code_url)}`;
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-ban-${table.table_number}.png`;
        link.click();
        window.URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.error(`Lỗi tải QR bàn ${table.table_number}`, e);
      }
    }
    toast.success(`Đã tải ${tables.length} mã QR`);
  };


  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quản lý Bàn</h1>
          <p className="text-gray-600">Tạo và quản lý bàn với mã QR riêng</p>
        </div>
        <div className="flex items-center gap-3">
          {tables.length > 0 && (
            <Button variant="outline" onClick={downloadAllQRCodes}>
              <Download className="h-4 w-4 mr-2" />
              Tải tất cả QR ({tables.length})
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setEditingTable(null);
                setTableForm({ table_number: "", capacity: 4 });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm bàn
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTable ? "Sửa bàn" : "Thêm bàn mới"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="table-number">Số bàn</Label>
                <Input
                  id="table-number"
                  value={tableForm.table_number}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, table_number: e.target.value })
                  }
                  placeholder="VD: Bàn 1, A1, B2..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Số chỗ ngồi</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) =>
                    setTableForm({
                      ...tableForm,
                      capacity: parseInt(e.target.value),
                    })
                  }
                  min="1"
                />
              </div>
              <Button type="submit" className="w-full">
                {editingTable ? "Cập nhật" : "Thêm"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {tables.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">
              Chưa có bàn nào. Hãy thêm bàn đầu tiên!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <Card key={table.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {table.table_number}
                  </CardTitle>
                  {getStatusBadge(table.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>Số chỗ ngồi: {table.capacity} người</p>
                </div>

                {/* Toggle open/close */}
                <Button
                  size="sm"
                  className={`w-full ${
                    table.status === "occupied"
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                  onClick={() => toggleTableStatus(table)}
                >
                  {table.status === "occupied" ? (
                    <><DoorClosed className="h-4 w-4 mr-2" />Đóng bàn</>
                  ) : (
                    <><DoorOpen className="h-4 w-4 mr-2" />Mở bàn</>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleShowQR(table)}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Xem QR
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditingTable(table);
                      setTableForm({
                        table_number: table.table_number,
                        capacity: table.capacity,
                      });
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(table.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mã QR - {selectedTable?.table_number}</DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border text-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    selectedTable.qr_code_url,
                  )}`}
                  alt={`QR Code ${selectedTable.table_number}`}
                  className="mx-auto"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="text-xs text-gray-500 mb-1">URL:</p>
                <p className="text-sm font-mono text-gray-800 break-all">
                  {selectedTable.qr_code_url}
                </p>
              </div>
              <p className="text-sm text-gray-600 text-center">
                Khách hàng quét mã này để xem menu và đặt món cho{" "}
                {selectedTable.table_number}
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => downloadQRCode(selectedTable)}
              >
                <Download className="h-4 w-4 mr-2" />
                Tải xuống QR Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
};

export default TablesManagement;
