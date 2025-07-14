import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Button, 
  Input, 
  Divider,
  Chip
} from '@nextui-org/react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Facebook,
  Instagram,
  MessageCircle,
  Twitter,
  Youtube,
  ArrowRight,
  Shield,
  Truck,
  CreditCard,
  Award,
  Users,
  Store,
  Package,
  HeadphonesIcon
} from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  // Company information
  const companyInfo = {
    name: 'UltraMarket Uzbekistan',
    description: 'O\'zbekistonning eng katta va ishonchli online marketplace',
    email: 'info@ultramarket.uz',
    phone: '+998 71 123-45-67',
    supportPhone: '+998 71 789-01-23',
    address: 'Toshkent shahar, Yunusobod tumani, Amir Temur shox ko\'chasi 108',
    workingHours: 'Dushanba-Yakshanba: 24/7',
  };

  // Footer links organized by category
  const footerLinks = {
    marketplace: {
      title: 'Marketplace',
      links: [
        { href: '/categories', label: 'Barcha kategoriyalar' },
        { href: '/stores', label: 'Do\'konlar' },
        { href: '/brands', label: 'Brendlar' },
        { href: '/offers', label: 'Chegirmalar' },
        { href: '/new-arrivals', label: 'Yangi mahsulotlar' },
        { href: '/bestsellers', label: 'Ommabop mahsulotlar' },
      ],
    },
    customers: {
      title: 'Mijozlarga',
      links: [
        { href: '/how-to-buy', label: 'Qanday xarid qilish' },
        { href: '/delivery', label: 'Yetkazib berish' },
        { href: '/payment', label: 'To\'lov usullari' },
        { href: '/returns', label: 'Qaytarish va almashtirish' },
        { href: '/warranty', label: 'Kafolat xizmati' },
        { href: '/faq', label: 'Tez-tez so\'raladigan savollar' },
      ],
    },
    business: {
      title: 'Biznes uchun',
      links: [
        { href: '/sell', label: 'UltraMarket\'da soting' },
        { href: '/vendor-registration', label: 'Sotuvchi bo\'lish' },
        { href: '/wholesale', label: 'Ulgurji savdo' },
        { href: '/business-solutions', label: 'Biznes yechimlari' },
        { href: '/vendor-support', label: 'Sotuvchilar uchun yordam' },
        { href: '/seller-academy', label: 'Sotuvchilar akademiyasi' },
      ],
    },
    company: {
      title: 'Kompaniya',
      links: [
        { href: '/about', label: 'Biz haqimizda' },
        { href: '/careers', label: 'Karyera' },
        { href: '/news', label: 'Yangiliklar' },
        { href: '/press', label: 'Matbuot uchun' },
        { href: '/investor-relations', label: 'Investorlar uchun' },
        { href: '/sustainability', label: 'Ijtimoiy mas\'uliyat' },
      ],
    },
    support: {
      title: 'Yordam',
      links: [
        { href: '/contact', label: 'Aloqa' },
        { href: '/support', label: 'Yordam markazi' },
        { href: '/live-chat', label: 'Jonli chat' },
        { href: '/order-tracking', label: 'Buyurtmani kuzatish' },
        { href: '/feedback', label: 'Fikr-mulohaza' },
        { href: '/complaints', label: 'Shikoyatlar' },
      ],
    },
    legal: {
      title: 'Huquqiy',
      links: [
        { href: '/terms', label: 'Foydalanish shartlari' },
        { href: '/privacy', label: 'Maxfiylik siyosati' },
        { href: '/cookies', label: 'Cookie siyosati' },
        { href: '/user-agreement', label: 'Foydalanuvchi shartnomasi' },
        { href: '/vendor-agreement', label: 'Sotuvchi shartnomasi' },
        { href: '/dispute-resolution', label: 'Nizolarni hal qilish' },
      ],
    },
  };

  // Statistics for trust building
  const statistics = [
    { icon: <Users size={24} />, value: '2M+', label: 'Faol foydalanuvchilar' },
    { icon: <Store size={24} />, value: '50K+', label: 'Do\'konlar' },
    { icon: <Package size={24} />, value: '10M+', label: 'Mahsulotlar' },
    { icon: <Award size={24} />, value: '4.8', label: 'Reytingi (5 dan)' },
  ];

  // Trust badges
  const trustBadges = [
    { icon: <Shield size={20} />, text: 'Xavfsiz to\'lovlar' },
    { icon: <Truck size={20} />, text: 'Tez yetkazib berish' },
    { icon: <CreditCard size={20} />, text: 'Click, Payme, Apelsin' },
    { icon: <HeadphonesIcon size={20} />, text: '24/7 yordam' },
  ];

  // Newsletter signup
  const handleNewsletterSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email');
    console.log('Newsletter signup:', email);
    // Here would be the real API call
  };

  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h3 className="text-xl font-bold mb-2">
                Yangiliklar va chegirmalardan birinchi bo'lib xabardor bo'ling!
              </h3>
              <p className="text-gray-400">
                Haftalik chegirmalar, yangi mahsulotlar va maxsus takliflar haqida ma'lumot oling
              </p>
            </div>
            
            <form onSubmit={handleNewsletterSignup} className="flex gap-3 w-full lg:w-auto">
              <Input
                type="email"
                name="email"
                placeholder="Email manzilingizni kiriting"
                className="lg:w-80"
                required
                classNames={{
                  inputWrapper: "bg-gray-800 border-gray-700"
                }}
              />
              <Button 
                type="submit" 
                color="primary" 
                endContent={<ArrowRight size={16} />}
                className="px-6"
              >
                Obuna bo'lish
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-uzbek rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">U</span>
              </div>
              <div>
                <h2 className="text-xl font-bold gradient-text">UltraMarket</h2>
                <p className="text-xs text-gray-400">O'zbekiston #1 marketplace</p>
              </div>
            </Link>
            
            <p className="text-gray-400 mb-4 leading-relaxed">
              {companyInfo.description}. Eng yaxshi mahsulotlar, eng qulay narxlar va 
              ishonchli xizmat kafolati bilan sizga xizmat ko'rsatamiz.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3">
                <MapPin size={16} className="text-primary-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">{companyInfo.address}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone size={16} className="text-primary-400 flex-shrink-0" />
                <div className="text-sm">
                  <div className="text-white font-medium">{companyInfo.phone}</div>
                  <div className="text-gray-400">Yordam: {companyInfo.supportPhone}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail size={16} className="text-primary-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">{companyInfo.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock size={16} className="text-primary-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">{companyInfo.workingHours}</span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3">
              {trustBadges.map((badge, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-800 rounded-lg">
                  <div className="text-primary-400">{badge.icon}</div>
                  <span className="text-xs text-gray-300">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, index) => (
                  <li key={index}>
                    <Link 
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-primary-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Statistics Section */}
        <Divider className="my-8 bg-gray-800" />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {statistics.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-2 text-primary-400">
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Social Media & Mobile Apps */}
        <Divider className="my-8 bg-gray-800" />
        
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          {/* Social Media */}
          <div className="flex flex-col items-center lg:items-start">
            <h4 className="font-semibold text-white mb-3">Ijtimoiy tarmoqlarda</h4>
            <div className="flex space-x-4">
              <Link href="https://facebook.com/ultramarket.uz" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Facebook size={24} />
              </Link>
              <Link href="https://instagram.com/ultramarket.uz" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Instagram size={24} />
              </Link>
              <Link href="https://t.me/ultramarket_uz" className="text-gray-400 hover:text-primary-400 transition-colors">
                <MessageCircle size={24} />
              </Link>
              <Link href="https://twitter.com/ultramarket_uz" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Twitter size={24} />
              </Link>
              <Link href="https://youtube.com/ultramarket_uz" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Youtube size={24} />
              </Link>
            </div>
          </div>

          {/* Mobile Apps */}
          <div className="flex flex-col items-center lg:items-end">
            <h4 className="font-semibold text-white mb-3">Mobil ilovalar</h4>
            <div className="flex space-x-3">
              <Link href="https://play.google.com/store/apps/details?id=uz.ultramarket">
                <Image
                  src="/google-play-badge.png"
                  alt="Google Play"
                  width={140}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
              <Link href="https://apps.apple.com/app/ultramarket/id123456789">
                <Image
                  src="/app-store-badge.png"
                  alt="App Store"
                  width={140}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-800 bg-gray-950">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="text-center lg:text-left">
              <p className="text-sm text-gray-400">
                © {currentYear} UltraMarket Uzbekistan. Barcha huquqlar himoyalangan.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Saytdan foydalanish orqali siz{' '}
                <Link href="/terms" className="text-primary-400 hover:underline">
                  foydalanish shartlari
                </Link>
                {' '}va{' '}
                <Link href="/privacy" className="text-primary-400 hover:underline">
                  maxfiylik siyosati
                </Link>
                ga rozilik bildirasiz.
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <Chip size="sm" variant="flat" className="bg-green-100 text-green-800">
                SSL Sertifikati
              </Chip>
              <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-800">
                PCI DSS
              </Chip>
              <Chip size="sm" variant="flat" className="bg-purple-100 text-purple-800">
                ISO 27001
              </Chip>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;