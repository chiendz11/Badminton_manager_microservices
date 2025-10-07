import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import BookingTable from "../components/BookingTable";
import Legend from "../components/legend";
import { fetchFullMapping, getAllCenters, getCourtsByCenter } from "../apis/centerStatus";
import { FaCalendarAlt, FaHome, FaArrowLeft } from "react-icons/fa";
import socket from "../socket"; // Đường dẫn tới file socket.js

const times = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const slotCount = times.length - 1;

// Hàm chuẩn hóa ngày theo múi giờ địa phương
const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Tháng bắt đầu từ 0
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Function to apply locked logic for past timeslots
function applyLockedLogic(mapping, selectedDate, courts) {
  const updatedMapping = JSON.parse(JSON.stringify(mapping));
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  console.log(`Áp dụng logic khóa cho ngày ${selectedDate}, hôm nay là ${todayStr}, thời gian hiện tại: ${currentHour}:${currentMinute}`);

  courts.forEach((court) => {
    const courtId = court._id;
    const arr = updatedMapping[courtId] || Array(slotCount).fill("trống");
    updatedMapping[courtId] = arr.map((slot, i) => {
      const slotHour = times[i];
      if (selectedDate === todayStr) {
        if (slotHour < currentHour || (slotHour === currentHour && currentMinute > 0)) {
          return "locked";
        }
      }
      return slot; // Giữ nguyên đối tượng hoặc chuỗi gốc
    });
  });
  console.log(`Mapping sau khi áp dụng logic khóa:`, updatedMapping);
  return updatedMapping;
}

