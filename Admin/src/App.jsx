import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from './contexts/AuthContext.jsx'; 
import AdminLayout from './components/AdminLayout.jsx'; 
import SuperAdminRoute from './components/SuperAdminRoute.jsx'; 
import CenterManagerRoute from './components/CenterManagerRoute.jsx'; 

// Import Pages
import Dashboard from "./pages/Dashboard.jsx"; 
import Login from "./pages/Login.jsx"; 
import News from './pages/News.jsx'; 
import Rating from './pages/RatingManagement.jsx'; 
import Account from './pages/Account.jsx'; 
import Shop from './pages/Shop.jsx'; 
import Stock from './pages/stockManagement.jsx'; 
import Report from './pages/Report.jsx' 
import UserManage from './pages/UserManage.jsx';
import AdminBillList from './pages/BillManage.jsx';
import CreateFixedBooking from './pages/CreateFixedBooking.jsx';
import CourtStatusPage from './pages/centerStatus.jsx';
import CenterManagerManagement from './pages/CenterManagerManagement.jsx';

// 💡 IMPORT MỚI: TRANG QUẢN LÝ TRUNG TÂM
import CenterManagement from './pages/CenterManagement.jsx';

function App() {
  // 1. LẤY CẢ 'loading' TỪ CONTEXT
  const { admin, loading } = useContext(AuthContext); 
  const isAuthenticated = !!admin; 
  console.log('Current admin in App.jsx:', admin, isAuthenticated);

  // 2. GIẢI PHÁP QUAN TRỌNG NHẤT:
  if (loading) {
    return (
      <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          fontSize: '1.2rem', 
          fontFamily: 'sans-serif' 
      }}>
          Đang tải ứng dụng Quản lý...
      </div>
    );
  }
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        
        {/* 3. BẢO VỆ ROUTE /login */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          } 
        />
        
        {/* GUARD CẤP 1: ADMIN LAYOUT (ÁP DỤNG CHO CẢ SUPER_ADMIN VÀ CENTER_MANAGER) */}
        <Route element={<AdminLayout />}>
          
          {/* 1. CÁC ROUTE CHUNG (CẢ 2 VAI TRÒ ĐỀU THẤY) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin-bill-list" element={<AdminBillList />} />
          <Route path="/center-status" element={<CourtStatusPage />} />
          
          {/* 💡 ROUTE MỚI: QUẢN LÝ TRUNG TÂM */}
          {/* Component này đã có logic tự lọc: Super Admin thấy hết, Manager chỉ thấy sân của mình */}
          <Route path="/center-management" element={<CenterManagement />} />
          
          {/* 2. ROUTE CHỈ DÀNH CHO CENTER_MANAGER (VÍ DỤ) */}
          <Route element={<CenterManagerRoute />}>
            <Route path="/shop" element={<Shop />}/> 
          </Route>

          {/* 3. ROUTE CHỈ DÀNH CHO SUPER ADMIN (BẢO VỆ CẤP CAO) */}
          <Route element={<SuperAdminRoute />}>
            {/* CHỈ SUPER ADMIN TRUY CẬP CÁC ROUTE NÀY */}
            <Route path="/report" element={<Report />}/> 
            <Route path="/stock" element={<Stock />}/> 
            <Route path="/create-fixed-booking" element={<CreateFixedBooking />} />
            <Route path="/users-manage" element={<UserManage />} />
            <Route path="/ratings" element={<Rating />} />
            <Route path="/news" element={<News />} /> 
            <Route path="/center-manager-management" element={<CenterManagerManagement />}/>
          </Route>

          {/* 4. Route lỗi 404 trong khu vực Admin */}
          <Route path="*" element={
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h1>404</h1>
              <p>Không tìm thấy trang quản trị này.</p>
              <Navigate to="/dashboard" replace />
            </div>
          } />
        </Route>
        
        <Route path="*" element={
          <div style={{ padding: '20px', textAlign: 'center' }}>
              <h1>404</h1>
              <p>Không tìm thấy trang.</p>
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;