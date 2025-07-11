import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { apiService, Product } from '../services/api';

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

const ProductListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'name',
    sortOrder: searchParams.get('sortOrder') || 'asc',
  });

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '12');

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', page, limit, filters],
    queryFn: async () => {
      const response = await apiService.getProducts(page, limit, filters);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch products');
      }
      return response.data;
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    const newParams = new URLSearchParams();
    newParams.set('page', '1'); // Reset to first page when filtering

    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) {
        newParams.set(k, v);
      }
    });

    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mahsulotlarni yuklashda xato</h2>
        <p className="text-gray-600">
          Iltimos, sahifani yangilab ko'ring yoki keyinroq urinib ko'ring.
        </p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mahsulotlar - UltraMarket</title>
        <meta name="description" content="UltraMarket do'konidagi barcha mahsulotlar" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Mahsulotlar</h1>
          <p className="text-gray-600">{data?.total || 0} ta mahsulot topildi</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Filtrlar</h3>

              {/* Category Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategoriya</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Barcha kategoriyalar</option>
                  <option value="electronics">Elektronika</option>
                  <option value="clothing">Kiyim</option>
                  <option value="books">Kitoblar</option>
                  <option value="home">Uy-ro'zg'or</option>
                </select>
              </div>

              {/* Brand Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Brend</label>
                <select
                  value={filters.brand}
                  onChange={(e) => handleFilterChange('brand', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Barcha brendlar</option>
                  <option value="apple">Apple</option>
                  <option value="samsung">Samsung</option>
                  <option value="sony">Sony</option>
                  <option value="nike">Nike</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Narx oralig'i
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="w-1/2 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="w-1/2 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Saralash</label>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    handleFilterChange('sortBy', sortBy);
                    handleFilterChange('sortOrder', sortOrder);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name-asc">Nom (A-Z)</option>
                  <option value="name-desc">Nom (Z-A)</option>
                  <option value="price-asc">Narx (Arzon-Qimmat)</option>
                  <option value="price-desc">Narx (Qimmat-Arzon)</option>
                  <option value="rating-desc">Reyting (Yuqori-Past)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:w-3/4">
            {data?.products && data.products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {data.products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-w-1 aspect-h-1 bg-gray-200">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">Rasm yo'q</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {product.name}
                        </h3>

                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {product.description}
                        </p>

                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-blue-600">
                            ${product.price.toFixed(2)}
                          </span>
                          <div className="flex items-center">
                            <span className="text-yellow-400">★</span>
                            <span className="text-sm text-gray-600 ml-1">
                              {product.rating.toFixed(1)} ({product.reviewCount})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm ${product.inStock ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {product.inStock ? 'Mavjud' : 'Tugagan'}
                          </span>

                          <button
                            disabled={!product.inStock}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                              product.inStock
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Savatga qo'shish
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Oldingi
                    </button>

                    {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                          pageNum === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= data.totalPages}
                      className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Keyingi
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Mahsulot topilmadi</h2>
                <p className="text-gray-600">Qidiruv shartlaringizni o'zgartirib ko'ring.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductListPage;
