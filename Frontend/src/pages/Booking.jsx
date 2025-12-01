import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "../components/datepicker";
import Legend from "../components/legend";
import BookingTable from "../components/bookingTable";
import PricingTable from "../components/PricingTable";
import ModalConfirmation from "../components/ModalConfirmation";
import { AuthContext } from "../contexts/AuthContext";

// Import API
import { getCenterInfoByIdGQL } from "../apis/centers"; 
import { getPendingMapping, confirmBookingToDB } from "../apis/booking";
import { fetchUserInfo } from "../apis/users";

import "../styles/booking.css";

// --- CONSTANTS & HELPERS ---

const times = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const slotCount = times.length - 1;

function formatSlot(slot) {
  const hour = Math.floor(slot);
  const minute = (slot - hour) * 60;
  return `${hour}h${minute === 0 ? "00" : minute}`;
}

// Hàm tính tổng tiền và giảm giá (Client Side Display Only)
function calculateTotal(slots, userPoints) {
  let totalAmount = slots.reduce((sum, s) => sum + s.price, 0);
  const totalHours = slots.length;

  let discount = 0;
  if (totalHours >= 2) discount += 0.05; // Giảm 5% nếu đặt >= 2h
  if (userPoints > 4000) discount += 0.10; // Giảm 10% nếu VIP

  const discountedAmount = totalAmount * (1 - discount);
  return { 
    totalHours, 
    totalAmount: Math.round(discountedAmount), 
    originalAmount: totalAmount, 
    discount 
  };
}

// --- LOGIC TÍNH GIÁ LOCAL (Client-side) ---

const isWeekend = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay();
  return day === 0 || day === 6; // 0: CN, 6: T7
};

const parseHour = (timeStr) => {
  if (!timeStr) return 0;
  return parseInt(timeStr.split(":")[0], 10);
};

const getPriceLocally = (centerInfo, dateStr, slotVal) => {
  if (!centerInfo || !centerInfo.pricing) return 50000; // Giá mặc định an toàn

  const type = isWeekend(dateStr) ? "weekend" : "weekday";
  const pricingList = centerInfo.pricing[type] || [];

  // Tìm khung giờ phù hợp: startTime <= slotVal < endTime
  const matchedPrice = pricingList.find((p) => {
    const start = parseHour(p.startTime);
    const end = parseHour(p.endTime);
    return slotVal >= start && slotVal < end;
  });

  return matchedPrice ? matchedPrice.price : 50000;
};

// --- LOGIC HIỂN THỊ (MERGE DATA) ---

function applyDisplayLogic(serverMapping, selectedSlots, selectedDate, currentUserId) {
  const updatedMapping = JSON.parse(JSON.stringify(serverMapping));
  
  const todayStr = new Date().toLocaleDateString("en-CA");
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  selectedSlots.forEach(slot => {
    const { courtId, slotVal } = slot;
    if (updatedMapping[courtId]) {
       const index = times.indexOf(slotVal);
       if (index !== -1 && index < slotCount) {
         updatedMapping[courtId][index] = { 
            status: "myPending", 
            userId: currentUserId 
         };
       }
    }
  });

  Object.keys(updatedMapping).forEach((courtId) => {
    const arr = updatedMapping[courtId] || Array(slotCount).fill("trống");
    updatedMapping[courtId] = arr.map((status, i) => {
      const slotHour = times[i];
      if (selectedDate === todayStr) {
        if (slotHour < currentHour || (slotHour === currentHour && currentMinute > 0)) {
          return "locked";
        }
      }

      if (status === undefined) return "trống";

      if (typeof status === "object" && status.userId != null) {
        let userId = status.userId;
        if (typeof userId === "string" && userId.includes("_id")) {
          try {
            const parsed = JSON.parse(userId);
            userId = parsed._id || userId;
          } catch (e) {}
        }
        
        const isMe = userId.toString().trim() === currentUserId?.toString().trim();

        if (status.status === "paid" || status.status === "đã đặt") {
          return { ...status, status: "paid" };
        } else if (status.status === "processing" || status.status === "chờ xử lý") {
          return isMe ? { ...status, status: "myProcessing" } : { ...status, status: "processing" };
        } else if (status.status === "pending") {
          return isMe ? { ...status, status: "myPending" } : { ...status, status: "pending" };
        } else if (status.status === "myPending") {
          return status; 
        }
      }
      return status;
    });
  });

  return updatedMapping;
}

