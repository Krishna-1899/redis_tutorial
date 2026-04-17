const express = require('express');
const db = require('./db');
const redis = require('redis');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

// Setup Redis Subscriber
const redisUrl = process.env.UPSTASH_REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
const subscriber = redis.createClient({ url: redisUrl });

async function startService() {
    await subscriber.connect();
    console.log('[Vendor Service] 🟢 Connected to Redis Subscriber');

    // Listen for 'user:created' to replicate data locally!
    await subscriber.subscribe('user:created', async (message) => {
        try {
            const user = JSON.parse(message);
            console.log(`[Vendor Service] 📨 Received new user: ${user.name}`);
            
            // Insert replica into vendor_db's users table
            await db.query('INSERT IGNORE INTO users (id, name, email) VALUES (?, ?, ?)', 
                [user.id, user.name, user.email]
            );
            console.log(`[Vendor Service] 💾 Replicated User ${user.id} into local DB!`);
        } catch(error) {
            console.error('[Vendor Service] Replication Error:', error);
        }
    });

    // Simple health route
    app.get('/', (req, res) => res.send('Vendor Service is running.'));

    app.listen(PORT, () => console.log(`[Vendor Service] Server running on port ${PORT}`));
}
startService();
