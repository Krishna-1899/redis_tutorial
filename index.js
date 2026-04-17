const express = require('express');
const db = require('./db');
const redisClient = require('./cache');
const { transactionEmailQueue, mealPlanQueue } = require('./queue');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// POST: Add a new user
app.post('/user', async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }
        
        const [result] = await db.query(
            'INSERT INTO users (name, email) VALUES (?, ?)',
            [name, email]
        );
        
        const newUser = { id: result.insertId, name, email };
        
        // ==========================================
        // PUB/SUB MICROSERVICES EXAMPLE
        // ==========================================
        // After successfully creating in our DB, broadcast it to the whole network!
        // We use the raw existing redisClient. Note that publishing does not block this node server!
        const payload = JSON.stringify(newUser);
        await redisClient.publish('user:created', payload);
        console.log(`[API Publisher] 📣 Broadcasted 'user:created' to Redis network!`);
        
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET: Fetch a user by ID (with Redis caching)
app.get('/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const cacheKey = `user:${userId}`;
        
        // 1. Check Redis Cache
        const cachedUser = await redisClient.get(cacheKey);
        
        if (cachedUser) {
            console.log(`[Cache Hit] Fetched user ${userId} from Redis`);
            return res.status(200).json({ source: 'redis', data: JSON.parse(cachedUser) });
        }
        
        // 2. Cache Miss: Fetch from MySQL DB
        console.log(`[Cache Miss] Fetching user ${userId} from MySQL`);
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = rows[0];
        
        // 3. Store in Redis Cache for future requests (e.g., expire in 1 hour: 3600s)
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(user));
        
        res.status(200).json({ source: 'mysql', data: user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST: Add an email job to the Redis Queue
app.post('/transaction/:id/email', async (req, res) => {
    try {
        const transactionId = req.params.id;
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'User email is required to send transaction.' });
        }
        
        console.log(`[API] Received request to send transaction ${transactionId} to ${email}`);
        
        // Add the job to the queue
        // We set it to attempt 3 retries, with a 3 second delay between retries
        const job = await transactionEmailQueue.add('send-pdf-email', {
            transactionId: transactionId,
            userEmail: email
        }, {
            attempts: 3,
            backoff: {
                type: 'fixed',
                delay: 3000 // Wait 3 seconds before retrying
            }
        });
        
        console.log(`[API] Job added to Queue with ID: ${job.id}`);
        
        // Respond immediately while worker handles the rest!
        res.status(202).json({ 
            message: 'Email task added to the queue for background processing. You will receive it shortly!',
            jobId: job.id
        });
        
    } catch (error) {
        console.error('Error queuing task:', error);
        res.status(500).json({ error: 'Internal server error while queueing task' });
    }
});

// POST: Request an AI Meal Plan (Background Task)
app.post('/meal-plan', async (req, res) => {
    try {
        const { userId, dietType } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        
        // Add task to the meal plan queue
        const job = await mealPlanQueue.add('generate-meal-plan', {
            userId,
            dietType: dietType || 'any'
        });
        
        // Respond instantly with the Job ID so frontend can poll
        res.status(202).json({
            message: 'Meal plan generation started. Please poll /job/:id for progress.',
            jobId: job.id
        });
        
    } catch (error) {
        console.error('Error queuing meal plan task:', error);
        res.status(500).json({ error: 'Internal server error while queueing meal plan task' });
    }
});

// GET: Check the status and progress of ANY job in the meal plan queue
app.get('/job/:id', async (req, res) => {
    try {
        const jobId = req.params.id;
        
        // Fetch the exact job block from Redis
        const job = await mealPlanQueue.getJob(jobId);
        
        if (!job) {
            // Note: jobs might be purged after a long time depending on your BullMQ settings.
            return res.status(404).json({ error: 'Job not found or has been removed from cache' });
        }
        
        // Job state can be: 'completed', 'failed', 'delayed', 'active', 'waiting'
        const state = await job.getState();
        const progress = job.progress; // This is the exact number from `job.updateProgress(%)`
        const result = job.returnvalue; // The final return object from the worker!
        const errorReason = job.failedReason;
        
        // Send a beautiful JSON bundle back to the frontend progress bar UI
        res.status(200).json({
            jobId: job.id,
            state: state,
            progress: progress, // e.g. 40
            result: result || null, // e.g. { url: "https://amazon..." }
            error: errorReason || null
        });
        
    } catch (error) {
        console.error('Error fetching job state:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Quick MySQL connection test
    try {
        const connection = await db.getConnection();
        console.log(`Connected to MySQL Database: ${process.env.DB_NAME} at ${process.env.DB_HOST}`);
        connection.release();
    } catch (error) {
        console.error(`Failed to connect to MySQL: ${error.message}`);
    }
});
