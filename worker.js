const { Worker } = require('bullmq');
const { connection } = require('./queue');

console.log('Worker started. Listening for background jobs...');

// Initialize the Worker to listen to our 'transaction-email-queue'
const worker = new Worker('transaction-email-queue', async job => {
    console.log(`\n[Worker] 📥 Processing Job ID: ${job.id}`);
    console.log(`[Worker] Data received:`, job.data);
    
    // 1. Simulate a long running task (e.g., generating a PDF)
    console.log(`[Worker] ⚙️ Generating PDF for transaction ${job.data.transactionId}... (Taking 3 seconds)`);
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds delay
    
    // 2. Simulate random failure to trigger retry mechanism (50% chance to fail)
    const randomFailure = Math.random() < 0.5;
    if (randomFailure) {
        console.error(`[Worker] ❌ Network Error! Failed to send email to ${job.data.userEmail}. (This triggers a retry)`);
        throw new Error('Simulated random email delivery failure');
    }
    
    // 3. Simulate email sending completing successfully
    console.log(`[Worker] ✅ Success! PDF Email sent to ${job.data.userEmail}`);
    return { status: 'completed', time: new Date().toISOString() };
    
}, { connection });

// Add event listeners to watch the retry cycle in the console
worker.on('failed', (job, err) => {
    console.log(`[Email Worker] ⚠️ Job ${job.id} failed with reason: ${err.message}. Retries left: ${job.opts.attempts - job.attemptsMade}`);
});

worker.on('completed', job => {
    console.log(`[Email Worker] 🏆 Job ${job.id} completed successfully all steps!`);
});

// =========================================================================
// NEW: Meal Plan Generator Worker (With Progress Tracking)
// =========================================================================

const mealPlanWorker = new Worker('meal-plan-queue', async job => {
    console.log(`\n[Meal Plan Worker] 📥 Starting Job ID: ${job.id} for User: ${job.data.userId}`);
    
    // Step 1: Validating user & credits
    console.log(`[Meal Plan Worker] 🔍 Validating credits... (0% - 10%)`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await job.updateProgress(10);
    
    // Step 2: Open AI generation for Week 1 & 2
    console.log(`[Meal Plan Worker] 🤖 Generating Week 1 & 2 Meal Plan with AI... (10% - 40%)`);
    await new Promise(resolve => setTimeout(resolve, 4000));
    await job.updateProgress(40);
    
    // Step 3: Open AI generation for Week 3 & 4
    console.log(`[Meal Plan Worker] 🤖 Generating Week 3 & 4 Meal Plan with AI... (40% - 70%)`);
    await new Promise(resolve => setTimeout(resolve, 4000));
    await job.updateProgress(70);
    
    // Step 4: Compiling into a beautiful PDF
    console.log(`[Meal Plan Worker] 📄 Compiling insights into PDF format... (70% - 90%)`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await job.updateProgress(90);
    
    // Step 5: Upload to AWS S3 (Simulated)
    console.log(`[Meal Plan Worker] ☁️ Uploading finished PDF to AWS S3... (90% - 100%)`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await job.updateProgress(100);
    
    const mockS3Url = `https://mock-s3-bucket.s3.amazonaws.com/meal-plans/${job.data.userId}/plan-${job.id}.pdf`;
    console.log(`[Meal Plan Worker] ✅ Finished! PDF available at ${mockS3Url}`);
    
    // The value we return here is saved in Redis as the job's final "result" data
    return { 
        url: mockS3Url,
        message: 'Meal plan generated successfully.' 
    };
}, { connection });

mealPlanWorker.on('completed', job => {
    console.log(`[Meal Plan Worker] 🏆 Job ${job.id} Fully Completed!`);
});
