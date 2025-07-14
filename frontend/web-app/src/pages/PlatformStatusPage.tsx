import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';

interface ServiceStatus {
  name: string;
  port: number;
  status: 'healthy' | 'error' | 'loading';
  response?: any;
  error?: string;
}

const PlatformStatusPage: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Cart Service', port: 3000, status: 'loading' },
    { name: 'Auth Service', port: 3001, status: 'loading' },
    { name: 'Product Service', port: 3002, status: 'loading' },
    { name: 'Order Service', port: 3003, status: 'loading' },
    { name: 'API Gateway', port: 3004, status: 'loading' },
    { name: 'Payment Service', port: 3005, status: 'loading' },
    { name: 'Search Service', port: 3006, status: 'loading' },
    { name: 'Notification Service', port: 3007, status: 'loading' },
    { name: 'File Service', port: 3008, status: 'loading' },
  ]);

  const [platformStats, setPlatformStats] = useState({
    totalServices: 9,
    healthyServices: 0,
    completionPercentage: 0
  });

  const checkServiceHealth = async (service: ServiceStatus) => {
    try {
      const response = await axios.get(`http://localhost:${service.port}/health`, {
        timeout: 3000
      });
      return {
        ...service,
        status: 'healthy' as const,
        response: response.data
      };
    } catch (error) {
      return {
        ...service,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const checkAllServices = async () => {
    const updatedServices = await Promise.all(
      services.map(service => checkServiceHealth(service))
    );
    
    setServices(updatedServices);
    
    const healthy = updatedServices.filter(s => s.status === 'healthy').length;
    setPlatformStats({
      totalServices: updatedServices.length,
      healthyServices: healthy,
      completionPercentage: Math.round((healthy / updatedServices.length) * 100)
    });
  };

  useEffect(() => {
    checkAllServices();
    const interval = setInterval(checkAllServices, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'error':
        return '❌';
      case 'loading':
        return '⏳';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'loading':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <>
      <Helmet>
        <title>Platform Status - UltraMarket</title>
        <meta name="description" content="UltraMarket platform microservices status" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🚀 UltraMarket Platform Status
            </h1>
            <p className="text-lg text-gray-600">
              Real-time status of 9 microservices
            </p>
          </div>

          {/* Platform Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {platformStats.totalServices}
              </div>
              <div className="text-gray-600">Total Services</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {platformStats.healthyServices}
              </div>
              <div className="text-gray-600">Healthy Services</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {platformStats.completionPercentage}%
              </div>
              <div className="text-gray-600">Platform Health</div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {services.map((service, index) => (
              <div
                key={index}
                className={`border-2 rounded-lg p-6 transition-all duration-300 ${getStatusColor(service.status)}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                  <span className="text-2xl">{getStatusIcon(service.status)}</span>
                </div>
                
                <div className="text-sm mb-2">
                  <span className="font-medium">Port:</span> {service.port}
                </div>
                
                <div className="text-sm mb-2">
                  <span className="font-medium">Status:</span>{' '}
                  <span className="capitalize">{service.status}</span>
                </div>
                
                {service.response && (
                  <div className="text-xs bg-white bg-opacity-50 rounded p-2 mt-3">
                    <div><strong>Service:</strong> {service.response.service}</div>
                    {service.response.timestamp && (
                      <div><strong>Last Check:</strong> {new Date(service.response.timestamp).toLocaleTimeString()}</div>
                    )}
                  </div>
                )}
                
                {service.error && (
                  <div className="text-xs bg-white bg-opacity-50 rounded p-2 mt-3">
                    <strong>Error:</strong> {service.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Platform Features */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🎯 Platform Features</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-3">✅ Operational Features</h3>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    User Authentication & Registration
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Product Catalog (8 products, 5 categories)
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Shopping Cart Management
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Order Processing & Tax Calculation
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Payment Processing (Click, Payme, Uzcard)
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Advanced Search & Recommendations
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Email & SMS Notifications
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    File Upload & Management
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-3">🇺🇿 Uzbekistan Integration</h3>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Click.uz Payment Gateway
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Payme.uz Mobile Payments
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Uzcard National Payment System
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Eskiz.uz SMS Service
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    PlayMobile SMS Backup
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    UZS Currency Support
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    Uzbek Language Templates
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center mt-8">
            <button
              onClick={checkAllServices}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 mr-4"
            >
              🔄 Refresh Status
            </button>
            
            <a
              href="http://localhost:3004/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300"
            >
              🌐 Open API Gateway
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlatformStatusPage;