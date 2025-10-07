

import React, { useState, useEffect } from "react";
import { getCenterPricing } from "../apis/centers";

const PricingTable = ({ centerId, onClose }) => {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoading(true);
        const data = await getCenterPricing(centerId);
        setPricing(data);
      } catch (err) {
        console.error("Error fetching center pricing:", err);
        setError("Không thể tải dữ liệu bảng giá");
      } finally {
        setLoading(false);
      }
    };
    fetchPricing();
  }, [centerId]);

  const formatCurrency = (amount) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="price-table-modal" onClick={onClose}>
      <div className="price-table-content" onClick={(e) => e.stopPropagation()}>
        <div className="price-table-header">
          <h2>Bảng giá sân</h2>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="price-table-body">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Đang tải bảng giá...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <p>{error}</p>
              <button className="retry-button" onClick={() => window.location.reload()}>
                Thử lại
              </button>
            </div>
          ) : pricing ? (
            <>
              <h3>{pricing.title || "Cầu lông"}</h3>

              <div className="price-section">
                <h4>Ngày thường (Thứ 2 - Thứ 6)</h4>
                <table className="price-table">
                  <thead>
                    <tr>
                      <th>Khung giờ</th>
                      <th>Giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.weekday.map((item, index) => (
                      <tr key={index}>
                        <td>
                          {item.startTime} - {item.endTime}
                        </td>
                        <td>{formatCurrency(item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="price-section">
                <h4>Cuối tuần (Thứ 7 - Chủ nhật)</h4>
                <table className="price-table">
                  <thead>
                    <tr>
                      <th>Khung giờ</th>
                      <th>Giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.weekend.map((item, index) => (
                      <tr key={index}>
                        <td>
                          {item.startTime} - {item.endTime}
                        </td>
                        <td>{formatCurrency(item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="note-section">
                <h4>Lưu ý:</h4>
                <ul>
                  <li>Giá trên áp dụng cho 1 giờ đặt sân.</li>
                  <li>Đặt sân từ 2 giờ trở lên được giảm 5% tổng giá trị.</li>
                  <li>Khách hàng thành viên được giảm thêm 10% tổng giá trị.</li>
                  <li>Vui lòng đến sớm 10 phút trước giờ đặt sân.</li>
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PricingTable;