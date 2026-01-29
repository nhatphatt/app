import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Search, Users, UserX, Trash2, ArrowLeft, RefreshCw, Shield, Mail, Calendar, Building
} from "lucide-react";
import { toast } from "sonner";
import api from "@/utils/api";
import { getAuthUser, removeAuthToken, removeAuthUser } from "@/utils/auth";

const SuperAdminUsers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("minitake_token");
    const user = getAuthUser();
    
    if (!token || !user || user.role !== "super_admin") {
      removeAuthToken();
      removeAuthUser();
      navigate("/admin/login");
      return;
    }
    
    fetchUsers();
  }, [navigate, page, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      });
      
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await api.get(`/super-admin/users?${params}`);
      setUsers(response.data.users || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalUsers(response.data.total || 0);
    } catch (error) {
      if (error.response?.status === 401) {
        removeAuthToken();
        removeAuthUser();
        navigate("/admin/login");
      } else {
        toast.error("Khong the tai danh sach user");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/super-admin/users/${selectedUser.id}`);
      toast.success("Xoa user thanh cong");
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Khong the xoa user");
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      await api.put(`/super-admin/users/${userId}/status`, { status: newStatus });
      const action = newStatus === "active" ? "kich hoat" : "vo hieu hoa";
      toast.success(`Da ${action} user`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Khong the cap nhat trang thai");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "super_admin": return "bg-red-500/20 text-red-300";
      case "admin": return "bg-violet-500/20 text-violet-300";
      case "staff": return "bg-blue-500/20 text-blue-300";
      default: return "bg-gray-500/20 text-gray-300";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-emerald-500/20 text-emerald-300";
      case "inactive": return "bg-slate-500/20 text-slate-300";
      default: return "bg-gray-500/20 text-gray-300";
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "admin": return "Admin";
      case "staff": return "Staff";
      default: return role;
    }
  };

  const getStatusName = (status) => {
    switch (status) {
      case "active": return "Hoat dong";
      case "inactive": return "Vo hieu";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/super-admin/dashboard")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Quay lai
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Quan ly Users</h1>
              <p className="text-slate-400 text-sm">Quan ly tat ca tai khoan nguoi dung</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Tim kiem email, ten..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10 w-64 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <Button onClick={fetchUsers} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Lam moi
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Tong Users</p>
                  <p className="text-2xl font-bold text-white">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Admins</p>
                  <p className="text-2xl font-bold text-white">
                    {users.filter(u => u.role === "admin").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Hoat dong</p>
                  <p className="text-2xl font-bold text-white">
                    {users.filter(u => u.status === "active").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Vo hieu hoa</p>
                  <p className="text-2xl font-bold text-white">
                    {users.filter(u => u.status === "inactive").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Danh sach Users
            </CardTitle>
            <CardDescription className="text-slate-400">
              Hien thi {users.length} / {totalUsers} users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Khong tim thay user nao</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-slate-700/30">
                      <TableHead className="text-slate-400">User</TableHead>
                      <TableHead className="text-slate-400">Lien ket Store</TableHead>
                      <TableHead className="text-slate-400">Vai tro</TableHead>
                      <TableHead className="text-slate-400">Trang thai</TableHead>
                      <TableHead className="text-slate-400">Ngay tao</TableHead>
                      <TableHead className="text-slate-400 text-right">Hanh dong</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-slate-700/50 hover:bg-slate-700/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                              <span className="text-sm font-medium text-slate-300">
                                {user.name?.charAt(0).toUpperCase() || "U"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-white">{user.name || "-"}</p>
                              <p className="text-sm text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.store_id ? (
                            <div className="flex items-center gap-1 text-slate-300">
                              <Building className="w-4 h-4 text-slate-500" />
                              <span className="text-sm font-mono">{user.store_id.slice(0, 8)}...</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {getRoleName(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.status)}>
                            {getStatusName(user.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(user.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(user.id, user.status)}
                              className="text-slate-400 hover:text-white"
                              title={user.status === "active" ? "Vo hieu hoa" : "Kich hoat"}
                            >
                              {user.status === "active" ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <Shield className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteConfirm(true);
                              }}
                              className="text-slate-400 hover:text-red-400"
                              title="Xoa user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                    <p className="text-sm text-slate-400">
                      Trang {page} / {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Truoc
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                Xac nhan xoa User
              </CardTitle>
              <CardDescription className="text-slate-400">
                Ban co chac chan muon xoa user nay? Hanh dong nay khong the hoan tac.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                <p className="font-medium text-white">{selectedUser.name}</p>
                <p className="text-sm text-slate-400">{selectedUser.email}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Huy
                </Button>
                <Button
                  onClick={handleDeleteUser}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  Xac nhan xoa
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SuperAdminUsers;
