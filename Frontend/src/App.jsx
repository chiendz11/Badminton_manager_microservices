import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import './styles/global.css';
import BookingSchedule from './pages/Booking';
import News from './pages/News';
import PaymentPage from './pages/Payment';
import Centers from "./pages/Centers";
import Policy from "./pages/Policy";
import Contact from "./pages/Contact";
import Competition from "./pages/Competition";
import UserProfile from "./pages/UserProfile";
import Service from "./pages/Service";
import ResetPasswordPage from "./pages/ResetPassword";
// (AuthProvider đã được bọc bên ngoài trong index.js)
import WeatherDisplay from './components/WeatherDisplay';
import Scroll from './components/Scroll';
import PassCourtPage from './pages/PassCourts';

// 💡 1. IMPORT "LÍNH GÁC CỔNG" CỦA BẠN
import ProtectedLayout from './components/ProtectedLayout';

// 💡 2. IMPORT TRANG MÀ USER GOOGLE SẼ BỊ CHUYỂN HƯỚNG TỚI
import CompleteProfilePage from './pages/CompleteProfile'; // (Chúng ta sẽ tạo file này)

function App() {
  return (
    <Router>
      <Scroll />
      <Routes>

        {/* ------------------------------------------ */}
        {/* 1. CÁC ROUTE CÔNG KHAI (AI CŨNG XEM ĐƯỢC) */}
        {/* ------------------------------------------ */}
        <Route
          path="/"
          element={
            <>
              <Header />
              <Home />
              <Footer />
            </>
          }
        />
        <Route path="/service" element={<Service />} />
        <Route path="/competition" element={<Competition />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/policy" element={<Policy />} />
        <Route path="/centers" element={<Centers />} />
        <Route path="/news" element={<News />} />
        <Route path="/reset-password/:token/:userId" element={<ResetPasswordPage />} />
        <Route path="/pass-court" element={<PassCourtPage />} />

        {/* 💡 Route này BẮT BUỘC phải "công khai", 
            vì đây là nơi user (chưa hoàn thiện SĐT) bị redirect đến.
          */}
        <Route path="/complete-profile" element={<CompleteProfilePage />} />

        {/* ------------------------------------------ */}
        {/* 2. CÁC ROUTE CÁ NHÂN (CẦN BẢO VỆ) */}
        {/* ------------------------------------------ */}
        <Route element={<ProtectedLayout />}>
          {/* Tất cả các Route bên trong <ProtectedLayout />
                sẽ tự động được bảo vệ. */}
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/booking" element={<BookingSchedule />} />
          <Route path="/payment" element={<PaymentPage />} />
          {/* (Thêm bất kỳ route nào khác cần bảo vệ ở đây) */}
        </Route>

      </Routes>
      <WeatherDisplay />
    </Router>
  );
}

export default App;