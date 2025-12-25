import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

// 👇 1. IMPORT ĐẦY ĐỦ CÁC HÀM API
import { 
  getAllPastBookingPost, 
  getAllMyPassBookingPost,
  toggleInterest,
  checkIsInterested,
  transferOwner,
  getAllPostInterested 
} from "../apiV2/booking_service/rest/booking"; 

// 👇 2. CONSTANT AVATAR MẶC ĐỊNH (Theo yêu cầu)
const DEFAULT_AVATAR = "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

const PassCourtPage = () => {
  // --- STATE ---
  const [viewMode, setViewMode] = useState('market'); 
  const [passList, setPassList] = useState([]);
  const [originalList, setOriginalList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterDate, setFilterDate] = useState("");
  const [filterCenter, setFilterCenter] = useState("");
  
  // Market State (Người mua)
  const [selectedPass, setSelectedPass] = useState(null);
  const [isInterested, setIsInterested] = useState(false);

  // --- STATE QUẢN LÝ TIN ĐĂNG (Người bán) ---
  const [manageModalOpen, setManageModalOpen] = useState(false); 
  const [interestedUsers, setInterestedUsers] = useState([]); // List người quan tâm từ API
  const [searchQuery, setSearchQuery] = useState(""); 
  const [selectedCandidate, setSelectedCandidate] = useState(null); // User được chọn để chuyển
  const [isConfirming, setIsConfirming] = useState(false); // Modal xác nhận

  // --- FETCH DATA LIST ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setPassList([]); 
      try {
        let data = [];
        if (viewMode === 'market') {
            data = await getAllPastBookingPost();
        } else {
            data = await getAllMyPassBookingPost();
        }
        
        const mappedData = data.map(item => {
            const desc = item.description || "";
            const phoneMatch = desc.match(/\[LH:\s*([0-9]+)\]/);
            const phone = phoneMatch ? phoneMatch[1] : "Chưa cập nhật";
            const cleanNote = desc.replace(/\[LH:\s*[0-9]+\]/, "").trim();
            const tags = [];
            if (item.discountPercent > 0) tags.push("Giảm giá");
            const status = item.status || 'ACTIVE'; 

            return {
                id: item._id, 
                // 👇 Lấy bookingId để phục vụ chuyển sân
                bookingId: item.booking?._id || item.booking, 
                centerName: item.booking.centerName,
                courtName: item.booking.courtName || "Sân chưa rõ",
                date: item.booking.bookDate,
                startTime: item.timeDisplay ? item.timeDisplay.split('-')[0].trim() : "00:00",
                endTime: item.timeDisplay ? item.timeDisplay.split('-')[1].trim() : "00:00",
                originalPrice: item.originalPrice,
                passPrice: item.resalePrice,
                discountPercent: item.discountPercent,
                sellerName: item.seller?.name || "Người dùng",
                sellerAvatar: item.seller?.avatar || null, 
                phone: phone,
                note: cleanNote || "Không có mô tả",
                tags: tags,
                status: status, 
                image: `https://source.unsplash.com/random/800x600/?badminton,court&sig=${item._id}` 
            };
        });

        setOriginalList(mappedData);
        setPassList(mappedData);
      } catch (error) {
        console.error("Failed to load pass posts", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [viewMode]); 

  // --- CHECK STATUS (MARKET) ---
  useEffect(() => {
    const checkStatus = async () => {
        if (selectedPass && viewMode === 'market') {
            setIsInterested(false); 
            try {
                const data = await checkIsInterested(selectedPass.id);
                setIsInterested(data.isInterested);
            } catch (err) {
                console.error("Lỗi check interest:", err);
            }
        }
    };
    checkStatus();
  }, [selectedPass, viewMode]);

  useEffect(() => {
    setSelectedPass(null);       // Xóa bài đang chọn
    setManageModalOpen(false);   // Đóng modal quản lý
    setIsConfirming(false);      // Đóng modal xác nhận
    setIsInterested(false);      // Reset trạng thái quan tâm
    setInterestedUsers([]);      // Clear danh sách user
  }, [viewMode]);

  // --- FILTER LOGIC ---
  useEffect(() => {
    let filtered = originalList;
    if (filterDate) {
      filtered = filtered.filter(item => {
          const itemDate = new Date(item.date).toISOString().split('T')[0];
          return itemDate === filterDate;
      });
    }
    if (filterCenter) {
      filtered = filtered.filter(item => 
        item.centerName.toLowerCase().includes(filterCenter.toLowerCase())
      );
    }
    setPassList(filtered);
  }, [filterDate, filterCenter, originalList]);

  // --- HELPERS ---
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const renderStatusBadge = (status) => {
      switch(status) {
          case 'SOLD': return <span className="bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded">ĐÃ BÁN</span>;
          case 'EXPIRED': return <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">HẾT HẠN</span>;
          case 'ACTIVE': return <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">ĐANG BÁN</span>;
          default: return null;
      }
  };

  const handleInterestClick = async () => {
    if (!selectedPass) return;
    try {
        await toggleInterest(selectedPass.id);
        setIsInterested(!isInterested);
    } catch (error) {
        console.error("Lỗi khi quan tâm:", error);
    }
  };

  // ==========================================================
  // 👇 CÁC HÀM XỬ LÝ MỚI (TIN CỦA TÔI)
  // ==========================================================
  
  // 1. Mở modal quản lý và gọi API lấy người quan tâm
  const handleOpenManage = async (item) => {
    setSelectedPass(item); 
    setManageModalOpen(true);
    setSearchQuery("");
    setInterestedUsers([]); // Clear data cũ
    
    try {
        const res = await getAllPostInterested(item.id);
        // API có thể trả về res.data hoặc res trực tiếp tùy axios config
        const users = res.data ? res.data : res; 
        
        console.log("Users interested data:", users); // Debug log
        setInterestedUsers(Array.isArray(users) ? users : []);
    } catch (error) {
        console.error("Lỗi lấy danh sách quan tâm:", error);
        alert("Không tải được danh sách người quan tâm.");
    }
  };

  // 2. Chọn User -> Mở modal confirm
  // Lưu ý: user ở đây là object `user` bên trong item trả về
  const handleSelectCandidate = (userProfile) => {
    setSelectedCandidate(userProfile);
    setIsConfirming(true);
  };

  // 3. Thực hiện chuyển sân
  const handleTransfer = async () => {
    if (!selectedPass || !selectedCandidate) return;

    try {
        // Gọi API chuyển sân
        // selectedCandidate chính là object { userId, name, phone, ... }
        await transferOwner(selectedPass.bookingId, selectedCandidate.userId);
        
        alert(`Đã chuyển sân thành công cho ${selectedCandidate.name || "người dùng"}!`);
        
        // Reset state
        setIsConfirming(false);
        setManageModalOpen(false);
        setSelectedPass(null);
        setSelectedCandidate(null);
        
        // Reload trang để cập nhật trạng thái "ĐÃ BÁN"
        window.location.reload(); 
        
    } catch (error) {
        console.error("Lỗi chuyển sân:", error);
        alert("Chuyển sân thất bại! Vui lòng thử lại.");
    }
  };

  // 4. Lọc user trong modal (Tìm theo tên hoặc SĐT của người quan tâm)
  const filteredUsers = interestedUsers.filter(item => {
    // Backend trả về cấu trúc: { user: { name, phone... } }
    const profile = item.user || {}; 
    const name = profile.name || "";
    const phone = profile.phone || profile.phoneNumber || "";
    
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || phone.includes(searchQuery);
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      <Header />
      
      {/* HERO SECTION */}
      <div className="relative bg-green-900 text-white py-12">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1554068865-2484cd008886?q=80&w=2070&auto=format&fit=crop')" }}></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl font-bold mb-4">Sàn Giao Dịch Sân Cầu Lông</h1>
          <p className="text-xl mb-6 text-gray-200">Tìm sân giá rẻ hoặc nhượng lại sân khi bận đột xuất</p>
          <div className="flex justify-center gap-4">
             <Link to="/profile" className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:-translate-y-1 flex items-center">
                <i className="fas fa-plus-circle mr-2"></i> Đăng tin Pass ngay
            </Link>
          </div>
        </div>
      </div>

      {/* TAB SWITCHER */}
      <div className="container mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
            <div className="flex border-b border-gray-200">
                <button onClick={() => setViewMode('market')} className={`flex-1 py-4 text-center font-bold text-lg transition-colors flex items-center justify-center gap-2 ${viewMode === 'market' ? 'bg-white text-green-700 border-b-4 border-green-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    <i className="fas fa-store"></i> Chợ Pass Sân
                </button>
                <button onClick={() => setViewMode('mine')} className={`flex-1 py-4 text-center font-bold text-lg transition-colors flex items-center justify-center gap-2 ${viewMode === 'mine' ? 'bg-white text-green-700 border-b-4 border-green-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    <i className="fas fa-user-tag"></i> Tin Của Tôi
                </button>
            </div>
            {/* Filter inputs */}
            <div className="p-6 flex flex-col md:flex-row gap-4 items-center bg-white">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày đá</label>
                    <input type="date" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:outline-none" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}/>
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tìm sân</label>
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-3.5 text-gray-400"></i>
                        <input type="text" placeholder="Nhập tên sân..." className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-green-500 focus:outline-none" value={filterCenter} onChange={(e) => setFilterCenter(e.target.value)}/>
                    </div>
                </div>
                <div className="flex-none pt-5">
                    <button onClick={() => {setFilterDate(""); setFilterCenter("");}} className="text-gray-400 hover:text-red-500 transition px-4 py-2 rounded border border-gray-200 hover:border-red-300 text-sm"><i className="fas fa-eraser mr-1"></i> Xóa lọc</button>
                </div>
            </div>
        </div>
      </div>

      {/* LISTING SECTION */}
      <div className="container mx-auto px-4 py-10 flex-grow">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                {viewMode === 'market' ? (
                    <><span className="w-2 h-8 bg-green-600 rounded mr-3"></span> Tin đang rao ({passList.length})</>
                ) : (
                    <><span className="w-2 h-8 bg-blue-600 rounded mr-3"></span> Danh sách tin của bạn ({passList.length})</>
                )}
            </h2>
        </div>

        {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="h-96 bg-gray-200 rounded-xl animate-pulse"></div>)}</div>
        ) : passList.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-gray-200">
                <div className="text-6xl mb-4 text-gray-300">📭</div>
                <h3 className="text-xl font-bold text-gray-500">{viewMode === 'market' ? "Chưa có tin đăng nào phù hợp!" : "Bạn chưa đăng tin nào!"}</h3>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {passList.map((item) => (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border flex flex-col group overflow-hidden ${item.status === 'SOLD' ? 'opacity-70 grayscale' : 'border-gray-100'}`}>
                {/* Image Section */}
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                    <img src={item.image} alt="Court" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        {viewMode === 'mine' ? renderStatusBadge(item.status) : (
                            item.tags.map((tag, idx) => (<span key={idx} className={`text-[10px] uppercase font-bold px-2 py-1 rounded shadow text-white ${tag === 'Giảm giá' ? 'bg-red-500' : 'bg-green-500'}`}>{tag}</span>))
                        )}
                    </div>
                    {item.discountPercent > 0 && viewMode === 'market' && (<div className="absolute bottom-0 left-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-tr-lg z-10">-{item.discountPercent}%</div>)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <div className="absolute bottom-3 left-3 text-white">
                         <div className="font-bold text-lg leading-tight">{item.centerName}</div>
                         <div className="text-xs opacity-90"><i className="fas fa-map-marker-alt mr-1"></i> {item.courtName}</div>
                    </div>
                </div>

                {/* Body Section */}
                <div className="p-4 flex-grow flex flex-col">
                    <div className="flex justify-between items-center mb-3 bg-gray-50 p-2 rounded-lg">
                         <div className="text-center"><div className="text-xs text-gray-500 uppercase">Ngày</div><div className="font-bold text-gray-800">{new Date(item.date).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'})}</div></div>
                         <div className="h-8 w-[1px] bg-gray-300"></div>
                         <div className="text-center"><div className="text-xs text-gray-500 uppercase">Giờ</div><div className="font-bold text-blue-600">{item.startTime}</div></div>
                         <div className="text-gray-400">➔</div>
                         <div className="text-center"><div className="text-xs text-gray-500 uppercase">Đến</div><div className="font-bold text-blue-600">{item.endTime}</div></div>
                    </div>
                    <p className="text-sm text-gray-600 italic mb-4 line-clamp-2 min-h-[40px]">"{item.note}"</p>

                    <div className="mt-auto border-t border-dashed border-gray-200 pt-3 flex items-center justify-between">
                        <div>
                             {item.originalPrice > item.passPrice && (<div className="text-xs text-gray-400 line-through">{formatCurrency(item.originalPrice)}</div>)}
                            <div className="text-xl font-bold text-red-600">{formatCurrency(item.passPrice)}</div>
                        </div>

                        {/* BUTTONS */}
                        {viewMode === 'market' ? (
                            <button onClick={() => setSelectedPass(item)} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-green-200">
                                Liên hệ
                            </button>
                        ) : (
                            // 👇 NÚT CHI TIẾT GỌI HÀM MỚI
                            <button 
                                onClick={() => handleOpenManage(item)}
                                disabled={item.status === 'SOLD'} 
                                className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors 
                                ${item.status === 'SOLD' 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'}`}
                            >
                                {item.status === 'SOLD' ? 'Đã xong' : 'Chi tiết'}
                            </button>
                        )}
                    </div>
                </div>
                {viewMode === 'market' && (
                    <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex items-center gap-2">
                        <img src={item.sellerAvatar || DEFAULT_AVATAR} className="w-6 h-6 rounded-full object-cover" alt=""/>
                        <span className="text-xs text-gray-500 truncate">{item.sellerName}</span>
                    </div>
                )}
                </div>
            ))}
            </div>
        )}
      </div>

      {/* MODAL 1: CONTACT (MARKET VIEW) */}
      {selectedPass && viewMode === 'market' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="bg-green-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold">Liên hệ chủ sân</h3>
                    <button onClick={() => setSelectedPass(null)}><i className="fas fa-times"></i></button>
                </div>
                <div className="p-6 text-center">
                    <img src={selectedPass.sellerAvatar || DEFAULT_AVATAR} className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-green-100 shadow-sm" alt=""/>
                    <h4 className="font-bold text-lg text-gray-800">{selectedPass.sellerName}</h4>
                    <div className="mt-4 bg-gray-100 rounded-lg p-3 flex items-center justify-between">
                        <span className="font-mono font-bold text-xl text-gray-700">{selectedPass.phone}</span>
                        <button onClick={() => {navigator.clipboard.writeText(selectedPass.phone); alert('Đã copy!');}} className="text-green-600 hover:bg-white p-2 rounded-full transition"><i className="far fa-copy"></i></button>
                    </div>
                    <button onClick={handleInterestClick} className={`block w-full text-white font-bold py-3 rounded-xl mt-4 transition shadow-lg ${isInterested ? "bg-gray-500 hover:bg-gray-600 shadow-gray-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"}`}>
                        <i className={`fas fa-heart mr-2 ${isInterested ? 'text-red-400' : 'text-white'}`}></i> {isInterested ? " Đã Quan Tâm" : " Quan Tâm"}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 👇 MODAL 2: LIST NGƯỜI QUAN TÂM (MINE VIEW) */}
      {manageModalOpen && selectedPass && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="bg-blue-600 p-4 text-white flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-lg">Danh sách quan tâm</h3>
                        <p className="text-xs text-blue-100">Chọn người để chuyển nhượng sân</p>
                    </div>
                    <button onClick={() => setManageModalOpen(false)} className="hover:bg-blue-500 p-2 rounded-full"><i className="fas fa-times"></i></button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                        <input 
                            type="text" 
                            className="w-full border border-gray-200 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-sm"
                            placeholder="Tìm theo tên hoặc SĐT..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* User List */}
                <div className="overflow-y-auto flex-grow p-4 space-y-3">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                            <i className="fas fa-users-slash text-4xl mb-2"></i>
                            <p>Chưa có ai quan tâm.</p>
                        </div>
                    ) : (
                        filteredUsers.map((item, index) => {
                            // 👇 LOGIC QUAN TRỌNG: Backend trả về user nằm trong field `user`
                            const profile = item.user || {}; 

                            return (
                                <div 
                                    key={item._id || index} 
                                    // 👇 Khi click, lưu lại profile (bao gồm userId) để chuyển sân
                                    onClick={() => handleSelectCandidate(profile)}
                                    className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group"
                                >
                                    {/* Avatar (Hardcode) */}
                                    <img src={DEFAULT_AVATAR} className="w-12 h-12 rounded-full bg-gray-200 object-cover" alt="User Avatar"/>
                                    
                                    <div className="flex-grow">
                                        <h4 className="font-bold text-gray-800 group-hover:text-blue-600">
                                            {profile.name || "Người dùng không tên"}
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            <i className="fas fa-phone-alt mr-1"></i> 
                                            {profile.phone || "Không có SĐT"}
                                        </p>
                                    </div>
                                    <div className="text-gray-300 group-hover:text-blue-500">
                                        <i className="fas fa-chevron-right"></i>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
      )}

      {/* 👇 MODAL 3: XÁC NHẬN CHUYỂN NHƯỢNG */}
      {isConfirming && selectedCandidate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm" onClick={() => setIsConfirming(false)}></div>
              
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-bounce-in">
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                          <i className="fas fa-exchange-alt"></i>
                      </div>
                      <h3 className="font-bold text-xl text-gray-800 mb-2">Xác nhận chuyển sân?</h3>
                      <p className="text-gray-500 text-sm mb-6">
                          Bạn có chắc chắn muốn chuyển booking này cho 
                          <span className="font-bold text-gray-800 block mt-1 text-lg">
                            {selectedCandidate.name || "Người dùng"}
                          </span>
                      </p>
                      
                      <div className="flex gap-3">
                          <button 
                              onClick={() => setIsConfirming(false)}
                              className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition"
                          >
                              Hủy bỏ
                          </button>
                          <button 
                              onClick={handleTransfer}
                              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition"
                          >
                              Đồng ý
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <Footer />
    </div>
  );
};

export default PassCourtPage;