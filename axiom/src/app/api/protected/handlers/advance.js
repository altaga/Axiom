import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import { handleAgentRequest } from '../utils/agent-handler';

/**
 * 🦾 ADVANCE TIER (Protected - JS Edition)
 */

const advanceApp = new Hono();
advanceApp.post('/', requirePayment('0.001', 'USDC'), (c) => 
  handleAgentRequest(c, "Advance", "You are Geppetto (Advanced - Protected).")
);

export default advanceApp;
