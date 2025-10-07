import React, { useState, useEffect } from 'react';
import { getPopularTimeSlot } from '../apis/booking';
import '../styles/UserProfile.css';

const PopularTimeChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const data = await getPopularTimeSlot();
        setChartData(data);
      } catch (err) {
        setError('Không thể lấy dữ liệu thống kê.');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  if (loading) return <div>Đang tải dữ liệu thống kê...</div>;
  if (error) return <div>{error}</div>;

  // Lấy phần trăm theo từng khoảng thời gian (chuỗi số)
  const { percentages } = chartData.categoryDistribution;

  return (
    <div className="stats-detail-card">
  <div className="detail-card-header">
    <h4>
      <i className="fas fa-clock"></i>
      Thời gian đặt sân phổ biến
    </h4>
  </div>
  <div className="detail-card-body">
    <div className="time-distribution">
      {/* Sáng */}
        <div className="time-slot">
          <div className="time-wrapper">
            <div
              className="time-bar"
              style={{ height: `${percentages.Sáng}%` }}
            ></div>
            <span>{percentages.Sáng}%</span>
          </div>
          <span>Sáng</span>
        </div>
     

      {/* Trưa */}
      
        <div className="time-slot">
          <div className="time-wrapper">
            <div
              className="time-bar"
              style={{ height: `${percentages.Trưa}%` }}
            ></div>
            <span>{percentages.Trưa}%</span>
          </div>
          <span>Trưa</span>
        </div>

      {/* Chiều */}
      
        <div className="time-slot">
          <div className="time-wrapper">
            <div
              className="time-bar"
              style={{ height: `${percentages.Chiều}%` }}
            ></div>
            <span>{percentages.Chiều}%</span>
          </div>
          <span>Chiều</span>
        </div>
  

      {/* Tối */}
        <div className="time-slot">
          <div className="time-wrapper">
            <div
              className="time-bar"
              style={{ height: `${percentages.Tối}%` }}
            ></div>
            <span>{percentages.Tối}%</span>
          </div>
          <span>Tối</span>
        </div>
      
    </div>

    {/* Khung giờ phổ biến */}
    <div className="most-popular-time">
      <i className="fas fa-star"></i>
      <span>
        Khung giờ phổ biến nhất: <strong>{chartData.popularTimeRange}</strong>
        ({chartData.popularCount} lượt đặt)
      </span>
    </div>
  </div>
</div>

  );
};

export default PopularTimeChart;
