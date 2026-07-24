'use strict';

const crypto = require('node:crypto');
const express = require('express');
const pool = require('../db');
const verifyToken = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.post('/agriculture-advice', async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  const baseUrl = process.env.OPENROUTER_BASE_URL;
  if (!apiKey || !model || baseUrl !== 'https://openrouter.ai/api/v1') {
    return res.status(503).json({ error: 'OpenRouter configuration is incomplete' });
  }

  try {
    const providerResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are an accountable low-pesticide agriculture operations advisor. Report constraints, evidence, uncertainty, owners, approvals, and rollback checks.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!providerResponse.ok) throw new Error(`OpenRouter returned ${providerResponse.status}`);
    const payload = await providerResponse.json();
    const result = payload?.choices?.[0]?.message?.content;
    if (typeof result !== 'string' || !result.trim()) throw new Error('OpenRouter returned no substantive content');

    const id = crypto.randomUUID();
    const resolvedModel = String(payload.model || model);
    const providerReceipt = { id: String(payload.id || ''), provider: 'openrouter', created: payload.created ?? null };
    await pool.query(
      `INSERT INTO application_ai_results(id,user_id,prompt,model,provider_receipt,result,usage)
       VALUES($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb)`,
      [id, req.user.id, prompt, resolvedModel, JSON.stringify(providerReceipt), result.trim(),
        payload.usage ? JSON.stringify(payload.usage) : null],
    );

    return res.json({ id, provider: 'openrouter', model: resolvedModel, result: result.trim(), usage: payload.usage ?? null });
  } catch (error) {
    console.error('OpenRouter request failed', error);
    return res.status(502).json({ error: 'OpenRouter request failed' });
  }
});

module.exports = router;
