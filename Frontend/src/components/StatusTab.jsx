import React from 'react';
import PopularTimeChart from '../components/PopularTimeChart';

// Helper function
const calculateCenterPercentage = (centerName, user) => {
  if (!user || !user?.favouriteCenter || user?.favouriteCenter.length === 0) return 0;
  const totalBookingCount = user.favouriteCenter.reduce((total, center) => total + center.bookingCount, 0);
  const center = user.favouriteCenter.find(center => center.centerName === centerName);
  if (!center || totalBookingCount === 0) return 0;
  return (center.bookingCount / totalBookingCount) * 100;
};

const StatsTab = ({
  user,
  detailedStats,
  statsPeriod,
  setStatsPeriod,
  chartData,
  loadingChart,
  chartFilter,
  setChartFilter,
  animateStats
}) => {
  return (
    <div className="tab-content stats-content">
      <div className="section-title">
        <i className="fas fa-chart-line"></i>
        <h2>Thống kê hoạt động</h2>
      </div>
      <div className="stats-dashboard-enhanced">
        <div className="stats-overview">
          <div className="stats-header">
            <h3>Tổng quan hoạt động</h3>
            <div className="stats-period-selector">
              <button
                className={`period-btn ${statsPeriod === "week" ? "active" : ""}`}
                onClick={() => setStatsPeriod("week")}
              >
                Tuần
              </button>
              <button
                className={`period-btn ${statsPeriod === "month" ? "active" : ""}`}
                onClick={() => setStatsPeriod("month")}
              >
                Tháng
              </button>
              <button
                className={`period-btn ${statsPeriod === "year" ? "active" : ""}`}
                onClick={() => setStatsPeriod("year")}
              >
                Năm
              </button>
            </div>
          </div>
          <div className="stats-cards-container">
            <div className={`stats-card-enhanced ${animateStats ? "animate" : ""}`}>
              <div className="stats-card-header">
                <div className="stats-icon-enhanced booking">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div
                  className={`stats-trend ${detailedStats && detailedStats.comparison.totalChange < 0 ? "negative" : "positive"}`}
                >
                  {detailedStats && detailedStats.comparison.totalChange < 0 ? (
                    <i className="fas fa-arrow-down"></i>
                  ) : (
                    <i className="fas fa-arrow-up"></i>
                  )}
                  <span>{detailedStats ? Math.round(Math.abs(detailedStats.comparison.totalChange)) : 0}%</span>
                </div>
              </div>
              <div className="stats-card-body">
                <h4>Tổng số lần đặt sân</h4>
                <div className="stats-value">{detailedStats ? detailedStats.current.total : 0}</div>
              </div>
              <div className="stats-card-footer">
                <span>
                  {detailedStats && detailedStats.comparison.totalChange >= 0 ? "Tăng" : "Giảm"}{" "}
                  {detailedStats ? Math.abs(Math.round(detailedStats.comparison.totalChange)) : 0} so với{" "}
                  {statsPeriod === "week" ? "tuần" : statsPeriod === "month" ? "tháng" : "năm"} trước
                </span>
              </div>
            </div>
            <div className={`stats-card-enhanced ${animateStats ? "animate" : ""}`} style={{ animationDelay: "0.1s" }}>
              <div className="stats-card-header">
                <div className="stats-icon-enhanced completed">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div
                  className={`stats-trend ${detailedStats && detailedStats.comparison.completedChange < 0 ? "negative" : "positive"}`}
                >
                  {detailedStats && detailedStats.comparison.completedChange < 0 ? (
                    <i className="fas fa-arrow-down"></i>
                  ) : (
                    <i className="fas fa-arrow-up"></i>
                  )}
                  <span>{detailedStats ? Math.round(Math.abs(detailedStats.comparison.completedChange)) : 0}%</span>
                </div>
              </div>
              <div className="stats-card-body">
                <h4>Hoàn thành</h4>
                <div className="stats-value">{detailedStats ? detailedStats.current.completed : 0}</div>
              </div>
              <div className="stats-card-footer">
                <div className="completion-rate">
                  <span>Tỷ lệ hoàn thành:</span>
                  <div className="rate-bar-container">
                    <div
                      className="rate-bar"
                      style={{
                        width: detailedStats && detailedStats.current.total > 0
                          ? `${(detailedStats.current.completed / detailedStats.current.total) * 100}%`
                          : "0%"
                      }}
                    ></div>
                  </div>
                  <span>
                    {detailedStats && detailedStats.current.total > 0
                      ? Math.round((detailedStats.current.completed / detailedStats.current.total) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
            <div className={`stats-card-enhanced ${animateStats ? "animate" : ""}`} style={{ animationDelay: "0.2s" }}>
              <div className="stats-card-header">
                <div className="stats-icon-enhanced cancelled">
                  <i className="fas fa-times-circle"></i>
                </div>
                <div
                  className={`stats-trend ${detailedStats && detailedStats.comparison.cancelledChange < 0 ? "negative" : "positive"}`}
                >
                  {detailedStats && detailedStats.comparison.cancelledChange < 0 ? (
                    <i className="fas fa-arrow-down"></i>
                  ) : (
                    <i className="fas fa-arrow-up"></i>
                  )}
                  <span>{detailedStats ? Math.round(Math.abs(detailedStats.comparison.cancelledChange)) : 0}%</span>
                </div>
              </div>
              <div className="stats-card-body">
                <h4>Đã hủy</h4>
                <div className="stats-value">{detailedStats ? detailedStats.current.cancelled : 0}</div>
              </div>
              <div className="stats-card-footer">
                <span>
                  {detailedStats && detailedStats.comparison.cancelledChange >= 0 ? "Tăng" : "Giảm"}{" "}
                  {detailedStats ? Math.abs(Math.round(detailedStats.comparison.cancelledChange)) : 0} so với{" "}
                  {statsPeriod === "week" ? "tuần" : statsPeriod === "month" ? "tháng" : "năm"} trước
                </span>
              </div>
            </div>
            <div className={`stats-card-enhanced ${animateStats ? "animate" : ""}`} style={{ animationDelay: "0.3s" }}>
              <div className="stats-card-header">
                <div className="stats-icon-enhanced points">
                  <i className="fas fa-medal"></i>
                </div>
                <div
                  className={`stats-trend ${detailedStats && detailedStats.comparison.pointsChange < 0 ? "negative" : "positive"}`}
                >
                  {detailedStats && detailedStats.comparison.pointsChange < 0 ? (
                    <i className="fas fa-arrow-down"></i>
                  ) : (
                    <i className="fas fa-arrow-up"></i>
                  )}
                  <span>{detailedStats ? Math.round(Math.abs(detailedStats.comparison.pointsChange)) : 0}%</span>
                </div>
              </div>
              <div className="stats-card-body">
                <h4>Điểm thành viên</h4>
                <div className="stats-value">{detailedStats ? detailedStats.current.points : (user?.points || 0)}</div>
              </div>
              <div className="stats-card-footer">
                <span>
                  {detailedStats && detailedStats.comparison.pointsChange >= 0 ? "Tăng" : "Giảm"}{" "}
                  {detailedStats ? Math.abs(Math.round(detailedStats.comparison.pointsChange)) : 0} so với{" "}
                  {statsPeriod === "week" ? "tuần" : statsPeriod === "month" ? "tháng" : "năm"} trước
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="stats-charts-enhanced">
          <div className="chart-container-enhanced">
            <div className="chart-header">
              <h3>Thống kê đặt sân theo tháng</h3>
              <div className="chart-actions">
                <button
                  className={`chart-action-btn ${chartFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setChartFilter("all")}
                >
                  Tất cả
                </button>
                <button
                  className={`chart-action-btn ${chartFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setChartFilter("completed")}
                >
                  Hoàn thành
                </button>
                <button
                  className={`chart-action-btn ${chartFilter === 'cancelled' ? 'active' : ''}`}
                  onClick={() => setChartFilter("cancelled")}
                >
                  Hủy
                </button>
              </div>
            </div>
            {loadingChart ? (
              <div>Loading chart...</div>
            ) : (
              <div className="advanced-chart">
                <div className="chart-labels">
                  <div className="chart-y-axis">
                    <span>100%</span>
                    <span>80%</span>
                    <span>60%</span>
                    <span>40%</span>
                    <span>20%</span>
                    <span>0%</span>
                  </div>
                </div>
                <div className="chart-content">
                  <div className="chart-grid">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="grid-line"></div>
                    ))}
                  </div>
                  <div className="chart-bars">
                    {chartData.map((data, index) => {
                      const total = data.completed + data.cancelled;
                      const completedPercent = total > 0 ? (data.completed / total) * 100 : 0;
                      const cancelledPercent = total > 0 ? (data.cancelled / total) * 100 : 0;
                      return (
                        <div key={index} className="chart-bar-group">
                          <div className="stacked-bar">
                            {chartFilter === "all" && (
                              <>
                                <div
                                  className="bar-segment completed"
                                  style={{ height: `${completedPercent}%` }}
                                  data-value={data.completed}
                                ></div>
                                <div
                                  className="bar-segment cancelled"
                                  style={{ height: `${cancelledPercent}%` }}
                                  data-value={data.cancelled}
                                ></div>
                              </>
                            )}
                            {chartFilter === "completed" && (
                              <div
                                className="bar-segment completed"
                                style={{ height: `${completedPercent}%` }}
                                data-value={data.completed}
                              ></div>
                            )}
                            {chartFilter === "cancelled" && (
                              <div
                                className="bar-segment cancelled"
                                style={{ height: `${cancelledPercent}%` }}
                                data-value={data.cancelled}
                              ></div>
                            )}
                          </div>
                          <span className="bar-label">{data.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color completed"></div>
                <span>Hoàn thành</span>
              </div>
              <div className="legend-item">
                <div className="legend-color cancelled"></div>
                <span>Đã hủy</span>
              </div>
            </div>
          </div>
          <div className="stats-details-grid">
            <PopularTimeChart />
            <div className="stats-detail-card">
              <div className="detail-card-header">
                <h4><i className="fas fa-map-marker-alt"></i>Cơ sở đặt sân thường xuyên</h4>
              </div>
              <div className="detail-card-body">
                <div className="location-distribution">
                  {user && user?.favouriteCenter && user.favouriteCenter.map((center) => (
                    <div className="location-item" key={center.centerName}>
                      <div className="location-name">{center.centerName}</div>
                      <div className="location-bar-container">
                        <div className="location-bar-wrapper">
                          <div
                            className="location-bar"
                            style={{ width: `${calculateCenterPercentage(center.centerName, user)}%` }}
                          ></div>
                        </div>
                        <span className="location-percentage">
                          {calculateCenterPercentage(center.centerName, user).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsTab;