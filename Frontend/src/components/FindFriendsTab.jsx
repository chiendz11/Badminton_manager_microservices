// src/components/FindFriendsTab.jsx
import React, { useState } from 'react';
import { Search, UserPlus, Check } from 'lucide-react';
import '../styles/FriendsTab.css'; // Dùng chung CSS cho tiện

const MOCK_USERS_DB = [
    { id: 10, name: "Nguyễn Văn A", avatar: "https://i.pravatar.cc/150?u=10", mutual: 5 },
    { id: 11, name: "Trần Thị B", avatar: "https://i.pravatar.cc/150?u=11", mutual: 2 },
    { id: 12, name: "Lê Văn C", avatar: "https://i.pravatar.cc/150?u=12", mutual: 0 },
    { id: 13, name: "Phạm D", avatar: "https://i.pravatar.cc/150?u=13", mutual: 12 },
];

const FindFriendsTab = () => {
  const [keyword, setKeyword] = useState("");
  const [sentRequests, setSentRequests] = useState([]); // Lưu ID những người đã gửi lời mời

  // Filter user theo từ khóa
  const results = MOCK_USERS_DB.filter(u => 
      u.name.toLowerCase().includes(keyword.toLowerCase())
  );

  const handleAddFriend = (id) => {
      // Giả lập gọi API Add Friend
      setSentRequests([...sentRequests, id]);
  };

  return (
    <div className="find-friends-container">
        <div className="find-header">
            <h3>Tìm kiếm bạn bè</h3>
            <div className="big-search-bar">
                <Search className="icon" />
                <input 
                    placeholder="Nhập tên hoặc số điện thoại..." 
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                />
            </div>
        </div>

        <div className="find-results-grid">
            {results.length > 0 ? results.map(user => (
                <div key={user.id} className="user-card">
                    <img src={user.avatar} alt="" />
                    <div className="card-info">
                        <h4>{user.name}</h4>
                        <span>{user.mutual} bạn chung</span>
                        
                        {sentRequests.includes(user.id) ? (
                            <button className="btn-sent" disabled>
                                <Check size={16} /> Đã gửi lời mời
                            </button>
                        ) : (
                            <button className="btn-add" onClick={() => handleAddFriend(user.id)}>
                                <UserPlus size={16} /> Kết bạn
                            </button>
                        )}
                    </div>
                </div>
            )) : (
                <p className="no-result">Không tìm thấy người dùng nào.</p>
            )}
        </div>
    </div>
  );
};

export default FindFriendsTab;