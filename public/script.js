const stepsDiv = document.getElementById('steps');
const puppetListDiv = document.getElementById('puppetList');
const jsonArea = document.getElementById('configJson');
const loopEnabledCheckbox = document.getElementById('loopEnabled');
const loopCountInput = document.getElementById('loopCount');
const printifyProductURLInput = document.getElementById('printifyProductURL');
const stepTypes = [
  'loadURL',
  'loadPrintifyProductURL',
  'click',
  'clickText',
  'clickTextCheckbox',
  'clickName',
  'clickNth',
  'clickNthName',
  'setDescription',
  'type',
  'wait',
  'log',
  'sectionTitle',
  'checkPageUrl',
  'screenshot',
  'scrollBottom',
  'mouseClickCoordinates',
  'selectAllText',
  'keyPress',
  'tabNTimes',
  'end'
];
let dragSource = null;

let puppets = JSON.parse(localStorage.getItem('puppets') || '{}');
let currentPuppet = null;

// normalize older stored format
Object.keys(puppets).forEach(name => {
  if (Array.isArray(puppets[name])) {
    puppets[name] = {
      steps: puppets[name],
      closeBrowser: false,
      loopEnabled: false,
      loopCount: 1,
      printifyProductURL: ''
    };
  } else {
    puppets[name].steps = puppets[name].steps || [];
    puppets[name].closeBrowser = !!puppets[name].closeBrowser;
    puppets[name].loopEnabled = !!puppets[name].loopEnabled;
    puppets[name].loopCount = Number(puppets[name].loopCount) || 1;
    puppets[name].printifyProductURL = puppets[name].printifyProductURL || '';
  }
});

function renumberSteps() {
  document.querySelectorAll('.step').forEach((div, idx) => {
    let span = div.querySelector('.step-number');
    if (!span) {
      span = document.createElement('span');
      span.className = 'step-number';
      span.style.marginRight = '4px';
      div.insertBefore(span, div.firstChild);
    }
    span.textContent = `${idx + 1}.`;
  });
}

function makeDraggable(div) {
  div.draggable = true;
  div.addEventListener('dragstart', () => {
    dragSource = div;
  });
  div.addEventListener('dragover', e => {
    e.preventDefault();
    div.classList.add('drag-over');
  });
  div.addEventListener('dragleave', () => {
    div.classList.remove('drag-over');
  });
  div.addEventListener('drop', e => {
    e.preventDefault();
    div.classList.remove('drag-over');
    if (dragSource && dragSource !== div) {
      const children = Array.from(stepsDiv.querySelectorAll('.step'));
      const srcIndex = children.indexOf(dragSource);
      const destIndex = children.indexOf(div);
      if (srcIndex < destIndex) {
        stepsDiv.insertBefore(dragSource, div.nextSibling);
      } else {
        stepsDiv.insertBefore(dragSource, div);
      }
      renumberSteps();
    }
  });
  div.addEventListener('dragend', () => {
    div.classList.remove('drag-over');
  });
}

