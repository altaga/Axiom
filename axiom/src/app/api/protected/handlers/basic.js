import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import { handleAgentRequest } from '../utils/agent-handler';

/**
 * 🦾 BASIC TIER (Protected - JS Edition)
 */

const basicApp = new Hono();
basicApp.post('/', requirePayment('0.0001', 'USDC'), (c) => 
  handleAgentRequest(c, "Basic", "You are Geppetto (Basic - Protected).")
);

export default basicApp;
