import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSellHistories, createSellHistory } from "../apiV2/transaction_service/rest/transaction.api.js";
import { getInventoryList } from "../apiV2/inventory_service/rest/inventory.api.js";

export default function Shop() {
  const navigate = useNavigate();

  // 1. Cấu hình danh sách trung tâm
  const centers = [
    { id: "67ca6e3cfc964efa218ab7d8", name: "Nhà thi đấu quận Thanh Xuân" },
    { id: "67ca6e3cfc964efa218ab7d9", name: "Nhà thi đấu quận Cầu Giấy" },
    { id: "67ca6e3cfc964efa218ab7d7", name: "Nhà thi đấu quận Tây Hồ" },
    { id: "67ca6e3cfc964efa218ab7da", name: "Nhà thi đấu quận Bắc Từ Liêm" },
  ];

  // 2. States quản lý danh sách và bộ lọc
  const [sellHistories, setSellHistories] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");
  const [loading, setLoading] = useState(false);

  // States quản lý Modal & Giỏ hàng
  const [showModal, setShowModal] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [cart, setCart] = useState({}); 
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3. Hàm lấy dữ liệu lịch sử bán hàng
  const fetchHistories = async () => {
    try {
      setLoading(true);
      const res = await getSellHistories({ 
        centerId: selectedCenter, 
        invoiceNumber: searchInvoice 
      });
      setSellHistories(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Lỗi tải lịch sử:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistories();
  }, [selectedCenter, searchInvoice]);

  // 4. Tính tổng doanh thu kỳ lọc
  const totalAmount = useMemo(() => {
    return sellHistories.reduce((sum, h) => sum + (h.totalAmount || 0), 0);
  }, [sellHistories]);

  // 5. Mở Modal & Lấy kho
  const handleOpenModal = async () => {
    if (!selectedCenter) return alert("Vui lòng chọn trung tâm trước khi lập hóa đơn!");
    try {
      const res = await getInventoryList(selectedCenter);
      setInventoryList(res.data?.data || res.data || []);
      setCart({});
      setPaymentMethod("Cash");
      setShowModal(true);
    } catch (err) {
      alert("Lỗi: Không thể lấy danh sách sản phẩm từ kho!");
    }
  };

  // 6. Xử lý gửi dữ liệu thanh toán
  const handleConfirmInvoice = async () => {
    const items = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({ inventoryId: id, quantity: qty }));

    if (items.length === 0) return alert("Vui lòng chọn ít nhất một sản phẩm!");

    try {
      setIsSubmitting(true);
      const payload = {
        centerId: selectedCenter,
        items,
        paymentMethod 
      };

      const res = await createSellHistory(payload);

      if (res.status === 201 || res.status === 200) {
        alert("Thanh toán & Trừ kho thành công!");
        setShowModal(false);
        fetchHistories();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      alert("LỖI: " + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Tính tổng tiền tạm tính trong Modal
  const subTotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = inventoryList.find(p => p._id === id);
      return sum + (item?.price || 0) * qty;
    }, 0);
  }, [cart, inventoryList]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* NÚT QUAY LẠI DASHBOARD */}
        <button 
          onClick={() => navigate("/dashboard")} 
          className="mb-4 flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-xs uppercase tracking-widest"
        >
          <span className="text-lg">←</span> QUAY LẠI DASHBOARD
        </button>
        {/* HEADER - Đã giảm cỡ chữ tiêu đề và nút */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">
              Quản Lý Bán Hàng
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Lịch sử giao dịch xuất kho</p>
          </div>
          <button 
            onClick={handleOpenModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2 text-sm"
          >
            <span>+ TẠO HÓA ĐƠN</span>
          </button>
        </div>

        {/* BỘ LỌC */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chọn trung tâm</label>
            <select 
              className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer text-sm"
              value={selectedCenter}
              onChange={(e) => setSelectedCenter(e.target.value)}
            >
              <option value="">-- Tất cả trung tâm --</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tra cứu hóa đơn</label>
            <input 
              type="text"
              placeholder="Nhập mã INV-..."
              className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
            />
          </div>
        </div>

        {/* BẢNG LỊCH SỬ - Đã giảm cỡ chữ số tiền */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hóa đơn</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sản phẩm xuất</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">PTTT</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-300 animate-pulse">ĐANG TẢI...</td></tr>
              ) : sellHistories.length > 0 ? (
                sellHistories.map(h => (
                  <tr key={h._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-6">
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-[11px]">
                        {h.invoiceNumber}
                      </span>
                    </td>
                    <td className="p-6">
                      {h.items?.map((item, idx) => (
                        <div key={idx} className="text-sm font-bold text-slate-600 mb-1">
                          • {item.inventoryId?.name || "N/A"} <span className="text-slate-300">x{item.quantity}</span>
                        </div>
                      ))}
                    </td>
                    <td className="p-6 text-center">
                      <span className="text-[9px] font-black px-2.5 py-1 bg-slate-100 rounded-md text-slate-500 uppercase">
                        {h.paymentMethod}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <span className="text-lg font-black text-slate-800 tracking-tight italic">
                        {h.totalAmount?.toLocaleString()}₫
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="p-20 text-center text-slate-300 font-bold uppercase italic tracking-widest">Không có dữ liệu</td></tr>
              )}
            </tbody>
            {/* TFOOT - Đã đổi sang màu nhạt (Slate-100) */}
            <tfoot className="bg-slate-100 border-t border-slate-200">
              <tr>
                <td colSpan="3" className="p-8 text-right font-black text-slate-400 uppercase tracking-widest text-[10px]">Tổng doanh thu chọn lọc:</td>
                <td className="p-8 text-right font-black text-indigo-600 text-2xl tracking-tighter italic">
                  {totalAmount.toLocaleString()}₫
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL CHECKOUT - Đã giảm cỡ chữ số tiền tạm tính */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            
            <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic">Xuất Kho Bán Lẻ</h2>
                <p className="text-indigo-500 font-black text-[9px] uppercase tracking-widest mt-1">
                  {centers.find(c => c.id === selectedCenter)?.name}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-300 hover:text-red-500 shadow-sm text-2xl">×</button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sản phẩm & Số lượng</label>
              {inventoryList.map(item => (
                <div key={item._id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                  <div className="flex-1">
                    <div className="font-bold text-slate-700 text-base">{item.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Tồn kho: <span className="text-indigo-500">{item.quantity}</span> | Giá: {item.price?.toLocaleString()}₫
                    </div>
                  </div>
                  <input 
                    type="number" min="0" max={item.quantity}
                    className="w-20 bg-white border-none rounded-xl p-2.5 text-center font-black text-indigo-600 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="0"
                    value={cart[item._id] || ""}
                    onChange={(e) => setCart({...cart, [item._id]: Math.max(0, parseInt(e.target.value) || 0)})}
                  />
                </div>
              ))}

              <div className="pt-6 space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hình thức thanh toán</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "Cash", label: "Tiền mặt", icon: "💵" },
                    { id: "Transfer", label: "Chuyển khoản", icon: "🏦" },
                    { id: "Card", label: "Quẹt thẻ", icon: "💳" }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === m.id 
                        ? "border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md" 
                        : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      }`}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-[9px] font-black uppercase tracking-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t bg-slate-50 flex justify-between items-center gap-6">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tổng tiền tạm tính</span>
                <span className="text-2xl font-black text-slate-900 tracking-tighter italic">
                  {subTotal.toLocaleString()}₫
                </span>
              </div>
              <button 
                onClick={handleConfirmInvoice}
                disabled={isSubmitting}
                className="flex-1 max-w-[180px] bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-100 disabled:bg-slate-300 transition-all active:scale-95 text-sm uppercase"
              >
                {isSubmitting ? "Xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}