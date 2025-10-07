import React, { useState } from 'react';

const EditableInfoCard = ({ label, value, onConfirm }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleButtonClick = () => {
    if (isEditing) {
      // Khi nhấn xác nhận, gọi hàm onConfirm với giá trị mới
      onConfirm(tempValue);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  // Tạo một ID hợp lý dựa trên label để đảm bảo tính duy nhất
  // Ví dụ: "Họ và tên" -> "ho-va-ten"
  const sanitizedLabel = label.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

  return (
    <div id={`${sanitizedLabel}-info-card`} className="info-card enhanced">
      <div id={`${sanitizedLabel}-label`} className="info-label">{label}</div>
      <div className="info-value">
        {isEditing ? (
          <input
            id={`${sanitizedLabel}-input`} // ID cho ô input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
          />
        ) : (
          <span id={`${sanitizedLabel}-display-value`}>{value}</span> // ID cho giá trị hiển thị
        )}
      </div>
      <button
        id={`${sanitizedLabel}-${isEditing ? 'confirm' : 'edit'}-button`} // ID thay đổi dựa trên trạng thái
        className="edit-info-btn"
        title={isEditing ? "Xác nhận" : "Chỉnh sửa"}
        onClick={handleButtonClick}
      >
        <i className={`fas ${isEditing ? "fa-check" : "fa-pen"}`}></i>
      </button>
    </div>
  );
};

export default EditableInfoCard;