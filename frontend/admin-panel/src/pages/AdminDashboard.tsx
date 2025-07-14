import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  pendingOrders: number;
  lowStockProducts: number;
  monthlyGrowth: number;
  avgOrderValue: number;
}

interface RecentOrder {
  id: string;
  customerName: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  itemCount: number;
}

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  image: string;
}

interface SalesData {
  month: string;
  sales: number;
  revenue: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalProducts: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    monthlyGrowth: 0,
    avgOrderValue: 0,
  });

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard statistics
      const statsResponse = await fetch(`/api/v1/admin/dashboard/stats?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Fetch recent orders
      const ordersResponse = await fetch('/api/v1/admin/orders/recent?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setRecentOrders(ordersData.data.orders);
      }

      // Fetch top products
      const productsResponse = await fetch(`/api/v1/admin/products/top?period=${selectedPeriod}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setTopProducts(productsData.data.products);
      }

      // Fetch sales data for chart
      const salesResponse = await fetch(`/api/v1/admin/analytics/sales?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (salesResponse.ok) {
        const salesResponseData = await salesResponse.json();
        setSalesData(salesResponseData.data.sales);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#ffc107';
      case 'PAID': return '#198754';
      case 'SHIPPED': return '#0d6efd';
      case 'DELIVERED': return '#198754';
      case 'CANCELLED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Kutilmoqda';
      case 'PAID': return 'To\'langan';
      case 'SHIPPED': return 'Jo\'natilgan';
      case 'DELIVERED': return 'Yetkazilgan';
      case 'CANCELLED': return 'Bekor qilingan';
      default: return status;
    }
  };

  const handleQuickAction = async (action: string, id?: string) => {
    try {
      switch (action) {
        case 'refresh':
          await fetchDashboardData();
          break;
        case 'export-orders':
          window.open(`/api/v1/admin/orders/export?period=${selectedPeriod}`, '_blank');
          break;
        case 'export-sales':
          window.open(`/api/v1/admin/analytics/export?period=${selectedPeriod}`, '_blank');
          break;
        case 'view-order':
          if (id) window.open(`/admin/orders/${id}`, '_blank');
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Quick action error:', err);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-container">
          <h2>Xatolik yuz berdi</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Boshqaruv paneli</h1>
          <div className="header-actions">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="period-selector"
            >
              <option value="7d">So'nggi 7 kun</option>
              <option value="30d">So'nggi 30 kun</option>
              <option value="90d">So'nggi 90 kun</option>
              <option value="1y">So'nggi yil</option>
            </select>
            <button onClick={() => handleQuickAction('refresh')} className="refresh-button">
              🔄 Yangilash
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orders">📦</div>
          <div className="stat-content">
            <h3>Jami buyurtmalar</h3>
            <div className="stat-value">{stats.totalOrders.toLocaleString()}</div>
            <div className="stat-change positive">+{stats.monthlyGrowth}%</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">💰</div>
          <div className="stat-content">
            <h3>Jami daromad</h3>
            <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
            <div className="stat-subtext">O'rtacha: {formatCurrency(stats.avgOrderValue)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon users">👥</div>
          <div className="stat-content">
            <h3>Foydalanuvchilar</h3>
            <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
            <div className="stat-subtext">Ro'yxatdan o'tgan</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon products">📋</div>
          <div className="stat-content">
            <h3>Mahsulotlar</h3>
            <div className="stat-value">{stats.totalProducts.toLocaleString()}</div>
            <div className="stat-subtext">{stats.lowStockProducts} kam qoldiq</div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="action-cards">
        <div className="action-card pending-orders">
          <div className="action-header">
            <h3>Kutilayotgan buyurtmalar</h3>
            <span className="action-count">{stats.pendingOrders}</span>
          </div>
          <p>Tasdiqlanishi kerak bo'lgan buyurtmalar</p>
          <button className="action-button">Ko'rish</button>
        </div>

        <div className="action-card low-stock">
          <div className="action-header">
            <h3>Kam qoldiq mahsulotlar</h3>
            <span className="action-count warning">{stats.lowStockProducts}</span>
          </div>
          <p>Qayta to'ldirish talab qilinadi</p>
          <button className="action-button">Ko'rish</button>
        </div>

        <div className="action-card exports">
          <div className="action-header">
            <h3>Hisobotlar</h3>
            <span className="action-icon">📊</span>
          </div>
          <p>Ma'lumotlarni eksport qilish</p>
          <div className="export-buttons">
            <button 
              onClick={() => handleQuickAction('export-orders')}
              className="export-button"
            >
              Buyurtmalar
            </button>
            <button 
              onClick={() => handleQuickAction('export-sales')}
              className="export-button"
            >
              Sotuvlar
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Sales Chart */}
        <div className="dashboard-widget sales-chart">
          <div className="widget-header">
            <h3>Sotuvlar grafigi</h3>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color sales"></span>
                <span>Sotuvlar soni</span>
              </div>
              <div className="legend-item">
                <span className="legend-color revenue"></span>
                <span>Daromad</span>
              </div>
            </div>
          </div>
          <div className="chart-container">
            {salesData.length > 0 ? (
              <div className="simple-chart">
                {salesData.map((data, index) => (
                  <div key={index} className="chart-bar">
                    <div 
                      className="bar sales-bar"
                      style={{ 
                        height: `${(data.sales / Math.max(...salesData.map(d => d.sales))) * 100}%`
                      }}
                    ></div>
                    <div 
                      className="bar revenue-bar"
                      style={{ 
                        height: `${(data.revenue / Math.max(...salesData.map(d => d.revenue))) * 80}%`
                      }}
                    ></div>
                    <div className="chart-label">{data.month}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">Ma'lumot mavjud emas</div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="dashboard-widget recent-orders">
          <div className="widget-header">
            <h3>So'nggi buyurtmalar</h3>
            <button className="view-all-button">Barchasini ko'rish</button>
          </div>
          <div className="orders-list">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="order-item"
                  onClick={() => handleQuickAction('view-order', order.id)}
                >
                  <div className="order-info">
                    <div className="order-customer">{order.customerName}</div>
                    <div className="order-details">
                      #{order.id.slice(-8)} • {order.itemCount} ta mahsulot
                    </div>
                    <div className="order-date">{formatDate(order.createdAt)}</div>
                  </div>
                  <div className="order-amount">{formatCurrency(order.amount)}</div>
                  <div 
                    className="order-status"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {getStatusText(order.status)}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">Buyurtmalar mavjud emas</div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="dashboard-widget top-products">
          <div className="widget-header">
            <h3>Eng sotilgan mahsulotlar</h3>
          </div>
          <div className="products-list">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div key={product.id} className="product-item">
                  <div className="product-rank">#{index + 1}</div>
                  <img src={product.image} alt={product.name} className="product-image" />
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    <div className="product-stats">
                      {product.sales} ta sotilgan • {formatCurrency(product.revenue)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">Ma'lumot mavjud emas</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-widget quick-actions">
          <div className="widget-header">
            <h3>Tezkor amallar</h3>
          </div>
          <div className="actions-grid">
            <button className="quick-action-button">
              <span className="action-icon">➕</span>
              <span>Mahsulot qo'shish</span>
            </button>
            <button className="quick-action-button">
              <span className="action-icon">📝</span>
              <span>Buyurtma yaratish</span>
            </button>
            <button className="quick-action-button">
              <span className="action-icon">👤</span>
              <span>Foydalanuvchi qo'shish</span>
            </button>
            <button className="quick-action-button">
              <span className="action-icon">📊</span>
              <span>Hisobotlar</span>
            </button>
            <button className="quick-action-button">
              <span className="action-icon">⚙️</span>
              <span>Sozlamalar</span>
            </button>
            <button className="quick-action-button">
              <span className="action-icon">🔔</span>
              <span>Bildirishnomalar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;