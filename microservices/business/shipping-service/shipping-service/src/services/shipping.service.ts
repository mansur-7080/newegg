import { EventEmitter } from 'events';
import axios from 'axios';
import { createError, logger } from '@ultramarket/shared';

export interface ShippingProvider {
  id: string;
  name: string;
  code: string;
  apiUrl: string;
  apiKey: string;
  supportedServices: ShippingService[];
  settings: {
    defaultService: string;
    trackingEnabled: boolean;
    insuranceEnabled: boolean;
    signatureRequired: boolean;
  };
  regions: string[];
  status: 'active' | 'inactive' | 'testing';
}

export interface ShippingService {
  id: string;
  providerId: string;
  name: string;
  code: string;
  description: string;
  maxWeight: number;
  maxDimensions: {
    length: number;
    width: number;
    height: number;
  };
  deliveryTime: {
    min: number;
    max: number;
    unit: 'hours' | 'days';
  };
  features: {
    tracking: boolean;
    insurance: boolean;
    signature: boolean;
    cashOnDelivery: boolean;
  };
  pricing: {
    baseRate: number;
    weightRate: number;
    dimensionRate: number;
    fuelSurcharge: number;
  };
}

export interface ShippingAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone?: string;
  email?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Package {
  id: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  value: number;
  contents: Array<{
    description: string;
    quantity: number;
    value: number;
    weight: number;
    hsCode?: string;
  }>;
  fragile: boolean;
  hazardous: boolean;
}

export interface ShippingRate {
  providerId: string;
  serviceId: string;
  serviceName: string;
  cost: number;
  currency: string;
  deliveryTime: {
    min: number;
    max: number;
    unit: 'hours' | 'days';
  };
  features: {
    tracking: boolean;
    insurance: boolean;
    signature: boolean;
  };
  taxes: number;
  fees: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
  totalCost: number;
}

export interface Shipment {
  id: string;
  orderId: string;
  trackingNumber: string;
  providerId: string;
  serviceId: string;
  status:
    | 'created'
    | 'booked'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'exception'
    | 'returned';
  fromAddress: ShippingAddress;
  toAddress: ShippingAddress;
  packages: Package[];
  cost: number;
  currency: string;
  label: {
    url: string;
    format: 'pdf' | 'png' | 'zpl';
  };
  tracking: {
    events: TrackingEvent[];
    estimatedDelivery?: Date;
    actualDelivery?: Date;
  };
  insurance?: {
    value: number;
    cost: number;
  };
  customs?: {
    contentType: 'merchandise' | 'documents' | 'gift' | 'sample';
    contentDescription: string;
    declarationStatement: string;
    invoiceNumber?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  description: string;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  details?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  providerId: string;
  regions: Array<{
    country: string;
    states?: string[];
    zipCodes?: string[];
  }>;
  rates: Array<{
    serviceId: string;
    baseRate: number;
    weightRate: number;
    freeShippingThreshold?: number;
  }>;
  deliveryTime: {
    min: number;
    max: number;
    unit: 'hours' | 'days';
  };
  restrictions: {
    maxWeight?: number;
    maxValue?: number;
    hazardousMaterials: boolean;
    fragileItems: boolean;
  };
}

export class ShippingService extends EventEmitter {
  private providers: Map<string, ShippingProvider> = new Map();
  private zones: Map<string, DeliveryZone> = new Map();

  constructor() {
    super();
    this.initializeProviders();
  }

  /**
   * Get shipping rates for a shipment
   */
  async getRates(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: Package[],
    serviceFilters?: {
      providers?: string[];
      maxCost?: number;
      maxDeliveryTime?: number;
      features?: string[];
    }
  ): Promise<ShippingRate[]> {
    try {
      const rates: ShippingRate[] = [];

      // Get rates from all available providers
      for (const [providerId, provider] of this.providers) {
        if (provider.status !== 'active') continue;
        if (serviceFilters?.providers && !serviceFilters.providers.includes(providerId)) continue;

        try {
          const providerRates = await this.getProviderRates(
            provider,
            fromAddress,
            toAddress,
            packages
          );
          rates.push(...providerRates);
        } catch (error) {
          logger.warn('Provider rate fetch failed', { providerId, error });
          continue;
        }
      }

      // Apply filters
      let filteredRates = rates;

      if (serviceFilters?.maxCost) {
        filteredRates = filteredRates.filter((rate) => rate.totalCost <= serviceFilters.maxCost!);
      }

      if (serviceFilters?.maxDeliveryTime) {
        filteredRates = filteredRates.filter(
          (rate) => rate.deliveryTime.max <= serviceFilters.maxDeliveryTime!
        );
      }

      if (serviceFilters?.features) {
        filteredRates = filteredRates.filter((rate) =>
          serviceFilters.features!.every(
            (feature) => rate.features[feature as keyof typeof rate.features]
          )
        );
      }

      // Sort by cost (ascending)
      filteredRates.sort((a, b) => a.totalCost - b.totalCost);

      logger.info('Shipping rates calculated', {
        fromCountry: fromAddress.country,
        toCountry: toAddress.country,
        packagesCount: packages.length,
        ratesCount: filteredRates.length,
      });

      return filteredRates;
    } catch (error) {
      logger.error('Get shipping rates failed', { fromAddress, toAddress, error });
      throw createError(500, 'Failed to calculate shipping rates');
    }
  }

