const { MongoMemoryReplSet } = require('mongodb-memory-server');

async function start() {
  try {
    const replSet = await MongoMemoryReplSet.create({
      replSet: { name: 'testset', count: 1 },
      instanceOpts: [ { port: 27017, dbPath: require('path').join(__dirname, 'mongodb-data'), storageEngine: 'wiredTiger' } ]
    });
    console.log('MongoDB Memory Server (Replica Set) started at:', replSet.getUri());
    // keep process alive
    setInterval(() => {}, 1000 * 60 * 60);
  } catch (err) {
    console.error('Failed to start MongoDB Memory Server:', err);
  }
}

start();
