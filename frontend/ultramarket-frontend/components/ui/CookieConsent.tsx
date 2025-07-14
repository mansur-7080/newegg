import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardBody,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider
} from '@nextui-org/react';
import { Cookie, Settings, Shield, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    functional: false
  });
  
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Check if user has already made cookie choices
  useEffect(() => {
    const cookieConsent = localStorage.getItem('ultramarket_cookie_consent');
    if (!cookieConsent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Load saved preferences
  useEffect(() => {
    const savedPreferences = localStorage.getItem('ultramarket_cookie_preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences({ ...preferences, ...parsed });
      } catch (error) {
        console.error('Error parsing cookie preferences:', error);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    
    savePreferences(allAccepted);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const minimal: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false
    };
    
    savePreferences(minimal);
    setShowBanner(false);
  };

  const handleCustomize = () => {
    onOpen();
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
    setShowBanner(false);
    onClose();
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('ultramarket_cookie_consent', 'true');
    localStorage.setItem('ultramarket_cookie_preferences', JSON.stringify(prefs));
    setPreferences(prefs);
    
    // Initialize analytics and marketing tools based on preferences
    initializeCookieServices(prefs);
  };

  const initializeCookieServices = (prefs: CookiePreferences) => {
    // Initialize Google Analytics
    if (prefs.analytics && typeof window !== 'undefined') {
      // Google Analytics initialization would go here
      console.log('Analytics cookies enabled');
    }

    // Initialize marketing tools
    if (prefs.marketing && typeof window !== 'undefined') {
      // Facebook Pixel, Google Ads, etc. would be initialized here
      console.log('Marketing cookies enabled');
    }

    // Initialize functional cookies
    if (prefs.functional && typeof window !== 'undefined') {
      // Functional cookies like live chat, preferences would be enabled here
      console.log('Functional cookies enabled');
    }
  };

  const updatePreference = (key: keyof CookiePreferences, value: boolean) => {
    if (key === 'necessary') return; // Cannot disable necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const cookieCategories = [
    {
      key: 'necessary' as keyof CookiePreferences,
      title: 'Zaruriy cookie-lar',
      description: 'Saytning asosiy funksiyalarini ta\'minlash uchun zarur. O\'chirish mumkin emas.',
      required: true,
      examples: ['Sessiya ma\'lumotlari', 'Xavfsizlik tokenlari', 'Kirish holati']
    },
    {
      key: 'functional' as keyof CookiePreferences,
      title: 'Funksional cookie-lar',
      description: 'Til sozlamalari, valyuta va boshqa shaxsiy sozlamalarni saqlash uchun.',
      required: false,
      examples: ['Til sozlamalari', 'Tema (qorong\'u/yorug\')', 'Joylashuv ma\'lumotlari']
    },
    {
      key: 'analytics' as keyof CookiePreferences,
      title: 'Analitik cookie-lar',
      description: 'Sayt ishlashini tahlil qilish va yaxshilash uchun ishlatiladi.',
      required: false,
      examples: ['Google Analytics', 'Sahifa ko\'rishlar soni', 'Foydalanuvchi harakatlari']
    },
    {
      key: 'marketing' as keyof CookiePreferences,
      title: 'Marketing cookie-lar',
      description: 'Sizga mos reklama va takliflarni ko\'rsatish uchun.',
      required: false,
      examples: ['Facebook Pixel', 'Google Ads', 'Retargeting']
    }
  ];

  if (!showBanner) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4"
          >
            <Card className="mx-auto max-w-4xl shadow-lg border border-gray-200">
              <CardBody className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    <Cookie className="text-primary-600" size={24} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Cookie-lar va maxfiylik
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      UltraMarket saytini yaxshilash, reklama ko'rsatish va statistika to'plash uchun 
                      cookie-lar va shunga o'xshash texnologiyalardan foydalanadi. Barcha cookie-larni 
                      qabul qilish yoki o'zingiz tanlash mumkin.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        color="primary"
                        onPress={handleAcceptAll}
                        className="font-medium"
                      >
                        Barcha cookie-larni qabul qilish
                      </Button>
                      
                      <Button
                        variant="bordered"
                        onPress={handleRejectAll}
                        className="font-medium"
                      >
                        Faqat zaruriy cookie-lar
                      </Button>
                      
                      <Button
                        variant="light"
                        startContent={<Settings size={16} />}
                        onPress={handleCustomize}
                        className="font-medium text-gray-700"
                      >
                        Sozlamalar
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                      <Link href="/privacy" className="hover:text-primary-600 underline">
                        Maxfiylik siyosati
                      </Link>
                      <Link href="/cookies" className="hover:text-primary-600 underline">
                        Cookie siyosati
                      </Link>
                    </div>
                  </div>
                  
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() => setShowBanner(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie Preferences Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex items-center space-x-2">
            <Cookie className="text-primary-600" size={20} />
            <span>Cookie sozlamalari</span>
          </ModalHeader>
          
          <ModalBody className="py-0">
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="text-blue-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">
                      Sizning maxfiyligingiz muhim
                    </h4>
                    <p className="text-sm text-blue-700">
                      Biz sizning shaxsiy ma'lumotlaringizni himoya qilishga sodiqmiz. 
                      Quyida har bir cookie turi haqida batafsil ma'lumot va ularni 
                      yoqish/o'chirish imkoniyati mavjud.
                    </p>
                  </div>
                </div>
              </div>

              {cookieCategories.map((category) => (
                <div key={category.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{category.title}</h4>
                        {category.required && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            Majburiy
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {category.description}
                      </p>
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer hover:text-gray-700">
                          Misollar
                        </summary>
                        <ul className="mt-1 ml-4 space-y-1">
                          {category.examples.map((example, index) => (
                            <li key={index} className="list-disc">
                              {example}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                    
                    <Switch
                      isSelected={preferences[category.key]}
                      isDisabled={category.required}
                      onValueChange={(value) => updatePreference(category.key, value)}
                      color="primary"
                      size="sm"
                    />
                  </div>
                </div>
              ))}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  Uchinchi tomon xizmatlari
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Biz quyidagi uchinchi tomon xizmatlaridan foydalanishimiz mumkin:
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <strong>Analitika:</strong>
                    <ul className="mt-1 space-y-1 text-gray-500">
                      <li>• Google Analytics</li>
                      <li>• Yandex Metrica</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Marketing:</strong>
                    <ul className="mt-1 space-y-1 text-gray-500">
                      <li>• Facebook Pixel</li>
                      <li>• Google Ads</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Bekor qilish
            </Button>
            <Button color="primary" onPress={handleSaveCustom}>
              Sozlamalarni saqlash
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CookieConsent;