  /**
   * Create a shipment
   */
  async createShipment(
    orderId: string,
    providerId: string,
    serviceId: string,
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: Package[],
    options?: {
      insurance?: { value: number };
      signature?: boolean;
      saturdayDelivery?: boolean;
      customs?: any;
    }
  ): Promise<Shipment> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw createError(404, 'Shipping provider not found');
      }

      const service = provider.supportedServices.find((s) => s.id === serviceId);
      if (!service) {
        throw createError(404, 'Shipping service not found');
      }

      // Validate packages
      this.validatePackages(packages, service);

      // Create shipment with provider
      const shipmentData = await this.createProviderShipment(
        provider,
        service,
        fromAddress,
        toAddress,
        packages,
        options
      );

      const shipment: Shipment = {
        id: shipmentData.id,
        orderId,
        trackingNumber: shipmentData.trackingNumber,
        providerId,
        serviceId,
        status: 'created',
        fromAddress,
        toAddress,
        packages,
        cost: shipmentData.cost,
        currency: shipmentData.currency,
        label: shipmentData.label,
        tracking: {
          events: [],
          estimatedDelivery: shipmentData.estimatedDelivery,
        },
        insurance: options?.insurance
          ? {
              value: options.insurance.value,
              cost: shipmentData.insuranceCost || 0,
            }
          : undefined,
        customs: options?.customs,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store shipment (in real implementation, this would be saved to database)
      // await this.saveShipment(shipment);

      this.emit('shipmentCreated', shipment);

      logger.info('Shipment created successfully', {
        shipmentId: shipment.id,
        orderId,
        trackingNumber: shipment.trackingNumber,
        providerId,
        serviceId,
      });

      return shipment;
    } catch (error) {
      logger.error('Create shipment failed', { orderId, providerId, serviceId, error });
      throw error;
    }
  }

  /**
   * Track a shipment
   */
  async trackShipment(trackingNumber: string, providerId?: string): Promise<TrackingEvent[]> {
    try {
      let events: TrackingEvent[] = [];

      if (providerId) {
        const provider = this.providers.get(providerId);
        if (!provider) {
          throw createError(404, 'Shipping provider not found');
        }

        events = await this.getProviderTracking(provider, trackingNumber);
      } else {
        // Try all providers
        for (const [id, provider] of this.providers) {
          if (provider.status !== 'active') continue;

          try {
            events = await this.getProviderTracking(provider, trackingNumber);
            if (events.length > 0) break;
          } catch (error) {
            continue; // Try next provider
          }
        }
      }

      if (events.length === 0) {
        throw createError(404, 'Tracking information not found');
      }

      // Sort events by timestamp (newest first)
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      logger.info('Shipment tracked successfully', {
        trackingNumber,
        providerId,
        eventsCount: events.length,
      });

      return events;
    } catch (error) {
      logger.error('Track shipment failed', { trackingNumber, providerId, error });
      throw error;
    }
  }

  /**
   * Cancel a shipment
   */
  async cancelShipment(shipmentId: string): Promise<void> {
    try {
      // In real implementation, get shipment from database
      // const shipment = await this.getShipment(shipmentId);

      // For now, create a mock shipment
      const shipment = this.getMockShipment(shipmentId);

      const provider = this.providers.get(shipment.providerId);
      if (!provider) {
        throw createError(404, 'Shipping provider not found');
      }

      // Cancel with provider
      await this.cancelProviderShipment(provider, shipment.trackingNumber);

      // Update shipment status
      shipment.status = 'returned';
      shipment.updatedAt = new Date();

      // Save updated shipment
      // await this.updateShipment(shipment);

      this.emit('shipmentCancelled', shipment);

      logger.info('Shipment cancelled successfully', {
        shipmentId,
        trackingNumber: shipment.trackingNumber,
      });
    } catch (error) {
      logger.error('Cancel shipment failed', { shipmentId, error });
      throw error;
    }
  }

  /**
   * Get delivery zones
   */
  getDeliveryZones(country?: string): DeliveryZone[] {
    const zones = Array.from(this.zones.values());

    if (country) {
      return zones.filter((zone) => zone.regions.some((region) => region.country === country));
    }

    return zones;
  }

  /**
   * Calculate delivery estimate
   */
  async getDeliveryEstimate(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    serviceId: string
  ): Promise<{
    estimatedDelivery: Date;
    businessDays: number;
    transitTime: string;
  }> {
    try {
      // Find applicable zone
      const zone = this.findDeliveryZone(toAddress);
      if (!zone) {
        throw createError(404, 'Delivery zone not found');
      }

      // Calculate business days (excluding weekends and holidays)
      const businessDays = zone.deliveryTime.max;
      const estimatedDelivery = this.calculateBusinessDays(new Date(), businessDays);

      const transitTime =
        zone.deliveryTime.unit === 'hours'
          ? `${zone.deliveryTime.min}-${zone.deliveryTime.max} hours`
          : `${zone.deliveryTime.min}-${zone.deliveryTime.max} business days`;

      return {
        estimatedDelivery,
        businessDays,
        transitTime,
      };
    } catch (error) {
      logger.error('Delivery estimate failed', { fromAddress, toAddress, serviceId, error });
      throw error;
    }
  }

  /**
   * Validate shipping address
   */
  async validateAddress(address: ShippingAddress): Promise<{
    valid: boolean;
    suggestions?: ShippingAddress[];
    errors?: string[];
  }> {
    try {
      const errors: string[] = [];

      // Basic validation
      if (!address.name) errors.push('Name is required');
      if (!address.street1) errors.push('Street address is required');
      if (!address.city) errors.push('City is required');
      if (!address.state) errors.push('State/Province is required');
      if (!address.country) errors.push('Country is required');
      if (!address.zipCode) errors.push('ZIP/Postal code is required');

      // Country-specific validation
      if (address.country === 'US') {
        if (!/^\d{5}(-\d{4})?$/.test(address.zipCode)) {
          errors.push('Invalid US ZIP code format');
        }
      }

      // In real implementation, use address validation API
      const suggestions: ShippingAddress[] = [];

      return {
        valid: errors.length === 0,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error('Address validation failed', { address, error });
      throw createError(500, 'Address validation failed');
    }
  }

  /**
   * Private helper methods
   */
  private async getProviderRates(
    provider: ShippingProvider,
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: Package[]
  ): Promise<ShippingRate[]> {
    // Mock implementation - in reality, call provider APIs
    const rates: ShippingRate[] = [];

    for (const service of provider.supportedServices) {
      const weight = packages.reduce((total, pkg) => total + pkg.weight, 0);
      const baseCost = service.pricing.baseRate + weight * service.pricing.weightRate;
      const taxes = baseCost * 0.1; // 10% tax
      const totalCost = baseCost + taxes;

      rates.push({
        providerId: provider.id,
        serviceId: service.id,
        serviceName: service.name,
        cost: baseCost,
        currency: 'USD',
        deliveryTime: service.deliveryTime,
        features: service.features,
        taxes,
        fees: [
          {
            type: 'fuel_surcharge',
            amount: service.pricing.fuelSurcharge,
            description: 'Fuel surcharge',
          },
        ],
        totalCost,
      });
    }

    return rates;
  }

  private async createProviderShipment(
    provider: ShippingProvider,
    service: ShippingService,
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    packages: Package[],
    options?: any
  ): Promise<any> {
    // Mock implementation - in reality, call provider API
    return {
      id: `SHIP-${Date.now()}`,
      trackingNumber: `${provider.code}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      cost: 15.99,
      currency: 'USD',
      estimatedDelivery: new Date(Date.now() + service.deliveryTime.max * 24 * 60 * 60 * 1000),
      label: {
        url: 'https://example.com/label.pdf',
        format: 'pdf' as const,
      },
      insuranceCost: options?.insurance?.value ? options.insurance.value * 0.01 : 0,
    };
  }

  private async getProviderTracking(
    provider: ShippingProvider,
    trackingNumber: string
  ): Promise<TrackingEvent[]> {
    // Mock implementation - in reality, call provider tracking API
    return [
      {
        timestamp: new Date(),
        status: 'in_transit',
        description: 'Package is in transit',
        location: {
          city: 'Los Angeles',
          state: 'CA',
          country: 'US',
        },
      },
      {
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'shipped',
        description: 'Package has been shipped',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      },
    ];
  }

  private async cancelProviderShipment(
    provider: ShippingProvider,
    trackingNumber: string
  ): Promise<void> {
    // Mock implementation - in reality, call provider cancellation API
    logger.info('Cancellation request sent to provider', {
      providerId: provider.id,
      trackingNumber,
    });
  }

  private validatePackages(packages: Package[], service: ShippingService): void {
    for (const pkg of packages) {
      if (pkg.weight > service.maxWeight) {
        throw createError(
          400,
          `Package weight exceeds service limit: ${pkg.weight} > ${service.maxWeight}`
        );
      }

      const { length, width, height } = pkg.dimensions;
      const maxDim = service.maxDimensions;

      if (length > maxDim.length || width > maxDim.width || height > maxDim.height) {
        throw createError(400, 'Package dimensions exceed service limits');
      }
    }
  }

  private findDeliveryZone(address: ShippingAddress): DeliveryZone | undefined {
    for (const zone of this.zones.values()) {
      for (const region of zone.regions) {
        if (region.country === address.country) {
          if (!region.states || region.states.includes(address.state)) {
            return zone;
          }
        }
      }
    }
    return undefined;
  }

  private calculateBusinessDays(startDate: Date, businessDays: number): Date {
    const result = new Date(startDate);
    let addedDays = 0;

    while (addedDays < businessDays) {
      result.setDate(result.getDate() + 1);

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        addedDays++;
      }
    }

    return result;
  }

  private getMockShipment(shipmentId: string): Shipment {
    // Mock implementation - in reality, fetch from database
    return {
      id: shipmentId,
      orderId: 'ORDER-123',
      trackingNumber: 'TRACK-123',
      providerId: 'ups',
      serviceId: 'ups-ground',
      status: 'in_transit',
      fromAddress: {
        name: 'Warehouse',
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        zipCode: '94102',
      },
      toAddress: {
        name: 'John Doe',
        street1: '456 Oak St',
        city: 'Los Angeles',
        state: 'CA',
        country: 'US',
        zipCode: '90210',
      },
      packages: [
        {
          id: 'PKG-1',
          weight: 2.5,
          dimensions: { length: 10, width: 8, height: 6 },
          value: 99.99,
          contents: [
            {
              description: 'Electronics',
              quantity: 1,
              value: 99.99,
              weight: 2.5,
            },
          ],
          fragile: false,
          hazardous: false,
        },
      ],
      cost: 15.99,
      currency: 'USD',
      label: {
        url: 'https://example.com/label.pdf',
        format: 'pdf',
      },
      tracking: {
        events: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private initializeProviders(): void {
    // Initialize shipping providers
    const upsProvider: ShippingProvider = {
      id: 'ups',
      name: 'UPS',
      code: '1Z',
      apiUrl: 'https://api.ups.com',
      apiKey: process.env.UPS_API_KEY || '',
      supportedServices: [
        {
          id: 'ups-ground',
          providerId: 'ups',
          name: 'UPS Ground',
          code: '03',
          description: 'Economy ground delivery',
          maxWeight: 150,
          maxDimensions: { length: 48, width: 48, height: 48 },
          deliveryTime: { min: 1, max: 5, unit: 'days' },
          features: { tracking: true, insurance: true, signature: false, cashOnDelivery: false },
          pricing: { baseRate: 8.99, weightRate: 1.2, dimensionRate: 0.1, fuelSurcharge: 2.5 },
        },
      ],
      settings: {
        defaultService: 'ups-ground',
        trackingEnabled: true,
        insuranceEnabled: true,
        signatureRequired: false,
      },
      regions: ['US', 'CA'],
      status: 'active',
    };

    this.providers.set('ups', upsProvider);

    // Initialize delivery zones
    const usZone: DeliveryZone = {
      id: 'us-domestic',
      name: 'US Domestic',
      providerId: 'ups',
      regions: [{ country: 'US' }],
      rates: [
        {
          serviceId: 'ups-ground',
          baseRate: 8.99,
          weightRate: 1.2,
          freeShippingThreshold: 50,
        },
      ],
      deliveryTime: { min: 1, max: 5, unit: 'days' },
      restrictions: {
        maxWeight: 150,
        maxValue: 10000,
        hazardousMaterials: false,
        fragileItems: true,
      },
    };

    this.zones.set('us-domestic', usZone);
  }
}

export const shippingService = new ShippingService();
