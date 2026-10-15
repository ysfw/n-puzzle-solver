'use strict';
const $ = id => document.getElementById(id);
const sample = [1, 2, 5, 3, 4, 0, 6, 7, 8];
const descriptions = {
  astar: ['A* search', 'Priority: cost so far + estimated remaining cost.', 'Min-heap + best-cost map'],
  bfs: ['Breadth-first search', 'Searches level by level; finds a shortest path.', 'FIFO queue + visited set'],
  dfs: ['Depth-first search', 'Searches one branch at a time; may return a longer path.', 'LIFO stack + explored depths'],
  ids: ['Iterative deepening', 'Repeats DFS with increasing depth limits.', 'Repeated DFS + shared search budget']
};
const configurations = [
  ['bfs', 'manhattan', 'Breadth-first'], ['dfs', 'manhattan', 'Depth-first'],
  ['ids', 'manhattan', 'Iterative deepening'], ['astar', 'manhattan', 'A* · Manhattan'],
  ['astar', 'euclidean', 'A* · Euclidean']
];
const statusNames = {solved: 'Solved', limited: 'Search limit', not_found: 'Depth limit', unsolvable: 'Unsolvable'};
let size = 3, initial = [...sample], boardState = [...sample], result = null, step = 0;
let busy = false, timer = null, traceIndex = 0, revision = 0;
let comparisonRuns = [];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`); svg.append(use); return svg;
}
function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}
function formatState(state) {
  return Array.from({length: size}, (_, row) => state.slice(row * size, (row + 1) * size).join(' ')).join('\n');
}
function readState() {
  const tokens = $('initial-state').value.trim().split(/[\s,]+/);
  if (tokens.length !== size * size || tokens.some(t => !/^\d+$/.test(t)))
    throw new Error(`Enter ${size * size} whole numbers, using 0 for the blank.`);
  const state = tokens.map(Number);
  if ([...state].sort((a, b) => a - b).some((v, i) => v !== i))
    throw new Error(`Use each number from 0 to ${size * size - 1} exactly once.`);
  return state;
}
function miniBoard(element, state) {
  element.style.setProperty('--n', size);
  element.replaceChildren(...state.map(tile => {
    const cell = document.createElement('span'); cell.className = `mini-tile${tile === 0 ? ' blank' : ''}`;
    cell.textContent = tile || ''; return cell;
  }));
  element.setAttribute('aria-label', `Board: ${state.map(t => t || 'blank').join(', ')}`);
}
function adjacent(a, b) {
  return Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size) === 1;
}
function createBoard(state) {
  $('board').style.setProperty('--n', size);
  $('board').replaceChildren();
  for (let tile = 1; tile < size * size; tile++) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'tile';
    button.dataset.tile = tile; button.style.setProperty('--tile', tile); button.textContent = tile;
    button.style.fontSize = size > 3 ? `${Math.max(18, 47 - size * 4)}px` : '';
    button.addEventListener('click', () => manualMove(tile));
    $('board').append(button);
  }
  renderBoard(state);
  miniBoard($('goal-board'), Array.from({length: size * size}, (_, i) => i));
}
function renderBoard(state) {
  boardState = [...state];
  const blank = state.indexOf(0);
  $('board').setAttribute('aria-label', `Puzzle arrangement: ${state.map(t => t || 'blank').join(', ')}`);
  for (const button of $('board').children) {
    const tile = Number(button.dataset.tile), pos = state.indexOf(tile);
    button.style.setProperty('--row', Math.floor(pos / size)); button.style.setProperty('--col', pos % size);
    const movable = !busy && adjacent(pos, blank);
    button.disabled = !movable; button.classList.toggle('movable', movable);
    button.setAttribute('aria-label', `Tile ${tile}, row ${Math.floor(pos / size) + 1}, column ${pos % size + 1}${movable ? ', slide into blank' : ''}`);
  }
}
function pause() {
  clearTimeout(timer); timer = null;
  $('play').replaceChildren(icon('play')); $('play').setAttribute('aria-label', 'Play solution');
}
function resetMetrics() {
  $('metric-cost').replaceChildren(document.createTextNode('—'), Object.assign(document.createElement('small'), {textContent: 'moves'}));
  $('metric-nodes').textContent = '—'; $('metric-depth').textContent = '—';
  $('metric-time').replaceChildren(document.createTextNode('—'), Object.assign(document.createElement('small'), {textContent: 'ms'}));
}
function invalidate(clearComparison = true) {
  revision++; pause(); result = null; step = 0;
  window.searchTree.clear();
  $('result-state').textContent = 'Not run yet'; resetMetrics();
  $('board-label').textContent = 'Initial state'; $('board-status').textContent = 'Ready';
  $('board-caption').textContent = '';
  $('path-moves').replaceChildren(Object.assign(document.createElement('p'), {className: 'muted', textContent: 'No solution yet.'}));
  $('download').disabled = true; $('trace-toggle').disabled = true;
  $('trace-toggle').setAttribute('aria-expanded', 'false'); $('trace-toggle').textContent = 'Show expansion trace';
  $('trace-content').hidden = true; updateControls();
  if (clearComparison) {comparisonRuns = []; resetComparison();}
}
function resetComparison() {
  $('comparison-body').replaceChildren(...configurations.map(([, , name]) => {
    const tr = document.createElement('tr');
    const title = document.createElement('td'); title.textContent = name;
    const empty = document.createElement('td'); empty.colSpan = 6; empty.className = 'muted'; empty.textContent = 'Not run for this arrangement';
    tr.append(title, empty); return tr;
  }));
}
function manualMove(tile) {
  if (busy) return;
  const pos = boardState.indexOf(tile), blank = boardState.indexOf(0);
  if (!adjacent(pos, blank)) return;
  const next = [...boardState]; [next[pos], next[blank]] = [next[blank], next[pos]];
  invalidate(); initial = next; $('initial-state').value = formatState(next); renderBoard(next);
  message('Board updated.');
}
function updateDescription() {
  const [title, description, structure] = descriptions[$('algorithm').value];
  const strong = document.createElement('strong'); strong.textContent = title;
  const p = document.createElement('p'); p.textContent = description;
  const span = document.createElement('span'); span.textContent = structure;
  $('algorithm-summary').replaceChildren(strong, p, span);
  $('heuristic-field').hidden = $('algorithm').value !== 'astar';
  $('depth-field').hidden = !['dfs', 'ids'].includes($('algorithm').value);
}
function updateControls() {
  const hasPath = !!result && result.status === 'solved';
  $('timeline').disabled = !hasPath || busy || result.cost === 0;
  $('timeline').max = hasPath ? result.cost : 0; $('timeline').value = step;
  $('step-label').textContent = `Move ${step} of ${hasPath ? result.cost : 0}`;
  $('back').disabled = !hasPath || busy || step === 0;
  $('next').disabled = !hasPath || busy || step === result.cost;
  $('restart').disabled = !hasPath || busy || step === 0;
  $('play').disabled = !hasPath || busy || result.cost === 0;
}
function seek(index, stopPlayback = true) {
  if (!result || result.status !== 'solved' || busy) return;
  if (stopPlayback) pause();
  step = Math.max(0, Math.min(index, result.cost)); renderBoard(result.states[step]);
  $('board-label').textContent = step === result.cost ? 'Goal state, reached' : 'Solution playback';
  $('board-status').textContent = step === result.cost ? 'Goal reached' : 'Solution ready';
  if (step === 0) $('board-caption').textContent = '';
  else $('board-caption').textContent = `${step === result.cost ? 'Solved. ' : ''}Blank moves ${result.path[step - 1]} · ${result.cost - step} move${result.cost - step === 1 ? '' : 's'} remaining`;
  for (const chip of $('path-moves').children) chip.classList.toggle('active', Number(chip.dataset.step) === step);
  updateControls();
}
function playTick() {
  if (!result || step >= result.cost) {pause(); return;}
  seek(step + 1, false);
  if (step >= result.cost) {pause(); return;}
  timer = setTimeout(playTick, Number($('speed').value));
}
function showResult(data) {
  pause(); $('trace-content').hidden = true; $('trace-toggle').setAttribute('aria-expanded', 'false'); $('trace-toggle').textContent = 'Show expansion trace'; result = data; initial = [...data.initial]; size = data.size; step = 0; traceIndex = 0;
  $('size').value = size; $('initial-state').value = formatState(initial);
  $('algorithm').value = data.algorithm; $('heuristic').value = data.heuristic; updateDescription();
  createBoard(initial); window.searchTree.render(data, index => seek(index)); $('result-state').textContent = statusNames[data.status] || data.status;
  const value = (id, number, unit) => {
    const el = $(id); el.replaceChildren(document.createTextNode(number));
    if (unit) el.append(Object.assign(document.createElement('small'), {textContent: unit}));
  };
  value('metric-cost', data.cost === undefined ? '—' : data.cost, 'moves');
  value('metric-nodes', data.nodes_expanded === undefined ? '—' : data.nodes_expanded.toLocaleString());
  value('metric-depth', data.search_depth === undefined ? '—' : data.search_depth);
  value('metric-time', data.running_time === undefined ? '—' : (data.running_time * 1000).toFixed(2), 'ms');
  $('path-moves').replaceChildren();
  if (data.status === 'solved') {
    const rotation = {up: -90, down: 90, left: 180, right: 0};
    for (let i = 0; i < data.path.length; i++) {
      const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'move-chip'; chip.dataset.step = i + 1;
      chip.setAttribute('aria-label', `Go to move ${i + 1}: blank moves ${data.path[i]}`);
      const arrow = icon('arrow'); arrow.style.transform = `rotate(${rotation[data.path[i]]}deg)`;
      chip.append(arrow, document.createTextNode(data.path[i])); chip.addEventListener('click', () => seek(i + 1)); $('path-moves').append(chip);
    }
    if (!data.path.length) $('path-moves').textContent = 'Already solved.';
    $('download').disabled = false; $('trace-toggle').disabled = !data.expansions.length;
    message(`Solved in ${data.cost} move${data.cost === 1 ? '' : 's'}.`);
    seek(0);
  } else {
    $('path-moves').textContent = 'No solution returned.';
    $('board-status').textContent = statusNames[data.status];
    message(data.message, true); updateControls();
  }
}
function setBusy(value) {
  busy = value; document.body.classList.toggle('busy', value);
  for (const id of ['solve', 'compare', 'shuffle', 'sample', 'size', 'initial-state', 'algorithm', 'heuristic', 'depth-limit']) $(id).disabled = value;
  $('solve').replaceChildren(document.createTextNode(value ? 'Searching…' : 'Solve puzzle'), icon('arrow'));
  updateControls(); renderBoard(boardState);
}
function payload(state, algorithm = $('algorithm').value, heuristic = $('heuristic').value) {
  return {state, algorithm, heuristic, depth_limit: Number($('depth-limit').value)};
}
async function requestSearch(data) {
  const response = await fetch('/api/solve', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
  const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Search failed. Try again.'); return body;
}
$('puzzle-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  let state; try {state = readState();} catch (error) {message(error.message, true); return;}
  invalidate(false); initial = state; renderBoard(state); setBusy(true); message('Searching…'); $('board-status').textContent = 'Searching';
  try {const data = await requestSearch(payload(state)); setBusy(false); showResult(data);}
  catch (error) {setBusy(false); message(`${error.message} Check that Flask is running and try again.`, true); $('board-status').textContent = 'Search interrupted';}
});
function shuffle() {
  if (busy) return;
  let state = Array.from({length: size * size}, (_, i) => i), previous = -1;
  for (let i = 0; i < (size === 3 ? 16 : 10); i++) {
    const blank = state.indexOf(0), options = state.map((_, index) => index).filter(index => adjacent(index, blank) && index !== previous);
    const next = options[Math.floor(Math.random() * options.length)]; [state[blank], state[next]] = [state[next], state[blank]]; previous = blank;
  }
  invalidate(); initial = state; $('initial-state').value = formatState(state); createBoard(state);
  message('Board shuffled.');
}
$('shuffle').addEventListener('click', shuffle);
$('sample').addEventListener('click', () => {
  if (busy) return; size = 3; $('size').value = '3'; invalidate(); initial = [...sample];
  $('initial-state').value = formatState(initial); createBoard(initial); message('Lab example loaded.');
});
$('size').addEventListener('change', () => {size = Number($('size').value); shuffle();});
$('initial-state').addEventListener('input', () => {
  invalidate(); try {initial = readState(); createBoard(initial); message('Board updated.');}
  catch (error) {message(error.message, true);}
});
for (const id of ['algorithm', 'heuristic', 'depth-limit']) $(id).addEventListener('change', () => {
  invalidate(); updateDescription(); renderBoard(initial); message('Settings updated.');
});
$('next').addEventListener('click', () => seek(step + 1)); $('back').addEventListener('click', () => seek(step - 1));
$('restart').addEventListener('click', () => seek(0)); $('timeline').addEventListener('input', () => seek(Number($('timeline').value)));
$('play').addEventListener('click', () => {
  if (timer) {pause(); return;}
  if (result && step === result.cost) seek(0);
  $('play').replaceChildren(icon('pause')); $('play').setAttribute('aria-label', 'Pause solution');
  timer = setTimeout(playTick, 100);
});
$('speed').addEventListener('change', () => {document.documentElement.style.setProperty('--move', `${Math.min(480, Number($('speed').value) - 80)}ms`);});
document.addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) || busy || !result) return;
  if (event.key === 'ArrowRight') {event.preventDefault(); seek(step + 1);}
  if (event.key === 'ArrowLeft') {event.preventDefault(); seek(step - 1);}
});
function renderTrace() {
  if (!result || !result.expansions) return;
  const entry = result.expansions[traceIndex]; miniBoard($('expansion-board'), entry.state);
  $('trace-count').textContent = `${traceIndex + 1} of ${result.expansions.length.toLocaleString()}`;
  $('trace-prev').disabled = traceIndex === 0; $('trace-next').disabled = traceIndex === result.expansions.length - 1;
  $('trace-meta').textContent = `${result.trace_scope} · ${result.heuristic === 'manhattan' ? 'Manhattan' : 'Euclidean'} distance: ${entry.h}`;
}
$('trace-toggle').addEventListener('click', () => {
  const open = $('trace-content').hidden; $('trace-content').hidden = !open;
  $('trace-toggle').setAttribute('aria-expanded', String(open)); $('trace-toggle').textContent = open ? 'Hide expansion trace' : 'Show expansion trace'; if (open) renderTrace();
});
$('trace-prev').addEventListener('click', () => {traceIndex = Math.max(0, traceIndex - 1); renderTrace();});
$('trace-next').addEventListener('click', () => {traceIndex = Math.min(result.expansions.length - 1, traceIndex + 1); renderTrace();});
$('download').addEventListener('click', () => {
  if (!result) return;
  const blob = new Blob([JSON.stringify({...result, comparisons: comparisonRuns, notes: {goal: 'Ascending, blank at top left', limits: '3 seconds or 100,000 nodes per run', expanded: 'Processed non-stale entries, including the goal; IDS counts every pass', hash: 'Zobrist identifiers; hash collisions assumed absent'}}, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `npuzzle-${size}x${size}-${result.algorithm}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('compare').addEventListener('click', async () => {
  if (busy) return;
  let state; try {state = readState();} catch (error) {message(error.message, true); return;}
  pause(); setBusy(true); resetComparison(); comparisonRuns = []; const currentRevision = revision;
  try {
    for (let i = 0; i < configurations.length; i++) {
      const [algorithm, heuristic, name] = configurations[i]; message(`Comparing ${name} (${i + 1} of 5)…`);
      const data = await requestSearch(payload(state, algorithm, heuristic)); if (revision !== currentRevision) return;
      comparisonRuns.push(data); const tr = $('comparison-body').children[i]; tr.replaceChildren();
      const values = [name, statusNames[data.status], data.cost ?? '—', data.nodes_expanded?.toLocaleString() ?? '—', data.search_depth ?? '—', data.running_time === undefined ? '—' : `${(data.running_time * 1000).toFixed(2)} ms`];
      for (const value of values) {const td = document.createElement('td'); td.textContent = value; tr.append(td);}
      const td = document.createElement('td');
      if (data.status === 'solved') {
        const button = document.createElement('button'); button.className = 'view-button'; button.textContent = 'View path';
        button.addEventListener('click', () => {
          if (busy) return; $('trace-content').hidden = true; $('trace-toggle').setAttribute('aria-expanded', 'false');
          showResult(data); $('workspace').scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth'});
        }); td.append(button);
      } else td.textContent = data.status === 'unsolvable' ? 'Parity mismatch' : data.status === 'limited' ? 'Budget reached' : 'Depth reached';
      tr.append(td);
    }
    message('Comparison complete.');
  } catch (error) {message(`Comparison interrupted: ${error.message}`, true);}
  finally {setBusy(false);}
});
// Procedural grain belongs to the physical tile material, not a decorative page texture.
function woodTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 280; const ctx = canvas.getContext('2d');
  let seed = 42; const random = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296;};
  for (let i = 0; i < 250; i++) {
    const y = random() * 280; ctx.beginPath(); ctx.moveTo(0, y);
    ctx.bezierCurveTo(80, y + random() * 12 - 6, 170, y + random() * 18 - 9, 280, y + random() * 8 - 4);
    ctx.strokeStyle = i % 3 ? `rgba(79,43,17,${.025 + random() * .065})` : `rgba(255,239,195,${.05 + random() * .1})`;
    ctx.lineWidth = .3 + random() * 1.2; ctx.stroke();
  }
  document.documentElement.style.setProperty('--wood-texture', `url(${canvas.toDataURL()})`);
}
woodTexture(); updateDescription(); createBoard(initial); updateControls();
