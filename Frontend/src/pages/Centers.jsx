import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/centers.css";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { checkPendingExists } from "../apis/booking";
import { getAllCenters } from "../apis/centers"; // Hàm API lấy centers
import { AuthContext } from "../contexts/AuthContext";
import CenterDetailModal from "../pages/CenterDetailModal";
import LoginModal from "../pages/Login";
import { getCenterInfoById } from "../apis/centers"; // Hàm API lấy thông tin center theo ID

const Centers = () => {
  const { user } = useContext(AuthContext);
  const openHours = "05:00 - 24:00";
  const today = new Date().toISOString().split("T")[0];
  const navigate = useNavigate();

  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Dữ liệu đối tác
  const partners = [
    { name: "Yonex", logo: "/images/partners/yonex.jpg", url: "https://www.yonex.com" },
    { name: "Victor", logo: "/images/partners/victor.png", url: "https://www.victorsport.com" },
    { name: "Li-Ning", logo: "/images/partners/lining.png", url: "https://www.lining.com" },
  ];

  // Dữ liệu giải đấu sắp diễn ra
  const upcomingTournaments = [
    {
      id: 1,
      name: "Giải Cầu Lông Mở Rộng ĐẤT SÂN 247",
      date: "20/07/2025",
      location: "Nhà thi đấu Đại học Bách Khoa Hà Nội",
      image: "/images/tournaments/tournament1.jpg",
      participants: 120,
      registrationDeadline: "10/05/2025",
      prize: "50.000.000 VNĐ"
    },
    {
      id: 2,
      name: "Cúp Cầu Lông Hà Nội Open 2025",
      date: "15/08/2025",
      location: "Nhà thi đấu Trịnh Hoài Đức",
      image: "/images/tournaments/tournament2.jpg",
      participants: 200,
      registrationDeadline: "01/06/2025",
      prize: "100.000.000 VNĐ"
    },
    {
      id: 3,
      name: "Giải Cầu Lông Sinh Viên Toàn Quốc 2025",
      date: "10/12/2025",
      location: "Nhà thi đấu Đại học Quốc Gia Hà Nội",
      image: "/images/tournaments/tournament3.jpg",
      participants: 150,
      registrationDeadline: "25/06/2025",
      prize: "80.000.000 VNĐ"
    }
  ];

  const openModal = (center) => {
    setSelectedCenter(center);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const data = await getAllCenters();
      // Kiểm tra nếu data là một object có thuộc tính 'centers'
      if (data && data.centers) {
        setCenters(data.centers);
      } else {
        // Nếu API trả về trực tiếp mảng centers, thì setCenters(data)
        setCenters(data);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  // Hàm goToBooking: nếu chưa đăng nhập thì mở modal đăng nhập, nếu đã có pending thì thông báo,
  // nếu không thì lưu thông tin booking vào localStorage và điều hướng sang trang booking
  const goToBooking = async (centerId) => {
    if (!user || !user._id) {
      alert("Hãy đăng nhập hoặc đăng ký để đặt sân");
      setIsLoginModalOpen(true);
      return;
    }
    try {
      const { exists } = await checkPendingExists({ userId: user._id, centerId });
      if (exists) {
        alert("Bạn đã có booking pending cho trung tâm này. Vui lòng chờ hết 5 phút.");
      } else {
        // Gọi API lấy thông tin trung tâm để lấy tên
        const centerInfo = await getCenterInfoById(centerId);
        if (centerInfo.success && centerInfo.center) {
          localStorage.setItem("centerName", centerInfo.center.name);
        }
        const bookingData = { centerId, date: today };
        localStorage.setItem("bookingData", JSON.stringify(bookingData));
        navigate("/booking");
      }
    } catch (error) {
      alert("Lỗi kiểm tra booking pending: " + error.message);
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

  const renderFacilities = (facilities) => {
    return (
      <div className="center-facilities">
        {facilities && facilities.map((facility, index) => ( // Thêm kiểm tra facilities tồn tại
          <span key={index} className="facility-tag">
            {facility}
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      <Header />

      <div className="centers-page">
        <div className="hero-section">
          <div className="hero-content">
            <h1>Chọn Cơ Sở Yêu Thích Của Bạn</h1>
            <p>Tìm và đặt sân cầu lông tốt nhất tại Hà Nội</p>
            <div className="hero-stats">
              <div className="stat-item">
                <i className="fas fa-medal"></i>
                <div className="stat-info">
                  <span className="stat-number">4</span>
                  <span className="stat-label">Cơ sở hàng đầu</span>
                </div>
              </div>
              <div className="stat-item">
                <i className="fas fa-table-tennis"></i>
                <div className="stat-info">
                  <span className="stat-number">20</span>
                  <span className="stat-label">Sân cầu lông</span>
                </div>
              </div>
              <div className="stat-item">
                <i className="fas fa-users"></i>
                <div className="stat-info">
                  <span className="stat-number">1000+</span>
                  <span className="stat-label">Đặt sân/tháng</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="centers-header">
          <h2>Các Cơ Sở Cầu Lông tại Hà Nội</h2>
          <p>Vui lòng chọn một trong các cơ sở cầu lông dưới đây để đặt sân</p>
        </div>

        {loading ? (
          <p data-testid="centers-loading-message">Đang tải...</p>
        ) : error ? (
          <p data-testid="centers-error-message">Error: {error}</p>
        ) : (
          <div className="centers-grid">
            {centers.map((center) => (
              <div key={center._id} className="center-card" data-testid={`center-card-${center._id}`}>
                <div className="center-image">
                  <img
                    src={center.imgUrl && center.imgUrl[0] ? center.imgUrl[0] : "/images/default.png"}
                    alt={center.name}
                    onError={(e) => {
                      e.target.src = "/images/default.png";
                    }}
                    data-testid={`center-image-${center._id}`}
                  />
                  <div className="center-badge" data-testid={`center-total-courts-badge-${center._id}`}>
                    <i className="fas fa-table-tennis"></i> {center.totalCourts} sân
                  </div>
                  {center.popularity && (
                    <div className="center-popular-tag" data-testid={`center-popularity-${center._id}`}>
                      <i className="fas fa-fire"></i> {center.popularity}
                    </div>
                  )}
                  {center.promotion && (
                    <div className="center-promo-badge" data-testid={`center-promotion-${center._id}`}>
                      <i className="fas fa-tags"></i> {center.promotion}
                    </div>
                  )}
                </div>
                <div className="center-info">
                  <div className="center-header">
                    <h2 data-testid={`center-name-${center._id}`}>{center.name}</h2>
                    <div className="center-rating" data-testid={`center-rating-${center._id}`}>
                      <div className="stars">{renderRatingStars(center.avgRating)}</div>
                      <span>{center.avgRating}/5</span>
                    </div>
                  </div>
                  <div className="center-booking-stats" data-testid={`center-booking-stats-${center._id}`}>
                    <i className="fas fa-calendar-check"></i>
                    <span>{center.bookingCount || 0}+ lượt đặt tháng này</span>
                  </div>
                  <p className="center-address" data-testid={`center-address-${center._id}`}>
                    <i className="fas fa-map-marker-alt"></i> {center.address}
                  </p>
                  <div className="center-divider"></div>
                  <p className="center-description" data-testid={`center-description-${center._id}`}>{center.description}</p>
                  {renderFacilities(center.facilities)}
                  <div className="center-footer">
                    <div className="center-details">
                      <span data-testid={`center-open-hours-${center._id}`}>
                        <i className="fas fa-clock"></i> {openHours}
                      </span>
                      <span data-testid={`center-phone-${center._id}`}>
                        <i className="fas fa-phone"></i> {center.phone}
                      </span>
                    </div>
                    <div className="center-action-buttons">
                      <button
                        className="view-details-btn"
                        onClick={() => openModal(center)}
                        title="Xem chi tiết"
                        data-testid={`center-details-button-${center._id}`} // THÊM data-testid NÀY
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button
                        onClick={() => goToBooking(center._id)}
                        className="book-center-btn"
                        data-testid={`book-now-button-${center._id}`} // THÊM data-testid NÀY
                      >
                        <span>Đặt Sân Ngay</span>
                        <i className="fas fa-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Phần giải đấu sắp diễn ra */}
        <div className="upcoming-tournaments-section">
          <div className="section-header">
            <h2>Giải Đấu Sắp Diễn Ra</h2>
            <p>Đăng ký tham gia các giải đấu cầu lông hấp dẫn</p>
          </div>
          
          <div className="tournaments-container">
            {upcomingTournaments.map((tournament) => (
              <div key={tournament.id} className="tournament-card" data-testid={`tournament-card-${tournament.id}`}>
                <div className="tournament-image">
                  <img src={tournament.image} alt={tournament.name} data-testid={`tournament-image-${tournament.id}`} />
                  <div className="tournament-date-badge" data-testid={`tournament-date-badge-${tournament.id}`}>
                    <i className="fas fa-calendar-alt"></i> {tournament.date}
                  </div>
                </div>
                <div className="tournament-content">
                  <h3 data-testid={`tournament-name-${tournament.id}`}>{tournament.name}</h3>
                  <div className="tournament-details">
                    <div className="tournament-detail-item" data-testid={`tournament-location-${tournament.id}`}>
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{tournament.location}</span>
                    </div>
                    <div className="tournament-detail-item" data-testid={`tournament-participants-${tournament.id}`}>
                      <i className="fas fa-users"></i>
                      <span>{tournament.participants} người tham gia</span>
                    </div>
                    <div className="tournament-detail-item" data-testid={`tournament-registration-deadline-${tournament.id}`}>
                      <i className="fas fa-stopwatch"></i>
                      <span>Hạn đăng ký: {tournament.registrationDeadline}</span>
                    </div>
                    <div className="tournament-detail-item" data-testid={`tournament-prize-${tournament.id}`}>
                      <i className="fas fa-trophy"></i>
                      <span>Giải thưởng: {tournament.prize}</span>
                    </div>
                  </div>
                  <div className="tournament-actions">
                    <Link to="/competition" className="view-tournament-btn" data-testid={`view-tournament-button-${tournament.id}`}>
                      <span>Xem Chi Tiết</span>
                      <i className="fas fa-angle-right"></i>
                    </Link>
                    <button className="register-tournament-btn" data-testid={`register-tournament-button-${tournament.id}`}>
                      <i className="fas fa-edit"></i>
                      <span>Chờ thông báo</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="view-all-tournaments">
            <Link to="/competition" className="view-all-btn" data-testid="view-all-tournaments-button">
              <span>Xem Tất Cả Giải Đấu</span>
              <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        </div>

        {/* Phần đối tác */}
        <div className="partners-section">
          <div className="section-header">
            <h2>Đối Tác Của Chúng Tôi</h2>
            <p>Hợp tác cùng những thương hiệu cầu lông hàng đầu thế giới</p>
          </div>
          
          <div className="partners-logo-container">
            {partners.map((partner, index) => (
              <a 
                href={partner.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="partner-logo" 
                key={index}
                data-testid={`partner-logo-${partner.name.toLowerCase().replace(/\s/g, '-')}`} // Thêm data-testid
              >
                <img src={partner.logo} alt={partner.name} />
              </a>
            ))}
          </div>
        </div>

        <div className="centers-info-section">
          <div className="info-card" data-testid="info-card-safe-booking">
            <div className="info-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3>Đặt Sân An Toàn</h3>
            <p>Thanh toán bảo mật và đảm bảo hoàn tiền nếu có vấn đề</p>
          </div>
          <div className="info-card" data-testid="info-card-fast-booking">
            <div className="info-icon">
              <i className="fas fa-bolt"></i>
            </div>
            <h3>Đặt Sân Nhanh Chóng</h3>
            <p>Chỉ mất vài phút để hoàn tất đặt sân và nhận xác nhận</p>
          </div>
          <div className="info-card" data-testid="info-card-quality-experience">
            <div className="info-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h3>Trải Nghiệm Chất Lượng</h3>
            <p>Tất cả các cơ sở đều được đánh giá và kiểm duyệt chất lượng</p>
          </div>
        </div>

        {selectedCenter && (
          <CenterDetailModal
            center={selectedCenter}
            isOpen={modalOpen}
            onClose={closeModal}
            data-testid="center-detail-modal" // Thêm data-testid
          />
        )}
      </div>

      {/* Modal đăng nhập nếu chưa đăng nhập */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        data-testid="login-modal" // Thêm data-testid
      />
      <Footer />
    </>
  );
};

export default Centers;