import axiosInstance from "../config/axiosConfig";

// Đăng ký người dùng
export const registerUser = async (userData) => {
  try {
    const response = await axiosInstance.post("/api/users/register", userData);
    console.log("Đăng ký thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi đăng ký:", error.response?.data || error.message);
    throw error;
  }
};


const getCsrfToken = async () => {
  try {
    const response = await axiosInstance.get('/api/csrf-token');
    const csrfToken = response.data.csrfToken;
    console.log('CSRF Token fetched:', csrfToken); // Log rõ ràng hơn
    localStorage.setItem('csrfToken', csrfToken);
    return csrfToken;
  } catch (error) {
    console.error("Error fetching CSRF token:", error.response?.data || error.message);
    throw error;
  }
};

// Đăng nhập người dùng
export const loginUser = async ({ username, password }) => {
  try {
    // Gửi request đăng nhập trước
    const response = await axiosInstance.post('/api/users/login', {
      username,
      password
    });

    console.log("Login successful, fetching new CSRF token...");
    await getCsrfToken();

    return response.data;
  } catch (error) {
    console.error("Error logging in:", error.response?.data || error.message);
    throw error;
  }
};
// Lấy thông tin người dùng
export const fetchUserInfo = async () => {
  try {
    const response = await axiosInstance.get("/api/users/me");
    return response.data;
  } catch (error) {
    console.error("Error fetching user info:", error.response?.data || error.message);
    throw error;
  }
};

// Đăng xuất người dùng
export const logoutUser = async () => {
  try {
    const response = await axiosInstance.post('/api/users/logout', {});
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Cập nhật thông tin người dùng
export const updateUserInfo = async (payload) => {
  try {
    let config = {};
    if (payload instanceof FormData) {
      config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };
    } else {
      config = {
        headers: {
          "Content-Type": "application/json",
        },
      };
    }
    const response = await axiosInstance.put("/api/users/update", payload, config);
    return response.data;
  } catch (error) {
    console.error("Error updating user info:", error.response?.data || error.message);
    throw error.response?.data || error; // Ensure error details are passed
  }
};

// Cập nhật mật khẩu người dùng
export const updateUserPassword = async (payload) => {
  try {
    const response = await axiosInstance.put("/api/users/change-password", payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Lấy dữ liệu biểu đồ
export const getChartData = async () => {
  try {
    const response = await axiosInstance.get("/api/users/get-chart");
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Lấy thống kê đặt sân chi tiết
export const getDetailedBookingStats = async (period = "month") => {
  try {
    const response = await axiosInstance.get(`/api/users/detailed-stats?period=${period}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Quên mật khẩu qua email
export const forgotPasswordByEmailSimpleApi = async (email) => {
  try {
    const response = await axiosInstance.post("/api/users/forgot-password-email", { email });
    return response.data;
  } catch (error) {
    console.error("Lỗi yêu cầu quên mật khẩu:", error.response?.data || error.message);
    throw error;
  }
};

// Đặt lại mật khẩu từ liên kết
export const resetPasswordApi = async (token, userId, newPassword) => {
  try {
    const response = await axiosInstance.post(
      `/api/users/reset-password/${token}/${userId}`,
      { newPassword }
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu:", error.response?.data || error.message);
    throw error;
  }
}


// Gửi đánh giá
export const submitRating = async (ratingData) => {
  try {
    const response = await axiosInstance.post("/api/users/insert-ratings", ratingData);
    return response.data;
  } catch (error) {
    throw error.response && error.response.data.message
      ? error.response.data.message
      : error.message;
  }
};
