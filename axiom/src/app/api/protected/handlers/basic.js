import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import { handleAgentRequest } from '../utils/agent-handler';

/**
 * 🦾 BASIC TIER (Protected - JS Edition)
 */

const basicApp = new Hono();
basicApp.post('/', requirePayment("0.0001", "0.0003", "USDC"), (c) => 
  handleAgentRequest(c, "Basic", "openai/gpt-5.4-mini", "You are Geppetto (Basic - Protected).")
);

export default basicApp;
