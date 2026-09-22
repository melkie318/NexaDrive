import { StorageProvider } from './storage.provider';
import { LocalStorageProvider } from './local.provider';

/**
 * StorageService — singleton facade over the active StorageProvider.
 *
 * All application code (file.service.ts, etc.) calls StorageService, not a
 * provider directly. To switch from local disk to S3 in production:
 *
 *   1. Implement S3StorageProvider satisfying the StorageProvider interface.
 *   2. Change the line below to: new S3StorageProvider()
 *   3. Done — nothing else changes.
 *
 * Architecture (from the roadmap):
 *
 *   StorageService
 *     │
 *     ├── LocalStorageProvider   ← current (development)
 *     │
 *     └── S3StorageProvider      ← future (production / Phase 20)
 */

// Active provider — swap this line to change backends
const activeProvider: StorageProvider = new LocalStorageProvider();

export const StorageService: StorageProvider = {
  save:    (...args) => activeProvider.save(...args),
  delete:  (...args) => activeProvider.delete(...args),
  copy:    (...args) => activeProvider.copy(...args),
  resolve: (...args) => activeProvider.resolve(...args),
  exists:  (...args) => activeProvider.exists(...args),
  size:    (...args) => activeProvider.size(...args),
};
