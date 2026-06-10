# FAILING TESTS REPORT

The following auto-generated boilerplate test files are currently failing due to unresolved dependency injection dependencies in their respective `TestingModule` configurations.

### 1. `src/modules/posts/posts.controller.spec.ts`
- **Failing Dependency:** `PostsService`
- **Root Cause:** The `PostsController` requires `PostsService` at index [0], but it is not provided in `providers` array.
- **Replacement Strategy:** Create a mocked `PostsService` with `jest.fn()` overrides for all CRUD operations, ownership checks, and pagination methods.

### 2. `src/modules/posts/posts.service.spec.ts`
- **Failing Dependency:** `getModelToken('Post')` (Mongoose Model)
- **Root Cause:** The service injects Mongoose models, but they aren't provided in the boilerplate module.
- **Replacement Strategy:** Provide mock models for `Post` testing CRUD logic.

### 3. `src/modules/follows/follows.controller.spec.ts`
- **Failing Dependency:** `FollowsService`
- **Root Cause:** Missing `FollowsService` provider.
- **Replacement Strategy:** Provide a mock service overriding `followUser`, `unfollowUser`, etc.

### 4. `src/modules/follows/follows.service.spec.ts`
- **Failing Dependency:** Mongoose models / Event emitter
- **Root Cause:** Missing providers.
- **Replacement Strategy:** Provide mocked models to test duplicate follow prevention and self-follow blocks.

### 5. `src/modules/comments/comments.controller.spec.ts`
- **Failing Dependency:** `CommentsService`
- **Root Cause:** Missing `CommentsService` provider.
- **Replacement Strategy:** Provide mock service testing creation, deletion, and auth checks.

### 6. `src/modules/comments/comments.service.spec.ts`
- **Failing Dependency:** Mongoose models
- **Root Cause:** Missing providers.
- **Replacement Strategy:** Mock Mongoose queries to validate comment logic and ownership.

### 7. `src/modules/feed/feed.controller.spec.ts`
- **Failing Dependency:** `FeedService`
- **Root Cause:** Missing `FeedService` provider.
- **Replacement Strategy:** Provide mock service for feed generation and pagination routes.

### 8. `src/modules/feed/feed.service.spec.ts`
- **Failing Dependency:** `FollowsService`, `PostsService`, etc.
- **Root Cause:** Aggregation dependencies are not provided.
- **Replacement Strategy:** Mock cross-module dependencies to validate feed sorting algorithms.

### 9. `src/modules/events/events.service.spec.ts`
- **Failing Dependency:** Bull Queue (`getQueueToken('flashchat-events')`)
- **Root Cause:** The service injects a Redis queue which is missing.
- **Replacement Strategy:** Provide a mocked queue using `{ provide: getQueueToken('flashchat-events'), useValue: { add: jest.fn() } }`.

### 10. `src/modules/redis/redis.service.spec.ts`
- **Failing Dependency:** Redis connection / IoRedis
- **Root Cause:** Attempts to connect to an actual Redis instance or missing token.
- **Replacement Strategy:** Mock the Redis client entirely to test TTL, heartbeats, and online status.
