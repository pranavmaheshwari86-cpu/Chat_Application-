const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  try {
    console.log('Starting MongoDB Memory Server...');
    const mongod = await MongoMemoryServer.create({
      instanceOpts: [{ 
        port: 27017,
        args: ['--bind_ip', '127.0.0.1']
      }],
      binary: { 
        downloadDir: './mongodb-bin',
        version: '7.0.0'
      }
    });
    
    const uri = mongod.getUri();
    console.log('MongoDB Memory Server started at:', uri);
    
    // Keep the process alive
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await mongod.stop();
      process.exit(0);
    });
    
    setInterval(() => {}, 1000 * 60 * 60);
  } catch (err) {
    console.error('Failed to start MongoDB Memory Server:', err);
    process.exit(1);
  }
}

start();