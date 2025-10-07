import React from "react";
import { FaArrowLeft } from "react-icons/fa";

/**
 * AppHeader
 * @param {string} title - Tiêu đề hiển thị ở giữa header
 * @param {function} onBack - Callback khi nhấn nút mũi tên bên trái
 */
const BookingHeader = ({ title, onBack }) => {
  return (
    <header className="relative h-16 bg-green-800 flex items-center justify-center px-4 flex-shrink-0">
      <button
        className="absolute left-4 text-white"
        onClick={onBack}
      >
        <FaArrowLeft className="text-3xl font-bold" />
      </button>
      <h1 className="text-3xl font-bold font-mono" style={{ color: "#fff" }}>
        {title}
      </h1>
    </header>
  );
};

export default BookingHeader;