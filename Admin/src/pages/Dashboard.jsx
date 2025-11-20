import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext.jsx';
import { ROLES } from '../constants/roles.js';

// 💡 IMPORT LOADING SPINNER
import LoadingSpinner from '../components/LoadingSpinner.jsx'; 

// 💡 IMPORT ICONS
import { 
    MdOutlineSportsSoccer, 
    MdOutlineSpaceDashboard, 
    MdShoppingCart, 
    MdReceipt, 
    MdAccountCircle, 
    MdOutlineBarChart, 
    MdStorage, 
    MdCalendarToday, 
    MdPeopleAlt, 
    MdOutlineNewspaper, 
    MdOutlineStar, 
    MdExitToApp 
} from 'react-icons/md'; 

// --- Hàm getFeatureIcon và các hằng số màu sắc giữ nguyên ---
const getFeatureIcon = (title) => {
    switch (title) {
        case 'Xem trạng thái sân':
            return <MdOutlineSpaceDashboard size={30} />;
        case 'Bán hàng':
            return <MdShoppingCart size={30} />;
        case 'Quản lý Đơn hàng/Hóa đơn':
            return <MdReceipt size={30} />;
        case 'Quản lý Tài khoản':
            return <MdAccountCircle size={30} />;
        case 'Báo cáo doanh thu':
            return <MdOutlineBarChart size={30} />;
        case 'Quản lý kho':
            return <MdStorage size={30} />;
        case 'Tạo Lịch cố định':
            return <MdCalendarToday size={30} />;
        case 'Quản lý khách hàng':
            return <MdPeopleAlt size={30} />;
        case 'Quản lý tin tức':
            return <MdOutlineNewspaper size={30} />;
        case 'Quản lý đánh giá':
            return <MdOutlineStar size={30} />;
        default:
            return <MdOutlineSportsSoccer size={30} />; 
    }
};

const PRIMARY_COLOR = '#10B981'; 
const ACCENT_COLOR = '#F59E0B'; 
const BACKGROUND_COLOR = '#F0FFF4'; 
const CARD_BG_COLOR = '#FFFFFF'; 
const TEXT_COLOR = '#1F2937'; 
const LOGOUT_COLOR = '#EF4444'; 

const featureCardStyle = {
    background: CARD_BG_COLOR,
    padding: '35px 25px',
    borderRadius: '16px', 
    cursor: 'pointer',
    color: TEXT_COLOR,
    boxShadow: '0 8px 16px rgba(16, 185, 129, 0.1)', 
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
    border: '1px solid #E5E7EB',
    textAlign: 'center',
};

const DashboardAdmin = () => {
    const navigate = useNavigate();
    const { admin, logout } = useContext(AuthContext);

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false); 

    // --- Các hàm navigate giữ nguyên ---
    const goToCenter = () => navigate('/center-status');
    const goToUsers = () => navigate('/users-manage');
    const goToNews = () => navigate('/news');
    const goToBooking = () => navigate('/admin-bill-list');
    const goToRating = () => navigate('/ratings');
    const goToAccount = () => navigate('/account');
    const goToShop = () => navigate('/shop');
    const goToStock = () => navigate('/stock');
    const goToReport = () => navigate('/report');
    const goToCreateFixedBooking = () => navigate('/create-fixed-booking');

    // Cập nhật hàm Logout (logic bên trong giữ nguyên)
    const handleLogout = async () => {
        setIsLoggingOut(true); // Chỉ cần set state, spinner toàn trang sẽ kích hoạt
        try {
            if (logout) {
                await logout(); 
            }
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
            setIsLoggingOut(false); // Nếu lỗi thì tắt spinner
        }
    };
    
    // 💡 SỬA LỖI 1: KHÔI PHỤC ĐẦY ĐỦ CÁC TÍNH NĂNG
    const allFeatures = [
        { title: 'Xem trạng thái sân', onClick: goToCenter, roles: ['super_admin', 'center_manager'] },
        { title: 'Bán hàng', onClick: goToShop, roles: ['super_admin', 'center_manager'] },
        { title: 'Quản lý Đơn hàng/Hóa đơn', onClick: goToBooking, roles: ['super_admin', 'center_manager'] },
        { title: 'Quản lý Tài khoản', onClick: goToAccount, roles: ['super_admin', 'center_manager'] },
        { title: 'Báo cáo doanh thu', onClick: goToReport, roles: ['super_admin'] },
        { title: 'Quản lý kho', onClick: goToStock, roles: ['super_admin'] },
        { title: 'Tạo Lịch cố định', onClick: goToCreateFixedBooking, roles: ['super_admin'] }, 
        { title: 'Quản lý khách hàng', onClick: goToUsers, roles: ['super_admin'] },
        { title: 'Quản lý tin tức', onClick: goToNews, roles: ['super_admin'] },
        { title: 'Quản lý đánh giá', onClick: goToRating, roles: ['super_admin'] },
    ];

    const featuresToShow = useMemo(() => {
        if (!admin?.role) return [];
        return allFeatures.filter(feature => feature.roles.includes(admin.role));
    }, [admin]); 

    // Hàm wrapper để chuyển trang
    const handleNavigate = (navigateFunction) => {
        setIsNavigating(true);
        setTimeout(() => {
            navigateFunction();
        }, 50); 
    };

    return (
        <div style={{ 
            padding: '20px 40px', 
            fontFamily: 'Inter, sans-serif', 
            background: BACKGROUND_COLOR, 
            minHeight: '100vh', 
            color: TEXT_COLOR 
        }}>
            
            {/* 💡 SỬA LỖI 2: SPINNER CHO CẢ ĐĂNG XUẤT VÀ CHUYỂN TRANG */}
            {(isNavigating || isLoggingOut) && <LoadingSpinner fullPage={true} color={PRIMARY_COLOR} />}

            {/* --- Phần Header --- */}
            <header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '40px',
                background: CARD_BG_COLOR, 
                borderRadius: '12px',
                padding: '20px 30px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img 
                        src={admin?.avatar_url}
                        alt="avatar" 
                        style={{ 
                            width: 70, 
                            height: 70, 
                            borderRadius: '20%', 
                            objectFit: 'cover', 
                            marginRight: '15px',
                            border: `3px solid ${PRIMARY_COLOR}` 
                        }} 
                    />
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85em', color: '#6B7280', fontWeight: '500' }}>
                            {admin?.role === ROLES.SUPER_ADMIN ? 'QUẢN LÝ HỆ THỐNG' : 'QUẢN LÝ TRUNG TÂM'}
                        </p>
                        <h1 style={{ 
                            fontSize: '2em', 
                            fontWeight: '800', 
                            margin: 0,
                            color: PRIMARY_COLOR,
                            letterSpacing: '-0.5px'
                        }}>
                            {admin?.name || 'Admin'}
                        </h1>
                    </div>
                </div>

                {/* 💡 SỬA LỖI 3: ĐƠN GIẢN HÓA NÚT ĐĂNG XUẤT */}
                {/* (Không cần spinner inline nữa, chỉ cần disable) */}
                <button 
                    onClick={handleLogout} 
                    disabled={isLoggingOut} // Chỉ cần vô hiệu hóa
                    style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center', 
                        padding: '10px 20px', 
                        background: LOGOUT_COLOR,
                        border: 'none', 
                        borderRadius: '8px', 
                        color: '#fff', 
                        cursor: isLoggingOut ? 'wait' : 'pointer', // Đổi con trỏ khi load
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        boxShadow: `0 4px 6px rgba(239, 68, 68, 0.3)`,
                        transition: 'background 0.3s',
                        opacity: isLoggingOut ? 0.7 : 1, // Làm mờ nút khi load
                    }}
                    onMouseEnter={(e) => { if (!isLoggingOut) e.currentTarget.style.background = '#DC2626'; }}
                    onMouseLeave={(e) => { if (!isLoggingOut) e.currentTarget.style.background = LOGOUT_COLOR; }}
                >
                    <MdExitToApp size={20} style={{ marginRight: '8px' }} />
                    ĐĂNG XUẤT
                </button>
            </header>
            {/* --- Kết thúc Header --- */}

            <h2 style={{ fontSize: '1.6em', marginBottom: '25px', color: TEXT_COLOR, fontWeight: '700' }}>
                <MdOutlineSportsSoccer style={{ color: PRIMARY_COLOR, marginRight: '10px' }} size={24}/> 
                Các Tính Năng Quản Trị
            </h2>

            {/* --- Lưới các Card Tính năng (Sporty Grid) --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
                {featuresToShow.map((item, index) => (
                    <div
                        key={index} 
                        onClick={() => handleNavigate(item.onClick)}
                        style={featureCardStyle}
                        // Hiệu ứng Hover
                        onMouseEnter={(e) => { 
                            e.currentTarget.style.transform = 'translateY(-8px)'; 
                            e.currentTarget.style.boxShadow = `0 15px 30px rgba(16, 185, 129, 0.2)`; 
                            e.currentTarget.style.border = `1px solid ${PRIMARY_COLOR}`; 
                        }}
                        onMouseLeave={(e) => { 
                            e.currentTarget.style.transform = 'translateY(0)'; 
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.1)'; 
                            e.currentTarget.style.border = '1px solid #E5E7EB'; 
                        }}
                    >
                        {/* --- Nội dung card giữ nguyên --- */}
                        <div style={{ 
                            color: CARD_BG_COLOR, 
                            marginBottom: '15px', 
                            background: PRIMARY_COLOR, 
                            width: '60px', 
                            height: '60px', 
                            borderRadius: '50%', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: `0 4px 8px rgba(16, 185, 129, 0.4)`
                        }}>
                            {getFeatureIcon(item.title)}
                        </div>
                        <h3 style={{ fontSize: '1.3em', fontWeight: '700', margin: '15px 0 5px 0', color: TEXT_COLOR }}>
                            {item.title}
                        </h3>
                        <p style={{ fontSize: '0.9em', color: '#6B7280', margin: 0 }}>
                            Quản lý {item.title.toLowerCase().replace('quản lý', '').trim()} của hệ thống.
                        </p>
                    </div>
                ))}
            </div>
            {/* --- Kết thúc Grid Card --- */}

            <footer style={{ marginTop: '50px', textAlign: 'center', fontSize: '0.85em', color: '#9CA3AF' }}>
                <p style={{ margin: '5px 0' }}>Hệ thống Quản lý Sân Cầu/Bóng - Powered by SportTech</p>
                <p style={{ margin: '5px 0' }}>Phiên bản {admin?.role === ROLES.SUPER_ADMIN ? 'Toàn quyền' : 'Trung tâm'}</p>
            </footer>
        </div>
    );
};

export default DashboardAdmin;