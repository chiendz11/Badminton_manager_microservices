import React, { useState, useEffect, useRef, useContext } from "react";
import "../styles/centerDetailModal.css";
import { getCenterInfoById } from "../apis/centers"; // API lấy thông tin center
import { submitRating } from "../apis/users"; // API đánh giá
import { AuthContext } from "../contexts/AuthContext";
import { getCommentsForCenter } from "../apis/rating";

const CenterDetailModal = ({ center, isOpen, onClose }) => {
  const modalRef = useRef(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [reviewContent, setReviewContent] = useState("");
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Modal xác nhận
  const [showErrorModal, setShowErrorModal] = useState(false); // Modal thông báo lỗi
  const [errorMessage, setErrorMessage] = useState(""); // Thông báo lỗi
  const { user } = useContext(AuthContext);
  const userId = user?._id;

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (showConfirmModal) {
          setShowConfirmModal(false);
        } else if (showErrorModal) {
          setShowErrorModal(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, showConfirmModal, showErrorModal]);

  // Close modal when clicking outside the modal container
  const handleOutsideClick = (e) => {
    if (e.target.className === "modal-overlay") {
      onClose();
    }
  };

  // Lấy thông tin ảnh bổ sung cho center
  useEffect(() => {
    if (center && center._id) {
      console.log("Fetching additional images for center:", center._id);
      getCenterInfoById(center._id)
        .then((data) => {
          if (data && data.center && Array.isArray(data.center.imgUrl)) {
            const images = data.center.imgUrl.slice(1);
            setAdditionalImages(images);
          } else {
            console.warn("Không tìm thấy trường imgUrl hoặc không phải là mảng", data);
          }
        })
        .catch((error) => {
          console.error("Error fetching center info for images:", error);
        });
    }
  }, [center]);

  // Lấy danh sách đánh giá từ server
  useEffect(() => {
    if (center && center._id) {
      getCommentsForCenter(center._id)
        .then((data) => {
          if (data && data.reviews) {
            setReviews(data.reviews);
          }
        })
        .catch((error) => {
          console.error("Error fetching comments:", error);
        });
    }
  }, [center]);

  // Xử lý khi nhấn "Gửi đánh giá" - Kiểm tra đăng nhập trước
  const handleSubmitReview = (e) => {
    e.preventDefault();

    // Kiểm tra nếu chưa đăng nhập (userId không tồn tại)
    if (!userId) {
      setErrorMessage("Vui lòng đăng nhập để đánh giá!");
      setShowErrorModal(true);
      return;
    }

    // Kiểm tra nội dung đánh giá
    if (reviewContent.trim() === "") {
      setErrorMessage("Vui lòng nhập nội dung đánh giá!");
      setShowErrorModal(true);
      return;
    }

    // Reset thông báo lỗi trước khi gửi
    setErrorMessage("");
    setShowErrorModal(false);

    // Hiển thị modal xác nhận
    setShowConfirmModal(true);
  };

  // Xử lý khi người dùng xác nhận gửi đánh giá
  const confirmSubmitReview = async () => {
    const ratingData = {
      centerId: center._id,
      stars: selectedRating,
      comment: reviewContent,
    };

    try {
      const data = await submitRating(ratingData);
      if (data && data.rating) {
        setReviews([data.rating, ...reviews]);
        alert("Đánh giá của bạn đã được gửi thành công!");
      }
      setReviewContent("");
      setSelectedRating(5);
    } catch (error) {
      console.error("Error submitting review:", error);
      setErrorMessage(error || "Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại!");
      setShowErrorModal(true);
    } finally {
      setShowConfirmModal(false);
    }
  };

  const renderRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<i key={i} className="fas fa-star"></i>);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<i key={i} className="fas fa-star-half-alt"></i>);
      } else {
        stars.push(<i key={i} className="far fa-star"></i>);
      }
    }
    return stars;
  };

  const renderSelectableStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={`selectable-star ${star <= (hoverRating || selectedRating) ? "active" : ""}`}
        onClick={() => setSelectedRating(star)}
        onMouseEnter={() => setHoverRating(star)}
        onMouseLeave={() => setHoverRating(0)}
      >
        <i className={`${star <= (hoverRating || selectedRating) ? "fas" : "far"} fa-star`}></i>
      </span>
    ));
  };

  if (!isOpen) return null;

  const googleMapUrl = center.location
    ? center.location
    : "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.9244038028873!2d105.78076375707085!3d21.03708178599531!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab32dd484c53%3A0x4b5c0c67d46f326b!2zMTcgRG_Do24gS-G6vyBUaGnhu4duLCBNYWkgROG7i2NoLCBD4bqndSBHaeG6pXksIEjDoCBO4buZaSwgVmnhu4d0IE5hbQ!5e0!3m2!1svi!2s!4v1680235904873!5m2!1svi!2s";

  return (
    <div className="modal-overlay" onClick={handleOutsideClick}>
      <div className="modal-container" ref={modalRef}>
        <div className="modal-header">
          <h2>{center.name}</h2>
          <button className="close-modal-btn" onClick={onClose} aria-label="Đóng">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-main-image">
            <img
              src={center.imgUrl[0] || "/images/default.png"}
              alt={center.name}
              onError={(e) => {
                e.target.src = "/images/default.png";
              }}
            />
          </div>
          <div className="modal-section">
            <h3>
              <i className="fas fa-info-circle"></i> Thông tin chi tiết
            </h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">
                  <i className="fas fa-map-marker-alt"></i> Địa chỉ:
                </span>
                <span className="detail-value">{center.address}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">
                  <i className="fas fa-clock"></i> Giờ mở cửa:
                </span>
                <span className="detail-value">{center.openHours}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">
                  <i className="fas fa-phone"></i> Liên hệ:
                </span>
                <span className="detail-value">{center.phone}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">
                  <i className="fas fa-table-tennis"></i> Số sân:
                </span>
                <span className="detail-value">{center.totalCourts} sân</span>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>
              <i className="fas fa-map"></i> Bản đồ
            </h3>
            <div className="map-placeholder">
              <div className="map-frame">
                <iframe
                  src={googleMapUrl}
                  width="100%"
                  height="250"
                  frameBorder="0"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  aria-hidden="false"
                  tabIndex="0"
                  title="Google Maps"
                ></iframe>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>
              <i className="fas fa-images"></i> Hình ảnh
            </h3>
            <div className="image-gallery">
              {additionalImages.map((img, index) => (
                <div key={index} className="gallery-item">
                  <img src={img} alt={`${center.name} - Ảnh ${index + 2}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <h3>
              <i className="fas fa-concierge-bell"></i> Dịch vụ
            </h3>
            <div className="services-grid">
              {center.facilities.map((facility, index) => (
                <div key={index} className="service-item">
                  <i className="fas fa-check-circle"></i>
                  <span>{facility}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <h3>
              <i className="fas fa-star"></i> Đánh giá từ khách hàng
            </h3>
            <div className="reviews-container">
              {reviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div className="review-user">
                      <i className="fas fa-user-circle"></i>
                      <span>{review.user}</span>
                    </div>
                    <div className="review-rating">
                      <div className="stars">{renderRatingStars(review.stars)}</div>
                      <span className="review-date">{review.date}</span>
                    </div>
                  </div>
                  <p className="review-comment">{review.comment}</p>
                </div>
              ))}
            </div>
            {/* Review submission form */}
            <div className="review-form-container">
              <h4>Viết đánh giá của bạn</h4>
              <form onSubmit={handleSubmitReview} className="review-form">
                <div className="rating-selector">
                  <label>Đánh giá của bạn:</label>
                  <div className="star-rating">{renderSelectableStars()}</div>
                </div>
                <div className="comment-input">
                  <textarea
                    placeholder="Chia sẻ trải nghiệm của bạn về sân..."
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    required
                  ></textarea>
                </div>
                <button type="submit" className="submit-review-btn">
                  <i className="fas fa-paper-plane"></i> Gửi đánh giá
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Đóng
          </button>
          {userId ? (
            <a href={`/booking?centerId=${center._id}&user=${userId}`} className="book-modal-btn">
              <span>Đặt Sân Ngay</span>
              <i className="fas fa-arrow-right"></i>
            </a>
          ) : (
            <p className="login-warning">Bạn cần đăng nhập để đặt sân!</p>
          )}
        </div>
      </div>

      {/* Modal xác nhận gửi đánh giá */}
      {showConfirmModal && (
        <>
          <div 
            className="modal-overlay confirm-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 2000,
              display: 'block'
            }}
            onClick={() => setShowConfirmModal(false)}
          />
          <div 
            className="confirm-modal"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              zIndex: 2100,
              width: '300px',
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            <h3 style={{ marginBottom: '20px', fontSize: '1.25rem', fontWeight: 'bold' }}>
              Xác nhận đánh giá
            </h3>
            <p style={{ marginBottom: '20px', fontSize: '1rem' }}>
              Bạn có chắc chắn về đánh giá này không?. Nếu hệ thống phát hiện bạn đánh giá của bạn có chứa từ ngữ tiêu cực thì sẽ trừ 500 điểm của bạn.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={confirmSubmitReview}
                style={{
                  backgroundColor: '#34a853',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Xác nhận
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  backgroundColor: '#e50914',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal thông báo lỗi */}
      {showErrorModal && (
        <>
          <div 
            className="modal-overlay confirm-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 2000,
              display: 'block'
            }}
            onClick={() => setShowErrorModal(false)}
          />
          <div 
            className="confirm-modal"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              zIndex: 2100,
              width: '300px',
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            <h3 style={{ marginBottom: '20px', fontSize: '1.25rem', fontWeight: 'bold', color: '#e50914' }}>
              Lỗi khi gửi đánh giá
            </h3>
            <p style={{ marginBottom: '20px', fontSize: '1rem', color: '#333' }}>
              {errorMessage}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              style={{
                backgroundColor: '#e50914',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Đóng
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CenterDetailModal;