// --- MAIN COMPONENT ---

const BookingSchedule = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const userId = user?._id;
  const userPoints = user?.points || 0;
  const name = user?.name || "Người dùng";

  const openHours = "05:00 - 24:00";
  
  const [bookingDataState, setBookingDataState] = useState(() => {
    return JSON.parse(localStorage.getItem("bookingData") || "{}");
  });
  
  const [centerId, setCenterId] = useState(bookingDataState.centerId || null);
  const todayStr = new Date().toLocaleDateString("en-CA");
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [courts, setCourts] = useState([]);
  const [baseMapping, setBaseMapping] = useState({});
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [displayMapping, setDisplayMapping] = useState({});
  const [centerInfo, setCenterInfo] = useState(null);
  
  // Tính tiền để hiển thị (UX: User thấy ngay giá khi click)
  const { totalHours, totalAmount, originalAmount } = calculateTotal(selectedSlots, userPoints);
  
  const [showModal, setShowModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [initialMappingLoaded, setInitialMappingLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const datePickerRef = useRef(null);

  // --- EFFECTS ---

  useEffect(() => {
    if (bookingDataState) {
      localStorage.setItem("bookingData", JSON.stringify(bookingDataState));
    }
  }, [bookingDataState]);

  useEffect(() => {
    if (!centerId || centerId === "default_centerId") {
      alert("Không tìm thấy trung tâm. Vui lòng chọn lại trung tâm.");
      navigate("/centers");
    }
  }, [centerId, navigate]);

  useEffect(() => {
    return () => localStorage.removeItem("bookingData");
  }, []);

  // 1. Load Initial Data (GraphQL)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!centerId) return;
      try {
        const data = await getCenterInfoByIdGQL(centerId);
        if (data) {
           setCenterInfo(data);
           if (data.courts && Array.isArray(data.courts)) {
               setCourts(data.courts);
           }
        }
      } catch (error) {
        console.error("Error fetching initial data via GraphQL:", error);
      }
    };
    fetchInitialData();
  }, [centerId]);

  // 2. Status Polling
  const fetchBookingStatus = useCallback(async () => {
    if (!centerId || courts.length === 0) return;

    try {
      const mappingDB = await getPendingMapping(centerId, selectedDate);
      
      const completeMapping = {};
      courts.forEach((court) => {
        const key = court.id || court._id || court.courtId; 
        completeMapping[key] = mappingDB[key] || Array(slotCount).fill("trống");
      });

      setBaseMapping(completeMapping);
      setInitialMappingLoaded(true);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái sân:", error);
    }
  }, [centerId, selectedDate, courts]);

  useEffect(() => {
    if (courts.length > 0) fetchBookingStatus();

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
        if (courts.length > 0) fetchBookingStatus();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [fetchBookingStatus, courts.length]);

  // 3. UI Update
  useEffect(() => {
    const updateUI = () => {
        setDisplayMapping(applyDisplayLogic(baseMapping, selectedSlots, selectedDate, userId));
    };
    
    updateUI();
    const interval = setInterval(updateUI, 60000);
    return () => clearInterval(interval);
  }, [baseMapping, selectedSlots, selectedDate, userId]);


  // --- HANDLERS ---

  const handleDateChange = (newDate) => {
    setBaseMapping({});
    setDisplayMapping({});
    setSelectedSlots([]);
    setInitialMappingLoaded(false);
    setSelectedDate(newDate);
    setBookingDataState({ centerId, date: newDate });
  };

  const toggleBookingStatus = (rowIndex, colIndex) => {
    if (!initialMappingLoaded) return;
    const court = courts[rowIndex];
    if (!court) return;
    
    const courtIdKey = court.id || court._id || court.courtId; 
    const slotVal = times[colIndex];

    const todayStr = new Date().toLocaleDateString("en-CA");
    if (selectedDate === todayStr) {
      const now = new Date();
      if (slotVal < now.getHours() || (slotVal === now.getHours() && now.getMinutes() > 0)) {
        return; 
      }
    }

    const serverSlot = baseMapping[courtIdKey] ? baseMapping[courtIdKey][colIndex] : "trống";
    if (serverSlot !== "trống" && typeof serverSlot === 'object') {
        return; 
    }

    const existingIndex = selectedSlots.findIndex(s => s.courtId === courtIdKey && s.slotVal === slotVal);
    let newSelectedSlots = [...selectedSlots];

    if (existingIndex >= 0) {
      newSelectedSlots.splice(existingIndex, 1);
      setSelectedSlots(newSelectedSlots);
    } else {
      // ✅ GIỮ PRICE Ở ĐÂY để UX tốt (hiển thị tổng tiền)
      const price = getPriceLocally(centerInfo, selectedDate, slotVal);
      
      const newSlot = { courtId: courtIdKey, slotVal, price };
      newSelectedSlots.push(newSlot);
      setSelectedSlots(newSelectedSlots);
    }
  };

  const handleConfirm = () => {
    if (selectedSlots.length === 0) {
        alert("Vui lòng chọn ít nhất 1 khung giờ.");
        return;
    }
    setShowModal(true);
  };

  // --- CHECK-AND-LOCK LOGIC ---
  const handleModalAction = async (action) => {
    if (action === "confirm") {
      if (isSubmitting) return; 
      setIsSubmitting(true);

      try {
        // ✅ BEST PRACTICE: Loại bỏ 'price' trước khi gửi lên API
        // Backend sẽ dùng courtId & timeslot để tự tính toán lại giá
        const cleanedSlots = selectedSlots.map(s => ({
            courtId: s.courtId,
            timeslot: s.slotVal
        }));

        const { success, booking } = await confirmBookingToDB({
          centerId,
          date: selectedDate,
          name,
          selectedSlots: cleanedSlots // Gửi danh sách đã làm sạch
        });

        if (success) {
          localStorage.setItem("bookingExpiresAt", booking.expiresAt);
          localStorage.setItem("bookingId", booking._id);
          localStorage.setItem("userId", userId);
          localStorage.setItem("centerId", centerId);
          localStorage.setItem("selectedDate", selectedDate);
          
          // Sử dụng giá CHUẨN từ Backend trả về để thanh toán
          localStorage.setItem("totalAmount", booking.totalAmount);

          const slotGroups = groupSelectedSlots(selectedSlots, courts);
          localStorage.setItem("slotGroups", JSON.stringify(slotGroups));
          
          const updatedUserData = await fetchUserInfo();
          setUser(updatedUserData.user);
          
          alert(`Giữ chỗ thành công! Mã đơn: ${booking._id}`);
          navigate("/payment");
        }
      } catch (error) {
          console.error("Lỗi khi xác nhận booking:", error);
          
          if (error.response && error.response.status === 409) {
             const { message, conflictedSlots } = error.response.data;
             alert(message || "Một số khung giờ bạn chọn đã bị người khác đặt!");

             const newBaseMapping = JSON.parse(JSON.stringify(baseMapping));
             conflictedSlots.forEach(conflict => {
                 const { courtId, timeslot } = conflict;
                 const index = times.indexOf(timeslot);
                 if (newBaseMapping[courtId] && index !== -1) {
                     newBaseMapping[courtId][index] = {
                         status: 'pending',
                         userId: 'others' 
                     };
                 }
             });
             setBaseMapping(newBaseMapping);

             const newSelectedSlots = selectedSlots.filter(s => 
                 !conflictedSlots.some(c => c.courtId === s.courtId && c.timeslot === s.slotVal)
             );
             setSelectedSlots(newSelectedSlots);
             
             setShowModal(false);
          } else {
             alert("Lỗi hệ thống: " + (error.message || "Unknown error"));
          }
      } finally {
         setIsSubmitting(false);
         setShowModal(false);
      }
    } else if (action === "cancel") {
      setShowModal(false);
    }
  };

  function groupSelectedSlots(selectedSlots, courts) {
    const groups = [];
    const slotsByCourt = {};
    
    selectedSlots.forEach(({ courtId, slotVal }) => {
      if (!slotsByCourt[courtId]) slotsByCourt[courtId] = [];
      slotsByCourt[courtId].push(slotVal);
    });

    Object.keys(slotsByCourt).forEach((cId) => {
      const sorted = slotsByCourt[cId].sort((a, b) => a - b);
      let group = [sorted[0]];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
          group.push(sorted[i]);
        } else {
          groups.push({ courtId: cId, slots: group });
          group = [sorted[i]];
        }
      }
      if (group.length) groups.push({ courtId: cId, slots: group });
    });

    return groups.map(({ courtId, slots }) => {
      const courtObj = courts.find((c) => (c.id === courtId || c._id === courtId || c.courtId === courtId));
      const courtName = courtObj ? courtObj.name : `Court ${courtId}`;
      return slots.length === 1
        ? { courtName, timeStr: formatSlot(slots[0]) }
        : { courtName, timeStr: `${formatSlot(slots[0])} - ${formatSlot(slots[slots.length - 1] + 1)}` };
    });
  }

  if (!user) {
    return (
      <div className="loading-container" data-testid="loading-user-data">
        <div className="loading-spinner"></div>
        <p>Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="booking-page" data-testid="booking-page">
      <div className="booking-header">
        <button onClick={handleGoBack} className="back-button" data-testid="back-to-centers-button">
          <i className="fas fa-arrow-left"></i> Quay lại
        </button>
        <h1>Đặt sân</h1>
        <div></div>
      </div>

      {centerInfo && (
        <div className="center-info-bar" data-testid="center-info-bar">
          <div className="center-name" data-testid="center-name">
            <i className="fas fa-building"></i> {centerInfo.name}
          </div>
          <div className="center-details">
            <span data-testid="center-address">
              <i className="fas fa-map-marker-alt"></i> {centerInfo.address}
            </span>
            <span data-testid="center-phone">
              <i className="fas fa-phone-alt"></i> {centerInfo.phone}
            </span>
            <span data-testid="center-open-hours">
              <i className="fas fa-clock"></i> {openHours}
            </span>
            <span data-testid="center-total-courts">
              <i className="fas fa-table-tennis"></i> {centerInfo.totalCourts} sân
            </span>
          </div>
        </div>
      )}

      <div className="date-legend-container">
        <div className="current-date" data-testid="selected-date-display">
          <i className="fas fa-calendar-alt"></i>
          <span>{formatDisplayDate(selectedDate)}</span>
        </div>

        <div className="control-panel">
          <Legend />
          <button 
             onClick={fetchBookingStatus} 
             className="text-sm text-blue-600 hover:text-blue-800 underline ml-2"
             title="Làm mới trạng thái sân"
          >
             <i className="fas fa-sync-alt"></i>
          </button>

          <div className="date-price-controls">
            <div
              className="date-picker-wrapper"
              onClick={() => datePickerRef.current?.openDatePicker()}
              data-testid="date-picker-wrapper"
            >
              <DatePicker
                ref={datePickerRef}
                value={selectedDate}
                onDateChange={handleDateChange}
              />
            </div>
            <button
              onClick={() => setShowPricingModal(true)}
              className="price-list-button"
              data-testid="view-pricing-button"
            >
              <i className="fas fa-tags"></i> Xem bảng giá
            </button>
          </div>
        </div>

        <div className="booking-reminder" data-testid="booking-reminder">
          <i className="fas fa-info-circle"></i>
          <p>
            Nếu bạn cần đặt lịch cố định, vui lòng liên hệ:{" "}
            <a href="tel:0918773883" data-testid="contact-phone-link">0972.628.815</a> để được hỗ trợ.
          </p>
        </div>
      </div>

      {!initialMappingLoaded && (
        <div className="loading-container" data-testid="loading-booking-data">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      )}

      {initialMappingLoaded && courts.length > 0 ? (
        <div className="booking-table-container" data-testid="booking-table-container">
          <BookingTable
            key={selectedDate}
            courts={courts}
            bookingData={displayMapping}
            toggleBookingStatus={toggleBookingStatus}
            times={times}
            slotCount={slotCount}
            currentUserId={userId}
            disableBooking={!initialMappingLoaded}
          />
        </div>
      ) : (
        initialMappingLoaded && (
          <div className="no-data-message" data-testid="no-data-message">Không tìm thấy dữ liệu sân</div>
        )
      )}

      {selectedSlots.length > 0 && (
        <div className="booking-footer" data-testid="booking-footer">
          <div className="expand-button-container">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="expand-button"
              aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
              data-testid="expand-details-button"
            >
              <i className={`fas fa-chevron-${isExpanded ? "down" : "up"}`}></i>
            </button>
          </div>

          {isExpanded && (
            <div className="booking-details" data-testid="booking-details-expanded">
              <h3>Chi tiết đặt sân:</h3>
              <div className="selected-slots" data-testid="selected-slots-list">
                {groupSelectedSlots(selectedSlots, courts).map((item, idx) => (
                  <div key={idx} className="slot-item">
                    <span className="court-name">{item.courtName}:</span>
                    <span className="slot-time">{item.timeStr}</span>
                  </div>
                ))}
              </div>
              <div className="divider"></div>
              <div className="discount-info">
                {totalHours >= 2 && (
                  <p data-testid="discount-2-hours">
                    Đã giảm 5% (đặt từ 2 giờ trở lên):{" "}
                    <span className="text-green-600">
                      -{formatMoney(originalAmount * 0.05)}
                    </span>
                  </p>
                )}
                {userPoints > 4000 && (
                  <p data-testid="discount-points">
                    Đã giảm 10% (điểm thành viên trên 4000):{" "}
                    <span className="text-green-600">
                      -{formatMoney(originalAmount * 0.10)}
                    </span>
                  </p>
                )}
              </div>
              <div className="reminder-note" data-testid="booking-reminder-note">
                <i className="fas fa-info-circle"></i>
                <p>Vui lòng đến sớm 10 phút trước giờ đặt sân.</p>
              </div>
            </div>
          )}

          <div className="booking-summary" data-testid="booking-summary">
            <div className="summary-item" data-testid="total-hours-summary">
              <span>Tổng thời gian:</span>
              <span className="hours-value">{totalHours} giờ</span>
            </div>
            <div className="summary-item" data-testid="total-amount-summary">
              <span>Tổng tiền:</span>
              <span className="amount-value">{formatMoney(totalAmount)}</span>
            </div>
          </div>

          <button onClick={handleConfirm} className="continue-button" data-testid="continue-to-payment-button">
            {isSubmitting ? (
                 <span className="animate-spin mr-2"><i className="fas fa-spinner"></i></span>
            ) : (
                <>
                  <span>Tiếp tục</span>
                  <i className="fas fa-arrow-right"></i>
                </>
            )}
          </button>
        </div>
      )}

      {showModal && (
        <ModalConfirmation
          isLoading={isSubmitting} 
          onAction={handleModalAction}
          title="Xác nhận thanh toán"
          message={
            <>
              Tổng số tiền thanh toán là{" "}
              <span className="font-bold text-yellow-500">
                {totalAmount.toLocaleString("vi-VN")} đ
              </span>
              . Nếu bạn xác nhận thanh toán, bạn sẽ có 5 phút để thanh toán (trong 5 phút đó không thể đặt sân tại trung tâm bạn vừa đặt nếu bạn thoát ra khỏi trang thanh toán, trừ khi bạn xóa booking giữ chỗ đó tại lịch đặt sắp tới ở phần thông tin cá nhân). Bạn có chắc chắn muốn thanh toán không?!{" "}
              <span role="img" aria-label="thinking">🧐</span>
            </>
          }
          data-testid="modal-confirmation"
        />
      )}

      {showPricingModal && (
        <PricingTable centerId={centerId} onClose={() => setShowPricingModal(false)} data-testid="pricing-table-modal" />
      )}
    </div>
  );
};

export default BookingSchedule;