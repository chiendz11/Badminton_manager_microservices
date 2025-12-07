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
    IdentificationIcon
} from "@heroicons/react/24/outline";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserTie } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import Component Thông báo Toàn màn hình Mới
import FullscreenNotification from "../components/FullscreenNotification";

import {
    getAllUsers,
    updateUserProfile
} from "../apiV2/user_service/rest/user.api";

import { updateUserStatus, createCenterManager } from "../apiV2/auth_service/rest/user.api";
import { getAllCentersGQL } from "../apiV2/center_service/graphql/center.api";

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function CenterManagerManagement() {
    const navigate = useNavigate();

    // 1. STATE
    const [managers, setManagers] = useState([]);
    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Loading states
    const [submitting, setSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    const [searchValue, setSearchValue] = useState("");
    const debouncedSearch = useDebounce(searchValue, 500);
    const [statusFilter, setStatusFilter] = useState("");
    
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [formData, setFormData] = useState({
        username: "",
        name: "",
        email: "",
        password: "",
        phone_number: ""
    });

    // 💡 State cho Fullscreen Notification
    const [notification, setNotification] = useState(null); // { type: 'success'|'error', title: '', message: '' }

    // 2. FETCH DATA
    const fetchData = async () => {
        if (managers.length === 0) setLoading(true);
        try {
            const params = {
                page: 1,
                limit: 100, // Lấy nhiều để demo grid, thực tế nên pagination
                role: 'CENTER_MANAGER',
                search: debouncedSearch,
                isActive: statusFilter
            };

            const [usersRes, centersRes] = await Promise.all([
                getAllUsers(params),
                getAllCentersGQL()
            ]);

            if (usersRes.success) {
                setManagers(usersRes.data);
            }

            if (Array.isArray(centersRes)) {
                setCenters(centersRes);
            }
            else if (centersRes?.data?.centers) {
                setCenters(centersRes.data.centers);
            }

        } catch (err) {
            console.error(err);
            toast.error("Lỗi tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [debouncedSearch, statusFilter]);

    // 3. LOGIC
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
            // Với thao tác nhỏ này, dùng toast hoặc notification nhỏ thì hợp lý hơn,
            // nhưng nếu bạn muốn thống nhất toàn màn hình thì dùng setNotification ở đây luôn.
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
        if (user) {
            setFormData({
                username: user.username || "",
                name: user.name,
                email: user.email,
                phone_number: user.phone_number || "",
                password: ""
            });
        } else {
            setFormData({ username: "", name: "", email: "", password: "", phone_number: "" });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        // Validation Username
        if (!editingUser) {
            const usernameRegex = /^[a-z0-9_-]{3,20}$/;
            if (!usernameRegex.test(formData.username)) {
                // Lỗi validation hiển thị fullscreen luôn cho đồng bộ
                setNotification({
                    type: 'error',
                    title: 'Dữ liệu không hợp lệ',
                    message: 'Username chỉ được chứa chữ thường, số, gạch dưới và gạch ngang (3-20 ký tự).'
                });
                return;
            }
        }

        setSubmitting(true);

        try {
            if (editingUser) {
                const userId = editingUser.userId || editingUser._id;
                const payload = { ...formData };
                if (!payload.password) delete payload.password;
                if (payload.email) delete payload.email;
                if (payload.username) delete payload.username;

                await updateUserProfile(userId, payload);
                
                // 💡 THÔNG BÁO THÀNH CÔNG TOÀN MÀN HÌNH
                setNotification({
                    type: 'success',
                    title: 'Cập nhật thành công!',
                    message: `Thông tin quản lý "${formData.name}" đã được lưu lại.`
                });
            } else {
                await createCenterManager(formData);
                
                // 💡 THÔNG BÁO THÀNH CÔNG TOÀN MÀN HÌNH
                setNotification({
                    type: 'success',
                    title: 'Tạo mới thành công!',
                    message: `Tài khoản quản lý "${formData.name}" (@${formData.username}) đã sẵn sàng.`
                });
            }
            setModalOpen(false);
            fetchData();
        } catch (error) {
            const msg = error.response?.data?.message || "Lỗi xử lý yêu cầu";
            
            // 💡 THÔNG BÁO LỖI TOÀN MÀN HÌNH
            let displayMsg = msg;
            if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("exist")) {
                displayMsg = "Username hoặc Email này đã được sử dụng bởi người khác.";
            }
            
            setNotification({
                type: 'error',
                title: 'Đã xảy ra lỗi',
                message: displayMsg
            });
        } finally {
            setSubmitting(false);
        }
    };

    // 4. RENDER UI
    return (
        <div className="bg-gray-50 min-h-screen w-full font-sans relative">
            
            {/* 💡 RENDER NOTIFICATION NẾU CÓ */}
            {notification && (
                <FullscreenNotification 
                    type={notification.type}
                    title={notification.title}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <FontAwesomeIcon icon={faUserTie} className="text-blue-600" />
                            Quản lý Center Manager
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Quản lý đội ngũ vận hành các trung tâm</p>
                    </div>

                    {/* Filters */}
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

                        {/* CARD ADD NEW */}
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

                        {/* MANAGER CARDS */}
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
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            {/* Sửa kích thước ảnh ở đây */}
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
                                            title={isBanned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                                        >
                                            {isProcessing ? (
                                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                isBanned ? <LockClosedIcon className="w-5 h-5" /> : <LockOpenIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Body */}
                                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center gap-2 overflow-hidden font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                            <IdentificationIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                            <span className="truncate text-blue-700 font-medium" title={manager.username}>@{manager.username}</span>
                                        </div>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <EnvelopeIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                            <span className="truncate" title={manager.email}>{manager.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <PhoneIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                            <span>{manager.phone_number || "---"}</span>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className={`mt-auto pt-3 border-t border-gray-100 flex items-center gap-2 text-xs ${centerInfo.assigned ? 'text-blue-600' : 'text-gray-400'}`}>
                                        <BuildingOfficeIcon className="w-4 h-4" />
                                        <span className="font-medium truncate">{centerInfo.name}</span>
                                    </div>

                                    {/* Hover Hint */}
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
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold">Tài khoản đang bị khóa</span>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="space-y-4">

                                    {/* FIELD USERNAME */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            disabled={!!editingUser}
                                            className={`w-full px-4 py-2 border border-gray-300 rounded-lg outline-none transition-all ${editingUser ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                            placeholder="nguyen_van_a"
                                        />
                                        {!editingUser && <p className="text-xs text-gray-400 mt-1">Định danh duy nhất, dùng để đăng nhập. Không thể đổi sau này.</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tên hiển thị <span className="text-red-500">*</span></label>
                                        <input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ví dụ: Nguyễn Văn A" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email đăng nhập <span className="text-red-500">*</span></label>
                                        <input type="email" required disabled={!!editingUser}
                                            className={`w-full px-4 py-2 border border-gray-300 rounded-lg outline-none ${editingUser ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="manager@example.com" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại</label>
                                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} placeholder="09xxxx" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                {editingUser ? "Mật khẩu mới" : "Mật khẩu *"}
                                            </label>
                                            <input type="password"
                                                required={!editingUser}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                placeholder={editingUser ? "Để trống nếu không đổi" : "••••••••"} />
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