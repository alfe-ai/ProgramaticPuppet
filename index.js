/* eslint-disable no-console */
'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');
const puppeteerSetup = require('puppetcore/config/puppeteerSetup');
const {
  sleep_helper,
  clickText,
  clickName,
  clickNth,
  clickNthName,
  clickTextCheckbox,
  setGlobalPage,
} = require('puppetcore/flow/puppet_helpers');

let persistentPage = null;

function killChromium() {
  const cmds = [
    'pkill -9 -f chromium || true',
    'pkill -9 -f chrome || true',
    'pkill -9 -f chromium-browser || true',
  ];
  for (const cmd of cmds) {
    try {
      execSync(cmd, { stdio: 'ignore' });
    } catch {
      /* ignore errors */
    }
  }
  persistentPage = null;
}

async function getPersistentPage() {
  if (persistentPage && !persistentPage.isClosed()) {
    return persistentPage;
  }
  persistentPage = await puppeteerSetup();
  setGlobalPage(persistentPage);
  return persistentPage;
}

const DESCRIPTION_HTML = '<p><strong>Unisex Heavy Cotton Tee</strong></p> <p>Made with medium fabric (5.3 oz/yd&sup2; (180 g/m&sup2;)) consisting of 100% cotton for year-round comfort that is sustainable and highly durable. The classic fit of this shirt ensures a comfy, relaxed wear.</p> <p>Made using 100% US cotton that is ethically grown and harvested.</p> <p><strong>Size Table</strong><br />Size S: Width: 18.00 in, Length: 28.00 in, Sleeve length: 15.10 in, Size tolerance: 1.50 in<br />Size M: Width: 20.00 in, Length: 29.00 in, Sleeve length: 16.50 in, Size tolerance: 1.50 in<br />Size L: Width: 22.00 in, Length: 30.00 in, Sleeve length: 18.00 in, Size tolerance: 1.50 in<br />Size XL: Width: 24.00 in, Length: 31.00 in, Sleeve length: 19.50 in, Size tolerance: 1.50 in<br />Size 2XL: Width: 26.00 in, Length: 32.00 in, Sleeve length: 21.00 in, Size tolerance: 1.50 in<br />Size 3XL: Width: 28.00 in, Length: 33.00 in, Sleeve length: 22.40 in, Size tolerance: 1.50 in<br />Size 4XL: Width: 30.00 in, Length: 34.00 in, Sleeve length: 23.70 in, Size tolerance: 1.50 in<br />Size 5XL: Width: 32.00 in, Length: 35.00 in, Sleeve length: 25.00 in, Size tolerance: 1.50 in</p>';

function htmlToSelector(html) {
  if (typeof html !== 'string') return html;
  const trimmed = html.trim();
  if (!trimmed.startsWith('<')) {
    if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return `#${trimmed}`;
    }
    return html;
  }

  const idMatch = trimmed.match(/\bid="([^"]+)"/);
  if (idMatch) {
    return `#${idMatch[1]}`;
  }
  const nameMatch = trimmed.match(/\bname="([^"]+)"/);
  if (nameMatch) {
    return `[name="${nameMatch[1]}"]`;
  }

  const ariaMatch = trimmed.match(/\baria-label="([^"]+)"/);
  if (ariaMatch) {
    return `[aria-label="${ariaMatch[1]}"]`;
  }

  const titleMatch = trimmed.match(/\btitle="([^"]+)"/);
  if (titleMatch) {
    return `[title="${titleMatch[1]}"]`;
  }

  const testIdMatch = trimmed.match(/\bdata-testid="([^"]+)"/);
  if (testIdMatch) {
    return `[data-testid="${testIdMatch[1]}"]`;
  }

  const classMatch = trimmed.match(/\bclass="([^"]+)"/);
  if (classMatch) {
    return '.' + classMatch[1].trim().split(/\s+/).join('.');
  }
  const tagMatch = trimmed.match(/^<([a-z0-9-]+)/i);
  if (tagMatch) {
    return tagMatch[1];
  }

  return html;
}

async function runSteps(opts, logger = console.log) {
  let { steps = [], closeBrowser = false, loops = 1, printifyProductURL = '' } = opts || {};

  killChromium();

  logger('[ProgramaticPuppet] closeBrowser:', closeBrowser);
  logger('[ProgramaticPuppet] loops:', loops);
  if (printifyProductURL) {
    logger('[ProgramaticPuppet] printifyProductURL:', printifyProductURL);
  }

  let page;
  let finishedEarly = false;
  for (let run = 0; run < loops; run++) {
    finishedEarly = false;
    page = await getPersistentPage();
    setGlobalPage(page);

    for (let i = 0; i < steps.length; ) {
      const step = steps[i];
      logger(`[ProgramaticPuppet] Executing step ${i + 1}/${steps.length}:`, step);
      const type = step.type;
      let jumped = false;
      if (type === 'loadURL') {
        await page.goto(step.url, { waitUntil: 'networkidle2', timeout: 120_000 });
      } else if (type === 'loadPrintifyProductURL') {
        if (!printifyProductURL) {
          logger('[ProgramaticPuppet] printifyProductURL not set');
        } else {
          await page.goto(printifyProductURL, { waitUntil: 'networkidle2', timeout: 120_000 });
        }
      } else if (type === 'click') {
        const selector = htmlToSelector(step.selector);
        try {
          await page.click(selector);
        } catch (err) {
          let clickedByText = false;
          const textMatch = String(step.selector).match(/>([^<]+)</);
          if (textMatch) {
            try {
              await clickText(textMatch[1].trim());
              clickedByText = true;
            } catch {
              /* ignore */
            }
          }
          if (!clickedByText) {
            const target = Number(step.skipTo);
            if (!Number.isNaN(target) && target > 0 && target <= steps.length) {
              i = target - 1;
              jumped = true;
            } else {
              throw err;
            }
          }
        }
      } else if (type === 'clickText') {
        await clickText(step.text);
      } else if (type === 'clickTextCheckbox') {
        await clickTextCheckbox(step.text);
      } else if (type === 'clickName') {
        await clickName(step.name);
      } else if (type === 'clickNth') {
        const selector = htmlToSelector(step.selector);
        await clickNth(selector, Number(step.index) || 1);
      } else if (type === 'clickNthName') {
        await clickNthName(step.name, Number(step.index) || 1);
      } else if (type === 'mouseClickCoordinates') {
        const x = Number(step.x) || 0;
        const y = Number(step.y) || 0;
        await page.mouse.move(x, y);
        await page.mouse.click(x, y);
      } else if (type === 'selectAllText') {
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
      } else if (type === 'keyPress') {
        const rawKey = step.key || 'Backspace';
        const lower = String(rawKey).toLowerCase();
        const keyMap = {
          backspace: 'Backspace',
          tab: 'Tab',
          enter: 'Enter',
          escape: 'Escape',
          esc: 'Escape',
          space: 'Space',
          arrowleft: 'ArrowLeft',
          arrowright: 'ArrowRight',
          arrowup: 'ArrowUp',
          arrowdown: 'ArrowDown',
        };
        const mapped = keyMap[lower];
        const key = mapped || (rawKey.length > 1 ? rawKey.charAt(0).toUpperCase() + rawKey.slice(1) : rawKey);
        await page.keyboard.press(key);
      } else if (type === 'tabNTimes') {
        const count = Number(step.times) || 1;
        for (let j = 0; j < count; j++) {
          await page.keyboard.press('Tab');
          await sleep_helper(0.1);
        }
      } else if (type === 'ebayUploadImage') {
        const imagePaths = String(step.paths || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const itemId = step.itemId || '';
        const { epsData, csrfMap } = await page.evaluate(() => {
          function extract(obj) {
            if (!obj || typeof obj !== 'object') return { epsData: null, csrfMap: null };
            return {
              epsData: obj.model?.epsData || null,
              csrfMap: obj.csrf || obj.csrfTokenMap || null,
            };
          }

          const tried = new Set();
          const merge = (a, b) => ({
            epsData: a.epsData || b.epsData,
            csrfMap: a.csrfMap || b.csrfMap,
          });

          let result = { epsData: null, csrfMap: null };
          const tryObj = obj => {
            if (!obj || tried.has(obj)) return;
            tried.add(obj);
            result = merge(result, extract(obj));
          };

          // Common known globals
          tryObj(window.$fehelix_C);
          tryObj(window.__FEHelix_C);

          // Fallback: scan other window properties
          for (const key of Object.keys(window)) {
            if (result.epsData && result.csrfMap) break;
            try {
              tryObj(window[key]);
            } catch {}
          }
          return result;
        });
        let csrfToken = null;
        if (csrfMap) {
          for (const key of Object.keys(csrfMap)) {
            if (key.includes('EpsBasic')) {
              csrfToken = csrfMap[key];
              break;
            }
          }
        }
        if (!epsData?.endpoint || !csrfToken) {
          throw new Error('EPS info missing');
        }
        const cookieHeader = (await page.cookies())
          .map(c => `${c.name}=${c.value}`)
          .join('; ');
        const srtRes = await fetch('https://www.ebay.com/lstng/gql?dummy=1', {
          headers: { Cookie: cookieHeader },
        });
        const srtToken = srtRes.headers.get('x-ebay-c-csrf-token');
        const uploadUrl = `${epsData.endpoint}?srt=${srtToken}`;
        for (const img of imagePaths) {
          const form = new FormData();
          form.append('item_id', itemId);
          form.append('picture', fs.createReadStream(img));
          const res = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              Cookie: cookieHeader,
              'x-csrf-token': csrfToken,
              Accept: 'application/json',
            },
            body: form,
          });
          const data = await res.json();
          logger(`[ProgramaticPuppet] Uploaded ${img}: ${JSON.stringify(data)}`);
        }
      } else if (type === 'uiUploadFile') {
        const imagePaths = String(step.paths || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const selector = step.selector || 'input[type="file"]';
        await page.setInputFiles(selector, imagePaths);
        logger(
          `[ProgramaticPuppet] Uploaded via UI: ${imagePaths.join(', ')}`,
        );
      } else if (type === 'type') {
        let textToType = step.text || '';
        let selector = step.selector || '';
        if (!textToType) {
          textToType = String(selector || '');
          selector = '';
        }
        const target = selector ? htmlToSelector(selector) : null;
        for (const ch of textToType) {
          if (target) {
            await page.type(target, ch, { delay: 500 });
          } else {
            await page.keyboard.type(ch, { delay: 500 });
          }
          logger(`[ProgramaticPuppet] Typed letter: ${ch}`);
        }
      } else if (type === 'setDescription') {
        const selector = htmlToSelector(step.selector);
        await page.evaluate(
          (sel, html) => {
            const el = document.querySelector(sel);
            if (el) {
              el.value = html;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          },
          selector,
          DESCRIPTION_HTML,
        );
      } else if (type === 'wait') {
        await sleep_helper(Number(step.seconds) || 1);
      } else if (type === 'log') {
        logger(step.message);
      } else if (type === 'sectionTitle') {
        logger(`[ProgramaticPuppet] Section: ${step.title}`);
      } else if (type === 'screenshot') {
        const filePath = step.path || `screenshot-${Date.now()}.png`;
        await page.screenshot({ path: filePath, fullPage: true });
      } else if (type === 'scrollBottom') {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await sleep_helper(1);
      } else if (type === 'checkPageUrl') {
        const current = page.url();
        if (current !== step.url) {
          const target = Number(step.skipTo);
          if (!Number.isNaN(target) && target > 0 && target <= steps.length) {
            i = target - 1;
            jumped = true;
          }
        }
      } else if (type === 'end') {
        finishedEarly = true;
        break;
      }
      if (!jumped) {
        i += 1;
      }
    }

    if (closeBrowser && page) {
      try {
        await page.browser().close();
      } catch (e) {
        logger('Error closing browser:' + e);
      }
      persistentPage = null;
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3005;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/run', async (req, res) => {
  let steps = [];
  let closeBrowser = false;
  let loops = 1;
  let printifyProductURL = '';
  if (Array.isArray(req.body)) {
    steps = req.body;
  } else if (req.body && Array.isArray(req.body.steps)) {
    steps = req.body.steps;
    closeBrowser = !!req.body.closeBrowser;
    loops = Number(req.body.loops) || 1;
    printifyProductURL = req.body.printifyProductURL || '';
  }
  console.log('[ProgramaticPuppet] Received steps:', JSON.stringify(steps));
  try {
    await runSteps({ steps, closeBrowser, loops, printifyProductURL });
    res.json({ status: 'done' });
  } catch (err) {
    console.error('Error while running steps:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.get('/getPuppets', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'export.json'), 'utf8'));
    res.json(Object.keys(data));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/runPuppet', async (req, res) => {
  let puppetName = req.body && req.body.puppetName;
  if (!puppetName) {
    return res.status(400).json({ error: 'puppetName required' });
  }
  let printifyProductURL = req.body.printifyProductURL || '';
  let loopsOverride = req.body.loops;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'export.json'), 'utf8'));
    const puppet = data[puppetName];
    if (!puppet) {
      return res.status(404).json({ error: 'puppet not found' });
    }
    const steps = puppet.steps || [];
    const closeBrowser = !!puppet.closeBrowser;
    const loops = Number(loopsOverride) || (puppet.loopEnabled ? Number(puppet.loopCount) || 1 : 1);
    const finalURL = printifyProductURL || puppet.printifyProductURL || '';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const logger = msg => {
      res.write(`data: ${String(msg).replace(/\n/g, ' ')}\n\n`);
      console.log(msg);
    };

    try {
      await runSteps({ steps, closeBrowser, loops, printifyProductURL: finalURL }, logger);
      res.write('data: done\n\n');
    } catch (err) {
      res.write(`data: error: ${err}\n\n`);
    }
    res.end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/resetBrowser', async (req, res) => {
  if (persistentPage) {
    try {
      await persistentPage.browser().close();
      res.json({ status: 'closed' });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    } finally {
      persistentPage = null;
    }
  } else {
    res.json({ status: 'closed' });
  }
});

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.cert')),
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`[ProgramaticPuppet] Server running on https://localhost:${PORT}`);
});
