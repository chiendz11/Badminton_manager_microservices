import React, { useState, useEffect } from "react";
import { getBookingHistory } from "../apis/booking"; // Giả sử đường dẫn tới API client

const HistoryTab = ({
  filteredHistory: initialFilteredHistory,
  filterStatus,
  setFilterStatus,
  filterCenter,
  setFilterCenter,
  filterFrom,
  setFilterFrom,
  filterTo,
  setFilterTo,
  setFilterSearch,
  handleFilter,
  navigate,
  promptAction,
  getStatusClass,
  getStatusText,
}) => {
  const [history, setHistory] = useState(initialFilteredHistory || []); // Dữ liệu lịch sử từ API
  const [currentPage, setCurrentPage] = useState(1); // Trang hiện tại
  const [totalPages, setTotalPages] = useState(1); // Tổng số trang
  const [limit, setLimit] = useState(10); // Số bản ghi mỗi trang
  const [total, setTotal] = useState(0); // Tổng số bản ghi
  const [loading, setLoading] = useState(false); // Trạng thái tải dữ liệu

  const userId = "your-user-id"; // Thay bằng userId thực tế (lấy từ context hoặc props)

  // Hàm gọi API để lấy lịch sử đặt sân
  const fetchBookingHistory = async (page = 1) => {
    setLoading(true);
    try {
      const data = await getBookingHistory(userId, page, limit);
      setHistory(data.bookingHistory || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch booking history:", error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Gọi API khi component mount hoặc khi page/limit thay đổi
  useEffect(() => {
    fetchBookingHistory(currentPage);
  }, [currentPage, limit]);

  // Xử lý thay đổi trang
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Xử lý thay đổi số lượng bản ghi mỗi trang
  const handleLimitChange = (e) => {
    setLimit(parseInt(e.target.value));
    setCurrentPage(1); // Reset về trang 1 khi thay đổi limit
  };

  // Xử lý các bộ lọc
  const handleStatusFilterChange = (e) => setFilterStatus(e.target.value);
  const handleCenterFilterChange = (e) => setFilterCenter(e.target.value);
  const handleFromDateChange = (e) => setFilterFrom(e.target.value);
  const handleToDateChange = (e) => setFilterTo(e.target.value);

  // Áp dụng bộ lọc trên dữ liệu từ API
  const filteredHistory = history.filter((booking) => {
    const matchStatus = filterStatus === "all" || booking.status === filterStatus;
    const matchCenter = filterCenter === "all" || booking.center === filterCenter;
    const matchFrom = !filterFrom || new Date(booking.date) >= new Date(filterFrom);
    const matchTo = !filterTo || new Date(booking.date) <= new Date(filterTo);
    return matchStatus && matchCenter && matchFrom && matchTo;
  });

  return (
    <div className="tab-content">
      <div className="section-title">
        <i className="fas fa-history"></i>
        <h2>Lịch sử đặt sân</h2>
      </div>
      <div className="history-container">
        <div className="history-filters-enhanced">
          <div className="filters-header-enhanced">
            <div className="header-title">
              <i className="fas fa-filter"></i>
              <h3>Bộ lọc tìm kiếm</h3>
            </div>
            <button
              className="reset-filters-btn-enhanced"
              onClick={() => {
                setFilterStatus("all");
                setFilterCenter("all");
                setFilterSearch("");
                setFilterFrom("");
                setFilterTo("");
                handleFilter();
              }}
            >
              <i className="fas fa-redo-alt"></i>
              <span>Đặt lại</span>
            </button>
          </div>
          <div className="divider"></div>
          <div className="filters-body-enhanced">
            <div className="filter-section">
              <h4 className="filter-section-title">Tình trạng đặt sân</h4>
              <div className="status-filter-options">
                <label className="filter-chip">
                  <input
                    type="radio"
                    name="status"
                    value="all"
                    checked={filterStatus === "all"}
                    onChange={handleStatusFilterChange}
                  />
                  <span>Tất cả</span>
                </label>
                <label className="filter-chip success">
                  <input
                    type="radio"
                    name="status"
                    value="paid"
                    checked={filterStatus === "paid"}
                    onChange={handleStatusFilterChange}
                  />
                  <span>
                    <i className="fas fa-check-circle"></i> Hoàn thành
                  </span>
                </label>
                <label className="filter-chip warning">
                  <input
                    type="radio"
                    name="status"
                    value="pending"
                    checked={filterStatus === "pending"}
                    onChange={handleStatusFilterChange}
                  />
                  <span>
                    <i className="fas fa-clock"></i> Chờ thanh toán
                  </span>
                </label>
                <label className="filter-chip danger">
                  <input
                    type="radio"
                    name="status"
                    value="cancelled"
                    checked={filterStatus === "cancelled"}
                    onChange={handleStatusFilterChange}
                  />
                  <span>
                    <i className="fas fa-times-circle"></i> Đã hủy
                  </span>
                </label>
                <label className="filter-chip processing">
                  <input
                    type="radio"
                    name="status"
                    value="processing"
                    checked={filterStatus === "processing"}
                    onChange={handleStatusFilterChange}
                  />
                  <span>
                    <i className="fas fa-cog"></i> Đang xử lý
                  </span>
                </label>
              </div>
            </div>
            <div className="filter-section">
              <h4 className="filter-section-title">Cơ sở</h4>
              <div className="select-wrapper">
                <select
                  className="filter-select-enhanced"
                  value={filterCenter}
                  onChange={handleCenterFilterChange}
                >
                  <option value="all">Tất cả cơ sở</option>
                  <option value="Nhà thi đấu quận Thanh Xuân">
                    Nhà thi đấu quận Thanh Xuân
                  </option>
                  <option value="Nhà thi đấu quận Cầu Giấy">
                    Nhà thi đấu quận Cầu Giấy
                  </option>
                  <option value="Nhà thi đấu quận Tây Hồ">
                    Nhà thi đấu quận Tây Hồ
                  </option>
                  <option value="Nhà thi đấu quận Bắc Từ Liêm">
                    Nhà thi đấu quận Bắc Từ Liêm
                  </option>
                </select>
                <i className="fas fa-chevron-down select-arrow"></i>
              </div>
            </div>
            <div className="filter-section">
              <h4 className="filter-section-title">Khoảng thời gian</h4>
              <div className="date-range-picker">
                <div className="date-input-group">
                  <label>Từ:</label>
                  <div className="date-input-wrapper">
                    <i className="fas fa-calendar-alt"></i>
                    <input
                      type="date"
                      className="date-input"
                      placeholder="Từ ngày"
                      value={filterFrom}
                      onChange={handleFromDateChange}
                      max={filterTo || undefined}
                    />
                  </div>
                  <label>Đến:</label>
                  <div className="date-input-wrapper">
                    <i className="fas fa-calendar-alt"></i>
                    <input
                      type="date"
                      className="date-input"
                      placeholder="Đến ngày"
                      value={filterTo}
                      onChange={handleToDateChange}
                      min={filterFrom || undefined}
                    />
                  </div>
                </div>
                <div className="quick-date-options">
                  <button
                    className="quick-date-btn"
                    onClick={() => {
                      const today = new Date().toISOString().split("T")[0];
                      setFilterFrom(today);
                      setFilterTo(today);
                    }}
                  >
                    Hôm nay
                  </button>
                  <button
                    className="quick-date-btn"
                    onClick={() => {
                      const now = new Date();
                      const day = now.getDay() === 0 ? 7 : now.getDay();
                      const diffToMonday = day - 1;
                      const monday = new Date(now);
                      monday.setDate(now.getDate() - diffToMonday);
                      const sunday = new Date(monday);
                      sunday.setDate(monday.getDate() + 6);
                      setFilterFrom(monday.toISOString().split("T")[0]);
                      setFilterTo(sunday.toISOString().split("T")[0]);
                    }}
                  >
                    Tuần này
                  </button>
                  <button
                    className="quick-date-btn"
                    onClick={() => {
                      const now = new Date();
                      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                      const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      setFilterFrom(startMonth.toISOString().split("T")[0]);
                      setFilterTo(endMonth.toISOString().split("T")[0]);
                    }}
                  >
                    Tháng này
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="divider"></div>
          <div className="filters-footer">
            <button className="apply-filter-btn-enhanced" onClick={handleFilter}>
              <i className="fas fa-search"></i>
              <span>Tìm kiếm</span>
            </button>
          </div>
        </div>
        <div className="history-results">
          <div className="results-header">
            <div className="results-summary">
              <h3>Kết quả</h3>
              <span className="results-count">{filteredHistory.length} lịch sử đặt sân</span>
            </div>
          </div>
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Mã đặt sân</th>
                  <th>Trạng thái</th>
                  <th>Cơ sở</th>
                  <th>Sân-Giờ</th>
                  <th>Ngày</th>
                  <th>Giá tiền</th>
                  <th>Phương thức</th>
                  <th>Loại</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center" }}>
                      Đang tải...
                    </td>
                  </tr>
                ) : filteredHistory.length > 0 ? (
                  filteredHistory.map((booking, index) => (
                    <tr
                      key={booking.bookingId}
                      className={booking.status === "cancelled" ? "cancelled-row" : ""}
                    >
                      <td className="booking-id">{booking.orderId}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </span>
                      </td>
                      <td>{booking.center}</td>
                      <td>
                        {booking.court_time.split("\n").map((line, idx) => (
                          <React.Fragment key={idx}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))}
                      </td>
                      <td>
                        {booking.orderType === "fixed" ? (
                          `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(
                            booking.endDate
                          ).toLocaleDateString()}`
                        ) : (
                          new Date(booking.date).toLocaleDateString()
                        )}
                      </td>
                      <td className="booking-price">{booking.price}</td>
                      <td>{booking.paymentMethod}</td>
                      <td>{booking.orderType}</td>
                      <td>
                        <div className="action-buttons">
                          {booking.status === "pending" && (
                            <>
                              <button
                                className="pay-btn"
                                title="Thanh toán"
                                onClick={() => {
                                  console.log("Prompting pay action for booking:", booking.orderId);
                                  promptAction("pay", {});
                                }}
                              >
                                <i className="fas fa-credit-card"></i>
                              </button>
                              <button
                                className="cancel-btn"
                                title="Hủy đặt sân"
                                onClick={() => {
                                  console.log("Prompting cancel action for orderId:", booking.orderId);
                                  promptAction("cancel", { orderId: booking.orderId });
                                }}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          )}
                          {booking.status === "paid" && (
                            <button
                              className="delete-btn"
                              title="Xóa"
                              onClick={() => {
                                console.log("Prompting delete action for bookingId:", booking.bookingId);
                                promptAction("delete", { bookingId: booking.bookingId });
                              }}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center" }}>
                      Không có dữ liệu lịch sử đặt sân
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="history-pagination">
            <div className="pagination-info">
              <span>
                Hiển thị {(currentPage - 1) * limit + 1}-
                {Math.min(currentPage * limit, total)} của {total} kết quả
              </span>
            </div>
            <div className="pagination-controls">
              <button
                className={`page-btn ${currentPage === 1 ? "disabled" : ""}`}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`page-btn ${currentPage === page ? "active" : ""}`}
                  onClick={() => handlePageChange(page)}
                  disabled={loading}
                >
                  {page}
                </button>
              ))}
              <button
                className={`page-btn ${currentPage === totalPages ? "disabled" : ""}`}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            <div className="pagination-options">
              <select
                className="per-page-select"
                value={limit}
                onChange={handleLimitChange}
                disabled={loading}
              >
                <option value="10">10 / trang</option>
                <option value="20">20 / trang</option>
                <option value="50">50 / trang</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;