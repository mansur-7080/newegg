import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CheckoutPage.css';

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

interface ShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  region: string;
  district: string;
  address: string;
  postalCode: string;
  deliveryInstructions: string;
}

interface FormErrors {
  [key: string]: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    region: '',
    district: '',
    address: '',
    postalCode: '',
    deliveryInstructions: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'PAYME' | 'CLICK' | 'CASH' | 'BANK_TRANSFER'>('PAYME');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  } | null>(null);
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const uzbekRegions = [
    'Toshkent shahri',
    'Toshkent viloyati',
    'Samarqand',
    'Buxoro',
    'Andijon',
    'Farg\'ona',
    'Namangan',
    'Qashqadaryo',
    'Surxondaryo',
    'Jizzax',
    'Sirdaryo',
    'Navoiy',
    'Xorazm',
    'Qoraqalpog\'iston',
  ];

  useEffect(() => {
    fetchCart();
    loadSavedAddress();
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
        if (!data.data.cart || data.data.cart.items.length === 0) {
          navigate('/cart');
          return;
        }
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

  const loadSavedAddress = () => {
    const savedAddress = localStorage.getItem('shippingAddress');
    if (savedAddress) {
      try {
        const parsed = JSON.parse(savedAddress);
        setShippingAddress(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error parsing saved address:', error);
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Required fields validation
    if (!shippingAddress.firstName.trim()) {
      errors.firstName = 'Ism kiritish majburiy';
    }

    if (!shippingAddress.lastName.trim()) {
      errors.lastName = 'Familiya kiritish majburiy';
    }

    if (!shippingAddress.phone.trim()) {
      errors.phone = 'Telefon raqam kiritish majburiy';
    } else if (!/^\+998\d{9}$/.test(shippingAddress.phone.replace(/\s/g, ''))) {
      errors.phone = 'To\'g\'ri telefon raqam kiriting (+998xxxxxxxxx)';
    }

    if (!shippingAddress.email.trim()) {
      errors.email = 'Email manzil kiritish majburiy';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email)) {
      errors.email = 'To\'g\'ri email manzil kiriting';
    }

    if (!shippingAddress.region) {
      errors.region = 'Viloyat tanlash majburiy';
    }

    if (!shippingAddress.district.trim()) {
      errors.district = 'Tuman/shahar kiritish majburiy';
    }

    if (!shippingAddress.address.trim()) {
      errors.address = 'To\'liq manzil kiritish majburiy';
    }

    if (!agreedToTerms) {
      errors.terms = 'Shartlar bilan rozilik majburiy';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/coupons/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: couponCode }),
      });

      const data = await response.json();
      
      if (data.success) {
        setAppliedCoupon(data.data.coupon);
        setFormErrors(prev => ({ ...prev, coupon: '' }));
      } else {
        setFormErrors(prev => ({ ...prev, coupon: data.message || 'Kupon kodi noto\'g\'ri' }));
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      setFormErrors(prev => ({ ...prev, coupon: 'Kupon tekshirishda xatolik' }));
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setFormErrors(prev => ({ ...prev, coupon: '' }));
  };

  const calculateTotals = () => {
    if (!cart) return { subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 };

    const subtotal = cart.totalAmount;
    let discount = 0;

    if (appliedCoupon) {
      if (appliedCoupon.type === 'PERCENTAGE') {
        discount = (subtotal * appliedCoupon.discount) / 100;
      } else {
        discount = appliedCoupon.discount;
      }
      discount = Math.min(discount, subtotal);
    }

    const discountedSubtotal = subtotal - discount;
    const tax = discountedSubtotal * 0.12; // 12% VAT
    const shipping = calculateShipping(discountedSubtotal);
    const total = discountedSubtotal + tax + shipping;

    return { subtotal, discount, tax, shipping, total };
  };

  const calculateShipping = (amount: number): number => {
    if (amount >= 500000) return 0; // Free shipping over 500,000 som

    const shippingRates: { [key: string]: number } = {
      'Toshkent shahri': 25000,
      'Toshkent viloyati': 35000,
      'Samarqand': 45000,
      'Buxoro': 50000,
      'Andijon': 55000,
      'Farg\'ona': 55000,
      'Namangan': 55000,
      'Qashqadaryo': 60000,
      'Surxondaryo': 65000,
      'Jizzax': 40000,
      'Sirdaryo': 35000,
      'Navoiy': 50000,
      'Xorazm': 70000,
      'Qoraqalpog\'iston': 75000,
    };

    return shippingRates[shippingAddress.region] || 50000;
  };

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const saveAddressToLocal = () => {
    localStorage.setItem('shippingAddress', JSON.stringify(shippingAddress));
  };

  const placeOrder = async () => {
    if (!validateForm() || !cart) return;

    try {
      setSubmitting(true);
      setError(null);

      // Save address for future use
      saveAddressToLocal();

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
          shippingAddress,
          paymentMethod,
          couponCode: appliedCoupon?.code,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const order = data.data.order;
        
        if (paymentMethod === 'PAYME' || paymentMethod === 'CLICK') {
          // Redirect to payment processor
          const paymentResponse = await fetch('/api/v1/payments/create', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: order.id,
              amount: order.total,
              paymentMethod,
              returnUrl: `${window.location.origin}/order/${order.id}`,
            }),
          });

          const paymentData = await paymentResponse.json();
          
          if (paymentData.success && paymentData.data.paymentUrl) {
            window.location.href = paymentData.data.paymentUrl;
            return;
          }
        }

        // For cash or bank transfer, redirect to order page
        navigate(`/order/${order.id}`, { 
          state: { 
            orderCreated: true,
            message: paymentMethod === 'CASH' 
              ? 'Buyurtma muvaffaqiyatli yaratildi. Yetkazib berish vaqtida to\'lov qiling.'
              : 'Buyurtma muvaffaqiyatli yaratildi. Bank orqali to\'lov qiling.' 
          } 
        });
      } else {
        throw new Error(data.message || 'Order creation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Buyurtma yaratishda xatolik');
      console.error('Error placing order:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="checkout-page">
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
      <div className="checkout-page">
        <div className="empty-container">
          <h2>Savat bo'sh</h2>
          <p>Checkout qilish uchun savatga mahsulot qo'shing</p>
          <button onClick={() => navigate('/products')} className="continue-shopping-button">
            Xaridni davom eting
          </button>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <h1>Buyurtmani rasmiylashtirish</h1>
        <div className="checkout-steps">
          <div className="step active">
            <span className="step-number">1</span>
            <span className="step-label">Manzil</span>
          </div>
          <div className="step active">
            <span className="step-number">2</span>
            <span className="step-label">To'lov</span>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <span className="step-label">Tasdiqlash</span>
          </div>
        </div>
      </div>

      <div className="checkout-container">
        <div className="checkout-form">
          {/* Shipping Address */}
          <div className="form-section">
            <h3>Yetkazib berish manzili</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Ism *</label>
                <input
                  type="text"
                  value={shippingAddress.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Ismingizni kiriting"
                  className={formErrors.firstName ? 'error' : ''}
                />
                {formErrors.firstName && <span className="error-text">{formErrors.firstName}</span>}
              </div>
              
              <div className="form-group">
                <label>Familiya *</label>
                <input
                  type="text"
                  value={shippingAddress.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Familiyangizni kiriting"
                  className={formErrors.lastName ? 'error' : ''}
                />
                {formErrors.lastName && <span className="error-text">{formErrors.lastName}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Telefon raqam *</label>
                <input
                  type="tel"
                  value={shippingAddress.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className={formErrors.phone ? 'error' : ''}
                />
                {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
              </div>
              
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={shippingAddress.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@example.com"
                  className={formErrors.email ? 'error' : ''}
                />
                {formErrors.email && <span className="error-text">{formErrors.email}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Viloyat *</label>
                <select
                  value={shippingAddress.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className={formErrors.region ? 'error' : ''}
                >
                  <option value="">Viloyatni tanlang</option>
                  {uzbekRegions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
                {formErrors.region && <span className="error-text">{formErrors.region}</span>}
              </div>
              
              <div className="form-group">
                <label>Tuman/Shahar *</label>
                <input
                  type="text"
                  value={shippingAddress.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  placeholder="Tuman yoki shahar nomini kiriting"
                  className={formErrors.district ? 'error' : ''}
                />
                {formErrors.district && <span className="error-text">{formErrors.district}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>To'liq manzil *</label>
              <input
                type="text"
                value={shippingAddress.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Ko'cha, uy raqami va boshqa ma'lumotlar"
                className={formErrors.address ? 'error' : ''}
              />
              {formErrors.address && <span className="error-text">{formErrors.address}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Pochta indeksi</label>
                <input
                  type="text"
                  value={shippingAddress.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  placeholder="100000"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Yetkazib berish uchun qo'shimcha ma'lumot</label>
              <textarea
                value={shippingAddress.deliveryInstructions}
                onChange={(e) => handleInputChange('deliveryInstructions', e.target.value)}
                placeholder="Masalan: 2-qavat, qo'ng'iroq qiling, kv. 15"
                rows={3}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="form-section">
            <h3>To'lov usuli</h3>
            
            <div className="payment-methods">
              <label className={`payment-option ${paymentMethod === 'PAYME' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="PAYME"
                  checked={paymentMethod === 'PAYME'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <div className="payment-info">
                  <div className="payment-icon">💳</div>
                  <div>
                    <div className="payment-title">Payme</div>
                    <div className="payment-description">Bank kartasi orqali onlayn to'lov</div>
                  </div>
                </div>
              </label>

              <label className={`payment-option ${paymentMethod === 'CLICK' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="CLICK"
                  checked={paymentMethod === 'CLICK'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <div className="payment-info">
                  <div className="payment-icon">💳</div>
                  <div>
                    <div className="payment-title">Click</div>
                    <div className="payment-description">Bank kartasi orqali onlayn to'lov</div>
                  </div>
                </div>
              </label>

              <label className={`payment-option ${paymentMethod === 'CASH' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="CASH"
                  checked={paymentMethod === 'CASH'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <div className="payment-info">
                  <div className="payment-icon">💰</div>
                  <div>
                    <div className="payment-title">Naqd pul</div>
                    <div className="payment-description">Yetkazib berish vaqtida to'lov</div>
                  </div>
                </div>
              </label>

              <label className={`payment-option ${paymentMethod === 'BANK_TRANSFER' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="BANK_TRANSFER"
                  checked={paymentMethod === 'BANK_TRANSFER'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <div className="payment-info">
                  <div className="payment-icon">🏦</div>
                  <div>
                    <div className="payment-title">Bank o'tkazmasi</div>
                    <div className="payment-description">Bank orqali to'lov</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Coupon Code */}
          <div className="form-section">
            <h3>Chegirma kuponi</h3>
            
            <div className="coupon-section">
              <div className="coupon-input">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Kupon kodini kiriting"
                  disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                  <button type="button" onClick={removeCoupon} className="remove-coupon">
                    O'chirish
                  </button>
                ) : (
                  <button type="button" onClick={applyCoupon} className="apply-coupon">
                    Qo'llash
                  </button>
                )}
              </div>
              
              {formErrors.coupon && <span className="error-text">{formErrors.coupon}</span>}
              
              {appliedCoupon && (
                <div className="applied-coupon">
                  ✅ Kupon qo'llanildi: {appliedCoupon.code} 
                  ({appliedCoupon.type === 'PERCENTAGE' ? `${appliedCoupon.discount}%` : formatPrice(appliedCoupon.discount)} chegirma)
                </div>
              )}
            </div>
          </div>

          {/* Order Notes */}
          <div className="form-section">
            <h3>Buyurtma uchun izoh</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Buyurtma uchun qo'shimcha ma'lumotlar (ixtiyoriy)"
              rows={3}
            />
          </div>

          {/* Terms Agreement */}
          <div className="form-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span>
                Men <a href="/terms" target="_blank">foydalanish shartlari</a> va <a href="/privacy" target="_blank">maxfiylik siyosati</a> bilan tanishdim va roziman *
              </span>
            </label>
            {formErrors.terms && <span className="error-text">{formErrors.terms}</span>}
          </div>
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <div className="summary-card">
            <h3>Buyurtma xulosasi</h3>

            <div className="order-items">
              {cart.items.map(item => (
                <div key={item.id} className="order-item">
                  <img src={item.product.image} alt={item.product.name} />
                  <div className="item-details">
                    <div className="item-name">{item.product.name}</div>
                    <div className="item-quantity">Miqdor: {item.quantity}</div>
                  </div>
                  <div className="item-price">{formatPrice(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="summary-line">
                <span>Mahsulotlar:</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>

              {totals.discount > 0 && (
                <div className="summary-line discount">
                  <span>Chegirma:</span>
                  <span>-{formatPrice(totals.discount)}</span>
                </div>
              )}

              <div className="summary-line">
                <span>QQS (12%):</span>
                <span>{formatPrice(totals.tax)}</span>
              </div>

              <div className="summary-line">
                <span>Yetkazib berish:</span>
                <span>
                  {totals.shipping === 0 ? (
                    <span className="free-shipping">Bepul</span>
                  ) : (
                    formatPrice(totals.shipping)
                  )}
                </span>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-total">
                <span>Jami to'lov:</span>
                <span className="total-amount">{formatPrice(totals.total)}</span>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              onClick={placeOrder}
              disabled={submitting || !agreedToTerms}
              className="place-order-button"
            >
              {submitting ? 'Buyurtma yaratilmoqda...' : 'Buyurtmani tasdiqlash'}
            </button>

            <div className="security-info">
              <div className="security-badge">🔒 Xavfsiz to'lov</div>
              <div className="security-badge">✅ Ma'lumotlar himoyalangan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