function addFields(div, step = {}) {
  if (step.type === 'checkPageUrl') {
    const urlInput = document.createElement('input');
    urlInput.placeholder = 'page URL';
    urlInput.className = 'check-url';
    if (step.url) urlInput.value = step.url;
    div.appendChild(urlInput);

    const skipInput = document.createElement('input');
    skipInput.placeholder = 'step # on fail';
    skipInput.className = 'check-step';
    skipInput.type = 'number';
    if (step.skipTo) skipInput.value = step.skipTo;
    skipInput.style.width = '60px';
    div.appendChild(skipInput);
  } else if (step.type === 'click') {
    const selectorInput = document.createElement('input');
    selectorInput.placeholder = 'CSS selector';
    selectorInput.className = 'click-selector';
    if (step.selector) selectorInput.value = step.selector;
    div.appendChild(selectorInput);

    const skipInput = document.createElement('input');
    skipInput.placeholder = 'step # on fail';
    skipInput.className = 'click-step';
    skipInput.type = 'number';
    if (step.skipTo) skipInput.value = step.skipTo;
    skipInput.style.width = '60px';
    div.appendChild(skipInput);
  } else if (step.type === 'clickNth') {
    const selectorInput = document.createElement('input');
    selectorInput.placeholder = 'CSS selector';
    selectorInput.className = 'click-nth-selector';
    if (step.selector) selectorInput.value = step.selector;
    div.appendChild(selectorInput);

    const indexInput = document.createElement('input');
    indexInput.placeholder = 'index';
    indexInput.className = 'click-nth-index';
    indexInput.type = 'number';
    if (step.index) indexInput.value = step.index;
    indexInput.style.width = '60px';
    div.appendChild(indexInput);
  } else if (step.type === 'clickNthName') {
    const nameInput = document.createElement('input');
    nameInput.placeholder = 'element name';
    nameInput.className = 'click-nth-name-name';
    if (step.name) nameInput.value = step.name;
    div.appendChild(nameInput);

    const indexInput = document.createElement('input');
    indexInput.placeholder = 'index';
    indexInput.className = 'click-nth-name-index';
    indexInput.type = 'number';
    if (step.index) indexInput.value = step.index;
    indexInput.style.width = '60px';
    div.appendChild(indexInput);
  } else if (step.type === 'mouseClickCoordinates') {
    const xInput = document.createElement('input');
    xInput.placeholder = 'X';
    xInput.className = 'mouse-x';
    xInput.type = 'number';
    if (step.x !== undefined) xInput.value = step.x;
    xInput.style.width = '60px';
    div.appendChild(xInput);

    const yInput = document.createElement('input');
    yInput.placeholder = 'Y';
    yInput.className = 'mouse-y';
    yInput.type = 'number';
    if (step.y !== undefined) yInput.value = step.y;
    yInput.style.width = '60px';
    div.appendChild(yInput);
  } else if (step.type === 'setDescription') {
    const selectorInput = document.createElement('input');
    selectorInput.placeholder = 'CSS selector';
    selectorInput.className = 'set-desc-selector';
    if (step.selector) selectorInput.value = step.selector;
    div.appendChild(selectorInput);
  } else if (step.type === 'keyPress') {
    const keyInput = document.createElement('input');
    keyInput.placeholder = 'key';
    keyInput.className = 'key-input';
    if (step.key) keyInput.value = step.key;
    div.appendChild(keyInput);
  } else if (step.type === 'tabNTimes') {
    const timesInput = document.createElement('input');
    timesInput.placeholder = 'times';
    timesInput.className = 'tab-times';
    timesInput.type = 'number';
    if (step.times) timesInput.value = step.times;
    timesInput.style.width = '60px';
    div.appendChild(timesInput);
  } else if (step.type === 'end' || step.type === 'scrollBottom' || step.type === 'selectAllText' || step.type === 'loadPrintifyProductURL') {
    // no additional fields
  } else {
    const input = document.createElement('input');
    if (step.type === 'sectionTitle') {
      input.placeholder = 'section title';
    } else if (step.type === 'clickName') {
      input.placeholder = 'element name';
    } else if (step.type === 'clickTextCheckbox') {
      input.placeholder = 'checkbox text';
    } else {
      input.placeholder = 'value (CSS selector for click/type, text for clickText/clickTextCheckbox, screenshot path)';
    }
    if (step.url) input.value = step.url;
    else if (step.selector) {
      input.value = step.selector + (step.text ? '|' + step.text : '');
    } else if (step.type === 'clickText' && step.text) {
      input.value = step.text;
    } else if (step.type === 'clickTextCheckbox' && step.text) {
      input.value = step.text;
    } else if (step.type === 'clickName' && step.name) {
      input.value = step.name;
    } else if (step.seconds) input.value = step.seconds;
    else if (step.message) input.value = step.message;
    else if (step.path) input.value = step.path;
    else if (step.title) input.value = step.title;
    div.appendChild(input);
  }
}

