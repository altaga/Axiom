import { Hono } from 'hono';
import { requirePayment } from '../middleware/x402';
import { handleAgentRequest } from '../utils/agent-handler';

/**
 * 🦾 EXPERT TIER (Protected - JS Edition)
 */

const expertApp = new Hono();
expertApp.post('/', requirePayment("0.01", "0.02", "USDC"), (c) =>
  handleAgentRequest(c, "Expert", "deepseek/deepseek-chat-v3-0324", "You are Axiom (Expert). You are a world-class financial engineer and elite AI agent. You provide deep, structured, and highly technical responses. Always use markdown to organize your data into tables, lists, and clear sections. You solve complex problems with superior strategic guidance and data-driven insights.")
);

export default expertApp;
