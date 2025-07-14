import React, { useState, useEffect } from 'react';
import './OrderManagementPage.css';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    image: string;
    sku: string;
  };
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  region: string;
  district: string;
  address: string;
  deliveryInstructions?: string;
}

interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
    totalOrders: number;
  };
}

enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

interface OrderFilters {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  region: string;
}

const OrderManagementPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const [filters, setFilters] = useState<OrderFilters>({
    status: '',
    paymentStatus: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    region: '',
  });

  const [bulkAction, setBulkAction] = useState('');
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [statusNotes, setStatusNotes] = useState('');

  const statusColors = {
    [OrderStatus.PENDING]: '#f59e0b',
    [OrderStatus.CONFIRMED]: '#3b82f6',
    [OrderStatus.PROCESSING]: '#8b5cf6',
    [OrderStatus.SHIPPED]: '#06b6d4',
    [OrderStatus.DELIVERED]: '#10b981',
    [OrderStatus.CANCELLED]: '#ef4444',
    [OrderStatus.RETURNED]: '#f97316',
  };

  const paymentStatusColors = {
    [PaymentStatus.PENDING]: '#f59e0b',
    [PaymentStatus.PAID]: '#10b981',
    [PaymentStatus.FAILED]: '#ef4444',
    [PaymentStatus.REFUNDED]: '#6b7280',
  };

  const statusTexts = {
    [OrderStatus.PENDING]: 'Kutilmoqda',
    [OrderStatus.CONFIRMED]: 'Tasdiqlangan',
    [OrderStatus.PROCESSING]: 'Tayyorlanmoqda',
    [OrderStatus.SHIPPED]: 'Jo\'natilgan',
    [OrderStatus.DELIVERED]: 'Yetkazilgan',
    [OrderStatus.CANCELLED]: 'Bekor qilingan',
    [OrderStatus.RETURNED]: 'Qaytarilgan',
  };

  const paymentStatusTexts = {
    [PaymentStatus.PENDING]: 'Kutilmoqda',
    [PaymentStatus.PAID]: 'To\'langan',
    [PaymentStatus.FAILED]: 'Muvaffaqiyatsiz',
    [PaymentStatus.REFUNDED]: 'Qaytarilgan',
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPage, filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('Admin token not found');
      }

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        ),
      });

      const response = await fetch(`/api/v1/admin/orders?${queryParams}`, {
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
        setTotalPages(data.data.totalPages);
        setTotalOrders(data.data.total);
      } else {
        throw new Error(data.message || 'Failed to fetch orders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, notes?: string) => {
    try {
      setUpdatingStatus(orderId);

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update order in the list
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
          )
        );

        // Update selected order if it's open
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status, updatedAt: new Date().toISOString() } : null);
        }

        alert(`Buyurtma holati ${statusTexts[status]} ga o'zgartirildi`);
      } else {
        throw new Error(data.message || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      alert(err instanceof Error ? err.message : 'Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const bulkUpdateStatus = async () => {
    if (!newStatus || selectedOrders.size === 0) return;

    const confirmed = window.confirm(
      `${selectedOrders.size} ta buyurtma holatini ${statusTexts[newStatus]} ga o'zgartirmoqchimisiz?`
    );
    
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('adminToken');
      const promises = Array.from(selectedOrders).map(orderId =>
        fetch(`/api/v1/admin/orders/${orderId}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
            notes: statusNotes || `Bulk update to ${statusTexts[newStatus]}`,
          }),
        })
      );

      const results = await Promise.all(promises);
      
      const successCount = results.filter(r => r.ok).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        await fetchOrders(); // Refresh the list
        setSelectedOrders(new Set());
        setNewStatus('');
        setStatusNotes('');
        alert(`${successCount} ta buyurtma muvaffaqiyatli yangilandi${failCount > 0 ? `, ${failCount} ta xatolik` : ''}`);
      }
    } catch (err) {
      console.error('Error bulk updating orders:', err);
      alert('Buyurtmalarni yangilashda xatolik');
    }
  };

  const exportOrders = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const queryParams = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        ),
        export: 'true',
      });

      const response = await fetch(`/api/v1/admin/orders/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting orders:', err);
      alert('Eksport qilishda xatolik');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(order => order.id)));
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowOrderDetails(false);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="order-management-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Buyurtmalar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-management-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Buyurtmalar boshqaruvi</h1>
          <div className="order-stats">
            <span className="stat">Jami: {totalOrders}</span>
            <span className="stat">Sahifa: {currentPage}/{totalPages}</span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={exportOrders} className="export-button">
            📊 Eksport
          </button>
          <button onClick={fetchOrders} className="refresh-button">
            🔄 Yangilash
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Holat</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Barcha holatlar</option>
              {Object.values(OrderStatus).map(status => (
                <option key={status} value={status}>{statusTexts[status]}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>To'lov holati</label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
            >
              <option value="">Barcha holatlar</option>
              {Object.values(PaymentStatus).map(status => (
                <option key={status} value={status}>{paymentStatusTexts[status]}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>To'lov usuli</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
            >
              <option value="">Barcha usullar</option>
              <option value="PAYME">Payme</option>
              <option value="CLICK">Click</option>
              <option value="CASH">Naqd</option>
              <option value="BANK_TRANSFER">Bank</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Qidiruv</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Buyurtma raqami, mijoz ismi..."
            />
          </div>

          <div className="filter-group">
            <label>Sana (dan)</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>Sana (gacha)</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button
            onClick={() => setFilters({
              status: '',
              paymentStatus: '',
              paymentMethod: '',
              dateFrom: '',
              dateTo: '',
              search: '',
              region: '',
            })}
            className="clear-filters"
          >
            Filtrlarni tozalash
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <div className="bulk-actions">
          <div className="bulk-info">
            {selectedOrders.size} ta buyurtma tanlangan
          </div>
          <div className="bulk-controls">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
            >
              <option value="">Holatni tanlang</option>
              {Object.values(OrderStatus).map(status => (
                <option key={status} value={status}>{statusTexts[status]}</option>
              ))}
            </select>
            <input
              type="text"
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Izoh (ixtiyoriy)"
            />
            <button
              onClick={bulkUpdateStatus}
              disabled={!newStatus}
              className="apply-bulk"
            >
              Qo'llash
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={orders.length > 0 && selectedOrders.size === orders.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Buyurtma #</th>
              <th>Mijoz</th>
              <th>Mahsulotlar</th>
              <th>Summa</th>
              <th>To'lov</th>
              <th>Holat</th>
              <th>Sana</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className={selectedOrders.has(order.id) ? 'selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.id)}
                    onChange={() => handleSelectOrder(order.id)}
                  />
                </td>
                <td>
                  <button
                    onClick={() => openOrderDetails(order)}
                    className="order-number-link"
                  >
                    {order.orderNumber}
                  </button>
                </td>
                <td>
                  <div className="customer-info">
                    <div className="customer-name">
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </div>
                    <div className="customer-phone">{order.shippingAddress.phone}</div>
                  </div>
                </td>
                <td>
                  <div className="order-items">
                    {order.items.slice(0, 2).map(item => (
                      <div key={item.id} className="item-preview">
                        <img src={item.product.image} alt={item.product.name} />
                        <span>{item.quantity}x</span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <span className="more-items">+{order.items.length - 2}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="order-total">{formatPrice(order.total)}</div>
                  {order.discount > 0 && (
                    <div className="order-discount">-{formatPrice(order.discount)}</div>
                  )}
                </td>
                <td>
                  <div className="payment-info">
                    <span
                      className="payment-status"
                      style={{ color: paymentStatusColors[order.paymentStatus] }}
                    >
                      {paymentStatusTexts[order.paymentStatus]}
                    </span>
                    <div className="payment-method">{order.paymentMethod}</div>
                  </div>
                </td>
                <td>
                  <div className="status-container">
                    <span
                      className="order-status"
                      style={{ 
                        backgroundColor: statusColors[order.status] + '20',
                        color: statusColors[order.status],
                        border: `1px solid ${statusColors[order.status]}40`
                      }}
                    >
                      {statusTexts[order.status]}
                    </span>
                    {order.trackingNumber && (
                      <div className="tracking-number">📦 {order.trackingNumber}</div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="order-dates">
                    <div className="created-date">{formatDate(order.createdAt)}</div>
                    {order.updatedAt !== order.createdAt && (
                      <div className="updated-date">Yangilangan: {formatDate(order.updatedAt)}</div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="order-actions">
                    <button
                      onClick={() => openOrderDetails(order)}
                      className="action-button view"
                      title="Ko'rish"
                    >
                      👁️
                    </button>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          updateOrderStatus(order.id, e.target.value as OrderStatus);
                        }
                      }}
                      className="status-select"
                      disabled={updatingStatus === order.id}
                    >
                      <option value="">Holatni o'zgartirish</option>
                      {Object.values(OrderStatus)
                        .filter(status => status !== order.status)
                        .map(status => (
                          <option key={status} value={status}>{statusTexts[status]}</option>
                        ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>Buyurtmalar topilmadi</h3>
            <p>Hozircha hech qanday buyurtma yo'q yoki filtr shartlariga mos keluvchi buyurtma topilmadi</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ← Oldingi
          </button>
          
          <div className="pagination-info">
            {currentPage} / {totalPages}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Keyingi →
          </button>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="modal-overlay" onClick={closeOrderDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Buyurtma tafsilotlari: {selectedOrder.orderNumber}</h2>
              <button onClick={closeOrderDetails} className="close-button">✕</button>
            </div>

            <div className="modal-body">
              <div className="order-details-grid">
                {/* Order Summary */}
                <div className="details-section">
                  <h3>Umumiy ma'lumot</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Holat:</label>
                      <span
                        className="order-status"
                        style={{ 
                          backgroundColor: statusColors[selectedOrder.status] + '20',
                          color: statusColors[selectedOrder.status],
                          border: `1px solid ${statusColors[selectedOrder.status]}40`
                        }}
                      >
                        {statusTexts[selectedOrder.status]}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>To'lov holati:</label>
                      <span style={{ color: paymentStatusColors[selectedOrder.paymentStatus] }}>
                        {paymentStatusTexts[selectedOrder.paymentStatus]}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>To'lov usuli:</label>
                      <span>{selectedOrder.paymentMethod}</span>
                    </div>
                    <div className="detail-item">
                      <label>Yaratilgan:</label>
                      <span>{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Yangilangan:</label>
                      <span>{formatDate(selectedOrder.updatedAt)}</span>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <div className="detail-item">
                        <label>Tracking:</label>
                        <span>{selectedOrder.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="details-section">
                  <h3>Mijoz ma'lumotlari</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Ism:</label>
                      <span>{selectedOrder.shippingAddress.firstName} {selectedOrder.shippingAddress.lastName}</span>
                    </div>
                    <div className="detail-item">
                      <label>Telefon:</label>
                      <span>{selectedOrder.shippingAddress.phone}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{selectedOrder.shippingAddress.email}</span>
                    </div>
                    <div className="detail-item">
                      <label>Manzil:</label>
                      <span>
                        {selectedOrder.shippingAddress.region}, {selectedOrder.shippingAddress.district}
                        <br />
                        {selectedOrder.shippingAddress.address}
                      </span>
                    </div>
                    {selectedOrder.shippingAddress.deliveryInstructions && (
                      <div className="detail-item">
                        <label>Qo'shimcha:</label>
                        <span>{selectedOrder.shippingAddress.deliveryInstructions}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="details-section full-width">
                <h3>Buyurtma mahsulotlari</h3>
                <div className="order-items-details">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="order-item-detail">
                      <img src={item.product.image} alt={item.product.name} />
                      <div className="item-info">
                        <div className="item-name">{item.product.name}</div>
                        <div className="item-sku">SKU: {item.product.sku}</div>
                      </div>
                      <div className="item-quantity">Miqdor: {item.quantity}</div>
                      <div className="item-price">{formatPrice(item.price)}</div>
                      <div className="item-total">{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>

                {/* Order Totals */}
                <div className="order-totals-detail">
                  <div className="total-line">
                    <span>Mahsulotlar:</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="total-line discount">
                      <span>Chegirma:</span>
                      <span>-{formatPrice(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="total-line">
                    <span>QQS (12%):</span>
                    <span>{formatPrice(selectedOrder.tax)}</span>
                  </div>
                  <div className="total-line">
                    <span>Yetkazib berish:</span>
                    <span>{selectedOrder.shipping === 0 ? 'Bepul' : formatPrice(selectedOrder.shipping)}</span>
                  </div>
                  <div className="total-line final">
                    <span>Jami:</span>
                    <span>{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="details-section full-width">
                <h3>Tez amallar</h3>
                <div className="quick-actions">
                  {Object.values(OrderStatus)
                    .filter(status => status !== selectedOrder.status)
                    .map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          const notes = prompt(`${statusTexts[status]} ga o'tkazish uchun izoh kiriting:`);
                          if (notes !== null) {
                            updateOrderStatus(selectedOrder.id, status, notes);
                          }
                        }}
                        className="quick-action-button"
                        style={{ borderColor: statusColors[status], color: statusColors[status] }}
                      >
                        {statusTexts[status]} ga o'tkazish
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
    </div>
  );
};

export default OrderManagementPage;