function addStep(step = {}) {
  const div = document.createElement('div');
  div.className = 'step';
  const select = document.createElement('select');
  stepTypes.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    if (step.type === t) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    // remove existing inputs
    Array.from(div.querySelectorAll('input')).forEach(el => el.remove());
    addFields(div, { type: select.value });
  });
  div.appendChild(select);
  addFields(div, step);
  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.onclick = () => { div.remove(); renumberSteps(); };
  div.appendChild(delBtn);
  stepsDiv.appendChild(div);
  makeDraggable(div);
  renumberSteps();
}

function collectSteps() {
  const result = [];
  document.querySelectorAll('.step').forEach(div => {
    const type = div.querySelector('select').value;
    if (type === 'checkPageUrl') {
      const url = div.querySelector('.check-url')?.value || '';
      const skip = Number(div.querySelector('.check-step')?.value || 0);
      result.push({ type, url, skipTo: skip });
    } else if (type === 'click') {
      const sel = div.querySelector('.click-selector')?.value || '';
      const skip = Number(div.querySelector('.click-step')?.value || 0);
      result.push({ type, selector: sel, skipTo: skip });
  } else if (type === 'clickNth') {
    const sel = div.querySelector('.click-nth-selector')?.value || '';
    const idx = Number(div.querySelector('.click-nth-index')?.value || 1);
    result.push({ type, selector: sel, index: idx });
  } else if (type === 'clickNthName') {
    const name = div.querySelector('.click-nth-name-name')?.value || '';
    const idx = Number(div.querySelector('.click-nth-name-index')?.value || 1);
    result.push({ type, name, index: idx });
  } else if (type === 'mouseClickCoordinates') {
    const x = Number(div.querySelector('.mouse-x')?.value || 0);
    const y = Number(div.querySelector('.mouse-y')?.value || 0);
    result.push({ type, x, y });
  } else if (type === 'setDescription') {
    const sel = div.querySelector('.set-desc-selector')?.value || '';
    result.push({ type, selector: sel });
  } else if (type === 'keyPress') {
    const rawKey = div.querySelector('.key-input')?.value || 'Backspace';
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
    const key =
      mapped || (rawKey.length > 1
        ? rawKey.charAt(0).toUpperCase() + rawKey.slice(1)
        : rawKey);
    result.push({ type, key });
  } else if (type === 'tabNTimes') {
    const count = Number(div.querySelector('.tab-times')?.value || 1);
    result.push({ type, times: count });
  } else {
      const val = div.querySelector('input')?.value || '';
      if (type === 'loadURL') result.push({ type, url: val });
      else if (type === 'clickText') result.push({ type, text: val });
      else if (type === 'clickTextCheckbox') result.push({ type, text: val });
      else if (type === 'clickName') result.push({ type, name: val });
      else if (type === 'type') result.push({ type, selector: val.split('|')[0], text: val.split('|')[1] || '' });
      else if (type === 'wait') result.push({ type, seconds: val });
      else if (type === 'log') result.push({ type, message: val });
      else if (type === 'sectionTitle') result.push({ type, title: val });
      else if (type === 'screenshot') result.push({ type, path: val });
      else if (type === 'scrollBottom' || type === 'end' || type === 'selectAllText' || type === 'loadPrintifyProductURL') result.push({ type });
    }
  });
  return result;
}

function loadSteps(steps) {
  stepsDiv.innerHTML = '';
  steps.forEach(s => addStep(s));
  renumberSteps();
}

function updateSidebar() {
  puppetListDiv.innerHTML = '';
  Object.keys(puppets).forEach(name => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (name === currentPuppet ? ' active' : '');
    tab.onclick = () => switchPuppet(name);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = puppets[name].closeBrowser;
    checkbox.onchange = e => {
      puppets[name].closeBrowser = checkbox.checked;
      savePuppets();
      e.stopPropagation();
    };

    tab.appendChild(checkbox);
    tab.appendChild(document.createTextNode(' ' + name));
    puppetListDiv.appendChild(tab);
  });
}

function switchPuppet(name) {
  currentPuppet = name;
  updateSidebar();
  loadSteps(puppets[name].steps || []);
  if (loopEnabledCheckbox) loopEnabledCheckbox.checked = !!puppets[name].loopEnabled;
  if (loopCountInput) loopCountInput.value = puppets[name].loopCount || 1;
  if (printifyProductURLInput) printifyProductURLInput.value = puppets[name].printifyProductURL || '';
}

