"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeCommunicationService = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
let RealtimeCommunicationService = (() => {
    let _classDecorators = [(0, common_1.Injectable)(), (0, websockets_1.WebSocketGateway)({
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                credentials: true,
            },
            namespace: '/realtime',
            transports: ['websocket', 'polling'],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _server_decorators;
    let _server_initializers = [];
    let _server_extraInitializers = [];
    let _handleSubscribe_decorators;
    let _handleUnsubscribe_decorators;
    let _handleSendMessage_decorators;
    let _handleGetPresence_decorators;
    let _handleTyping_decorators;
    let _handlePing_decorators;
    var RealtimeCommunicationService = _classThis = class {
        constructor(redis, jwtService) {
            this.redis = (__runInitializers(this, _instanceExtraInitializers), redis);
            this.jwtService = jwtService;
            this.server = __runInitializers(this, _server_initializers, void 0);
            this.logger = (__runInitializers(this, _server_extraInitializers), new common_1.Logger(RealtimeCommunicationService.name));
            this.clients = new Map();
            this.channels = new Map();
            this.messageHistory = new Map();
            this.initializeChannels();
        }
        afterInit(server) {
            this.logger.log('WebSocket Gateway initialized');
            this.setupRedisSubscriptions();
        }
        async handleConnection(client) {
            try {
                const clientInfo = await this.authenticateClient(client);
                if (!clientInfo) {
                    client.disconnect(true);
                    return;
                }
                this.clients.set(client.id, clientInfo);
                // Join user to their personal room
                if (clientInfo.userId) {
                    await client.join(`user:${clientInfo.userId}`);
                }
                // Join session room
                await client.join(`session:${clientInfo.sessionId}`);
                // Track connection
                await this.trackConnection(clientInfo);
                this.logger.log(`Client connected: ${client.id} (User: ${clientInfo.userId})`);
                // Send welcome message
                client.emit('connected', {
                    clientId: client.id,
                    timestamp: new Date(),
                    serverInfo: {
                        version: '1.0.0',
                        features: ['realtime_notifications', 'chat', 'presence'],
                    },
                });
                // Send pending notifications
                if (clientInfo.userId) {
                    await this.sendPendingNotifications(client, clientInfo.userId);
                }
            }
            catch (error) {
                this.logger.error('Error handling connection:', error);
                client.disconnect(true);
            }
        }
        async handleDisconnect(client) {
            const clientInfo = this.clients.get(client.id);
            if (clientInfo) {
                // Track disconnection
                await this.trackDisconnection(clientInfo);
                // Leave all channels
                for (const channel of clientInfo.subscriptions) {
                    await this.leaveChannel(client.id, channel);
                }
                this.clients.delete(client.id);
                this.logger.log(`Client disconnected: ${client.id} (User: ${clientInfo.userId})`);
            }
        }
        async handleSubscribe(client, payload) {
            try {
                const clientInfo = this.clients.get(client.id);
                if (!clientInfo)
                    return;
                const { channel, permissions = [] } = payload;
                // Validate channel access
                if (!(await this.validateChannelAccess(clientInfo, channel, permissions))) {
                    client.emit('error', {
                        type: 'access_denied',
                        message: 'Access denied to channel',
                        channel,
                    });
                    return;
                }
                // Subscribe to channel
                await this.subscribeToChannel(client, channel);
                client.emit('subscribed', {
                    channel,
                    timestamp: new Date(),
                });
            }
            catch (error) {
                this.logger.error('Error handling subscribe:', error);
                client.emit('error', {
                    type: 'subscribe_error',
                    message: 'Failed to subscribe to channel',
                });
            }
        }
        async handleUnsubscribe(client, payload) {
            try {
                const { channel } = payload;
                await this.unsubscribeFromChannel(client, channel);
                client.emit('unsubscribed', {
                    channel,
                    timestamp: new Date(),
                });
            }
            catch (error) {
                this.logger.error('Error handling unsubscribe:', error);
            }
        }
        async handleSendMessage(client, payload) {
            try {
                const clientInfo = this.clients.get(client.id);
                if (!clientInfo)
                    return;
                // Validate message
                if (!this.validateMessage(payload)) {
                    client.emit('error', {
                        type: 'invalid_message',
                        message: 'Invalid message format',
                    });
                    return;
                }
                // Check permissions
                if (!(await this.validateMessagePermissions(clientInfo, payload))) {
                    client.emit('error', {
                        type: 'permission_denied',
                        message: 'Permission denied to send message',
                    });
                    return;
                }
                // Process and broadcast message
                await this.processMessage(payload, clientInfo);
            }
            catch (error) {
                this.logger.error('Error handling send message:', error);
            }
        }
        async handleGetPresence(client, payload) {
            try {
                const { channel } = payload;
                const presence = await this.getChannelPresence(channel);
                client.emit('presence', {
                    channel,
                    users: presence,
                    timestamp: new Date(),
                });
            }
            catch (error) {
                this.logger.error('Error handling get presence:', error);
            }
        }
        async handleTyping(client, payload) {
            try {
                const clientInfo = this.clients.get(client.id);
                if (!clientInfo)
                    return;
                const { channel, typing } = payload;
                // Broadcast typing status
                client.to(channel).emit('user_typing', {
                    userId: clientInfo.userId,
                    channel,
                    typing,
                    timestamp: new Date(),
                });
            }
            catch (error) {
                this.logger.error('Error handling typing:', error);
            }
        }
        async handlePing(client) {
            const clientInfo = this.clients.get(client.id);
            if (clientInfo) {
                clientInfo.lastActivity = new Date();
            }
            client.emit('pong', {
                timestamp: new Date(),
            });
        }
        /**
         * Send notification to specific user
         */
        async sendNotificationToUser(userId, notification) {
            try {
                const room = `user:${userId}`;
                // Send to connected clients
                this.server.to(room).emit('notification', notification);
                // Store for offline delivery
                await this.storeNotificationForUser(userId, notification);
                this.logger.log(`Notification sent to user ${userId}: ${notification.type}`);
            }
            catch (error) {
                this.logger.error('Error sending notification to user:', error);
            }
        }
        /**
         * Send notification to specific role
         */
        async sendNotificationToRole(role, notification) {
            try {
                const room = `role:${role}`;
                // Send to connected clients with the role
                this.server.to(room).emit('notification', notification);
                // Store for offline delivery
                await this.storeNotificationForRole(role, notification);
                this.logger.log(`Notification sent to role ${role}: ${notification.type}`);
            }
            catch (error) {
                this.logger.error('Error sending notification to role:', error);
            }
        }
        /**
         * Broadcast notification to all connected clients
         */
        async broadcastNotification(notification) {
            try {
                this.server.emit('notification', notification);
                // Store for offline delivery
                await this.storeBroadcastNotification(notification);
                this.logger.log(`Broadcast notification sent: ${notification.type}`);
            }
            catch (error) {
                this.logger.error('Error broadcasting notification:', error);
            }
        }
        /**
         * Send real-time order update
         */
        async sendOrderUpdate(userId, orderData) {
            const notification = {
                id: this.generateId(),
                type: 'order_update',
                title: 'Order Update',
                message: `Your order #${orderData.orderNumber} has been ${orderData.status}`,
                data: orderData,
                priority: 'high',
                userId,
                channels: [`user:${userId}`],
                timestamp: new Date(),
                actions: [
                    {
                        label: 'View Order',
                        action: 'view_order',
                        data: { orderId: orderData.id },
                    },
                ],
            };
            await this.sendNotificationToUser(userId, notification);
        }
        /**
         * Send payment status update
         */
        async sendPaymentUpdate(userId, paymentData) {
            const notification = {
                id: this.generateId(),
                type: 'payment_status',
                title: 'Payment Update',
                message: `Payment ${paymentData.status} for order #${paymentData.orderNumber}`,
                data: paymentData,
                priority: 'high',
                userId,
                channels: [`user:${userId}`],
                timestamp: new Date(),
            };
            await this.sendNotificationToUser(userId, notification);
        }
        /**
         * Send inventory alert to admins
         */
        async sendInventoryAlert(productData) {
            const notification = {
                id: this.generateId(),
                type: 'inventory_alert',
                title: 'Low Inventory Alert',
                message: `Product "${productData.name}" is running low (${productData.stock} remaining)`,
                data: productData,
                priority: 'medium',
                userRole: 'admin',
                channels: ['role:admin'],
                timestamp: new Date(),
                actions: [
                    {
                        label: 'Restock',
                        action: 'restock_product',
                        data: { productId: productData.id },
                    },
                ],
            };
            await this.sendNotificationToRole('admin', notification);
        }
        /**
         * Get connected clients count
         */
        getConnectedClientsCount() {
            return this.clients.size;
        }
        /**
         * Get connected clients by user ID
         */
        getClientsByUserId(userId) {
            return Array.from(this.clients.values()).filter((client) => client.userId === userId);
        }
        /**
         * Get channel statistics
         */
        async getChannelStats(channel) {
            const channelInfo = this.channels.get(channel);
            const messageHistory = this.messageHistory.get(channel) || [];
            return {
                subscriberCount: channelInfo?.subscribers.size || 0,
                messageCount: messageHistory.length,
                lastActivity: messageHistory.length > 0
                    ? messageHistory[messageHistory.length - 1].timestamp
                    : new Date(),
            };
        }
        /**
         * Get real-time analytics
         */
        async getRealtimeAnalytics() {
            const activeChannels = Array.from(this.channels.values()).filter((channel) => channel.subscribers.size > 0);
            const topChannels = activeChannels
                .map((channel) => ({
                channel: channel.name,
                subscribers: channel.subscribers.size,
            }))
                .sort((a, b) => b.subscribers - a.subscribers)
                .slice(0, 10);
            // Calculate messages per minute (simplified)
            const messagesPerMinute = await this.calculateMessagesPerMinute();
            return {
                connectedClients: this.clients.size,
                activeChannels: activeChannels.length,
                messagesPerMinute,
                topChannels,
            };
        }
        // Private helper methods
        async authenticateClient(client) {
            try {
                const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
                if (!token) {
                    return {
                        id: client.id,
                        sessionId: this.generateSessionId(),
                        connectedAt: new Date(),
                        lastActivity: new Date(),
                        metadata: {
                            userAgent: client.handshake.headers['user-agent'] || '',
                            ipAddress: client.handshake.address || '',
                        },
                        subscriptions: new Set(),
                        permissions: ['guest'],
                    };
                }
                const decoded = this.jwtService.verify(token.replace('Bearer ', ''));
                return {
                    id: client.id,
                    userId: decoded.sub,
                    sessionId: this.generateSessionId(),
                    connectedAt: new Date(),
                    lastActivity: new Date(),
                    metadata: {
                        userAgent: client.handshake.headers['user-agent'] || '',
                        ipAddress: client.handshake.address || '',
                    },
                    subscriptions: new Set(),
                    permissions: decoded.permissions || ['user'],
                };
            }
            catch (error) {
                this.logger.error('Error authenticating client:', error);
                return null;
            }
        }
        initializeChannels() {
            const defaultChannels = [
                {
                    name: 'global',
                    type: 'public',
                    permissions: [],
                    description: 'Global public channel',
                },
                {
                    name: 'orders',
                    type: 'private',
                    permissions: ['user'],
                    description: 'Order updates channel',
                },
                {
                    name: 'admin',
                    type: 'private',
                    permissions: ['admin'],
                    description: 'Admin notifications channel',
                },
                {
                    name: 'support',
                    type: 'presence',
                    permissions: ['user'],
                    description: 'Customer support channel',
                },
            ];
            for (const channelConfig of defaultChannels) {
                this.channels.set(channelConfig.name, {
                    name: channelConfig.name,
                    type: channelConfig.type,
                    permissions: channelConfig.permissions,
                    subscribers: new Set(),
                    metadata: {
                        createdAt: new Date(),
                        description: channelConfig.description,
                    },
                });
            }
            this.logger.log(`Initialized ${defaultChannels.length} default channels`);
        }
        async setupRedisSubscriptions() {
            try {
                // Subscribe to Redis channels for distributed messaging
                await this.redis.subscribe('websocket:broadcast');
                await this.redis.subscribe('websocket:user');
                await this.redis.subscribe('websocket:role');
                this.redis.on('message', (channel, message) => {
                    this.handleRedisMessage(channel, message);
                });
                this.logger.log('Redis subscriptions set up');
            }
            catch (error) {
                this.logger.error('Error setting up Redis subscriptions:', error);
            }
        }
        handleRedisMessage(channel, message) {
            try {
                const data = JSON.parse(message);
                switch (channel) {
                    case 'websocket:broadcast':
                        this.server.emit(data.event, data.payload);
                        break;
                    case 'websocket:user':
                        this.server.to(`user:${data.userId}`).emit(data.event, data.payload);
                        break;
                    case 'websocket:role':
                        this.server.to(`role:${data.role}`).emit(data.event, data.payload);
                        break;
                }
            }
            catch (error) {
                this.logger.error('Error handling Redis message:', error);
            }
        }
        async validateChannelAccess(client, channel, permissions) {
            const channelInfo = this.channels.get(channel);
            if (!channelInfo)
                return false;
            // Check if channel is public
            if (channelInfo.type === 'public')
                return true;
            // Check permissions
            const hasPermission = channelInfo.permissions.every((perm) => client.permissions.includes(perm));
            return hasPermission;
        }
        async subscribeToChannel(client, channel) {
            const clientInfo = this.clients.get(client.id);
            if (!clientInfo)
                return;
            // Join socket room
            await client.join(channel);
            // Update client subscriptions
            clientInfo.subscriptions.add(channel);
            // Update channel subscribers
            const channelInfo = this.channels.get(channel);
            if (channelInfo) {
                channelInfo.subscribers.add(client.id);
            }
            // Send channel history if available
            const history = this.messageHistory.get(channel);
            if (history && history.length > 0) {
                const recentMessages = history.slice(-50); // Last 50 messages
                client.emit('channel_history', {
                    channel,
                    messages: recentMessages,
                });
            }
        }
        async unsubscribeFromChannel(client, channel) {
            const clientInfo = this.clients.get(client.id);
            if (!clientInfo)
                return;
            // Leave socket room
            await client.leave(channel);
            // Update client subscriptions
            clientInfo.subscriptions.delete(channel);
            // Update channel subscribers
            const channelInfo = this.channels.get(channel);
            if (channelInfo) {
                channelInfo.subscribers.delete(client.id);
            }
        }
        async leaveChannel(clientId, channel) {
            const channelInfo = this.channels.get(channel);
            if (channelInfo) {
                channelInfo.subscribers.delete(clientId);
            }
        }
        validateMessage(message) {
            return !!(message.type && message.channel && message.data);
        }
        async validateMessagePermissions(client, message) {
            const channelInfo = this.channels.get(message.channel);
            if (!channelInfo)
                return false;
            // Check if client is subscribed to channel
            if (!client.subscriptions.has(message.channel))
                return false;
            // Check channel permissions
            return channelInfo.permissions.every((perm) => client.permissions.includes(perm));
        }
        async processMessage(message, client) {
            // Add metadata
            message.id = this.generateId();
            message.timestamp = new Date();
            message.userId = client.userId;
            message.sessionId = client.sessionId;
            // Store message history
            if (!this.messageHistory.has(message.channel)) {
                this.messageHistory.set(message.channel, []);
            }
            const history = this.messageHistory.get(message.channel);
            history.push(message);
            // Keep only last 1000 messages
            if (history.length > 1000) {
                history.splice(0, history.length - 1000);
            }
            // Broadcast message
            this.server.to(message.channel).emit('message', message);
            // Store in Redis for distributed systems
            await this.redis.publish('websocket:message', JSON.stringify(message));
        }
        async getChannelPresence(channel) {
            const channelInfo = this.channels.get(channel);
            if (!channelInfo)
                return [];
            const presence = [];
            for (const clientId of channelInfo.subscribers) {
                const client = this.clients.get(clientId);
                if (client && client.userId) {
                    presence.push({
                        userId: client.userId,
                        connectedAt: client.connectedAt,
                        lastActivity: client.lastActivity,
                    });
                }
            }
            return presence;
        }
        async trackConnection(client) {
            const connectionData = {
                clientId: client.id,
                userId: client.userId,
                sessionId: client.sessionId,
                connectedAt: client.connectedAt,
                metadata: client.metadata,
            };
            await this.redis.hset('websocket:connections', client.id, JSON.stringify(connectionData));
        }
        async trackDisconnection(client) {
            const disconnectionData = {
                clientId: client.id,
                userId: client.userId,
                sessionId: client.sessionId,
                connectedAt: client.connectedAt,
                disconnectedAt: new Date(),
                duration: new Date().getTime() - client.connectedAt.getTime(),
            };
            await this.redis.lpush('websocket:disconnections', JSON.stringify(disconnectionData));
            await this.redis.hdel('websocket:connections', client.id);
        }
        async sendPendingNotifications(client, userId) {
            const pendingNotifications = await this.redis.lrange(`notifications:${userId}`, 0, -1);
            for (const notificationData of pendingNotifications) {
                const notification = JSON.parse(notificationData);
                client.emit('notification', notification);
            }
            // Clear pending notifications
            if (pendingNotifications.length > 0) {
                await this.redis.del(`notifications:${userId}`);
            }
        }
        async storeNotificationForUser(userId, notification) {
            await this.redis.lpush(`notifications:${userId}`, JSON.stringify(notification));
            // Set expiration if specified
            if (notification.expiresAt) {
                const ttl = Math.floor((notification.expiresAt.getTime() - Date.now()) / 1000);
                await this.redis.expire(`notifications:${userId}`, ttl);
            }
        }
        async storeNotificationForRole(role, notification) {
            await this.redis.lpush(`notifications:role:${role}`, JSON.stringify(notification));
        }
        async storeBroadcastNotification(notification) {
            await this.redis.lpush('notifications:broadcast', JSON.stringify(notification));
        }
        async calculateMessagesPerMinute() {
            const now = new Date();
            const oneMinuteAgo = new Date(now.getTime() - 60000);
            let messageCount = 0;
            for (const history of this.messageHistory.values()) {
                messageCount += history.filter((msg) => msg.timestamp >= oneMinuteAgo).length;
            }
            return messageCount;
        }
        generateId() {
            return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        generateSessionId() {
            return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    };
    __setFunctionName(_classThis, "RealtimeCommunicationService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _server_decorators = [(0, websockets_1.WebSocketServer)()];
        _handleSubscribe_decorators = [(0, websockets_1.SubscribeMessage)('subscribe')];
        _handleUnsubscribe_decorators = [(0, websockets_1.SubscribeMessage)('unsubscribe')];
        _handleSendMessage_decorators = [(0, websockets_1.SubscribeMessage)('send_message')];
        _handleGetPresence_decorators = [(0, websockets_1.SubscribeMessage)('get_presence')];
        _handleTyping_decorators = [(0, websockets_1.SubscribeMessage)('typing')];
        _handlePing_decorators = [(0, websockets_1.SubscribeMessage)('ping')];
        __esDecorate(_classThis, null, _handleSubscribe_decorators, { kind: "method", name: "handleSubscribe", static: false, private: false, access: { has: obj => "handleSubscribe" in obj, get: obj => obj.handleSubscribe }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handleUnsubscribe_decorators, { kind: "method", name: "handleUnsubscribe", static: false, private: false, access: { has: obj => "handleUnsubscribe" in obj, get: obj => obj.handleUnsubscribe }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handleSendMessage_decorators, { kind: "method", name: "handleSendMessage", static: false, private: false, access: { has: obj => "handleSendMessage" in obj, get: obj => obj.handleSendMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handleGetPresence_decorators, { kind: "method", name: "handleGetPresence", static: false, private: false, access: { has: obj => "handleGetPresence" in obj, get: obj => obj.handleGetPresence }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handleTyping_decorators, { kind: "method", name: "handleTyping", static: false, private: false, access: { has: obj => "handleTyping" in obj, get: obj => obj.handleTyping }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handlePing_decorators, { kind: "method", name: "handlePing", static: false, private: false, access: { has: obj => "handlePing" in obj, get: obj => obj.handlePing }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, null, _server_decorators, { kind: "field", name: "server", static: false, private: false, access: { has: obj => "server" in obj, get: obj => obj.server, set: (obj, value) => { obj.server = value; } }, metadata: _metadata }, _server_initializers, _server_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        RealtimeCommunicationService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return RealtimeCommunicationService = _classThis;
})();
exports.RealtimeCommunicationService = RealtimeCommunicationService;
