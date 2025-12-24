import React, { useState, useEffect } from "react";
import {
    MagnifyingGlassIcon,
    LockClosedIcon,
    LockOpenIcon,
    BuildingOfficeIcon,
    UserPlusIcon,
    PhoneIcon,
    EnvelopeIcon,
    PlusIcon,
    PencilSquareIcon,
    IdentificationIcon,
    EyeIcon,        // Icon Mắt mở
    EyeSlashIcon,   // Icon Mắt đóng
    ArrowLeftIcon   // 💡 Icon Quay lại
} from "@heroicons/react/24/outline";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserTie } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom"; // 💡 Hook điều hướng
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import FullscreenNotification from "../components/FullscreenNotification";

// --- IMPORT API ---
import {
    getAllUsers,
    updateUserProfile
} from "../apiV2/user_service/rest/user.api";

import { 
    updateUserStatus, 
    createCenterManager, 
    ResetManagerPassword
} from "../apiV2/auth_service/rest/user.api"; 

import { getAllCentersGQL } from "../apiV2/center_service/graphql/center.api";

// --- HOOK DEBOUNCE ---
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function CenterManagerManagement() {
    // 1. NAVIGATION
    const navigate = useNavigate(); // 💡 Khởi tạo navigate

    // 2. STATE DATA
    const [managers, setManagers] = useState([]);
    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // 3. STATE UI & FORM
    const [submitting, setSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchValue, setSearchValue] = useState("");
    const debouncedSearch = useDebounce(searchValue, 500);
    const [statusFilter, setStatusFilter] = useState("");
    
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // State ẩn/hiện mật khẩu
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone_number: ""
    });

    const [notification, setNotification] = useState(null); 

    // 4. FETCH DATA
    const fetchData = async () => {
        if (managers.length === 0) setLoading(true);
        try {
            const params = {
                page: 1,
                limit: 100,
                role: 'CENTER_MANAGER',
                search: debouncedSearch,
                isActive: statusFilter
            };

            const [usersRes, centersRes] = await Promise.all([
                getAllUsers(params),
                getAllCentersGQL()
            ]);

            if (usersRes.success) setManagers(usersRes.data);
            if (Array.isArray(centersRes)) setCenters(centersRes);
            else if (centersRes?.data?.centers) setCenters(centersRes.data.centers);

        } catch (err) {
            console.error(err);
            toast.error("Lỗi tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [debouncedSearch, statusFilter]);

    // 5. LOGIC HANDLERS
    const getManagedCenterInfo = (managerId) => {
        if (!managerId) return { name: "Chưa phân công", assigned: false };
        const center = centers.find(c => c.centerManagerId?.trim() === managerId.trim());
        return center ? { name: center.name, assigned: true } : { name: "Chưa phân công", assigned: false };
    };

    const handleToggleStatus = async (e, user) => {
        e.stopPropagation();
        if (actionLoading === (user.userId || user._id)) return;
        const newStatus = !user.isActive;
        const actionText = newStatus ? "MỞ KHÓA" : "KHÓA";
        
        if (!window.confirm(`Xác nhận ${actionText} tài khoản ${user.name}?`)) return;

        setActionLoading(user.userId || user._id);
        try {
            await updateUserStatus(user.userId || user._id, newStatus);
            toast.success(`Đã ${actionText.toLowerCase()} thành công!`); 
            await fetchData();
        } catch (error) {
            toast.error(`Lỗi khi ${actionText.toLowerCase()} tài khoản.`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleOpenModal = (user = null) => {
        setEditingUser(user);
        setShowPassword(false);
        setShowConfirmPassword(false);

        if (user) {
            setFormData({
                username: user.username || "",
                name: user.name,
                email: user.email,
                phone_number: user.phone_number || "",
                password: "",
                confirmPassword: "" 
            });
        } else {
            setFormData({ username: "", name: "", email: "", password: "", confirmPassword: "", phone_number: "" });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!editingUser) {
            const usernameRegex = /^[a-z0-9_-]{3,20}$/;
            if (!usernameRegex.test(formData.username)) {
                setNotification({ type: 'error', title: 'Username không hợp lệ', message: 'Chỉ chứa chữ thường, số, gạch dưới/ngang (3-20 ký tự).' });
                return;
            }
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            setNotification({ type: 'error', title: 'Mật khẩu không khớp', message: 'Mật khẩu xác nhận không trùng khớp.' });
            return;
        }

        setSubmitting(true);

        try {
            if (editingUser) {
                const userId = editingUser.userId || editingUser._id;
                
                // Update Profile
                const profilePayload = { 
                    name: formData.name, 
                    phone_number: formData.phone_number 
                };
                await updateUserProfile(userId, profilePayload);

                // Update Password
                if (formData.password) {
                    await ResetManagerPassword(userId, formData.password);
                }
                
                setNotification({
                    type: 'success',
                    title: 'Cập nhật thành công!',
                    message: formData.password 
                        ? `Đã cập nhật thông tin và đổi mật khẩu cho "${formData.name}".`
                        : `Đã cập nhật thông tin hồ sơ cho "${formData.name}".`
                });

            } else {
                const { confirmPassword, ...createPayload } = formData;
                await createCenterManager(createPayload);
                
                setNotification({
                    type: 'success',
                    title: 'Tạo mới thành công!',
                    message: `Tài khoản "${formData.name}" đã được tạo.`
                });
            }
            
            setModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || "Lỗi xử lý yêu cầu";
            setNotification({ type: 'error', title: 'Đã xảy ra lỗi', message: msg });
        } finally {
            setSubmitting(false);
        }
    };

    // 6. RENDER UI
    return (
        <div className="bg-gray-50 min-h-screen w-full font-sans relative">
            
            {notification && (
                <FullscreenNotification 
                    type={notification.type}
                    title={notification.title}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* 💡 BUTTON QUAY LẠI DASHBOARD */}
                <div className="mb-6">
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Quay lại Dashboard
                    </button>
                </div>

                {/* HEADER & FILTER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <FontAwesomeIcon icon={faUserTie} className="text-blue-600" />
                            Quản lý Center Manager
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Quản lý đội ngũ vận hành các trung tâm</p>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                                placeholder="Tìm kiếm quản lý..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm cursor-pointer"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="true">Đang hoạt động</option>
                            <option value="false">Đã bị khóa</option>
                        </select>
                    </div>
                </div>

                {/* LOADING */}
                {loading && managers.length === 0 && (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {/* GRID CONTENT */}
                {(!loading || managers.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                        {/* ADD NEW CARD */}
                        <div
                            onClick={() => handleOpenModal(null)}
                            className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group min-h-[220px]"
                        >
                            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                                <PlusIcon className="w-8 h-8" />
                            </div>
                            <h3 className="font-semibold text-gray-600 group-hover:text-blue-700">Thêm Quản lý Mới</h3>
                            <p className="text-xs text-gray-400 mt-1 text-center">Tạo tài khoản và cấp quyền</p>
                        </div>

                        {/* LIST CARDS */}
                        {managers.map((manager) => {
                            const centerInfo = getManagedCenterInfo(manager.userId || manager._id);
                            const isBanned = !manager.isActive;
                            const isProcessing = actionLoading === (manager.userId || manager._id);

                            return (
                                <div
                                    key={manager.userId || manager._id}
                                    onClick={() => handleOpenModal(manager)}
                                    className={`relative bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between ${isBanned ? 'bg-gray-50' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={manager.avatar_url || 'https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png'}
                                                alt={manager.name}
                                                className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm shrink-0" 
                                            />
                                            <div>
                                                <h3 className={`font-bold text-gray-800 line-clamp-1 ${isBanned ? 'text-gray-500 line-through' : ''}`} title={manager.name}>
                                                    {manager.name}
                                                </h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isBanned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {isBanned ? 'Đã khóa' : 'Hoạt động'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => handleToggleStatus(e, manager)}
                                            disabled={isProcessing}
                                            className={`p-2 rounded-full transition-colors z-10 ${isBanned
                                                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                            } ${isProcessing ? 'cursor-not-allowed opacity-70' : ''}`}
                                        >
                                            {isProcessing ? (
                                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                isBanned ? <LockClosedIcon className="w-5 h-5" /> : <LockOpenIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center gap-2 overflow-hidden font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                            <IdentificationIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                            <span className="truncate text-blue-700 font-medium">@{manager.username}</span>
                                        </div>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <EnvelopeIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                            <span className="truncate">{manager.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <PhoneIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                            <span>{manager.phone_number || "---"}</span>
                                        </div>
                                    </div>

                                    <div className={`mt-auto pt-3 border-t border-gray-100 flex items-center gap-2 text-xs ${centerInfo.assigned ? 'text-blue-600' : 'text-gray-400'}`}>
                                        <BuildingOfficeIcon className="w-4 h-4" />
                                        <span className="font-medium truncate">{centerInfo.name}</span>
                                    </div>
                                    
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-2xl transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                        <span className="bg-white text-gray-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                                            <PencilSquareIcon className="w-3 h-3" /> Chỉnh sửa
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* MODAL FORM */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    {editingUser ? <PencilSquareIcon className="h-5 w-5 text-blue-600" /> : <UserPlusIcon className="h-5 w-5 text-blue-600" />}
                                    {editingUser ? "Cập nhật thông tin" : "Thêm Manager Mới"}
                                </h2>
                                {editingUser && !editingUser.isActive && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold">Đã khóa</span>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                                        <input
                                            type="text" required disabled={!!editingUser}
                                            className={`w-full px-4 py-2 border border-gray-300 rounded-lg outline-none transition-all ${editingUser ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                            placeholder="nguyen_van_a"
                                        />
                                        {!editingUser && <p className="text-xs text-gray-400 mt-1">Định danh đăng nhập, không thể đổi sau này.</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tên hiển thị <span className="text-red-500">*</span></label>
                                        <input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nguyễn Văn A" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                                        <input type="email" required disabled={!!editingUser}
                                            className={`w-full px-4 py-2 border border-gray-300 rounded-lg outline-none ${editingUser ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="example@mail.com" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} placeholder="09xxxx" />
                                    </div>
                                    
                                    {/* Password Fields with Toggle */}
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                        <div className="col-span-2">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Bảo mật</p>
                                        </div>

                                        <div className="relative">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                {editingUser ? "Mật khẩu mới" : "Mật khẩu *"}
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type={showPassword ? "text" : "password"}
                                                    required={!editingUser}
                                                    className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={formData.password} 
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    placeholder={editingUser ? "Để trống nếu không đổi" : "••••••••"} 
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                                >
                                                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                Xác nhận lại
                                                {formData.password && <span className="text-red-500"> *</span>}
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    required={!!formData.password}
                                                    disabled={!formData.password}
                                                    className={`w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${!formData.password ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                                    value={formData.confirmPassword} 
                                                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                    placeholder="Nhập lại mật khẩu" 
                                                />
                                                <button 
                                                    type="button"
                                                    disabled={!formData.password}
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50"
                                                >
                                                    {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-50 mt-2">
                                    <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Hủy</button>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        className={`px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                        {submitting ? "Đang xử lý..." : (editingUser ? "Lưu thay đổi" : "Tạo tài khoản")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CenterManagerManagement;