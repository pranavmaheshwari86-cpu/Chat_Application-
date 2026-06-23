const mongoose = require('mongoose');

const uri = "mongodb://pranavmaheshwari86_db_user:BDMm3tkIlJ1bf8tx@ac-tgvc0lp-shard-00-00.ouafemc.mongodb.net:27017,ac-tgvc0lp-shard-00-01.ouafemc.mongodb.net:27017,ac-tgvc0lp-shard-00-02.ouafemc.mongodb.net:27017/flashchat?ssl=true&replicaSet=atlas-cazmd0-shard-0&authSource=admin&retryWrites=true&w=majority&appName=NewFlashChat";

async function check() {
  try {
    await mongoose.connect(uri);
    const messages = await mongoose.connection.collection('messages').find({}).toArray();
    console.log("Total messages:", messages.length);
    if (messages.length > 0) {
      console.log("conversationId type:", typeof messages[0].conversationId);
      console.log("conversationId constructor:", messages[0].conversationId?.constructor?.name);
      console.log("is ObjectId:", messages[0].conversationId instanceof mongoose.Types.ObjectId);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

check();
