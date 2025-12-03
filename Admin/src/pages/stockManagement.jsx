// src/pages/StockManagement.jsx
import React, { useEffect, useState } from "react";
import {
  importStock,
  getStockHistory,
  getInventoryList,
} from "../apiV2/inventory_service/rest/inventory.api.js";

const centers = [
  { id: "67ca6e3cfc964efa218ab7d8", name: "Nhà thi đấu quận Thanh Xuân" },
  { id: "67ca6e3cfc964efa218ab7d9", name: "Nhà thi đấu quận Cầu Giấy" },
  { id: "67ca6e3cfc964efa218ab7d7", name: "Nhà thi đấu quận Tây Hồ" },
  { id: "67ca6e3cfc964efa218ab7da", name: "Nhà thi đấu quận Bắc Từ Liêm" },
];

export default function StockManagement() {
  const [selectedCenter, setSelectedCenter] = useState(centers[0].id);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [inventoryList, setInventoryList] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [isNewItemMode, setIsNewItemMode] = useState(false); // State để chuyển đổi chế độ
  
  // TẬP HỢP CÁC TRƯỜNG DỮ LIỆU CẦN THIẾT CHO CẢ INVENTORY MỚI VÀ STOCK HISTORY
  const initialFormState = {
    inventoryId: "", // Dùng khi isNewItemMode = false
    centerId: centers[0].id,
    supplier: "",
    quantityImport: 0, // Số lượng đơn vị nhập (vd: số thùng)
    importPrice: 0, // Giá nhập (1 đơn vị nhập)
    unitImport: "", // Đơn vị nhập (vd: Thùng)
    unitImportQuantity: 1, // Số lượng đơn vị bán lẻ trong 1 đơn vị nhập
    
    // === TRƯỜNG TẠO HÀNG MỚI (Dùng khi isNewItemMode = true) ===
    name: "",
    category: "",
    unitSell: "", // Đơn vị bán lẻ (vd: Chai)
    price: 0, // Giá bán lẻ dự kiến
    bulkPrice: 0, // Giá sỉ (thêm tùy chọn)
    barcode: "",
    description: "",
    image: "", // Link ảnh
    // ==========================================================
  };

  const [form, setForm] = useState(initialFormState);

  useEffect(() => {
    fetchInventory();
    fetchImportHistory();
  }, [selectedCenter, selectedYear, selectedMonth]);

  const fetchInventory = async () => {
    try {
      const res = await getInventoryList({ centerId: selectedCenter });
      setInventoryList(res.data?.data || []);
    } catch (err) {
      console.error("Lỗi khi fetch Inventory:", err);
      setInventoryList([]);
    }
  };

  const fetchImportHistory = async () => {
    try {
      const res = await getStockHistory({
        centerId: selectedCenter,
        year: selectedYear,
        month: selectedMonth === "all" ? undefined : selectedMonth,
      });
      setImportHistory(res.data?.data || []);
    } catch (err) {
      console.error("Lỗi khi fetch Stock History:", err);
      setImportHistory([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? Number(value) : value;

    setForm({ ...form, [name]: finalValue });
  };
  
  const toggleMode = () => {
      setIsNewItemMode(prev => !prev);
      // Reset form khi chuyển chế độ, giữ lại centerId
      setForm({...initialFormState, centerId: selectedCenter}); 
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Tính toán các trường dùng chung
    const totalAdded = form.quantityImport * form.unitImportQuantity; // Tổng số lượng đơn vị bán lẻ được thêm
    const totalCostCalculated = form.importPrice * form.quantityImport; // Tổng chi phí

    let payload = {
        centerId: form.centerId,
        supplier: form.supplier,
        quantityImport: form.quantityImport, // Số lượng đơn vị nhập
        importPrice: form.importPrice, // Giá nhập (1 đơn vị nhập)
        unitImport: form.unitImport,
        unitImportQuantity: form.unitImportQuantity,
        totalAdded: totalAdded, 
        totalCost: totalCostCalculated, 
    };

    if (isNewItemMode) {
        // Trường hợp 1: TẠO VÀ NHẬP HÀNG MỚI
        payload = {
            ...payload,
            itemName: form.name, // Dùng itemName để khớp với logic API
            category: form.category,
            unitSell: form.unitSell,
            price: form.price,
            bulkPrice: form.bulkPrice,
            barcode: form.barcode,
            description: form.description,
            image: form.image,
            isNewItem: true, 
        };
        // Kiểm tra validation bổ sung cho hàng mới
        if (!form.name || !form.category || !form.unitSell || form.price <= 0) {
            alert("Vui lòng điền đầy đủ thông tin cơ bản cho mặt hàng mới (Tên, Danh mục, Đơn vị bán, Giá bán).");
            return;
        }

    } else {
        // Trường hợp 2: NHẬP HÀNG CÓ SẴN
        payload = {
            ...payload,
            inventoryId: form.inventoryId,
            isNewItem: false,
        };
        if (!form.inventoryId) {
            alert("Vui lòng chọn mặt hàng để nhập.");
            return;
        }
    }
    
    // Kiểm tra validation chung
    if (form.quantityImport <= 0 || form.importPrice < 0 || !form.unitImport || form.unitImportQuantity <= 0 || !form.supplier) {
        alert("Vui lòng điền đầy đủ và chính xác Số lượng, Giá nhập, Nhà cung cấp, Đơn vị nhập và Số lượng/ĐV nhập.");
        return;
    }
    
    try {
        console.log("Payload gửi đi:", payload);
        // importStock là hàm gọi TransactionService.createStockHistory (backend)
        await importStock(payload); 
        alert(`${isNewItemMode ? "Tạo hàng mới và n" : "N"}hập kho thành công!`);
        
        // Reset form và fetch lại dữ liệu
        setForm({...initialFormState, centerId: selectedCenter});
        fetchInventory();
        fetchImportHistory();
    } catch (err) {
        console.error(err);
        alert(`Lỗi khi nhập kho: ${err.response?.data?.message || err.message || "Đã xảy ra lỗi hệ thống."}`);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center">Quản lý kho 📦</h1>

{/* --- PHẦN LỌC DỮ LIỆU --- */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
        <label className="block font-medium mb-1">Chọn trung tâm:</label>
        <select
            className="border rounded px-3 py-2 w-full"
            value={selectedCenter}
            onChange={(e) => {
                setSelectedCenter(e.target.value);
                setForm({ ...form, centerId: e.target.value });
            }}
        >
            {centers.map((center) => (
                <option key={center.id} value={center.id}>
                    {center.name}
                </option>
            ))}
        </select>
    </div>
    <div>
        <label className="block font-medium mb-1">Năm:</label>
        <select
            className="border rounded px-3 py-2 w-full"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
        >
            {years.map((year) => (
                <option key={year} value={year}>{year}</option>
            ))}
        </select>
    </div>
    <div>
        <label className="block font-medium mb-1">Tháng:</label>
        <select
            className="border rounded px-3 py-2 w-full"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
        >
            <option value="all">Tất cả</option>
            {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{`Tháng ${i + 1}`}</option>
            ))}
        </select>
    </div>
</div>

<hr />

      {/* --- PHẦN FORM NHẬP KHO (CÓ CHUYỂN ĐỔI CHẾ ĐỘ) --- */}
      <form onSubmit={handleSubmit} className="space-y-6 border p-4 rounded shadow-lg bg-white">
        <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-xl font-semibold">{isNewItemMode ? "Tạo và Nhập Hàng Mới 🆕" : "Nhập Hàng Đã Có Sẵn 🛒"}</h2>
            <button
                type="button"
                onClick={toggleMode}
                className={`text-sm px-3 py-1 rounded transition-colors ${isNewItemMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
            >
                {isNewItemMode ? "← Nhập hàng có sẵn" : "Thêm mặt hàng mới →"}
            </button>
        </div>

        {/* 1. CHẾ ĐỘ NHẬP HÀNG CÓ SẴN (Select Inventory) */}
        {!isNewItemMode && (
          <div>
            <label className="block mb-1">Mặt hàng **có sẵn** <span className="text-red-500">*</span></label>
            <select
              className="w-full border rounded px-3 py-2"
              name="inventoryId"
              value={form.inventoryId}
              onChange={handleChange}
              required={!isNewItemMode}
            >
              <option value="">-- Chọn mặt hàng đã tồn tại --</option>
              {inventoryList.map((inv) => (
                <option key={inv._id} value={inv._id}>
                  {inv.name} ({inv.unitSell}) - Tồn: {inv.quantity}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* 2. CHẾ ĐỘ TẠO VÀ NHẬP HÀNG MỚI (New Inventory Fields) */}
        {isNewItemMode && (
          <div className="space-y-4 border p-3 rounded bg-gray-50">
            <h3 className="text-lg font-medium text-gray-700">Thông tin chi tiết mặt hàng mới (Inventory)</h3>
            
            {/* Hàng 1: Tên, Danh mục */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block mb-1">Tên mặt hàng <span className="text-red-500">*</span></label>
                    <input type="text" name="name" className="w-full border rounded px-3 py-2" value={form.name} onChange={handleChange} required={isNewItemMode} />
                </div>
                <div>
                    <label className="block mb-1">Danh mục <span className="text-red-500">*</span></label>
                    <input type="text" name="category" className="w-full border rounded px-3 py-2" value={form.category} onChange={handleChange} required={isNewItemMode} />
                </div>
            </div>
            
            {/* Hàng 2: Đơn vị bán lẻ, Giá bán lẻ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block mb-1">Đơn vị bán lẻ (vd: Chai, Cái) <span className="text-red-500">*</span></label>
                    <input type="text" name="unitSell" className="w-full border rounded px-3 py-2" value={form.unitSell} onChange={handleChange} required={isNewItemMode} />
                </div>
                <div>
                    <label className="block mb-1">Giá bán lẻ dự kiến (1 ĐV) <span className="text-red-500">*</span></label>
                    <input type="number" name="price" className="w-full border rounded px-3 py-2" value={form.price} onChange={handleChange} required={isNewItemMode} min={1} />
                </div>
            </div>
            
            {/* Hàng 3: Giá sỉ, Mã vạch, Ảnh, Mô tả (Tùy chọn) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block mb-1">Giá sỉ (Tùy chọn)</label>
                    <input type="number" name="bulkPrice" className="w-full border rounded px-3 py-2" value={form.bulkPrice} onChange={handleChange} min={0} />
                </div>
                <div>
                    <label className="block mb-1">Mã vạch (Tùy chọn)</label>
                    <input type="text" name="barcode" className="w-full border rounded px-3 py-2" value={form.barcode} onChange={handleChange} />
                </div>
            </div>

            <div>
                <label className="block mb-1">Link Ảnh (Tùy chọn)</label>
                <input type="text" name="image" className="w-full border rounded px-3 py-2" value={form.image} onChange={handleChange} />
            </div>
            <div>
                <label className="block mb-1">Mô tả (Tùy chọn)</label>
                <textarea name="description" className="w-full border rounded px-3 py-2" rows="2" value={form.description} onChange={handleChange} />
            </div>
          </div>
        )}


        {/* THÔNG TIN NHẬP KHO CHUNG */}
        
        {/* NHÀ CUNG CẤP */}
        <div>
          <label className="block mb-1">Nhà cung cấp <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="supplier"
            className="w-full border rounded px-3 py-2"
            value={form.supplier}
            onChange={handleChange}
            required
          />
        </div>

        {/* ĐƠN VỊ NHẬP VÀ SỐ LƯỢNG TRONG ĐƠN VỊ NHẬP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex-1">
            <label className="block mb-1">Đơn vị nhập (vd: Thùng) <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="unitImport"
              className="w-full border rounded px-3 py-2"
              value={form.unitImport}
              onChange={handleChange}
              required
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1">Số lượng ĐV nhập (VD: Số lượng Thùng) <span className="text-red-500">*</span></label>
            <input
              type="number"
              name="unitImportQuantity"
              className="w-full border rounded px-3 py-2"
              value={form.unitImportQuantity}
              onChange={handleChange}
              required
              min={1}
            />
          </div>
        </div>

        {/* SỐ LƯỢNG ĐƠN VỊ NHẬP VÀ GIÁ NHẬP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex-1">
            <label className="block mb-1">Số lượng trong 1 ĐV nhập (VD: 1 Thùng có bao nhiêu hàng?) <span className="text-red-500">*</span></label>
            <input
              type="number"
              name="quantityImport"
              className="w-full border rounded px-3 py-2"
              value={form.quantityImport}
              onChange={handleChange}
              required
              min={1}
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1">Giá nhập (VD: Giá 1 Thùng) <span className="text-red-500">*</span></label>
            <input
              type="number"
              name="importPrice"
              className="w-full border rounded px-3 py-2"
              value={form.importPrice}
              onChange={handleChange}
              required
              min={0}
            />
          </div>
        </div>

        <div className="text-sm text-gray-600">
            **TỔNG NHẬP:** **{form.quantityImport * form.unitImportQuantity}** đơn vị bán lẻ. **TỔNG CHI PHÍ:** **{(form.importPrice * form.unitImportQuantity)?.toLocaleString() || 0} đ**.
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={
            !form.supplier || 
            form.quantityImport <= 0 || 
            form.importPrice < 0 || 
            !form.unitImport || 
            form.unitImportQuantity <= 0 ||
            (!isNewItemMode && !form.inventoryId) || // Phải chọn hàng nếu là hàng có sẵn
            (isNewItemMode && (!form.name || !form.category || !form.unitSell || form.price <= 0)) // Phải điền đủ thông tin nếu là hàng mới
          }
        >
          {isNewItemMode ? "Tạo và Nhập Hàng Mới" : "Nhập Hàng Vào Kho"}
        </button>
      </form>

<hr />

      {/* KHO HIỆN TẠI & LỊCH SỬ NHẬP HÀNG (Giữ nguyên) */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Kho hiện tại</h2>
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Tên hàng</th>
                <th className="border p-2">Danh mục</th>
                <th className="border p-2">Tồn kho</th>
                <th className="border p-2">Đơn vị bán</th>
                <th className="border p-2">Giá bán</th>
              </tr>
            </thead>
            <tbody>
              {inventoryList.map((inv) => (
                <tr key={inv._id}>
                  <td className="border p-2">{inv.name}</td>
                  <td className="border p-2">{inv.category}</td>
                  <td className="border p-2">{inv.quantity}</td>
                  <td className="border p-2">{inv.unitSell}</td>
                  <td className="border p-2">{inv.price?.toLocaleString() || 0} đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

<hr />

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Lịch sử nhập hàng</h2>
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Mặt hàng</th>
                <th className="border p-2">Số lượng</th>
                <th className="border p-2">Giá nhập</th>
                <th className="border p-2">Nhà cung cấp</th>
                <th className="border p-2">Ngày nhập</th>
              </tr>
            </thead>
            <tbody>
              {importHistory.map((entry) => (
                <tr key={entry._id}>
                  <td className="border p-2">{entry.inventoryId?.name || "N/A"}</td> 
                  <td className="border p-2">{entry.quantityImport}</td>
                  <td className="border p-2">{entry.importPrice?.toLocaleString() || 0} đ</td>
                  <td className="border p-2">{entry.supplier}</td>
                  <td className="border p-2">{new Date(entry.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}