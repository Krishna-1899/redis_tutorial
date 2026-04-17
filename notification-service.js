const redis = require('redis');
require('dotenv').config();

// Standard connection URL logic (Use Upstash if available, otherwise local)
const redisUrl = process.env.UPSTASH_REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

// 1. Create a DEDICATED client for subscribing.
// In Node Redis, once a client is placed into "subscribe" mode, it cannot run any other commands (like GET or SET)
const subscriber = redis.createClient({ url: redisUrl });

subscriber.on('error', (err) => console.log('Notification Service Redis Error', err));

async function startNotificationService() {
    await subscriber.connect();
    console.log('[Notification Microservice] 🟢 Connected to Redis and waiting for events...');

    // 2. Subscribe to the event channel!
    await subscriber.subscribe('user:created', (message) => {
        // 3. Message received! It comes as a string, so we parse it:
        const user = JSON.parse(message);
        
        console.log(`\n[Notification Microservice] 📨 EVENT RECEIVED: New User Registation!`);
        console.log(`[Notification Microservice] 📧 Pretending to send Welcome Email out to "${user.email}"...`);
        
        // This microservice would theoretically generate template HTML and ping SendGrid here
    });
}

startNotificationService();
