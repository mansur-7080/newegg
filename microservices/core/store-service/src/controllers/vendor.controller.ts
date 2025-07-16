import { Request, Response } from 'express';
import { prisma } from '../index';
import { logger } from '../config/logger';

export class VendorController {
  async getAllVendors(req: Request, res: Response): Promise<void> {
    try {
      const vendors = await prisma.vendor.findMany({
        include: {
          stores: true,
        },
      });

      res.status(200).json({
        success: true,
        data: vendors,
        count: vendors.length,
      });
    } catch (error) {
      logger.error('Error fetching vendors', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendors',
      });
    }
  }

  async getVendorById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const vendor = await prisma.vendor.findUnique({
        where: { id },
        include: {
          stores: true,
        },
      });

      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      logger.error('Error fetching vendor', { error, vendorId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor',
      });
    }
  }

  async createVendor(req: Request, res: Response): Promise<void> {
    try {
      const vendorData = req.body;
      
      const vendor = await prisma.vendor.create({
        data: vendorData,
        include: {
          stores: true,
        },
      });

      res.status(201).json({
        success: true,
        data: vendor,
        message: 'Vendor created successfully',
      });
    } catch (error) {
      logger.error('Error creating vendor', { error, data: req.body });
      res.status(500).json({
        success: false,
        message: 'Failed to create vendor',
      });
    }
  }

  async updateVendor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const vendor = await prisma.vendor.update({
        where: { id },
        data: updateData,
        include: {
          stores: true,
        },
      });

      res.status(200).json({
        success: true,
        data: vendor,
        message: 'Vendor updated successfully',
      });
    } catch (error) {
      logger.error('Error updating vendor', { error, vendorId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to update vendor',
      });
    }
  }

  async deleteVendor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await prisma.vendor.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'Vendor deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting vendor', { error, vendorId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to delete vendor',
      });
    }
  }

  async verifyVendor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { verified } = req.body;
      
      const vendor = await prisma.vendor.update({
        where: { id },
        data: { verified },
      });

      res.status(200).json({
        success: true,
        data: vendor,
        message: `Vendor ${verified ? 'verified' : 'unverified'} successfully`,
      });
    } catch (error) {
      logger.error('Error verifying vendor', { error, vendorId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to verify vendor',
      });
    }
  }

  async getVendorStores(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const stores = await prisma.store.findMany({
        where: { vendorId: id },
      });

      res.status(200).json({
        success: true,
        data: stores,
        count: stores.length,
      });
    } catch (error) {
      logger.error('Error fetching vendor stores', { error, vendorId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor stores',
      });
    }
  }
}