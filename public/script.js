const stepsDiv = document.getElementById('steps');
const puppetListDiv = document.getElementById('puppetList');
const jsonArea = document.getElementById('configJson');
const loopEnabledCheckbox = document.getElementById('loopEnabled');
const loopCountInput = document.getElementById('loopCount');
const printifyProductURLInput = document.getElementById('printifyProductURL');
const variablesList = document.getElementById('variablesList');
const stepTypes = [
  'loadURL',
  'loadPrintifyProductURL',
  'click',
  'clickText',
  'clickTextCheckbox',
  'clickName',
  'clickAriaLabel',
  'clickNth',
  'clickNthName',
  'setDescription',
  'typeVar',
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
  'ebayListingTitle',
  'ebayPrice',
  'ebayUploadImage',
  'uiUploadFile',
  'setVariable',
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
      printifyProductURL: '',
      variables: {}
    };
  } else {
    puppets[name].steps = puppets[name].steps || [];
    puppets[name].closeBrowser = !!puppets[name].closeBrowser;
    puppets[name].loopEnabled = !!puppets[name].loopEnabled;
    puppets[name].loopCount = Number(puppets[name].loopCount) || 1;
    puppets[name].printifyProductURL = puppets[name].printifyProductURL || '';
    puppets[name].variables = puppets[name].variables || {};
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

function addVariableField(name = '', value = '') {
  const row = document.createElement('div');
  const nameInput = document.createElement('input');
  nameInput.placeholder = 'name';
  nameInput.className = 'var-row-name';
  if (name) nameInput.value = name;
  const valueInput = document.createElement('input');
  valueInput.placeholder = 'value';
  valueInput.className = 'var-row-value';
  if (value) valueInput.value = value;
  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.onclick = () => row.remove();
  row.appendChild(nameInput);
  row.appendChild(valueInput);
  row.appendChild(delBtn);
  variablesList.appendChild(row);
}

function ensureEbayTitleVariable() {
  const hasVar = Array.from(
    variablesList.querySelectorAll('.var-row-name'),
  ).some(input => input.value === 'ebayTitle');
  if (!hasVar) {
    addVariableField('ebayTitle', '');
  }
}

function ensureEbayPriceVariable() {
  const hasVar = Array.from(
    variablesList.querySelectorAll('.var-row-name'),
  ).some(input => input.value === 'ebayPrice');
  if (!hasVar) {
    addVariableField('ebayPrice', '');
  }
}

function loadVariables(vars = {}) {
  variablesList.innerHTML = '';
  Object.keys(vars).forEach(k => addVariableField(k, vars[k]));
}

function collectVariables() {
  const vars = {};
  variablesList.querySelectorAll('div').forEach(row => {
    const name = row.querySelector('.var-row-name')?.value.trim();
    const value = row.querySelector('.var-row-value')?.value || '';
    if (name) vars[name] = value;
  });
  return vars;
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
  } else if (step.type === 'ebayListingTitle') {
    const imgInput = document.createElement('input');
    imgInput.placeholder = 'image path';
    imgInput.className = 'ebay-title-image';
    if (step.image) imgInput.value = step.image;
    div.appendChild(imgInput);
    ensureEbayTitleVariable();
  } else if (step.type === 'ebayPrice') {
    ensureEbayTitleVariable();
    ensureEbayPriceVariable();
  } else if (step.type === 'ebayUploadImage') {
    const pathsInput = document.createElement('input');
    pathsInput.placeholder = 'image paths';
    pathsInput.className = 'image-paths';
    if (step.paths) pathsInput.value = step.paths;
    div.appendChild(pathsInput);

    const itemInput = document.createElement('input');
    itemInput.placeholder = 'item id';
    itemInput.className = 'image-item-id';
    if (step.itemId) itemInput.value = step.itemId;
    itemInput.style.width = '120px';
    div.appendChild(itemInput);
  } else if (step.type === 'uiUploadFile') {
    const pathsInput = document.createElement('input');
    pathsInput.placeholder = 'file paths';
    pathsInput.className = 'file-paths';
    if (step.paths) pathsInput.value = step.paths;
    div.appendChild(pathsInput);

    const selInput = document.createElement('input');
    selInput.placeholder = 'input selector';
    selInput.className = 'file-selector';
    if (step.selector) selInput.value = step.selector;
    selInput.style.width = '120px';
    div.appendChild(selInput);
  } else if (step.type === 'typeVar') {
    const nameInput = document.createElement('input');
    nameInput.placeholder = 'var name';
    nameInput.className = 'type-var-name';
    if (step.name) nameInput.value = step.name;
    div.appendChild(nameInput);
  } else if (step.type === 'setVariable') {
    const nameInput = document.createElement('input');
    nameInput.placeholder = 'var name';
    nameInput.className = 'set-var-name';
    if (step.name) nameInput.value = step.name;
    div.appendChild(nameInput);

    const valInput = document.createElement('input');
    valInput.placeholder = 'value';
    valInput.className = 'set-var-value';
    if (step.value) valInput.value = step.value;
    valInput.style.marginLeft = '4px';
    div.appendChild(valInput);
  } else if (step.type === 'end' || step.type === 'scrollBottom' || step.type === 'selectAllText' || step.type === 'loadPrintifyProductURL') {
    // no additional fields
  } else {
    const input = document.createElement('input');
    if (step.type === 'sectionTitle') {
      input.placeholder = 'section title';
    } else if (step.type === 'clickName') {
      input.placeholder = 'element name';
    } else if (step.type === 'clickAriaLabel') {
      input.placeholder = 'aria-label';
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
    } else if (step.type === 'clickAriaLabel' && step.label) {
      input.value = step.label;
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
    if (select.value === 'ebayListingTitle') {
      ensureEbayTitleVariable();
    } else if (select.value === 'ebayPrice') {
      ensureEbayTitleVariable();
      ensureEbayPriceVariable();
    }
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
  } else if (type === 'ebayListingTitle') {
    const image = div.querySelector('.ebay-title-image')?.value || '';
    result.push({ type, image });
  } else if (type === 'ebayPrice') {
    result.push({ type });
  } else if (type === 'ebayUploadImage') {
    const paths = div.querySelector('.image-paths')?.value || '';
    const itemId = div.querySelector('.image-item-id')?.value || '';
    result.push({ type, paths, itemId });
  } else if (type === 'uiUploadFile') {
    const paths = div.querySelector('.file-paths')?.value || '';
    const selector = div.querySelector('.file-selector')?.value || '';
    result.push({ type, paths, selector });
  } else if (type === 'setVariable') {
    const name = div.querySelector('.set-var-name')?.value || '';
    const value = div.querySelector('.set-var-value')?.value || '';
    result.push({ type, name, value });
  } else if (type === 'typeVar') {
    const name = div.querySelector('.type-var-name')?.value || '';
    result.push({ type, name });
  } else {
      const val = div.querySelector('input')?.value || '';
      if (type === 'loadURL') result.push({ type, url: val });
      else if (type === 'clickText') result.push({ type, text: val });
      else if (type === 'clickTextCheckbox') result.push({ type, text: val });
      else if (type === 'clickName') result.push({ type, name: val });
      else if (type === 'clickAriaLabel') result.push({ type, label: val });
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
  loadVariables(puppets[name].variables || {});
}

function addPuppet() {
  const name = prompt('Puppet name?');
  if (!name) return;
  if (!puppets[name]) {
    puppets[name] = { steps: [], closeBrowser: false, loopEnabled: false, loopCount: 1, printifyProductURL: '', variables: {} };
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
  puppets[currentPuppet].variables = collectVariables();
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
        printifyProductURL: puppets[currentPuppet].printifyProductURL || '',
        variables: collectVariables()
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
    sanitized[name].variables = sanitized[name].variables || {};
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
          puppets[name] = { steps: puppets[name], closeBrowser: false, loopEnabled: false, loopCount: 1, printifyProductURL: '', variables: {} };
        } else {
          puppets[name].steps = puppets[name].steps || [];
          puppets[name].closeBrowser = !!puppets[name].closeBrowser;
          puppets[name].loopEnabled = !!puppets[name].loopEnabled;
          puppets[name].loopCount = Number(puppets[name].loopCount) || 1;
          puppets[name].printifyProductURL = puppets[name].printifyProductURL || '';
          puppets[name].variables = puppets[name].variables || {};
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
  puppets['default'] = { steps: [], closeBrowser: false, loopEnabled: false, loopCount: 1, printifyProductURL: '', variables: {} };
}
switchPuppet(Object.keys(puppets)[0]);
