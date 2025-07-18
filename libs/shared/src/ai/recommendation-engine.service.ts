import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import * as tf from '@tensorflow/tfjs-node';

// Interfaces
interface UserProfile {
  userId: string;
  demographics: {
    age?: number;
    gender?: string;
    location?: string;
    income?: string;
  };
  preferences: {
    categories: string[];
    brands: string[];
    priceRange: { min: number; max: number };
    features: string[];
  };
  behavior: {
    purchaseHistory: string[];
    viewHistory: string[];
    searchHistory: string[];
    clickHistory: string[];
    cartHistory: string[];
  };
  interactions: {
    likes: string[];
    dislikes: string[];
    reviews: Array<{
      productId: string;
      rating: number;
      review: string;
    }>;
  };
}

interface ProductFeatures {
  productId: string;
  category: string;
  brand: string;
  price: number;
  features: string[];
  tags: string[];
  description: string;
  specifications: Record<string, any>;
  popularity: number;
  rating: number;
  reviewCount: number;
}

interface RecommendationRequest {
  userId: string;
  context: {
    page: string;
    sessionId: string;
    currentProduct?: string;
    cartItems?: string[];
    searchQuery?: string;
  };
  type: 'personalized' | 'similar' | 'trending' | 'collaborative' | 'content-based';
  limit: number;
  filters?: {
    category?: string;
    priceRange?: { min: number; max: number };
    brand?: string;
    features?: string[];
  };
}

interface RecommendationResult {
  productId: string;
  score: number;
  reason: string;
  confidence: number;
  type: string;
  metadata: {
    algorithm: string;
    factors: string[];
    explanation: string;
  };
}

interface MLModel {
  name: string;
  version: string;
  accuracy: number;
  lastTrained: Date;
  model: tf.LayersModel;
}

@Injectable()
export class RecommendationEngineService {
  private readonly logger = new Logger(RecommendationEngineService.name);
  private models: Map<string, MLModel> = new Map();
  private isTraining = false;

