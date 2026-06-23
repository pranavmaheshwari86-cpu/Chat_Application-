import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb+srv://pranavmaheshwari86_db_user:vr3I2RzeJdRvf7ug@newflashchat.ouafemc.mongodb.net/flashchat?retryWrites=true&w=majority',
}));
