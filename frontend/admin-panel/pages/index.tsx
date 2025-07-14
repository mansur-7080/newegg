import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { motion } from 'framer-motion';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Avatar,
  Progress,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@nextui-org/react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Download,
  Filter,
  Search,
  Bell,
  Settings,
  LogOut,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  MapPin,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Area,
  AreaChart
} from 'recharts';

import AdminLayout from '../components/layout/AdminLayout';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { useAnalytics } from '../hooks/useAnalytics';

// Types
interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  totalCustomers: number;
  customersChange: number;
  totalProducts: number;
  productsChange: number;
  averageOrderValue: number;
  conversionRate: number;
  activeStores: number;
  pendingOrders: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    avatar?: string;
  };
  store: {
    name: string;
    id: string;
  };
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  items: number;
}

interface TopProduct {
  id: string;
  name: string;
  image: string;
  category: string;
  sold: number;
  revenue: number;
  rating: number;
  store: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { analytics, isLoading } = useAnalytics();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null);

  // Mock data - in production, fetch from API
  const dashboardStats: DashboardStats = {
    totalRevenue: 24500000,
    revenueChange: 12.5,
    totalOrders: 1248,
    ordersChange: 8.2,
    totalCustomers: 3456,
    customersChange: 15.3,
    totalProducts: 8974,
    productsChange: -2.1,
    averageOrderValue: 196000,
    conversionRate: 3.4,
    activeStores: 245,
    pendingOrders: 67
  };

  const recentOrders: RecentOrder[] = [
    {
      id: '1',
      orderNumber: 'UM-2024-001',
      customer: {
        name: 'Akmal Karimov',
        email: 'akmal@example.com',
        avatar: '/avatars/user1.jpg'
      },
      store: {
        name: 'TechStore',
        id: 'store1'
      },
      total: 2500000,
      status: 'pending',
      createdAt: '2024-01-15T10:30:00Z',
      items: 3
    },
    {
      id: '2',
      orderNumber: 'UM-2024-002',
      customer: {
        name: 'Dilnoza Abdullayeva',
        email: 'dilnoza@example.com'
      },
      store: {
        name: 'Fashion Hub',
        id: 'store2'
      },
      total: 850000,
      status: 'confirmed',
      createdAt: '2024-01-15T09:15:00Z',
      items: 2
    },
    // Add more mock orders...
  ];

  const topProducts: TopProduct[] = [
    {
      id: '1',
      name: 'iPhone 15 Pro Max 256GB',
      image: '/products/iphone15.jpg',
      category: 'Elektronika',
      sold: 89,
      revenue: 1335000000,
      rating: 4.8,
      store: 'TechStore'
    },
    // Add more mock products...
  ];

  const salesData = [
    { name: 'Iyun', revenue: 18500000, orders: 945 },
    { name: 'Iyul', revenue: 22000000, orders: 1120 },
    { name: 'Avgust', revenue: 19500000, orders: 985 },
    { name: 'Sentabr', revenue: 24000000, orders: 1200 },
    { name: 'Oktabr', revenue: 26500000, orders: 1350 },
    { name: 'Noyabr', revenue: 24500000, orders: 1248 }
  ];

  const categoryData = [
    { name: 'Elektronika', value: 35, color: '#3b82f6' },
    { name: 'Kiyim', value: 25, color: '#ef4444' },
    { name: 'Uy buyumlari', value: 20, color: '#22c55e' },
    { name: 'Kitoblar', value: 12, color: '#f59e0b' },
    { name: 'Sport', value: 8, color: '#8b5cf6' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'primary';
      case 'shipped': return 'secondary';
      case 'delivered': return 'success';
      case 'cancelled': return 'danger';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Kutilmoqda';
      case 'confirmed': return 'Tasdiqlangan';
      case 'shipped': return 'Yuborilgan';
      case 'delivered': return 'Yetkazilgan';
      case 'cancelled': return 'Bekor qilingan';
      default: return status;
    }
  };

  const handleOrderView = (order: RecentOrder) => {
    setSelectedOrder(order);
    onOpen();
  };

  return (
    <>
      <Head>
        <title>Dashboard - UltraMarket Admin Panel</title>
        <meta name="description" content="UltraMarket e-commerce management dashboard" />
      </Head>

      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Xush kelibsiz, {user?.firstName || 'Admin'}! Bu yerda biznes ko'rsatkichlarini kuzatishingiz mumkin.
              </p>
            </div>
            <div className="flex gap-3">
              <Select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-32"
                size="sm"
              >
                <SelectItem key="7d" value="7d">7 kun</SelectItem>
                <SelectItem key="30d" value="30d">30 kun</SelectItem>
                <SelectItem key="90d" value="90d">90 kun</SelectItem>
                <SelectItem key="1y" value="1y">1 yil</SelectItem>
              </Select>
              <Button color="primary" startContent={<Download size={16} />}>
                Hisobot yuklash
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-6">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Umumiy daromad</p>
                      <p className="text-2xl font-bold">{formatCurrency(dashboardStats.totalRevenue)}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="text-green-500" size={16} />
                        <span className="text-green-500 text-sm ml-1">
                          +{dashboardStats.revenueChange}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-2xl">
                      <DollarSign className="text-blue-600" size={24} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="p-6">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Buyurtmalar</p>
                      <p className="text-2xl font-bold">{dashboardStats.totalOrders.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="text-green-500" size={16} />
                        <span className="text-green-500 text-sm ml-1">
                          +{dashboardStats.ordersChange}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-green-100 rounded-2xl">
                      <ShoppingCart className="text-green-600" size={24} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="p-6">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Mijozlar</p>
                      <p className="text-2xl font-bold">{dashboardStats.totalCustomers.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="text-green-500" size={16} />
                        <span className="text-green-500 text-sm ml-1">
                          +{dashboardStats.customersChange}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-2xl">
                      <Users className="text-purple-600" size={24} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="p-6">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Mahsulotlar</p>
                      <p className="text-2xl font-bold">{dashboardStats.totalProducts.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <TrendingDown className="text-red-500" size={16} />
                        <span className="text-red-500 text-sm ml-1">
                          {dashboardStats.productsChange}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-2xl">
                      <Package className="text-orange-600" size={24} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <h3 className="text-lg font-semibold">Sotuv dinamikasi</h3>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? formatCurrency(value) : value,
                          name === 'revenue' ? 'Daromad' : 'Buyurtmalar'
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </motion.div>

            {/* Category Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <h3 className="text-lg font-semibold">Kategoriya bo'yicha sotuv</h3>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </motion.div>
          </div>

          {/* Recent Orders & Top Products */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card className="p-6">
                <CardHeader className="pb-4 flex justify-between items-center">
                  <h3 className="text-lg font-semibold">So'nggi buyurtmalar</h3>
                  <Button size="sm" variant="light">
                    Barchasini ko'rish
                  </Button>
                </CardHeader>
                <CardBody>
                  <Table aria-label="Recent orders table">
                    <TableHeader>
                      <TableColumn>BUYURTMA</TableColumn>
                      <TableColumn>MIJOZ</TableColumn>
                      <TableColumn>SUMMA</TableColumn>
                      <TableColumn>HOLAT</TableColumn>
                      <TableColumn>AMALLAR</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.orderNumber}</p>
                              <p className="text-small text-gray-500">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar 
                                src={order.customer.avatar} 
                                name={order.customer.name}
                                size="sm"
                              />
                              <div>
                                <p className="font-medium">{order.customer.name}</p>
                                <p className="text-small text-gray-500">
                                  {order.customer.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{formatCurrency(order.total)}</p>
                            <p className="text-small text-gray-500">
                              {order.items} ta mahsulot
                            </p>
                          </TableCell>
                          <TableCell>
                            <Chip
                              color={getStatusColor(order.status)}
                              variant="flat"
                              size="sm"
                            >
                              {getStatusText(order.status)}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => handleOrderView(order)}
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                              >
                                <Edit size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </motion.div>

            {/* Top Products */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <h3 className="text-lg font-semibold">Top mahsulotlar</h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-semibold text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <Avatar
                          src={product.image}
                          name={product.name}
                          size="md"
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">{product.category}</span>
                            <div className="flex items-center gap-1">
                              <Star className="text-yellow-400 fill-yellow-400" size={12} />
                              <span className="text-sm text-gray-500">{product.rating}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{product.sold} ta sotilgan</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(product.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Card className="p-6">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold">Tezkor amallar</h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <Button className="h-20 flex-col" variant="flat">
                    <Package size={24} />
                    <span className="text-sm mt-2">Yangi mahsulot</span>
                  </Button>
                  <Button className="h-20 flex-col" variant="flat">
                    <Users size={24} />
                    <span className="text-sm mt-2">Mijoz qo'shish</span>
                  </Button>
                  <Button className="h-20 flex-col" variant="flat">
                    <ShoppingCart size={24} />
                    <span className="text-sm mt-2">Buyurtma yaratish</span>
                  </Button>
                  <Button className="h-20 flex-col" variant="flat">
                    <BarChart3 size={24} />
                    <span className="text-sm mt-2">Hisobotlar</span>
                  </Button>
                  <Button className="h-20 flex-col" variant="flat">
                    <Settings size={24} />
                    <span className="text-sm mt-2">Sozlamalar</span>
                  </Button>
                  <Button className="h-20 flex-col" variant="flat">
                    <Bell size={24} />
                    <span className="text-sm mt-2">Xabarlar</span>
                  </Button>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </div>

        {/* Order Detail Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
          <ModalContent>
            <ModalHeader>
              Buyurtma tafsilotlari - {selectedOrder?.orderNumber}
            </ModalHeader>
            <ModalBody>
              {selectedOrder && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Mijoz</p>
                      <p className="font-medium">{selectedOrder.customer.name}</p>
                      <p className="text-sm text-gray-500">{selectedOrder.customer.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Do'kon</p>
                      <p className="font-medium">{selectedOrder.store.name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Umumiy summa</p>
                      <p className="font-medium text-lg">{formatCurrency(selectedOrder.total)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Holat</p>
                      <Chip
                        color={getStatusColor(selectedOrder.status)}
                        variant="flat"
                      >
                        {getStatusText(selectedOrder.status)}
                      </Chip>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Buyurtma sanasi</p>
                    <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Yopish
              </Button>
              <Button color="primary">
                Tahrirlash
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </AdminLayout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Check authentication here
  // Fetch initial data if needed
  
  return {
    props: {}
  };
};

export default AdminDashboard;