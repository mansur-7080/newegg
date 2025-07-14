import React, { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Avatar,
  Divider,
  Badge,
  Accordion,
  AccordionItem
} from '@nextui-org/react';
import {
  X,
  User,
  Home,
  Search,
  ShoppingCart,
  Heart,
  Package,
  MapPin,
  Phone,
  Mail,
  Settings,
  LogOut,
  ChevronRight,
  Store,
  Tag,
  Smartphone,
  Laptop,
  Car,
  Shirt,
  Book,
  Home as HomeIcon,
  Gamepad2,
  Baby,
  Camera,
  Utensils,
  Gift,
  CreditCard,
  Clock,
  Shield,
  HelpCircle,
  MessageSquare,
  Globe
} from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  isAuthenticated: boolean;
}

const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  user,
  isAuthenticated
}) => {
  const [activeSection, setActiveSection] = useState<string>('');

  // Main categories with icons
  const categories = [
    {
      id: 'electronics',
      name: 'Elektronika',
      icon: <Smartphone size={20} />,
      count: '2.5M+',
      subcategories: [
        'Smartfonlar',
        'Noutbuklar',
        'Planshtetlar',
        'Televizorlar',
        'Audio qurilmalar',
        'Kameralar',
        'Aksessuarlar'
      ]
    },
    {
      id: 'fashion',
      name: 'Kiyim-kechak',
      icon: <Shirt size={20} />,
      count: '1.8M+',
      subcategories: [
        'Ayollar kiyimi',
        'Erkaklar kiyimi',
        'Bolalar kiyimi',
        'Poyafzallar',
        'Aksessuarlar',
        'Sumkalar'
      ]
    },
    {
      id: 'home',
      name: 'Uy-ro\'zg\'or',
      icon: <HomeIcon size={20} />,
      count: '950K+',
      subcategories: [
        'Mebel',
        'Maishiy texnika',
        'Oshxona jihozlari',
        'Tekstil',
        'Bezak buyumlari',
        'Bog\' va hovli'
      ]
    },
    {
      id: 'automotive',
      name: 'Avtomobil',
      icon: <Car size={20} />,
      count: '450K+',
      subcategories: [
        'Avtomobil ehtiyot qismlari',
        'Mototsikllar',
        'Velosipedlar',
        'Avtokimyo',
        'Aksessuarlar'
      ]
    },
    {
      id: 'books',
      name: 'Kitoblar',
      icon: <Book size={20} />,
      count: '320K+',
      subcategories: [
        'Badiiy adabiyot',
        'Ta\'lim adabiyoti',
        'Bolalar kitoblari',
        'Diniy kitoblar',
        'Biznes kitoblari'
      ]
    },
    {
      id: 'baby',
      name: 'Bolalar uchun',
      icon: <Baby size={20} />,
      count: '280K+',
      subcategories: [
        'Bolalar kiyimi',
        'O\'yinchoqlar',
        'Bolalar mebeli',
        'Bolalar ovqati',
        'Gigiyena vositalari'
      ]
    },
    {
      id: 'sports',
      name: 'Sport va dam olish',
      icon: <Gamepad2 size={20} />,
      count: '190K+',
      subcategories: [
        'Sport jihozlari',
        'Fitnes',
        'Sayohat',
        'Baliq ovlash',
        'Velosport'
      ]
    },
    {
      id: 'beauty',
      name: 'Go\'zallik va salomatlik',
      icon: <Camera size={20} />,
      count: '150K+',
      subcategories: [
        'Kosmetika',
        'Parfyumeriya',
        'Shaxsiy gigiyena',
        'Tibbiy buyumlar',
        'Vitaminlar'
      ]
    }
  ];

  // Quick actions
  const quickActions = [
    { href: '/search', label: 'Qidiruv', icon: <Search size={20} /> },
    { href: '/cart', label: 'Savatcha', icon: <ShoppingCart size={20} />, badge: 3 },
    { href: '/wishlist', label: 'Sevimlilar', icon: <Heart size={20} />, badge: 12 },
    { href: '/orders', label: 'Buyurtmalarim', icon: <Package size={20} /> },
  ];

  // Service menu
  const services = [
    { href: '/delivery', label: 'Yetkazib berish', icon: <MapPin size={20} /> },
    { href: '/payment', label: 'To\'lov usullari', icon: <CreditCard size={20} /> },
    { href: '/warranty', label: 'Kafolat', icon: <Shield size={20} /> },
    { href: '/support', label: 'Yordam', icon: <HelpCircle size={20} /> },
    { href: '/contact', label: 'Aloqa', icon: <Phone size={20} /> },
  ];

  // Business features
  const businessFeatures = [
    { href: '/sell', label: 'Do\'kon ochish', icon: <Store size={20} />, highlight: true },
    { href: '/wholesale', label: 'Ulgurji savdo', icon: <Package size={20} /> },
    { href: '/business', label: 'Biznes uchun', icon: <Tag size={20} /> },
  ];

  const handleLinkClick = () => {
    onClose();
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? '' : section);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Mobile Navigation Panel */}
      <div className="mobile-nav absolute left-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <Link href="/" onClick={handleLinkClick} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-uzbek rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <span className="text-lg font-bold text-gray-900">UltraMarket</span>
          </Link>
          
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={onClose}
          >
            <X size={20} />
          </Button>
        </div>

        {/* User Section */}
        {isAuthenticated && user ? (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar
                src={user.avatar}
                name={user.firstName}
                size="md"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                startContent={<Settings size={16} />}
                className="flex-1"
                onPress={handleLinkClick}
              >
                Sozlamalar
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="danger"
                startContent={<LogOut size={16} />}
                className="flex-1"
                onPress={handleLinkClick}
              >
                Chiqish
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex gap-2">
              <Link href="/login" className="flex-1" onClick={handleLinkClick}>
                <Button size="sm" variant="flat" className="w-full">
                  Kirish
                </Button>
              </Link>
              <Link href="/register" className="flex-1" onClick={handleLinkClick}>
                <Button size="sm" color="primary" className="w-full">
                  Ro'yxatdan o'tish
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            Tezkor amallar
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} onClick={handleLinkClick}>
                <Button
                  variant="flat"
                  className="w-full justify-start h-12 relative"
                  startContent={action.icon}
                >
                  <span className="flex-1 text-left">{action.label}</span>
                  {action.badge && (
                    <Badge content={action.badge} color="primary" size="sm" />
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="border-b border-gray-200">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">
              Kategoriyalar
            </h3>
          </div>
          
          <Accordion 
            variant="light" 
            className="px-0"
            selectedKeys={[activeSection]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as string;
              setActiveSection(key || '');
            }}
          >
            {categories.map((category) => (
              <AccordionItem
                key={category.id}
                aria-label={category.name}
                title={
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <div className="text-primary-600">{category.icon}</div>
                      <div>
                        <span className="font-medium">{category.name}</span>
                        <p className="text-xs text-gray-500">{category.count} mahsulot</p>
                      </div>
                    </div>
                  </div>
                }
                classNames={{
                  trigger: "py-3 px-4",
                  content: "pb-0"
                }}
              >
                <div className="px-4 pb-4">
                  <div className="grid gap-2">
                    {category.subcategories.map((sub, index) => (
                      <Link
                        key={index}
                        href={`/categories/${category.id}/${sub.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={handleLinkClick}
                        className="flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <span>{sub}</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                    ))}
                  </div>
                  
                  <Link
                    href={`/categories/${category.id}`}
                    onClick={handleLinkClick}
                    className="block mt-3 pt-3 border-t border-gray-200"
                  >
                    <Button 
                      size="sm" 
                      variant="flat" 
                      color="primary" 
                      className="w-full"
                    >
                      Barcha {category.name} mahsulotlari
                    </Button>
                  </Link>
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Business Features */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            Biznes
          </h3>
          <div className="space-y-2">
            {businessFeatures.map((feature) => (
              <Link key={feature.href} href={feature.href} onClick={handleLinkClick}>
                <Button
                  variant={feature.highlight ? "solid" : "flat"}
                  color={feature.highlight ? "primary" : "default"}
                  className="w-full justify-start"
                  startContent={feature.icon}
                >
                  {feature.label}
                  {feature.highlight && (
                    <Badge content="Yangi" color="warning" size="sm" className="ml-auto" />
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            Xizmatlar
          </h3>
          <div className="space-y-2">
            {services.map((service) => (
              <Link key={service.href} href={service.href} onClick={handleLinkClick}>
                <Button
                  variant="light"
                  className="w-full justify-start"
                  startContent={service.icon}
                >
                  {service.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Stores */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            Ommabop do'konlar
          </h3>
          <div className="space-y-3">
            {[
              { name: 'TechStore UZ', rating: 4.8, products: '2.5K+' },
              { name: 'Fashion Plaza', rating: 4.7, products: '1.8K+' },
              { name: 'Home & Garden', rating: 4.9, products: '950+' },
              { name: 'Auto Parts UZ', rating: 4.6, products: '1.2K+' }
            ].map((store, index) => (
              <Link
                key={index}
                href={`/stores/${store.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={handleLinkClick}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {store.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{store.name}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>⭐ {store.rating}</span>
                    <span>•</span>
                    <span>{store.products} mahsulot</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>

        {/* Language & Location */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="flat"
              size="sm"
              startContent={<Globe size={16} />}
              className="justify-start"
            >
              O'zbek
            </Button>
            <Button
              variant="flat"
              size="sm"
              startContent={<MapPin size={16} />}
              className="justify-start"
            >
              Toshkent
            </Button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            Aloqa
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-3">
              <Phone size={16} className="text-primary-600" />
              <div>
                <p className="font-medium">+998 71 123-45-67</p>
                <p className="text-gray-500">24/7 yordam xizmati</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Mail size={16} className="text-primary-600" />
              <div>
                <p className="font-medium">info@ultramarket.uz</p>
                <p className="text-gray-500">Elektron pochta</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MessageSquare size={16} className="text-primary-600" />
              <div>
                <p className="font-medium">@ultramarket_uz</p>
                <p className="text-gray-500">Telegram kanal</p>
              </div>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Ijtimoiy tarmoqlarda kuzating:</p>
            <div className="flex space-x-3">
              {[
                { name: 'Facebook', icon: '📘' },
                { name: 'Instagram', icon: '📷' },
                { name: 'Telegram', icon: '💬' },
                { name: 'YouTube', icon: '📺' }
              ].map((social) => (
                <Button
                  key={social.name}
                  isIconOnly
                  size="sm"
                  variant="flat"
                  className="text-lg"
                >
                  {social.icon}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* App Version Info */}
        <div className="p-4 text-center border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            UltraMarket v1.0.0
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © 2024 UltraMarket Uzbekistan
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileNav;