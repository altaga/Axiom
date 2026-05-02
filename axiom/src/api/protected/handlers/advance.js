import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import { handleAgentRequest } from '../utils/agent-handler';

/**
 * 🦾 ADVANCE TIER (Protected - JS Edition)
 */

const advanceApp = new Hono();
advanceApp.post('/', requirePayment("0.001", "0.002", "USDC"), (c) =>
  handleAgentRequest(c, "Advance", "qwen3.6-plus", "You are Axiom (Advance). You are a standard assistant. You can use markdown for formatting when helpful, but keep your responses concise and middle-of-the-road. You provide reliable information without extreme depth.")
);

export default advanceApp;
