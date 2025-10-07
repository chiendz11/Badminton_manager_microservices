import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/header.css";
import LoginModal from "../pages/Login";
import { AuthContext } from "../contexts/AuthContext";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null); // Lưu trữ trang đích

  const { user, logout, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const logo = "/images/shuttleCock.png";

  // Định nghĩa base URL của backend
  const BACKEND_URL = "http://localhost:3000"; // Backend chạy trên port 3000

  // Xử lý đường dẫn ảnh: thêm domain của backend nếu cần
  const getAvatarImagePath = (path) => {
    if (!path) return "/default-avatar.png"; // Sử dụng hình ảnh mặc định từ public
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}${path}`;
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const openLoginModal = (e, redirectPath = null) => {
    e.preventDefault();
    setRedirectAfterLogin(redirectPath); // Lưu trữ trang đích
    setIsLoginModalOpen(true);
    closeMenu();
  };

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    setIsDropdownOpen(false);
    closeMenu();
  };

  if (loading) {
    return <div>Đang tải...</div>;
  }

  return (
    <>
      <header className={isScrolled ? "scrolled" : ""}>
        <div className="container header-container flex items-center justify-between">
          <Link to="/" className="logo">
            <div className="logo-icon">
              <i className="fas fa-table-tennis"></i>
            </div>
            ĐẶT<span>SÂN</span>247
          </Link>

          <div className="header-right flex items-center">
            <div className="header-contact flex items-center">
              <div className="contact-item flex items-center">
                <i className="fas fa-phone-alt"></i>
                <span>1900 1809</span>
              </div>
              <div className="contact-item flex items-center">
                <i className="fas fa-envelope"></i>
                <span>23021710@vnu.edu.vn</span>
              </div>
            </div>

            <button
              className={`mobile-menu-toggle ${isMobileMenuOpen ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            <nav className={isMobileMenuOpen ? "active" : ""}>
              <ul className="header-links flex items-center">
                <li>
                  <Link
                    to="/"
                    onClick={closeMenu}
                    className="hover:text-yellow-300 transition-colors"
                  >
                    Trang Chủ
                  </Link>
                </li>
                <li>
                  <Link
                    to="/centers"
                    onClick={closeMenu}
                    className="hover:text-yellow-300 transition-colors"
                  >
                    Đặt Sân
                  </Link>
                </li>
                <li>
                  <Link
                    to="/news"
                    onClick={closeMenu}
                    className="hover:text-yellow-300 transition-colors"
                  >
                    Tin Tức
                  </Link>
                </li>
                <li>
                  <Link
                    to="/policy"
                    onClick={closeMenu}
                    className="hover:text-yellow-300 transition-colors"
                  >
                    Chính Sách
                  </Link>
                </li>
                <li>
                  {user ? (
                    <Link
                      to="/contact"
                      onClick={closeMenu}
                      className="hover:text-yellow-300 transition-colors"
                    >
                      Liên Hệ
                    </Link>
                  ) : (
                    <a
                      href="#login"
                      onClick={(e) => openLoginModal(e, "/contact")} // Truyền trang đích
                      className="hover:text-yellow-300 transition-colors"
                    >
                      Liên Hệ
                    </a>
                  )}
                </li>
                {user ? (
                  <li className="relative">
                    <div className="relative inline-block group">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center border border-white text-white rounded-md px-3 py-1 hover:bg-white hover:bg-opacity-20 transition-colors cursor-pointer"
                      >
                        <img
                          src={getAvatarImagePath(user.avatar_image_path)}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover mr-2"
                          onError={(e) => {
                            console.log("Lỗi tải ảnh trong Header:", user.avatar_image_path);
                            e.target.onerror = null;
                            e.target.src = "/default-avatar.png"; // Sử dụng hình ảnh mặc định từ public
                          }}
                        />
                        <span className="text-lg">{user.name}</span>
                        <i className="fas fa-chevron-down text-sm ml-1"></i>
                      </button>
                      {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-yellow-400 rounded-md shadow-md z-10 transition-all duration-200 overflow-hidden">
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              navigate("/profile");
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 text-sm hover:bg-yellow-300 transition-colors"
                          >
                            <i className="fas fa-user text-base"></i>
                            <span>Thông tin cá nhân</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleLogout(e);
                              setIsDropdownOpen(false);
                              navigate("/");
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 text-sm hover:bg-yellow-300 transition-colors"
                          >
                            <i className="fas fa-sign-out-alt text-base"></i>
                            <span>Đăng xuất</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ) : (
                  <li className="login-btn">
                    <a
                      href="#login"
                      onClick={(e) => openLoginModal(e)}
                      className="hover:text-yellow-300 transition-colors"
                    >
                      <i className="fas fa-user"></i> Đăng Nhập
                    </a>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        redirectAfterLogin={redirectAfterLogin} // Truyền prop redirectAfterLogin
      />
    </>
  );
};

export default Header;