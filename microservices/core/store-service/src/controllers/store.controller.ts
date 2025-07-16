import { Request, Response } from 'express';
import { prisma } from '../index';
import { logger } from '../config/logger';

export class StoreController {
  async getAllStores(req: Request, res: Response): Promise<void> {
    try {
      const stores = await prisma.store.findMany({
        include: {
          vendor: true,
        },
      });

      res.status(200).json({
        success: true,
        data: stores,
        count: stores.length,
      });
    } catch (error) {
      logger.error('Error fetching stores', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stores',
      });
    }
  }

  async getStoreById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const store = await prisma.store.findUnique({
        where: { id },
        include: {
          vendor: true,
        },
      });

      if (!store) {
        res.status(404).json({
          success: false,
          message: 'Store not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      logger.error('Error fetching store', { error, storeId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch store',
      });
    }
  }

  async createStore(req: Request, res: Response): Promise<void> {
    try {
      const storeData = req.body;
      
      const store = await prisma.store.create({
        data: storeData,
        include: {
          vendor: true,
        },
      });

      res.status(201).json({
        success: true,
        data: store,
        message: 'Store created successfully',
      });
    } catch (error) {
      logger.error('Error creating store', { error, data: req.body });
      res.status(500).json({
        success: false,
        message: 'Failed to create store',
      });
    }
  }

  async updateStore(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const store = await prisma.store.update({
        where: { id },
        data: updateData,
        include: {
          vendor: true,
        },
      });

      res.status(200).json({
        success: true,
        data: store,
        message: 'Store updated successfully',
      });
    } catch (error) {
      logger.error('Error updating store', { error, storeId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to update store',
      });
    }
  }

  async deleteStore(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await prisma.store.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'Store deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting store', { error, storeId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to delete store',
      });
    }
  }

  async updateStoreStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const store = await prisma.store.update({
        where: { id },
        data: { status },
      });

      res.status(200).json({
        success: true,
        data: store,
        message: 'Store status updated successfully',
      });
    } catch (error) {
      logger.error('Error updating store status', { error, storeId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to update store status',
      });
    }
  }

  async getStoreAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Placeholder for analytics logic
      const analytics = {
        totalOrders: 0,
        totalRevenue: 0,
        activeProducts: 0,
        customerCount: 0,
      };

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error fetching store analytics', { error, storeId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch store analytics',
      });
    }
  }
}