import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ImageUpload from "@/components/ImageUpload";
import { Loader2, Store } from "lucide-react";
import api from "@/utils/api";
import { toast } from "sonner";
import { getAuthUser } from "@/utils/auth";

const StoreSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState(null);
  const user = getAuthUser();

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    try {
      const response = await api.get("/stores/me");
      setStore(response.data);
    } catch (error) {
      toast.error("Không thể tải thông tin cửa hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: store.name,
        address: store.address,
        phone: store.phone,
        logo: store.logo,
      };
      await api.put("/stores/me", payload);
      toast.success("Cập nhật thông tin thành công");
    } catch (error) {
      toast.error("Không thể cập nhật thông tin");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const menuUrl = `${window.location.origin}/menu/${store.slug}`;

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Cài đặt Cửa hàng
        </h1>
        <p className="text-gray-600">Quản lý thông tin cửa hàng của bạn</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Info Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Thông tin cửa hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên cửa hàng</Label>
                <Input
                  id="name"
                  value={store.name}
                  onChange={(e) => setStore({ ...store, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input
                  id="address"
                  value={store.address}
                  onChange={(e) =>
                    setStore({ ...store, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={store.phone}
                  onChange={(e) =>
                    setStore({ ...store, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  value={store.logo || ""}
                  onChange={(e) => setStore({ ...store, logo: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hoặc tải logo lên từ máy tính:
                </p>
                <ImageUpload
                  value={store.logo}
                  onChange={(imageUrl, file) => {
                    setStore({ ...store, logo: imageUrl });
                    // TODO: Upload to server and get URL
                    console.log("Store logo image:", file);
                  }}
                  aspectRatio="aspect-square"
                  placeholder="Upload logo cửa hàng"
                  objectFit="contain"
                  className="max-w-[200px]"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Menu URL & QR Code */}
        <Card>
          <CardHeader>
            <CardTitle>Thiết lập Menu công khai</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL Menu của bạn</Label>
              <div className="flex gap-2">
                <Input value={menuUrl} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(menuUrl);
                    toast.success("Đã sao chép URL");
                  }}
                >
                  Sao chép
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mã QR Code</Label>
              <div className="bg-white p-4 rounded-lg border text-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    menuUrl,
                  )}`}
                  alt="QR Code"
                  className="mx-auto"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Khách hàng quét mã này để xem menu
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(menuUrl, "_blank")}
            >
              Xem trước Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoreSettings;
