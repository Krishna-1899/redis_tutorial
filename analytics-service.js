const redis = require('redis');
require('dotenv').config();

const redisUrl = process.env.UPSTASH_REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const subscriber = redis.createClient({ url: redisUrl });

subscriber.on('error', (err) => console.log('Analytics Service Redis Error', err));

async function startAnalyticsService() {
    await subscriber.connect();
    console.log('[Analytics Microservice] 🟢 Connected to Redis and waiting for events...');

    await subscriber.subscribe('user:created', (message) => {
        const user = JSON.parse(message);
        
        console.log(`\n[Analytics Microservice] 📊 EVENT RECEIVED: User created.`);
        console.log(`[Analytics Microservice] 📈 Simulating saving User ID ${user.id} into a specialized Data Warehouse for tracking daily stats...`);
        
        // This microservice would theoretically update a MongoDB document or Snowflake DB here.
    });
}

startAnalyticsService();
