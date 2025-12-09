import React, { useState, useEffect } from "react";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockClosedIcon,
  LockOpenIcon
} from "@heroicons/react/24/outline";
import { getAllUsers } from "../apiV2/user_service/rest/user.api"; 
import { updateUserStatus } from "../apiV2/auth_service/rest/user.api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  faDumbbell, faCoins, faMedal, faTrophy, faGem, faCrown, faSort
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router-dom";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function UserManage() {
  const navigate = useNavigate();

  // 1. DATA STATE
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 2. FILTER & PAGINATION STATE
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState(null); 
  
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounce(searchValue, 500); 
  
  const [rankFilter, setRankFilter] = useState("");
  const [sortName, setSortName] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); 

  // 3. HÀM FETCH DATA
  const fetchUsersData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        role: 'USER',
        search: debouncedSearch,
        level: rankFilter === "Tất cả" ? "" : rankFilter,
        sort: sortName === "none" ? "" : "name",
        order: sortName === "desc" ? "desc" : "asc",
        isActive: statusFilter
      };

      const response = await getAllUsers(params);

      if (response.success) {
        setCustomers(response.data);
        setPagination(response.pagination);
        setError(null);
      } else {
        setError(response.message);
        toast.error(response.message);
      }
    } catch (err) {
      setError("Lỗi kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, rankFilter, sortName, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, rankFilter, sortName, statusFilter]);

  // 4. HANDLERS
  
  // 💡 OPTIMISTIC UPDATE HANDLER (Logic quan trọng cho Eventual Consistency)
  const handleToggleStatus = async (user) => {
  const newStatus = !user.isActive; 
  const actionText = newStatus ? "MỞ KHÓA" : "KHÓA"; 
  
  if (!window.confirm(`Xác nhận ${actionText} tài khoản ${user.name}?`)) return;

  const previousCustomers = [...customers];

  const updatedCustomers = customers.map(c => 
      (c.userId === user.userId || c._id === user._id) 
          ? { ...c, isActive: newStatus } 
          : c
  );
  setCustomers(updatedCustomers);

  try {
    await updateUserStatus(user.userId || user._id, newStatus);
    toast.success(`Đã ${actionText.toLowerCase()} thành công!`);
  } catch (error) {
    setCustomers(previousCustomers);
    toast.error(`Lỗi: Không thể ${actionText.toLowerCase()} tài khoản.`);
  }
};

  const getLevelIcon = (level) => {
    switch (level?.toLowerCase()) {
        case "sắt": return <FontAwesomeIcon icon={faDumbbell} className="ml-1" />;
        case "đồng": return <FontAwesomeIcon icon={faCoins} className="ml-1" />;
        case "bạc": return <FontAwesomeIcon icon={faMedal} className="ml-1" />;
        case "vàng": return <FontAwesomeIcon icon={faTrophy} className="ml-1" />;
        case "bạch kim": return <FontAwesomeIcon icon={faGem} className="ml-1" />;
        default: return null;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen w-full">
      <div className="bg-white w-full shadow-md overflow-hidden flex flex-col min-h-screen">
        
        {/* HEADER */}
        <div className="bg-green-700 text-white flex items-center p-3 shrink-0">
          <button onClick={() => navigate("/dashboard")} className="mr-2">
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold flex-1 text-center">
            Quản lý Khách hàng (User)
          </h1>
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center p-3 bg-white border-b space-x-2 shrink-0 flex-wrap gap-y-2">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-2 top-2.5" />
            <input
              type="text"
              className="pl-9 pr-3 py-2 w-full border rounded-md text-sm focus:outline-none focus:border-green-500"
              placeholder="Tìm tên, email, sđt..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <div className="relative">
             <FontAwesomeIcon icon={faCrown} className="text-gray-400 absolute left-2 top-2.5 text-xs" />
             <select 
                value={rankFilter} 
                onChange={(e) => setRankFilter(e.target.value)}
                className="pl-7 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:border-green-500 bg-white"
             >
                <option value="">Tất cả hạng</option>
                <option value="Sắt">Sắt</option>
                <option value="Đồng">Đồng</option>
                <option value="Bạc">Bạc</option>
                <option value="Vàng">Vàng</option>
                <option value="Bạch kim">Bạch kim</option>
             </select>
          </div>

          <div className="relative">
             <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:border-green-500 bg-white"
             >
                <option value="">Mọi trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã bị khóa</option>
             </select>
          </div>

          <div className="relative">
             <FontAwesomeIcon icon={faSort} className="text-gray-400 absolute left-2 top-2.5 text-sm" />
             <select 
                value={sortName} 
                onChange={(e) => setSortName(e.target.value)}
                className="pl-8 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:border-green-500 bg-white"
             >
                <option value="none">Mặc định</option>
                <option value="asc">Tên A-Z</option>
                <option value="desc">Tên Z-A</option>
             </select>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="bg-white flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40 text-gray-500">
                Đang tải dữ liệu...
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">{error}</div>
          ) : (
            <div className="min-w-full inline-block align-middle">
                <table className="w-full table-auto text-sm">
                <thead className="border-b bg-gray-50 sticky top-0 z-10">
                    <tr className="text-left text-gray-700">
                    <th className="py-2 px-3 w-16">STT</th>
                    <th className="py-2 px-3">Tên</th>
                    <th className="py-2 px-3">Hạng</th>
                    <th className="py-2 px-3">Số điện thoại</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Điểm</th>
                    <th className="py-2 px-3 text-center">Trạng thái</th>
                    <th className="py-2 px-3 text-center">Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {customers.length === 0 ? (
                    <tr>
                        <td colSpan="8" className="text-center py-10 text-gray-500 italic">
                        Không tìm thấy khách hàng nào phù hợp.
                        </td>
                    </tr>
                    ) : (
                    customers.map((item, index) => (
                        <tr 
                            key={item._id || item.userId} 
                            // Tô màu nền đỏ nhạt nếu bị khóa
                            className={`border-b last:border-0 hover:bg-gray-50 ${!item.isActive ? 'bg-red-50' : ''}`}
                        >
                        <td className="py-2 px-3">{(page - 1) * limit + index + 1}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">{item.name}</td>
                        <td className="py-2 px-3">
                            <span className="inline-flex items-center bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 text-xs capitalize">
                            {item.level || 'Chưa xếp hạng'} {getLevelIcon(item.level)}
                            </span>
                        </td>
                        <td className="py-2 px-3 text-gray-600">{item.phone_number || "---"}</td>
                        <td className="py-2 px-3 text-gray-600">{item.email}</td>
                        <td className="py-2 px-3 font-semibold text-green-600">{item.points}</td>
                        
                        {/* BADGE TRẠNG THÁI */}
                        <td className="py-2 px-3 text-center">
                            {item.isActive ? (
                                <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full border border-green-200">
                                    Hoạt động
                                </span>
                            ) : (
                                <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full border border-red-200">
                                    Đã khóa
                                </span>
                            )}
                        </td>

                        <td className="py-2 px-3 text-center">
                            {/* Nút KHÓA/MỞ KHÓA (Nổi bật & Duy nhất) */}
                            <button 
                                onClick={() => handleToggleStatus(item)}
                                title={item.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                                className={`inline-flex items-center justify-center p-2 rounded-full transition-colors border shadow-sm ${
                                    item.isActive 
                                    ? 'bg-white text-red-500 border-gray-200 hover:bg-red-50 hover:border-red-200' 
                                    : 'bg-green-100 text-green-600 border-green-200 hover:bg-green-200'
                                }`}
                            >
                                {item.isActive ? (
                                    <LockClosedIcon className="h-5 w-5" /> 
                                ) : (
                                    <LockOpenIcon className="h-5 w-5" />
                                )}
                            </button>
                        </td>
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
            </div>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 bg-white border-t shrink-0">
                <div className="text-sm text-gray-600">
                    Trang <span className="font-bold text-gray-900">{pagination.page}</span> / {pagination.totalPages} 
                    <span className="mx-2">|</span>
                    Tổng <span className="font-bold text-gray-900">{pagination.totalDocs}</span> kết quả
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={!pagination.hasPrevPage}
                        className={`px-3 py-1 border rounded flex items-center ${
                            !pagination.hasPrevPage 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                        <ChevronLeftIcon className="h-4 w-4 mr-1" /> Trước
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={!pagination.hasNextPage}
                        className={`px-3 py-1 border rounded flex items-center ${
                            !pagination.hasNextPage 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'hover:bg-green-600 hover:text-white text-gray-700 border-gray-300'
                        }`}
                    >
                        Sau <ChevronRightIcon className="h-4 w-4 ml-1" />
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}

export default UserManage;