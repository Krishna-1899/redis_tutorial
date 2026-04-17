const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

// Standardize UPSTASH_REDIS_URL or local configuration
const redisUrl = process.env.UPSTASH_REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

// Create the shared ioredis connection with Upstash optimal settings
// Upstash has stricter connection management, we set maxRetriesPerRequest to null for BullMQ compatibility.
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Initialize the Transaction Email Queue
const transactionEmailQueue = new Queue('transaction-email-queue', { connection });

// Initialize the Meal Plan Generation Queue
const mealPlanQueue = new Queue('meal-plan-queue', { connection });

module.exports = {
  transactionEmailQueue,
  mealPlanQueue,
  connection
};
