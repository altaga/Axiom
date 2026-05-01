import { Hono } from 'hono';
import * as handlers from './handlers'; 

/**
 * 🧠 PROTECTED API HUB (JS Edition)
 */

const app = new Hono().basePath('/api/protected');

// 1. GLOBAL MIDDLEWARE
app.use('*', async (c, next) => {
  c.set('logger', (msg) => console.log(`[SYS]: ${msg}`));
  await next();
});

// 2. AUTO-MOUNT THE ROUTES
Object.entries(handlers).forEach(([routeName, subApp]) => {
  app.route(`/${routeName}`, subApp);
});

// 3. EXPORT TO EXPO ROUTER
export const GET = (req) => app.fetch(req);
export const POST = (req) => app.fetch(req);
export const PUT = (req) => app.fetch(req);
export const DELETE = (req) => app.fetch(req);