function addPuppet() {
  const name = prompt('Puppet name?');
  if (!name) return;
  if (!puppets[name]) {
    puppets[name] = { steps: [], closeBrowser: false, loopEnabled: false, loopCount: 1, printifyProductURL: '' };
  }
  switchPuppet(name);
  savePuppets();
}

function renamePuppet() {
  if (!currentPuppet) return;
  const newName = prompt('New name?', currentPuppet);
  if (!newName || newName === currentPuppet) return;
  if (puppets[newName]) {
    alert('A puppet with that name already exists');
    return;
  }
  puppets[newName] = puppets[currentPuppet];
  delete puppets[currentPuppet];
  currentPuppet = newName;
  savePuppets();
  updateSidebar();
}

function savePuppets() {
  localStorage.setItem('puppets', JSON.stringify(puppets));
}

function saveCurrentPuppet() {
  if (!currentPuppet) return;
  puppets[currentPuppet].steps = collectSteps();
  puppets[currentPuppet].loopEnabled = loopEnabledCheckbox.checked;
  puppets[currentPuppet].loopCount = Number(loopCountInput.value) || 1;
  puppets[currentPuppet].printifyProductURL = printifyProductURLInput.value || '';
  savePuppets();
  alert('Saved');
}

async function runSteps() {
  const steps = collectSteps();
  const statusDiv = document.getElementById('status');
  if (statusDiv) statusDiv.textContent = 'Running...';
  try {
    const res = await fetch('/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steps,
        closeBrowser: puppets[currentPuppet].closeBrowser,
        loops: loopEnabledCheckbox.checked ? Number(loopCountInput.value) || 1 : 1,
        printifyProductURL: puppets[currentPuppet].printifyProductURL || ''
      })
    });
    const data = await res.json();
    if (statusDiv) statusDiv.textContent = data.status || JSON.stringify(data);
  } catch (err) {
    if (statusDiv) statusDiv.textContent = 'Error: ' + err;
  }
}

function exportJSON() {
  saveCurrentPuppet();
  const sanitized = JSON.parse(JSON.stringify(puppets));
  Object.keys(sanitized).forEach(name => {
    sanitized[name].steps = sanitized[name].steps.map(step => {
      if (
        step.type === 'type' &&
        step.selector &&
        step.selector.trim() === '#password'
      ) {
        delete step.text;
      }
      return step;
    });
    sanitized[name].loopEnabled = !!sanitized[name].loopEnabled;
    sanitized[name].loopCount = Number(sanitized[name].loopCount) || 1;
    sanitized[name].printifyProductURL = sanitized[name].printifyProductURL || '';
  });
  jsonArea.value = JSON.stringify(sanitized, null, 2);
}

function importJSON() {
  try {
    const obj = JSON.parse(jsonArea.value || '{}');
    if (typeof obj === 'object' && obj) {
      puppets = obj;
      Object.keys(puppets).forEach(name => {
        if (Array.isArray(puppets[name])) {
          puppets[name] = { steps: puppets[name], closeBrowser: false, loopEnabled: false, loopCount: 1, printifyProductURL: '' };
        } else {
          puppets[name].steps = puppets[name].steps || [];
          puppets[name].closeBrowser = !!puppets[name].closeBrowser;
          puppets[name].loopEnabled = !!puppets[name].loopEnabled;
          puppets[name].loopCount = Number(puppets[name].loopCount) || 1;
          puppets[name].printifyProductURL = puppets[name].printifyProductURL || '';
        }
      });
      savePuppets();
      const first = Object.keys(puppets)[0];
      if (first) switchPuppet(first);
      alert('Imported');
    }
  } catch (err) {
    alert('Invalid JSON');
  }
}

if (Object.keys(puppets).length === 0) {
  puppets['default'] = { steps: [], closeBrowser: false, loopEnabled: false, loopCount: 1, printifyProductURL: '' };
}
switchPuppet(Object.keys(puppets)[0]);
