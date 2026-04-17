const redis = require('redis');
require('dotenv').config();

const redisUrl = process.env.UPSTASH_REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const client = redis.createClient({
    url: redisUrl
});

client.on('error', (err) => console.log('Redis Client Error', err));

async function connectCache() {
    if (!client.isOpen) {
        await client.connect();
        // Extract host to log safely without exposing the password
        const logHost = redisUrl.includes('@') ? redisUrl.split('@')[1] : redisUrl;
        console.log(`Connected to Redis at ${logHost}`);
    }
}

connectCache();

module.exports = client;
