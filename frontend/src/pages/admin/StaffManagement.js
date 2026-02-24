import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  Plus,
  Search,
  Edit,
  Trash2,
  UserPlus,
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  Briefcase,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { useLoading } from '../../contexts/LoadingContext';
import { toast } from 'sonner';

const StaffManagement = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const { showLoading, hideLoading } = useLoading();
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', description: '', onConfirm: null, variant: 'danger' });

  // Employees state
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Shifts state
  const [shifts, setShifts] = useState([]);
  const [filteredShifts, setFilteredShifts] = useState([]);
  const [shiftDateFilter, setShiftDateFilter] = useState('');
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showBulkShiftDialog, setShowBulkShiftDialog] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  // Attendance state
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [activeAttendance, setActiveAttendance] = useState([]);
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('');

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    position: 'phục vụ',
    phone_number: '',
    email: '',
    hire_date: new Date().toISOString().split('T')[0],
    salary: 0,
    notes: '',
  });

  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    shift_date: new Date().toISOString().split('T')[0],
    shift_start: '08:00',
    shift_end: '17:00',
    notes: '',
  });

  const [bulkShiftForm, setBulkShiftForm] = useState({
    employee_ids: [],
    shift_date: new Date().toISOString().split('T')[0],
    shift_start: '08:00',
    shift_end: '17:00',
    notes: '',
  });

  const positions = ['phục vụ', 'pha chế', 'quản lý', 'thu ngân', 'bếp'];

  useEffect(() => {
    fetchEmployees();
    fetchShifts();
    fetchAttendance();
    fetchActiveAttendance();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, employeeSearchTerm, statusFilter]);

  useEffect(() => {
    filterShifts();
  }, [shifts, shiftDateFilter]);

  useEffect(() => {
    filterAttendance();
  }, [attendanceLogs, attendanceDateFilter]);

  // ========== EMPLOYEE FUNCTIONS ==========

  const fetchEmployees = async () => {
    try {
      showLoading('Đang tải dữ liệu...');
      const response = await api.get('/employees');
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      hideLoading();
    }
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    if (employeeSearchTerm) {
      filtered = filtered.filter(
        (emp) =>
          emp.full_name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
          emp.phone_number.includes(employeeSearchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((emp) => emp.status === statusFilter);
    }

    setFilteredEmployees(filtered);
  };

  const handleEmployeeSubmit = async () => {
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, employeeForm);
      } else {
        await api.post('/employees', employeeForm);
      }
      setShowEmployeeDialog(false);
      setEditingEmployee(null);
      resetEmployeeForm();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Lỗi khi lưu nhân viên');
    }
  };

  const handleDeleteEmployee = (id) => {
    setConfirmDialog({
      open: true,
      title: 'Xóa nhân viên',
      description: 'Bạn có chắc chắn muốn xóa nhân viên này?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/employees/${id}`);
          fetchEmployees();
          setConfirmDialog(prev => ({ ...prev, open: false }));
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Lỗi khi xóa nhân viên');
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const openEmployeeDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        full_name: employee.full_name,
        position: employee.position,
        phone_number: employee.phone_number,
        email: employee.email || '',
        hire_date: employee.hire_date,
        salary: employee.salary,
        notes: employee.notes || '',
      });
    } else {
      setEditingEmployee(null);
      resetEmployeeForm();
    }
    setShowEmployeeDialog(true);
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      full_name: '',
      position: 'phục vụ',
      phone_number: '',
      email: '',
      hire_date: new Date().toISOString().split('T')[0],
      salary: 0,
      notes: '',
    });
  };

  // ========== SHIFT FUNCTIONS ==========

  const fetchShifts = async () => {
    try {
      const response = await api.get('/shifts');
      setShifts(response.data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const filterShifts = () => {
    let filtered = [...shifts];

    if (shiftDateFilter) {
      filtered = filtered.filter((shift) => shift.shift_date === shiftDateFilter);
    }

    setFilteredShifts(filtered);
  };

  const handleShiftSubmit = async () => {
    try {
      if (editingShift) {
        await api.put(`/shifts/${editingShift.id}`, shiftForm);
      } else {
        await api.post('/shifts', shiftForm);
      }
      setShowShiftDialog(false);
      setEditingShift(null);
      resetShiftForm();
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Lỗi khi lưu ca làm việc');
    }
  };

  const handleBulkShiftSubmit = async () => {
    try {
      await api.post('/shifts/bulk-create', bulkShiftForm);
      setShowBulkShiftDialog(false);
      setBulkShiftForm({
        employee_ids: [],
        shift_date: new Date().toISOString().split('T')[0],
        shift_start: '08:00',
        shift_end: '17:00',
        notes: '',
      });
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Lỗi khi tạo ca làm việc hàng loạt');
    }
  };

  const handleDeleteShift = (id) => {
    setConfirmDialog({
      open: true,
      title: 'Xóa ca làm việc',
      description: 'Bạn có chắc chắn muốn xóa ca làm việc này?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/shifts/${id}`);
          fetchShifts();
          setConfirmDialog(prev => ({ ...prev, open: false }));
        } catch (error) {
      toast.error(error.response?.data?.detail || 'Lỗi khi xóa ca làm việc');
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const openShiftDialog = (shift = null) => {
    if (shift) {
      setEditingShift(shift);
      setShiftForm({
        employee_id: shift.employee_id,
        shift_date: shift.shift_date,
        shift_start: shift.shift_start,
        shift_end: shift.shift_end,
        notes: shift.notes || '',
      });
    } else {
      setEditingShift(null);
      resetShiftForm();
    }
    setShowShiftDialog(true);
  };

  const resetShiftForm = () => {
    setShiftForm({
      employee_id: '',
      shift_date: new Date().toISOString().split('T')[0],
      shift_start: '08:00',
      shift_end: '17:00',
      notes: '',
    });
  };

  // ========== ATTENDANCE FUNCTIONS ==========

  const fetchAttendance = async () => {
    try {
      const response = await api.get('/attendance');
      setAttendanceLogs(response.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchActiveAttendance = async () => {
    try {
      const response = await api.get('/attendance/active');
      setActiveAttendance(response.data);
    } catch (error) {
      console.error('Error fetching active attendance:', error);
    }
  };

  const filterAttendance = () => {
    let filtered = [...attendanceLogs];

    if (attendanceDateFilter) {
      filtered = filtered.filter((log) => log.check_in_time.startsWith(attendanceDateFilter));
    }

    setFilteredAttendance(filtered);
  };

  const handleCheckIn = async (employeeId) => {
    try {
      await api.post('/attendance/checkin', {
        employee_id: employeeId,
        notes: '',
      });
      fetchAttendance();
      fetchActiveAttendance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Lỗi khi check-in');
    }
  };

  const handleCheckOut = async (attendanceId) => {
    try {
      await api.post(`/attendance/checkout/${attendanceId}`, {
        notes: '',
      });
      fetchAttendance();
      fetchActiveAttendance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Lỗi khi check-out');
    }
  };

  // ========== RENDER HELPERS ==========

  const getStatusBadge = (status) => {
    const variants = {
      active: { variant: 'success', label: 'Đang làm', className: 'bg-green-500' },
      inactive: { variant: 'secondary', label: 'Nghỉ việc', className: 'bg-gray-500' },
      on_leave: { variant: 'warning', label: 'Nghỉ phép', className: 'bg-yellow-500' },
    };

    const config = variants[status] || variants.active;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN');
  };

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };


  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản Lý Nhân Viên</h1>
          <p className="text-gray-500 mt-1">Quản lý nhân viên, ca làm việc và chấm công</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Nhân Viên</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">
              {employees.filter((e) => e.status === 'active').length} đang làm việc
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang Chấm Công</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAttendance.length}</div>
            <p className="text-xs text-muted-foreground">nhân viên đang làm việc</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ca Làm Hôm Nay</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                shifts.filter((s) => s.shift_date === new Date().toISOString().split('T')[0])
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">ca đã lên lịch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Ca Tuần Này</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
            <p className="text-xs text-muted-foreground">ca làm việc</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees">
            <Users className="w-4 h-4 mr-2" />
            Nhân Viên
          </TabsTrigger>
          <TabsTrigger value="shifts">
            <Calendar className="w-4 h-4 mr-2" />
            Ca Làm Việc
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <Clock className="w-4 h-4 mr-2" />
            Chấm Công
          </TabsTrigger>
        </TabsList>

        {/* EMPLOYEES TAB */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Tìm kiếm nhân viên..."
                      value={employeeSearchTerm}
                      onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Lọc trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang làm việc</SelectItem>
                    <SelectItem value="inactive">Nghỉ việc</SelectItem>
                    <SelectItem value="on_leave">Nghỉ phép</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => openEmployeeDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm Nhân Viên
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ Tên</TableHead>
                    <TableHead>Vị Trí</TableHead>
                    <TableHead>Điện Thoại</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ngày Vào Làm</TableHead>
                    <TableHead className="text-right">Lương</TableHead>
                    <TableHead className="text-center">Trạng Thái</TableHead>
                    <TableHead className="text-right">Hành Động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Không tìm thấy nhân viên nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.position}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {employee.phone_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          {employee.email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {employee.email}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{employee.hire_date}</TableCell>
                        <TableCell className="text-right">
                          {employee.salary.toLocaleString('vi-VN')}đ
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(employee.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckIn(employee.id)}
                              disabled={activeAttendance.some((a) => a.employee_id === employee.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEmployeeDialog(employee)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteEmployee(employee.id)}
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
        </TabsContent>

        {/* SHIFTS TAB */}
        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <Input
                  type="date"
                  value={shiftDateFilter}
                  onChange={(e) => setShiftDateFilter(e.target.value)}
                  className="w-full md:w-[200px]"
                />

                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={() => setShowBulkShiftDialog(true)}>
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Tạo Ca Hàng Loạt
                  </Button>
                  <Button onClick={() => openShiftDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm Ca Làm Việc
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhân Viên</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Giờ Bắt Đầu</TableHead>
                    <TableHead>Giờ Kết Thúc</TableHead>
                    <TableHead className="text-right">Số Giờ</TableHead>
                    <TableHead>Ghi Chú</TableHead>
                    <TableHead className="text-right">Hành Động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShifts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Không có ca làm việc nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{shift.employee_name}</TableCell>
                        <TableCell>{shift.shift_date}</TableCell>
                        <TableCell>{shift.shift_start}</TableCell>
                        <TableCell>{shift.shift_end}</TableCell>
                        <TableCell className="text-right">{shift.hours_worked}h</TableCell>
                        <TableCell>{shift.notes || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openShiftDialog(shift)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteShift(shift.id)}
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
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="space-y-4">
          {/* Active Attendance Alert */}
          {activeAttendance.length > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Hiện có {activeAttendance.length} nhân viên đang chấm công làm việc
              </AlertDescription>
            </Alert>
          )}

          {/* Active Attendance Card */}
          {activeAttendance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Đang Làm Việc</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeAttendance.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">{log.employee_name}</p>
                          <p className="text-sm text-gray-500">Check-in: {formatTime(log.check_in_time)}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckOut(log.id)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Check-out
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attendance History */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 mb-4">
                <Input
                  type="date"
                  value={attendanceDateFilter}
                  onChange={(e) => setAttendanceDateFilter(e.target.value)}
                  className="w-full md:w-[200px]"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhân Viên</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead className="text-right">Số Giờ</TableHead>
                    <TableHead className="text-center">Trạng Thái</TableHead>
                    <TableHead>Ghi Chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Không có dữ liệu chấm công
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendance.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.employee_name}</TableCell>
                        <TableCell>{formatDateTime(log.check_in_time)}</TableCell>
                        <TableCell>{log.check_out_time ? formatDateTime(log.check_out_time) : '-'}</TableCell>
                        <TableCell className="text-right">
                          {log.hours_worked ? `${log.hours_worked}h` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {log.status === 'checked_in' ? (
                            <Badge className="bg-blue-500">Đang làm</Badge>
                          ) : (
                            <Badge className="bg-gray-500">Đã kết thúc</Badge>
                          )}
                        </TableCell>
                        <TableCell>{log.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Chỉnh Sửa Nhân Viên' : 'Thêm Nhân Viên Mới'}</DialogTitle>
            <DialogDescription>Nhập thông tin nhân viên</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Họ Tên *</Label>
              <Input
                value={employeeForm.full_name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div>
              <Label>Vị Trí *</Label>
              <Select
                value={employeeForm.position}
                onValueChange={(value) => setEmployeeForm({ ...employeeForm, position: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Điện Thoại *</Label>
              <Input
                value={employeeForm.phone_number}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone_number: e.target.value })}
                placeholder="0901234567"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label>Ngày Vào Làm *</Label>
              <Input
                type="date"
                value={employeeForm.hire_date}
                onChange={(e) => setEmployeeForm({ ...employeeForm, hire_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Lương (VNĐ)</Label>
              <Input
                type="number"
                value={employeeForm.salary}
                onChange={(e) => setEmployeeForm({ ...employeeForm, salary: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="col-span-2">
              <Label>Ghi Chú</Label>
              <Input
                value={employeeForm.notes}
                onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })}
                placeholder="Ghi chú về nhân viên..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmployeeDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleEmployeeSubmit}>
              {editingEmployee ? 'Cập Nhật' : 'Thêm Nhân Viên'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Dialog */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Chỉnh Sửa Ca Làm' : 'Thêm Ca Làm Việc'}</DialogTitle>
            <DialogDescription>Phân ca làm việc cho nhân viên</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nhân Viên *</Label>
              <Select
                value={shiftForm.employee_id}
                onValueChange={(value) => setShiftForm({ ...shiftForm, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => e.status === 'active')
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} - {emp.position}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ngày *</Label>
              <Input
                type="date"
                value={shiftForm.shift_date}
                onChange={(e) => setShiftForm({ ...shiftForm, shift_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Giờ Bắt Đầu *</Label>
                <Input
                  type="time"
                  value={shiftForm.shift_start}
                  onChange={(e) => setShiftForm({ ...shiftForm, shift_start: e.target.value })}
                />
              </div>

              <div>
                <Label>Giờ Kết Thúc *</Label>
                <Input
                  type="time"
                  value={shiftForm.shift_end}
                  onChange={(e) => setShiftForm({ ...shiftForm, shift_end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Ghi Chú</Label>
              <Input
                value={shiftForm.notes}
                onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                placeholder="Ca sáng, ca chiều..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShiftDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleShiftSubmit}>
              {editingShift ? 'Cập Nhật' : 'Tạo Ca Làm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Shift Dialog */}
      <Dialog open={showBulkShiftDialog} onOpenChange={setShowBulkShiftDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo Ca Làm Việc Hàng Loạt</DialogTitle>
            <DialogDescription>Tạo ca làm việc cho nhiều nhân viên cùng lúc</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Chọn Nhân Viên *</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {employees
                  .filter((e) => e.status === 'active')
                  .map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkShiftForm.employee_ids.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkShiftForm({
                              ...bulkShiftForm,
                              employee_ids: [...bulkShiftForm.employee_ids, emp.id],
                            });
                          } else {
                            setBulkShiftForm({
                              ...bulkShiftForm,
                              employee_ids: bulkShiftForm.employee_ids.filter((id) => id !== emp.id),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span>
                        {emp.full_name} - {emp.position}
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            <div>
              <Label>Ngày *</Label>
              <Input
                type="date"
                value={bulkShiftForm.shift_date}
                onChange={(e) => setBulkShiftForm({ ...bulkShiftForm, shift_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Giờ Bắt Đầu *</Label>
                <Input
                  type="time"
                  value={bulkShiftForm.shift_start}
                  onChange={(e) => setBulkShiftForm({ ...bulkShiftForm, shift_start: e.target.value })}
                />
              </div>

              <div>
                <Label>Giờ Kết Thúc *</Label>
                <Input
                  type="time"
                  value={bulkShiftForm.shift_end}
                  onChange={(e) => setBulkShiftForm({ ...bulkShiftForm, shift_end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Ghi Chú</Label>
              <Input
                value={bulkShiftForm.notes}
                onChange={(e) => setBulkShiftForm({ ...bulkShiftForm, notes: e.target.value })}
                placeholder="Ghi chú chung cho ca làm..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkShiftDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleBulkShiftSubmit} disabled={bulkShiftForm.employee_ids.length === 0}>
              Tạo {bulkShiftForm.employee_ids.length} Ca Làm
            </Button>
          </DialogFooter>
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

export default StaffManagement;
