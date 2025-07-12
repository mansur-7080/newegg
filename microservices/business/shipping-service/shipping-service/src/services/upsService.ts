import axios from 'axios';
import { logger } from '@ultramarket/common';

export interface UPSRateRequest {
  fromAddress: {
    name: string;
    street1: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  toAddress: {
    name: string;
    street1: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  packages: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
  }>;
}

export interface UPSRate {
  serviceCode: string;
  serviceName: string;
  cost: number;
  currency: string;
  deliveryTime: {
    min: number;
    max: number;
    unit: 'days';
  };
  guaranteed: boolean;
}

export interface UPSShipment {
  trackingNumber: string;
  labelUrl: string;
  cost: number;
  currency: string;
  estimatedDelivery: Date;
}

export class UPSService {
  private baseUrl: string;
  private accessKey: string;
  private username: string;
  private password: string;
  private accountNumber: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://onlinetools.ups.com'
      : 'https://wwwcie.ups.com';
    this.accessKey = process.env.UPS_ACCESS_KEY!;
    this.username = process.env.UPS_USERNAME!;
    this.password = process.env.UPS_PASSWORD!;
    this.accountNumber = process.env.UPS_ACCOUNT_NUMBER!;
  }

  async getRates(request: UPSRateRequest): Promise<UPSRate[]> {
    try {
      const rateRequest = this.buildRateRequest(request);
      
      const response = await axios.post(
        `${this.baseUrl}/rest/Rate`,
        rateRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAccessToken()}`
          }
        }
      );

      const rates: UPSRate[] = [];
      const rateResponse = response.data.RateResponse;

      if (rateResponse.RatedShipment) {
        const shipments = Array.isArray(rateResponse.RatedShipment) 
          ? rateResponse.RatedShipment 
          : [rateResponse.RatedShipment];

        for (const shipment of shipments) {
          const service = shipment.Service;
          const totalCharges = shipment.TotalCharges;
          const deliveryDate = shipment.GuaranteedDelivery;

          rates.push({
            serviceCode: service.Code,
            serviceName: service.Description,
            cost: parseFloat(totalCharges.MonetaryValue),
            currency: totalCharges.CurrencyCode,
            deliveryTime: {
              min: deliveryDate?.BusinessDaysInTransit || 1,
              max: deliveryDate?.BusinessDaysInTransit || 5,
              unit: 'days'
            },
            guaranteed: !!deliveryDate?.GuaranteedIndicator
          });
        }
      }

      logger.info('UPS rates retrieved', {
        count: rates.length,
        fromZip: request.fromAddress.zipCode,
        toZip: request.toAddress.zipCode
      });

      return rates;
    } catch (error) {
      logger.error('UPS rate request failed:', error);
      throw new Error('Failed to get UPS rates');
    }
  }

  async createShipment(
    request: UPSRateRequest,
    serviceCode: string
  ): Promise<UPSShipment> {
    try {
      const shipmentRequest = this.buildShipmentRequest(request, serviceCode);
      
      const response = await axios.post(
        `${this.baseUrl}/rest/Ship`,
        shipmentRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAccessToken()}`
          }
        }
      );

      const shipmentResponse = response.data.ShipmentResponse;
      const shipment = shipmentResponse.ShipmentResults.PackageResults;

      const result: UPSShipment = {
        trackingNumber: shipment.TrackingNumber,
        labelUrl: shipment.LabelImage.GraphicImage,
        cost: parseFloat(shipment.ShipmentCharges.TotalCharges.MonetaryValue),
        currency: shipment.ShipmentCharges.TotalCharges.CurrencyCode,
        estimatedDelivery: new Date(shipment.PackageServiceOptions.DeliveryDate)
      };

      logger.info('UPS shipment created', {
        trackingNumber: result.trackingNumber,
        serviceCode
      });

      return result;
    } catch (error) {
      logger.error('UPS shipment creation failed:', error);
      throw new Error('Failed to create UPS shipment');
    }
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/Track`,
        {
          params: {
            inquiryNumber: trackingNumber
          },
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken()}`
          }
        }
      );

      const trackResponse = response.data.TrackResponse;
      const shipment = trackResponse.shipment[0];

      return {
        trackingNumber: shipment.trackingNumber,
        status: shipment.currentStatus?.description,
        location: shipment.currentStatus?.location,
        events: shipment.activity?.map((event: any) => ({
          timestamp: new Date(event.date + ' ' + event.time),
          status: event.status?.description,
          location: event.location?.address?.city + ', ' + event.location?.address?.stateProvinceCode
        }))
      };
    } catch (error) {
      logger.error('UPS tracking failed:', error);
      throw new Error('Failed to track UPS shipment');
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/security/v1/oauth/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-merchant-id': this.username
          },
          auth: {
            username: this.accessKey,
            password: this.password
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      logger.error('UPS authentication failed:', error);
      throw new Error('Failed to authenticate with UPS');
    }
  }

  private buildRateRequest(request: UPSRateRequest): any {
    return {
      RateRequest: {
        Request: {
          RequestOption: "Shop",
          TransactionReference: {
            CustomerContext: "UltraMarket Rate Request"
          }
        },
        Shipment: {
          Shipper: {
            Name: request.fromAddress.name,
            Address: {
              AddressLine: [request.fromAddress.street1],
              City: request.fromAddress.city,
              StateProvinceCode: request.fromAddress.state,
              PostalCode: request.fromAddress.zipCode,
              CountryCode: request.fromAddress.country
            }
          },
          ShipTo: {
            Name: request.toAddress.name,
            Address: {
              AddressLine: [request.toAddress.street1],
              City: request.toAddress.city,
              StateProvinceCode: request.toAddress.state,
              PostalCode: request.toAddress.zipCode,
              CountryCode: request.toAddress.country
            }
          },
          ShipFrom: {
            Name: request.fromAddress.name,
            Address: {
              AddressLine: [request.fromAddress.street1],
              City: request.fromAddress.city,
              StateProvinceCode: request.fromAddress.state,
              PostalCode: request.fromAddress.zipCode,
              CountryCode: request.fromAddress.country
            }
          },
          Package: request.packages.map(pkg => ({
            PackagingType: {
              Code: "02",
              Description: "Package"
            },
            Dimensions: {
              UnitOfMeasurement: {
                Code: "IN"
              },
              Length: pkg.length.toString(),
              Width: pkg.width.toString(),
              Height: pkg.height.toString()
            },
            PackageWeight: {
              UnitOfMeasurement: {
                Code: "LBS"
              },
              Weight: pkg.weight.toString()
            }
          }))
        }
      }
    };
  }

  private buildShipmentRequest(request: UPSRateRequest, serviceCode: string): any {
    return {
      ShipmentRequest: {
        Request: {
          RequestOption: "nonvalidate",
          TransactionReference: {
            CustomerContext: "UltraMarket Shipment"
          }
        },
        Shipment: {
          Description: "UltraMarket Package",
          Shipper: {
            Name: request.fromAddress.name,
            AttentionName: request.fromAddress.name,
            Phone: {
              Number: "1234567890"
            },
            Address: {
              AddressLine: [request.fromAddress.street1],
              City: request.fromAddress.city,
              StateProvinceCode: request.fromAddress.state,
              PostalCode: request.fromAddress.zipCode,
              CountryCode: request.fromAddress.country
            }
          },
          ShipTo: {
            Name: request.toAddress.name,
            AttentionName: request.toAddress.name,
            Phone: {
              Number: "1234567890"
            },
            Address: {
              AddressLine: [request.toAddress.street1],
              City: request.toAddress.city,
              StateProvinceCode: request.toAddress.state,
              PostalCode: request.toAddress.zipCode,
              CountryCode: request.toAddress.country
            }
          },
          ShipFrom: {
            Name: request.fromAddress.name,
            AttentionName: request.fromAddress.name,
            Phone: {
              Number: "1234567890"
            },
            Address: {
              AddressLine: [request.fromAddress.street1],
              City: request.fromAddress.city,
              StateProvinceCode: request.fromAddress.state,
              PostalCode: request.fromAddress.zipCode,
              CountryCode: request.fromAddress.country
            }
          },
          PaymentInformation: {
            ShipmentCharge: {
              Type: "01",
              BillShipper: {
                AccountNumber: {
                  Value: this.accountNumber
                }
              }
            }
          },
          Service: {
            Code: serviceCode
          },
          Package: request.packages.map(pkg => ({
            PackagingType: {
              Code: "02",
              Description: "Package"
            },
            Dimensions: {
              UnitOfMeasurement: {
                Code: "IN"
              },
              Length: pkg.length.toString(),
              Width: pkg.width.toString(),
              Height: pkg.height.toString()
            },
            PackageWeight: {
              UnitOfMeasurement: {
                Code: "LBS"
              },
              Weight: pkg.weight.toString()
            }
          }))
        }
      }
    };
  }
}