import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "../components/datepicker";
import Legend from "../components/legend";
import BookingTable from "../components/bookingTable";
import PricingTable from "../components/PricingTable";
import ModalConfirmation from "../components/ModalConfirmation";
import socket from "../socket";
import { AuthContext } from "../contexts/AuthContext";

import { getCourtsByCenter, getPriceForTimeslot, getCenterInfoById } from "../apis/centers";
import { getPendingMapping, getMyPendingTimeslots, confirmBookingToDB, clearAllPendingBookings, togglePendingTimeslot } from "../apis/booking";
import { fetchUserInfo } from "../apis/users";

import "../styles/booking.css";

const times = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const slotCount = times.length - 1;

function formatSlot(slot) {
  const hour = Math.floor(slot);
  const minute = (slot - hour) * 60;
  return `${hour}h${minute === 0 ? "00" : minute}`;
}

function calculateTotal(slots, userPoints) {
  let totalAmount = slots.reduce((sum, s) => sum + s.price, 0);
  const totalHours = slots.length;

  // Áp dụng giảm giá
  let discount = 0;

  // Giảm 5% nếu đặt từ 2 giờ trở lên
  if (totalHours >= 2) {
    discount += 0.05; // 5%
  }

  // Giảm thêm 10% nếu user.points > 4000
  if (userPoints > 4000) {
    discount += 0.10; // 10%
  }

  // Tính tổng giá sau giảm giá
  const discountedAmount = totalAmount * (1 - discount);
  return { totalHours, totalAmount: Math.round(discountedAmount), originalAmount: totalAmount, discount };
}

function applyLockedLogic(mapping, selectedDate, currentUserId) {
  const updatedMapping = JSON.parse(JSON.stringify(mapping));
  const todayStr = new Date().toLocaleDateString("en-CA");
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  Object.keys(updatedMapping).forEach((courtId) => {
    const arr = updatedMapping[courtId] || Array(slotCount).fill("trống");
    updatedMapping[courtId] = arr.map((status, i) => {
      if (status === undefined) return "trống";

      const slotHour = times[i];
      if (selectedDate === todayStr) {
        if (slotHour < currentHour || (slotHour === currentHour && currentMinute > 0)) {
          return "locked";
        }
      }

      if (typeof status === "object" && status.userId != null) {
        let userId = status.userId;
        if (typeof userId === "string" && userId.includes("_id")) {
          try {
            const parsed = JSON.parse(userId);
            userId = parsed._id || userId;
          } catch (e) {
            console.warn(`Không thể parse userId: ${userId}`);
          }
        }
        console.log("applyLockedLogic - userId:", userId, "currentUserId:", currentUserId);

        if (status.status === "đã đặt") {
          return status;
        } else if (status.status === "chờ xử lý" || status.status.toLowerCase() === "processing") {
          return userId.toString().trim() === currentUserId?.toString().trim()
            ? { ...status, status: "myProcessing" }
            : { ...status, status: "processing" };
        } else if (status.status === "pending") {
          return userId.toString().trim() === currentUserId?.toString().trim()
            ? { ...status, status: "myPending" }
            : status;
        } else if (status.status === "myPending") {
          return status; // Giữ nguyên trạng thái "myPending" từ inMemoryCache
        }
      }
      return status;
    });
  });
  return updatedMapping;
}

const BookingSchedule = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const userId = user?._id;
  const userPoints = user?.points || 0;
  const name = user?.name || "Người dùng";

  const openHours = "05:00 - 24:00";
  const [bookingDataState, setBookingDataState] = useState(() => {
    const storedData = JSON.parse(localStorage.getItem("bookingData") || "{}");
    return storedData;
  });
  const [centerId, setCenterId] = useState(bookingDataState.centerId || null);
  const todayStr = new Date().toLocaleDateString("en-CA");
  console.log("Today (locale):", todayStr);
  console.log("bookingData from localStorage:", bookingDataState);
  console.log("centerId:", centerId);
  const initialDate = todayStr;
  console.log("Initial date:", initialDate);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [courts, setCourts] = useState([]);
  const [baseMapping, setBaseMapping] = useState({});
  const [myPendingMapping, setMyPendingMapping] = useState({});
  const [displayMapping, setDisplayMapping] = useState({});
  const [centerInfo, setCenterInfo] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const { totalHours, totalAmount, originalAmount, discount } = calculateTotal(selectedSlots, userPoints);
  const [showModal, setShowModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [initialMappingLoaded, setInitialMappingLoaded] = useState(false);

  const datePickerRef = useRef(null);

  useEffect(() => {
    console.log("selectedSlots:", selectedSlots);
  }, [selectedSlots]);

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
    return () => {
      localStorage.removeItem("bookingData");
    };
  }, []);

  useEffect(() => {
    const fetchCenterInfo = async () => {
      try {
        const response = await getCenterInfoById(centerId);
        if (response && response.success) {
          setCenterInfo(response.center);
        }
      } catch (error) {
        console.error("Error fetching center info:", error);
      }
    };
    if (centerId) {
      fetchCenterInfo();
    }
  }, [centerId]);

  const fetchMappings = async () => {
    try {
      const data = await getCourtsByCenter(centerId);
      const courtsData = Array.isArray(data) ? data : data.data;
      setCourts(courtsData);
      if (courtsData.length > 0) {
        const mappingDB = await getPendingMapping(centerId, selectedDate);
        console.log("Fetched mapping from DB:", mappingDB);

        const mappingCache = await getMyPendingTimeslots(centerId, selectedDate);
        console.log("Fetched myPending mapping from cache:", mappingCache);

        const completeMapping = {};
        courtsData.forEach((court) => {
          const courtId = court._id;
          const dbSlots = mappingDB[courtId] || Array(slotCount).fill("trống");
          const cacheSlots = mappingCache[courtId] || Array(slotCount).fill("trống");
          const mergedSlots = dbSlots.map((slot, idx) => {
            if (cacheSlots[idx] !== "trống") {
              return cacheSlots[idx];
            }
            return slot;
          });
          completeMapping[courtId] = mergedSlots;
        });

        setBaseMapping(completeMapping);
        const finalMapping = applyLockedLogic(completeMapping, selectedDate, userId);
        console.log("Final mapping:", finalMapping);

        const newSelectedSlots = [];
        Object.keys(finalMapping).forEach((courtId) => {
          finalMapping[courtId].forEach((slot, idx) => {
            if (slot.status === "myPending") {
              newSelectedSlots.push({ courtId, slotVal: times[idx], price: 0 });
            }
          });
        });
        setSelectedSlots(newSelectedSlots);

        setInitialMappingLoaded(true);
        setDisplayMapping(finalMapping);

        for (const slot of newSelectedSlots) {
          try {
            const response = await getPriceForTimeslot({ centerId, date: selectedDate, timeslot: slot.slotVal });
            if (response.success) {
              setSelectedSlots((prev) =>
                prev.map((s) =>
                  s.courtId === slot.courtId && s.slotVal === slot.slotVal ? { ...s, price: response.price } : s
                )
              );
            } else {
              setSelectedSlots((prev) =>
                prev.map((s) =>
                  s.courtId === slot.courtId && s.slotVal === slot.slotVal ? { ...s, price: 100000 } : s
                )
              );
            }
          } catch (error) {
            setSelectedSlots((prev) =>
              prev.map((s) =>
                s.courtId === slot.courtId && s.slotVal === slot.slotVal ? { ...s, price: 100000 } : s
              )
            );
          }
        }
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sân hoặc mapping:", error);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, [centerId, selectedDate, userId]);

  useEffect(() => {
    if (!userId || !centerId) return;
    clearAllPendingBookings({ userId, centerId }).catch((err) =>
      console.error("Lỗi clear pending khi load:", err)
    );
  }, [userId, centerId]);

  const handleDateChange = async (newDate) => {
    if (!userId) return;
    try {
      await clearAllPendingBookings({ userId, centerId });
    } catch (error) {
      console.error("Lỗi clear pending khi đổi ngày:", error);
    }
    setBaseMapping({});
    setMyPendingMapping({});
    setDisplayMapping({});
    setSelectedSlots([]);
    setInitialMappingLoaded(false);
    setSelectedDate(newDate);
    setBookingDataState({ centerId, date: newDate });
  };

  useEffect(() => {
    if (!centerId || !selectedDate || !userId || courts.length === 0) return;

    const handleUpdateBookings = async (data) => {
      console.log("Received WebSocket update in BookingSchedule:", data);

      if (data && data[selectedDate]) {
        const mappingFromSocket = data[selectedDate];
        console.log("Mapping from WebSocket:", mappingFromSocket);

        let mappingCache = {};
        try {
          mappingCache = await getMyPendingTimeslots(centerId, selectedDate);
          console.log("Fetched myPending mapping from cache after WebSocket update:", mappingCache);
        } catch (error) {
          console.error("Error fetching myPending mapping after WebSocket update:", error);
        }

        const completeMapping = {};
        courts.forEach((court) => {
          const courtId = court._id;
          const socketSlots = mappingFromSocket[courtId] || Array(slotCount).fill("trống");
          const cacheSlots = mappingCache[courtId] || Array(slotCount).fill("trống");
          const mergedSlots = socketSlots.map((slot, idx) => {
            if (cacheSlots[idx] !== "trống") {
              return cacheSlots[idx];
            }
            return slot;
          });
          completeMapping[courtId] = mergedSlots;
        });

        setBaseMapping(completeMapping);
        const finalMapping = applyLockedLogic(completeMapping, selectedDate, userId);
        console.log("Final mapping after WebSocket update:", finalMapping);

        setDisplayMapping(finalMapping);

        const newSelectedSlots = [];
        Object.keys(finalMapping).forEach((courtId) => {
          finalMapping[courtId].forEach((slot, idx) => {
            if (slot.status === "myPending") {
              newSelectedSlots.push({ courtId, slotVal: times[idx], price: 0 });
            }
          });
        });

        setSelectedSlots((prev) => {
          const updatedSlots = [...newSelectedSlots];
          prev.forEach((slot) => {
            if (updatedSlots.some((s) => s.courtId === slot.courtId && s.slotVal === slot.slotVal)) {
              updatedSlots.find((s) => s.courtId === slot.courtId && s.slotVal === slot.slotVal).price = slot.price;
            }
          });
          console.log("Updated selectedSlots after WebSocket update:", updatedSlots);
          return updatedSlots;
        });
      } else {
        console.log(`No mapping found for date ${selectedDate} in WebSocket data, fetching from API...`);
        await fetchMappings();
      }
    };

    socket.on("updateBookings", handleUpdateBookings);

    socket.emit("adminSelectedDates", { centerId, dates: [selectedDate] });

    return () => {
      socket.off("updateBookings", handleUpdateBookings);
    };
  }, [centerId, selectedDate, userId, courts]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayMapping(applyLockedLogic(baseMapping, selectedDate, userId));
    }, 60000);
    return () => clearInterval(interval);
  }, [baseMapping, selectedDate, userId]);

  const toggleBookingStatus = async (rowIndex, colIndex) => {
    if (!initialMappingLoaded) return;
    const court = courts[rowIndex];
    if (!court) return;
    const courtId = court._id;
    const slotVal = times[colIndex];
    const todayStr = new Date().toLocaleDateString("en-CA");
    if (selectedDate === todayStr) {
      const now = new Date();
      if (slotVal < now.getHours() || (slotVal === now.getHours() && now.getMinutes() > 0)) {
        return;
      }
    }

    const currentStatus = displayMapping[courtId][colIndex];
    if (currentStatus !== "trống" && currentStatus.status !== "myPending") {
      return;
    }

    try {
      await togglePendingTimeslot({ name, userId, centerId, date: selectedDate, courtId, timeslot: slotVal, ttl: 60 });

      const mappingDB = await getPendingMapping(centerId, selectedDate);
      const mappingCache = await getMyPendingTimeslots(centerId, selectedDate);

      const completeMapping = {};
      courts.forEach((court) => {
        const courtId = court._id;
        const dbSlots = mappingDB[courtId] || Array(slotCount).fill("trống");
        const cacheSlots = mappingCache[courtId] || Array(slotCount).fill("trống");
        const mergedSlots = dbSlots.map((slot, idx) => {
          if (cacheSlots[idx] !== "trống") {
            return cacheSlots[idx];
          }
          return slot;
        });
        completeMapping[courtId] = mergedSlots;
      });

      setBaseMapping(completeMapping);
      const finalMapping = applyLockedLogic(completeMapping, selectedDate, userId);
      setDisplayMapping(finalMapping);

      const newSelectedSlots = [];
      Object.keys(finalMapping).forEach((courtId) => {
        finalMapping[courtId].forEach((slot, idx) => {
          if (slot.status === "myPending") {
            newSelectedSlots.push({ courtId, slotVal: times[idx], price: 0 });
          }
        });
      });

      setSelectedSlots((prev) => {
        const updatedSlots = [...newSelectedSlots];
        prev.forEach((slot) => {
          if (updatedSlots.some((s) => s.courtId === slot.courtId && s.slotVal === slot.slotVal)) {
            updatedSlots.find((s) => s.courtId === slot.courtId && s.slotVal === slot.slotVal).price = slot.price;
          }
        });
        return updatedSlots;
      });

      if (newSelectedSlots.some((s) => s.courtId === courtId && s.slotVal === slotVal)) {
        try {
          const response = await getPriceForTimeslot({ centerId, date: selectedDate, timeslot: slotVal });
          if (response.success) {
            setSelectedSlots((prev) =>
              prev.map((s) =>
                s.courtId === courtId && s.slotVal === slotVal ? { ...s, price: response.price } : s
              )
            );
          } else {
            setSelectedSlots((prev) =>
              prev.map((s) =>
                s.courtId === courtId && s.slotVal === slotVal ? { ...s, price: 100000 } : s
              )
            );
          }
        } catch (error) {
          setSelectedSlots((prev) =>
            prev.map((s) =>
              s.courtId === courtId && s.slotVal === slotVal ? { ...s, price: 100000 } : s
            )
          );
        }
      }
    } catch (error) {
      console.error("Lỗi khi toggle timeslot:", error);
    }
  };

  function groupSelectedSlots(selectedSlots, courts) {
    const groups = [];
    const slotsByCourt = {};
    selectedSlots.forEach(({ courtId, slotVal }) => {
      if (!slotsByCourt[courtId]) slotsByCourt[courtId] = [];
      slotsByCourt[courtId].push(slotVal);
    });
    Object.keys(slotsByCourt).forEach((courtId) => {
      const sorted = slotsByCourt[courtId].sort((a, b) => a - b);
      let group = [sorted[0]];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
          group.push(sorted[i]);
        } else {
          groups.push({ courtId, slots: group });
          group = [sorted[i]];
        }
      }
      if (group.length) groups.push({ courtId, slots: group });
    });
    return groups.map(({ courtId, slots }) => {
      const courtObj = courts.find((c) => c._id === courtId);
      const courtName = courtObj ? courtObj.name : `Court ${courtId}`;
      return slots.length === 1
        ? { courtName, timeStr: formatSlot(slots[0]) }
        : { courtName, timeStr: `${formatSlot(slots[0])} - ${formatSlot(slots[slots.length - 1] + 1)}` };
    });
  }

  const handleConfirm = () => {
    console.log("Opening ModalConfirmation, showModal set to true");
    setShowModal(true);
  };

  const handleModalAction = async (action) => {
    console.log("Modal action:", action);
    if (action === "confirm") {
      try {
        const { success, booking } = await confirmBookingToDB({
          userId,
          centerId,
          date: selectedDate,
          totalAmount,
          name
        });
        if (success) {
          localStorage.setItem("bookingExpiresAt", booking.expiresAt);
          localStorage.setItem("bookingId", booking._id);
          localStorage.setItem("userId", userId);
          localStorage.setItem("centerId", centerId);
          localStorage.setItem("selectedDate", selectedDate);
          localStorage.setItem("totalAmount", totalAmount);

          const slotGroups = groupSelectedSlots(selectedSlots, courts);
          localStorage.setItem("slotGroups", JSON.stringify(slotGroups));
          const updatedUserData = await fetchUserInfo();
          setUser(updatedUserData.user);
          alert(`Booking pending đã được lưu vào DB.\nBooking ID: ${booking._id}`);
          navigate("/payment");
        }
      } catch (error) {
          console.error("Lỗi khi xác nhận booking:", error);
          alert("Lỗi khi xác nhận booking: " + error.message);
      }
    } else if (action === "cancel") {
      setShowModal(false);
    }
  };

  const formatMoney = (val) => val.toLocaleString("vi-VN") + " đ";
  const handleGoBack = () => {
    navigate("/centers");
  };
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const days = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    const dayOfWeek = days[date.getDay()];
    return `${dayOfWeek}, ${day}/${month}/${year}`;
  };

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
          <div className="date-price-controls">
            {/* Added data-testid to the wrapper */}
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
            <span>Tiếp tục</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      )}

      {showModal && (
        <ModalConfirmation
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