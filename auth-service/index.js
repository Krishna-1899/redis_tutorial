const express = require('express');
const db = require('./db');
const redis = require('redis');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Setup Redis Publisher Client
const redisUrl = process.env.UPSTASH_REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
const redisPublisher = redis.createClient({ url: redisUrl });
redisPublisher.on('error', (err) => console.log('Redis Publisher Error', err));

async function startApp() {
    await redisPublisher.connect();
    console.log('[Auth Service] 🟢 Connected to Redis for Publishing.');
    
    // POST /user
    app.post('/user', async (req, res) => {
        try {
            const { name, email } = req.body;
            if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
            
            // 1. Insert into local Database (auth_db)
            const [result] = await db.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
            const newUser = { id: result.insertId, name, email };
            
            // 2. Publish to the Network!
            await redisPublisher.publish('user:created', JSON.stringify(newUser));
            console.log(`[Auth Service] 📣 Broadcasted 'user:created' for User ${newUser.id}`);
            
            res.status(201).json({ message: 'User created securely in Auth DB & broadcasted!', user: newUser });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.listen(PORT, () => {
        console.log(`[Auth Service] Server is running on port ${PORT}`);
    });
}
startApp();
