import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Button,
  Input,
  Badge,
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Divider
} from '@nextui-org/react';
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  Heart,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  LogOut,
  Settings,
  Package,
  CreditCard,
  Bell
} from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
}

interface HeaderProps {
  user?: User | null;
  isAuthenticated: boolean;
  cartItemsCount: number;
  onCartClick: () => void;
  onMobileNavClick: () => void;
  isMobileNavOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({
  user,
  isAuthenticated,
  cartItemsCount,
  onCartClick,
  onMobileNavClick,
  isMobileNavOpen
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    
    if (value.length > 2) {
      // Mock search results - in real app, call API
      setSearchResults([
        { id: 1, name: 'iPhone 15 Pro Max', price: 15000000, image: '/products/iphone.jpg' },
        { id: 2, name: 'Samsung Galaxy S24', price: 12000000, image: '/products/samsung.jpg' },
      ]);
    } else {
      setSearchResults([]);
    }
  };

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainNavItems = [
    { href: '/categories/electronics', label: 'Elektronika', isNew: false },
    { href: '/categories/clothing', label: 'Kiyim-kechak', isNew: false },
    { href: '/categories/home', label: 'Uy-ro\'zg\'or', isNew: false },
    { href: '/categories/sports', label: 'Sport', isNew: false },
    { href: '/categories/books', label: 'Kitoblar', isNew: false },
    { href: '/offers', label: 'Chegirmalar', isNew: true },
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-white'
    }`}>
      {/* Top Bar */}
      <div className="bg-gray-900 text-white py-2 text-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-1">
                <Phone size={14} />
                <span>+998 71 123-45-67</span>
              </div>
              <div className="flex items-center space-x-1">
                <Mail size={14} />
                <span>info@ultramarket.uz</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin size={14} />
                <span>Toshkent, O'zbekiston</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span>Yetkazib berish: O'zbekiston bo'ylab</span>
              <span>|</span>
              <Dropdown>
                <DropdownTrigger>
                  <Button variant="light" size="sm" className="text-white">
                    O'zbek <ChevronDown size={16} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Language selection">
                  <DropdownItem key="uz">O'zbek</DropdownItem>
                  <DropdownItem key="ru">Русский</DropdownItem>
                  <DropdownItem key="en">English</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 shrink-0">
              <div className="w-10 h-10 bg-gradient-uzbek rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">U</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold gradient-text">UltraMarket</h1>
                <p className="text-xs text-gray-500">O'zbekiston #1 marketplace</p>
              </div>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit}>
                <Input
                  classNames={{
                    base: "max-w-full",
                    input: "text-base",
                    inputWrapper: "bg-gray-50 border-2 border-gray-200 data-[hover=true]:border-primary-300 group-data-[focus=true]:border-primary-500"
                  }}
                  placeholder="Mahsulot, brend yoki kategoriya qidiring..."
                  startContent={<Search className="text-gray-400" size={20} />}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  size="lg"
                />
              </form>

              {/* Search Results Dropdown */}
              {isSearchFocused && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-96 overflow-y-auto z-50">
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-gray-600 mb-3">Qidiruv natijalari</h4>
                    {searchResults.map((item) => (
                      <Link
                        key={item.id}
                        href={`/products/${item.id}`}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                      >
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.price.toLocaleString()} so'm
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              {/* Wishlist */}
              <Button
                isIconOnly
                variant="light"
                className="relative"
                aria-label="Sevimlilar"
              >
                <Heart size={20} />
                <Badge
                  content="0"
                  color="danger"
                  className="absolute -top-1 -right-1"
                  size="sm"
                />
              </Button>

              {/* Cart */}
              <Button
                isIconOnly
                variant="light"
                className="relative"
                onPress={onCartClick}
                aria-label="Savatcha"
              >
                <ShoppingCart size={20} />
                {cartItemsCount > 0 && (
                  <Badge
                    content={cartItemsCount}
                    color="primary"
                    className="absolute -top-1 -right-1"
                    size="sm"
                  />
                )}
              </Button>

              {/* User Menu */}
              {isAuthenticated && user ? (
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      variant="light"
                      className="flex items-center space-x-2"
                    >
                      <Avatar
                        src={user.avatar}
                        name={user.firstName}
                        size="sm"
                      />
                      <span className="hidden md:block text-sm">
                        {user.firstName}
                      </span>
                      <ChevronDown size={16} />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="User menu">
                    <DropdownItem
                      key="profile"
                      startContent={<User size={16} />}
                    >
                      Profil
                    </DropdownItem>
                    <DropdownItem
                      key="orders"
                      startContent={<Package size={16} />}
                    >
                      Buyurtmalarim
                    </DropdownItem>
                    <DropdownItem
                      key="payments"
                      startContent={<CreditCard size={16} />}
                    >
                      To'lovlar
                    </DropdownItem>
                    <DropdownItem
                      key="notifications"
                      startContent={<Bell size={16} />}
                    >
                      Bildirishnomalar
                    </DropdownItem>
                    <DropdownItem
                      key="settings"
                      startContent={<Settings size={16} />}
                    >
                      Sozlamalar
                    </DropdownItem>
                    <Divider />
                    <DropdownItem
                      key="logout"
                      color="danger"
                      startContent={<LogOut size={16} />}
                    >
                      Chiqish
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link href="/login">
                    <Button variant="light" size="sm">
                      Kirish
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button color="primary" size="sm">
                      Ro'yxatdan o'tish
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <Button
                isIconOnly
                variant="light"
                className="lg:hidden mobile-nav-toggle"
                onPress={onMobileNavClick}
                aria-label="Menu"
              >
                <Menu size={20} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="bg-white border-b border-gray-100 hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-8">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors relative"
                >
                  <span>{item.label}</span>
                  {item.isNew && (
                    <Badge color="danger" size="sm" className="ml-1">
                      Yangi
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <Link href="/stores" className="hover:text-primary-600 transition-colors">
                Do'konlar
              </Link>
              <Link href="/brands" className="hover:text-primary-600 transition-colors">
                Brendlar
              </Link>
              <Link href="/help" className="hover:text-primary-600 transition-colors">
                Yordam
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;