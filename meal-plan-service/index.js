const express = require('express');
const { Worker } = require('bullmq');
const { mealPlanQueue, connection } = require('./queue');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;

// 1. Setup API Endpoints
app.post('/meal-plan', async (req, res) => {
    try {
        const { userId, dietType } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId is required' });
        
        // Log into local DB
        const [result] = await db.query('INSERT INTO meal_plans (user_id, status) VALUES (?, ?)', [userId, 'processing']);
        const mealPlanId = result.insertId;

        // Queue in BullMQ
        const job = await mealPlanQueue.add('generate-meal-plan', { userId, dietType, mealPlanId });
        
        res.status(202).json({ message: 'Generation started', jobId: job.id, mealPlanId });
    } catch (error) {
        console.error('Error queuing task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/job/:id', async (req, res) => {
    try {
        const job = await mealPlanQueue.getJob(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        
        res.status(200).json({
            jobId: job.id,
            state: await job.getState(),
            progress: job.progress,
            result: job.returnvalue || null,
            error: job.failedReason || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Setup Worker Runtime inside the same isolated microservice container
const mealPlanWorker = new Worker('meal-plan-queue', async job => {
    console.log(`\n[Meal Plan Sub-Worker] 📥 Starting Job ID: ${job.id}`);
    
    await job.updateProgress(10);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await job.updateProgress(50);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await job.updateProgress(100);
    
    const mockS3Url = `https://s3.amazonaws.com/meal-plans/plan-${job.id}.pdf`;
    
    // Update local DB status to completed
    await db.query('UPDATE meal_plans SET s3_url = ?, status = ? WHERE id = ?', [mockS3Url, 'completed', job.data.mealPlanId]);
    
    console.log(`[Meal Plan Sub-Worker] ✅ Finished! Data Saved to DB.`);
    return { url: mockS3Url };
}, { connection });

app.listen(PORT, () => console.log(`[Meal Plan Service] Server running on port ${PORT}`));
