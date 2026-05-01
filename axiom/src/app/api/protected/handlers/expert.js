import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import { handleAgentRequest } from '../utils/agent-handler';

/**
 * 🦾 EXPERT TIER (Protected - JS Edition)
 */

const expertApp = new Hono();
expertApp.post('/', requirePayment('0.01', 'USDC'), (c) => 
  handleAgentRequest(c, "Expert", "You are Geppetto (Expert - Protected).")
);

export default expertApp;
