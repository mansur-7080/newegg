import React, { useState, useEffect } from 'react';
import './ProductManagementPage.css';

interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  sku: string;
  barcode?: string;
  category: Category;
  brand: Brand;
  images: string[];
  specifications: { [key: string]: string };
  stockQuantity: number;
  lowStockThreshold: number;
  inStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  views: number;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  nameUz: string;
  nameRu: string;
  parentId?: string;
  isActive: boolean;
}

interface Brand {
  id: string;
  name: string;
  logo?: string;
  isActive: boolean;
}

interface ProductFilters {
  search: string;
  category: string;
  brand: string;
  status: string;
  stockStatus: string;
  priceMin: string;
  priceMax: string;
  featured: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const ProductManagementPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
    brand: '',
    status: '',
    stockStatus: '',
    priceMin: '',
    priceMax: '',
    featured: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    shortDescription: '',
    price: '',
    originalPrice: '',
    sku: '',
    barcode: '',
    categoryId: '',
    brandId: '',
    stockQuantity: '',
    lowStockThreshold: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    tags: '',
    seoTitle: '',
    seoDescription: '',
    specifications: {} as { [key: string]: string },
    images: [] as string[],
    isActive: true,
    isFeatured: false,
  });

  // Bulk actions
  const [bulkAction, setBulkAction] = useState('');
  const [bulkParams, setBulkParams] = useState({
    status: '',
    featured: '',
    category: '',
    brand: '',
    priceIncrease: '',
    priceDecrease: '',
  });

  const stockStatusOptions = [
    { value: '', label: 'Barcha holat' },
    { value: 'inStock', label: 'Mavjud' },
    { value: 'lowStock', label: 'Kam qolgan' },
    { value: 'outOfStock', label: 'Tugagan' },
  ];

  const sortOptions = [
    { value: 'name', label: 'Nomi' },
    { value: 'price', label: 'Narxi' },
    { value: 'stockQuantity', label: 'Miqdor' },
    { value: 'soldCount', label: 'Sotilgan' },
    { value: 'rating', label: 'Reyting' },
    { value: 'createdAt', label: 'Yaratilgan sana' },
    { value: 'updatedAt', label: 'Yangilangan sana' },
  ];

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
  }, [currentPage, filters]);

  const fetchProducts = async () => {
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

      const response = await fetch(`/api/v1/admin/products?${queryParams}`, {
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
        setProducts(data.data.products);
        setTotalPages(data.data.totalPages);
        setTotalProducts(data.data.total);
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/v1/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategories(data.data.categories);
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/v1/admin/brands', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBrands(data.data.brands);
        }
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
    }
  };

  const saveProduct = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!productForm.name || !productForm.price || !productForm.sku || !productForm.categoryId) {
        throw new Error('Please fill in all required fields');
      }

      const token = localStorage.getItem('adminToken');
      const isEditing = !!editingProduct;
      const url = isEditing 
        ? `/api/v1/admin/products/${editingProduct.id}`
        : '/api/v1/admin/products';

      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        originalPrice: productForm.originalPrice ? parseFloat(productForm.originalPrice) : undefined,
        stockQuantity: parseInt(productForm.stockQuantity),
        lowStockThreshold: parseInt(productForm.lowStockThreshold) || 10,
        weight: productForm.weight ? parseFloat(productForm.weight) : undefined,
        dimensions: productForm.length && productForm.width && productForm.height ? {
          length: parseFloat(productForm.length),
          width: parseFloat(productForm.width),
          height: parseFloat(productForm.height),
        } : undefined,
        tags: productForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchProducts(); // Refresh products list
        setShowProductForm(false);
        setEditingProduct(null);
        resetProductForm();
        alert(isEditing ? 'Mahsulot yangilandi' : 'Mahsulot qo\'shildi');
      } else {
        throw new Error(data.message || 'Failed to save product');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
      console.error('Error saving product:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    const confirmed = window.confirm('Bu mahsulotni o\'chirmoqchimisiz?');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/v1/admin/products/${productId}`, {
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
        await fetchProducts(); // Refresh products list
        alert('Mahsulot o\'chirildi');
      } else {
        throw new Error(data.message || 'Failed to delete product');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      console.error('Error deleting product:', err);
    }
  };

  const updateProductStock = async (productId: string, newStock: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/v1/admin/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stockQuantity: newStock }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update product in the list
        setProducts(prevProducts =>
          prevProducts.map(product =>
            product.id === productId 
              ? { ...product, stockQuantity: newStock, inStock: newStock > 0 }
              : product
          )
        );
      } else {
        throw new Error(data.message || 'Failed to update stock');
      }
    } catch (err) {
      console.error('Error updating stock:', err);
      alert(err instanceof Error ? err.message : 'Failed to update stock');
    }
  };

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/v1/admin/products/${productId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update product in the list
        setProducts(prevProducts =>
          prevProducts.map(product =>
            product.id === productId ? { ...product, isActive } : product
          )
        );
      } else {
        throw new Error(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const bulkUpdateProducts = async () => {
    if (!bulkAction || selectedProducts.size === 0) return;

    const confirmed = window.confirm(
      `${selectedProducts.size} ta mahsulotni yangilashni xohlaysizmi?`
    );
    
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('adminToken');
      
      let updateData: any = {};
      
      switch (bulkAction) {
        case 'status':
          updateData.isActive = bulkParams.status === 'active';
          break;
        case 'featured':
          updateData.isFeatured = bulkParams.featured === 'true';
          break;
        case 'category':
          updateData.categoryId = bulkParams.category;
          break;
        case 'brand':
          updateData.brandId = bulkParams.brand;
          break;
        case 'priceIncrease':
          updateData.priceIncrease = parseFloat(bulkParams.priceIncrease);
          break;
        case 'priceDecrease':
          updateData.priceDecrease = parseFloat(bulkParams.priceDecrease);
          break;
      }

      const response = await fetch('/api/v1/admin/products/bulk-update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: Array.from(selectedProducts),
          updateData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchProducts(); // Refresh products list
        setSelectedProducts(new Set());
        setBulkAction('');
        setBulkParams({
          status: '',
          featured: '',
          category: '',
          brand: '',
          priceIncrease: '',
          priceDecrease: '',
        });
        alert(`${data.data.updatedCount} ta mahsulot yangilandi`);
      } else {
        throw new Error(data.message || 'Failed to bulk update products');
      }
    } catch (err) {
      console.error('Error bulk updating products:', err);
      alert(err instanceof Error ? err.message : 'Failed to bulk update products');
    }
  };

  const exportProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const queryParams = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        ),
        export: 'true',
      });

      const response = await fetch(`/api/v1/admin/products/export?${queryParams}`, {
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
      link.download = `products_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting products:', err);
      alert('Eksport qilishda xatolik');
    }
  };

  const uploadProductImages = async (files: FileList) => {
    try {
      setUploadingImages(true);
      
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      
      Array.from(files).forEach((file, index) => {
        formData.append(`images`, file);
      });

      const response = await fetch('/api/v1/admin/products/upload-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProductForm(prev => ({
          ...prev,
          images: [...prev.images, ...data.data.imageUrls],
        }));
      } else {
        throw new Error(data.message || 'Failed to upload images');
      }
    } catch (err) {
      console.error('Error uploading images:', err);
      alert(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      sku: product.sku,
      barcode: product.barcode || '',
      categoryId: product.category.id,
      brandId: product.brand.id,
      stockQuantity: product.stockQuantity.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      weight: product.weight?.toString() || '',
      length: product.dimensions?.length.toString() || '',
      width: product.dimensions?.width.toString() || '',
      height: product.dimensions?.height.toString() || '',
      tags: product.tags.join(', '),
      seoTitle: product.seoTitle || '',
      seoDescription: product.seoDescription || '',
      specifications: { ...product.specifications },
      images: [...product.images],
      isActive: product.isActive,
      isFeatured: product.isFeatured,
    });
    setShowProductForm(true);
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      description: '',
      shortDescription: '',
      price: '',
      originalPrice: '',
      sku: '',
      barcode: '',
      categoryId: '',
      brandId: '',
      stockQuantity: '',
      lowStockThreshold: '',
      weight: '',
      length: '',
      width: '',
      height: '',
      tags: '',
      seoTitle: '',
      seoDescription: '',
      specifications: {},
      images: [],
      isActive: true,
      isFeatured: false,
    });
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(product => product.id)));
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  const getStockStatus = (product: Product) => {
    if (!product.inStock || product.stockQuantity === 0) return 'outOfStock';
    if (product.stockQuantity <= product.lowStockThreshold) return 'lowStock';
    return 'inStock';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'inStock': return '#10b981';
      case 'lowStock': return '#f59e0b';
      case 'outOfStock': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'inStock': return 'Mavjud';
      case 'lowStock': return 'Kam qolgan';
      case 'outOfStock': return 'Tugagan';
      default: return 'Noma\'lum';
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="product-management-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Mahsulotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-management-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Mahsulotlar boshqaruvi</h1>
          <div className="product-stats">
            <span className="stat">Jami: {totalProducts}</span>
            <span className="stat">Sahifa: {currentPage}/{totalPages}</span>
            <span className="stat">Tanlangan: {selectedProducts.size}</span>
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => {
              resetProductForm();
              setEditingProduct(null);
              setShowProductForm(true);
            }}
            className="add-product-button"
          >
            + Mahsulot qo'shish
          </button>
          <button onClick={exportProducts} className="export-button">
            📊 Eksport
          </button>
          <button onClick={fetchProducts} className="refresh-button">
            🔄 Yangilash
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Qidiruv</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Mahsulot nomi, SKU..."
            />
          </div>

          <div className="filter-group">
            <label>Kategoriya</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="">Barcha kategoriyalar</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.nameUz}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Brend</label>
            <select
              value={filters.brand}
              onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
            >
              <option value="">Barcha brendlar</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Holat</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Barcha holatlar</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Ombor holati</label>
            <select
              value={filters.stockStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value }))}
            >
              {stockStatusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
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
              search: '',
              category: '',
              brand: '',
              status: '',
              stockStatus: '',
              priceMin: '',
              priceMax: '',
              featured: '',
              sortBy: 'createdAt',
              sortOrder: 'desc',
            })}
            className="clear-filters"
          >
            Filtrlarni tozalash
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <div className="bulk-actions">
          <div className="bulk-info">
            {selectedProducts.size} ta mahsulot tanlangan
          </div>
          <div className="bulk-controls">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">Amalni tanlang</option>
              <option value="status">Holatni o'zgartirish</option>
              <option value="featured">Featured o'zgartirish</option>
              <option value="category">Kategoriyani o'zgartirish</option>
              <option value="brand">Brendni o'zgartirish</option>
              <option value="priceIncrease">Narxni oshirish (%)</option>
              <option value="priceDecrease">Narxni kamaytirish (%)</option>
            </select>

            {bulkAction === 'status' && (
              <select
                value={bulkParams.status}
                onChange={(e) => setBulkParams(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Holatni tanlang</option>
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
              </select>
            )}

            {bulkAction === 'featured' && (
              <select
                value={bulkParams.featured}
                onChange={(e) => setBulkParams(prev => ({ ...prev, featured: e.target.value }))}
              >
                <option value="">Featured holatini tanlang</option>
                <option value="true">Ha</option>
                <option value="false">Yo'q</option>
              </select>
            )}

            {bulkAction === 'category' && (
              <select
                value={bulkParams.category}
                onChange={(e) => setBulkParams(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Kategoriyani tanlang</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.nameUz}</option>
                ))}
              </select>
            )}

            {bulkAction === 'brand' && (
              <select
                value={bulkParams.brand}
                onChange={(e) => setBulkParams(prev => ({ ...prev, brand: e.target.value }))}
              >
                <option value="">Brendni tanlang</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            )}

            {(bulkAction === 'priceIncrease' || bulkAction === 'priceDecrease') && (
              <input
                type="number"
                value={bulkAction === 'priceIncrease' ? bulkParams.priceIncrease : bulkParams.priceDecrease}
                onChange={(e) => setBulkParams(prev => ({ 
                  ...prev, 
                  [bulkAction]: e.target.value 
                }))}
                placeholder="Foiz miqdori"
                min="0"
                max="100"
              />
            )}

            <button
              onClick={bulkUpdateProducts}
              disabled={!bulkAction}
              className="apply-bulk"
            >
              Qo'llash
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={products.length > 0 && selectedProducts.size === products.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Mahsulot</th>
              <th>SKU</th>
              <th>Kategoriya</th>
              <th>Brend</th>
              <th>Narx</th>
              <th>Ombor</th>
              <th>Holat</th>
              <th>Reyting</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const stockStatus = getStockStatus(product);
              return (
                <tr key={product.id} className={selectedProducts.has(product.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                    />
                  </td>
                  <td>
                    <div className="product-info">
                      <img 
                        src={product.images[0] || '/placeholder-product.jpg'} 
                        alt={product.name}
                        className="product-image"
                      />
                      <div className="product-details">
                        <div className="product-name">{product.name}</div>
                        <div className="product-description">{product.shortDescription}</div>
                        {product.isFeatured && <span className="featured-badge">⭐ Featured</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="product-sku">{product.sku}</span>
                  </td>
                  <td>
                    <span className="product-category">{product.category.nameUz}</span>
                  </td>
                  <td>
                    <span className="product-brand">{product.brand.name}</span>
                  </td>
                  <td>
                    <div className="product-price">
                      <span className="current-price">{formatPrice(product.price)}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="original-price">{formatPrice(product.originalPrice)}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="stock-info">
                      <span 
                        className="stock-status"
                        style={{ color: getStockStatusColor(stockStatus) }}
                      >
                        {getStockStatusText(stockStatus)}
                      </span>
                      <input
                        type="number"
                        value={product.stockQuantity}
                        onChange={(e) => {
                          const newStock = parseInt(e.target.value) || 0;
                          updateProductStock(product.id, newStock);
                        }}
                        className="stock-input"
                        min="0"
                      />
                    </div>
                  </td>
                  <td>
                    <label className="status-switch">
                      <input
                        type="checkbox"
                        checked={product.isActive}
                        onChange={(e) => toggleProductStatus(product.id, e.target.checked)}
                      />
                      <span className="status-slider"></span>
                    </label>
                  </td>
                  <td>
                    <div className="product-rating">
                      <span className="rating-stars">⭐ {product.rating.toFixed(1)}</span>
                      <span className="rating-count">({product.reviewCount})</span>
                    </div>
                  </td>
                  <td>
                    <div className="product-actions">
                      <button
                        onClick={() => editProduct(product)}
                        className="action-button edit"
                        title="Tahrirlash"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="action-button delete"
                        title="O'chirish"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {products.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>Mahsulotlar topilmadi</h3>
            <p>Hozircha hech qanday mahsulot yo'q yoki filtr shartlariga mos keluvchi mahsulot topilmadi</p>
            <button 
              onClick={() => {
                resetProductForm();
                setEditingProduct(null);
                setShowProductForm(true);
              }}
              className="add-first-product"
            >
              Birinchi mahsulot qo'shish
            </button>
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

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="modal-overlay" onClick={() => setShowProductForm(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}</h2>
              <button onClick={() => setShowProductForm(false)} className="close-button">✕</button>
            </div>

            <div className="modal-body">
              <div className="product-form">
                <div className="form-section">
                  <h3>Asosiy ma'lumotlar</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Mahsulot nomi *</label>
                      <input
                        type="text"
                        value={productForm.name}
                        onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Mahsulot nomini kiriting"
                      />
                    </div>
                    <div className="form-group">
                      <label>SKU *</label>
                      <input
                        type="text"
                        value={productForm.sku}
                        onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                        placeholder="SKU kodi"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Qisqa tavsif</label>
                    <input
                      type="text"
                      value={productForm.shortDescription}
                      onChange={(e) => setProductForm(prev => ({ ...prev, shortDescription: e.target.value }))}
                      placeholder="Qisqa tavsif"
                    />
                  </div>

                  <div className="form-group">
                    <label>To'liq tavsif</label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Mahsulot haqida batafsil ma'lumot"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h3>Kategoriya va brend</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Kategoriya *</label>
                      <select
                        value={productForm.categoryId}
                        onChange={(e) => setProductForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      >
                        <option value="">Kategoriyani tanlang</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.nameUz}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Brend</label>
                      <select
                        value={productForm.brandId}
                        onChange={(e) => setProductForm(prev => ({ ...prev, brandId: e.target.value }))}
                      >
                        <option value="">Brendni tanlang</option>
                        {brands.map(brand => (
                          <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Narx va ombor</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Joriy narx *</label>
                      <input
                        type="number"
                        value={productForm.price}
                        onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Asl narx</label>
                      <input
                        type="number"
                        value={productForm.originalPrice}
                        onChange={(e) => setProductForm(prev => ({ ...prev, originalPrice: e.target.value }))}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Ombor miqdori</label>
                      <input
                        type="number"
                        value={productForm.stockQuantity}
                        onChange={(e) => setProductForm(prev => ({ ...prev, stockQuantity: e.target.value }))}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Kam qolish chegarasi</label>
                      <input
                        type="number"
                        value={productForm.lowStockThreshold}
                        onChange={(e) => setProductForm(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                        placeholder="10"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Rasmlar</h3>
                  
                  <div className="image-upload">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => e.target.files && uploadProductImages(e.target.files)}
                      className="file-input"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="upload-button">
                      {uploadingImages ? 'Yuklanmoqda...' : '📷 Rasm yuklash'}
                    </label>
                  </div>

                  {productForm.images.length > 0 && (
                    <div className="image-preview">
                      {productForm.images.map((image, index) => (
                        <div key={index} className="image-item">
                          <img src={image} alt={`Preview ${index}`} />
                          <button
                            onClick={() => setProductForm(prev => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== index)
                            }))}
                            className="remove-image"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-section">
                  <h3>Qo'shimcha</h3>
                  
                  <div className="form-group">
                    <label>Teglar</label>
                    <input
                      type="text"
                      value={productForm.tags}
                      onChange={(e) => setProductForm(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="teglar, vergul, bilan, ajratilgan"
                    />
                  </div>

                  <div className="form-checkboxes">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={productForm.isActive}
                        onChange={(e) => setProductForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      />
                      <span>Faol</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={productForm.isFeatured}
                        onChange={(e) => setProductForm(prev => ({ ...prev, isFeatured: e.target.checked }))}
                      />
                      <span>Featured</span>
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    onClick={() => setShowProductForm(false)}
                    className="cancel-button"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={saveProduct}
                    disabled={loading}
                    className="save-button"
                  >
                    {loading ? 'Saqlanmoqda...' : 'Saqlash'}
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

export default ProductManagementPage;