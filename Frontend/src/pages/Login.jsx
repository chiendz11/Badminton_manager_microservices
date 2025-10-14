import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css';
import { loginUser, registerUser } from '../apiV2/auth.api.js';
import { AuthContext } from '../contexts/AuthContext.jsx';
import { forgotPasswordByEmailSimpleApi } from '../apis/users';

const LoginModal = ({ isOpen, onClose }) => {
  const [activeMode, setActiveMode] = useState("login");
  const modalRef = useRef(null);
  const { refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // State cho form đăng nhập
  const [identifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(''); // Sẽ chứa thông báo lỗi chi tiết
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // State cho form đăng ký
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    phone_number: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [isFormReady, setIsFormReady] = useState(false);

  // State cho form quên mật khẩu
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Quản lý lỗi từng trường
  const [fieldErrors, setFieldErrors] = useState({});

  // Ẩn/hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Trạng thái loading cho form đăng ký
  const [isLoading, setIsLoading] = useState(false);

  // Tạo ref cho từng trường (đã có sẵn, giữ nguyên)
  const refs = {
    name: useRef(null),
    email: useRef(null),
    phone_number: useRef(null),
    username: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
  };

  // Hàm chuyển đổi giữa các form
  const handleRegisterClick = () => {
    setActiveMode("register");
    setSignupError('');
    setSignupSuccess('');
    setFieldErrors({});
    setIsFormReady(false); // Reset form readiness
  };

  const handleLoginClick = () => {
    setActiveMode("login");
    setLoginError('');
  };

  const handleForgotClick = () => {
    setActiveMode("forgot");
    setForgotMessage('');
  };

  // Xử lý đăng nhập
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(''); // Clear error before new attempt
    setIsLoginLoading(true);
    try {
      const result = await loginUser({ identifier: identifier, password: loginPassword });
      console.log('Đăng nhập thành công:', result);
      await refreshUser(); // Cập nhật thông tin user trong context
      navigate('/');
      onClose();
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      // Lấy thông báo lỗi từ backend
      const errorMessage = error.response?.data?.message || error.message || "Đã có lỗi xảy ra.";
      setLoginError(errorMessage);
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Xử lý thay đổi input trong form đăng ký
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prevData) => ({ ...prevData, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Xử lý đăng ký
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');
    setSignupSuccess('');
    setFieldErrors({});

    if (signupData.password !== signupData.confirmPassword) {
      setFieldErrors({ confirmPassword: "Mật khẩu và xác nhận mật khẩu không trùng khớp" });
      return;
    }

    setIsLoading(true);
    try {
      const { confirmPassword, ...payload } = signupData;
      const result = await registerUser(payload);
      console.log('Đăng ký thành công:', result);
      setSignupSuccess(result.message || "Đăng ký thành công!");
      setActiveMode("registerSuccess");
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      if (error.response && error.response.data && error.response.data.errors) {
        setFieldErrors(error.response.data.errors);
      } else {
        setSignupError(error.response?.data?.message || error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý quên mật khẩu
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotMessage('');
    setIsForgotLoading(true);
    try {
      const result = await forgotPasswordByEmailSimpleApi(forgotEmail);
      setForgotMessage(result.message);
    } catch (error) {
      console.error("Lỗi khi lấy lại mật khẩu:", error);
      setForgotMessage(error.response?.data?.message || error.message);
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Đóng modal khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Ensure signup form is ready after rendering
  useEffect(() => {
    if (activeMode === "register" || activeMode === "registerSuccess") {
      const timer = setTimeout(() => {
        setIsFormReady(true);
      }, 500); // Small delay to ensure form is fully rendered
      return () => clearTimeout(timer);
    }
  }, [activeMode]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div ref={modalRef} className={`container ${activeMode !== "login" ? 'active' : ''}`}>
        <button id="close-modal-btn" className="close-modal-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        {/* FORM ĐĂNG NHẬP */}
        {activeMode === "login" && (
          <div className="form-box login">
            <form onSubmit={handleLoginSubmit} noValidate>
              <h1>Đăng nhập</h1>
              <div className="input-box">
                <input
                  id="login-username"
                  type="text"
                  placeholder="Nhâp email hoặc tên đăng nhập"
                  value={identifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                />
                <i className="bx bxs-user"></i>
              </div>
              <div className="input-box">
                <input
                  id="login-password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <i className="bx bxs-lock-alt"></i>
              </div>
              {/* HIỂN THỊ THÔNG BÁO LỖI ĐĂNG NHẬP */}
              {loginError && <p id="login-error-message" className="error-message">{loginError}</p>}
              <div className="forgot-link">
                <a id="forgot-password-link" href="#" onClick={handleForgotClick}>Quên mật khẩu?</a>
              </div>
              <button id="login-submit" type="submit" className="btn" disabled={isLoginLoading}>
                {isLoginLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Đăng nhập'}
              </button>
              <p className="social-text">Đăng nhập khác</p>
              <div className="social-icons">
                <a id="facebook-login-btn" href="/auth/facebook" className="social-icon facebook">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a id="google-login-btn" href="/auth/google" className="social-icon google">
                  <i className="fab fa-google"></i>
                </a>
              </div>
            </form>
          </div>
        )}

        {/* FORM QUÊN MẬT KHẨU */}
        {activeMode === "forgot" && (
          <div className="form-box forgot">
            <form onSubmit={handleForgotSubmit} noValidate>
              <h1>Quên mật khẩu</h1>
              {forgotMessage && (
                forgotMessage.includes('thành công') ? // Simple check for success/error message
                  <p id="forgot-success-message" className="info-message">{forgotMessage}</p> :
                  <p id="forgot-error-message" className="error-message">{forgotMessage}</p>
              )}
              <div className="input-box">
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Nhập Email bạn dùng cho đăng nhập"
                  className="placeholder:text-sm"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <i className="bx bxs-envelope"></i>
              </div>
              <button id="forgot-submit" type="submit" className="btn" disabled={isForgotLoading}>
                {isForgotLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Gửi yêu cầu'}
              </button>
            </form>
          </div>
        )}

        {/* FORM ĐĂNG KÝ */}
        {(activeMode === "register" || activeMode === "registerSuccess") && (
          <div className="form-box register" style={{ overflow: 'auto' }}>
            <form onSubmit={handleSignupSubmit} noValidate>
              <h1>Đăng ký</h1>
              {signupError && <p id="signup-error-message" className="error-message">{signupError}</p>}
              {signupSuccess && <p id="signup-success-message" className="success-message">{signupSuccess}</p>}
              {isLoading && (
                <div id="signup-loading-spinner" className="loading-spinner">
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              )}
              <div className={`form-content ${isLoading || !isFormReady ? 'hidden' : ''}`}>
                <div className={`input-box ${fieldErrors.name ? 'invalid' : signupData.name.trim() ? 'valid' : ''}`}>
                  <input
                    id="signup-name"
                    type="text"
                    name="name"
                    placeholder="Họ và tên"
                    value={signupData.name}
                    onChange={handleChange}
                    ref={refs.name}
                  />
                  <i className="bx bxs-user"></i>
                </div>
                {fieldErrors.name && <p id="field-error-name" className="field-error">{fieldErrors.name}</p>}
                <div className={`input-box ${fieldErrors.email ? 'invalid' : signupData.email.trim() ? 'valid' : ''}`}>
                  <input
                    id="signup-email"
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={signupData.email}
                    onChange={handleChange}
                    ref={refs.email}
                  />
                  <i className="bx bxs-envelope"></i>
                </div>
                {fieldErrors.email && <p id="field-error-email" className="field-error">{fieldErrors.email}</p>}
                <div className={`input-box ${fieldErrors.phone_number ? 'invalid' : signupData.phone_number.trim() ? 'valid' : ''}`}>
                  <input
                    id="signup-phone"
                    type="text"
                    name="phone_number"
                    placeholder="Số điện thoại"
                    value={signupData.phone_number}
                    onChange={handleChange}
                    ref={refs.phone_number}
                  />
                  <i className="bx bxs-phone"></i>
                </div>
                {fieldErrors.phone_number && <p id="field-error-phone_number" className="field-error">{fieldErrors.phone_number}</p>}
                <div className={`input-box ${fieldErrors.username ? 'invalid' : signupData.username.trim() ? 'valid' : ''}`}>
                  <input
                    id="signup-username"
                    type="text"
                    name="username"
                    placeholder="Tên đăng nhập"
                    value={signupData.username}
                    onChange={handleChange}
                    ref={refs.username}
                  />
                  <i className="bx bxs-user"></i>
                </div>
                {fieldErrors.username && <p id="field-error-username" className="field-error">{fieldErrors.username}</p>}
                <div className={`input-box ${fieldErrors.password ? 'invalid' : signupData.password ? 'valid' : ''}`}>
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Mật khẩu"
                    value={signupData.password}
                    onChange={handleChange}
                    ref={refs.password}
                  />
                  <i className="bx bxs-lock-alt"></i>
                  <span
                    id="toggle-password-btn"
                    className="toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ cursor: "pointer" }}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '1.1rem' }}></i>
                  </span>
                </div>
                {fieldErrors.password && <p id="field-error-password" className="field-error">{fieldErrors.password}</p>}
                <div className={`input-box ${fieldErrors.confirmPassword ? 'invalid' : signupData.confirmPassword ? 'valid' : ''}`}>
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Xác nhận mật khẩu"
                    value={signupData.confirmPassword}
                    onChange={handleChange}
                    ref={refs.confirmPassword}
                  />
                  <i className="bx bxs-lock-alt"></i>
                  <span
                    id="toggle-confirm-password-btn"
                    className="toggle-pw"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ cursor: "pointer" }}
                  >
                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '1.1rem' }}></i>
                  </span>
                </div>
                {fieldErrors.confirmPassword && <p id="field-error-confirmPassword" className="field-error">{fieldErrors.confirmPassword}</p>}
                <button
                  id="signup-submit"
                  type="submit"
                  className="btn"
                  disabled={isLoading || !isFormReady}
                >
                  {isLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Đăng ký'}
                </button>
                <p className="social-text">Đăng ký khác</p>
                <div className="social-icons">
                  <a id="facebook-signup-btn" href="/auth/facebook" className="social-icon facebook">
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a id="google-signup-btn" href="/auth/google" className="social-icon google">
                    <i className="fab fa-google"></i>
                  </a>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TOGGLE BOX */}
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            {activeMode === "login" && (
              <>
                <h1>Xin chào bạn!</h1>
                <p>Không có tài khoản?</p>
                <button id="toggle-register-panel-btn" className="btn register-btn" onClick={handleRegisterClick}>Đăng ký</button>
              </>
            )}
          </div>
          <div className="toggle-panel toggle-right">
            {activeMode === "forgot" && (
              <>
                <h1>OH!!</h1>
                <p>Bạn đã nhớ mật khẩu?</p>
                <button id="toggle-login-panel-btn-from-forgot" className="btn login-btn" onClick={handleLoginClick}>Đăng nhập</button>
              </>
            )}
            {activeMode === "register" && (
              <>
                <h1>Chào mừng bạn</h1>
                <p>Nếu đã có tài khoản, hãy đăng nhập!</p>
                <button id="toggle-login-panel-btn-from-register" className="btn login-btn" onClick={handleLoginClick}>Đăng nhập</button>
              </>
            )}
            {activeMode === "registerSuccess" && (
              <>
                <h1 className='pb-10 whitespace-nowrap'>Đăng ký thành công🥳</h1>
                <div className="toggle-buttons">
                  <button
                    id="register-success-continue-register-btn"
                    className="btn register-btn"
                    onClick={() => {
                      setSignupSuccess('');
                      setSignupData({
                        name: '',
                        email: '',
                        phone_number: '',
                        username: '',
                        password: '',
                        confirmPassword: '',
                      });
                      setActiveMode("register");
                    }}
                  >
                    Đăng ký tiếp
                  </button>
                  <button id="register-success-login-btn" className="btn login-btn" onClick={handleLoginClick}>Đăng nhập</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;