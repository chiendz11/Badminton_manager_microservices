import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import News from '@/pages/News';
import Rating from '@/pages/RatingManagement';
import Account from '@/pages/Account';
import Shop from '@/pages/Shop';
import Stock from '@/pages/stockManagement';
import Report from '@/pages/Report'
import UserManage from './pages/UserManage';
import AdminBillList from './pages/BillManage';
import CreateFixedBooking from './pages/CreateFixedBooking';
import CourtStatusPage from './pages/centerStatus';



function App() {
  const isAuthenticated = false;  // Thay đổi theo logic xác thực thực tế

  return (
    <Router>
      <Routes>
        {/* Chuyển hướng trang chủ tùy thuộc vào trạng thái đăng nhập */} 
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />            
        <Route path="/news" element={<News />} /> 
        <Route path="/account" element={<Account />} />
        <Route path="/shop" element={<Shop />}/> 
        <Route path="/stock" element={<Stock />}/> 
        <Route path="/report" element={<Report />}/> 
        <Route path="/ratings" element={<Rating />} /> 
        <Route path="/users-manage" element={<UserManage />} />
        <Route path="/admin-bill-list" element={<AdminBillList />} />
        <Route path="/create-fixed-booking" element={<CreateFixedBooking />} />
        <Route path="/center-status" element={<CourtStatusPage />} />
        
      </Routes>
    </Router>
  );
}

export default App;