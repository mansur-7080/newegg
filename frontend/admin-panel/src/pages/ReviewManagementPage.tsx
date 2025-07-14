import React, { useState, useEffect } from 'react';
import './ReviewManagementPage.css';

interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  verified: boolean;
  helpful: number;
  notHelpful: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
  moderatorNote?: string;
  images: string[];
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  sentimentScore: number;
  flaggedReasons: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
    reviewCount: number;
    averageRating: number;
  };
  product: {
    name: string;
    image: string;
  };
}

interface ReviewFilters {
  status: string;
  sentiment: string;
  verified: string;
  rating: string;
  productId: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  dateFrom: string;
  dateTo: string;
}

interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  averageRating: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  verifiedPercentage: number;
}

const ReviewManagementPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationAction, setModerationAction] = useState<'APPROVE' | 'REJECT' | 'FLAG'>('APPROVE');
  const [moderationNote, setModerationNote] = useState('');

  const [filters, setFilters] = useState<ReviewFilters>({
    status: '',
    sentiment: '',
    verified: '',
    rating: '',
    productId: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    dateFrom: '',
    dateTo: '',
  });

  const statusOptions = [
    { value: '', label: 'Barcha holatlar' },
    { value: 'PENDING', label: 'Kutilmoqda' },
    { value: 'APPROVED', label: 'Tasdiqlangan' },
    { value: 'REJECTED', label: 'Rad etilgan' },
    { value: 'FLAGGED', label: 'Belgilangan' },
  ];

  const sentimentOptions = [
    { value: '', label: 'Barcha his-tuyg\'ular' },
    { value: 'POSITIVE', label: 'Ijobiy' },
    { value: 'NEGATIVE', label: 'Salbiy' },
    { value: 'NEUTRAL', label: 'Neytral' },
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Yaratilgan sana' },
    { value: 'rating', label: 'Reyting' },
    { value: 'helpful', label: 'Foydali' },
    { value: 'sentimentScore', label: 'His-tuyg\'u ballari' },
  ];

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [currentPage, filters]);

  const fetchReviews = async () => {
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

      const response = await fetch(`/api/v1/admin/reviews?${queryParams}`, {
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
        setReviews(data.data.reviews);
        setTotalPages(data.data.totalPages);
        setTotalReviews(data.data.total);
      } else {
        throw new Error(data.message || 'Failed to fetch reviews');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/v1/admin/reviews/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const moderateReview = async () => {
    try {
      if (!selectedReview) return;

      setError(null);

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/v1/admin/reviews/${selectedReview.id}/moderate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: moderationAction,
          note: moderationNote,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update review in the list
        setReviews(prev => prev.map(review => 
          review.id === selectedReview.id 
            ? { 
                ...review, 
                status: moderationAction,
                moderatorNote: moderationNote,
              }
            : review
        ));

        setShowModerationModal(false);
        setSelectedReview(null);
        setModerationNote('');
        
        // Refresh stats
        await fetchStats();
        
        alert('Sharh muvaffaqiyatli moderatsiya qilindi');
      } else {
        throw new Error(data.message || 'Failed to moderate review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to moderate review');
      console.error('Error moderating review:', err);
    }
  };

  const bulkModerateReviews = async (action: 'APPROVE' | 'REJECT' | 'FLAG') => {
    if (selectedReviews.size === 0) return;

    const confirmed = window.confirm(
      `${selectedReviews.size} ta sharhni ${action === 'APPROVE' ? 'tasdiqlash' : action === 'REJECT' ? 'rad etish' : 'belgilash'}ni xohlaysizmi?`
    );
    
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('/api/v1/admin/reviews/bulk-moderate', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewIds: Array.from(selectedReviews),
          action,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchReviews(); // Refresh reviews list
        await fetchStats(); // Refresh stats
        setSelectedReviews(new Set());
        alert(`${data.data.updatedCount} ta sharh yangilandi`);
      } else {
        throw new Error(data.message || 'Failed to bulk moderate reviews');
      }
    } catch (err) {
      console.error('Error bulk moderating reviews:', err);
      alert(err instanceof Error ? err.message : 'Failed to bulk moderate reviews');
    }
  };

  const deleteReview = async (reviewId: string) => {
    const confirmed = window.confirm('Bu sharhni o\'chirmoqchimisiz?');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/v1/admin/reviews/${reviewId}`, {
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
        await fetchReviews(); // Refresh reviews list
        await fetchStats(); // Refresh stats
        alert('Sharh o\'chirildi');
      } else {
        throw new Error(data.message || 'Failed to delete review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review');
      console.error('Error deleting review:', err);
    }
  };

  const exportReviews = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const queryParams = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        ),
        export: 'true',
      });

      const response = await fetch(`/api/v1/admin/reviews/export?${queryParams}`, {
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
      link.download = `reviews_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting reviews:', err);
      alert('Eksport qilishda xatolik');
    }
  };

  const handleSelectReview = (reviewId: string) => {
    const newSelected = new Set(selectedReviews);
    if (newSelected.has(reviewId)) {
      newSelected.delete(reviewId);
    } else {
      newSelected.add(reviewId);
    }
    setSelectedReviews(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(review => review.id)));
    }
  };

  const openModerationModal = (review: Review) => {
    setSelectedReview(review);
    setShowModerationModal(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'APPROVED': return '#10b981';
      case 'REJECTED': return '#ef4444';
      case 'FLAGGED': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Kutilmoqda';
      case 'APPROVED': return 'Tasdiqlangan';
      case 'REJECTED': return 'Rad etilgan';
      case 'FLAGGED': return 'Belgilangan';
      default: return status;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE': return '#10b981';
      case 'NEGATIVE': return '#ef4444';
      case 'NEUTRAL': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getSentimentText = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE': return 'Ijobiy';
      case 'NEGATIVE': return 'Salbiy';
      case 'NEUTRAL': return 'Neytral';
      default: return sentiment;
    }
  };

  const renderRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < rating) {
        stars.push(<span key={i} className="star filled">★</span>);
      } else {
        stars.push(<span key={i} className="star empty">☆</span>);
      }
    }
    return <div className="rating-stars">{stars}</div>;
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="review-management-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Sharhlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-management-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Sharhlar boshqaruvi</h1>
          <div className="review-stats">
            <span className="stat">Jami: {totalReviews}</span>
            <span className="stat">Sahifa: {currentPage}/{totalPages}</span>
            <span className="stat">Tanlangan: {selectedReviews.size}</span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={exportReviews} className="export-button">
            📊 Eksport
          </button>
          <button onClick={fetchReviews} className="refresh-button">
            🔄 Yangilash
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{stats.total.toLocaleString()}</div>
              <div className="stat-label">Jami sharhlar</div>
            </div>
          </div>
          
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{stats.pending.toLocaleString()}</div>
              <div className="stat-label">Kutilmoqda</div>
            </div>
          </div>
          
          <div className="stat-card approved">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{stats.approved.toLocaleString()}</div>
              <div className="stat-label">Tasdiqlangan</div>
            </div>
          </div>
          
          <div className="stat-card rejected">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-number">{stats.rejected.toLocaleString()}</div>
              <div className="stat-label">Rad etilgan</div>
            </div>
          </div>
          
          <div className="stat-card rating">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <div className="stat-number">{stats.averageRating.toFixed(1)}</div>
              <div className="stat-label">O'rtacha reyting</div>
            </div>
          </div>
          
          <div className="stat-card verified">
            <div className="stat-icon">🔒</div>
            <div className="stat-content">
              <div className="stat-number">{stats.verifiedPercentage.toFixed(0)}%</div>
              <div className="stat-label">Tasdiqlangan</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Qidiruv</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Sharh mazmuni, foydalanuvchi..."
            />
          </div>

          <div className="filter-group">
            <label>Holat</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>His-tuyg'u</label>
            <select
              value={filters.sentiment}
              onChange={(e) => setFilters(prev => ({ ...prev, sentiment: e.target.value }))}
            >
              {sentimentOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Reyting</label>
            <select
              value={filters.rating}
              onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
            >
              <option value="">Barcha reytinglar</option>
              <option value="5">5 ⭐</option>
              <option value="4">4 ⭐</option>
              <option value="3">3 ⭐</option>
              <option value="2">2 ⭐</option>
              <option value="1">1 ⭐</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Tasdiqlangan</label>
            <select
              value={filters.verified}
              onChange={(e) => setFilters(prev => ({ ...prev, verified: e.target.value }))}
            >
              <option value="">Barcha</option>
              <option value="true">Tasdiqlangan</option>
              <option value="false">Tasdiqlanmagan</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Saralash</label>
            <div className="sort-controls">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                }))}
                className="sort-order-button"
              >
                {filters.sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button
            onClick={() => setFilters({
              status: '',
              sentiment: '',
              verified: '',
              rating: '',
              productId: '',
              search: '',
              sortBy: 'createdAt',
              sortOrder: 'desc',
              dateFrom: '',
              dateTo: '',
            })}
            className="clear-filters"
          >
            Filtrlarni tozalash
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedReviews.size > 0 && (
        <div className="bulk-actions">
          <div className="bulk-info">
            {selectedReviews.size} ta sharh tanlangan
          </div>
          <div className="bulk-controls">
            <button
              onClick={() => bulkModerateReviews('APPROVE')}
              className="bulk-approve"
            >
              ✅ Tasdiqlash
            </button>
            <button
              onClick={() => bulkModerateReviews('REJECT')}
              className="bulk-reject"
            >
              ❌ Rad etish
            </button>
            <button
              onClick={() => bulkModerateReviews('FLAG')}
              className="bulk-flag"
            >
              🚩 Belgilash
            </button>
          </div>
        </div>
      )}

      {/* Reviews Table */}
      <div className="reviews-table-container">
        <table className="reviews-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={reviews.length > 0 && selectedReviews.size === reviews.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Foydalanuvchi</th>
              <th>Mahsulot</th>
              <th>Reyting</th>
              <th>Sharh</th>
              <th>His-tuyg'u</th>
              <th>Holat</th>
              <th>Sana</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(review => (
              <tr key={review.id} className={selectedReviews.has(review.id) ? 'selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedReviews.has(review.id)}
                    onChange={() => handleSelectReview(review.id)}
                  />
                </td>
                <td>
                  <div className="user-info">
                    {review.user.avatar ? (
                      <img src={review.user.avatar} alt="Avatar" className="user-avatar" />
                    ) : (
                      <div className="user-avatar-placeholder">
                        {review.user.firstName.charAt(0)}{review.user.lastName.charAt(0)}
                      </div>
                    )}
                    <div className="user-details">
                      <div className="user-name">
                        {review.user.firstName} {review.user.lastName}
                        {review.verified && <span className="verified-badge">✅</span>}
                      </div>
                      <div className="user-stats">
                        {review.user.reviewCount} ta sharh
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="product-info">
                    <img src={review.product.image} alt={review.product.name} className="product-image" />
                    <span className="product-name">{review.product.name}</span>
                  </div>
                </td>
                <td>
                  <div className="rating-cell">
                    {renderRatingStars(review.rating)}
                    <span className="rating-number">{review.rating}/5</span>
                  </div>
                </td>
                <td>
                  <div className="review-content">
                    <div className="review-title">{review.title}</div>
                    <div className="review-text">{review.comment.substring(0, 100)}...</div>
                    <div className="review-meta">
                      <span className="helpful">👍 {review.helpful}</span>
                      <span className="not-helpful">👎 {review.notHelpful}</span>
                      {review.flaggedReasons.length > 0 && (
                        <span className="flagged">🚩 {review.flaggedReasons.length}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="sentiment-cell">
                    <span 
                      className="sentiment-badge"
                      style={{ backgroundColor: getSentimentColor(review.sentiment) }}
                    >
                      {getSentimentText(review.sentiment)}
                    </span>
                    <div className="sentiment-score">{review.sentimentScore.toFixed(2)}</div>
                  </div>
                </td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(review.status) }}
                  >
                    {getStatusText(review.status)}
                  </span>
                  {review.moderatorNote && (
                    <div className="moderator-note" title={review.moderatorNote}>
                      📝 Izoh mavjud
                    </div>
                  )}
                </td>
                <td>
                  <div className="date-cell">
                    <div className="created-date">{formatDate(review.createdAt)}</div>
                    {review.updatedAt !== review.createdAt && (
                      <div className="updated-date">Yangilangan: {formatDate(review.updatedAt)}</div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="review-actions">
                    <button
                      onClick={() => openModerationModal(review)}
                      className="action-button moderate"
                      title="Moderatsiya"
                    >
                      ⚖️
                    </button>
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="action-button delete"
                      title="O'chirish"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {reviews.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Sharhlar topilmadi</h3>
            <p>Filtr shartlariga mos keluvchi sharh topilmadi</p>
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

      {/* Moderation Modal */}
      {showModerationModal && selectedReview && (
        <div className="modal-overlay" onClick={() => setShowModerationModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sharh moderatsiyasi</h2>
              <button onClick={() => setShowModerationModal(false)} className="close-button">✕</button>
            </div>

            <div className="modal-body">
              <div className="review-details">
                <div className="review-header">
                  <div className="reviewer-info">
                    {selectedReview.user.avatar ? (
                      <img src={selectedReview.user.avatar} alt="Avatar" className="reviewer-avatar" />
                    ) : (
                      <div className="reviewer-avatar-placeholder">
                        {selectedReview.user.firstName.charAt(0)}{selectedReview.user.lastName.charAt(0)}
                      </div>
                    )}
                    <div className="reviewer-details">
                      <div className="reviewer-name">
                        {selectedReview.user.firstName} {selectedReview.user.lastName}
                        {selectedReview.verified && <span className="verified-badge">✅ Tasdiqlangan</span>}
                      </div>
                      <div className="reviewer-stats">
                        {selectedReview.user.reviewCount} ta sharh, O'rtacha: {selectedReview.user.averageRating.toFixed(1)}⭐
                      </div>
                    </div>
                  </div>
                  
                  <div className="review-meta">
                    {renderRatingStars(selectedReview.rating)}
                    <div className="review-date">{formatDate(selectedReview.createdAt)}</div>
                  </div>
                </div>

                <div className="product-info">
                  <img src={selectedReview.product.image} alt={selectedReview.product.name} />
                  <span>{selectedReview.product.name}</span>
                </div>

                <div className="review-content">
                  <h3>{selectedReview.title}</h3>
                  <p>{selectedReview.comment}</p>
                  
                  {selectedReview.pros.length > 0 && (
                    <div className="pros">
                      <strong>Ijobiy tomonlari:</strong>
                      <ul>
                        {selectedReview.pros.map((pro, index) => (
                          <li key={index}>+ {pro}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedReview.cons.length > 0 && (
                    <div className="cons">
                      <strong>Salbiy tomonlari:</strong>
                      <ul>
                        {selectedReview.cons.map((con, index) => (
                          <li key={index}>- {con}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedReview.images.length > 0 && (
                    <div className="review-images">
                      <strong>Rasmlar:</strong>
                      <div className="images-grid">
                        {selectedReview.images.map((image, index) => (
                          <img key={index} src={image} alt={`Review image ${index + 1}`} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="review-analysis">
                  <div className="sentiment-analysis">
                    <strong>His-tuyg'u tahlili:</strong>
                    <span 
                      className="sentiment"
                      style={{ color: getSentimentColor(selectedReview.sentiment) }}
                    >
                      {getSentimentText(selectedReview.sentiment)} ({selectedReview.sentimentScore.toFixed(2)})
                    </span>
                  </div>
                  
                  <div className="helpfulness">
                    <strong>Foydalilik:</strong>
                    <span>👍 {selectedReview.helpful} | 👎 {selectedReview.notHelpful}</span>
                  </div>

                  {selectedReview.flaggedReasons.length > 0 && (
                    <div className="flagged-reasons">
                      <strong>Belgilangan sabablar:</strong>
                      <ul>
                        {selectedReview.flaggedReasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="moderation-form">
                  <div className="form-group">
                    <label>Moderatsiya harakati</label>
                    <div className="action-buttons">
                      <button
                        className={`action-btn ${moderationAction === 'APPROVE' ? 'active' : ''}`}
                        onClick={() => setModerationAction('APPROVE')}
                      >
                        ✅ Tasdiqlash
                      </button>
                      <button
                        className={`action-btn ${moderationAction === 'REJECT' ? 'active' : ''}`}
                        onClick={() => setModerationAction('REJECT')}
                      >
                        ❌ Rad etish
                      </button>
                      <button
                        className={`action-btn ${moderationAction === 'FLAG' ? 'active' : ''}`}
                        onClick={() => setModerationAction('FLAG')}
                      >
                        🚩 Belgilash
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Moderator izohi</label>
                    <textarea
                      value={moderationNote}
                      onChange={(e) => setModerationNote(e.target.value)}
                      placeholder="Moderatsiya sababi yoki izohi..."
                      rows={3}
                    />
                  </div>
                </div>

                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    onClick={() => setShowModerationModal(false)}
                    className="cancel-button"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={moderateReview}
                    className="moderate-button"
                  >
                    Moderatsiya qilish
                  </button>
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

export default ReviewManagementPage;