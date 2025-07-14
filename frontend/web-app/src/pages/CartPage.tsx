import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CartPage.css';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    price: number;
    stockQuantity: number;
    image: string;
    inStock: boolean;
  };
}

interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
}

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('/api/v1/cart', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCart(data.data.cart);
      } else {
        throw new Error(data.message || 'Failed to fetch cart');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (productId: string, newQuantity: number) => {
    try {
      setUpdatingItems(prev => new Set(prev).add(productId));

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/cart/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          quantity: newQuantity,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCart(data.data.cart);
      } else {
        throw new Error(data.message || 'Failed to update cart');
      }
    } catch (err) {
      console.error('Error updating cart item:', err);
      alert(err instanceof Error ? err.message : 'Failed to update cart item');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const removeFromCart = async (productId: string) => {
    const confirmed = window.confirm('Bu mahsulotni savatdan o\'chirmoqchimisiz?');
    if (!confirmed) return;

    try {
      setUpdatingItems(prev => new Set(prev).add(productId));

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/cart/remove/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCart(data.data.cart);
      } else {
        throw new Error(data.message || 'Failed to remove item');
      }
    } catch (err) {
      console.error('Error removing cart item:', err);
      alert(err instanceof Error ? err.message : 'Failed to remove item');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const clearCart = async () => {
    const confirmed = window.confirm('Savatdagi barcha mahsulotlarni o\'chirmoqchimisiz?');
    if (!confirmed) return;

    try {
      setLoading(true);

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/cart/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCart({ ...cart!, items: [], totalItems: 0, totalAmount: 0 });
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
      alert(err instanceof Error ? err.message : 'Failed to clear cart');
    } finally {
      setLoading(false);
    }
  };

  const validateCartForCheckout = async () => {
    try {
      setIsValidating(true);

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/cart/validate', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        if (data.data.valid) {
          navigate('/checkout');
        } else {
          const errors = data.data.errors.join('\n');
          alert(`Savatni tekshirishda muammolar topildi:\n\n${errors}\n\nIltimos, muammolarni hal qiling va qayta urinib ko'ring.`);
          
          // Refresh cart to get updated data
          await fetchCart();
        }
      }
    } catch (err) {
      console.error('Error validating cart:', err);
      alert(err instanceof Error ? err.message : 'Failed to validate cart');
    } finally {
      setIsValidating(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  const calculateTax = (amount: number) => {
    return amount * 0.12; // 12% VAT
  };

  const calculateShipping = (amount: number) => {
    return amount > 500000 ? 0 : 25000; // Free shipping over 500,000 som
  };

  if (loading) {
    return (
      <div className="cart-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Savat yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-page">
        <div className="error-container">
          <h2>Xatolik yuz berdi</h2>
          <p>{error}</p>
          <button onClick={fetchCart} className="retry-button">
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Savatingiz bo'sh</h2>
          <p>Hozircha hech qanday mahsulot qo'shmagansiz</p>
          <button onClick={() => navigate('/products')} className="continue-shopping-button">
            Xarid qilishni davom eting
          </button>
        </div>
      </div>
    );
  }

  const subtotal = cart.totalAmount;
  const tax = calculateTax(subtotal);
  const shipping = calculateShipping(subtotal);
  const total = subtotal + tax + shipping;

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Xarid savati</h1>
        <div className="cart-actions">
          <button onClick={() => navigate('/products')} className="continue-shopping">
            Xaridni davom eting
          </button>
          {cart.items.length > 0 && (
            <button onClick={clearCart} className="clear-cart">
              Savatni tozalash
            </button>
          )}
        </div>
      </div>

      <div className="cart-container">
        <div className="cart-items">
          <div className="cart-items-header">
            <h3>Mahsulotlar ({cart.totalItems})</h3>
          </div>

          <div className="cart-items-list">
            {cart.items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img src={item.product.image} alt={item.product.name} />
                  {!item.product.inStock && (
                    <div className="out-of-stock-overlay">
                      Tugagan
                    </div>
                  )}
                </div>

                <div className="item-details">
                  <h4 className="item-name">{item.product.name}</h4>
                  <div className="item-availability">
                    {item.product.inStock ? (
                      <span className="in-stock">
                        ✅ Mavjud ({item.product.stockQuantity} ta qoldi)
                      </span>
                    ) : (
                      <span className="out-of-stock">❌ Tugagan</span>
                    )}
                  </div>
                  
                  {item.quantity > item.product.stockQuantity && (
                    <div className="stock-warning">
                      ⚠️ Faqat {item.product.stockQuantity} ta mavjud
                    </div>
                  )}
                  
                  {item.price !== item.product.price && (
                    <div className="price-change-warning">
                      ⚠️ Narx o'zgargan: {formatPrice(item.product.price)}
                    </div>
                  )}
                </div>

                <div className="item-price">
                  <span className="current-price">{formatPrice(item.price)}</span>
                  {item.price !== item.product.price && (
                    <span className="new-price">{formatPrice(item.product.price)}</span>
                  )}
                </div>

                <div className="item-quantity">
                  <button
                    onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                    disabled={updatingItems.has(item.productId) || item.quantity <= 1}
                    className="quantity-button"
                  >
                    -
                  </button>
                  
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const newQuantity = parseInt(e.target.value);
                      if (!isNaN(newQuantity) && newQuantity > 0 && newQuantity <= 50) {
                        updateCartItem(item.productId, newQuantity);
                      }
                    }}
                    min="1"
                    max="50"
                    disabled={updatingItems.has(item.productId)}
                    className="quantity-input"
                  />
                  
                  <button
                    onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                    disabled={
                      updatingItems.has(item.productId) || 
                      item.quantity >= item.product.stockQuantity ||
                      item.quantity >= 50
                    }
                    className="quantity-button"
                  >
                    +
                  </button>
                </div>

                <div className="item-total">
                  {formatPrice(item.quantity * item.price)}
                </div>

                <button
                  onClick={() => removeFromCart(item.productId)}
                  disabled={updatingItems.has(item.productId)}
                  className="remove-button"
                  title="Savatdan o'chirish"
                >
                  🗑️
                </button>

                {updatingItems.has(item.productId) && (
                  <div className="item-updating-overlay">
                    <div className="updating-spinner"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="cart-summary">
          <div className="summary-card">
            <h3>Buyurtma xulosasi</h3>

            <div className="summary-line">
              <span>Mahsulotlar ({cart.totalItems} ta):</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div className="summary-line">
              <span>QQS (12%):</span>
              <span>{formatPrice(tax)}</span>
            </div>

            <div className="summary-line">
              <span>Yetkazib berish:</span>
              <span>
                {shipping === 0 ? (
                  <span className="free-shipping">Bepul</span>
                ) : (
                  formatPrice(shipping)
                )}
              </span>
            </div>

            {shipping > 0 && (
              <div className="shipping-info">
                <small>
                  💡 {formatPrice(500000 - subtotal)} qo'shsangiz, bepul yetkazib berish!
                </small>
              </div>
            )}

            <div className="summary-divider"></div>

            <div className="summary-total">
              <span>Jami:</span>
              <span className="total-amount">{formatPrice(total)}</span>
            </div>

            <button
              onClick={validateCartForCheckout}
              disabled={isValidating || cart.items.length === 0}
              className="checkout-button"
            >
              {isValidating ? 'Tekshirilmoqda...' : 'Checkout ga o\'tish'}
            </button>

            <div className="payment-methods">
              <h4>Qabul qilinadigan to'lov usullari:</h4>
              <div className="payment-icons">
                <div className="payment-method">💳 Payme</div>
                <div className="payment-method">💳 Click</div>
                <div className="payment-method">💰 Naqd</div>
                <div className="payment-method">🏦 Bank</div>
              </div>
            </div>

            <div className="security-badges">
              <div className="security-badge">🔒 Xavfsiz to'lov</div>
              <div className="security-badge">✅ SSL sertifikat</div>
            </div>
          </div>

          <div className="help-card">
            <h4>Yordam kerakmi?</h4>
            <p>Bizning mijozlar xizmati jamoasi sizga yordam berishga tayyor.</p>
            <div className="help-contacts">
              <div>📞 +998 90 123 45 67</div>
              <div>📧 support@ultramarket.uz</div>
              <div>💬 Onlayn chat</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
