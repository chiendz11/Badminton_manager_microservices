import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Search, ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';
import '../styles/service.css';
import CoinFlip from '../pages/CoinFlip';
import { getInventoryList, createSellHistory } from '../apis/centers';
import { AuthContext } from '../contexts/AuthContext';

const RacketCarousel = () => {
  const [activeCard, setActiveCard] = useState(null);
  const [animationState, setAnimationState] = useState('running');

  const showCard = (index) => {
    setActiveCard(index);
    setAnimationState('paused');
  };

  const closeModal = () => {
    setActiveCard(null);
    setAnimationState('running');
  };

  const images = [
    '/images/racket/vot1.jpg',
    '/images/racket/vot2.webp',
    '/images/racket/vot3.jpg',
    '/images/racket/vot4.jpg',
    '/images/racket/vot5.webp',
    '/images/racket/vot6.jpg',
    '/images/racket/vot7.jpg',
    '/images/racket/vot8.jpg',
    '/images/racket/vot9.webp',
    '/images/racket/vot10.webp'
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="racket-carousel-container" style={{ padding: '30px 0', textAlign: 'center' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '1.5rem', color: '#2e7d32' }}>
        Bộ sưu tập vợt cầu lông
      </h3>
      
      <div className="wrapper" style={{ 
        height: '400px', 
        position: 'relative',
        marginBottom: '30px'
      }}>
        <div 
          className="inner" 
          style={{ 
            animation: `rotating 20s linear infinite`,
            animationPlayState: animationState
          }}
        >
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="card"
              style={{ 
                '--index': index,
                '--color-card': `${142 + (index * 10)}, ${249 - (index * 10)}, ${252 - (index * 20)}`,
                position: 'absolute',
                borderRadius: '12px',
                overflow: 'hidden',
                inset: '0',
                transform: `rotateY(calc((360deg / 10) * ${index})) translateZ(250px)`,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: `rgba(${142 + (index * 10)}, ${249 - (index * 10)}, ${252 - (index * 20)}, 1)`
              }}
              onClick={() => showCard(index)}
            >
              <div 
                className="img" 
                style={{ 
                  width: '100%',
                  height: '100%',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundImage: images[index] ? `url(${images[index]})` : 'none',
                  backgroundColor: images[index] ? 'transparent' : `rgba(${142 + (index * 10)}, ${249 - (index * 10)}, ${252 - (index * 20)}, 0.3)`
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {activeCard !== null && (
        <>
          <div 
            className="modal-overlay" 
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: '900',
              display: 'block'
            }}
            onClick={closeModal}
          />
          
          <div 
            className="card active"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              width: '300px',
              height: '450px',
              zIndex: '999',
              transform: 'translate(-50%, -50%) rotateX(0deg) rotateY(0deg)',
              transition: 'all 0.4s ease',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid',
              borderColor: `rgba(${142 + (activeCard * 10)}, ${249 - (activeCard * 10)}, ${252 - (activeCard * 20)}, 1)`
            }}
          >
            <div 
              className="img" 
              style={{ 
                width: '100%',
                height: '100%',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundImage: images[activeCard] ? `url(${images[activeCard]})` : 'none',
                backgroundColor: images[activeCard] ? 'transparent' : `rgba(${142 + (activeCard * 10)}, ${249 - (activeCard * 10)}, ${252 - (index * 20)}, 0.3)`
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

const Service = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [centerId, setCenterId] = useState(null);
  const [orderDate, setOrderDate] = useState(null);
  const [centerName, setCenterName] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigate = useNavigate();

  const mapCategory = (apiCategory, productName) => {
    if (apiCategory === "Nước giải khát") return "drink";
    if (apiCategory === "Dụng cụ cầu lông") {
      return "badmintonGear";
    }
    if (apiCategory === "Phụ kiện cầu lông") {
      return "accessories";
    }
    return "other";
  };

  const fetchInventory = async (centerId) => {
    try {
      const inventoryData = await getInventoryList({ centerId });
      const mappedProducts = inventoryData.map(item => ({
        id: item._id,
        name: item.name,
        category: mapCategory(item.category, item.name),
        price: item.price,
        image: item.image,
        description: item.description,
        available: item.quantity > 0,
        quantity: item.quantity,
      }));

      const centerNameFromData = inventoryData.length > 0 ? inventoryData[0].centerId.name : "Trung tâm không xác định";
      setCenterName(centerNameFromData);
      setProducts(mappedProducts);
      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu từ API:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedCenterId = localStorage.getItem("orderCenterId");
    const storedDate = localStorage.getItem("orderDate");
    console.log("Stored Center ID:", storedCenterId); // Debug giá trị
    console.log("Stored Date:", storedDate);

    if (!storedCenterId) {
      // Nếu không có centerId trong localStorage, điều hướng về trang chính
      alert("Không tìm thấy thông tin trung tâm. Vui lòng chọn lại trung tâm!");
      navigate('/');
      return;
    }

    setCenterId(storedCenterId);
    setOrderDate(storedDate || "Không có dữ liệu");

    if (storedCenterId) {
      fetchInventory(storedCenterId);
    } else {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    window.history.pushState(null, null, window.location.href);

    const handlePopState = (event) => {
      event.preventDefault();
      navigate('/', { replace: true });
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const calculateEndDate = () => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 100); 
    return endDate;
  };

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const endDate = calculateEndDate();
    
    const updateCountdown = () => {
      const now = new Date();
      const difference = endDate - now;
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      }
    };
    
    const timer = setInterval(updateCountdown, 1000);
    updateCountdown();
    
    return () => clearInterval(timer);
  }, []);

  const formatNumber = (number) => {
    return number < 10 ? `0${number}` : number;
  };

  const categories = [
    { id: 'all', name: 'Tất cả sản phẩm', icon: '📦' },
    { id: 'drink', name: 'Đồ uống', icon: '🥤' },
    { id: 'badmintonGear', name: 'Dụng cụ cầu lông', icon: '/images/cau.png' },
    { id: 'accessories', name: 'Phụ kiện cầu lông', icon: '👟' }
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    let results = products;
    
    if (selectedCategory !== 'all') {
      results = results.filter(product => product.category === selectedCategory);
    }
    
    if (searchTerm) {
      results = results.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredProducts(results);
  }, [selectedCategory, searchTerm, products]);

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const addToCart = (product) => {
    const productInStock = products.find(p => p.id === product.id);
    const existingItem = cart.find(item => item.id === product.id);
    let newQuantity = 1;

    if (existingItem) {
      newQuantity = existingItem.quantity + 1;
      if (newQuantity > productInStock.quantity) {
        alert(`Số lượng trong kho không đủ! Chỉ còn ${productInStock.quantity} ${product.name}.`);
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: newQuantity } 
          : item
      ));
    } else {
      if (productInStock.quantity < 1) {
        alert(`Sản phẩm ${product.name} đã hết hàng!`);
        return;
      }
      setCart([...cart, { 
        id: product.id, 
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
        category: product.category
      }]);
    }
    
    setCartOpen(true);
  };

  const updateQuantity = (id, amount) => {
    const productInStock = products.find(p => p.id === id);
    const item = cart.find(item => item.id === id);
    const newQuantity = item.quantity + amount;

    if (newQuantity <= 0) {
      return;
    }

    if (newQuantity > productInStock.quantity) {
      alert(`Số lượng trong kho không đủ! Chỉ còn ${productInStock.quantity} ${item.name}.`);
      return;
    }

    setCart(cart.map(item => 
      item.id === id 
        ? { ...item, quantity: newQuantity } 
        : item
    ));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace('₫', 'đ');
  };

  const handleCheckout = () => {
    if (!user) {
      alert("Bạn cần đăng nhập để đặt hàng!");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmCheckout = async () => {
    if (!user || !user.name) {
      alert("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại!");
      setShowConfirmModal(false);
      return;
    }

    if (!centerId) {
      alert("Không có thông tin trung tâm. Vui lòng thử lại!");
      setShowConfirmModal(false);
      return;
    }

    for (const item of cart) {
      const productInStock = products.find(p => p.id === item.id);
      if (item.quantity > productInStock.quantity) {
        alert(`Số lượng trong kho không đủ! Chỉ còn ${productInStock.quantity} ${item.name}.`);
        setShowConfirmModal(false);
        return;
      }
    }

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      
      const payload = {
        invoiceNumber,
        centerId,
        items: cart.map(item => ({
          inventoryId: item.id,
          quantity: item.quantity,
          unitPrice: item.price
        })),
        totalAmount: cartTotal,
        paymentMethod: "Cash",
        customer: user.name
      };

      const result = await createSellHistory(payload);
      
      alert("Đặt hàng thành công!");
      console.log("Hóa đơn:", result);
      
      setCart([]);
      setCartOpen(false);
      setShowConfirmModal(false);

      await fetchInventory(centerId);

      // Xóa localStorage sau khi đặt hàng thành công
      localStorage.removeItem("orderCenterId");
      localStorage.removeItem("orderDate");

      navigate('/');
    } catch (error) {
      alert("Lỗi khi tạo hóa đơn: " + error.message);
      setShowConfirmModal(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h3>Đang tải dữ liệu...</h3>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="service-page">
        <div className="promotion-banner">
          <div className="container">
            <div className="promotion-content">
              <div className="promotion-info">
                <h1>Dịch Vụ & Sản Phẩm</h1>
                <p>Cung cấp các sản phẩm và dịch vụ thuê chất lượng cao cho người chơi cầu lông</p>
                <p>
                  Bạn đang đặt đồ cho trung tâm có ID: <strong>{centerId}</strong>, ngày chơi: <strong>{orderDate}</strong>
                </p>
                <div className="discount-badge">Giảm giá lên đến 50%</div>
              </div>
              
              {cartOpen && <CoinFlip />}
              
              <div className="countdown-container">
                <h3 
                  style={{
                    color: '#e50914',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    fontSize: '1.3rem',
                    letterSpacing: '1px',
                    textShadow: '2px 2px 6px rgba(0, 0, 0, 0.4)',
                    marginBottom: '10px'
                  }}
                >
                  Ưu đãi kết thúc sau:
                </h3>
                <div className="countdown-timer">
                  <div className="countdown-item">
                    <div className="countdown-digit">{formatNumber(timeLeft.days)}</div>
                    <div className="countdown-label">Ngày</div>
                  </div>
                  <div className="countdown-item">
                    <div className="countdown-digit">{formatNumber(timeLeft.hours)}</div>
                    <div className="countdown-label">Giờ</div>
                  </div>
                  <div className="countdown-item">
                    <div className="countdown-digit">{formatNumber(timeLeft.minutes)}</div>
                    <div className="countdown-label">Phút</div>
                  </div>
                  <div className="countdown-item">
                    <div className="countdown-digit">{formatNumber(timeLeft.seconds)}</div>
                    <div className="countdown-label">Giây</div>
                  </div>
                </div>
                <button className="shop-now-btn">Mua ngay</button>
              </div>
            </div>
          </div>
          <div className="promotion-overlay"></div>
        </div>

        <div className="container service-container">
          <div className="search-cart-container">
            <div className="search-box">
              <Search size={20} />
              <input 
                type="text" 
                placeholder="Tìm kiếm sản phẩm..." 
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>

            <div className="cart-icon-container">
              <button className="cart-button" onClick={() => setCartOpen(true)}>
                <ShoppingCart size={22} />
                <span className="cart-count">{cart.length}</span>
              </button>
            </div>
          </div>

          <div className="service-layout">
            <div className="categories-sidebar">
              <h3>Danh mục sản phẩm của {centerName}</h3>
              <ul className="category-list">
                {categories.map(category => (
                  <li key={category.id}>
                    <button
                      className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
                      onClick={() => handleCategoryChange(category.id)}
                    >
                      {category.icon.includes('/') ? (
                        <img
                          src={category.icon}
                          alt={category.name}
                          className="category-icon"
                        />
                      ) : (
                        <span className="category-icon">{category.icon}</span>
                      )}
                      <span className="category-name">{category.name}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="sidebar-promo">
                <h4>Ưu đãi đặc biệt</h4>
                <p>Giảm 50% cho đơn hàng trên 200 nghìn đồng</p>
                <button className="promo-button">Xem ngay</button>
              </div>
            </div>

            <div className="products-main">
              {selectedCategory === 'badmintonGear' && <RacketCarousel />}
              
              {selectedCategory === 'accessories' && (
                <div 
                  style={{
                    backgroundColor: '#f0fdf4',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    borderLeft: '5px solid #34a853',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', color: '#34a853' }}></div>
                  <div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '1rem', 
                      color: '#1b1b1b', 
                      lineHeight: '1.6' 
                    }}>
                      <strong style={{ color: '#2e7d32' }}>Lưu ý:</strong> Chúng tôi có đầy đủ các loại size giày từ <strong>36 đến 43</strong>. Bạn có thể đến chọn size phù hợp trực tiếp tại quầy!
                    </p>
                  </div>
                </div>
              )}

              <div className="products-grid">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <div className="product-card" key={product.id}>
                      <div className="product-image">
                        <img src={product.image || '/images/placeholder.jpg'} alt={product.name} />
                        <div className="product-overlay">
                          <button 
                            className="add-to-cart-btn" 
                            onClick={() => addToCart(product)}
                            disabled={!product.available}
                          >
                            {product.available ? "Thêm vào giỏ" : "Hết hàng"}
                          </button>
                        </div>
                      </div>
                      <div className="product-info">
                        <h3 className="product-name">{product.name}</h3>
                        <div className="product-category">{categories.find(c => c.id === product.category)?.name}</div>
                        <p className="product-description">{product.description}</p>
                        <div className="product-price">{formatCurrency(product.price)}</div>
                        <div className="product-quantity" style={{ color: product.quantity > 0 ? '#2e7d32' : '#e50914', fontWeight: 'bold' }}>
                          Số lượng còn lại: {product.quantity}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-products">
                    <img src="/images/icons/empty-box.png" alt="Không có sản phẩm" />
                    <h3>Không tìm thấy sản phẩm</h3>
                    <p>Vui lòng thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`cart-sidebar ${cartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h3>Giỏ hàng của bạn</h3>
          <button className="close-cart" onClick={() => setCartOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="cart-items">
          {cart.length > 0 ? (
            cart.map(item => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item-image">
                  <img src={item.image || '/images/placeholder.jpg'} alt={item.name} />
                </div>
                <div className="cart-item-details">
                  <h4>{item.name}</h4>
                  <p className="cart-item-price">{formatCurrency(item.price)}</p>
                  <div className="cart-item-quantity">
                    <button onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1}>
                      <Minus size={16} />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}>
                      <Plus size={16} />
                    </button>
                    <button className="remove-item" onClick={() => removeFromCart(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-cart">
              <img src="/images/icons/empty-cart.png" alt="Giỏ hàng trống" />
              <p>Giỏ hàng của bạn đang trống</p>
              <button className="continue-shopping" onClick={() => setCartOpen(false)}>
                Tiếp tục mua sắm
              </button>
            </div>
          )}
        </div>
        
        {cart.length > 0 && (
          <div className="cart-footer">
            <div 
              style={{
                backgroundColor: '#fff3cd',
                padding: '10px',
                borderRadius: '5px',
                marginBottom: '10px',
                borderLeft: '4px solid #ffca28',
                color: '#856404',
                fontSize: '0.9rem'
              }}
            >
              <strong>Lưu ý:</strong> Hiện tại chưa hỗ trợ thanh toán banking nên quý khách vui lòng đến sân thanh toán.
            </div>
            <div className="cart-total">
              <span>Tổng cộng:</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            <button
              className="checkout-button"
              onClick={handleCheckout}
            >
              Thanh toán ngay
            </button>
            <button className="continue-shopping" onClick={() => setCartOpen(false)}>
              Tiếp tục mua sắm
            </button>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <>
          <div 
            className="modal-overlay" 
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: '900',
              display: 'block'
            }}
            onClick={() => setShowConfirmModal(false)}
          />
          <div 
            className="confirm-modal"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              zIndex: '1000',
              width: '300px',
              textAlign: 'center'
            }}
          >
            <h3 style={{ marginBottom: '20px' }}>Xác nhận đặt hàng</h3>
            <p>Bạn có chắc chắn muốn đặt hàng không?</p>
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={confirmCheckout}
                style={{
                  backgroundColor: '#34a853',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  marginRight: '10px',
                  cursor: 'pointer'
                }}
              >
                Xác nhận
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  backgroundColor: '#e50914',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </>
      )}
      
      {cartOpen && <div className="cart-overlay" onClick={() => setCartOpen(false)}></div>}
      
      <Footer />
    </>
  );
};

export default Service;