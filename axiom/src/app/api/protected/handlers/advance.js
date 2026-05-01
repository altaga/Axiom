import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import { handleAgentRequest } from '../utils/agent-handler';

/**
 * 🦾 ADVANCE TIER (Protected - JS Edition)
 */

const advanceApp = new Hono();
advanceApp.post('/', requirePayment("0.001", "0.002", "USDC"), (c) => 
  handleAgentRequest(c, "Advance", "qwen3.6-plus", "You are Geppetto (Advanced - Protected).")
);

export default advanceApp;
