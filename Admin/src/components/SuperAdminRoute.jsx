import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext.jsx'; 
import { Navigate, Outlet } from 'react-router-dom';
// 💡 1. IMPORT FILE CONSTANTS MỚI
import { ROLES } from '../constants/roles.js';

const SuperAdminRoute = () => {
    const { admin } = useContext(AuthContext); 

    if (!admin) return null; 

    // 💡 2. SỬ DỤNG HẰNG SỐ (CONSTANTS)
    if (admin.role !== ROLES.SUPER_ADMIN) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default SuperAdminRoute;