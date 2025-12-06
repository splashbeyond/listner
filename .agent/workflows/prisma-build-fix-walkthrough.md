---
description: Walkthrough of the Prisma build error and solution
---

# Build Error Walkthrough: Prisma & Next.js Static Generation

## The Error
The build failed with:
```
Error: Failed to collect page data for /api/books
```

## Why it happened
1.  **Static Analysis**: Next.js tries to "pre-render" or statically analyze pages and API routes during build time to optimize performance.
2.  **Database Connection**: Our `/api/books` route imports `prisma` from `@/lib/prisma`.
3.  **Premature Execution**: When Next.js analyzed the route, it imported the `prisma` client.
4.  **Missing Env Var**: In the build environment (Vercel), the `DATABASE_URL` might not be fully available or the Prisma client tried to connect immediately upon instantiation.
5.  **Crash**: The `new PrismaClient()` call failed (or threw a validation error) because it couldn't establish a valid connection context during this static analysis phase.

## The Solution

We implemented a two-part fix to prevent this:

### 1. Lazy Initialization (in `lib/prisma.ts`)
We wrapped the `PrismaClient` creation in a function that checks if `DATABASE_URL` exists.

**Before:**
```typescript
export const prisma = new PrismaClient(); // Tries to connect immediately!
```

**After:**
```typescript
const prismaClientSingleton = () => {
    // If we are building and don't have a DB URL, return undefined/mock
    // This prevents the crash during the build phase
    if (!process.env.DATABASE_URL) {
        return undefined as unknown as PrismaClient;
    }
    return new PrismaClient();
};
```

### 2. Force Dynamic Mode (in `app/api/books/route.ts`)
We explicitly told Next.js "Do not try to pre-render this".

```typescript
export const dynamic = 'force-dynamic';
```

This instruction tells the Next.js builder:
*   Skip static analysis for this route.
*   Only run this code when a *real user* makes a request at runtime.
*   This completely bypasses the build-time connection attempt.

## Result
The build process now skips the dangerous database connection step, allowing the deployment to succeed. The database connection will only happen when the app is actually running and a user tries to save or load a book.
