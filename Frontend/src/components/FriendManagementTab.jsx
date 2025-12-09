// src/components/FriendManagementTab.jsx
import React, { useState } from 'react';
import { UserCheck, UserX, MessageCircle, X, Check } from 'lucide-react';

// MOCK DATA
const INITIAL_FRIENDS = [
    { id: 1, name: "Minh Quân", avatar: "https://i.pravatar.cc/150?u=2", mutual: 5 },
    { id: 2, name: "Kim Cương", avatar: "https://i.pravatar.cc/150?u=3", mutual: 12 },
];

const INITIAL_REQUESTS = [
    { id: 3, name: "Trần Văn C", avatar: "https://i.pravatar.cc/150?u=4", time: "2 giờ trước" },
    { id: 4, name: "Lê Thị D", avatar: "https://i.pravatar.cc/150?u=5", time: "1 ngày trước" },
];

const FriendManagementTab = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'requests'
  const [friends, setFriends] = useState(INITIAL_FRIENDS);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);

  // --- ACTIONS ---
  const handleUnfriend = (id) => {
      if(window.confirm("Bạn có chắc chắn muốn hủy kết bạn?")) {
          // Call API Unfriend
          setFriends(friends.filter(f => f.id !== id));
      }
  };

  const handleAccept = (id) => {
      // Call API Accept
      const newFriend = requests.find(r => r.id === id);
      setFriends([...friends, { ...newFriend, mutual: 0 }]); // Move to friends list
      setRequests(requests.filter(r => r.id !== id));
  };

  const handleReject = (id) => {
      // Call API Reject
      setRequests(requests.filter(r => r.id !== id));
  };

  return (
    <div className="friend-manage-container" style={{ background: 'white', borderRadius: '8px', minHeight: '500px', overflow: 'hidden' }}>
      
      {/* SUB TABS HEADER */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          <button 
            onClick={() => setActiveSubTab('list')}
            style={{ 
                flex: 1, padding: '15px', background: activeSubTab === 'list' ? '#f0f8ff' : 'white',
                border: 'none', borderBottom: activeSubTab === 'list' ? '2px solid #0084ff' : 'none',
                fontWeight: 'bold', color: activeSubTab === 'list' ? '#0084ff' : '#555', cursor: 'pointer'
            }}
          >
            Danh sách bạn bè ({friends.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('requests')}
            style={{ 
                flex: 1, padding: '15px', background: activeSubTab === 'requests' ? '#f0f8ff' : 'white',
                border: 'none', borderBottom: activeSubTab === 'requests' ? '2px solid #0084ff' : 'none',
                fontWeight: 'bold', color: activeSubTab === 'requests' ? '#0084ff' : '#555', cursor: 'pointer'
            }}
          >
            Lời mời kết bạn <span style={{ background: 'red', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', marginLeft: '5px' }}>{requests.length}</span>
          </button>
      </div>

      {/* BODY CONTENT */}
      <div style={{ padding: '20px' }}>
        
        {/* === DANH SÁCH BẠN BÈ === */}
        {activeSubTab === 'list' && (
            <div className="friends-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {friends.length > 0 ? friends.map(friend => (
                    <div key={friend.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src={friend.avatar} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 5px 0' }}>{friend.name}</h4>
                            <span style={{ fontSize: '13px', color: '#888' }}>{friend.mutual} bạn chung</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                             {/* Nút nhắn tin */}
                            <button style={{ border: 'none', background: '#eef5ff', color: '#0084ff', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>
                                <MessageCircle size={18} />
                            </button>
                            {/* Nút hủy kết bạn */}
                            <button 
                                onClick={() => handleUnfriend(friend.id)}
                                style={{ border: 'none', background: '#ffebeb', color: '#e74c3c', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                                title="Hủy kết bạn"
                            >
                                <UserX size={18} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <p style={{ color: '#888', gridColumn: '1/-1', textAlign: 'center', marginTop: '50px' }}>Chưa có bạn bè nào.</p>
                )}
            </div>
        )}

        {/* === LỜI MỜI KẾT BẠN === */}
        {activeSubTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {requests.length > 0 ? requests.map(req => (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f5f5f5', paddingBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <img src={req.avatar} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%' }} />
                            <div>
                                <h4 style={{ margin: '0 0 5px 0' }}>{req.name}</h4>
                                <span style={{ fontSize: '13px', color: '#888' }}>Đã gửi {req.time}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={() => handleAccept(req.id)}
                                style={{ 
                                    background: '#0084ff', color: 'white', border: 'none', 
                                    padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}
                            >
                                <Check size={16} /> Đồng ý
                            </button>
                            <button 
                                onClick={() => handleReject(req.id)}
                                style={{ 
                                    background: '#f0f2f5', color: '#333', border: 'none', 
                                    padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' 
                                }}
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                )) : (
                     <p style={{ color: '#888', textAlign: 'center', marginTop: '50px' }}>Không có lời mời kết bạn nào.</p>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default FriendManagementTab;