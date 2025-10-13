import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

// Pages
import CustomerMenu from '@/pages/CustomerMenu';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminRegister from '@/pages/admin/AdminRegister';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import MenuManagement from '@/pages/admin/MenuManagement';
import TablesManagement from '@/pages/admin/TablesManagement';
import OrdersManagement from '@/pages/admin/OrdersManagement';
import StoreSettings from '@/pages/admin/StoreSettings';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Customer Routes */}
          <Route path="/menu/:storeSlug" element={<CustomerMenu />} />
          
          {/* Admin Auth Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="orders" element={<OrdersManagement />} />
            <Route path="settings" element={<StoreSettings />} />
          </Route>
          
          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;