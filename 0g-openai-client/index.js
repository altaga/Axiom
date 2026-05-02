import express from 'express';
import cors from 'cors';
import { ZeroGAgent } from './ZeroGAgent.js';
import 'dotenv/config';

const app = express();
app.use(express.json({ limit: '50mb' })); // Increased limit for massive IDE payloads

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const agent = new ZeroGAgent({ 
    privateKey: process.env.PRIVATE_KEY,
    agentName: "Open-0G",
    verbose: true 
});

let isReady = false;
agent.init().then(async () => {
  isReady = true;
  console.log('✅ 0G Agent Web3 Connection Established');
  try {
    const models = await agent.listAvailableModels();
    console.log('🎯 Available Models:', models.map(m => m.id).join(', '));
  } catch (e) { console.warn('⚠️ Could not fetch model list:', e.message); }
}).catch(e => console.error('❌ Web3 Error:', e));

function adaptRequest(req) {
  const { model, messages, stream, tools } = req.body || {};
  
  let resolvedModel = model || 'deepseek';
  const lowerModel = resolvedModel.toLowerCase();
  if (lowerModel.includes('glm')) resolvedModel = 'zai-org/GLM-5-FP8';
  else if (lowerModel.includes('deepseek')) resolvedModel = 'deepseek/deepseek-chat-v3-0324';
  else if (lowerModel.includes('qwen')) resolvedModel = 'qwen3.6-plus';
  else if (lowerModel.includes('gpt')) resolvedModel = 'openai/gpt-5.4-mini';
  
  return {
    model: resolvedModel,
    messages: messages || [],
    stream: !!stream,
    tools: tools || []
  };
}

function formatStreamToolCalls(tcChunks) {
  if (!tcChunks || tcChunks.length === 0) return undefined;
  return tcChunks.map(tc => ({
      index: tc.index,
      id: tc.id,
      type: 'function',
      function: {
          name: tc.name,
          arguments: tc.args
      }
  }));
}

function formatToolCalls(lcToolCalls) {
  if (!lcToolCalls || lcToolCalls.length === 0) return undefined;
  return lcToolCalls.map(tc => ({
      id: tc.id || `call_${Math.random().toString(36).substring(2, 10)}`,
      type: 'function',
      function: {
          name: tc.name,
          arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args)
      }
  }));
}

app.post('/v1/chat/completions', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: { message: "Initializing..." } });

  const { model, messages, stream, tools } = adaptRequest(req);
  const responseId = `chatcmpl-${Math.random().toString(36).substring(2, 10)}`;
  const created = Math.floor(Date.now() / 1000);

  try {
    const activeAgent = await agent.create(model);
    if (tools.length > 0) activeAgent.bindTools(tools);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const chunkStream = await activeAgent.stream(messages);
      
      for await (const chunk of chunkStream) {
        const tool_calls = formatStreamToolCalls(chunk.tool_call_chunks) || chunk.additional_kwargs?.tool_calls;
        
        const payload = {
          id: responseId,
          object: 'chat.completion.chunk',
          created,
          model: activeAgent.currentModel,
          choices: [{
            index: 0,
            delta: { 
                content: chunk.content || null,
                ...(tool_calls && { tool_calls })
            },
            finish_reason: chunk.response_metadata?.finish_reason || null
          }]
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }

      await activeAgent.finalizeAccounting();
      res.write('data: [DONE]\n\n');
      return res.end();

    } else {
      const result = await activeAgent.invoke(messages);
      const accounting = await activeAgent.finalizeAccounting();

      const tool_calls = formatToolCalls(result.tool_calls) || result.additional_kwargs?.tool_calls;

      return res.json({
        id: responseId,
        object: 'chat.completion',
        created,
        model: activeAgent.currentModel,
        choices: [{
          index: 0,
          message: { 
            role: 'assistant', 
            content: result.content || null,
            ...(tool_calls && { tool_calls })
          },
          finish_reason: tool_calls ? 'tool_calls' : (result.response_metadata?.finish_reason || 'stop')
        }],
        usage: {
          prompt_tokens: accounting.usage.prompt_tokens,
          completion_tokens: accounting.usage.completion_tokens,
          total_tokens: accounting.usage.prompt_tokens + accounting.usage.completion_tokens
        }
      });
    }
  } catch (error) {
    console.error("Inference Error:", error.message);
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.get('/v1/models', async (req, res) => {
  try {
    const models = await agent.listAvailableModels();
    res.json({ object: "list", data: models });
  } catch (error) { res.status(500).json({ error: { message: error.message } }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 0G OpenAI Broker Ready`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/v1\n`);
});