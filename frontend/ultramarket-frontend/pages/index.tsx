import React from 'react';
import Head from 'next/head';
import { GetStaticProps } from 'next';
import { motion } from 'framer-motion';
import { 
  Button, 
  Card, 
  CardBody, 
  Image, 
  Input,
  Badge,
  Chip
} from '@nextui-org/react';
import { 
  Search, 
  ShoppingCart, 
  Star, 
  Truck, 
  Shield, 
  Headphones,
  ArrowRight,
  Tag,
  TrendingUp,
  Users,
  MapPin
} from 'lucide-react';

import Layout from '../components/layout/Layout';
import ProductCard from '../components/product/ProductCard';
import CategoryCard from '../components/category/CategoryCard';
import HeroSlider from '../components/hero/HeroSlider';

// Types
interface Product {
  id: string;
  name: string;
  nameUz: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  discount?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  category: string;
  store: {
    id: string;
    name: string;
    location: string;
  };
}

interface Category {
  id: string;
  name: string;
  nameUz: string;
  slug: string;
  image: string;
  productCount: number;
  isPopular?: boolean;
}

interface HomePageProps {
  featuredProducts: Product[];
  categories: Category[];
  newProducts: Product[];
  popularProducts: Product[];
  heroSlides: any[];
}

const HomePage: React.FC<HomePageProps> = ({
  featuredProducts,
  categories,
  newProducts,
  popularProducts,
  heroSlides
}) => {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <>
      <Head>
        <title>UltraMarket - O'zbekistondagi Eng Yaxshi Onlayn Do'kon</title>
        <meta 
          name="description" 
          content="UltraMarket - O'zbekistonda mahsulotlarni onlayn xarid qiling. Eng yaxshi narxlar, tez yetkazib berish, ishonchli xizmat. Elektronika, kiyim, uy-ro'zg'or buyumlari va boshqalar." 
        />
        <meta name="keywords" content="onlayn xarid, O'zbekiston, elektronika, kiyim, uy buyumlari, ultramarket" />
        <meta property="og:title" content="UltraMarket - O'zbekiston E-tijorat Platformasi" />
        <meta property="og:description" content="Eng yaxshi mahsulotlar, qulay narxlar, ishonchli xizmat" />
        <meta property="og:image" content="/images/og-image.jpg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout>
        {/* Hero Section */}
        <section className="relative">
          <HeroSlider slides={heroSlides} />
          
          {/* Search Bar Overlay */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-hard">
                <div className="flex gap-2">
                  <Input
                    classNames={{
                      base: "flex-1",
                      input: "text-base",
                      inputWrapper: "bg-gray-50 border-0 data-[hover=true]:bg-gray-100"
                    }}
                    placeholder="Mahsulot qidiring..."
                    startContent={<Search className="text-gray-400" size={20} />}
                    size="lg"
                  />
                  <Button 
                    color="primary" 
                    size="lg"
                    className="px-8 font-semibold"
                  >
                    Qidirish
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 bg-gray-50">
          <div className="container">
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              variants={stagger}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <motion.div variants={fadeInUp}>
                <Card className="p-6 text-center hover:shadow-medium transition-shadow">
                  <CardBody>
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-primary-100 rounded-2xl">
                        <Truck className="text-primary-600" size={32} />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Tez Yetkazib Berish</h3>
                    <p className="text-gray-600">O'zbekiston bo'ylab 24 soat ichida yetkazib berish</p>
                  </CardBody>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="p-6 text-center hover:shadow-medium transition-shadow">
                  <CardBody>
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-success-100 rounded-2xl">
                        <Shield className="text-success-600" size={32} />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Xavfsiz To'lov</h3>
                    <p className="text-gray-600">Click, Payme, Apelsin orqali xavfsiz to'lov</p>
                  </CardBody>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="p-6 text-center hover:shadow-medium transition-shadow">
                  <CardBody>
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-warning-100 rounded-2xl">
                        <Headphones className="text-warning-600" size={32} />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">24/7 Qo'llab-quvvatlash</h3>
                    <p className="text-gray-600">Har doim sizning xizmatingizdamiz</p>
                  </CardBody>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Mashhur Kategoriyalar</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Eng yaxshi mahsulotlarni topish uchun kategoriyalarni ko'rib chiqing
              </p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
              variants={stagger}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {categories.map((category) => (
                <motion.div key={category.id} variants={fadeInUp}>
                  <CategoryCard category={category} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-16 bg-gray-50">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex justify-between items-center mb-12"
            >
              <div>
                <h2 className="text-3xl font-bold mb-2">Tavsiya Etilgan Mahsulotlar</h2>
                <p className="text-gray-600">Siz uchun maxsus tanlangan mahsulotlar</p>
              </div>
              <Button 
                variant="light" 
                endContent={<ArrowRight size={16} />}
                className="hidden md:flex"
              >
                Barchasini ko'rish
              </Button>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              variants={stagger}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {featuredProducts.map((product) => (
                <motion.div key={product.id} variants={fadeInUp}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* New Products */}
        <section className="py-16">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex justify-between items-center mb-12"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge color="success" variant="flat">Yangi</Badge>
                  <h2 className="text-3xl font-bold">Yangi Mahsulotlar</h2>
                </div>
                <p className="text-gray-600">Eng so'nggi va trend mahsulotlar</p>
              </div>
              <Button 
                variant="light" 
                endContent={<ArrowRight size={16} />}
                className="hidden md:flex"
              >
                Barchasini ko'rish
              </Button>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              variants={stagger}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {newProducts.map((product) => (
                <motion.div key={product.id} variants={fadeInUp}>
                  <ProductCard product={product} showNewBadge />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-16 bg-gradient-uzbek text-white">
          <div className="container">
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
              variants={stagger}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <motion.div variants={fadeInUp}>
                <div className="flex justify-center mb-4">
                  <TrendingUp size={40} />
                </div>
                <div className="text-3xl font-bold mb-2">10,000+</div>
                <div className="text-white/80">Mahsulotlar</div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="flex justify-center mb-4">
                  <Users size={40} />
                </div>
                <div className="text-3xl font-bold mb-2">50,000+</div>
                <div className="text-white/80">Mijozlar</div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="flex justify-center mb-4">
                  <MapPin size={40} />
                </div>
                <div className="text-3xl font-bold mb-2">14</div>
                <div className="text-white/80">Viloyatlar</div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="flex justify-center mb-4">
                  <Star size={40} />
                </div>
                <div className="text-3xl font-bold mb-2">4.8</div>
                <div className="text-white/80">Reyting</div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 bg-gray-900 text-white">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto text-center"
            >
              <h2 className="text-3xl font-bold mb-4">Yangiliklar va Chegirmalar</h2>
              <p className="text-gray-300 mb-8">
                Yangi mahsulotlar va maxsus takliflar haqida birinchi bo'lib bilib oling
              </p>
              <div className="flex gap-4 max-w-md mx-auto">
                <Input
                  placeholder="Email manzilingizni kiriting"
                  classNames={{
                    input: "text-white",
                    inputWrapper: "bg-gray-800 border-gray-700"
                  }}
                  size="lg"
                />
                <Button color="primary" size="lg" className="px-8">
                  Obuna bo'lish
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </Layout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  // Mock data - in real app, fetch from API
  const featuredProducts: Product[] = [
    {
      id: '1',
      name: 'iPhone 15 Pro Max',
      nameUz: 'iPhone 15 Pro Max',
      price: 15000000,
      originalPrice: 16000000,
      image: '/images/products/iphone-15.jpg',
      rating: 4.8,
      reviewCount: 156,
      discount: 6,
      isFeatured: true,
      category: 'electronics',
      store: {
        id: '1',
        name: 'TechStore',
        location: 'Toshkent'
      }
    },
    // Add more mock products...
  ];

  const categories: Category[] = [
    {
      id: '1',
      name: 'Electronics',
      nameUz: 'Elektronika',
      slug: 'electronics',
      image: '/images/categories/electronics.jpg',
      productCount: 1250,
      isPopular: true
    },
    // Add more mock categories...
  ];

  const newProducts: Product[] = featuredProducts.slice(0, 5);
  const popularProducts: Product[] = featuredProducts.slice(0, 5);

  const heroSlides = [
    {
      id: '1',
      title: 'Yangi Yil Chegirmalari',
      subtitle: '50% gacha chegirma',
      image: '/images/hero/slide-1.jpg',
      cta: 'Xarid qilish',
      link: '/categories/electronics'
    }
  ];

  return {
    props: {
      featuredProducts,
      categories,
      newProducts,
      popularProducts,
      heroSlides
    },
    revalidate: 3600 // Revalidate every hour
  };
};

export default HomePage;