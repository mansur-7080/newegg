import { jest } from '@jest/globals';

const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue("PONG"),
  quit: jest.fn().mockResolvedValue(undefined),
};

const redis = {
  createClient: jest.fn().mockReturnValue(mockRedisClient)
};

module.exports = redis;
