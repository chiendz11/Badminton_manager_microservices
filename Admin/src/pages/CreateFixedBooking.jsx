import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchUsers, getAllCenters, getAvailableCourts, createFixedBookings } from "../apis/billManaging";
import { ArrowLeftIcon, CalendarIcon, UserIcon, XMarkIcon, BuildingOffice2Icon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CreateFixedBooking = () => {
    const navigate = useNavigate();
    const [centers, setCenters] = useState([]);
    const [availableCourtsByDay, setAvailableCourtsByDay] = useState({});
    const [selectedCenter, setSelectedCenter] = useState("");
    const [selectedDays, setSelectedDays] = useState([]);
    const [selectedTimeslots, setSelectedTimeslots] = useState([]);
    const [timeslotsByDay, setTimeslotsByDay] = useState({});
    const [selectedCourtsByDay, setSelectedCourtsByDay] = useState({});
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setUTCHours(0, 0, 0, 0);
        return date;
    });
    const [loadingCenters, setLoadingCenters] = useState(false);
    const [loadingCourts, setLoadingCourts] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [bookingsToCreate, setBookingsToCreate] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [resultModalContent, setResultModalContent] = useState({
        success: true,
        message: "",
    });

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 30);

    const availableTimeslots = Array.from({ length: 19 }, (_, i) => `${i + 5}:00`);

    const daysOfWeek = [
        { value: 1, label: "Thứ 2" },
        { value: 2, label: "Thứ 3" },
        { value: 3, label: "Thứ 4" },
        { value: 4, label: "Thứ 5" },
        { value: 5, label: "Thứ 6" },
        { value: 6, label: "Thứ 7" },
        { value: 0, label: "Chủ nhật" },
    ];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    useEffect(() => {
        const handlePopState = () => {
            navigate("/admin-bill-list", { replace: true });
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [navigate]);

    useEffect(() => {
        const fetchCenters = async () => {
            setLoadingCenters(true);
            try {
                const centersData = await getAllCenters();
                console.log('CreateFixedBooking - Centers fetched:', centersData);
                if (centersData.length === 0) {
                    setResultModalContent({
                        success: false,
                        message: "Không có trung tâm nào để hiển thị!",
                    });
                    setIsResultModalOpen(true);
                }
                setCenters(centersData);
            } catch (error) {
                console.error('CreateFixedBooking - Error fetching centers:', error);
                setResultModalContent({
                    success: false,
                    message: "Không thể lấy danh sách trung tâm!",
                });
                setIsResultModalOpen(true);
                setCenters([]);
            } finally {
                setLoadingCenters(false);
            }
        };
        fetchCenters();
    }, []);

    useEffect(() => {
        if (selectedUser || !searchQuery) {
            setUsers([]);
            setShowDropdown(false);
            return;
        }

        const fetchUsers = async () => {
            try {
                const usersData = await searchUsers(searchQuery);
                console.log('CreateFixedBooking - Users fetched:', usersData);
                setUsers(usersData);
                setShowDropdown(usersData.length > 0);
            } catch (error) {
                console.error('CreateFixedBooking - Error fetching users:', error);
                setResultModalContent({
                    success: false,
                    message: "Không thể tìm kiếm người dùng!",
                });
                setIsResultModalOpen(true);
                setUsers([]);
                setShowDropdown(false);
            }
        };
        fetchUsers();
    }, [searchQuery, selectedUser]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!selectedCenter || selectedDays.length === 0 || selectedTimeslots.length === 0) {
            console.log('CreateFixedBooking - Skipping fetchAvailableCourts due to missing parameters');
            setAvailableCourtsByDay({});
            setSelectedCourtsByDay({});
            return;
        }

        const fetchAvailableCourts = async () => {
            setLoadingCourts(true);
            const normalizedStartDate = new Date(startDate);
            normalizedStartDate.setUTCHours(0, 0, 0, 0);
            console.log('CreateFixedBooking - Fetching available courts with parameters:', {
                centerId: selectedCenter,
                startDate: normalizedStartDate.toISOString(),
                timeslots: selectedTimeslots,
                daysOfWeek: selectedDays
            });
            try {
                const courtsByDay = await getAvailableCourts({
                    centerId: selectedCenter,
                    startDate: normalizedStartDate,
                    timeslots: selectedTimeslots,
                    daysOfWeek: selectedDays,
                });
                console.log('CreateFixedBooking - Available courts received:', courtsByDay);
                setAvailableCourtsByDay(courtsByDay);
                const newCourtsByDay = {};
                selectedDays.forEach((day) => {
                    newCourtsByDay[day] = selectedCourtsByDay[day] || [];
                });
                console.log('CreateFixedBooking - Initialized selectedCourtsByDay:', newCourtsByDay);
                setSelectedCourtsByDay(newCourtsByDay);
            } catch (error) {
                console.error('CreateFixedBooking - Error fetching available courts:', error);
                setResultModalContent({
                    success: false,
                    message: error.message || "Không thể lấy danh sách sân trống!",
                });
                setIsResultModalOpen(true);
                setAvailableCourtsByDay({});
            } finally {
                setLoadingCourts(false);
            }
        };
        fetchAvailableCourts();
    }, [selectedCenter, selectedDays, selectedTimeslots, startDate]);

    useEffect(() => {
        const newTimeslotsByDay = {};
        selectedDays.forEach((day) => {
            newTimeslotsByDay[day] = selectedTimeslots;
        });
        console.log('CreateFixedBooking - Updated timeslotsByDay:', newTimeslotsByDay);
        setTimeslotsByDay(newTimeslotsByDay);
    }, [selectedDays, selectedTimeslots]);

    const handleSelectUser = (user) => {
        console.log('CreateFixedBooking - Selected user:', user);
        setSelectedUser(user);
        setSearchQuery(user.username);
        setShowDropdown(false);
        setUsers([]);
    };

    const handleTimeslotChange = (timeslot) => {
        if (selectedTimeslots.includes(timeslot)) {
            setSelectedTimeslots(selectedTimeslots.filter((t) => t !== timeslot));
        } else {
            setSelectedTimeslots([...selectedTimeslots, timeslot].sort());
        }
        console.log('CreateFixedBooking - Updated selectedTimeslots:', selectedTimeslots);
    };

    const handleDayChange = (day) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter((d) => d !== day));
            setSelectedCourtsByDay((prev) => {
                const newCourts = { ...prev };
                delete newCourts[day];
                console.log('CreateFixedBooking - Removed day from selectedDays:', day, 'New selectedCourtsByDay:', newCourts);
                return newCourts;
            });
        } else {
            setSelectedDays([...selectedDays, day].sort());
            setSelectedCourtsByDay((prev) => {
                const newCourts = { ...prev, [day]: [] };
                console.log('CreateFixedBooking - Added day to selectedDays:', day, 'New selectedCourtsByDay:', newCourts);
                return newCourts;
            });
        }
        console.log('CreateFixedBooking - Updated selectedDays:', selectedDays);
    };

    const handleCourtChange = (day, courtId) => {
        setSelectedCourtsByDay((prev) => {
            const currentCourts = prev[day] || [];
            let newCourts;
            if (currentCourts.includes(courtId)) {
                newCourts = currentCourts.filter((c) => c !== courtId);
            } else {
                newCourts = [...currentCourts, courtId];
            }
            const updatedCourtsByDay = { ...prev, [day]: newCourts };
            console.log('CreateFixedBooking - Updated selectedCourtsByDay:', updatedCourtsByDay);
            return updatedCourtsByDay;
        });
    };

    const handleOpenConfirmModal = () => {
        if (
            !selectedUser ||
            !selectedCenter ||
            selectedDays.length === 0 ||
            selectedTimeslots.length === 0 ||
            Object.values(selectedCourtsByDay).some((courts) => courts.length === 0)
        ) {
            console.log('CreateFixedBooking - Validation failed:', {
                selectedUser,
                selectedCenter,
                selectedDays,
                selectedTimeslots,
                selectedCourtsByDay
            });
            setResultModalContent({
                success: false,
                message: "Vui lòng chọn người dùng, khung giờ, ngày và sân!",
            });
            setIsResultModalOpen(true);
            return;
        }

        const isValidCourts = selectedDays.every((day) =>
            (selectedCourtsByDay[day] || []).every((courtId) =>
                (availableCourtsByDay[day] || []).some((court) => court._id === courtId)
            )
        );
        if (!isValidCourts) {
            console.log('CreateFixedBooking - Invalid courts selected:', selectedCourtsByDay);
            setResultModalContent({
                success: false,
                message: "Một số sân đã chọn không còn trống!",
            });
            setIsResultModalOpen(true);
            return;
        }

        const bookings = [];
        let currentDate = new Date(startDate);
        const todayForValidation = new Date(2025, 3, 16);
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            if (selectedDays.includes(dayOfWeek) && currentDate >= todayForValidation) {
                const timeslots = timeslotsByDay[dayOfWeek] || [];
                const selectedCourts = selectedCourtsByDay[dayOfWeek] || [];
                selectedCourts.forEach((courtId) => {
                    const court = (availableCourtsByDay[dayOfWeek] || []).find((c) => c._id === courtId);
                    bookings.push({
                        date: new Date(currentDate).toISOString(),
                        courtId,
                        courtName: court ? court.name : courtId,
                        timeslots: timeslots.map((slot) => {
                            const [hour] = slot.split(":");
                            return parseInt(hour);
                        }),
                    });
                });
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        console.log('CreateFixedBooking - Bookings to be confirmed:', bookings);
        setBookingsToCreate(bookings);
        setIsModalOpen(true);
    };

    const handleCreateFixedBooking = async () => {
        setLoading(true);
        setIsModalOpen(false);
        try {
            const response = await createFixedBookings({
                userId: selectedUser._id,
                centerId: selectedCenter,
                bookings: bookingsToCreate,
                type: "fixed",
            });
            console.log('CreateFixedBooking - Booking creation response:', response);

            // Tính tổng giá tiền từ response
            const totalAmount = response.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

            // Cập nhật bookingsToCreate với totalAmount
            const updatedBookings = bookingsToCreate.map((booking) => {
                const matchingBooking = response.find((resBooking) =>
                    resBooking.date === booking.date &&
                    resBooking.courts.some((court) => court.courtId === booking.courtId)
                );
                return {
                    ...booking,
                    totalAmount: matchingBooking ? matchingBooking.totalAmount : 0,
                };
            });

            setBookingsToCreate(updatedBookings);

            setResultModalContent({
                success: true,
                message: `Tạo lịch đặt cố định thành công! Tổng giá tiền: ${totalAmount.toLocaleString('vi-VN')} VNĐ`,
            });
            setIsResultModalOpen(true);
        } catch (error) {
            console.error('CreateFixedBooking - Error creating fixed booking:', error);
            setResultModalContent({
                success: false,
                message: error.message || "Lỗi khi tạo lịch đặt cố định!",
            });
            setIsResultModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleResultModalClose = () => {
        setIsResultModalOpen(false);
        if (resultModalContent.success) {
            navigate("/admin-bill-list");
        }
    };

    // Tính tổng giá tiền trong modal xác nhận
    const totalAmount = bookingsToCreate.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

    return (
        <div className="min-h-screen w-full font-sans bg-gradient-to-br from-gray-50 to-gray-200">
            <div className="bg-emerald-600 text-white flex items-center p-4 shadow-lg">
                <button onClick={() => navigate("/admin-bill-list")} className="mr-4 hover:opacity-80 transition-opacity">
                    <ArrowLeftIcon className="h-7 w-7" />
                </button>
                <h1 className="text-2xl font-bold flex-1 text-center">Đặt Lịch Cố Định</h1>
            </div>

            <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-xl shadow-xl p-6 space-y-6">
                    <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-4 lg:space-y-0">
                        <div className="flex-1 relative" ref={dropdownRef}>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Tìm kiếm khách hàng</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tên người dùng, số điện thoại hoặc email"
                                    className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                />
                                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-500" />
                            </div>
                            {showDropdown && (
                                <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-xl">
                                    {users.map((user) => (
                                        <div
                                            key={user._id}
                                            onClick={() => handleSelectUser(user)}
                                            className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center space-x-3 transition-colors"
                                        >
                                            <span className="text-sm font-medium text-gray-800">{user.username}</span>
                                            <span className="text-sm text-gray-500">
                                                ({user.email}, {user.phone_number})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Chọn trung tâm</label>
                            <div className="relative">
                                <select
                                    value={selectedCenter}
                                    onChange={(e) => setSelectedCenter(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                                    disabled={loadingCenters}
                                >
                                    <option value="">Chọn trung tâm</option>
                                    {centers.map((center) => (
                                        <option key={center._id} value={center._id}>
                                            {center.name}
                                        </option>
                                    ))}
                                </select>
                                <BuildingOffice2Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-500" />
                            </div>
                            {loadingCenters && (
                                <p className="text-sm text-gray-500 mt-2">Đang tải danh sách trung tâm...</p>
                            )}
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Ngày bắt đầu</label>
                            <div className="relative">
                                <DatePicker
                                    selected={startDate}
                                    onChange={(date) => {
                                        const normalizedDate = new Date(date);
                                        normalizedDate.setUTCHours(0, 0, 0, 0);
                                        setStartDate(normalizedDate);
                                    }}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Chọn ngày bắt đầu"
                                    className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer caret-transparent"
                                    onKeyDown={(e) => e.preventDefault()}
                                    minDate={today}
                                />
                                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                        {selectedUser && (
                            <div className="flex-1 p-4 bg-emerald-50 rounded-lg">
                                <h3 className="text-sm font-semibold text-emerald-800 mb-2">Thông tin khách hàng</h3>
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Tên người dùng:</span> {selectedUser.username}
                                </p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Số điện thoại:</span> {selectedUser.phone_number}
                                </p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Email:</span> {selectedUser.email}
                                </p>
                            </div>
                        )}

                        <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-sm font-semibold text-gray-800 mb-2">Khoảng thời gian áp dụng</h3>
                            <p className="text-sm text-gray-600">
                                Từ <span className="font-medium">{startDate.toLocaleDateString("vi-VN")}</span> đến{" "}
                                <span className="font-medium">{endDate.toLocaleDateString("vi-VN")}</span>
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Chọn thời gian</label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2 mb-4">
                            {availableTimeslots.map((timeslot) => (
                                <div
                                    key={timeslot}
                                    onClick={() => handleTimeslotChange(timeslot)}
                                    className={`text-center p-2 rounded-lg cursor-pointer border transition-all ${
                                        selectedTimeslots.includes(timeslot)
                                            ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                                            : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-emerald-100"
                                    }`}
                                >
                                    {timeslot}
                                </div>
                            ))}
                        </div>

                        <label className="block text-sm font-semibold text-gray-800 mb-2">Chọn ngày trong tuần</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 mb-4">
                            {daysOfWeek.map((day) => (
                                <div
                                    key={day.value}
                                    onClick={() => handleDayChange(day.value)}
                                    className={`text-center p-2 rounded-lg cursor-pointer border transition-all ${
                                        selectedDays.includes(day.value)
                                            ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                                            : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-emerald-100"
                                    }`}
                                >
                                    {day.label}
                                </div>
                            ))}
                        </div>

                        {selectedDays.length > 0 && selectedTimeslots.length > 0 && (
                            <div className="mt-4">
                                <label className="block text-sm font-semibold text-gray-800 mb-2">Sân trống</label>
                                {loadingCourts ? (
                                    <p className="text-sm text-gray-500">Đang tải danh sách sân trống...</p>
                                ) : (
                                    daysOfWeek
                                        .filter((day) => selectedDays.includes(day.value))
                                        .map((day) => (
                                            <div key={day.value} className="mb-4">
                                                <h4 className="text-sm font-semibold text-gray-800 mb-2">{day.label}</h4>
                                                {(availableCourtsByDay[day.value] || []).length === 0 ? (
                                                    <p className="text-sm text-red-600">
                                                        Không có sân trống cho {day.label} tại các khung giờ đã chọn.
                                                    </p>
                                                ) : (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                                        {(availableCourtsByDay[day.value] || []).map((court) => (
                                                            <div
                                                                key={court._id}
                                                                onClick={() => handleCourtChange(day.value, court._id)}
                                                                className={`text-center p-2 rounded-lg cursor-pointer border transition-all ${
                                                                    (selectedCourtsByDay[day.value] || []).includes(
                                                                        court._id
                                                                    )
                                                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                                                                        : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-emerald-100"
                                                                }`}
                                                            >
                                                                {court.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleOpenConfirmModal}
                        disabled={loading}
                        className={`w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold transition-all ${
                            loading ? "opacity-50 cursor-not-allowed" : "hover:bg-yellow-600 shadow-lg"
                        }`}
                    >
                        {loading ? "Đang xử lý..." : "Đặt trước"}
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Xác nhận đặt cố định</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Bạn đang đặt cố định cho <span className="font-medium">{selectedUser?.username}</span> tại{" "}
                                <span className="font-medium">
                                    {centers.find((c) => c._id === selectedCenter)?.name}
                                </span>
                                .
                            </p>
                            <p className="text-sm text-gray-600">
                                Từ <span className="font-medium">{startDate.toLocaleDateString("vi-VN")}</span> đến{" "}
                                <span className="font-medium">{endDate.toLocaleDateString("vi-VN")}</span>.
                            </p>
                            <h3 className="text-sm font-semibold text-gray-800">Chi tiết đặt sân:</h3>
                            {bookingsToCreate.map((booking, index) => (
                                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium">Ngày:</span>{" "}
                                        {new Date(booking.date).toLocaleDateString("vi-VN")}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium">Sân:</span> {booking.courtName}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium">Khung giờ:</span>{" "}
                                        {booking.timeslots.join(", ")}
                                    </p>
                                </div>
                            ))}
                            <div className="p-3 bg-emerald-50 rounded-lg">
                                <p className="text-sm font-semibold text-emerald-800">
                                    <span className="font-medium">Tổng giá tiền:</span>{" "}
                                    {totalAmount.toLocaleString('vi-VN')} VNĐ
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-3 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateFixedBooking}
                                className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-semibold hover:bg-emerald-600 transition-all"
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isResultModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-center mb-4">
                            {resultModalContent.success ? (
                                <CheckCircleIcon className="h-12 w-12 text-emerald-500" />
                            ) : (
                                <ExclamationCircleIcon className="h-12 w-12 text-red-500" />
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
                            {resultModalContent.success ? "Thành công!" : "Thất bại!"}
                        </h2>
                        <p className="text-sm text-gray-600 text-center mb-6">
                            {resultModalContent.message}
                        </p>
                        <div className="flex justify-center">
                            <button
                                onClick={handleResultModalClose}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                    resultModalContent.success
                                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                        : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                                }`}
                            >
                                {resultModalContent.success ? "Đi đến danh sách hóa đơn" : "Đóng"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateFixedBooking;