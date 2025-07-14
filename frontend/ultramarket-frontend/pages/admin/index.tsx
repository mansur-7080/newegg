import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Progress,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Badge,
  Divider
} from '@nextui-org/react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Store,
  Package,
  DollarSign,
  ShoppingCart,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

import AdminLayout from '../../components/admin/AdminLayout';

// Types for dashboard data
interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalStores: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  storesGrowth: number;
}

interface RecentOrder {
  id: string;
  customer: {
    name: string;
    avatar?: string;
  };
  store: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
}

interface TopStore {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  growth: number;
  rating: number;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  time: string;
}

// Mock data - in real app, this would come from API
const mockStats: DashboardStats = {
  totalRevenue: 45_847_250_000, // 45.8B UZS
  totalOrders: 12_847,
  totalCustomers: 234_567,
  totalStores: 8_942,
  revenueGrowth: 12.5,
  ordersGrowth: 8.3,
  customersGrowth: 15.7,
  storesGrowth: 5.2,
};

const mockRecentOrders: RecentOrder[] = [
  {
    id: 'ORD-2024-001',
    customer: { name: 'Aziza Karimova', avatar: '/avatars/user1.jpg' },
    store: 'TechStore UZ',
    amount: 2_450_000,
    status: 'confirmed',
    date: '2024-01-15T10:30:00Z'
  },
  {
    id: 'ORD-2024-002',
    customer: { name: 'Sardor Nazarov' },
    store: 'Fashion Plaza',
    amount: 890_000,
    status: 'shipped',
    date: '2024-01-15T09:15:00Z'
  },
  {
    id: 'ORD-2024-003',
    customer: { name: 'Dilnoza Tursunova' },
    store: 'Home & Garden',
    amount: 1_250_000,
    status: 'pending',
    date: '2024-01-15T08:45:00Z'
  },
  {
    id: 'ORD-2024-004',
    customer: { name: 'Bekzod Aliyev' },
    store: 'Auto Parts UZ',
    amount: 3_200_000,
    status: 'delivered',
    date: '2024-01-14T16:20:00Z'
  },
  {
    id: 'ORD-2024-005',
    customer: { name: 'Malika Sharipova' },
    store: 'Beauty World',
    amount: 450_000,
    status: 'cancelled',
    date: '2024-01-14T14:10:00Z'
  }
];

const mockTopStores: TopStore[] = [
  { id: '1', name: 'TechStore UZ', revenue: 12_500_000, orders: 342, growth: 18.5, rating: 4.8 },
  { id: '2', name: 'Fashion Plaza', revenue: 8_750_000, orders: 287, growth: 12.3, rating: 4.7 },
  { id: '3', name: 'Home & Garden', revenue: 6_200_000, orders: 198, growth: 15.7, rating: 4.9 },
  { id: '4', name: 'Auto Parts UZ', revenue: 4_890_000, orders: 156, growth: 8.9, rating: 4.6 },
  { id: '5', name: 'Beauty World', revenue: 3_450_000, orders: 134, growth: 22.1, rating: 4.5 }
];

const mockAlerts: SystemAlert[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Server load yuqori',
    message: 'Analytics service 85% CPU ishlatmoqda',
    time: '5 daqiqa oldin'
  },
  {
    id: '2',
    type: 'success',
    title: 'Yangi do\'kon tasdiqlandi',
    message: 'Electronics Pro do\'koni muvaffaqiyatli faollashtirildi',
    time: '15 daqiqa oldin'
  },
  {
    id: '3',
    type: 'info',
    title: 'Kunlik hisobot tayyor',
    message: 'Bugungi savdo hisoboti eksport qilish uchun tayyor',
    time: '1 soat oldin'
  },
  {
    id: '4',
    type: 'error',
    title: 'To\'lov xizmati muammosi',
    message: 'Payme to\'lov tizimida vaqtinchalik muammo',
    time: '2 soat oldin'
  }
];

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>(mockRecentOrders);
  const [topStores, setTopStores] = useState<TopStore[]>(mockTopStores);
  const [alerts, setAlerts] = useState<SystemAlert[]>(mockAlerts);
  const [isLoading, setIsLoading] = useState(false);

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('UZS', 'so\'m');
  };

  // Format number with K/M suffix
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'shipped': return 'warning';
      case 'delivered': return 'primary';
      case 'cancelled': return 'danger';
      default: return 'default';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Kutilmoqda';
      case 'confirmed': return 'Tasdiqlangan';
      case 'shipped': return 'Jo\'natilgan';
      case 'delivered': return 'Yetkazilgan';
      case 'cancelled': return 'Bekor qilingan';
      default: return status;
    }
  };

  // Get alert icon and color
  const getAlertConfig = (type: string) => {
    switch (type) {
      case 'success':
        return { icon: <CheckCircle size={16} />, color: 'text-green-600 bg-green-100' };
      case 'warning':
        return { icon: <AlertTriangle size={16} />, color: 'text-yellow-600 bg-yellow-100' };
      case 'error':
        return { icon: <AlertTriangle size={16} />, color: 'text-red-600 bg-red-100' };
      default:
        return { icon: <Clock size={16} />, color: 'text-blue-600 bg-blue-100' };
    }
  };

  // Refresh dashboard data
  const refreshData = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real app, fetch fresh data from API
    setStats(mockStats);
    setRecentOrders(mockRecentOrders);
    setTopStores(mockTopStores);
    setAlerts(mockAlerts);
    
    setIsLoading(false);
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard - UltraMarket</title>
        <meta name="description" content="UltraMarket Admin Dashboard" />
      </Head>

      <AdminLayout title="Boshqaruv paneli">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Boshqaruv paneli</h1>
              <p className="text-gray-600">UltraMarket marketplace statistikasi</p>
            </div>
            <Button
              startContent={<RefreshCw size={16} />}
              onPress={refreshData}
              isLoading={isLoading}
              variant="bordered"
            >
              Yangilash
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Revenue */}
            <Card className="hover:shadow-md transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Umumiy tushumlari</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(stats.totalRevenue)}
                    </p>
                    <div className="flex items-center mt-1">
                      {stats.revenueGrowth > 0 ? (
                        <TrendingUp size={16} className="text-green-500 mr-1" />
                      ) : (
                        <TrendingDown size={16} className="text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${
                        stats.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth}%
                      </span>
                      <span className="text-sm text-gray-500 ml-1">o'tgan oyga nisbatan</span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <DollarSign size={24} className="text-blue-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Orders */}
            <Card className="hover:shadow-md transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Buyurtmalar</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(stats.totalOrders)}
                    </p>
                    <div className="flex items-center mt-1">
                      {stats.ordersGrowth > 0 ? (
                        <TrendingUp size={16} className="text-green-500 mr-1" />
                      ) : (
                        <TrendingDown size={16} className="text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${
                        stats.ordersGrowth > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stats.ordersGrowth > 0 ? '+' : ''}{stats.ordersGrowth}%
                      </span>
                      <span className="text-sm text-gray-500 ml-1">o'tgan oyga nisbatan</span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <ShoppingCart size={24} className="text-green-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Customers */}
            <Card className="hover:shadow-md transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Mijozlar</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(stats.totalCustomers)}
                    </p>
                    <div className="flex items-center mt-1">
                      {stats.customersGrowth > 0 ? (
                        <TrendingUp size={16} className="text-green-500 mr-1" />
                      ) : (
                        <TrendingDown size={16} className="text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${
                        stats.customersGrowth > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stats.customersGrowth > 0 ? '+' : ''}{stats.customersGrowth}%
                      </span>
                      <span className="text-sm text-gray-500 ml-1">o'tgan oyga nisbatan</span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Users size={24} className="text-purple-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Stores */}
            <Card className="hover:shadow-md transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Do'konlar</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(stats.totalStores)}
                    </p>
                    <div className="flex items-center mt-1">
                      {stats.storesGrowth > 0 ? (
                        <TrendingUp size={16} className="text-green-500 mr-1" />
                      ) : (
                        <TrendingDown size={16} className="text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${
                        stats.storesGrowth > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stats.storesGrowth > 0 ? '+' : ''}{stats.storesGrowth}%
                      </span>
                      <span className="text-sm text-gray-500 ml-1">o'tgan oyga nisbatan</span>
                    </div>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Store size={24} className="text-orange-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Orders */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between w-full">
                  <h3 className="text-lg font-semibold">So'nggi buyurtmalar</h3>
                  <Button size="sm" variant="light" endContent={<ArrowUpRight size={16} />}>
                    Barchasini ko'rish
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <Table aria-label="Recent orders">
                  <TableHeader>
                    <TableColumn>MIJOZ</TableColumn>
                    <TableColumn>DO'KON</TableColumn>
                    <TableColumn>SUMMA</TableColumn>
                    <TableColumn>HOLAT</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar
                              src={order.customer.avatar}
                              name={order.customer.name}
                              size="sm"
                            />
                            <span className="font-medium">{order.customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{order.store}</TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(order.amount)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            color={getStatusColor(order.status)}
                            size="sm"
                            variant="flat"
                          >
                            {getStatusText(order.status)}
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>

            {/* System Alerts */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold">Tizim xabarlari</h3>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="space-y-3">
                  {alerts.map((alert) => {
                    const config = getAlertConfig(alert.type);
                    return (
                      <div key={alert.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200">
                        <div className={`p-1.5 rounded-full ${config.color}`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Top Stores */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between w-full">
                <h3 className="text-lg font-semibold">Eng yaxshi do'konlar</h3>
                <Button size="sm" variant="light" endContent={<BarChart3 size={16} />}>
                  Batafsil tahlil
                </Button>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-4">
                {topStores.map((store, index) => (
                  <div key={store.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-uzbek text-white rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{store.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>{store.orders} buyurtma</span>
                          <span>⭐ {store.rating}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatPrice(store.revenue)}</p>
                      <div className="flex items-center mt-1">
                        {store.growth > 0 ? (
                          <ArrowUpRight size={14} className="text-green-500 mr-1" />
                        ) : (
                          <ArrowDownRight size={14} className="text-red-500 mr-1" />
                        )}
                        <span className={`text-sm font-medium ${
                          store.growth > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {store.growth > 0 ? '+' : ''}{store.growth}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
};

// Server-side authentication check
export const getServerSideProps: GetServerSideProps = async (context) => {
  // In real app, check authentication and admin role
  // const { req } = context;
  // const token = req.cookies.ultramarket_token;
  
  // if (!token || !isAdmin(token)) {
  //   return {
  //     redirect: {
  //       destination: '/login',
  //       permanent: false,
  //     },
  //   };
  // }

  return {
    props: {},
  };
};

export default AdminDashboard;