import React, { useState, useEffect, useMemo, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import BookingTable from "../components/BookingTable";
import Legend from "../components/legend";
import { FaCalendarAlt, FaHome, FaArrowLeft, FaSyncAlt } from "react-icons/fa";
import { AuthContext } from '../contexts/AuthContext.jsx'; 
import { ROLES } from '../constants/roles'; 
import LoadingSpinner from "../components/LoadingSpinner";

// 💡 IMPORT API
import { getAllCentersGQL, getCenterInfoByIdGQL } from "../apiV2/center_service/graphql/center.api.js";
import { getPendingMapping } from "../apiV2/booking_service/rest/booking.api.js";

const times = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const slotCount = times.length - 1;

// Hàm chuẩn hóa ngày (YYYY-MM-DD)
const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Logic khóa giờ quá khứ
function applyLockedLogic(mapping, selectedDate, courts) {
  const updatedMapping = JSON.parse(JSON.stringify(mapping));
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  courts.forEach((court) => {
    // Key của mapping là courtId
    const courtId = court.courtId || court._id; 
    
    const arr = updatedMapping[courtId] || Array(slotCount).fill("trống");
    updatedMapping[courtId] = arr.map((slot, i) => {
      const slotHour = times[i];
      if (selectedDate === todayStr) {
        if (slotHour < currentHour || (slotHour === currentHour && currentMinute > 0)) {
          return "locked";
        }
      }
      return slot;
    });
  });
  return updatedMapping;
}

const CourtStatusPage = () => {
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useContext(AuthContext); 

  const [tempSelectedDates, setTempSelectedDates] = useState([new Date()]);
  const [displayDates, setDisplayDates] = useState([new Date()]);
  
  // Danh sách trung tâm (Dropdown)
  const [centersList, setCentersList] = useState([]); 
  
  // Chi tiết trung tâm & Sân
  const [centerDetail, setCenterDetail] = useState(null);
  const [courts, setCourts] = useState([]); 
  
  const [centerId, setCenterId] = useState(""); 
  const [bookingData, setBookingData] = useState({});
  const [error, setError] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoadingCourts, setIsLoadingCourts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. KHỞI TẠO: LẤY LIST CENTER & CHECK QUYỀN
  useEffect(() => {
    const initData = async () => {
      if (authLoading || !admin) return; 

      try {
        // Luôn lấy toàn bộ danh sách center về trước
        const allCenters = await getAllCentersGQL();
        
        if (admin.role === ROLES.SUPER_ADMIN) {
          // Nếu là Super Admin: Thấy hết, mặc định chọn cái đầu
          setCentersList(allCenters);
          if (allCenters.length > 0 && !centerId) {
            setCenterId(allCenters[0].centerId);
          }
        } else if (admin.role === ROLES.CENTER_MANAGER) {
          // 💡 LOGIC MỚI: Tìm center có centerManagerId trùng với ID của admin hiện tại
          const myId = admin.userId || admin._id;
          
          const myCenter = allCenters.find(c => 
             c.centerManagerId && c.centerManagerId.toString() === myId.toString()
          );

          if (myCenter) {
            setCentersList([myCenter]); // Chỉ hiện center của họ trong dropdown
            setCenterId(myCenter.centerId);
          } else {
            setError("Tài khoản Manager này chưa được phân công quản lý trung tâm nào.");
            setCentersList([]);
          }
        }
      } catch (err) {
        console.error("Error init data:", err);
        setError("Không thể khởi tạo dữ liệu trung tâm.");
      }
    };
    initData();
  }, [admin, authLoading]); // Bỏ centerId ra khỏi dependency để tránh loop

  // 2. LẤY CHI TIẾT SÂN
  useEffect(() => {
    const fetchCenterDetail = async () => {
      if (!centerId) return;

      setIsLoadingCourts(true);
      try {
        const detail = await getCenterInfoByIdGQL(centerId);
        if (detail) {
          setCenterDetail(detail);
          if (detail.courts && Array.isArray(detail.courts)) {
            const activeCourts = detail.courts.filter(c => c.isActive !== false);
            setCourts(activeCourts);
          } else {
            setCourts([]);
          }
        }
      } catch (err) {
        console.error("Lỗi lấy chi tiết sân:", err);
        setError("Không thể lấy thông tin sân.");
        setCourts([]);
      } finally {
        setIsLoadingCourts(false);
      }
    };

    fetchCenterDetail();
  }, [centerId]);

  // 3. FETCH DỮ LIỆU BOOKING
  const fetchBookingStatus = useCallback(async () => {
    if (!centerId || courts.length === 0 || displayDates.length === 0) return;

    const newBookingData = {};
    
    try {
      const promises = displayDates.map(async (date) => {
        const dateStr = getLocalDateString(date);
        try {
          const mapping = await getPendingMapping(centerId, dateStr);
          
          const completeMapping = {};
          courts.forEach((court) => {
            const cId = court.courtId || court._id;
            completeMapping[cId] = mapping[cId] || Array(slotCount).fill("trống");
          });

          return { 
            dateStr, 
            data: applyLockedLogic(completeMapping, dateStr, courts) 
          };
        } catch (err) {
          console.error(`Error fetching for ${dateStr}:`, err);
          return null;
        }
      });

      const results = await Promise.all(promises);
      
      results.forEach(res => {
        if (res) {
          newBookingData[res.dateStr] = res.data;
        }
      });

      setBookingData(newBookingData);
      setError(null);
    } catch (err) {
      console.error("General fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [centerId, courts, displayDates]);


  // 4. POLLING
  useEffect(() => {
    if (courts.length > 0 && displayDates.length > 0) {
      fetchBookingStatus();
    }

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && courts.length > 0) {
         fetchBookingStatus();
      }
    }, 30000); 

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && courts.length > 0) {
        fetchBookingStatus();
      }
    };
    
    const handleWindowFocus = () => {
        if (courts.length > 0) {
          fetchBookingStatus();
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [fetchBookingStatus, courts.length, displayDates.length]);


  // --- HANDLERS ---
  const handleDateChange = (dates) => {
    if (dates.length <= 7) {
      setTempSelectedDates(dates);
    } else {
      alert("Bạn chỉ có thể chọn tối đa 7 ngày!");
      setTempSelectedDates(dates.slice(0, 7));
    }
  };

  const handleOkayClick = (e) => {
    e.stopPropagation();
    if (tempSelectedDates.length > 0) {
      const sorted = [...tempSelectedDates].sort((a, b) => a - b);
      setDisplayDates(sorted);
      setIsCalendarOpen(false);
    } else {
      setDisplayDates([]);
      setIsCalendarOpen(false);
    }
  };

  const handleCenterChange = (e) => {
    if (admin && admin.role === ROLES.SUPER_ADMIN) {
      setCenterId(e.target.value);
      setBookingData({});
      setTempSelectedDates([new Date()]);
      setDisplayDates([new Date()]);
    }
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    fetchBookingStatus();
  }

  const dateTables = useMemo(() => {
    return displayDates.map((date) => {
      const dateStr = getLocalDateString(date);
      return (
        <div key={dateStr} className="mb-4 bg-green-100 p-0 rounded-md border border-gray-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
            <div className="w-full sm:w-40 text-x font-medium text-black px-2">
              {`${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`}
            </div>
            <div className="w-full">
              {isLoadingCourts ? (
                 <div className="p-4 text-center text-gray-500">Đang tải danh sách sân...</div>
              ) : courts.length > 0 ? (
                <BookingTable
                  courts={courts}
                  bookingData={bookingData[dateStr] || {}}
                  toggleBookingStatus={() => {}} 
                  times={times}
                  slotCount={slotCount}
                  currentUserId={null}
                />
              ) : (
                <p className="text-gray-600 text-sm p-2">Không có sân nào.</p>
              )}
            </div>
          </div>
        </div>
      );
    });
  }, [displayDates, bookingData, courts, isLoadingCourts]);

  if (authLoading || !admin) {
    return <div className="min-h-screen flex justify-center items-center bg-green-800"><LoadingSpinner /></div>;
  }

  return (
    <div className="bg-green-800 font-inter min-h-screen">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <div className="w-full py-4">
        {/* HEADER */}
        <div className="flex justify-between items-center px-4 mb-4">
          <button onClick={() => navigate(-1)} className="text-white hover:text-gray-300">
            <FaArrowLeft className="text-2xl" />
          </button>
          <h1 className="text-2xl font-bold text-white">
             {centerDetail ? centerDetail.name : "Trạng thái sân"}
          </h1>
          <div className="w-6"></div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-4">
          
          {/* Dropdown Trung Tâm (Chỉ SuperAdmin hoặc nếu Manager muốn nhìn tên center của mình) */}
          <div className="flex items-center">
             <label className="mr-2 font-semibold text-white">Trung tâm:</label>
             <div className="relative border border-gray-300 rounded-md bg-white">
               <FaHome className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-600" />
               <select
                 value={centerId}
                 onChange={handleCenterChange}
                 // Disable nếu không phải Super Admin
                 disabled={admin.role !== ROLES.SUPER_ADMIN || centersList.length === 0}
                 className={`border-0 p-2 pl-8 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium text-gray-800 w-full ${admin.role !== ROLES.SUPER_ADMIN ? 'bg-gray-100 cursor-not-allowed' : ''}`}
               >
                 {centersList.length === 0 ? (
                   <option value="">Không có dữ liệu</option>
                 ) : (
                   centersList.map((c) => (
                     <option key={c.centerId} value={c.centerId}>{c.name}</option>
                   ))
                 )}
               </select>
             </div>
           </div>

          {/* Chọn ngày */}
          <div className="flex flex-col">
            <div className="flex items-center">
              <label className="mr-2 font-semibold text-white">Ngày:</label>
              <div
                className="relative border border-gray-300 rounded-md bg-white cursor-pointer h-10 w-48"
                onClick={() => setIsCalendarOpen(true)}
              >
                <FaCalendarAlt className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-600 z-10" />
                <DatePicker
                  onChange={handleDateChange}
                  selectsMultiple
                  selectedDates={tempSelectedDates}
                  minDate={new Date()}
                  dateFormat="dd/MM/yyyy"
                  className="border-0 p-2 pl-8 rounded-md focus:outline-none w-full h-full text-sm font-medium"
                  placeholderText="Chọn ngày"
                  popperPlacement="bottom-end"
                  open={isCalendarOpen}
                  onClickOutside={() => {
                    handleOkayClick({ stopPropagation: () => {} });
                  }}
                >
                  <div className="p-2 flex justify-end gap-2">
                    <button onClick={handleOkayClick} className="bg-green-500 text-white px-3 py-1 rounded text-sm font-medium">OK</button>
                    <button onClick={(e) => { e.stopPropagation(); setIsCalendarOpen(false); }} className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-medium">Đóng</button>
                  </div>
                </DatePicker>
              </div>
            </div>
          </div>
          
          {/* Nút Refresh thủ công */}
          <button 
             onClick={handleRefreshClick} 
             className="text-white hover:text-green-300 transition-colors p-2"
             title="Làm mới dữ liệu"
          >
             <FaSyncAlt className={isRefreshing ? "animate-spin text-xl" : "text-xl"} />
          </button>

          <div className="text-white"><Legend /></div>
        </div>
      </div>

      {error && <div className="mx-4 mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <div className="px-4">
        {displayDates.length === 0 ? <p className="text-gray-200 text-sm">Chưa chọn ngày.</p> : dateTables}
      </div>
    </div>
  );
};

export default CourtStatusPage;