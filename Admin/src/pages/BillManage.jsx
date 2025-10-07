import React, { useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { getAllBills, updateBillStatus } from "../apis/billManaging";
import BillImage from "../components/BillImages";
import {
  ArrowLeftIcon,
  PlusIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const AdminBillList = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [centers, setCenters] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      try {
        const billsData = await getAllBills();
        if (!Array.isArray(billsData)) {
          throw new Error("Dữ liệu trả về không phải là mảng");
        }

        if (billsData.length === 0) {
          toast.error("Không có dữ liệu bill để hiển thị");
        }

        setBills(billsData);

        const uniqueCenters = [...new Set(billsData.map((bill) => bill.centerName))]
          .filter(name => name) // Loại bỏ giá trị null/undefined
          .map(name => ({ name }));
        setCenters(uniqueCenters);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách bill:", error.message);
        toast.error(error.message || "Lỗi khi lấy danh sách bill");
        setBills([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  useEffect(() => {
    let result = [...bills];

    // Lọc theo loại đơn
    if (activeTab === "daily") {
      result = result.filter((bill) => bill.type === "daily");
    } else if (activeTab === "fixed") {
      result = result.filter((bill) => bill.type === "fixed");
    }

    // Lọc theo trạng thái nếu có chọn
    if (selectedStatus) {
      result = result.filter((bill) => bill.status === selectedStatus);
    }

    // Lọc theo trung tâm
    if (selectedCenter) {
      result = result.filter((bill) => bill.centerName === selectedCenter);
    }

    // Lọc theo ngày
    if (selectedDate) {
      result = result.filter((bill) => {
        const billDate = new Date(bill.createdAt);
        const selected = new Date(selectedDate);
        // Chuẩn hóa múi giờ
        billDate.setHours(0, 0, 0, 0);
        selected.setHours(0, 0, 0, 0);
        return billDate.getTime() === selected.getTime();
      });
    }

    setFilteredBills(result);
  }, [bills, activeTab, selectedCenter, selectedDate, selectedStatus]);

  const handleApproveBill = (bill) => {
    setSelectedBill(bill);
    setConfirmAction("approve");
    setIsConfirmModalOpen(true);
  };

  const handleCancelBill = (bill) => {
    setSelectedBill(bill);
    setConfirmAction("cancel");
    setIsConfirmModalOpen(true);
  };

  const confirmActionHandler = async () => {
    if (!selectedBill || !confirmAction) return;

    // Với fixed bookings, _id là mảng, lấy _id đầu tiên
    const billId = Array.isArray(selectedBill._id) ? selectedBill._id[0] : selectedBill._id;

    if (!billId) {
      toast.error(
        confirmAction === "approve"
          ? "Duyệt đơn hàng thất bại: Không tìm thấy ID của đơn hàng!"
          : "Hủy đơn hàng thất bại: Không tìm thấy ID của đơn hàng!"
      );
      setIsConfirmModalOpen(false);
      return;
    }

    try {
      const updatedBill = await updateBillStatus(
        billId,
        confirmAction === "approve" ? "paid" : "cancelled"
      );
      setBills(bills.map((b) => {
        const bId = Array.isArray(b._id) ? b._id[0] : b._id;
        return bId === updatedBill._id ? updatedBill : b;
      }));
      if (confirmAction === "approve") {
        setSelectedBill(updatedBill);
        toast.success("Đã duyệt đơn hàng thành công!");
      } else {
        setIsModalOpen(false);
        toast.success("Đã hủy đơn hàng thành công!");
      }
    } catch (error) {
      console.error(
        confirmAction === "approve" ? "Lỗi khi duyệt đơn hàng:" : "Lỗi khi hủy đơn hàng:",
        error
      );
      toast.error(
        confirmAction === "approve"
          ? `Duyệt đơn hàng thất bại: ${error.message || "Lỗi không xác định"}!`
          : `Hủy đơn hàng thất bại: ${error.message || "Lỗi không xác định"}!`
      );
    } finally {
      setIsConfirmModalOpen(false);
      setConfirmAction(null);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCreateBooking = () => {
    navigate("/create-fixed-booking");
  };

  const handleBillClick = (bill) => {
    setSelectedBill(bill);
    setIsModalOpen(true);
  };

  const handleImageClick = (imageUrl) => {
    if (!imageUrl || !imageUrl.startsWith("data:image/")) {
      toast.error("Ảnh không hợp lệ!");
      return;
    }
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Chưa thanh toán";
      case "processing":
        return "Chờ xử lý";
      case "paid":
        return "Đã thanh toán";
      case "cancelled":
        return "Đã hủy";
      default:
        return status || "Không xác định";
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-600 text-white";
      case "pending":
        return "bg-yellow-500 text-white";
      case "processing":
        return "bg-orange-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getBillTypeText = (type) => {
    switch (type) {
      case "daily":
        return "Đơn ngày";
      case "fixed":
        return "Đơn cố định";
      default:
        return type || "Không xác định";
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen w-full font-inter">
      <div className="bg-white w-full shadow-md overflow-hidden">
        <div className="bg-emerald-700 text-white flex items-center p-3">
          <button onClick={handleBack} className="mr-2">
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold flex-1 text-center">Danh sách đơn</h1>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 gap-4 bg-white border-b">
          <div className="flex items-center w-full sm:w-1/2">
            <label htmlFor="centerFilter" className="text-sm font-medium text-gray-700 mr-2">
              Trung tâm:
            </label>
            <div className="relative flex-1 min-w-[200px] cursor-pointer">
              <select
                id="centerFilter"
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className="border border-gray-300 rounded-md p-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
              >
                <option value="">Tất cả</option>
                {centers.map((center, index) => (
                  <option key={index} value={center.name}>
                    {center.name}
                  </option>
                ))}
              </select>
              <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-center w-full sm:w-1/2">
            <label className="text-sm font-medium text-gray-700 mr-2">Chọn ngày:</label>
            <div className="relative flex-1 min-w-[200px] cursor-pointer">
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="Chọn ngày"
                className="border border-emerald-500 rounded-md p-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full bg-emerald-50 cursor-pointer caret-transparent"
                onKeyDown={(e) => e.preventDefault()}
              />
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {(activeTab === "daily" || activeTab === "all") && (
          <div className="flex items-center px-4 py-3 bg-white border-b">
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 mr-2">
              Trạng thái:
            </label>
            <div className="relative flex-1 min-w-[200px] cursor-pointer">
              <select
                id="statusFilter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md p-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
              >
                <option value="">Tất cả</option>
                <option value="processing">Đang chờ duyệt</option>
                <option value="paid">Đã hoàn thành</option>
                <option value="pending">Chưa thanh toán</option>
                <option value="cancelled">Đã hủy</option>
              </select>
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-500" />
            </div>
          </div>
        )}

        <div className="flex justify-around bg-white px-3 py-2 border-b text-sm font-semibold">
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex flex-col items-center relative ${
              activeTab === "daily"
                ? "text-emerald-600 font-bold border-b-2 border-emerald-600"
                : "text-gray-600 hover:text-emerald-500"
            }`}
          >
            <div>Đơn ngày</div>
          </button>
          <button
            onClick={() => setActiveTab("fixed")}
            className={`flex flex-col items-center relative ${
              activeTab === "fixed"
                ? "text-emerald-600 font-bold border-b-2 border-emerald-600"
                : "text-gray-600 hover:text-emerald-500"
            }`}
          >
            <div>Đơn cố định</div>
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex flex-col items-center relative ${
              activeTab === "all"
                ? "text-emerald-600 font-bold border-b-2 border-emerald-600"
                : "text-gray-600 hover:text-emerald-500"
            }`}
          >
            <div>Tất cả</div>
          </button>
        </div>

        <div className="bg-white min-h-[200px]">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Đang tải dữ liệu...</div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-4 text-gray-500 italic">Không tìm thấy đơn</div>
          ) : (
            filteredBills.map((bill) => {
              const billId = Array.isArray(bill._id) ? bill._id[0] : bill._id;
              return (
                <div
                  key={billId}
                  className="border-b p-3 cursor-pointer hover:bg-gray-50 flex items-start space-x-3"
                  onClick={() => handleBillClick(bill)}
                >
                  <div className="flex-1">
                    <div className="flex space-x-2 mb-1">
                      {bill.status && (
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusBadgeClass(bill.status)}`}
                        >
                          {getStatusText(bill.status)}
                        </span>
                      )}
                      {bill.type && (
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-semibold text-white bg-blue-500`}
                        >
                          {getBillTypeText(bill.type)}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-gray-800">{bill.userName || "N/A"}</div>
                    <div className="text-sm text-gray-600">Mã đơn: {bill.bookingCode || "N/A"}</div>
                    <div className="text-sm text-gray-600">
                      Chi tiết: ({new Date(bill.createdAt).toLocaleDateString("vi-VN")}); {bill.courtTime || "N/A"}
                    </div>
                    <div className="text-sm text-gray-600">
                      Thời gian đến chơi:{" "}
                      {bill.type === "fixed" ? (
                        <>
                          Từ {new Date(bill.startDate).toLocaleDateString("vi-VN")} đến{" "}
                          {new Date(bill.endDate).toLocaleDateString("vi-VN")}
                        </>
                      ) : (
                        new Date(bill.date).toLocaleDateString("vi-VN")
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="fixed bottom-4 right-4">
          <button
            onClick={handleCreateBooking}
            className="bg-yellow-500 text-white rounded-full p-3 flex items-center space-x-2 shadow-lg"
          >
            <PlusIcon className="h-6 w-6" />
            <span>Tạo lịch đặt</span>
          </button>
        </div>
      </div>

      {/* Modal chi tiết đơn hàng */}
      {isModalOpen && selectedBill && (
        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="fixed inset-0 bg-black/30" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white p-6 rounded-lg max-w-lg w-full">
              <Dialog.Title className="text-lg font-semibold text-gray-800">Chi tiết đơn</Dialog.Title>
              <div className="mt-4 space-y-2">
                <div>
                  <strong>Tên:</strong> {selectedBill.userName || "N/A"}
                </div>
                <div>
                  <strong>Mã đơn:</strong> {selectedBill.bookingCode || "N/A"}
                </div>
                <div>
                  <strong>Chi tiết sân:</strong> {selectedBill.courtTime || "N/A"}
                </div>
                <div>
                  <strong>Trạng thái:</strong>{" "}
                  <span
                    className={`px-2 py-1 rounded-md text-xs ${getStatusBadgeClass(selectedBill.status)}`}
                  >
                    {getStatusText(selectedBill.status)}
                  </span>
                </div>
                <div>
                  <strong>Loại đơn:</strong>{" "}
                  <span
                    className={`px-2 py-1 rounded-md text-xs text-white bg-blue-500`}
                  >
                    {getBillTypeText(selectedBill.type)}
                  </span>
                </div>
                <div>
                  <strong>Trung tâm:</strong> {selectedBill.centerName || "N/A"}
                </div>
                <div>
                  <strong>Thời gian đến chơi:</strong>{" "}
                  {selectedBill.type === "fixed" ? (
                    <>
                      Từ {new Date(selectedBill.startDate).toLocaleDateString("vi-VN")} đến{" "}
                      {new Date(selectedBill.endDate).toLocaleDateString("vi-VN")}
                    </>
                  ) : (
                    new Date(selectedBill.date).toLocaleDateString("vi-VN")
                  )}
                </div>
                <div>
                  <strong>Thời gian tạo:</strong>{" "}
                  {new Date(selectedBill.createdAt).toLocaleDateString("vi-VN")}
                </div>
                <div>
                  <strong>Ghi chú:</strong> {selectedBill.note || "Không có ghi chú"}
                </div>
                <div>
                  <strong>Tổng giá tiền:</strong> {(selectedBill.totalAmount || 0).toLocaleString("vi-VN")} VNĐ
                </div>
                <div>
                  <strong>Ảnh thanh toán:</strong>{" "}
                  {selectedBill.paymentImage ? (
                    <BillImage bill={selectedBill} onImageClick={handleImageClick} />
                  ) : (
                    "Không có ảnh"
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                {selectedBill.status === "processing" && (
                  <button
                    onClick={() => handleApproveBill(selectedBill)}
                    className="bg-green-500 text-white px-4 py-2 rounded-md"
                  >
                    Duyệt
                  </button>
                )}
                {(selectedBill.status === "pending" || selectedBill.status === "processing") && (
                  <button
                    onClick={() => handleCancelBill(selectedBill)}
                    className="bg-red-500 text-white px-4 py-2 rounded-md"
                  >
                    Hủy
                  </button>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                >
                  Đóng
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Modal phóng to ảnh */}
      {isImageModalOpen && selectedImage && (
        <Dialog open={isImageModalOpen} onClose={() => setIsImageModalOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="relative bg-white p-4 rounded-lg max-w-4xl w-full">
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="absolute top-2 right-2 text-gray-700 hover:text-gray-900"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <img
                src={selectedImage}
                alt="Enlarged payment confirmation"
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
                  height: "auto",
                  borderRadius: "8px",
                }}
              />
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Modal xác nhận */}
      <Transition show={isConfirmModalOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsConfirmModalOpen(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {confirmAction === "approve" ? "Xác nhận duyệt đơn hàng" : "Xác nhận hủy đơn hàng"}
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {confirmAction === "approve"
                        ? "Bạn có chắc chắn muốn duyệt đơn hàng này không? Hành động này không thể hoàn tác."
                        : "Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác."}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setIsConfirmModalOpen(false)}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        confirmAction === "approve"
                          ? "bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
                          : "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
                      }`}
                      onClick={confirmActionHandler}
                    >
                      {confirmAction === "approve" ? "Duyệt" : "Hủy"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );  
};

export default AdminBillList;