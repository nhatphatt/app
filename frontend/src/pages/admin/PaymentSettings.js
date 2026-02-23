import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, CreditCard, QrCode, Wallet, AlertCircle, Search, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/utils/api';
import { cn } from '@/lib/utils';

// Danh sách ngân hàng Việt Nam
const VIETNAMESE_BANKS = [
  { code: '970425', name: 'ABBANK - Ngân hàng TMCP An Bình' },
  { code: '970416', name: 'ACB - Ngân hàng TMCP Á Châu' },
  { code: '970405', name: 'Agribank - Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
  { code: '970409', name: 'BacABank - Ngân hàng TMCP Bắc Á' },
  { code: '970438', name: 'BaoVietBank - Ngân hàng TMCP Bảo Việt' },
  { code: '970418', name: 'BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { code: '546034', name: 'CAKE - TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank' },
  { code: '422589', name: 'CIMB - Ngân hàng TNHH MTV CIMB Việt Nam' },
  { code: '970446', name: 'COOPBANK - Ngân hàng Hợp tác xã Việt Nam' },
  { code: '970431', name: 'Eximbank - Ngân hàng TMCP Xuất Nhập khẩu Việt Nam' },
  { code: '970437', name: 'HDBank - Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh' },
  { code: '668888', name: 'KBank - Ngân hàng Đại chúng TNHH Kasikornbank' },
  { code: '970452', name: 'KienLongBank - Ngân hàng TMCP Kiên Long' },
  { code: '970449', name: 'LPBank - Ngân hàng TMCP Lộc Phát Việt Nam' },
  { code: '970422', name: 'MBBank - Ngân hàng TMCP Quân đội' },
  { code: '970414', name: 'MBV - Ngân hàng TNHH MTV Việt Nam Hiện Đại' },
  { code: '971025', name: 'MoMo - CTCP Dịch Vụ Di Động Trực Tuyến' },
  { code: '970426', name: 'MSB - Ngân hàng TMCP Hàng Hải Việt Nam' },
  { code: '970428', name: 'NamABank - Ngân hàng TMCP Nam Á' },
  { code: '970419', name: 'NCB - Ngân hàng TMCP Quốc Dân' },
  { code: '970448', name: 'OCB - Ngân hàng TMCP Phương Đông' },
  { code: '970430', name: 'PGBank - Ngân hàng TMCP Thịnh vượng và Phát triển' },
  { code: '970412', name: 'PVcomBank - Ngân hàng TMCP Đại Chúng Việt Nam' },
  { code: '971133', name: 'PVcomBank Pay - Ngân hàng TMCP Đại Chúng Việt Nam Ngân hàng số' },
  { code: '970403', name: 'Sacombank - Ngân hàng TMCP Sài Gòn Thương Tín' },
  { code: '970400', name: 'SaigonBank - Ngân hàng TMCP Sài Gòn Công Thương' },
  { code: '970429', name: 'SCB - Ngân hàng TMCP Sài Gòn' },
  { code: '970440', name: 'SeABank - Ngân hàng TMCP Đông Nam Á' },
  { code: '970443', name: 'SHB - Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { code: '970424', name: 'ShinhanBank - Ngân hàng TNHH MTV Shinhan Việt Nam' },
  { code: '970407', name: 'Techcombank - Ngân hàng TMCP Kỹ thương Việt Nam' },
  { code: '963388', name: 'Timo - Ngân hàng số Timo by Ban Viet Bank (Timo by Ban Viet Bank)' },
  { code: '970423', name: 'TPBank - Ngân hàng TMCP Tiên Phong' },
  { code: '546035', name: 'Ubank - TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank' },
  { code: '970441', name: 'VIB - Ngân hàng TMCP Quốc tế Việt Nam' },
  { code: '970427', name: 'VietABank - Ngân hàng TMCP Việt Á' },
  { code: '970433', name: 'VietBank - Ngân hàng TMCP Việt Nam Thương Tín' },
  { code: '970454', name: 'VietCapitalBank - Ngân hàng TMCP Bản Việt' },
  { code: '970436', name: 'Vietcombank - Ngân hàng TMCP Ngoại Thương Việt Nam' },
  { code: '970415', name: 'VietinBank - Ngân hàng TMCP Công thương Việt Nam' },
  { code: '970432', name: 'VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { code: '970457', name: 'Woori - Ngân hàng TNHH MTV Woori Việt Nam' },
];

// Custom Bank Select Component with Search
const BankSelect = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const selectedBank = VIETNAMESE_BANKS.find(b => b.code === value);

  const filteredBanks = VIETNAMESE_BANKS.filter(bank =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.code.includes(searchTerm)
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (bankCode) => {
    const bank = VIETNAMESE_BANKS.find(b => b.code === bankCode);
    if (bank) {
      onChange(bank);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ code: '', name: '' });
    setSearchTerm('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 border rounded-md bg-white cursor-text transition-all",
          isFocused ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200",
          disabled && "bg-gray-50 cursor-not-allowed opacity-60"
        )}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : (selectedBank?.name || '')}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder="Tìm kiếm ngân hàng..."
          className="flex-1 outline-none bg-transparent text-sm min-w-0"
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedBank && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              disabled={disabled}
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
          {filteredBanks.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              Không tìm thấy ngân hàng
            </div>
          ) : (
            filteredBanks.map((bank) => (
              <button
                key={bank.code}
                type="button"
                onClick={() => handleSelect(bank.code)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 transition-colors",
                  value === bank.code && "bg-emerald-50 text-emerald-700"
                )}
              >
                <span className="font-medium">{bank.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

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

  const handleBankChange = (bank) => {
    setBankQRMethod({
      ...bankQRMethod,
      config: { 
        ...bankQRMethod.config, 
        bank_name: bank.name,
        bank_bin: bank.code
      }
    });
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
                  onCheckedChange={async (enabled) => {
                    setBankQRMethod({ ...bankQRMethod, is_enabled: enabled });
                    try {
                      await api.put(`/payment-methods/${bankQRMethod.id}`, { is_enabled: enabled });
                      toast.success(enabled ? 'Đã bật QR Banking' : 'Đã tắt QR Banking');
                    } catch (e) { toast.error('Không thể cập nhật'); }
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
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label htmlFor="bank-name">Tên ngân hàng *</Label>
                  <BankSelect
                    value={bankQRMethod?.config.bank_bin || ''}
                    onChange={handleBankChange}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label htmlFor="bank-bin">Mã ngân hàng (BIN)</Label>
                  <Input
                    id="bank-bin"
                    value={bankQRMethod?.config.bank_bin || ''}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed font-mono"
                    placeholder="Mã BIN sẽ tự động điền"
                  />
                  <p className="text-xs text-gray-500">
                    Mã BIN được tự động điền khi chọn ngân hàng
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
                  onCheckedChange={async (enabled) => {
                    if (!momoMethod) {
                      setMomoMethod({
                        id: '', method_type: 'momo', is_enabled: enabled,
                        display_name: 'Ví MoMo', display_order: 3,
                        config: { merchant_id: '', partner_code: '', api_key: '', secret_key: '' }
                      });
                    } else {
                      setMomoMethod({ ...momoMethod, is_enabled: enabled });
                      try {
                        await api.put(`/payment-methods/${momoMethod.id}`, { is_enabled: enabled });
                        toast.success(enabled ? 'Đã bật MoMo' : 'Đã tắt MoMo');
                      } catch (e) { toast.error('Không thể cập nhật'); }
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
