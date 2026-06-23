const mongoose = require('mongoose');

const uri = "mongodb://pranavmaheshwari86_db_user:BDMm3tkIlJ1bf8tx@ac-tgvc0lp-shard-00-00.ouafemc.mongodb.net:27017,ac-tgvc0lp-shard-00-01.ouafemc.mongodb.net:27017,ac-tgvc0lp-shard-00-02.ouafemc.mongodb.net:27017/flashchat?ssl=true&replicaSet=atlas-cazmd0-shard-0&authSource=admin&retryWrites=true&w=majority&appName=NewFlashChat";

async function fix() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to DB");
    
    // Clear out readBy array for all messages to fix corrupted elements
    const result = await mongoose.connection.collection('messages').updateMany(
      {},
      { $set: { readBy: [] } }
    );
    
    console.log("Updated messages:", result.modifiedCount);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected");
  }
}

fix();
