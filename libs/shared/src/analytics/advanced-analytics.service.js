"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
let AdvancedAnalyticsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AdvancedAnalyticsService = _classThis = class {
        constructor(analyticsModel, orderRepository, userRepository, productRepository, redis) {
            this.analyticsModel = analyticsModel;
            this.orderRepository = orderRepository;
            this.userRepository = userRepository;
            this.productRepository = productRepository;
            this.redis = redis;
            this.logger = new common_1.Logger(AdvancedAnalyticsService.name);
        }
        /**
         * Track analytics event
         */
        async trackEvent(event) {
            try {
                const analyticsEvent = new this.analyticsModel({
                    ...event,
                    id: this.generateEventId(),
                    timestamp: new Date(),
                });
                await analyticsEvent.save();
                // Update real-time metrics in Redis
                await this.updateRealTimeMetrics(event);
                this.logger.log(`Analytics event tracked: ${event.eventType}`);
            }
            catch (error) {
                this.logger.error('Error tracking analytics event:', error);
                throw error;
            }
        }
        /**
         * Get comprehensive business metrics
         */
        async getBusinessMetrics(startDate, endDate) {
            try {
                const [totalRevenue, totalOrders, topProducts, topCategories, customerMetrics] = await Promise.all([
                    this.getTotalRevenue(startDate, endDate),
                    this.getTotalOrders(startDate, endDate),
                    this.getTopProducts(startDate, endDate),
                    this.getTopCategories(startDate, endDate),
                    this.getCustomerMetrics(startDate, endDate),
                ]);
                const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
                const conversionRate = await this.getConversionRate(startDate, endDate);
                const customerLifetimeValue = await this.getCustomerLifetimeValue();
                const returnCustomerRate = await this.getReturnCustomerRate(startDate, endDate);
                return {
                    totalRevenue,
                    totalOrders,
                    averageOrderValue,
                    conversionRate,
                    customerLifetimeValue,
                    returnCustomerRate,
                    topProducts,
                    topCategories,
                };
            }
            catch (error) {
                this.logger.error('Error getting business metrics:', error);
                throw error;
            }
        }
        /**
         * Get user behavior analytics
         */
        async getUserBehaviorAnalytics(startDate, endDate) {
            try {
                const [pageViews, uniqueVisitors, bounceRate, averageSessionDuration, pagesPerSession, topPages, userFlow,] = await Promise.all([
                    this.getPageViews(startDate, endDate),
                    this.getUniqueVisitors(startDate, endDate),
                    this.getBounceRate(startDate, endDate),
                    this.getAverageSessionDuration(startDate, endDate),
                    this.getPagesPerSession(startDate, endDate),
                    this.getTopPages(startDate, endDate),
                    this.getUserFlow(startDate, endDate),
                ]);
                return {
                    pageViews,
                    uniqueVisitors,
                    bounceRate,
                    averageSessionDuration,
                    pagesPerSession,
                    topPages,
                    userFlow,
                };
            }
            catch (error) {
                this.logger.error('Error getting user behavior analytics:', error);
                throw error;
            }
        }
        /**
         * Get sales analytics
         */
        async getSalesAnalytics(startDate, endDate) {
            try {
                const [dailySales, monthlySales, salesByRegion, salesByPaymentMethod] = await Promise.all([
                    this.getDailySales(startDate, endDate),
                    this.getMonthlySales(startDate, endDate),
                    this.getSalesByRegion(startDate, endDate),
                    this.getSalesByPaymentMethod(startDate, endDate),
                ]);
                return {
                    dailySales,
                    monthlySales,
                    salesByRegion,
                    salesByPaymentMethod,
                };
            }
            catch (error) {
                this.logger.error('Error getting sales analytics:', error);
                throw error;
            }
        }
        /**
         * Get customer analytics
         */
        async getCustomerAnalytics(startDate, endDate) {
            try {
                const [totalCustomers, newCustomers, returningCustomers, customerSegments, customerRetention, customerAcquisition,] = await Promise.all([
                    this.getTotalCustomers(),
                    this.getNewCustomers(startDate, endDate),
                    this.getReturningCustomers(startDate, endDate),
                    this.getCustomerSegments(startDate, endDate),
                    this.getCustomerRetention(startDate, endDate),
                    this.getCustomerAcquisition(startDate, endDate),
                ]);
                return {
                    totalCustomers,
                    newCustomers,
                    returningCustomers,
                    customerSegments,
                    customerRetention,
                    customerAcquisition,
                };
            }
            catch (error) {
                this.logger.error('Error getting customer analytics:', error);
                throw error;
            }
        }
        /**
         * Get product analytics
         */
        async getProductAnalytics(startDate, endDate) {
            try {
                const [totalProducts, activeProducts, topSellingProducts, productPerformance, inventoryAnalytics,] = await Promise.all([
                    this.getTotalProducts(),
                    this.getActiveProducts(),
                    this.getTopSellingProducts(startDate, endDate),
                    this.getProductPerformance(startDate, endDate),
                    this.getInventoryAnalytics(),
                ]);
                return {
                    totalProducts,
                    activeProducts,
                    topSellingProducts,
                    productPerformance,
                    inventoryAnalytics,
                };
            }
            catch (error) {
                this.logger.error('Error getting product analytics:', error);
                throw error;
            }
        }
        /**
         * Get real-time metrics
         */
        async getRealTimeMetrics() {
            try {
                const [activeUsers, currentOrders, realtimeRevenue, serverLoad, responseTime, errorRate, topActivePages,] = await Promise.all([
                    this.getActiveUsers(),
                    this.getCurrentOrders(),
                    this.getRealtimeRevenue(),
                    this.getServerLoad(),
                    this.getResponseTime(),
                    this.getErrorRate(),
                    this.getTopActivePages(),
                ]);
                return {
                    activeUsers,
                    currentOrders,
                    realtimeRevenue,
                    serverLoad,
                    responseTime,
                    errorRate,
                    topActivePages,
                };
            }
            catch (error) {
                this.logger.error('Error getting real-time metrics:', error);
                throw error;
            }
        }
        /**
         * Generate custom analytics report
         */
        async generateCustomReport(reportConfig) {
            try {
                const { metrics, filters, groupBy, dateRange } = reportConfig;
                const { startDate, endDate } = dateRange;
                const pipeline = this.buildAnalyticsPipeline(metrics, filters, groupBy, startDate, endDate);
                const result = await this.analyticsModel.aggregate(pipeline);
                return {
                    reportId: this.generateReportId(),
                    generatedAt: new Date(),
                    config: reportConfig,
                    data: result,
                };
            }
            catch (error) {
                this.logger.error('Error generating custom report:', error);
                throw error;
            }
        }
        /**
         * Export analytics data
         */
        async exportAnalyticsData(format, startDate, endDate) {
            try {
                const data = await this.analyticsModel
                    .find({
                    timestamp: { $gte: startDate, $lte: endDate },
                })
                    .lean();
                switch (format) {
                    case 'csv':
                        return this.exportToCSV(data);
                    case 'json':
                        return Buffer.from(JSON.stringify(data, null, 2));
                    case 'xlsx':
                        return this.exportToExcel(data);
                    default:
                        throw new Error(`Unsupported format: ${format}`);
                }
            }
            catch (error) {
                this.logger.error('Error exporting analytics data:', error);
                throw error;
            }
        }
        /**
         * Get predictive analytics
         */
        async getPredictiveAnalytics(metric, timeframe) {
            try {
                const historicalData = await this.getHistoricalData(metric, timeframe);
                const prediction = await this.predictFutureValues(historicalData, timeframe);
                return {
                    metric,
                    timeframe,
                    historicalData,
                    prediction,
                    confidence: prediction.confidence,
                    trend: prediction.trend,
                };
            }
            catch (error) {
                this.logger.error('Error getting predictive analytics:', error);
                throw error;
            }
        }
        // Private helper methods
        async getTotalRevenue(startDate, endDate) {
            const result = await this.orderRepository
                .createQueryBuilder('order')
                .select('SUM(order.totalAmount)', 'total')
                .where('order.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
                .andWhere('order.status = :status', { status: 'completed' })
                .getRawOne();
            return parseFloat(result.total) || 0;
        }
        async getTotalOrders(startDate, endDate) {
            return await this.orderRepository
                .createQueryBuilder('order')
                .where('order.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
                .getCount();
        }
        async getTopProducts(startDate, endDate) {
            return await this.orderRepository
                .createQueryBuilder('order')
                .innerJoin('order.items', 'item')
                .innerJoin('item.product', 'product')
                .select([
                'product.id as productId',
                'product.name as productName',
                'SUM(item.quantity * item.price) as revenue',
                'SUM(item.quantity) as quantity',
            ])
                .where('order.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
                .groupBy('product.id')
                .orderBy('revenue', 'DESC')
                .limit(10)
                .getRawMany();
        }
        async getTopCategories(startDate, endDate) {
            return await this.orderRepository
                .createQueryBuilder('order')
                .innerJoin('order.items', 'item')
                .innerJoin('item.product', 'product')
                .innerJoin('product.category', 'category')
                .select([
                'category.id as categoryId',
                'category.name as categoryName',
                'SUM(item.quantity * item.price) as revenue',
                'COUNT(DISTINCT order.id) as orders',
            ])
                .where('order.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
                .groupBy('category.id')
                .orderBy('revenue', 'DESC')
                .limit(10)
                .getRawMany();
        }
        async getConversionRate(startDate, endDate) {
            const [visitors, orders] = await Promise.all([
                this.analyticsModel.countDocuments({
                    eventType: 'page_view',
                    timestamp: { $gte: startDate, $lte: endDate },
                }),
                this.orderRepository
                    .createQueryBuilder('order')
                    .where('order.createdAt BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate,
                })
                    .getCount(),
            ]);
            return visitors > 0 ? (orders / visitors) * 100 : 0;
        }
        async getCustomerLifetimeValue() {
            const result = await this.orderRepository
                .createQueryBuilder('order')
                .select('AVG(customer_total.total)', 'avgLifetimeValue')
                .from((subQuery) => subQuery
                .select('order.userId', 'userId')
                .addSelect('SUM(order.totalAmount)', 'total')
                .from('order', 'order')
                .where('order.status = :status', { status: 'completed' })
                .groupBy('order.userId'), 'customer_total')
                .getRawOne();
            return parseFloat(result.avgLifetimeValue) || 0;
        }
        async getReturnCustomerRate(startDate, endDate) {
            const [totalCustomers, returningCustomers] = await Promise.all([
                this.orderRepository
                    .createQueryBuilder('order')
                    .select('COUNT(DISTINCT order.userId)', 'count')
                    .where('order.createdAt BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate,
                })
                    .getRawOne(),
                this.orderRepository
                    .createQueryBuilder('order')
                    .select('COUNT(DISTINCT order.userId)', 'count')
                    .where('order.createdAt BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate,
                })
                    .andWhere('order.userId IN (SELECT DISTINCT userId FROM order WHERE createdAt < :startDate)', { startDate })
                    .getRawOne(),
            ]);
            const total = parseInt(totalCustomers.count);
            const returning = parseInt(returningCustomers.count);
            return total > 0 ? (returning / total) * 100 : 0;
        }
        async updateRealTimeMetrics(event) {
            const key = `analytics:realtime:${event.eventType}`;
            const timestamp = Math.floor(Date.now() / 1000);
            await Promise.all([
                this.redis.incr(key),
                this.redis.expire(key, 3600), // 1 hour expiry
                this.redis.zadd('analytics:realtime:events', timestamp, JSON.stringify(event)),
                this.redis.zremrangebyscore('analytics:realtime:events', 0, timestamp - 3600),
            ]);
        }
        generateEventId() {
            return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        generateReportId() {
            return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        buildAnalyticsPipeline(metrics, filters, groupBy, startDate, endDate) {
            const pipeline = [
                {
                    $match: {
                        timestamp: { $gte: startDate, $lte: endDate },
                        ...filters,
                    },
                },
            ];
            if (groupBy) {
                pipeline.push({
                    $group: {
                        _id: `$${groupBy}`,
                        count: { $sum: 1 },
                        ...metrics.reduce((acc, metric) => {
                            acc[metric] = { $sum: `$${metric}` };
                            return acc;
                        }, {}),
                    },
                });
            }
            return pipeline;
        }
        async exportToCSV(data) {
            // Implementation for CSV export
            const csv = data.map((row) => Object.values(row).join(',')).join('\n');
            return Buffer.from(csv);
        }
        async exportToExcel(data) {
            // Implementation for Excel export
            // This would require a library like 'exceljs'
            return Buffer.from('Excel export not implemented');
        }
        async getHistoricalData(metric, timeframe) {
            // Implementation for getting historical data
            return [];
        }
        async predictFutureValues(historicalData, timeframe) {
            // Implementation for predictive analytics
            return {
                values: [],
                confidence: 0.85,
                trend: 'increasing',
            };
        }
        // Additional helper methods for specific metrics
        async getPageViews(startDate, endDate) {
            return await this.analyticsModel.countDocuments({
                eventType: 'page_view',
                timestamp: { $gte: startDate, $lte: endDate },
            });
        }
        async getUniqueVisitors(startDate, endDate) {
            const result = await this.analyticsModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: startDate, $lte: endDate },
                    },
                },
                {
                    $group: {
                        _id: '$sessionId',
                    },
                },
                {
                    $count: 'uniqueVisitors',
                },
            ]);
            return result[0]?.uniqueVisitors || 0;
        }
        async getBounceRate(startDate, endDate) {
            // Implementation for bounce rate calculation
            return 0;
        }
        async getAverageSessionDuration(startDate, endDate) {
            // Implementation for average session duration
            return 0;
        }
        async getPagesPerSession(startDate, endDate) {
            // Implementation for pages per session
            return 0;
        }
        async getTopPages(startDate, endDate) {
            return await this.analyticsModel.aggregate([
                {
                    $match: {
                        eventType: 'page_view',
                        timestamp: { $gte: startDate, $lte: endDate },
                    },
                },
                {
                    $group: {
                        _id: '$eventData.path',
                        views: { $sum: 1 },
                        uniqueViews: { $addToSet: '$sessionId' },
                    },
                },
                {
                    $project: {
                        path: '$_id',
                        views: 1,
                        uniqueViews: { $size: '$uniqueViews' },
                    },
                },
                {
                    $sort: { views: -1 },
                },
                {
                    $limit: 10,
                },
            ]);
        }
        async getUserFlow(startDate, endDate) {
            // Implementation for user flow analysis
            return [];
        }
        async getDailySales(startDate, endDate) {
            return await this.orderRepository
                .createQueryBuilder('order')
                .select([
                'DATE(order.createdAt) as date',
                'SUM(order.totalAmount) as revenue',
                'COUNT(order.id) as orders',
                'COUNT(DISTINCT order.userId) as customers',
            ])
                .where('order.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
                .andWhere('order.status = :status', { status: 'completed' })
                .groupBy('DATE(order.createdAt)')
                .orderBy('date', 'ASC')
                .getRawMany();
        }
        async getMonthlySales(startDate, endDate) {
            return await this.orderRepository
                .createQueryBuilder('order')
                .select([
                'DATE_FORMAT(order.createdAt, "%Y-%m") as month',
                'SUM(order.totalAmount) as revenue',
                'COUNT(order.id) as orders',
                'COUNT(DISTINCT order.userId) as customers',
            ])
                .where('order.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
                .andWhere('order.status = :status', { status: 'completed' })
                .groupBy('DATE_FORMAT(order.createdAt, "%Y-%m")')
                .orderBy('month', 'ASC')
                .getRawMany();
        }
        async getSalesByRegion(startDate, endDate) {
            // Implementation for sales by region
            return [];
        }
        async getSalesByPaymentMethod(startDate, endDate) {
            return await this.orderRepository
                .createQueryBuilder('order')
                .select([
                'order.paymentMethod as method',
                'SUM(order.totalAmount) as revenue',
                'COUNT(order.id) as orders',
            ])
                .where('order.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
                .andWhere('order.status = :status', { status: 'completed' })
                .groupBy('order.paymentMethod')
                .orderBy('revenue', 'DESC')
                .getRawMany();
        }
        async getCustomerMetrics(startDate, endDate) {
            // Implementation for customer metrics
            return {};
        }
        async getTotalCustomers() {
            return await this.userRepository.count();
        }
        async getNewCustomers(startDate, endDate) {
            return await this.userRepository
                .createQueryBuilder('user')
                .where('user.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
                .getCount();
        }
        async getReturningCustomers(startDate, endDate) {
            return await this.userRepository
                .createQueryBuilder('user')
                .where('user.createdAt < :startDate', { startDate })
                .andWhere('user.id IN (SELECT DISTINCT userId FROM order WHERE createdAt BETWEEN :startDate AND :endDate)', { startDate, endDate })
                .getCount();
        }
        async getCustomerSegments(startDate, endDate) {
            // Implementation for customer segmentation
            return [];
        }
        async getCustomerRetention(startDate, endDate) {
            // Implementation for customer retention analysis
            return [];
        }
        async getCustomerAcquisition(startDate, endDate) {
            // Implementation for customer acquisition analysis
            return [];
        }
        async getTotalProducts() {
            return await this.productRepository.count();
        }
        async getActiveProducts() {
            return await this.productRepository
                .createQueryBuilder('product')
                .where('product.isActive = :isActive', { isActive: true })
                .getCount();
        }
        async getTopSellingProducts(startDate, endDate) {
            return await this.orderRepository
                .createQueryBuilder('order')
                .innerJoin('order.items', 'item')
                .innerJoin('item.product', 'product')
                .select([
                'product.id as productId',
                'product.name as productName',
                'SUM(item.quantity) as sales',
                'SUM(item.quantity * item.price) as revenue',
            ])
                .where('order.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
                .groupBy('product.id')
                .orderBy('sales', 'DESC')
                .limit(10)
                .getRawMany();
        }
        async getProductPerformance(startDate, endDate) {
            // Implementation for product performance analysis
            return [];
        }
        async getInventoryAnalytics() {
            // Implementation for inventory analytics
            return [];
        }
        async getActiveUsers() {
            const activeUsers = await this.redis.zcard('analytics:realtime:active_users');
            return activeUsers;
        }
        async getCurrentOrders() {
            return await this.orderRepository
                .createQueryBuilder('order')
                .where('order.status IN (:...statuses)', {
                statuses: ['pending', 'processing', 'confirmed'],
            })
                .getCount();
        }
        async getRealtimeRevenue() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const result = await this.orderRepository
                .createQueryBuilder('order')
                .select('SUM(order.totalAmount)', 'total')
                .where('order.createdAt >= :today', { today })
                .andWhere('order.status = :status', { status: 'completed' })
                .getRawOne();
            return parseFloat(result.total) || 0;
        }
        async getServerLoad() {
            // Implementation for server load metrics
            return 0;
        }
        async getResponseTime() {
            // Implementation for response time metrics
            return 0;
        }
        async getErrorRate() {
            // Implementation for error rate metrics
            return 0;
        }
        async getTopActivePages() {
            const activePages = await this.redis.zrevrange('analytics:realtime:active_pages', 0, 9, 'WITHSCORES');
            const result = [];
            for (let i = 0; i < activePages.length; i += 2) {
                result.push({
                    path: activePages[i],
                    activeUsers: parseInt(activePages[i + 1]),
                });
            }
            return result;
        }
    };
    __setFunctionName(_classThis, "AdvancedAnalyticsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AdvancedAnalyticsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AdvancedAnalyticsService = _classThis;
})();
exports.AdvancedAnalyticsService = AdvancedAnalyticsService;
