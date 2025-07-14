import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserProfilePage.css';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  avatar?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  preferredLanguage: 'UZ' | 'RU' | 'EN';
  preferredCurrency: 'UZS' | 'USD';
  marketingOptIn: boolean;
  twoFactorEnabled: boolean;
  addresses: UserAddress[];
  orderCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  accountLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  createdAt: string;
  lastLoginAt?: string;
}

interface UserAddress {
  id: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  district: string;
  address: string;
  postalCode?: string;
  landmark?: string;
  isDefault: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{
    id: string;
    product: {
      name: string;
      image: string;
    };
    quantity: number;
    price: number;
  }>;
}

const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders' | 'security' | 'preferences'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    preferredLanguage: 'UZ',
    preferredCurrency: 'UZS',
    marketingOptIn: false,
  });

  const [addressForm, setAddressForm] = useState({
    type: 'HOME',
    title: '',
    firstName: '',
    lastName: '',
    phone: '',
    region: '',
    district: '',
    address: '',
    postalCode: '',
    landmark: '',
    isDefault: false,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

  const accountLevelColors = {
    BRONZE: '#cd7f32',
    SILVER: '#c0c0c0',
    GOLD: '#ffd700',
    PLATINUM: '#e5e4e2',
  };

  const accountLevelTexts = {
    BRONZE: 'Bronza',
    SILVER: 'Kumush',
    GOLD: 'Oltin',
    PLATINUM: 'Platina',
  };

  useEffect(() => {
    fetchUserProfile();
    if (activeTab === 'orders') {
      fetchUserOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || '',
        preferredLanguage: profile.preferredLanguage,
        preferredCurrency: profile.preferredCurrency,
        marketingOptIn: profile.marketingOptIn,
      });
    }
  }, [profile]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('/api/v1/user/profile', {
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
        setProfile(data.data.profile);
      } else {
        throw new Error(data.message || 'Failed to fetch profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOrders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/user/orders?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data.orders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const updateProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProfile(data.data.profile);
        alert('Profil muvaffaqiyatli yangilandi');
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const isEditing = !!editingAddress;
      const url = isEditing 
        ? `/api/v1/user/addresses/${editingAddress.id}`
        : '/api/v1/user/addresses';
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchUserProfile(); // Refresh profile to get updated addresses
        setShowAddAddress(false);
        setEditingAddress(null);
        resetAddressForm();
        alert(isEditing ? 'Manzil yangilandi' : 'Manzil qo\'shildi');
      } else {
        throw new Error(data.message || 'Failed to save address');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address');
      console.error('Error saving address:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (addressId: string) => {
    const confirmed = window.confirm('Bu manzilni o\'chirmoqchimisiz?');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/user/addresses/${addressId}`, {
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
        await fetchUserProfile(); // Refresh profile
        alert('Manzil o\'chirildi');
      } else {
        throw new Error(data.message || 'Failed to delete address');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete address');
      console.error('Error deleting address:', err);
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Yangi parol va tasdiqlash bir xil emas');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('Parol kamida 8 ta belgi bo\'lishi kerak');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/user/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowChangePassword(false);
        alert('Parol muvaffaqiyatli o\'zgartirildi');
      } else {
        throw new Error(data.message || 'Failed to change password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
      console.error('Error changing password:', err);
    } finally {
      setSaving(false);
    }
  };

  const editAddress = (address: UserAddress) => {
    setEditingAddress(address);
    setAddressForm({
      type: address.type,
      title: address.title,
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      region: address.region,
      district: address.district,
      address: address.address,
      postalCode: address.postalCode || '',
      landmark: address.landmark || '',
      isDefault: address.isDefault,
    });
    setShowAddAddress(true);
  };

  const resetAddressForm = () => {
    setAddressForm({
      type: 'HOME',
      title: '',
      firstName: '',
      lastName: '',
      phone: '',
      region: '',
      district: '',
      address: '',
      postalCode: '',
      landmark: '',
      isDefault: false,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusText = (status: string) => {
    const statusTexts: { [key: string]: string } = {
      PENDING: 'Kutilmoqda',
      CONFIRMED: 'Tasdiqlangan',
      PROCESSING: 'Tayyorlanmoqda',
      SHIPPED: 'Jo\'natilgan',
      DELIVERED: 'Yetkazilgan',
      CANCELLED: 'Bekor qilingan',
      RETURNED: 'Qaytarilgan',
    };
    return statusTexts[status] || status;
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      PENDING: '#f59e0b',
      CONFIRMED: '#3b82f6',
      PROCESSING: '#8b5cf6',
      SHIPPED: '#06b6d4',
      DELIVERED: '#10b981',
      CANCELLED: '#ef4444',
      RETURNED: '#f97316',
    };
    return statusColors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Profil yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <h2>Profil topilmadi</h2>
          <button onClick={() => navigate('/login')} className="login-button">
            Qayta kirish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt="Avatar" />
          ) : (
            <div className="avatar-placeholder">
              {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1>{profile.firstName} {profile.lastName}</h1>
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-label">Darajangiz:</span>
              <span 
                className="account-level"
                style={{ color: accountLevelColors[profile.accountLevel] }}
              >
                {accountLevelTexts[profile.accountLevel]}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Bonuslar:</span>
              <span className="stat-value">{profile.loyaltyPoints.toLocaleString()} ball</span>
            </div>
            <div className="stat">
              <span className="stat-label">Buyurtmalar:</span>
              <span className="stat-value">{profile.orderCount} ta</span>
            </div>
            <div className="stat">
              <span className="stat-label">Jami xarid:</span>
              <span className="stat-value">{formatPrice(profile.totalSpent)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Shaxsiy ma'lumotlar
          </button>
          <button
            className={`tab ${activeTab === 'addresses' ? 'active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            Manzillarim
          </button>
          <button
            className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Buyurtmalarim
          </button>
          <button
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Xavfsizlik
          </button>
          <button
            className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            Sozlamalar
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'profile' && (
            <div className="profile-form">
              <h3>Shaxsiy ma'lumotlar</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ism *</label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Ismingizni kiriting"
                  />
                </div>
                <div className="form-group">
                  <label>Familiya *</label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Familiyangizni kiriting"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Telefon raqam *</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+998 90 123 45 67"
                  />
                  {!profile.isPhoneVerified && (
                    <span className="verification-status unverified">Tasdiqlanmagan</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="disabled"
                  />
                  {profile.isEmailVerified ? (
                    <span className="verification-status verified">✅ Tasdiqlangan</span>
                  ) : (
                    <span className="verification-status unverified">Tasdiqlanmagan</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tug'ilgan sana</label>
                  <input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Jins</label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                  >
                    <option value="">Tanlang</option>
                    <option value="MALE">Erkak</option>
                    <option value="FEMALE">Ayol</option>
                    <option value="OTHER">Boshqa</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button
                onClick={updateProfile}
                disabled={saving}
                className="save-button"
              >
                {saving ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
              </button>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="addresses-section">
              <div className="section-header">
                <h3>Manzillarim</h3>
                <button
                  onClick={() => {
                    resetAddressForm();
                    setEditingAddress(null);
                    setShowAddAddress(true);
                  }}
                  className="add-address-button"
                >
                  + Manzil qo'shish
                </button>
              </div>

              <div className="addresses-grid">
                {profile.addresses.map(address => (
                  <div key={address.id} className={`address-card ${address.isDefault ? 'default' : ''}`}>
                    <div className="address-header">
                      <h4>{address.title}</h4>
                      {address.isDefault && <span className="default-badge">Asosiy</span>}
                    </div>
                    <div className="address-details">
                      <p>{address.firstName} {address.lastName}</p>
                      <p>{address.phone}</p>
                      <p>{address.region}, {address.district}</p>
                      <p>{address.address}</p>
                      {address.landmark && <p>Mo'ljal: {address.landmark}</p>}
                    </div>
                    <div className="address-actions">
                      <button onClick={() => editAddress(address)} className="edit-button">
                        Tahrirlash
                      </button>
                      <button
                        onClick={() => deleteAddress(address.id)}
                        className="delete-button"
                        disabled={profile.addresses.length === 1}
                      >
                        O'chirish
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showAddAddress && (
                <div className="modal-overlay" onClick={() => setShowAddAddress(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>{editingAddress ? 'Manzilni tahrirlash' : 'Yangi manzil qo\'shish'}</h3>
                      <button onClick={() => setShowAddAddress(false)} className="close-button">✕</button>
                    </div>

                    <div className="address-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Turi *</label>
                          <select
                            value={addressForm.type}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, type: e.target.value as any }))}
                          >
                            <option value="HOME">Uy</option>
                            <option value="WORK">Ish</option>
                            <option value="OTHER">Boshqa</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Sarlavha *</label>
                          <input
                            type="text"
                            value={addressForm.title}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Masalan: Uyim, Ishim"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Ism *</label>
                          <input
                            type="text"
                            value={addressForm.firstName}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, firstName: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label>Familiya *</label>
                          <input
                            type="text"
                            value={addressForm.lastName}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, lastName: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Telefon *</label>
                        <input
                          type="tel"
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+998 90 123 45 67"
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Viloyat *</label>
                          <select
                            value={addressForm.region}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, region: e.target.value }))}
                          >
                            <option value="">Viloyatni tanlang</option>
                            {uzbekRegions.map(region => (
                              <option key={region} value={region}>{region}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Tuman/Shahar *</label>
                          <input
                            type="text"
                            value={addressForm.district}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, district: e.target.value }))}
                            placeholder="Tuman yoki shahar"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>To'liq manzil *</label>
                        <input
                          type="text"
                          value={addressForm.address}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Ko'cha, uy raqami, kvartira"
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Pochta indeksi</label>
                          <input
                            type="text"
                            value={addressForm.postalCode}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, postalCode: e.target.value }))}
                            placeholder="100000"
                          />
                        </div>
                        <div className="form-group">
                          <label>Mo'ljal</label>
                          <input
                            type="text"
                            value={addressForm.landmark}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, landmark: e.target.value }))}
                            placeholder="Yaqin atrofdagi mashhur joy"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={addressForm.isDefault}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                          />
                          <span>Asosiy manzil sifatida belgilash</span>
                        </label>
                      </div>

                      {error && (
                        <div className="error-message">
                          {error}
                        </div>
                      )}

                      <div className="modal-actions">
                        <button
                          onClick={() => setShowAddAddress(false)}
                          className="cancel-button"
                        >
                          Bekor qilish
                        </button>
                        <button
                          onClick={saveAddress}
                          disabled={saving}
                          className="save-button"
                        >
                          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="orders-section">
              <div className="section-header">
                <h3>Buyurtmalarim</h3>
                <button onClick={() => navigate('/orders')} className="view-all-button">
                  Barcha buyurtmalarni ko'rish
                </button>
              </div>

              <div className="orders-list">
                {orders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <h4>Hozircha buyurtma yo'q</h4>
                    <p>Birinchi buyurtmangizni bering!</p>
                    <button onClick={() => navigate('/products')} className="shop-button">
                      Xarid qilish
                    </button>
                  </div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div className="order-number">#{order.orderNumber}</div>
                        <div
                          className="order-status"
                          style={{ color: getStatusColor(order.status) }}
                        >
                          {getStatusText(order.status)}
                        </div>
                      </div>
                      <div className="order-details">
                        <div className="order-items">
                          {order.items.slice(0, 3).map(item => (
                            <div key={item.id} className="order-item">
                              <img src={item.product.image} alt={item.product.name} />
                              <span>{item.quantity}x</span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="more-items">+{order.items.length - 3}</div>
                          )}
                        </div>
                        <div className="order-info">
                          <div className="order-total">{formatPrice(order.total)}</div>
                          <div className="order-date">{formatDate(order.createdAt)}</div>
                        </div>
                      </div>
                      <div className="order-actions">
                        <button onClick={() => navigate(`/order/${order.id}`)} className="view-order-button">
                          Batafsil ko'rish
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="security-section">
              <h3>Xavfsizlik sozlamalari</h3>

              <div className="security-settings">
                <div className="security-item">
                  <div className="security-info">
                    <h4>Parolni o'zgartirish</h4>
                    <p>Hisobingizni himoya qilish uchun muntazam ravishda parolni o'zgartiring</p>
                  </div>
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="security-button"
                  >
                    Parolni o'zgartirish
                  </button>
                </div>

                <div className="security-item">
                  <div className="security-info">
                    <h4>Ikki bosqichli autentifikatsiya</h4>
                    <p>Qo'shimcha xavfsizlik qatlami qo'shing</p>
                  </div>
                  <button
                    className={`security-button ${profile.twoFactorEnabled ? 'enabled' : ''}`}
                    disabled
                  >
                    {profile.twoFactorEnabled ? 'Yoqilgan' : 'O\'chiriq'} (Tez orada)
                  </button>
                </div>

                <div className="security-item">
                  <div className="security-info">
                    <h4>Login tarixi</h4>
                    <p>Hisobga kirgan tarixni ko'ring</p>
                    {profile.lastLoginAt && (
                      <small>Oxirgi kirish: {formatDate(profile.lastLoginAt)}</small>
                    )}
                  </div>
                  <button className="security-button" disabled>
                    Ko'rish (Tez orada)
                  </button>
                </div>
              </div>

              {showChangePassword && (
                <div className="modal-overlay" onClick={() => setShowChangePassword(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>Parolni o'zgartirish</h3>
                      <button onClick={() => setShowChangePassword(false)} className="close-button">✕</button>
                    </div>

                    <div className="password-form">
                      <div className="form-group">
                        <label>Joriy parol *</label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          placeholder="Joriy parolingizni kiriting"
                        />
                      </div>

                      <div className="form-group">
                        <label>Yangi parol *</label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Yangi parolni kiriting"
                        />
                        <small>Kamida 8 ta belgi, katta va kichik harflar, raqam bo'lishi kerak</small>
                      </div>

                      <div className="form-group">
                        <label>Yangi parolni tasdiqlang *</label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Yangi parolni qayta kiriting"
                        />
                      </div>

                      {error && (
                        <div className="error-message">
                          {error}
                        </div>
                      )}

                      <div className="modal-actions">
                        <button
                          onClick={() => setShowChangePassword(false)}
                          className="cancel-button"
                        >
                          Bekor qilish
                        </button>
                        <button
                          onClick={changePassword}
                          disabled={saving}
                          className="save-button"
                        >
                          {saving ? 'O\'zgartirilmoqda...' : 'Parolni o\'zgartirish'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="preferences-section">
              <h3>Sozlamalar</h3>

              <div className="preferences-form">
                <div className="form-group">
                  <label>Til</label>
                  <select
                    value={profileForm.preferredLanguage}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, preferredLanguage: e.target.value as any }))}
                  >
                    <option value="UZ">O'zbek tili</option>
                    <option value="RU">Русский язык</option>
                    <option value="EN">English</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Valyuta</label>
                  <select
                    value={profileForm.preferredCurrency}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, preferredCurrency: e.target.value as any }))}
                  >
                    <option value="UZS">O'zbek so'mi (UZS)</option>
                    <option value="USD">US Dollar (USD)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={profileForm.marketingOptIn}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, marketingOptIn: e.target.checked }))}
                    />
                    <span>Marketing xabarlarini olish</span>
                  </label>
                  <small>Yangi mahsulotlar va chegirmalar haqida xabar olish</small>
                </div>

                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <button
                  onClick={updateProfile}
                  disabled={saving}
                  className="save-button"
                >
                  {saving ? 'Saqlanmoqda...' : 'Sozlamalarni saqlash'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
