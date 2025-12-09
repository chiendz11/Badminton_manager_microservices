import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, MoreVertical, Phone, Video } from 'lucide-react';
import '../styles/FriendsTab.css'; 

// Mock Data
const MOCK_FRIENDS = [
  { id: 1, name: "Trợ lý AI", avatar: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png", lastMsg: "Tôi có thể giúp gì?", time: "Vừa xong", type: "ai" },
  { id: 2, name: "Minh Quân", avatar: "https://i.pravatar.cc/150?u=2", lastMsg: "Mai đi đá cầu không?", time: "5p", type: "human" },
  { id: 3, name: "Kim Cương", avatar: "https://i.pravatar.cc/150?u=3", lastMsg: "Ok chốt đơn", time: "1h", type: "human" },
];

const FriendsTab = ({ currentUser }) => {
  const [selectedFriend, setSelectedFriend] = useState(MOCK_FRIENDS[0]);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  
  // [SỬA 1]: Đổi tên ref để trỏ vào container thay vì phần tử rỗng
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!selectedFriend) return;
    setMessages([
        { id: 1, sender: 'them', text: `Xin chào, đây là tin nhắn từ ${selectedFriend.name}` },
        { id: 2, sender: 'me', text: 'Chào bạn!' }
    ]);
  }, [selectedFriend]);

  // [SỬA 2]: Logic cuộn mới - Chỉ cuộn nội bộ trong div
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      // Cuộn xuống đáy của container
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth' 
      });
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    setMessages([...messages, { id: Date.now(), sender: 'me', text: inputVal }]);
    setInputVal("");
    
    if (selectedFriend.type === 'ai') {
        setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now()+1, sender: 'them', text: "Tôi đang xử lý yêu cầu của bạn..." }]);
        }, 1000);
    }
  };

  return (
    <div className="friends-tab-container">
      {/* CỘT TRÁI GIỮ NGUYÊN */}
      <div className="friends-sidebar">
        <div className="sidebar-header">
            <h3>Đoạn chat</h3>
            <div className="search-box">
                <Search size={16} />
                <input placeholder="Tìm kiếm tin nhắn..." />
            </div>
        </div>
        <div className="friends-list">
            {MOCK_FRIENDS.map(f => (
                <div 
                    key={f.id} 
                    className={`friend-item ${selectedFriend?.id === f.id ? 'active' : ''}`}
                    onClick={() => setSelectedFriend(f)}
                >
                    <img src={f.avatar} alt="" />
                    <div className="friend-info">
                        <div className="friend-name">{f.name}</div>
                        <div className="friend-last-msg">{f.lastMsg} • {f.time}</div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* CỘT PHẢI */}
      <div className="chat-area">
        {selectedFriend ? (
            <>
                <div className="chat-header">
                    <div className="chat-user-info">
                        <img src={selectedFriend.avatar} alt="" />
                        <div>
                            <h4>{selectedFriend.name}</h4>
                            <span>{selectedFriend.type === 'ai' ? 'Luôn hoạt động' : 'Đang hoạt động'}</span>
                        </div>
                    </div>
                    <div className="chat-actions">
                        <Phone size={20} />
                        <Video size={20} />
                        <MoreVertical size={20} />
                    </div>
                </div>

                {/* [SỬA 3]: Gắn ref vào thẻ div cha (chat-messages) và bỏ thẻ div rỗng ở cuối */}
                <div className="chat-messages" ref={chatContainerRef}>
                    {messages.map(msg => (
                        <div key={msg.id} className={`msg-bubble ${msg.sender === 'me' ? 'me' : 'them'}`}>
                            {msg.text}
                        </div>
                    ))}
                    {/* Đã xóa <div ref={endRef} /> vì không cần nữa */}
                </div>

                <div className="chat-input-wrapper">
                    <input 
                        value={inputVal}
                        onChange={e => setInputVal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Nhập tin nhắn..."
                    />
                    <button onClick={handleSend}><Send size={20} /></button>
                </div>
            </>
        ) : (
            <div className="no-chat-selected">Chọn một người để bắt đầu trò chuyện</div>
        )}
      </div>
    </div>
  );
};

export default FriendsTab;