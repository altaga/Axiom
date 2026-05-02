import { Hono } from 'hono';
import * as handlers from '../../../api/public/handlers'; 

/**
 * 🌎 PUBLIC API HUB (JS Edition)
 */

const app = new Hono().basePath('/api/public');

// 1. GLOBAL MIDDLEWARE
app.use('*', async (c, next) => {
  c.set('logger', (msg) => console.log(`[PUBLIC]: ${msg}`));
  await next();
});

// 2. AUTO-MOUNT THE ROUTES
Object.entries(handlers).forEach(([routeName, subApp]) => {
  app.route(`/${routeName}`, subApp);
});

// 3. EXPORT TO EXPO ROUTER
export const GET = (req) => app.fetch(req);
export const POST = (req) => app.fetch(req);
