const puppetSelect = document.getElementById('puppetSelect');
const queueList = document.getElementById('queueList');
const logPre = document.getElementById('log');
const varsList = document.getElementById('varsList');
const productURLInput = document.getElementById('productURL');
const loopsInput = document.getElementById('loops');
const importFileInput = document.getElementById('importFile');

let queue = [];
let running = false;
let cancelQueue = false;

function addVar(name = '', value = '') {
  const row = document.createElement('div');
  const nameInput = document.createElement('input');
  nameInput.placeholder = 'name';
  if (name) nameInput.value = name;
  const valueInput = document.createElement('input');
  valueInput.placeholder = 'value';
  if (value) valueInput.value = value;
  const del = document.createElement('button');
  del.textContent = 'Delete';
  del.onclick = () => row.remove();
  row.appendChild(nameInput);
  row.appendChild(valueInput);
  row.appendChild(del);
  varsList.appendChild(row);
}

function collectVars() {
  const vars = {};
  varsList.querySelectorAll('div').forEach(row => {
    const name = row.querySelector('input:nth-child(1)')?.value.trim();
    const val = row.querySelector('input:nth-child(2)')?.value || '';
    if (name) vars[name] = val;
  });
  return vars;
}

function varsToString(vars = {}) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
}

function loadVars(vars = {}) {
  varsList.innerHTML = '';
  Object.entries(vars).forEach(([k, v]) => addVar(k, v));
}

function setUIFromItem(item) {
  puppetSelect.value = item.puppetName;
  productURLInput.value = item.printifyProductURL || '';
  loopsInput.value = item.loops || 1;
  loadVars(item.variables || {});
}

function updateQueueUI() {
  queueList.innerHTML = '';
  queue.forEach((item, idx) => {
    const li = document.createElement('li');
    let text = `${idx + 1}. ${item.puppetName} (${item.state || 'queued'})`;
    const varsText = varsToString(item.variables);
    if (varsText) text += ` [${varsText}]`;
    li.textContent = text;
    li.style.cursor = 'pointer';
    li.onclick = () => setUIFromItem(item);
    queueList.appendChild(li);
  });
}

async function loadPuppets() {
  try {
    const res = await fetch('/getPuppets');
    const names = await res.json();
    if (Array.isArray(names)) {
      names.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        puppetSelect.appendChild(opt);
      });
    } else {
      const msg = names && names.error ? names.error : 'Invalid response';
      throw new Error(msg);
    }
  } catch (err) {
    log(`Error fetching puppets: ${err}`);
  }
}

function addToQueue() {
  const item = {
    puppetName: puppetSelect.value,
    printifyProductURL: productURLInput.value,
    loops: Number(loopsInput.value) || 1,
    variables: collectVars(),
    state: 'queued',
  };
  queue.push(item);
  updateQueueUI();
}

function runNow() {
  const item = {
    puppetName: puppetSelect.value,
    printifyProductURL: productURLInput.value,
    loops: Number(loopsInput.value) || 1,
    variables: collectVars(),
  };
  runItem(item);
}

async function runItem(item) {
  log(`Running ${item.puppetName}...`);
  try {
    const res = await fetch('/runPuppet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value);
      chunk.split(/\n\n/).forEach(line => {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (data === 'done') {
            log(`Finished ${item.puppetName}`);
          } else {
            log(data);
          }
        }
      });
    }
  } catch (err) {
    log(`Error: ${err}`);
  }
}

async function startQueue() {
  if (running) return;
  running = true;
  cancelQueue = false;
  for (const item of queue) {
    if (item.state !== 'queued') continue;
    if (cancelQueue) {
      item.state = 'stopped';
      updateQueueUI();
      continue;
    }
    item.state = 'running';
    setUIFromItem(item);
    updateQueueUI();
    await runItem(item);
    item.state = cancelQueue ? 'stopped' : 'finished';
    updateQueueUI();
    if (cancelQueue) break;
  }
  running = false;
}

function stopQueue() {
  if (!running) return;
  cancelQueue = true;
}

function exportQueue() {
  const data = queue.map(({ puppetName, printifyProductURL, loops, variables }) => ({
    puppetName,
    printifyProductURL,
    loops,
    variables,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'queue.json';
  a.click();
  URL.revokeObjectURL(url);
}

importFileInput?.addEventListener('change', ev => {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const items = JSON.parse(e.target.result);
      if (Array.isArray(items)) {
        queue = items.map(it => ({ ...it, state: 'queued' }));
        updateQueueUI();
      }
    } catch (err) {
      log(`Error importing queue: ${err}`);
    }
  };
  reader.readAsText(file);
  ev.target.value = '';
});

function log(msg) {
  logPre.textContent += msg + '\n';
  logPre.scrollTop = logPre.scrollHeight;
}

loadPuppets();
