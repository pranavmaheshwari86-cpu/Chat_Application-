const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  try {
    const mongod = await MongoMemoryServer.create({
      instanceOpts: [{ port: 27017 }]
    });
    const uri = mongod.getUri();
    console.log('MongoDB Memory Server started at:', uri);
    console.log('Use this URI in .env: MONGODB_URI=' + uri);
    // Keep running
    setInterval(() => {}, 1000 * 60 * 60);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

start();