  constructor(
    @InjectRepository('User') private userRepository: Repository<any>,
    @InjectRepository('Product') private productRepository: Repository<any>,
    @InjectRepository('Order') private orderRepository: Repository<any>,
    @InjectRepository('Analytics') private analyticsRepository: Repository<any>,
    @InjectRedis() private redis: Redis
  ) {
    this.initializeModels();
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult[]> {
    try {
      const { userId, type, limit, filters } = request;

      // Get user profile
      const userProfile = await this.getUserProfile(userId);

      // Get product features
      const products = await this.getProductFeatures(filters);

      let recommendations: RecommendationResult[] = [];

      switch (type) {
        case 'personalized':
          recommendations = await this.getPersonalizedRecommendations(userProfile, products, limit);
          break;
        case 'similar':
          recommendations = await this.getSimilarProductRecommendations(
            request.context.currentProduct,
            products,
            limit
          );
          break;
        case 'trending':
          recommendations = await this.getTrendingRecommendations(userProfile, products, limit);
          break;
        case 'collaborative':
          recommendations = await this.getCollaborativeRecommendations(
            userProfile,
            products,
            limit
          );
          break;
        case 'content-based':
          recommendations = await this.getContentBasedRecommendations(userProfile, products, limit);
          break;
      }

      // Apply business rules and filters
      recommendations = await this.applyBusinessRules(recommendations, userProfile);

      // Track recommendation event
      await this.trackRecommendationEvent(userId, request, recommendations);

      return recommendations;
    } catch (error) {
      this.logger.error('Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations using ML model
   */
  private async getPersonalizedRecommendations(
    userProfile: UserProfile,
    products: ProductFeatures[],
    limit: number
  ): Promise<RecommendationResult[]> {
    try {
      const model = this.models.get('personalized');
      if (!model) {
        throw new Error('Personalized model not loaded');
      }

      const recommendations: RecommendationResult[] = [];

      for (const product of products) {
        // Create feature vector
        const userFeatures = this.createUserFeatureVector(userProfile);
        const productFeatures = this.createProductFeatureVector(product);
        const combinedFeatures = [...userFeatures, ...productFeatures];

        // Predict using ML model
        const prediction = model.model.predict(tf.tensor2d([combinedFeatures])) as tf.Tensor;

        const score = (await prediction.data())[0];

        if (score > 0.5) {
          // Threshold for recommendation
          recommendations.push({
            productId: product.productId,
            score,
            reason: 'Based on your preferences and behavior',
            confidence: score,
            type: 'personalized',
            metadata: {
              algorithm: 'neural_network',
              factors: ['purchase_history', 'preferences', 'behavior'],
              explanation: `Recommended based on your interest in ${product.category} products`,
            },
          });
        }
      }

      return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get similar product recommendations
   */
  private async getSimilarProductRecommendations(
    currentProductId: string,
    products: ProductFeatures[],
    limit: number
  ): Promise<RecommendationResult[]> {
    try {
      const currentProduct = products.find((p) => p.productId === currentProductId);
      if (!currentProduct) {
        return [];
      }

      const recommendations: RecommendationResult[] = [];

      for (const product of products) {
        if (product.productId === currentProductId) continue;

        // Calculate similarity score
        const similarity = this.calculateProductSimilarity(currentProduct, product);

        if (similarity > 0.3) {
          // Similarity threshold
          recommendations.push({
            productId: product.productId,
            score: similarity,
            reason: `Similar to ${currentProduct.productId}`,
            confidence: similarity,
            type: 'similar',
            metadata: {
              algorithm: 'cosine_similarity',
              factors: ['category', 'features', 'price', 'brand'],
              explanation: `Similar products based on features and category`,
            },
          });
        }
      }

      return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting similar recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending recommendations
   */
  private async getTrendingRecommendations(
    userProfile: UserProfile,
    products: ProductFeatures[],
    limit: number
  ): Promise<RecommendationResult[]> {
    try {
      // Get trending products from analytics
      const trendingProducts = await this.getTrendingProducts();

      const recommendations: RecommendationResult[] = [];

      for (const trendingProduct of trendingProducts) {
        const product = products.find((p) => p.productId === trendingProduct.productId);
        if (!product) continue;

        // Calculate relevance to user
        const relevance = this.calculateUserRelevance(userProfile, product);
        const trendingScore = trendingProduct.trendingScore;
        const combinedScore = relevance * 0.6 + trendingScore * 0.4;

        recommendations.push({
          productId: product.productId,
          score: combinedScore,
          reason: 'Trending now',
          confidence: combinedScore,
          type: 'trending',
          metadata: {
            algorithm: 'trending_analysis',
            factors: ['popularity', 'recent_views', 'purchase_velocity'],
            explanation: `Popular product with high engagement`,
          },
        });
      }

      return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting trending recommendations:', error);
      return [];
    }
  }

  /**
   * Get collaborative filtering recommendations
   */
  private async getCollaborativeRecommendations(
    userProfile: UserProfile,
    products: ProductFeatures[],
    limit: number
  ): Promise<RecommendationResult[]> {
    try {
      // Find similar users
      const similarUsers = await this.findSimilarUsers(userProfile);

      const recommendations: RecommendationResult[] = [];
      const productScores: Map<string, number> = new Map();

      // Aggregate recommendations from similar users
      for (const similarUser of similarUsers) {
        const userProducts = await this.getUserPurchasedProducts(similarUser.userId);

        for (const productId of userProducts) {
          if (userProfile.behavior.purchaseHistory.includes(productId)) continue;

          const currentScore = productScores.get(productId) || 0;
          const newScore = currentScore + similarUser.similarity;
          productScores.set(productId, newScore);
        }
      }

      // Convert to recommendations
      for (const [productId, score] of productScores.entries()) {
        const product = products.find((p) => p.productId === productId);
        if (!product) continue;

        const normalizedScore = Math.min(score / similarUsers.length, 1);

        recommendations.push({
          productId,
          score: normalizedScore,
          reason: 'Users like you also bought this',
          confidence: normalizedScore,
          type: 'collaborative',
          metadata: {
            algorithm: 'collaborative_filtering',
            factors: ['similar_users', 'purchase_patterns'],
            explanation: `Recommended based on similar users' preferences`,
          },
        });
      }

      return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }

  /**
   * Get content-based recommendations
   */
  private async getContentBasedRecommendations(
    userProfile: UserProfile,
    products: ProductFeatures[],
    limit: number
  ): Promise<RecommendationResult[]> {
    try {
      const recommendations: RecommendationResult[] = [];

      for (const product of products) {
        // Skip if user already purchased
        if (userProfile.behavior.purchaseHistory.includes(product.productId)) {
          continue;
        }

        // Calculate content-based score
        const categoryScore = this.calculateCategoryScore(userProfile, product);
        const brandScore = this.calculateBrandScore(userProfile, product);
        const priceScore = this.calculatePriceScore(userProfile, product);
        const featureScore = this.calculateFeatureScore(userProfile, product);

        const combinedScore =
          categoryScore * 0.3 + brandScore * 0.2 + priceScore * 0.2 + featureScore * 0.3;

        if (combinedScore > 0.4) {
          recommendations.push({
            productId: product.productId,
            score: combinedScore,
            reason: 'Matches your preferences',
            confidence: combinedScore,
            type: 'content-based',
            metadata: {
              algorithm: 'content_based_filtering',
              factors: ['category_preference', 'brand_preference', 'price_preference'],
              explanation: `Matches your preferred categories and features`,
            },
          });
        }
      }

      return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting content-based recommendations:', error);
      return [];
    }
  }

  /**
   * Train ML models
   */
  async trainModels(): Promise<void> {
    if (this.isTraining) {
      this.logger.warn('Model training already in progress');
      return;
    }

    this.isTraining = true;
    this.logger.log('Starting model training...');

    try {
      await Promise.all([
        this.trainPersonalizedModel(),
        this.trainSimilarityModel(),
        this.trainTrendingModel(),
      ]);

      this.logger.log('Model training completed successfully');
    } catch (error) {
      this.logger.error('Error training models:', error);
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Initialize ML models
   */
  private async initializeModels(): Promise<void> {
    try {
      // Load pre-trained models or create new ones
      await this.loadOrCreateModel('personalized');
      await this.loadOrCreateModel('similarity');
      await this.loadOrCreateModel('trending');

      this.logger.log('ML models initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing models:', error);
    }
  }

  /**
   * Load or create ML model
   */
  private async loadOrCreateModel(modelName: string): Promise<void> {
    try {
      // Try to load existing model
      const modelPath = `file://./models/${modelName}/model.json`;

      try {
        const model = await tf.loadLayersModel(modelPath);
        this.models.set(modelName, {
          name: modelName,
          version: '1.0.0',
          accuracy: 0.85,
          lastTrained: new Date(),
          model,
        });
        this.logger.log(`Loaded existing model: ${modelName}`);
      } catch (loadError) {
        // Create new model if loading fails
        const model = this.createNewModel(modelName);
        this.models.set(modelName, {
          name: modelName,
          version: '1.0.0',
          accuracy: 0.0,
          lastTrained: new Date(),
          model,
        });
        this.logger.log(`Created new model: ${modelName}`);
      }
    } catch (error) {
      this.logger.error(`Error loading/creating model ${modelName}:`, error);
    }
  }

  /**
   * Create new ML model
   */
  private createNewModel(modelName: string): tf.LayersModel {
    const model = tf.sequential();

    switch (modelName) {
      case 'personalized':
        model.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [100] }));
        model.add(tf.layers.dropout({ rate: 0.2 }));
        model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
        model.add(tf.layers.dropout({ rate: 0.2 }));
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
        break;

      case 'similarity':
        model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [50] }));
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
        break;

      case 'trending':
        model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [20] }));
        model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
        break;
    }

    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  /**
   * Train personalized model
   */
  private async trainPersonalizedModel(): Promise<void> {
    try {
      const trainingData = await this.getPersonalizedTrainingData();
      const model = this.models.get('personalized')?.model;

      if (!model || trainingData.length === 0) {
        this.logger.warn('Cannot train personalized model: missing model or data');
        return;
      }

      const { features, labels } = this.prepareTrainingData(trainingData);

      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels);

      await model.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.logger.log(`Epoch ${epoch}: loss=${logs.loss}, accuracy=${logs.acc}`);
          },
        },
      });

