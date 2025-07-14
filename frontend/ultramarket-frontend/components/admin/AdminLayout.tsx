import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Button,
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Badge,
  Divider,
  Tooltip
} from '@nextui-org/react';
import {
  Home,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  Store,
  Tags,
  DollarSign,
  TrendingUp,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  ChevronDown,
  FileText,
  MessageSquare,
  Truck,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBreadcrumb?: boolean;
  className?: string;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string | number;
  children?: SidebarItem[];
  permission?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  showBreadcrumb = true,
  className = ''
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [notifications, setNotifications] = useState(0);
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();

  // Redirect if not admin
  useEffect(() => {
    if (user && !isAdmin()) {
      router.push('/');
    }
  }, [user, isAdmin, router]);

  // Sidebar menu items
  const menuItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Boshqaruv paneli',
      icon: <Home size={20} />,
      href: '/admin',
    },
    {
      id: 'analytics',
      label: 'Statistika',
      icon: <BarChart3 size={20} />,
      href: '/admin/analytics',
      children: [
        {
          id: 'sales',
          label: 'Sotuvlar',
          icon: <TrendingUp size={16} />,
          href: '/admin/analytics/sales',
        },
        {
          id: 'products',
          label: 'Mahsulotlar',
          icon: <Package size={16} />,
          href: '/admin/analytics/products',
        },
        {
          id: 'customers',
          label: 'Mijozlar',
          icon: <Users size={16} />,
          href: '/admin/analytics/customers',
        },
      ],
    },
    {
      id: 'stores',
      label: 'Do\'konlar',
      icon: <Store size={20} />,
      href: '/admin/stores',
      badge: 'Yangi',
    },
    {
      id: 'products',
      label: 'Mahsulotlar',
      icon: <Package size={20} />,
      href: '/admin/products',
      children: [
        {
          id: 'product-list',
          label: 'Mahsulotlar ro\'yxati',
          icon: <Package size={16} />,
          href: '/admin/products',
        },
        {
          id: 'categories',
          label: 'Kategoriyalar',
          icon: <Tags size={16} />,
          href: '/admin/products/categories',
        },
        {
          id: 'brands',
          label: 'Brendlar',
          icon: <Shield size={16} />,
          href: '/admin/products/brands',
        },
      ],
    },
    {
      id: 'orders',
      label: 'Buyurtmalar',
      icon: <ShoppingCart size={20} />,
      href: '/admin/orders',
      badge: 5,
    },
    {
      id: 'users',
      label: 'Foydalanuvchilar',
      icon: <Users size={20} />,
      href: '/admin/users',
      children: [
        {
          id: 'customers',
          label: 'Mijozlar',
          icon: <User size={16} />,
          href: '/admin/users/customers',
        },
        {
          id: 'vendors',
          label: 'Sotuvchilar',
          icon: <Store size={16} />,
          href: '/admin/users/vendors',
        },
        {
          id: 'admins',
          label: 'Administratorlar',
          icon: <Shield size={16} />,
          href: '/admin/users/admins',
        },
      ],
    },
    {
      id: 'finance',
      label: 'Moliya',
      icon: <DollarSign size={20} />,
      href: '/admin/finance',
      children: [
        {
          id: 'payments',
          label: 'To\'lovlar',
          icon: <CreditCard size={16} />,
          href: '/admin/finance/payments',
        },
        {
          id: 'transactions',
          label: 'Tranzaksiyalar',
          icon: <FileText size={16} />,
          href: '/admin/finance/transactions',
        },
        {
          id: 'reports',
          label: 'Hisobotlar',
          icon: <BarChart3 size={16} />,
          href: '/admin/finance/reports',
        },
      ],
    },
    {
      id: 'support',
      label: 'Yordam',
      icon: <MessageSquare size={20} />,
      href: '/admin/support',
      badge: 3,
    },
    {
      id: 'logistics',
      label: 'Logistika',
      icon: <Truck size={20} />,
      href: '/admin/logistics',
    },
    {
      id: 'system',
      label: 'Tizim',
      icon: <AlertTriangle size={20} />,
      href: '/admin/system',
      children: [
        {
          id: 'settings',
          label: 'Sozlamalar',
          icon: <Settings size={16} />,
          href: '/admin/settings',
        },
        {
          id: 'logs',
          label: 'Loglar',
          icon: <FileText size={16} />,
          href: '/admin/system/logs',
        },
      ],
    },
  ];

  // Toggle sidebar item expansion
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Check if route is active
  const isActiveRoute = (href: string) => {
    return router.pathname === href;
  };

  // Check if parent route is active
  const isParentActive = (item: SidebarItem) => {
    if (item.children) {
      return item.children.some(child => isActiveRoute(child.href));
    }
    return isActiveRoute(item.href);
  };

  // Render sidebar item
  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const isActive = isActiveRoute(item.href);
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isParentItemActive = isParentActive(item);

    return (
      <div key={item.id} className="mb-1">
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
            level === 0 ? 'ml-0' : 'ml-4'
          } ${
            isActive
              ? 'bg-primary-100 text-primary-700 font-medium'
              : isParentItemActive && level === 0
              ? 'bg-primary-50 text-primary-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              router.push(item.href);
              setIsSidebarOpen(false);
            }
          }}
        >
          <div className="flex items-center space-x-3">
            <div className={`${isActive ? 'text-primary-700' : 'text-gray-500'}`}>
              {item.icon}
            </div>
            <span className="text-sm font-medium">{item.label}</span>
          </div>

          <div className="flex items-center space-x-2">
            {item.badge && (
              <Badge
                color={typeof item.badge === 'number' ? 'primary' : 'warning'}
                size="sm"
                content={item.badge}
              />
            )}
            {hasChildren && (
              <ChevronDown
                size={16}
                className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Ruxsat berilmagan
          </h1>
          <p className="text-gray-600">
            Ushbu sahifaga kirish uchun administrator huquqlariga ega bo'lishingiz kerak.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 w-64 h-full bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Link href="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-uzbek rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Admin Panel</span>
          </Link>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            className="lg:hidden"
            onPress={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {menuItems.map(item => renderSidebarItem(item))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
            <Avatar
              src={user.avatar}
              name={user.firstName}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              <Button
                isIconOnly
                variant="light"
                className="lg:hidden"
                onPress={() => setIsSidebarOpen(true)}
              >
                <Menu size={20} />
              </Button>

              {title && (
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                  {showBreadcrumb && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Link href="/admin" className="hover:text-primary-600">
                        Admin
                      </Link>
                      <span>/</span>
                      <span>{title}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <Tooltip content="Qidiruv">
                <Button isIconOnly variant="light">
                  <Search size={20} />
                </Button>
              </Tooltip>

              {/* Notifications */}
              <Tooltip content="Bildirishnomalar">
                <Button isIconOnly variant="light" className="relative">
                  <Bell size={20} />
                  {notifications > 0 && (
                    <Badge
                      content={notifications}
                      color="danger"
                      size="sm"
                      className="absolute -top-1 -right-1"
                    />
                  )}
                </Button>
              </Tooltip>

              {/* User Menu */}
              <Dropdown>
                <DropdownTrigger>
                  <Button variant="light" className="flex items-center space-x-2">
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
                <DropdownMenu>
                  <DropdownItem
                    key="profile"
                    startContent={<User size={16} />}
                  >
                    Profil
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
                    onPress={handleLogout}
                  >
                    Chiqish
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`p-6 ${className}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;