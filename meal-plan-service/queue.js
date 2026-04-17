const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

const redisUrl = process.env.UPSTASH_REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const mealPlanQueue = new Queue('meal-plan-queue', { connection });

module.exports = { mealPlanQueue, connection };
