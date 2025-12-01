import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from './contexts/AuthContext.jsx'; 
import AdminLayout from './components/AdminLayout.jsx'; 
import SuperAdminRoute from './components/SuperAdminRoute.jsx'; 
// import CenterManagerRoute from './components/CenterManagerRoute.jsx'; // Không cần import nếu không dùng

// Import Pages
import Dashboard from "./pages/Dashboard.jsx"; 
import Login from "./pages/Login.jsx"; 
import News from './pages/News.jsx'; 
import Rating from './pages/RatingManagement.jsx'; 
import Account from './pages/Account.jsx'; 
import Shop from './pages/Shop.jsx'; // Trang bán hàng
import Stock from './pages/stockManagement.jsx'; 
import Report from './pages/Report.jsx' 
import UserManage from './pages/UserManage.jsx';
import AdminBillList from './pages/BillManage.jsx';
import CreateFixedBooking from './pages/CreateFixedBooking.jsx';
import CourtStatusPage from './pages/centerStatus.jsx';
import CenterManagerManagement from './pages/CenterManagerManagement.jsx';
import CenterManagement from './pages/CenterManagement.jsx';

function App() {
  const { admin, loading } = useContext(AuthContext); 
  const isAuthenticated = !!admin; 
  console.log('Current admin in App.jsx:', admin, isAuthenticated);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', fontFamily: 'sans-serif' }}>
          Đang tải ứng dụng Quản lý...
      </div>
    );
  }
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        
        {/* GUARD CẤP 1: ADMIN LAYOUT (ÁP DỤNG CHO CẢ SUPER_ADMIN VÀ CENTER_MANAGER) */}
        <Route element={<AdminLayout />}>
          
          {/* 1. CÁC ROUTE CHUNG (CẢ 2 VAI TRÒ ĐỀU THẤY) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin-bill-list" element={<AdminBillList />} />
          <Route path="/center-status" element={<CourtStatusPage />} />
          
          {/* QUẢN LÝ TRUNG TÂM (Đã có logic tự lọc quyền) */}
          <Route path="/center-management" element={<CenterManagement />} />

          {/* 💡 SỬA: ĐƯA SHOP RA ĐÂY ĐỂ CẢ 2 CÙNG XEM ĐƯỢC */}
          <Route path="/shop" element={<Shop />}/> 
          
          {/* 2. ROUTE CHỈ DÀNH CHO SUPER ADMIN (BẢO VỆ CẤP CAO) */}
          <Route element={<SuperAdminRoute />}>
            <Route path="/report" element={<Report />}/> 
            <Route path="/stock" element={<Stock />}/> 
            <Route path="/create-fixed-booking" element={<CreateFixedBooking />} />
            <Route path="/users-manage" element={<UserManage />} />
            <Route path="/ratings" element={<Rating />} />
            <Route path="/news" element={<News />} /> 
            <Route path="/center-manager-management" element={<CenterManagerManagement />}/>
          </Route>

          {/* Route lỗi 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;