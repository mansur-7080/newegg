import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import {
  Button,
  Card,
  CardBody,
  Badge,
  Chip,
  Input,
  Tab,
  Tabs
} from '@nextui-org/react';
import {
  Search,
  TrendingUp,
  Star,
  Truck,
  Shield,
  Clock,
  Gift,
  ArrowRight,
  Play,
  Users,
  Store,
  Package,
  Smartphone,
  Laptop,
  Car,
  Shirt,
  Book,
  Home as HomeIcon,
  Gamepad2,
  Baby
} from 'lucide-react';
import { motion } from 'framer-motion';

import Layout from '../components/layout/Layout';
import ProductCard from '../components/product/ProductCard';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

// Types
interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  image: string;
  productCount: number;
  href: string;
}

interface FeaturedProduct {
  id: string;
  name: string;
  nameUz: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  rating: number;
  reviewCount: number;
  discount?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  isInStock?: boolean;
  category: string;
  store: {
    id: string;
    name: string;
    location: string;
    rating?: number;
    isVerified?: boolean;
  };
  specifications?: {
    brand?: string;
    warranty?: string;
    color?: string;
  };
  tags?: string[];
  freeShipping?: boolean;
  fastDelivery?: boolean;
}

interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  badge?: string;
}

const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [selectedTab, setSelectedTab] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');

  // Hero banners
  const heroBanners: HeroBanner[] = [
    {
      id: '1',
      title: 'Yangi yil chegirmalari',
      subtitle: '70% gacha chegirmalar',
      description: 'Barcha kategoriyalarda katta chegirmalar. Cheklangan vaqt!',
      image: '/banners/new-year-sale.jpg',
      ctaText: 'Hoziroq xarid qiling',
      ctaLink: '/offers',
      badge: 'Chegirma'
    },
    {
      id: '2',
      title: 'Bepul yetkazib berish',
      subtitle: '1 million so\'m va undan yuqori xaridlarga',
      description: 'Butun O\'zbekiston bo\'ylab tez va ishonchli yetkazib berish',
      image: '/banners/free-delivery.jpg',
      ctaText: 'Batafsil ma\'lumot',
      ctaLink: '/delivery',
      badge: 'Bepul'
    },
    {
      id: '3',
      title: 'UltraMarket biznes',
      subtitle: 'O\'z do\'koningizni oching',
      description: 'Millionlab mijozlarga mahsulotlaringizni soting',
      image: '/banners/business.jpg',
      ctaText: 'Do\'kon ochish',
      ctaLink: '/sell',
      badge: 'Biznes'
    }
  ];

  // Categories
  const categories: Category[] = [
    {
      id: 'electronics',
      name: 'Elektronika',
      icon: <Smartphone size={32} />,
      image: '/categories/electronics.jpg',
      productCount: 2500000,
      href: '/categories/electronics'
    },
    {
      id: 'fashion',
      name: 'Kiyim-kechak',
      icon: <Shirt size={32} />,
      image: '/categories/fashion.jpg',
      productCount: 1800000,
      href: '/categories/fashion'
    },
    {
      id: 'home',
      name: 'Uy-ro\'zg\'or',
      icon: <HomeIcon size={32} />,
      image: '/categories/home.jpg',
      productCount: 950000,
      href: '/categories/home'
    },
    {
      id: 'automotive',
      name: 'Avtomobil',
      icon: <Car size={32} />,
      image: '/categories/automotive.jpg',
      productCount: 450000,
      href: '/categories/automotive'
    },
    {
      id: 'books',
      name: 'Kitoblar',
      icon: <Book size={32} />,
      image: '/categories/books.jpg',
      productCount: 320000,
      href: '/categories/books'
    },
    {
      id: 'baby',
      name: 'Bolalar uchun',
      icon: <Baby size={32} />,
      image: '/categories/baby.jpg',
      productCount: 280000,
      href: '/categories/baby'
    },
    {
      id: 'sports',
      name: 'Sport',
      icon: <Gamepad2 size={32} />,
      image: '/categories/sports.jpg',
      productCount: 190000,
      href: '/categories/sports'
    },
    {
      id: 'laptop',
      name: 'Noutbuklar',
      icon: <Laptop size={32} />,
      image: '/categories/laptops.jpg',
      productCount: 85000,
      href: '/categories/laptops'
    }
  ];

  // Mock featured products
  const featuredProducts: FeaturedProduct[] = [
    {
      id: '1',
      name: 'iPhone 15 Pro Max 256GB',
      nameUz: 'iPhone 15 Pro Max 256GB',
      price: 14500000,
      originalPrice: 16000000,
      image: '/products/iphone-15-pro-max.jpg',
      rating: 4.8,
      reviewCount: 234,
      discount: 9,
      isNew: true,
      isFeatured: true,
      isInStock: true,
      category: 'Smartfonlar',
      store: {
        id: 'techstore-uz',
        name: 'TechStore UZ',
        location: 'Toshkent',
        rating: 4.9,
        isVerified: true
      },
      specifications: {
        brand: 'Apple',
        warranty: '1 yil',
        color: 'Natural Titanium'
      },
      tags: ['Premium', 'Yangi', 'Apple'],
      freeShipping: true,
      fastDelivery: true
    },
    {
      id: '2',
      name: 'Samsung Galaxy S24 Ultra',
      nameUz: 'Samsung Galaxy S24 Ultra',
      price: 13200000,
      originalPrice: 14500000,
      image: '/products/samsung-s24-ultra.jpg',
      rating: 4.7,
      reviewCount: 187,
      discount: 9,
      isFeatured: true,
      isInStock: true,
      category: 'Smartfonlar',
      store: {
        id: 'samsung-official',
        name: 'Samsung Official Store',
        location: 'Toshkent',
        rating: 4.8,
        isVerified: true
      },
      specifications: {
        brand: 'Samsung',
        warranty: '2 yil',
        color: 'Titanium Black'
      },
      tags: ['Android', 'Kamera', 'S Pen'],
      freeShipping: true,
      fastDelivery: true
    },
    {
      id: '3',
      name: 'MacBook Air M3 13" 256GB',
      nameUz: 'MacBook Air M3 13" 256GB',
      price: 18900000,
      image: '/products/macbook-air-m3.jpg',
      rating: 4.9,
      reviewCount: 156,
      isNew: true,
      isFeatured: true,
      isInStock: true,
      category: 'Noutbuklar',
      store: {
        id: 'apple-premium',
        name: 'Apple Premium Partner',
        location: 'Toshkent',
        rating: 4.9,
        isVerified: true
      },
      specifications: {
        brand: 'Apple',
        warranty: '1 yil',
        color: 'Midnight'
      },
      tags: ['M3 Chip', 'Ultrabook', 'Premium'],
      freeShipping: true,
      fastDelivery: true
    },
    {
      id: '4',
      name: 'Nike Air Max 90',
      nameUz: 'Nike Air Max 90',
      price: 1850000,
      originalPrice: 2200000,
      image: '/products/nike-air-max-90.jpg',
      rating: 4.6,
      reviewCount: 342,
      discount: 16,
      isFeatured: true,
      isInStock: true,
      category: 'Poyafzal',
      store: {
        id: 'nike-official',
        name: 'Nike Official',
        location: 'Toshkent',
        rating: 4.7,
        isVerified: true
      },
      specifications: {
        brand: 'Nike',
        warranty: '6 oy',
        color: 'White/Black'
      },
      tags: ['Sport', 'Klassik', 'Qulay'],
      freeShipping: false,
      fastDelivery: true
    }
  ];

  // Format number
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      <Head>
        <title>UltraMarket - O'zbekiston #1 Marketplace</title>
        <meta 
          name="description" 
          content="O'zbekistonning eng katta va ishonchli online marketplace. Millionlab mahsulot, eng yaxshi narxlar, tez yetkazib berish." 
        />
        <meta name="keywords" content="ultramarket, uzbekistan, marketplace, online shopping, elektron savdo" />
        <meta property="og:title" content="UltraMarket - O'zbekiston #1 Marketplace" />
        <meta property="og:description" content="O'zbekistonning eng katta va ishonchli online marketplace" />
        <meta property="og:image" content="/og-image.jpg" />
        <meta property="og:url" content="https://ultramarket.uz" />
        <link rel="canonical" href="https://ultramarket.uz" />
      </Head>

      <Layout>
        {/* Hero Section */}
        <section className="bg-gradient-uzbek text-white">
          <div className="container mx-auto px-4 py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="space-y-6">
                  <Badge color="warning" variant="flat" className="mb-4">
                    O'zbekiston #1 Marketplace
                  </Badge>
                  
                  <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                    Eng yaxshi narxlarda
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                      xarid qiling
                    </span>
                  </h1>
                  
                  <p className="text-xl text-blue-100 leading-relaxed">
                    10 million+ mahsulot, 50,000+ do'kon, 2 million+ mijoz. 
                    Ishonchli va tez yetkazib berish bilan.
                  </p>

                  {/* Search Bar */}
                  <form onSubmit={handleSearch} className="flex gap-3 max-w-lg">
                    <Input
                      placeholder="Mahsulot, brend yoki kategoriya qidiring..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      startContent={<Search size={20} />}
                      size="lg"
                      classNames={{
                        inputWrapper: "bg-white/10 border-white/20 data-[hover=true]:border-white/30"
                      }}
                    />
                    <Button 
                      type="submit" 
                      color="warning" 
                      size="lg" 
                      className="px-8 font-semibold"
                    >
                      Qidirish
                    </Button>
                  </form>

                  {/* Trust Indicators */}
                  <div className="flex items-center space-x-6 pt-4">
                    <div className="flex items-center space-x-2">
                      <Shield size={20} className="text-green-300" />
                      <span className="text-sm">Xavfsiz to'lov</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Truck size={20} className="text-green-300" />
                      <span className="text-sm">Bepul yetkazib berish</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock size={20} className="text-green-300" />
                      <span className="text-sm">24/7 yordam</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="relative z-10">
                  <Image
                    src="/hero-marketplace.png"
                    alt="UltraMarket Marketplace"
                    width={600}
                    height={500}
                    className="w-full h-auto"
                    priority
                  />
                </div>
                
                {/* Floating Stats */}
                <div className="absolute top-10 -left-4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center space-x-3">
                    <Users size={24} className="text-yellow-300" />
                    <div>
                      <p className="font-semibold">2M+</p>
                      <p className="text-sm text-blue-100">Faol mijozlar</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-10 -right-4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center space-x-3">
                    <Store size={24} className="text-green-300" />
                    <div>
                      <p className="font-semibold">50K+</p>
                      <p className="text-sm text-blue-100">Do'konlar</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Kategoriyalar
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Millionlab mahsulot turli kategoriyalarda. O'zingizga kerakli mahsulotni toping.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link href={category.href}>
                    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                      <CardBody className="p-6 text-center">
                        <div className="mb-4 text-primary-600 group-hover:scale-110 transition-transform">
                          {category.icon}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                          {category.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {formatNumber(category.productCount)} mahsulot
                        </p>
                      </CardBody>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Tavsiya etilgan mahsulotlar
                </h2>
                <p className="text-gray-600">
                  Eng sifatli va mashhur mahsulotlar
                </p>
              </div>
              
              <Tabs
                selectedKey={selectedTab}
                onSelectionChange={(key) => setSelectedTab(key as string)}
                variant="underlined"
                color="primary"
              >
                <Tab key="featured" title="Tavsiya etilgan" />
                <Tab key="new" title="Yangi" />
                <Tab key="bestsellers" title="Ommabop" />
                <Tab key="deals" title="Chegirmalar" />
              </Tabs>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={(productId) => addToCart({ productId, quantity: 1 })}
                    showNewBadge
                    showFeaturedBadge
                  />
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button
                size="lg"
                variant="bordered"
                endContent={<ArrowRight size={20} />}
                className="font-semibold"
              >
                Barcha mahsulotlarni ko'rish
              </Button>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                UltraMarket raqamlarda
              </h2>
              <p className="text-blue-100 max-w-2xl mx-auto">
                O'zbekistonning eng katta online marketplace platformasi
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'Faol foydalanuvchilar', value: '2M+', icon: <Users size={32} /> },
                { label: 'Do\'konlar', value: '50K+', icon: <Store size={32} /> },
                { label: 'Mahsulotlar', value: '10M+', icon: <Package size={32} /> },
                { label: 'Baholash', value: '4.8⭐', icon: <Star size={32} /> }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="mb-4 text-yellow-300 flex justify-center">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold mb-2">{stat.value}</div>
                  <div className="text-blue-100">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gray-900 text-white">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold mb-6">
                O'z biznesingizni boshlang
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                UltraMarket platformasida o'z do'koningizni oching va 
                millionlab mijozlarga mahsulotlaringizni soting.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  color="primary"
                  className="font-semibold px-8"
                  endContent={<ArrowRight size={20} />}
                >
                  Do'kon ochish
                </Button>
                
                <Button
                  size="lg"
                  variant="bordered"
                  className="font-semibold px-8 border-white text-white hover:bg-white hover:text-gray-900"
                  startContent={<Play size={20} />}
                >
                  Video ko'rish
                </Button>
              </div>

              <div className="flex items-center justify-center space-x-8 mt-12 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <Gift size={16} />
                  <span>Dastlabki to'lovlar yo'q</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp size={16} />
                  <span>Katta foyda</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield size={16} />
                  <span>Ishonchli platforma</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
};

export default HomePage;