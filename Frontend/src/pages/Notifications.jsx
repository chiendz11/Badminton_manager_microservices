import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const navigate = useNavigate();

  // Mock data
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "booking",
      title: "SÂN ĐÃ SẴN SÀNG!",
      message: "Sân 1 - Cầu Giấy (17:00 - 19:00) hôm nay. Mang vợt và chiến thôi!",
      time: "10 phút trước",
      isRead: false,
    },
    {
      id: 2,
      type: "match",
      title: "KÈO THÁCH ĐẤU MỚI",
      message: "Một đối thủ trình độ B đang tìm người giao lưu tại Sân 3. Nhận kèo?",
      time: "45 phút trước",
      isRead: false,
    },
    {
      id: 3,
      type: "system",
      title: "Bảo trì mặt sân",
      message: "Khu vực Sân 5 sẽ được bảo trì thảm vào ngày mai để đảm bảo chất lượng.",
      time: "3 giờ trước",
      isRead: true,
    },
    {
      id: 4,
      type: "promo",
      title: "ƯU ĐÃI MÙA GIẢI",
      message: "Nạp Pass trên 500k tặng ngay hộp cầu lông 3 sao. Chỉ hôm nay!",
      time: "1 ngày trước",
      isRead: true,
    },
  ]);

  const [filter, setFilter] = useState("all");

  const markAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const getStyleByType = (type) => {
    switch (type) {
      case "booking":
        return { 
          icon: "fa-calendar-check", 
          themeColor: "green", 
          accentBg: "bg-green-600",
          border: "border-green-600"
        };
      case "match":
        return { 
          icon: "fa-bolt", 
          themeColor: "red",
          accentBg: "bg-red-600",
          border: "border-red-600"
        };
      case "promo":
        return { 
          icon: "fa-star", 
          themeColor: "yellow",
          accentBg: "bg-yellow-500",
          border: "border-yellow-500"
        };
      default:
        return { 
          icon: "fa-info-circle", 
          themeColor: "blue",
          accentBg: "bg-blue-600",
          border: "border-blue-600"
        };
    }
  };

  return (
    // MAIN CONTAINER
    <div className="min-h-screen relative overflow-hidden bg-slate-100 pt-28 pb-10 font-sans">
      
      {/* --- BACKGROUND DECORATION (Làm nền đẹp hơn) --- */}
      {/* Lớp lưới chấm mờ */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.4]"
           style={{
               backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
               backgroundSize: '20px 20px'
           }}>
      </div>

      {/* Các đốm màu loang (Animated Blobs) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-green-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-yellow-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-1000"></div>
      {/* ------------------------------------------- */}

      <div className="container mx-auto px-4 max-w-3xl relative z-10">
        
        {/* === [MỚI] NÚT QUAY LẠI === */}
        <div className="mb-6 flex items-center justify-between">
            <button 
                onClick={() => navigate(-1)}
                className="group flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm hover:bg-green-600 border border-white/50 hover:border-green-600 rounded-full shadow-sm hover:shadow-lg transition-all duration-300"
            >
                <i className="fas fa-arrow-left text-green-700 group-hover:text-white transition-colors"></i>
                <span className="font-bold text-gray-700 group-hover:text-white text-sm transition-colors uppercase tracking-wide">Quay lại</span>
            </button>

            {/* Nút Đọc tất cả nhỏ gọn ở trên */}
            <button 
                onClick={markAllAsRead}
                className="text-xs font-bold text-green-700 hover:text-green-900 hover:underline transition-all"
            >
                Đánh dấu tất cả đã đọc
            </button>
        </div>

        {/* HEADER AREA */}
        <div className="relative bg-gradient-to-r from-teal-900 via-emerald-800 to-teal-900 rounded-t-3xl shadow-2xl overflow-hidden border-b-4 border-yellow-400">
            {/* Họa tiết trang trí header */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            
            <div className="p-8 text-white relative z-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h6 className="text-yellow-400 text-xs font-bold tracking-[0.3em] uppercase mb-1">
                        Badminton App
                    </h6>
                    <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-wider drop-shadow-lg">
                        Thông Báo
                    </h1>
                </div>
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                     <i className="fas fa-bell text-2xl text-yellow-400 animate-swing"></i>
                </div>
            </div>
        </div>

        {/* FILTER TABS */}
        <div className="bg-white p-2 shadow-md flex gap-2 relative z-20 -mt-0 rounded-b-xl border-x border-b border-gray-100">
             <button
                    onClick={() => setFilter("all")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase transition-all duration-200 ${
                        filter === "all"
                        ? "bg-teal-800 text-white shadow-md transform scale-[1.02]"
                        : "bg-transparent text-gray-500 hover:bg-gray-100"
                    }`}
                >
                    Tất cả
                </button>
                <button
                    onClick={() => setFilter("unread")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                        filter === "unread"
                        ? "bg-yellow-500 text-teal-900 shadow-md transform scale-[1.02]"
                        : "bg-transparent text-gray-500 hover:bg-gray-100"
                    }`}
                >
                    Chưa đọc
                    {notifications.some(n => !n.isRead) && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                    )}
                </button>
        </div>

        {/* NOTIFICATION LIST */}
        <div className="mt-8 space-y-4 pb-12">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((item) => {
              const style = getStyleByType(item.type);
              
              return (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={`relative group flex flex-col sm:flex-row items-stretch bg-white rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer
                    border-l-0 sm:border-l-[6px] ${style.border}
                    ${item.isRead 
                        ? "opacity-80 shadow-sm hover:opacity-100 hover:shadow-md" 
                        : "shadow-lg hover:shadow-2xl hover:-translate-y-1 bg-gradient-to-r from-white to-gray-50"
                    }
                  `}
                >
                  {/* Icon Box */}
                  <div className={`sm:w-20 w-full py-4 sm:py-0 flex items-center justify-center text-white ${style.accentBg}`}>
                      <i className={`fas ${style.icon} text-2xl transition-transform group-hover:scale-110`}></i>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5 flex flex-col justify-center relative">
                    {/* Watermark icon */}
                     <i className="fas fa-shuttlecock absolute right-4 bottom-2 text-6xl text-gray-100 opacity-50 -rotate-12 pointer-events-none group-hover:opacity-100 transition-opacity"></i>

                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <h3 className={`text-base font-black uppercase tracking-tight ${item.isRead ? "text-gray-600" : "text-gray-800"}`}>
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase">
                        {item.time}
                      </span>
                    </div>
                    
                    <p className={`text-sm font-medium leading-relaxed relative z-10 pr-8 ${item.isRead ? "text-gray-500" : "text-gray-700"}`}>
                      {item.message}
                    </p>
                  </div>

                  {/* Unread Indicator Dot */}
                  {!item.isRead && (
                    <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <div className="bg-gray-200 p-6 rounded-full mb-4">
                  <i className="fas fa-check-circle text-4xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-black text-gray-500 uppercase italic">Sạch sẽ!</h3>
              <p className="text-gray-400 text-sm">Không có thông báo mới nào ở đây.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Notifications;