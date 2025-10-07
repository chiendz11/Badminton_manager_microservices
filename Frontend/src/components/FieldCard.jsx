import React from 'react';
import { useNavigate } from "react-router-dom";
import { checkPendingExists } from "../apis/booking";

const FieldCard = ({ field }) => {
  const Id = "67bd323489acfa439c4d7945";
  const centerId = "67ca6e3cfc964efa218ab7d7"; // Trung tâm hiện tại
  const today = new Date().toISOString().split("T")[0];
  const navigate = useNavigate();
  const { id, name, location, priceRange, rating, reviews, image } = field;
  
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? '#ffcc00' : '#ddd' }}>
          ★
        </span>
      );
    }
    return stars;
  };

  const goToBooking = async (userId) => {
    try {
      const { exists } = await checkPendingExists({ userId, centerId });
      if (exists) {
        alert(`User ${userId} đã có booking pending cho trung tâm này. Vui lòng chờ hết 5 phút.`);
      } else {
        // Điều hướng sang BookingSchedule với state, không dùng query parameters
        navigate('/booking', {
          state: {
            user: userId,
            centerId: centerId,
            date: today,
          },
        });
      }
    } catch (error) {
      alert("Lỗi kiểm tra booking pending: " + error.message);
    }
  };

  return (
    <div className="field-card">
      <div className="field-img">
        <img src={image} alt={name} />
      </div>
      <div className="field-info">
        <div className="field-name">{name}</div>
        <div className="field-location">
          <span>{location}</span>
        </div>
        <div className="field-price">{priceRange}</div>
        <div className="field-rating">
          <div className="stars">{renderStars(rating)}</div>
          <span>({reviews} đánh giá)</span>
        </div>
        <button className="book-btn" onClick={() => goToBooking(Id)}>Đặt Sân Ngay</button>
      </div>
    </div>
  );
};

export default FieldCard;