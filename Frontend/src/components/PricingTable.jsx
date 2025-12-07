import React, { useState, useEffect } from "react";
// 💡 CẬP NHẬT IMPORT: Sử dụng API GraphQL mới
import { getCenterInfoByIdGQL } from "../apiV2/center_service/grahql/center.api";

const PricingTable = ({ centerId, onClose }) => {
  const [pricingData, setPricingData] = useState(null);
  const [centerName, setCenterName] = useState(""); // Thêm state để lưu tên trung tâm
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPricing = async () => {
      if (!centerId) return;
      
      try {
        setLoading(true);
        // Gọi API GraphQL lấy chi tiết trung tâm
        const centerInfo = await getCenterInfoByIdGQL(centerId);
        
        if (centerInfo) {
          setCenterName(centerInfo.name);
          setPricingData(centerInfo.pricing);
        } else {
          setError("Không tìm thấy thông tin trung tâm.");
        }
      } catch (err) {
        console.error("Error fetching center pricing via GraphQL:", err);
        setError("Không thể tải dữ liệu bảng giá.");
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [centerId]);

  const formatCurrency = (amount) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  // Helper function để parse giờ (VD: "05:00" -> "5h00") cho gọn
  const formatTime = (timeStr) => {
      if (!timeStr) return "";
      const [hour, minute] = timeStr.split(":");
      return `${parseInt(hour)}h${minute}`;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-zoom-in" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 flex justify-between items-center text-white">
          <div>
             <h2 className="text-xl font-bold flex items-center gap-2">
                <i className="fas fa-tags"></i> Bảng Giá Thuê Sân
             </h2>
             {centerName && <p className="text-sm opacity-90 mt-1">{centerName}</p>}
          </div>
          <button 
            className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full w-8 h-8 flex items-center justify-center" 
            onClick={onClose}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p>Đang tải bảng giá...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <i className="fas fa-exclamation-circle text-4xl mb-2"></i>
              <p>{error}</p>
              <button 
                className="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition" 
                onClick={() => window.location.reload()}
              >
                Thử lại
              </button>
            </div>
          ) : pricingData ? (
            <div className="space-y-8">
              
              {/* NGÀY THƯỜNG */}
              <div className="pricing-section">
                <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b pb-2 border-gray-200">
                   <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><i className="fas fa-calendar-day"></i></span>
                   Ngày thường (Thứ 2 - Thứ 6)
                </h4>
                {pricingData.weekday && pricingData.weekday.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold uppercase">
                            <tr>
                            <th className="px-6 py-3">Khung giờ</th>
                            <th className="px-6 py-3 text-right">Giá / giờ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pricingData.weekday.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3 text-gray-600 font-medium">
                                    {formatTime(item.startTime)} - {formatTime(item.endTime)}
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-green-600">
                                    {formatCurrency(item.price)}
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">Chưa có thông tin giá ngày thường.</p>
                )}
              </div>

              {/* CUỐI TUẦN */}
              <div className="pricing-section">
                <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 border-b pb-2 border-gray-200">
                   <span className="bg-orange-100 text-orange-600 p-1.5 rounded-lg"><i className="fas fa-calendar-week"></i></span>
                   Cuối tuần (Thứ 7 - Chủ nhật)
                </h4>
                {pricingData.weekend && pricingData.weekend.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold uppercase">
                            <tr>
                            <th className="px-6 py-3">Khung giờ</th>
                            <th className="px-6 py-3 text-right">Giá / giờ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pricingData.weekend.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3 text-gray-600 font-medium">
                                    {formatTime(item.startTime)} - {formatTime(item.endTime)}
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-orange-600">
                                    {formatCurrency(item.price)}
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">Chưa có thông tin giá cuối tuần.</p>
                )}
              </div>

              {/* GHI CHÚ */}
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                    <i className="fas fa-info-circle"></i> Lưu ý:
                </h4>
                <ul className="list-disc list-inside space-y-1 ml-1 opacity-90">
                  <li>Giá trên áp dụng cho <strong>1 giờ</strong> đặt sân.</li>
                  <li>Đặt sân từ <strong>2 giờ</strong> trở lên được giảm <strong>5%</strong> tổng giá trị.</li>
                  <li>Khách hàng thành viên tích điểm cao sẽ được hưởng thêm ưu đãi.</li>
                  <li>Vui lòng đến sớm 10 phút trước giờ đặt sân để làm thủ tục.</li>
                </ul>
              </div>

            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
                Không có dữ liệu bảng giá.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingTable;