#!/usr/bin/env node
/**
 * MTG Card Vision Eval
 *
 * Compares card identification accuracy and cost across:
 *   - Claude vision (Haiku + Sonnet, two prompts each)
 *   - OCR → Scryfall direct (zero Claude cost)
 *   - OCR → Claude Haiku text (much cheaper than vision)
 *
 * Setup:
 *   1. Add card images to eval/images/ (JPG, PNG, WEBP, or HEIC)
 *   2. Update eval/test-cases.json: [{ "image": "filename.heic", "expected": "Card Name" }]
 *   3. Run: node eval/run.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Anthropic = require('@anthropic-ai/sdk');
const Tesseract = require('tesseract.js');
const heicConvert = require('heic-convert');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VISION_MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', inputCostPerMTok: 0.80, outputCostPerMTok: 4.00 },
  { id: 'claude-sonnet-4-20250514', label: 'Sonnet 4 (prod)', inputCostPerMTok: 3.00, outputCostPerMTok: 15.00 },
];

const VISION_PROMPTS = [
  { label: 'minimal', text: 'What is the name of this Magic: The Gathering card? Reply with only the card name, nothing else.' },
  { label: 'explicit', text: 'You are identifying Magic: The Gathering cards. Look at the card name printed at the top of the card. Reply with only that exact name, nothing else.' },
];

const HAIKU = VISION_MODELS[0];

const IMAGES_DIR = path.join(__dirname, 'images');
const TEST_CASES_PATH = path.join(__dirname, 'test-cases.json');

// ── Image loading ────────────────────────────────────────────

async function loadImage(imagePath) {
  const ext = path.extname(imagePath).slice(1).toLowerCase();
  if (ext === 'heic' || ext === 'heif') {
    const inputBuffer = fs.readFileSync(imagePath);
    const outputBuffer = await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 0.92 });
    return { base64: Buffer.from(outputBuffer).toString('base64'), mediaType: 'image/jpeg' };
  }
  const mediaType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return { base64: fs.readFileSync(imagePath).toString('base64'), mediaType };
}

// ── Identification backends ──────────────────────────────────

async function identifyByVision(imagePath, modelId, promptText) {
  const { base64, mediaType } = await loadImage(imagePath);
  const start = Date.now();
  const message = await anthropic.messages.create({
    model: modelId,
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: promptText },
      ],
    }],
  });
  return {
    name: message.content[0].text.trim(),
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    latencyMs: Date.now() - start,
  };
}

async function ocrExtract(imagePath) {
  const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', { logger: () => {} });
  // Card name is typically the first non-empty line
  return text.split('\n').map(l => l.trim()).filter(Boolean)[0] || '';
}

async function identifyByOCRScryfall(imagePath) {
  const start = Date.now();
  const ocrName = await ocrExtract(imagePath);
  try {
    const { data } = await axios.get(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(ocrName)}`
    );
    return { name: data.name, inputTokens: 0, outputTokens: 0, latencyMs: Date.now() - start };
  } catch {
    return { name: ocrName, inputTokens: 0, outputTokens: 0, latencyMs: Date.now() - start };
  }
}

async function identifyByOCRHaiku(imagePath) {
  const start = Date.now();
  const ocrText = await ocrExtract(imagePath);
  const message = await anthropic.messages.create({
    model: HAIKU.id,
    max_tokens: 50,
    messages: [{
      role: 'user',
      content: `The following text was extracted via OCR from a Magic: The Gathering card. What is the card name? Reply with only the card name.\n\nOCR text:\n${ocrText}`,
    }],
  });
  return {
    name: message.content[0].text.trim(),
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    latencyMs: Date.now() - start,
  };
}

// ── Eval configs ─────────────────────────────────────────────

const CONFIGS = [
  ...VISION_MODELS.flatMap(model =>
    VISION_PROMPTS.map(prompt => ({
      label: `${model.label} vision / ${prompt.label}`,
      inputCostPerMTok: model.inputCostPerMTok,
      outputCostPerMTok: model.outputCostPerMTok,
      identify: (imagePath) => identifyByVision(imagePath, model.id, prompt.text),
    }))
  ),
  {
    label: 'OCR → Scryfall (no Claude)',
    inputCostPerMTok: 0,
    outputCostPerMTok: 0,
    identify: identifyByOCRScryfall,
  },
  {
    label: `OCR → ${HAIKU.label} text`,
    inputCostPerMTok: HAIKU.inputCostPerMTok,
    outputCostPerMTok: HAIKU.outputCostPerMTok,
    identify: identifyByOCRHaiku,
  },
];

// ── Helpers ──────────────────────────────────────────────────

function isMatch(got, expected) {
  return got.toLowerCase().trim() === expected.toLowerCase().trim();
}

function calcCostUSD(inputTokens, outputTokens, cfg) {
  return (inputTokens / 1_000_000) * cfg.inputCostPerMTok
       + (outputTokens / 1_000_000) * cfg.outputCostPerMTok;
}

function printTable(results) {
  const cols = ['Configuration', 'Accuracy', 'Avg In Tok', 'Avg Out Tok', 'Total Cost', 'Avg Latency'];
  const rows = results.map(r => [
    r.label,
    `${r.accuracy}% (${r.correct}/${r.total})`,
    String(r.avgInputTokens),
    String(r.avgOutputTokens),
    `$${r.totalCostUSD}`,
    `${r.avgLatencyMs}ms`,
  ]);
  const widths = cols.map((c, i) => Math.max(c.length, ...rows.map(r => r[i].length)));
  const sep = '+-' + widths.map(w => '-'.repeat(w)).join('-+-') + '-+';
  const fmt = row => '| ' + row.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  console.log(sep);
  console.log(fmt(cols));
  console.log(sep);
  rows.forEach(r => console.log(fmt(r)));
  console.log(sep);
}

// ── Main ─────────────────────────────────────────────────────

async function runEval() {
  if (!fs.existsSync(TEST_CASES_PATH)) {
    console.error('Missing eval/test-cases.json');
    process.exit(1);
  }

  const testCases = JSON.parse(fs.readFileSync(TEST_CASES_PATH, 'utf8'));
  const available = testCases.filter(tc => {
    const exists = fs.existsSync(path.join(IMAGES_DIR, tc.image));
    if (!exists) console.warn(`[SKIP] Image not found: eval/images/${tc.image}`);
    return exists;
  });

  if (available.length === 0) {
    console.log('\nNo images found in eval/images/.');
    return;
  }

  console.log(`\nRunning eval: ${available.length} cards × ${CONFIGS.length} configs`);
  console.log(`Total API calls: ${available.length * CONFIGS.filter(c => c.inputCostPerMTok > 0 || c.label.includes('Scryfall')).length}\n`);

  const allResults = [];

  for (const cfg of CONFIGS) {
    process.stdout.write(`Testing ${cfg.label} ...`);
    let correct = 0, totalInput = 0, totalOutput = 0, totalLatency = 0;
    const details = [];

    for (const tc of available) {
      const imagePath = path.join(IMAGES_DIR, tc.image);
      try {
        const result = await cfg.identify(imagePath);
        const hit = isMatch(result.name, tc.expected);
        if (hit) correct++;
        totalInput += result.inputTokens;
        totalOutput += result.outputTokens;
        totalLatency += result.latencyMs;
        details.push({ image: tc.image, expected: tc.expected, got: result.name, hit });
      } catch (err) {
        console.error(`\n  Error on ${tc.image}: ${err.message}`);
        details.push({ image: tc.image, expected: tc.expected, got: 'ERROR', hit: false });
      }
    }

    const n = details.filter(d => d.got !== 'ERROR').length;
    const accuracy = n > 0 ? ((correct / n) * 100).toFixed(1) : '0.0';

    allResults.push({
      label: cfg.label,
      accuracy,
      correct,
      total: n,
      avgInputTokens: n > 0 ? Math.round(totalInput / n) : 0,
      avgOutputTokens: n > 0 ? Math.round(totalOutput / n) : 0,
      totalCostUSD: calcCostUSD(totalInput, totalOutput, cfg).toFixed(6),
      avgLatencyMs: n > 0 ? Math.round(totalLatency / n) : 0,
      details,
    });

    console.log(` done (${accuracy}% accuracy)`);
  }

  console.log('\n--- Results ---\n');
  printTable(allResults);

  for (const r of allResults) {
    const misses = r.details.filter(d => !d.hit && d.got !== 'ERROR');
    if (misses.length > 0) {
      console.log(`\nMisses [${r.label}]:`);
      misses.forEach(m => console.log(`  ${m.image}: expected "${m.expected}", got "${m.got}"`));
    }
  }

  const outPath = path.join(__dirname, `results-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));
  console.log(`\nFull results saved → eval/${path.basename(outPath)}\n`);
}

runEval().catch(err => {
  console.error('Eval failed:', err.message);
  process.exit(1);
});
