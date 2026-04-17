const express = require('express');
const db = require('./db');
const redis = require('redis');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;

// Setup Redis Subscriber
const redisUrl = process.env.UPSTASH_REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
const subscriber = redis.createClient({ url: redisUrl });

async function startService() {
    await subscriber.connect();
    console.log('[Notification Service] 🟢 Connected to Redis Subscriber');

    // Listen for 'user:created' to replicate data AND send emails!
    await subscriber.subscribe('user:created', async (message) => {
        try {
            const user = JSON.parse(message);
            console.log(`[Notification Service] 📨 Received new user: ${user.name}`);
            
            // 1. Insert replica into notification_db's users table
            await db.query('INSERT IGNORE INTO users (id, name, email) VALUES (?, ?, ?)', 
                [user.id, user.name, user.email]
            );
            
            // 2. Pretend to send email...
            console.log(`[Notification Service] 📧 Sending Welcome Email to ${user.email}...`);
            
            // 3. Log the notification activity in DB
            await db.query('INSERT INTO notification_logs (user_id, message) VALUES (?, ?)', 
                [user.id, 'Welcome email sent successfully.']
            );
            
            console.log(`[Notification Service] 💾 Logged Email Dispatch to local DB!`);
        } catch(error) {
            console.error('[Notification Service] Replication/Email Error:', error);
        }
    });

    app.get('/', (req, res) => res.send('Notification Service is running.'));

    app.listen(PORT, () => console.log(`[Notification Service] Server running on port ${PORT}`));
}
startService();
