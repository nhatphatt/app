import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, CreditCard, QrCode, Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/utils/api';

const PaymentSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState([]);

  const [cashMethod, setCashMethod] = useState(null);
  const [bankQRMethod, setBankQRMethod] = useState(null);
  const [momoMethod, setMomoMethod] = useState(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.get('/payment-methods');
      setMethods(response.data);

      // Organize by type
      response.data.forEach(method => {
        if (method.method_type === 'cash') {
          setCashMethod(method);
        } else if (method.method_type === 'bank_qr') {
          setBankQRMethod(method);
        } else if (method.method_type === 'momo') {
          setMomoMethod(method);
        }
      });
    } catch (error) {
      toast.error('Không thể tải cấu hình thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankQR = async () => {
    if (!bankQRMethod) return;

    setSaving(true);
    try {
      await api.put(`/payment-methods/${bankQRMethod.id}`, {
        method_type: 'bank_qr',
        is_enabled: bankQRMethod.is_enabled,
        display_name: bankQRMethod.display_name,
        display_order: bankQRMethod.display_order,
        bank_name: bankQRMethod.config.bank_name,
        bank_bin: bankQRMethod.config.bank_bin,
        account_number: bankQRMethod.config.account_number,
        account_name: bankQRMethod.config.account_name
      });

      toast.success('Đã lưu cấu hình QR Banking');
      fetchPaymentMethods();
    } catch (error) {
      toast.error('Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMomo = async () => {
    if (!momoMethod) return;

    setSaving(true);
    try {
      await api.put(`/payment-methods/${momoMethod.id}`, {
        method_type: 'momo',
        is_enabled: momoMethod.is_enabled,
        display_name: momoMethod.display_name,
        display_order: momoMethod.display_order,
        merchant_id: momoMethod.config.merchant_id,
        partner_code: momoMethod.config.partner_code,
        api_key: momoMethod.config.api_key,
        secret_key: momoMethod.config.secret_key
      });

      toast.success('Đã lưu cấu hình Momo');
      fetchPaymentMethods();
    } catch (error) {
      toast.error('Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCash = async (enabled) => {
    if (!cashMethod) return;

    try {
      await api.put(`/payment-methods/${cashMethod.id}`, {
        method_type: 'cash',
        is_enabled: enabled,
        display_name: cashMethod.display_name,
        display_order: cashMethod.display_order
      });

      setCashMethod({ ...cashMethod, is_enabled: enabled });
      toast.success(enabled ? 'Đã bật thanh toán tiền mặt' : 'Đã tắt thanh toán tiền mặt');
    } catch (error) {
      toast.error('Không thể cập nhật');
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
    <div className="p-8 space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Cấu hình Thanh toán</h1>
        <p className="text-gray-600">Quản lý các phương thức thanh toán cho cửa hàng</p>
      </div>

      <Tabs defaultValue="cash" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cash" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Tiền mặt
          </TabsTrigger>
          <TabsTrigger value="bank_qr" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Banking
          </TabsTrigger>
          <TabsTrigger value="momo" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Momo
          </TabsTrigger>
        </TabsList>

        {/* Cash Payment */}
        <TabsContent value="cash">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Thanh toán tiền mặt</CardTitle>
                  <CardDescription>
                    Cho phép khách hàng thanh toán bằng tiền mặt tại quầy
                  </CardDescription>
                </div>
                <Switch
                  checked={cashMethod?.is_enabled || false}
                  onCheckedChange={handleToggleCash}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-700">
                  ✓ Không cần cấu hình thêm
                </p>
                <p className="text-sm text-gray-700">
                  ✓ Nhân viên sẽ xác nhận thanh toán khi khách trả tiền
                </p>
                <p className="text-sm text-gray-700">
                  ✓ Đơn giản và dễ sử dụng
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank QR Payment */}
        <TabsContent value="bank_qr">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Chuyển khoản QR</CardTitle>
                  <CardDescription>
                    Khách hàng quét mã QR để chuyển khoản ngân hàng
                  </CardDescription>
                </div>
                <Switch
                  checked={bankQRMethod?.is_enabled || false}
                  onCheckedChange={(enabled) => {
                    setBankQRMethod({ ...bankQRMethod, is_enabled: enabled });
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1 text-sm text-blue-800">
                  <p className="font-medium mb-1">Hướng dẫn cấu hình VietQR</p>
                  <p>Điền thông tin tài khoản ngân hàng của bạn. Hệ thống sẽ tự động tạo mã QR VietQR để khách hàng quét và chuyển khoản.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Tên ngân hàng *</Label>
                  <Input
                    id="bank-name"
                    value={bankQRMethod?.config.bank_name || ''}
                    onChange={(e) => setBankQRMethod({
                      ...bankQRMethod,
                      config: { ...bankQRMethod.config, bank_name: e.target.value }
                    })}
                    placeholder="VD: Vietcombank, Techcombank..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank-bin">Mã ngân hàng (BIN) *</Label>
                  <Input
                    id="bank-bin"
                    value={bankQRMethod?.config.bank_bin || ''}
                    onChange={(e) => setBankQRMethod({
                      ...bankQRMethod,
                      config: { ...bankQRMethod.config, bank_bin: e.target.value }
                    })}
                    placeholder="VD: 970436 (Vietcombank)"
                  />
                  <p className="text-xs text-gray-500">
                    <a href="https://api.vietqr.io/v2/banks" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Xem danh sách mã BIN
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-number">Số tài khoản *</Label>
                  <Input
                    id="account-number"
                    value={bankQRMethod?.config.account_number || ''}
                    onChange={(e) => setBankQRMethod({
                      ...bankQRMethod,
                      config: { ...bankQRMethod.config, account_number: e.target.value }
                    })}
                    placeholder="VD: 1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-name">Tên chủ tài khoản *</Label>
                  <Input
                    id="account-name"
                    value={bankQRMethod?.config.account_name || ''}
                    onChange={(e) => setBankQRMethod({
                      ...bankQRMethod,
                      config: { ...bankQRMethod.config, account_name: e.target.value }
                    })}
                    placeholder="VD: NGUYEN VAN A"
                  />
                </div>
              </div>

              {bankQRMethod?.config.account_number && bankQRMethod?.config.bank_bin && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Xem trước mã QR:</p>
                  <div className="flex items-center justify-center bg-white p-4 rounded-lg border">
                    <img
                      src={`https://img.vietqr.io/image/${bankQRMethod.config.bank_bin}-${bankQRMethod.config.account_number}-compact2.jpg?amount=50000&addInfo=DEMO&accountName=${bankQRMethod.config.account_name}`}
                      alt="QR Preview"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">Mã QR demo với số tiền 50,000đ</p>
                </div>
              )}

              <Button
                onClick={handleSaveBankQR}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Lưu cấu hình
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Momo Payment */}
        <TabsContent value="momo">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ví MoMo</CardTitle>
                  <CardDescription>
                    Tích hợp thanh toán qua ví điện tử MoMo
                  </CardDescription>
                </div>
                <Switch
                  checked={momoMethod?.is_enabled || false}
                  onCheckedChange={(enabled) => {
                    if (!momoMethod) {
                      // Create new Momo method if doesn't exist
                      setMomoMethod({
                        id: '',
                        method_type: 'momo',
                        is_enabled: enabled,
                        display_name: 'Ví MoMo',
                        display_order: 3,
                        config: {
                          merchant_id: '',
                          partner_code: '',
                          api_key: '',
                          secret_key: ''
                        }
                      });
                    } else {
                      setMomoMethod({ ...momoMethod, is_enabled: enabled });
                    }
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1 text-sm text-orange-800">
                  <p className="font-medium mb-1">Yêu cầu đăng ký với MoMo</p>
                  <p>Bạn cần đăng ký tài khoản merchant với MoMo để lấy thông tin API. Truy cập <a href="https://business.momo.vn" target="_blank" rel="noopener noreferrer" className="font-semibold underline">business.momo.vn</a> để đăng ký.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partner-code">Partner Code *</Label>
                  <Input
                    id="partner-code"
                    value={momoMethod?.config.partner_code || ''}
                    onChange={(e) => setMomoMethod({
                      ...momoMethod,
                      config: { ...momoMethod.config, partner_code: e.target.value }
                    })}
                    placeholder="Nhập Partner Code từ MoMo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="merchant-id">Merchant ID</Label>
                  <Input
                    id="merchant-id"
                    value={momoMethod?.config.merchant_id || ''}
                    onChange={(e) => setMomoMethod({
                      ...momoMethod,
                      config: { ...momoMethod.config, merchant_id: e.target.value }
                    })}
                    placeholder="Nhập Merchant ID"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="access-key">Access Key *</Label>
                  <Input
                    id="access-key"
                    type="password"
                    value={momoMethod?.config.api_key || ''}
                    onChange={(e) => setMomoMethod({
                      ...momoMethod,
                      config: { ...momoMethod.config, api_key: e.target.value }
                    })}
                    placeholder="Nhập Access Key"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="secret-key">Secret Key *</Label>
                  <Input
                    id="secret-key"
                    type="password"
                    value={momoMethod?.config.secret_key || ''}
                    onChange={(e) => setMomoMethod({
                      ...momoMethod,
                      config: { ...momoMethod.config, secret_key: e.target.value }
                    })}
                    placeholder="Nhập Secret Key"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Lưu ý:</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Thông tin API được mã hóa và lưu trữ an toàn</li>
                  <li>Bạn cần cấu hình IPN URL và Return URL tại MoMo Business</li>
                  <li>Test trên môi trường sandbox trước khi go-live</li>
                </ul>
              </div>

              <Button
                onClick={handleSaveMomo}
                disabled={saving || !momoMethod}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Lưu cấu hình
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentSettings;
