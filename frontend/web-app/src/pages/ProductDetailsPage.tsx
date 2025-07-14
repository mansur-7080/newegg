import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProductDetailsPage.css';

interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  sku: string;
  category: {
    id: string;
    name: string;
    nameUz: string;
  };
  brand: {
    id: string;
    name: string;
    logo?: string;
  };
  images: string[];
  specifications: { [key: string]: string };
  stockQuantity: number;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  tags: string[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  createdAt: string;
}

interface Review {
  id: string;
  userId: string;
  rating: number;
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  verified: boolean;
  helpful: number;
  notHelpful: number;
  images: string[];
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
    reviewCount: number;
  };
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    [key: number]: number;
  };
  verifiedReviewsCount: number;
  verifiedPercentage: number;
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
}

const ProductDetailsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
    pros: '',
    cons: '',
  });

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
      fetchReviews();
      fetchRelatedProducts();
    }
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/products/${productId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Mahsulot topilmadi');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProduct(data.data.product);
      } else {
        throw new Error(data.message || 'Failed to fetch product');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mahsulot yuklashda xatolik');
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (page: number = 1) => {
    try {
      setReviewsLoading(true);

      const response = await fetch(`/api/v1/reviews?productId=${productId}&page=${page}&limit=10`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        if (page === 1) {
          setReviews(data.data.reviews);
          setReviewStats(data.data.stats);
        } else {
          setReviews(prev => [...prev, ...data.data.reviews]);
        }
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchRelatedProducts = async () => {
    try {
      if (!product) return;

      const response = await fetch(`/api/v1/products?category=${product.category.id}&limit=8&exclude=${productId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRelatedProducts(data.data.products);
      }
    } catch (err) {
      console.error('Error fetching related products:', err);
    }
  };

  const addToCart = async () => {
    try {
      setAddingToCart(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('/api/v1/cart/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert('Mahsulot savatga qo\'shildi!');
        
        // Update stock quantity in UI
        if (product) {
          setProduct(prev => prev ? {
            ...prev,
            stockQuantity: Math.max(0, prev.stockQuantity - quantity)
          } : null);
        }
      } else {
        throw new Error(data.message || 'Failed to add to cart');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Savatga qo\'shishda xatolik');
      console.error('Error adding to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  const submitReview = async () => {
    try {
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      if (!reviewForm.title.trim() || !reviewForm.comment.trim()) {
        setError('Iltimos, barcha majburiy maydonlarni to\'ldiring');
        return;
      }

      const response = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating: reviewForm.rating,
          title: reviewForm.title,
          comment: reviewForm.comment,
          pros: reviewForm.pros ? reviewForm.pros.split(',').map(p => p.trim()).filter(Boolean) : [],
          cons: reviewForm.cons ? reviewForm.cons.split(',').map(c => c.trim()).filter(Boolean) : [],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert('Sharh muvaffaqiyatli qo\'shildi!');
        setShowWriteReview(false);
        setReviewForm({
          rating: 5,
          title: '',
          comment: '',
          pros: '',
          cons: '',
        });
        
        // Refresh reviews
        await fetchReviews(1);
        setReviewsPage(1);
      } else {
        throw new Error(data.message || 'Failed to submit review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sharh yuborishda xatolik');
      console.error('Error submitting review:', err);
    }
  };

  const markReviewHelpful = async (reviewId: string, helpful: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`/api/v1/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ helpful }),
      });

      if (response.ok) {
        // Update review in UI
        setReviews(prev => prev.map(review => 
          review.id === reviewId
            ? {
                ...review,
                helpful: helpful ? review.helpful + 1 : review.helpful,
                notHelpful: !helpful ? review.notHelpful + 1 : review.notHelpful,
              }
            : review
        ));
      }
    } catch (err) {
      console.error('Error marking review helpful:', err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  const getDiscountPercentage = () => {
    if (!product?.originalPrice || product.originalPrice <= product.price) return 0;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  };

  const renderRatingStars = (rating: number, size: 'small' | 'medium' | 'large' = 'medium') => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className={`star filled ${size}`}>★</span>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<span key={i} className={`star half ${size}`}>★</span>);
      } else {
        stars.push(<span key={i} className={`star empty ${size}`}>☆</span>);
      }
    }

    return <div className="rating-stars">{stars}</div>;
  };

  const renderRatingDistribution = () => {
    if (!reviewStats) return null;

    return (
      <div className="rating-distribution">
        {[5, 4, 3, 2, 1].map(rating => {
          const count = reviewStats.ratingDistribution[rating] || 0;
          const percentage = reviewStats.totalReviews > 0 
            ? (count / reviewStats.totalReviews) * 100 
            : 0;

          return (
            <div key={rating} className="rating-bar">
              <span className="rating-label">{rating} ⭐</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="rating-count">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const loadMoreReviews = () => {
    const nextPage = reviewsPage + 1;
    setReviewsPage(nextPage);
    fetchReviews(nextPage);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="product-details-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Mahsulot yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-details-page">
        <div className="error-container">
          <h2>Xatolik yuz berdi</h2>
          <p>{error || 'Mahsulot topilmadi'}</p>
          <button onClick={() => navigate('/products')} className="back-button">
            Mahsulotlarga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-details-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button onClick={() => navigate('/products')}>Mahsulotlar</button>
        <span>/</span>
        <button onClick={() => navigate(`/products?category=${product.category.id}`)}>
          {product.category.nameUz}
        </button>
        <span>/</span>
        <span>{product.name}</span>
      </div>

      {/* Product Main Section */}
      <div className="product-main">
        {/* Product Images */}
        <div className="product-images">
          <div className="main-image">
            <img 
              src={product.images[selectedImageIndex] || '/placeholder-product.jpg'} 
              alt={product.name}
            />
            {getDiscountPercentage() > 0 && (
              <div className="discount-badge">-{getDiscountPercentage()}%</div>
            )}
          </div>
          
          {product.images.length > 1 && (
            <div className="image-thumbnails">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-info">
          <div className="product-header">
            <div className="brand-info">
              {product.brand.logo && (
                <img src={product.brand.logo} alt={product.brand.name} className="brand-logo" />
              )}
              <span className="brand-name">{product.brand.name}</span>
            </div>
            
            <h1 className="product-name">{product.name}</h1>
            
            <div className="product-meta">
              <div className="rating-section">
                {renderRatingStars(product.rating, 'medium')}
                <span className="rating-text">
                  {product.rating.toFixed(1)} ({product.reviewCount} sharh)
                </span>
              </div>
              
              <div className="product-stats">
                <span className="sold-count">{product.soldCount} ta sotilgan</span>
                <span className="sku">SKU: {product.sku}</span>
              </div>
            </div>
          </div>

          <div className="product-description">
            <p>{product.shortDescription}</p>
          </div>

          <div className="product-tags">
            {product.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>

          <div className="price-section">
            <div className="current-price">{formatPrice(product.price)}</div>
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="original-price">{formatPrice(product.originalPrice)}</div>
            )}
          </div>

          <div className="stock-section">
            {product.inStock ? (
              product.stockQuantity > 10 ? (
                <div className="stock-status in-stock">
                  ✅ Mavjud ({product.stockQuantity} ta)
                </div>
              ) : (
                <div className="stock-status low-stock">
                  ⚠️ Ozgina qoldi ({product.stockQuantity} ta)
                </div>
              )
            ) : (
              <div className="stock-status out-of-stock">
                ❌ Tugagan
              </div>
            )}
          </div>

          {product.inStock && (
            <div className="purchase-section">
              <div className="quantity-selector">
                <label>Miqdor:</label>
                <div className="quantity-controls">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="quantity">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                    disabled={quantity >= product.stockQuantity}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="purchase-buttons">
                <button
                  onClick={addToCart}
                  disabled={addingToCart || !product.inStock}
                  className="add-to-cart-button"
                >
                  {addingToCart ? 'Qo\'shilmoqda...' : '🛒 Savatga qo\'shish'}
                </button>
                
                <button
                  onClick={() => {
                    addToCart();
                    setTimeout(() => navigate('/checkout'), 1000);
                  }}
                  disabled={addingToCart || !product.inStock}
                  className="buy-now-button"
                >
                  ⚡ Hoziroq sotib olish
                </button>
              </div>
            </div>
          )}

          {/* Product Details Tabs */}
          <div className="product-tabs">
            <div className="tab-headers">
              <button
                className={`tab-header ${activeTab === 'description' ? 'active' : ''}`}
                onClick={() => setActiveTab('description')}
              >
                Tavsif
              </button>
              <button
                className={`tab-header ${activeTab === 'specifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('specifications')}
              >
                Xususiyatlar
              </button>
              <button
                className={`tab-header ${activeTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                Sharhlar ({product.reviewCount})
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'description' && (
                <div className="description-tab">
                  <div className="description-text">
                    {product.description.split('\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                  
                  {product.dimensions && (
                    <div className="dimensions">
                      <h4>O'lchamlari:</h4>
                      <p>
                        {product.dimensions.length} x {product.dimensions.width} x {product.dimensions.height} sm
                        {product.weight && `, Og'irligi: ${product.weight} kg`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'specifications' && (
                <div className="specifications-tab">
                  <div className="specifications-grid">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="specification-row">
                        <span className="spec-label">{key}:</span>
                        <span className="spec-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="reviews-tab">
                  {/* Reviews Summary */}
                  {reviewStats && (
                    <div className="reviews-summary">
                      <div className="overall-rating">
                        <div className="rating-score">{reviewStats.averageRating.toFixed(1)}</div>
                        {renderRatingStars(reviewStats.averageRating, 'large')}
                        <div className="rating-text">
                          {reviewStats.totalReviews} ta sharh
                          {reviewStats.verifiedPercentage > 0 && (
                            <span className="verified-info">
                              ({reviewStats.verifiedPercentage.toFixed(0)}% tasdiqlangan)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="rating-breakdown">
                        {renderRatingDistribution()}
                      </div>
                    </div>
                  )}

                  {/* Write Review Button */}
                  <div className="review-actions">
                    <button
                      onClick={() => setShowWriteReview(true)}
                      className="write-review-button"
                    >
                      ✍️ Sharh yozish
                    </button>
                  </div>

                  {/* Reviews List */}
                  <div className="reviews-list">
                    {reviews.map(review => (
                      <div key={review.id} className="review-card">
                        <div className="review-header">
                          <div className="reviewer-info">
                            {review.user.avatar ? (
                              <img src={review.user.avatar} alt="Avatar" className="reviewer-avatar" />
                            ) : (
                              <div className="reviewer-avatar-placeholder">
                                {review.user.firstName.charAt(0)}{review.user.lastName.charAt(0)}
                              </div>
                            )}
                            <div className="reviewer-details">
                              <div className="reviewer-name">
                                {review.user.firstName} {review.user.lastName}
                                {review.verified && <span className="verified-badge">✅ Tasdiqlangan</span>}
                              </div>
                              <div className="reviewer-stats">
                                {review.user.reviewCount} ta sharh
                              </div>
                            </div>
                          </div>
                          
                          <div className="review-meta">
                            {renderRatingStars(review.rating, 'small')}
                            <div className="review-date">{formatDate(review.createdAt)}</div>
                          </div>
                        </div>

                        <div className="review-content">
                          <h4 className="review-title">{review.title}</h4>
                          <p className="review-comment">{review.comment}</p>
                          
                          {review.pros.length > 0 && (
                            <div className="review-pros">
                              <strong>Ijobiy tomonlari:</strong>
                              <ul>
                                {review.pros.map((pro, index) => (
                                  <li key={index}>+ {pro}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {review.cons.length > 0 && (
                            <div className="review-cons">
                              <strong>Salbiy tomonlari:</strong>
                              <ul>
                                {review.cons.map((con, index) => (
                                  <li key={index}>- {con}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {review.images.length > 0 && (
                            <div className="review-images">
                              {review.images.map((image, index) => (
                                <img key={index} src={image} alt={`Review image ${index + 1}`} />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="review-actions">
                          <button
                            onClick={() => markReviewHelpful(review.id, true)}
                            className="helpful-button"
                          >
                            👍 Foydali ({review.helpful})
                          </button>
                          <button
                            onClick={() => markReviewHelpful(review.id, false)}
                            className="not-helpful-button"
                          >
                            👎 Foydali emas ({review.notHelpful})
                          </button>
                        </div>
                      </div>
                    ))}

                    {reviewsLoading && (
                      <div className="loading-more">
                        <div className="loading-spinner small"></div>
                        <span>Ko'proq sharhlar yuklanmoqda...</span>
                      </div>
                    )}

                    {reviews.length > 0 && reviews.length < (reviewStats?.totalReviews || 0) && (
                      <button
                        onClick={loadMoreReviews}
                        disabled={reviewsLoading}
                        className="load-more-reviews"
                      >
                        Ko'proq sharhlarni ko'rish
                      </button>
                    )}

                    {reviews.length === 0 && (
                      <div className="no-reviews">
                        <p>Hozircha bu mahsulot uchun sharh yo'q.</p>
                        <p>Birinchi bo'lib sharh yozing!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="related-products">
          <h3>O'xshash mahsulotlar</h3>
          <div className="related-products-grid">
            {relatedProducts.map(relatedProduct => (
              <div key={relatedProduct.id} className="related-product-card">
                <img 
                  src={relatedProduct.image} 
                  alt={relatedProduct.name}
                  onClick={() => navigate(`/product/${relatedProduct.id}`)}
                />
                <div className="related-product-info">
                  <h4 onClick={() => navigate(`/product/${relatedProduct.id}`)}>
                    {relatedProduct.name}
                  </h4>
                  {renderRatingStars(relatedProduct.rating, 'small')}
                  <span className="review-count">({relatedProduct.reviewCount})</span>
                  <div className="related-product-price">
                    <span className="current-price">{formatPrice(relatedProduct.price)}</span>
                    {relatedProduct.originalPrice && relatedProduct.originalPrice > relatedProduct.price && (
                      <span className="original-price">{formatPrice(relatedProduct.originalPrice)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      {showWriteReview && (
        <div className="modal-overlay" onClick={() => setShowWriteReview(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sharh yozish</h3>
              <button onClick={() => setShowWriteReview(false)} className="close-button">✕</button>
            </div>

            <div className="review-form">
              <div className="form-group">
                <label>Baho *</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      className={`star-button ${star <= reviewForm.rating ? 'filled' : ''}`}
                      onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Sarlavha *</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Qisqacha sarlavha yozing"
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label>Sharh *</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Mahsulot haqidagi fikringizni yozing"
                  rows={5}
                  maxLength={1000}
                />
              </div>

              <div className="form-group">
                <label>Ijobiy tomonlari</label>
                <input
                  type="text"
                  value={reviewForm.pros}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, pros: e.target.value }))}
                  placeholder="Vergul bilan ajrating"
                />
              </div>

              <div className="form-group">
                <label>Salbiy tomonlari</label>
                <input
                  type="text"
                  value={reviewForm.cons}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, cons: e.target.value }))}
                  placeholder="Vergul bilan ajrating"
                />
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button
                  onClick={() => setShowWriteReview(false)}
                  className="cancel-button"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={submitReview}
                  className="submit-button"
                >
                  Sharhni yuborish
                </button>
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

export default ProductDetailsPage;