const cron = require('node-cron');
const Post = require('./models/Post');

const startScheduler = () => {
  // Runs every minute: * * * * *
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find posts that are 'scheduled' and the time has passed or is exactly now
      const result = await Post.updateMany(
        { 
          status: 'scheduled', 
          scheduledFor: { $lte: now } 
        },
        { 
          $set: { status: 'published' } 
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`[Scheduler] ✅ Published ${result.modifiedCount} scheduled posts.`);
      }
    } catch (error) {
      console.error('[Scheduler] ❌ Error running background job:', error);
    }
  });

  console.log('📅 Background Post Scheduler is active (running every minute).');
};

module.exports = startScheduler;