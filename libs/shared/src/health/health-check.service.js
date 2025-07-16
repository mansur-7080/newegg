"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const mongodb_1 = require("mongodb");
const redis_1 = require("redis");
const elasticsearch_1 = require("@elastic/elasticsearch");
const minio_1 = require("minio");
const axios_1 = __importDefault(require("axios"));
let HealthCheckService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var HealthCheckService = _classThis = class {
        constructor(configService) {
            this.configService = configService;
            this.logger = new common_1.Logger(HealthCheckService.name);
            this.startTime = Date.now();
            this.initializeClients();
        }
        initializeClients() {
            // PostgreSQL
            this.pgPool = new pg_1.Pool({
                host: this.configService.get('POSTGRES_HOST'),
                port: this.configService.get('POSTGRES_PORT'),
                database: this.configService.get('POSTGRES_DB'),
                user: this.configService.get('POSTGRES_USER'),
                password: this.configService.get('POSTGRES_PASSWORD'),
                max: 1, // Only for health checks
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            });
            // Redis
            this.redisClient = (0, redis_1.createClient)({
                url: `redis://${this.configService.get('REDIS_HOST')}:${this.configService.get('REDIS_PORT')}`,
                password: this.configService.get('REDIS_PASSWORD'),
                socket: {
                    connectTimeout: 5000,
                },
            });
            // MongoDB
            this.mongoClient = new mongodb_1.MongoClient(this.configService.get('MONGO_URL'), {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000,
            });
            // Elasticsearch
            this.elasticsearchClient = new elasticsearch_1.Client({
                node: this.configService.get('ELASTICSEARCH_URL'),
                auth: {
                    username: this.configService.get('ELASTICSEARCH_USERNAME'),
                    password: this.configService.get('ELASTICSEARCH_PASSWORD'),
                },
                requestTimeout: 5000,
            });
            // MinIO
            this.minioClient = new minio_1.Client({
                endPoint: this.configService.get('MINIO_ENDPOINT'),
                port: parseInt(this.configService.get('MINIO_PORT')),
                useSSL: this.configService.get('MINIO_SSL') === 'true',
                accessKey: this.configService.get('MINIO_ACCESS_KEY'),
                secretKey: this.configService.get('MINIO_SECRET_KEY'),
            });
        }
        async getHealthStatus() {
            const startTime = Date.now();
            try {
                const [postgresHealth, redisHealth, mongoHealth, elasticsearchHealth, minioHealth, systemHealth,] = await Promise.allSettled([
                    this.checkPostgreSQL(),
                    this.checkRedis(),
                    this.checkMongoDB(),
                    this.checkElasticsearch(),
                    this.checkMinIO(),
                    this.getSystemHealth(),
                ]);
                const services = {
                    postgres: this.getResultValue(postgresHealth),
                    redis: this.getResultValue(redisHealth),
                    mongodb: this.getResultValue(mongoHealth),
                    elasticsearch: this.getResultValue(elasticsearchHealth),
                    minio: this.getResultValue(minioHealth),
                };
                // Overall status determination
                const unhealthyServices = Object.values(services).filter((service) => service.status === 'unhealthy');
                const degradedServices = Object.values(services).filter((service) => service.status === 'degraded');
                let overallStatus = 'healthy';
                if (unhealthyServices.length > 0) {
                    overallStatus = 'unhealthy';
                }
                else if (degradedServices.length > 0) {
                    overallStatus = 'degraded';
                }
                const result = {
                    status: overallStatus,
                    timestamp: new Date().toISOString(),
                    uptime: Date.now() - this.startTime,
                    version: this.configService.get('APP_VERSION', '1.0.0'),
                    services,
                    system: this.getResultValue(systemHealth),
                };
                this.logger.log(`Health check completed in ${Date.now() - startTime}ms - Status: ${overallStatus}`);
                return result;
            }
            catch (error) {
                this.logger.error('Health check failed:', error);
                return {
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    uptime: Date.now() - this.startTime,
                    version: this.configService.get('APP_VERSION', '1.0.0'),
                    services: {},
                    system: {
                        memory: { used: 0, total: 0, percentage: 0 },
                        cpu: { usage: 0 },
                        disk: { used: 0, total: 0, percentage: 0 },
                        network: { connections: 0 },
                    },
                };
            }
        }
        getResultValue(result) {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            else {
                this.logger.error('Health check component failed:', result.reason);
                return {
                    status: 'unhealthy',
                    responseTime: 0,
                    error: result.reason?.message || 'Unknown error',
                };
            }
        }
        async checkPostgreSQL() {
            const startTime = Date.now();
            try {
                const client = await this.pgPool.connect();
                const result = await client.query('SELECT 1 as health_check');
                client.release();
                const responseTime = Date.now() - startTime;
                return {
                    status: responseTime < 100 ? 'healthy' : 'degraded',
                    responseTime,
                    details: {
                        database: this.configService.get('POSTGRES_DB'),
                        totalConnections: this.pgPool.totalCount,
                        idleConnections: this.pgPool.idleCount,
                        waitingConnections: this.pgPool.waitingCount,
                    },
                };
            }
            catch (error) {
                return {
                    status: 'unhealthy',
                    responseTime: Date.now() - startTime,
                    error: error.message,
                };
            }
        }
        async checkRedis() {
            const startTime = Date.now();
            try {
                if (!this.redisClient.isOpen) {
                    await this.redisClient.connect();
                }
                const testKey = 'health_check';
                const testValue = Date.now().toString();
                await this.redisClient.set(testKey, testValue, { EX: 10 });
                const retrievedValue = await this.redisClient.get(testKey);
                if (retrievedValue !== testValue) {
                    throw new Error('Redis read/write test failed');
                }
                await this.redisClient.del(testKey);
                const responseTime = Date.now() - startTime;
                const info = await this.redisClient.info();
                return {
                    status: responseTime < 50 ? 'healthy' : 'degraded',
                    responseTime,
                    details: {
                        connectedClients: this.parseRedisInfo(info, 'connected_clients'),
                        usedMemory: this.parseRedisInfo(info, 'used_memory_human'),
                        uptime: this.parseRedisInfo(info, 'uptime_in_seconds'),
                    },
                };
            }
            catch (error) {
                return {
                    status: 'unhealthy',
                    responseTime: Date.now() - startTime,
                    error: error.message,
                };
            }
        }
        async checkMongoDB() {
            const startTime = Date.now();
            try {
                await this.mongoClient.connect();
                const db = this.mongoClient.db(this.configService.get('MONGO_DB'));
                const result = await db.admin().ping();
                const responseTime = Date.now() - startTime;
                const stats = await db.stats();
                return {
                    status: responseTime < 100 ? 'healthy' : 'degraded',
                    responseTime,
                    details: {
                        database: this.configService.get('MONGO_DB'),
                        collections: stats.collections,
                        dataSize: stats.dataSize,
                        storageSize: stats.storageSize,
                    },
                };
            }
            catch (error) {
                return {
                    status: 'unhealthy',
                    responseTime: Date.now() - startTime,
                    error: error.message,
                };
            }
            finally {
                await this.mongoClient.close();
            }
        }
        async checkElasticsearch() {
            const startTime = Date.now();
            try {
                const response = await this.elasticsearchClient.cluster.health();
                const responseTime = Date.now() - startTime;
                let status = 'healthy';
                if (response.status === 'red') {
                    status = 'unhealthy';
                }
                else if (response.status === 'yellow') {
                    status = 'degraded';
                }
                return {
                    status,
                    responseTime,
                    details: {
                        clusterName: response.cluster_name,
                        status: response.status,
                        numberOfNodes: response.number_of_nodes,
                        numberOfDataNodes: response.number_of_data_nodes,
                        activePrimaryShards: response.active_primary_shards,
                        activeShards: response.active_shards,
                    },
                };
            }
            catch (error) {
                return {
                    status: 'unhealthy',
                    responseTime: Date.now() - startTime,
                    error: error.message,
                };
            }
        }
        async checkMinIO() {
            const startTime = Date.now();
            try {
                const buckets = await this.minioClient.listBuckets();
                const responseTime = Date.now() - startTime;
                return {
                    status: responseTime < 200 ? 'healthy' : 'degraded',
                    responseTime,
                    details: {
                        bucketsCount: buckets.length,
                        buckets: buckets.map((bucket) => ({
                            name: bucket.name,
                            creationDate: bucket.creationDate,
                        })),
                    },
                };
            }
            catch (error) {
                return {
                    status: 'unhealthy',
                    responseTime: Date.now() - startTime,
                    error: error.message,
                };
            }
        }
        async getSystemHealth() {
            const process = await Promise.resolve().then(() => __importStar(require('process')));
            const os = await Promise.resolve().then(() => __importStar(require('os')));
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            // Get disk usage
            let diskUsage = { used: 0, total: 0, percentage: 0 };
            try {
                const stats = fs.statSync('.');
                // Note: This is a simplified disk usage check
                // In production, you might want to use a more robust solution
                diskUsage = {
                    used: 0,
                    total: 0,
                    percentage: 0,
                };
            }
            catch (error) {
                // Ignore disk usage errors
            }
            return {
                memory: {
                    used: usedMemory,
                    total: totalMemory,
                    percentage: Math.round((usedMemory / totalMemory) * 100),
                },
                cpu: {
                    usage: Math.round(os.loadavg()[0] * 100), // Simplified CPU usage
                },
                disk: diskUsage,
                network: {
                    connections: 0, // This would require additional system calls
                },
            };
        }
        parseRedisInfo(info, key) {
            const lines = info.split('\r\n');
            for (const line of lines) {
                if (line.startsWith(key + ':')) {
                    return line.split(':')[1];
                }
            }
            return 'N/A';
        }
        async checkExternalServices() {
            const services = {
                click: this.checkClickPayment(),
                payme: this.checkPaymePayment(),
                eskiz: this.checkEskizSMS(),
                playMobile: this.checkPlayMobileSMS(),
            };
            const results = await Promise.allSettled(Object.values(services));
            const serviceNames = Object.keys(services);
            return serviceNames.reduce((acc, name, index) => {
                acc[name] = this.getResultValue(results[index]);
                return acc;
            }, {});
        }
        async checkClickPayment() {
            const startTime = Date.now();
            try {
                // Simple connectivity check to Click API
                const response = await axios_1.default.get('https://api.click.uz/v2/merchant', {
                    timeout: 5000,
                    validateStatus: (status) => status < 500, // Accept 4xx as "reachable"
                });
                const responseTime = Date.now() - startTime;
                return {
                    status: response.status < 400 ? 'healthy' : 'degraded',
                    responseTime,
                    details: {
                        statusCode: response.status,
                        reachable: true,
                    },
                };
            }
            catch (error) {
                return {
                    status: 'unhealthy',
                    responseTime: Date.now() - startTime,
                    error: error.message,
                };
            }
        }
        async checkPaymePayment() {
            const startTime = Date.now();
            try {
                // Simple connectivity check to Payme API
                const response = await axios_1.default.post('https://checkout.paycom.uz/api', {
                    method: 'CheckPerformTransaction',
                    params: { amount: 1000 },
                }, {
                    timeout: 5000,
                    validateStatus: (status) => status < 500,
                });
                const responseTime = Date.now() - startTime;
                return {
                    status: response.status < 400 ? 'healthy' : 'degraded',
                    responseTime,
                    details: {
                        statusCode: response.status,
                        reachable: true,
                    },
                };
            }
            catch (error) {
                return {
                    status: 'unhealthy',
                    responseTime: Date.now() - startTime,
                    error: error.message,
                };
            }
        }
        async checkEskizSMS() {
            const startTime = Date.now();
            try {
                const response = await axios_1.default.get('https://notify.eskiz.uz/api/auth/user', {
                    timeout: 5000,
                    validateStatus: (status) => status < 500,
                });
                const responseTime = Date.now() - startTime;
                return {
                    status: response.status < 400 ? 'healthy' : 'degraded',
                    responseTime,
                    details: {
                        statusCode: response.status,
                        reachable: true,
                    },
                };
            }
            catch (error) {
                return {
                    status: 'unhealthy',
                    responseTime: Date.now() - startTime,
                    error: error.message,
                };
            }
        }
        async checkPlayMobileSMS() {
            const startTime = Date.now();
            try {
                const response = await axios_1.default.get('https://send.smsxabar.uz/broker-api/send', {
                    timeout: 5000,
                    validateStatus: (status) => status < 500,
                });
                const responseTime = Date.now() - startTime;
                return {
                    status: response.status < 400 ? 'healthy' : 'degraded',
                    responseTime,
                    details: {
                        statusCode: response.status,
                        reachable: true,
                    },
                };
            }
            catch (error) {
                return {
                    status: 'unhealthy',
                    responseTime: Date.now() - startTime,
                    error: error.message,
                };
            }
        }
        async onApplicationShutdown() {
            try {
                await this.pgPool.end();
                await this.redisClient.quit();
                await this.mongoClient.close();
            }
            catch (error) {
                this.logger.error('Error during health check service shutdown:', error);
            }
        }
    };
    __setFunctionName(_classThis, "HealthCheckService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HealthCheckService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HealthCheckService = _classThis;
})();
exports.HealthCheckService = HealthCheckService;