const CourtStatusPage = () => {
  const navigate = useNavigate();
  const [tempSelectedDates, setTempSelectedDates] = useState([new Date()]);
  const [displayDates, setDisplayDates] = useState([new Date()]);
  const [centers, setCenters] = useState([]);
  const [courts, setCourts] = useState([]);
  const [centerId, setCenterId] = useState("");
  const [bookingData, setBookingData] = useState({});
  const [error, setError] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const centersData = await getAllCenters();
        console.log("Fetched centers:", centersData);
        setCenters(centersData);
        if (centersData.length > 0) {
          setCenterId(centersData[0]._id);
        }
      } catch (error) {
        console.error("Lỗi khi lấy danh sách trung tâm:", error);
        setError("Không thể lấy danh sách trung tâm");
      }
    };

    fetchCenters();
  }, []);

  useEffect(() => {
    const fetchCourts = async () => {
      if (!centerId) {
        setCourts([]);
        return;
      }

      try {
        const courtsData = await getCourtsByCenter(centerId);
        console.log("Fetched courts for centerId", centerId, ":", courtsData);
        setCourts(courtsData);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách sân:", error);
        setError("Không thể lấy danh sách sân");
        setCourts([]);
      }
    };

    fetchCourts();
  }, [centerId]);

  useEffect(() => {
    if (centerId) {
      const dateStrings = displayDates.map(date => getLocalDateString(date));
      socket.emit("adminSelectedDates", { centerId, dates: dateStrings });
    }
  }, [displayDates, centerId]);

  useEffect(() => {
    const fetchBookingData = async () => {
      if (!centerId || courts.length === 0) return;

      const newBookingData = {};
      for (const date of displayDates) {
        const dateStr = getLocalDateString(date);
        console.log(`Fetching booking data for date: ${dateStr}`);
        try {
          const mapping = await fetchFullMapping(centerId, dateStr);
          console.log(`Raw fetched booking data for ${dateStr}:`, mapping);

          const completeMapping = {};
          courts.forEach((court) => {
            completeMapping[court._id] = mapping[court._id] || Array(slotCount).fill("trống");
          });

          const finalMapping = applyLockedLogic(completeMapping, dateStr, courts);
          console.log(`Final mapping for ${dateStr}:`, finalMapping);
          newBookingData[dateStr] = finalMapping;
          setError(null);
        } catch (error) {
          console.error(`Error fetching booking data for ${dateStr}:`, error);
          setError(`Không thể lấy dữ liệu cho ngày ${dateStr}: ${error.message}`);
        }
      }
      setBookingData(newBookingData);
    };

    if (displayDates.length > 0) {
      fetchBookingData();
    } else {
      setBookingData({});
    }
  }, [displayDates, centerId, courts]);

  // WebSocket listener để xử lý updateBookings cho nhiều ngày
  useEffect(() => {
    const handleUpdateBookings = async (data) => {
      if (!data || typeof data !== "object") {
        console.error("Dữ liệu WebSocket không hợp lệ:", data);
        return;
      }

      console.log("Received WebSocket update:", data);

      // Danh sách các ngày cần cập nhật
      const dateStrings = displayDates.map(date => getLocalDateString(date));
      const newBookingData = { ...bookingData };

      // Cập nhật dữ liệu từ WebSocket cho các ngày có trong data
      Object.keys(data).forEach((date) => {
        if (dateStrings.includes(date)) {
          const mapping = data[date];
          if (!mapping || typeof mapping !== "object") {
            console.error(`Dữ liệu không hợp lệ cho ngày ${date}:`, mapping);
            return;
          }

          const completeMapping = {};
          courts.forEach((court) => {
            completeMapping[court._id] = mapping[court._id] || Array(slotCount).fill("trống");
          });
          const finalMapping = applyLockedLogic(completeMapping, date, courts);
          newBookingData[date] = finalMapping;
          console.log(`Updated booking data for ${date} from WebSocket:`, finalMapping);
        }
      });

      // Kiểm tra xem có ngày nào trong displayDates bị thiếu dữ liệu không
      const missingDates = dateStrings.filter(date => !data[date]);
      if (missingDates.length > 0) {
        console.log(`Missing data for dates: ${missingDates.join(", ")}. Fetching from API...`);
        for (const date of missingDates) {
          try {
            const mapping = await fetchFullMapping(centerId, date);
            const completeMapping = {};
            courts.forEach((court) => {
              completeMapping[court._id] = mapping[court._id] || Array(slotCount).fill("trống");
            });
            const finalMapping = applyLockedLogic(completeMapping, date, courts);
            newBookingData[date] = finalMapping;
            console.log(`Fetched and updated booking data for ${date} from API:`, finalMapping);
          } catch (error) {
            console.error(`Error fetching booking data for ${date} from API:`, error);
            setError(`Không thể lấy dữ liệu cho ngày ${date}: ${error.message}`);
          }
        }
      }

      setBookingData(newBookingData);
    };

    socket.on("updateBookings", handleUpdateBookings);

    return () => {
      socket.off("updateBookings", handleUpdateBookings);
    };
  }, [displayDates, courts, centerId, bookingData]);

  const handleDateChange = (dates) => {
    console.log("Selected dates from DatePicker:", dates);
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
      const sortedDates = [...tempSelectedDates].sort((a, b) => a - b);
      console.log("Dates after clicking Okay:", sortedDates);
      setDisplayDates(sortedDates);
      setIsCalendarOpen(false);
    } else {
      setDisplayDates([]);
      setIsCalendarOpen(false);
    }
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    setIsCalendarOpen(false);
  };

  const handleClickOutside = () => {
    if (tempSelectedDates.length > 0) {
      const sortedDates = [...tempSelectedDates].sort((a, b) => a - b);
      console.log("Dates after clicking outside:", sortedDates);
      setDisplayDates(sortedDates);
    } else {
      setDisplayDates([]);
    }
    setIsCalendarOpen(false);
  };

  const handleCenterChange = (e) => {
    setCenterId(e.target.value);
    setBookingData({});
    setTempSelectedDates([new Date()]);
    setDisplayDates([new Date()]);
    setIsCalendarOpen(false);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const formatDisplayDate = (date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayOfWeek = days[date.getDay()];
    return `${dayOfWeek}, ${day}/${month}/${year}`;
  };

  const dateTables = useMemo(() => {
    return displayDates.map((date) => {
      const dateStr = getLocalDateString(date);
      return (
        <div
          key={dateStr}
          className="mb-4 bg-green-100 p-0 rounded-md border border-gray-300"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
            <div className="w-full sm:w-40 text-x font-medium text-black">
              {formatDisplayDate(date)}
            </div>
            <div className="w-full">
              {courts.length > 0 ? (
                <BookingTable
                  courts={courts}
                  bookingData={bookingData[dateStr] || {}}
                  toggleBookingStatus={() => {}}
                  times={times}
                  slotCount={slotCount}
                  currentUserId={null}
                />
              ) : (
                <p className="text-gray-600 text-sm">Không có sân nào để hiển thị.</p>
              )}
            </div>
          </div>
        </div>
      );
    });
  }, [displayDates, bookingData, courts]);

  return (
    <div className="bg-green-800 font-inter min-h-screen">
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}
      </style>

      <div className="w-full py-4">
        <div className="flex justify-between items-center px-4 mb-4">
          <button onClick={handleBackClick} className="text-white hover:text-gray-300">
            <FaArrowLeft className="text-2xl" />
          </button>
          <h1 className="text-2xl font-bold text-white">Trạng thái sân</h1>
          <div className="w-6"></div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-4">
          <div className="flex items-center">
            <label className="mr-2 font-semibold text-white">Trung tâm:</label>
            <div className="relative border border-gray-300 rounded-md bg-white">
              <FaHome className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-600" />
              <select
                value={centerId}
                onChange={handleCenterChange}
                className="border-0 p-2 pl-8 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium text-gray-800 w-full"
                disabled={centers.length === 0}
              >
                {centers.length === 0 ? (
                  <option value="">Không có trung tâm nào</option>
                ) : (
                  centers.map((center) => (
                    <option key={center._id} value={center._id}>
                      {center.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center">
              <label className="mr-2 font-semibold text-white">Chọn ngày:</label>
              <div
                className="relative border border-gray-300 rounded-md bg-white cursor-pointer h-10"
                onClick={() => setIsCalendarOpen(true)}
              >
                <FaCalendarAlt className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-600 z-10" />
                <DatePicker
                  onChange={handleDateChange}
                  selectsMultiple
                  selectedDates={tempSelectedDates}
                  minDate={new Date()}
                  dateFormat="dd/MM/yyyy"
                  className="border-0 p-2 pl-8 rounded-md focus:outline-none focus:ring-0 text-sm font-medium text-gray-800 pointer-events-none w-full h-full"
                  placeholderText="Chọn ngày (tối đa 7 ngày)"
                  popperPlacement="bottom-end"
                  open={isCalendarOpen}
                  onClickOutside={handleClickOutside}
                >
                  <div className="p-2 flex justify-end gap-2 pointer-events-auto">
                    <button
                      onClick={handleOkayClick}
                      className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 text-sm font-medium"
                    >
                      Okay
                    </button>
                    <button
                      onClick={handleCloseClick}
                      className="bg-gray-500 text-white px-4 py-1 rounded hover:bg-gray-600 text-sm font-medium"
                    >
                      Close
                    </button>
                  </div>
                </DatePicker>
              </div>
            </div>
          </div>

          <div className="flex items-center text-white">
            <Legend />
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-4 p-2 bg-red-100 text-red-700 rounded text-sm font-medium">
          {error}
        </div>
      )}

      {displayDates.length === 0 ? (
        <p className="text-gray-200 text-sm font-medium px-4">Không có ngày nào được chọn.</p>
      ) : (
        <div className="px-4">{dateTables}</div>
      )}
    </div>
  );
};

export default CourtStatusPage;