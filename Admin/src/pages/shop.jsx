import React, { useState, useEffect, useContext, useMemo } from "react";
import { getSellHistories, createSellHistory } from "../apiV2/transaction_service/rest/transaction.api.js";
import { getInventoryList } from "../apiV2/inventory_service/rest/inventory.api.js";
import { getAllCentersGQL } from "../apiV2/center_service/graphql/center.api";
import { AuthContext } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import { ROLES } from "../constants/roles"; // Import ROLES từ constant

export default function Shop() {
  const { admin } = useContext(AuthContext); // Lấy thông tin user hiện tại
  const [sellHistories, setSellHistories] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(centers[0].id);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Centers
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        setLoading(true);
        const data = await getAllCentersGQL();
        // Map dữ liệu và giữ lại các trường quan trọng để lọc
        const mappedCenters = data.map(c => ({
          id: c.centerId || c._id,
          name: c.name,
          centerManagerId: c.centerManagerId // Quan trọng để lọc quyền
        }));
        setAllCenters(mappedCenters);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách trung tâm:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCenters();
  }, []);

  // 2. Filter Centers based on Role (Logic cốt lõi)
  const myCenters = useMemo(() => {
    // Nếu chưa load xong hoặc không có admin, trả về rỗng
    if (!admin || !allCenters.length) return [];

    // Nếu là SUPER_ADMIN -> Trả về tất cả
    if (admin.role === ROLES.SUPER_ADMIN) {
        return allCenters;
    }

    // Nếu là CENTER_MANAGER -> Lọc theo ID quản lý
    // Lưu ý: userId từ context thường có format 'USER-UUID', cần xử lý giống file mẫu
    const userId = admin.userId.replace("USER-", "");
    
    return allCenters.filter(c => 
        (c.centerManagerId || "").replace("USER-", "") === userId
    );
  }, [allCenters, admin]);

  // 3. Tự động chọn center đầu tiên khi myCenters thay đổi
  useEffect(() => {
      if (myCenters.length > 0) {
          // Nếu selectedCenter hiện tại không nằm trong danh sách được phép (myCenters)
          // hoặc chưa chọn gì -> Chọn cái đầu tiên của myCenters
          const isSelectedValid = myCenters.find(c => c.id === selectedCenter);
          if (!selectedCenter || !isSelectedValid) {
              setSelectedCenter(myCenters[0].id);
          }
      } else {
          setSelectedCenter(""); // Reset nếu không có center nào
      }
  }, [myCenters, selectedCenter]);


  // 4. Fetch Histories & Calculate Total (Giữ nguyên)
  const fetchHistories = async () => {
    try {
      const res = await getSellHistories();
      setSellHistories(res.data.data || []);
    } catch (err) {
      console.error(err);
      // Removed alert to prevent spamming if API fails on load
      console.error("Lỗi khi lấy danh sách hóa đơn.");
    }
  };

  useEffect(() => {
    fetchHistories();
  }, []);

  useEffect(() => {
    const calculateTotal = () => {
      return inventoryList.reduce((total, item) => {
        const quantity = invoiceItems[item._id] || 0;
        return total + (quantity * item.price);
      }, 0);
    };
    setTotalAmount(calculateTotal());
  }, [invoiceItems, inventoryList]);

  // Open modal and fetch inventory
  const handleOpenModal = async () => {
    try {
      const res = await getInventoryList({ centerId: selectedCenter });
      setInventoryList(res.data.data || []);
      setInvoiceItems({});
      setShowModal(true);
    } catch (err) {
      console.error("Inventory fetch error:", err);
      alert("Lỗi khi lấy danh sách kho: " + (err.message || "Unknown error"));
    }
  };

  const handleQuantityChange = (id, value) => {
    const item = inventoryList.find(i => i._id === id);
    if (!item) return;
    
    // Ensure value is handled as a number
    const numValue = Number(value);
    const quantity = Math.max(0, Math.min(numValue, item.quantity || 0));
    
    setInvoiceItems(prev => ({ ...prev, [id]: quantity }));
  };

  const handleSubmit = async () => {
    const items = inventoryList
      .filter(item => invoiceItems[item._id] > 0)
      .map(item => ({
        inventoryId: item._id,
        quantity: invoiceItems[item._id],
        unitPrice: item.price
      }));

    if (items.length === 0) {
      alert("Vui lòng nhập số lượng cho ít nhất 1 sản phẩm.");
      return;
    }

    const payload = {
      invoiceNumber: `INV-${Date.now()}`,
      centerId: selectedCenter,
      items,
      totalAmount,
      paymentMethod,
      customer: { name: customerName, contact: customerContact }
    };

    try {
      await createSellHistory(payload);
      alert("Tạo hóa đơn thành công!");
      setShowModal(false);
      fetchHistories();
      // Reset form
      setCustomerName("");
      setCustomerContact("");
      setInvoiceItems({});
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tạo hóa đơn.");
    }
  };

  // Filter histories Logic (Cập nhật để chỉ hiển thị history của center được phép)
  const filteredHistories = sellHistories.filter(h => {
    const date = new Date(h.createdAt);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Kiểm tra xem history này có thuộc về một trong các center mà user quản lý không
    // (Phòng trường hợp user hack request để xem history của center khác)
    const isAllowedCenter = myCenters.some(c => c.id === h.centerId);

    return isAllowedCenter && 
           (!selectedCenter || h.centerId === selectedCenter) &&
           (!start || date >= start) &&
           (!end || date <= end.setHours(23, 59, 59, 999));
  });

  const getCenterName = id => allCenters.find(c => c.id === id)?.name || "Không xác định"; // Dùng allCenters để lookup name cho chính xác

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Quản lý Bán Hàng</h1>
          <button
            onClick={handleOpenModal}
            className={`px-6 py-2 rounded-lg shadow-sm transition-colors flex items-center text-white ${
                !selectedCenter ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={!selectedCenter}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Tạo Hóa Đơn Mới
          </button>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trung tâm</label>
              <select
                value={selectedCenter}
                onChange={e => setSelectedCenter(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={myCenters.length === 0}
              >
                {myCenters.length === 0 ? (
                    <option value="">Bạn không quản lý trung tâm nào</option>
                ) : (
                    myCenters.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã HĐ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trung Tâm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày Tạo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Tiền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PTTT</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistories.map(h => (
                <tr key={h._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{h.invoiceNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getCenterName(h.centerId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(h.createdAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {h.totalAmount.toLocaleString('vi-VN')}₫
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      {h.paymentMethod}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal (Giữ nguyên phần UI Modal) */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  Tạo Hóa Đơn Mới - {getCenterName(selectedCenter)}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên Khách Hàng</label>
                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Liên Hệ</label>
                    <input type="text" value={customerContact} onChange={e => setCustomerContact(e.target.value)} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phương Thức TT</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500">
                      <option value="Cash">Tiền Mặt</option>
                      <option value="Card">Thẻ</option>
                      <option value="Other">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản Phẩm</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tồn Kho</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn Giá</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số Lượng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {inventoryList.length > 0 ? (
                        inventoryList.map(item => (
                          <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.price.toLocaleString('vi-VN')}₫</td>
                            <td className="px-4 py-3 text-right">
                              <input type="number" min="0" max={item.quantity} value={invoiceItems[item._id] || ""} onChange={e => handleQuantityChange(item._id, e.target.value)} className="w-24 p-1 border rounded-md text-right focus:ring-2 focus:ring-blue-500" />
                            </td>
                          </tr>
                        ))
                      ) : (
                         <tr><td colSpan="4" className="px-4 py-3 text-center text-sm text-gray-500">Kho hàng trống</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-800">Tổng Cộng:</span>
                  <span className="text-2xl font-bold text-blue-600">{totalAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end space-x-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2 text-gray-600 hover:text-gray-800 transition-colors">Hủy Bỏ</button>
                <button onClick={handleSubmit} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">Xác Nhận Hóa Đơn</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}