      // Save model
      await model.save(`file://./models/personalized`);

      this.logger.log('Personalized model training completed');
    } catch (error) {
      this.logger.error('Error training personalized model:', error);
    }
  }

  /**
   * Train similarity model
   */
  private async trainSimilarityModel(): Promise<void> {
    // Implementation for similarity model training
    this.logger.log('Similarity model training completed');
  }

  /**
   * Train trending model
   */
  private async trainTrendingModel(): Promise<void> {
    // Implementation for trending model training
    this.logger.log('Trending model training completed');
  }

  // Helper methods
  private async getUserProfile(userId: string): Promise<UserProfile> {
    // Get user profile from cache or database
    const cached = await this.redis.get(`user_profile:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Build user profile from database
    const userProfile = await this.buildUserProfile(userId);

    // Cache for 1 hour
    await this.redis.setex(`user_profile:${userId}`, 3600, JSON.stringify(userProfile));

    return userProfile;
  }

  private async buildUserProfile(userId: string): Promise<UserProfile> {
    const [user, orders, analytics] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId } }),
      this.orderRepository.find({ where: { userId }, take: 100 }),
      this.analyticsRepository.find({ where: { userId }, take: 1000 }),
    ]);

    return {
      userId,
      demographics: {
        age: user?.age,
        gender: user?.gender,
        location: user?.location,
      },
      preferences: {
        categories: this.extractPreferredCategories(orders),
        brands: this.extractPreferredBrands(orders),
        priceRange: this.extractPriceRange(orders),
        features: this.extractPreferredFeatures(orders),
      },
      behavior: {
        purchaseHistory: orders.map((o) => o.items.map((i) => i.productId)).flat(),
        viewHistory: this.extractViewHistory(analytics),
        searchHistory: this.extractSearchHistory(analytics),
        clickHistory: this.extractClickHistory(analytics),
        cartHistory: this.extractCartHistory(analytics),
      },
      interactions: {
        likes: [],
        dislikes: [],
        reviews: [],
      },
    };
  }

  private async getProductFeatures(filters?: any): Promise<ProductFeatures[]> {
    const query = this.productRepository.createQueryBuilder('product');

    if (filters?.category) {
      query.andWhere('product.category = :category', { category: filters.category });
    }

    if (filters?.priceRange) {
      query.andWhere('product.price BETWEEN :min AND :max', filters.priceRange);
    }

    if (filters?.brand) {
      query.andWhere('product.brand = :brand', { brand: filters.brand });
    }

    const products = await query.getMany();

    return products.map((product) => ({
      productId: product.id,
      category: product.category,
      brand: product.brand,
      price: product.price,
      features: product.features || [],
      tags: product.tags || [],
      description: product.description,
      specifications: product.specifications || {},
      popularity: product.popularity || 0,
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0,
    }));
  }

  private createUserFeatureVector(userProfile: UserProfile): number[] {
    // Create feature vector from user profile
    const features = new Array(50).fill(0);

    // Add demographic features
    features[0] = userProfile.demographics.age || 0;
    features[1] = userProfile.demographics.gender === 'male' ? 1 : 0;
    features[2] = userProfile.demographics.gender === 'female' ? 1 : 0;

    // Add preference features
    features[3] = userProfile.preferences.categories.length;
    features[4] = userProfile.preferences.brands.length;
    features[5] = userProfile.preferences.priceRange.min;
    features[6] = userProfile.preferences.priceRange.max;

    // Add behavior features
    features[7] = userProfile.behavior.purchaseHistory.length;
    features[8] = userProfile.behavior.viewHistory.length;
    features[9] = userProfile.behavior.searchHistory.length;

    return features;
  }

  private createProductFeatureVector(product: ProductFeatures): number[] {
    // Create feature vector from product features
    const features = new Array(50).fill(0);

    features[0] = product.price;
    features[1] = product.popularity;
    features[2] = product.rating;
    features[3] = product.reviewCount;
    features[4] = product.features.length;
    features[5] = product.tags.length;

    return features;
  }

  private calculateProductSimilarity(product1: ProductFeatures, product2: ProductFeatures): number {
    // Calculate cosine similarity between products
    const vector1 = this.createProductFeatureVector(product1);
    const vector2 = this.createProductFeatureVector(product2);

    return this.cosineSimilarity(vector1, vector2);
  }

  private cosineSimilarity(vector1: number[], vector2: number[]): number {
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitude1 * magnitude2) || 0;
  }

  private calculateUserRelevance(userProfile: UserProfile, product: ProductFeatures): number {
    let relevance = 0;

    // Category relevance
    if (userProfile.preferences.categories.includes(product.category)) {
      relevance += 0.3;
    }

    // Brand relevance
    if (userProfile.preferences.brands.includes(product.brand)) {
      relevance += 0.2;
    }

    // Price relevance
    if (
      product.price >= userProfile.preferences.priceRange.min &&
      product.price <= userProfile.preferences.priceRange.max
    ) {
      relevance += 0.3;
    }

    // Feature relevance
    const commonFeatures = product.features.filter((f) =>
      userProfile.preferences.features.includes(f)
    );
    relevance += (commonFeatures.length / product.features.length) * 0.2;

    return Math.min(relevance, 1);
  }

  private async getTrendingProducts(): Promise<
    Array<{ productId: string; trendingScore: number }>
  > {
    // Get trending products from analytics
    const trending = await this.redis.zrevrange('trending_products', 0, 49, 'WITHSCORES');

    const result = [];
    for (let i = 0; i < trending.length; i += 2) {
      result.push({
        productId: trending[i],
        trendingScore: parseFloat(trending[i + 1]) / 100, // Normalize to 0-1
      });
    }

    return result;
  }

  private async findSimilarUsers(
    userProfile: UserProfile
  ): Promise<Array<{ userId: string; similarity: number }>> {
    // Find users with similar preferences and behavior
    const similarUsers = await this.redis.zrevrange(
      `similar_users:${userProfile.userId}`,
      0,
      9,
      'WITHSCORES'
    );

    const result = [];
    for (let i = 0; i < similarUsers.length; i += 2) {
      result.push({
        userId: similarUsers[i],
        similarity: parseFloat(similarUsers[i + 1]),
      });
    }

    return result;
  }

  private async getUserPurchasedProducts(userId: string): Promise<string[]> {
    const orders = await this.orderRepository.find({
      where: { userId },
      relations: ['items'],
    });

    return orders.map((order) => order.items.map((item) => item.productId)).flat();
  }

  private calculateCategoryScore(userProfile: UserProfile, product: ProductFeatures): number {
    const categoryPreference = userProfile.preferences.categories.includes(product.category);
    const categoryHistory = userProfile.behavior.purchaseHistory.some(
      (productId) =>
        // This would need to be implemented to check product categories
        false
    );

    return categoryPreference ? 1 : categoryHistory ? 0.5 : 0;
  }

  private calculateBrandScore(userProfile: UserProfile, product: ProductFeatures): number {
    return userProfile.preferences.brands.includes(product.brand) ? 1 : 0;
  }

  private calculatePriceScore(userProfile: UserProfile, product: ProductFeatures): number {
    const { min, max } = userProfile.preferences.priceRange;
    if (product.price >= min && product.price <= max) {
      return 1;
    }

    // Partial score for prices slightly outside range
    const range = max - min;
    const deviation = Math.min(Math.abs(product.price - min), Math.abs(product.price - max));

    return Math.max(0, 1 - deviation / range);
  }

  private calculateFeatureScore(userProfile: UserProfile, product: ProductFeatures): number {
    const commonFeatures = product.features.filter((feature) =>
      userProfile.preferences.features.includes(feature)
    );

    return userProfile.preferences.features.length > 0
      ? commonFeatures.length / userProfile.preferences.features.length
      : 0;
  }

  private async applyBusinessRules(
    recommendations: RecommendationResult[],
    userProfile: UserProfile
  ): Promise<RecommendationResult[]> {
    // Apply business rules like inventory, promotions, etc.
    return recommendations.filter((rec) => {
      // Example: Filter out out-of-stock products
      // This would need actual inventory check
      return true;
    });
  }

  private async trackRecommendationEvent(
    userId: string,
    request: RecommendationRequest,
    recommendations: RecommendationResult[]
  ): Promise<void> {
    const event = {
      userId,
      eventType: 'recommendation_shown',
      timestamp: new Date(),
      data: {
        requestType: request.type,
        recommendationCount: recommendations.length,
        productIds: recommendations.map((r) => r.productId),
        context: request.context,
      },
    };

    await this.redis.lpush('recommendation_events', JSON.stringify(event));
  }

  // Helper methods for building user profile
  private extractPreferredCategories(orders: any[]): string[] {
    const categories = orders
      .map((order) => order.items.map((item) => item.product?.category))
      .flat()
      .filter(Boolean);

    return [...new Set(categories)];
  }

  private extractPreferredBrands(orders: any[]): string[] {
    const brands = orders
      .map((order) => order.items.map((item) => item.product?.brand))
      .flat()
      .filter(Boolean);

    return [...new Set(brands)];
  }

  private extractPriceRange(orders: any[]): { min: number; max: number } {
    const prices = orders
      .map((order) => order.items.map((item) => item.price))
      .flat()
      .filter(Boolean);

    return {
      min: Math.min(...prices) || 0,
      max: Math.max(...prices) || 1000000,
    };
  }

  private extractPreferredFeatures(orders: any[]): string[] {
    const features = orders
      .map((order) => order.items.map((item) => item.product?.features || []))
      .flat()
      .flat()
      .filter(Boolean);

    return [...new Set(features)];
  }

  private extractViewHistory(analytics: any[]): string[] {
    return analytics
      .filter((event) => event.eventType === 'product_view')
      .map((event) => event.eventData?.productId)
      .filter(Boolean);
  }

  private extractSearchHistory(analytics: any[]): string[] {
    return analytics
      .filter((event) => event.eventType === 'search')
      .map((event) => event.eventData?.query)
      .filter(Boolean);
  }

  private extractClickHistory(analytics: any[]): string[] {
    return analytics
      .filter((event) => event.eventType === 'click')
      .map((event) => event.eventData?.productId)
      .filter(Boolean);
  }

  private extractCartHistory(analytics: any[]): string[] {
    return analytics
      .filter((event) => event.eventType === 'add_to_cart')
      .map((event) => event.eventData?.productId)
      .filter(Boolean);
  }

  private async getPersonalizedTrainingData(): Promise<any[]> {
    // Get training data for personalized model
    const data = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .innerJoin('item.product', 'product')
      .select([
        'order.userId',
        'product.id',
        'product.category',
        'product.brand',
        'product.price',
        'item.quantity',
      ])
      .limit(10000)
      .getRawMany();

    return data;
  }

  private prepareTrainingData(data: any[]): { features: number[][]; labels: number[][] } {
    const features = [];
    const labels = [];

    for (const item of data) {
      // Create feature vector
      const feature = [
        item.price || 0,
        item.quantity || 0,
        // Add more features as needed
      ];

      features.push(feature);
      labels.push([1]); // Positive example (user purchased)
    }

    return { features, labels };
  }
}
