import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

// --- MOCK DATA (Dữ liệu giả lập) ---
// Trong thực tế, bạn sẽ gọi API GET /api/pass-courts
const MOCK_PASS_DATA = [
  {
    id: 1,
    centerName: "Nhà thi đấu Cầu Giấy",
    courtName: "Sân 3",
    date: "2024-06-12",
    startTime: "18:00",
    endTime: "20:00",
    originalPrice: 120000,
    passPrice: 80000, // Giá pass rẻ hơn
    sellerName: "Nguyễn Văn A",
    sellerAvatar: "https://i.pravatar.cc/150?u=1",
    phone: "0912345678",
    note: "Có việc đột xuất cần pass gấp, giá siêu mềm!",
    tags: ["Pass lỗ", "Gấp"],
    image: "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1763603874/center3-1_gnfwc5.jpg"
  },
  {
    id: 2,
    centerName: "Nhà thi đấu Thanh Xuân",
    courtName: "Sân VIP 1",
    date: "2024-06-12",
    startTime: "19:00",
    endTime: "21:00",
    originalPrice: 200000,
    passPrice: 180000,
    sellerName: "Trần Thị B",
    sellerAvatar: "https://i.pravatar.cc/150?u=2",
    phone: "0987654321",
    note: "Sân đẹp, ánh sáng tốt, đã bao gồm nước.",
    tags: ["Sân đẹp"],
    image: "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1763604033/center2_y7llck.jpg"
  },
  {
    id: 3,
    centerName: "Sân vận động Tây Hồ",
    courtName: "Sân 5",
    date: "2024-06-13",
    startTime: "17:00",
    endTime: "19:00",
    originalPrice: 100000,
    passPrice: 100000,
    sellerName: "Lê Hoàng C",
    sellerAvatar: "https://i.pravatar.cc/150?u=3",
    phone: "0909090909",
    note: "Pass lại đúng giá gốc cho anh em đam mê.",
    tags: ["Đúng giá"],
    image: "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1763602960/center1_j7uedo.jpg"
  },
  {
    id: 4,
    centerName: "Nhà thi đấu Bắc Từ Liêm",
    courtName: "Sân 2",
    date: "2024-06-14",
    startTime: "05:00",
    endTime: "07:00",
    originalPrice: 60000,
    passPrice: 40000,
    sellerName: "Phạm Văn D",
    sellerAvatar: null,
    phone: "0911223344",
    note: "Kèo sáng sớm cho bác nào tập thể dục.",
    tags: ["Sáng sớm", "Pass lỗ"],
    image: "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1763603948/center4_vlgvqs.webp"
  },
];

const PassCourtPage = () => {
  // State quản lý Filters
  const [passList, setPassList] = useState(MOCK_PASS_DATA);
  const [filterDate, setFilterDate] = useState("");
  const [filterCenter, setFilterCenter] = useState("");
  const [selectedPass, setSelectedPass] = useState(null); // Để hiện modal chi tiết

  // Logic lọc dữ liệu
  useEffect(() => {
    let filtered = MOCK_PASS_DATA;

    if (filterDate) {
      filtered = filtered.filter(item => item.date === filterDate);
    }

    if (filterCenter) {
      filtered = filtered.filter(item => 
        item.centerName.toLowerCase().includes(filterCenter.toLowerCase())
      );
    }

    setPassList(filtered);
  }, [filterDate, filterCenter]);

  // Format tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Tính % giảm giá
  const calculateDiscount = (original, current) => {
    if (original <= current) return 0;
    return Math.round(((original - current) / original) * 100);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      {/* HERO SECTION */}
      <div className="relative bg-green-800 text-white py-12">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1626224583764-847890e05851?q=80&w=2070&auto=format&fit=crop')" }}
        ></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl font-bold mb-4">Săn Kèo Pass - Chốt Sân Ngon</h1>
          <p className="text-xl mb-6 text-gray-200">Tìm kiếm các slot sân nhượng lại với giá tốt nhất hoặc đăng tin pass sân của bạn.</p>
          <div className="flex justify-center gap-4">
            <Link to="/profile" className="bg-yellow-400 text-gray-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-300 transition shadow-lg">
              <i className="fas fa-plus-circle mr-2"></i> Đăng tin Pass
            </Link>
          </div>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="container mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col md:flex-row gap-4 items-center border border-gray-100">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tìm theo ngày</label>
            <input 
              type="date" 
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tìm tên sân/khu vực</label>
            <div className="relative">
                <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                <input 
                type="text" 
                placeholder="Ví dụ: Cầu Giấy, Thanh Xuân..."
                className="w-full border border-gray-300 rounded-md p-2 pl-10 focus:ring-2 focus:ring-green-500 focus:outline-none"
                value={filterCenter}
                onChange={(e) => setFilterCenter(e.target.value)}
                />
            </div>
          </div>
          <div className="flex-none mt-4 md:mt-0">
             <button 
                onClick={() => {setFilterDate(""); setFilterCenter("");}}
                className="text-gray-500 hover:text-red-500 underline text-sm"
             >
                Xóa bộ lọc
             </button>
          </div>
        </div>
      </div>

      {/* LISTING SECTION */}
      <div className="container mx-auto px-4 py-10 flex-grow">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-green-600 pl-3">
                Tin mới đăng ({passList.length})
            </h2>
        </div>

        {passList.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow">
                <div className="text-6xl mb-4">🏸</div>
                <h3 className="text-xl font-bold text-gray-600">Không tìm thấy kèo nào!</h3>
                <p className="text-gray-500">Hãy thử thay đổi ngày hoặc khu vực tìm kiếm.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {passList.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-100 flex flex-col">
                {/* Card Header Image */}
                <div className="h-40 bg-gray-200 relative overflow-hidden group">
                    <img 
                        src={item.image} 
                        alt={item.centerName} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        {item.tags.map((tag, idx) => (
                            <span key={idx} className={`text-xs font-bold px-2 py-1 rounded shadow text-white ${tag === 'Pass lỗ' ? 'bg-red-500' : 'bg-green-500'}`}>
                                {tag}
                            </span>
                        ))}
                    </div>
                    {calculateDiscount(item.originalPrice, item.passPrice) > 0 && (
                        <div className="absolute bottom-0 left-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-tr-lg">
                            Giảm {calculateDiscount(item.originalPrice, item.passPrice)}%
                        </div>
                    )}
                </div>

                {/* Card Body */}
                <div className="p-4 flex-grow">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-gray-800 line-clamp-1" title={item.centerName}>
                            {item.centerName}
                        </h3>
                    </div>
                    
                    <div className="flex items-center text-gray-600 text-sm mb-2">
                         <i className="fas fa-map-marker-alt w-5 text-center mr-1 text-green-600"></i>
                         <span>{item.courtName}</span>
                    </div>

                    <div className="flex items-center text-gray-600 text-sm mb-3">
                         <i className="far fa-calendar-alt w-5 text-center mr-1 text-green-600"></i>
                         <span className="font-medium text-gray-900">
                            {new Date(item.date).toLocaleDateString('vi-VN', {weekday: 'short', day: '2-digit', month: '2-digit'})}
                         </span>
                         <span className="mx-2">|</span>
                         <i className="far fa-clock w-5 text-center mr-1 text-green-600"></i>
                         <span className="font-bold text-blue-700 text-base">{item.startTime} - {item.endTime}</span>
                    </div>

                    <div className="bg-gray-50 p-2 rounded border border-gray-100 mb-3">
                         <p className="text-sm text-gray-500 italic line-clamp-2">"{item.note}"</p>
                    </div>

                    <div className="flex items-end justify-between mt-2">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(item.originalPrice)}
                            </span>
                            <span className="text-xl font-bold text-red-600">
                                {formatCurrency(item.passPrice)}
                            </span>
                        </div>
                        <div className="flex -space-x-2">
                             {/* Mock viewers avatar if needed */}
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center">
                        <img 
                            src={item.sellerAvatar || "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png"} 
                            alt={item.sellerName} 
                            className="w-8 h-8 rounded-full border border-gray-300 mr-2 object-cover"
                        />
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500">Người pass</span>
                            <span className="text-xs font-bold text-gray-700 truncate max-w-[80px]">{item.sellerName}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedPass(item)}
                        className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-green-700 transition shadow-sm flex items-center"
                    >
                        <i className="fas fa-phone-alt mr-1"></i> Liên hệ
                    </button>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>

      {/* CONTACT MODAL */}
      {selectedPass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md animate-fade-in-up">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-green-50 rounded-t-lg">
                    <h3 className="font-bold text-lg text-green-800">Thông tin liên hệ</h3>
                    <button onClick={() => setSelectedPass(null)} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div className="p-6">
                    <div className="text-center mb-6">
                        <img 
                            src={selectedPass.sellerAvatar || "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png"} 
                            className="w-20 h-20 rounded-full mx-auto mb-2 border-4 border-white shadow"
                        />
                        <h4 className="text-xl font-bold">{selectedPass.sellerName}</h4>
                        <p className="text-gray-500 text-sm">Thành viên tích cực</p>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-gray-100 p-3 rounded flex justify-between items-center">
                            <span className="text-gray-600"><i className="fas fa-phone mr-2"></i>Số điện thoại:</span>
                            <span className="font-bold text-lg select-all">{selectedPass.phone}</span>
                        </div>
                        <div className="bg-blue-50 p-3 rounded flex justify-between items-center cursor-pointer hover:bg-blue-100 transition">
                            <span className="text-blue-700"><i className="fab fa-facebook-messenger mr-2"></i>Nhắn tin Zalo</span>
                            <i className="fas fa-chevron-right text-blue-400"></i>
                        </div>
                    </div>

                    <div className="mt-6 text-xs text-gray-400 text-center">
                        <p>* Lưu ý: Hãy xác nhận thông tin sân kỹ trước khi chuyển khoản.</p>
                        <p>DatSan247 không chịu trách nhiệm với các giao dịch cá nhân.</p>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 flex gap-3">
                    <button 
                        onClick={() => setSelectedPass(null)}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                    >
                        Đóng
                    </button>
                    <a 
                        href={`tel:${selectedPass.phone}`}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 text-center"
                    >
                        Gọi ngay
                    </a>
                </div>
            </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default PassCourtPage;