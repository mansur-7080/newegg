import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';
import ProductListScreen from '../screens/products/ProductListScreen';
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import CategoryScreen from '../screens/categories/CategoryScreen';
import SearchScreen from '../screens/search/SearchScreen';
import CartScreen from '../screens/cart/CartScreen';
import CheckoutScreen from '../screens/checkout/CheckoutScreen';
import OrderHistoryScreen from '../screens/orders/OrderHistoryScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import WishlistScreen from '../screens/wishlist/WishlistScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

// PC Builder Screens
import PCBuilderScreen from '../screens/pcbuilder/PCBuilderScreen';
import ComponentSelectorScreen from '../screens/pcbuilder/ComponentSelectorScreen';
import BuildSummaryScreen from '../screens/pcbuilder/BuildSummaryScreen';
import SavedBuildsScreen from '../screens/pcbuilder/SavedBuildsScreen';

// Store Screens
import StoreListScreen from '../screens/stores/StoreListScreen';
import StoreDetailScreen from '../screens/stores/StoreDetailScreen';

// Other Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

import { RootState } from '../store';
import { colors } from '../theme/colors';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  OTPVerification: { phoneNumber: string; type: 'register' | 'forgot' };
  
  // Main
  MainTabs: undefined;
  ProductDetail: { productId: string };
  ProductList: { categoryId?: string; searchQuery?: string };
  Category: { categoryId: string };
  Search: { initialQuery?: string };
  Cart: undefined;
  Checkout: undefined;
  OrderDetail: { orderId: string };
  Settings: undefined;
  Notifications: undefined;
  
  // PC Builder
  PCBuilder: undefined;
  ComponentSelector: { category: string; buildId?: string };
  BuildSummary: { buildId: string };
  SavedBuilds: undefined;
  
  // Stores
  StoreDetail: { storeId: string };
  
  // Other
  Splash: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Categories: undefined;
  PCBuilder: undefined;
  Cart: undefined;
  Profile: undefined;
};

export type DrawerParamList = {
  Main: undefined;
  Orders: undefined;
  Wishlist: undefined;
  Stores: undefined;
  Settings: undefined;
  Support: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// Tab Navigator
const MainTabNavigator = () => {
  const cartItemsCount = useSelector((state: RootState) => 
    state.cart.items.reduce((total, item) => total + item.quantity, 0)
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Categories':
              iconName = 'category';
              break;
            case 'PCBuilder':
              iconName = 'build';
              break;
            case 'Cart':
              iconName = 'shopping-cart';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'home';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.lightGray,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Bosh sahifa',
        }}
      />
      <Tab.Screen 
        name="Categories" 
        component={CategoryScreen}
        options={{
          title: 'Kategoriyalar',
        }}
      />
      <Tab.Screen 
        name="PCBuilder" 
        component={PCBuilderScreen}
        options={{
          title: 'PC Builder',
        }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen}
        options={{
          title: 'Savatcha',
          tabBarBadge: cartItemsCount > 0 ? cartItemsCount : undefined,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
};

// Drawer Navigator
const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.white,
          width: 280,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.gray,
      }}
    >
      <Drawer.Screen 
        name="Main" 
        component={MainTabNavigator}
        options={{
          title: 'Asosiy',
          drawerIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Orders" 
        component={OrderHistoryScreen}
        options={{
          title: 'Buyurtmalarim',
          drawerIcon: ({ color, size }) => (
            <Icon name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Wishlist" 
        component={WishlistScreen}
        options={{
          title: 'Sevimlilar',
          drawerIcon: ({ color, size }) => (
            <Icon name="favorite" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Stores" 
        component={StoreListScreen}
        options={{
          title: "Do'konlar",
          drawerIcon: ({ color, size }) => (
            <Icon name="store" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Sozlamalar',
          drawerIcon: ({ color, size }) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isFirstLaunch, isLoading } = useSelector((state: RootState) => ({
    isAuthenticated: state.auth.isAuthenticated,
    isFirstLaunch: state.app.isFirstLaunch,
    isLoading: state.app.isLoading,
  }));

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.white },
        }}
      >
        {isLoading ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : isFirstLaunch ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={DrawerNavigator} />
            <Stack.Screen 
              name="ProductDetail" 
              component={ProductDetailScreen}
              options={{
                headerShown: true,
                title: 'Mahsulot',
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
              }}
            />
            <Stack.Screen 
              name="ProductList" 
              component={ProductListScreen}
              options={{
                headerShown: true,
                title: 'Mahsulotlar',
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
              }}
            />
            <Stack.Screen 
              name="Search" 
              component={SearchScreen}
              options={{
                headerShown: true,
                title: 'Qidiruv',
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
              }}
            />
            <Stack.Screen 
              name="Checkout" 
              component={CheckoutScreen}
              options={{
                headerShown: true,
                title: "To'lov",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
              }}
            />
            <Stack.Screen 
              name="OrderDetail" 
              component={OrderDetailScreen}
              options={{
                headerShown: true,
                title: 'Buyurtma tafsilotlari',
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
              }}
            />
            <Stack.Screen 
              name="ComponentSelector" 
              component={ComponentSelectorScreen}
              options={{
                headerShown: true,
                title: 'Komponent tanlash',
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
              }}
            />
            <Stack.Screen 
              name="BuildSummary" 
              component={BuildSummaryScreen}
              options={{
                headerShown: true,
                title: 'Build xulosasi',
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
              }}
            />
            <Stack.Screen 
              name="SavedBuilds" 
              component={SavedBuildsScreen}
              options={{
                headerShown: true,
                title: 'Saqlangan buildlar',
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
              }}
            />
            <Stack.Screen 
              name="StoreDetail" 
              component={StoreDetailScreen}
              options={{
                headerShown: true,
                title: "Do'kon",
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
              }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationsScreen}
              options={{
                headerShown: true,
                title: 'Bildirishnomalar',
                headerStyle: {
                  backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;