/**
 * Standalone script to synchronize MongoDB indexes in production.
 *
 * In production, autoIndex is disabled for performance. Run this script
 * after deployment or schema changes to ensure all indexes are created:
 *
 *   npx ts-node -r tsconfig-paths/register src/scripts/sync-indexes.ts
 *
 * Or via the npm script:
 *
 *   npm run db:sync-indexes
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

async function syncIndexes() {
  console.log('🔄 Starting MongoDB index synchronization...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const connection = app.get<Connection>(getConnectionToken());
  const modelNames = connection.modelNames();

  console.log(`Found ${modelNames.length} registered models:\n`);

  for (const modelName of modelNames) {
    try {
      const model = connection.model(modelName);
      await model.syncIndexes();
      const indexes = await model.listIndexes();
      console.log(`  ✅ ${modelName}: ${indexes.length} indexes synchronized`);
    } catch (error: any) {
      console.error(
        `  ❌ ${modelName}: Failed to sync indexes — ${error.message}`,
      );
    }
  }

  console.log('\n✅ Index synchronization complete.');
  await app.close();
  process.exit(0);
}

syncIndexes().catch((error) => {
  console.error('❌ Fatal error during index sync:', error);
  process.exit(1);
});
