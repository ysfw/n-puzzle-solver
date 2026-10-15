/* Bounded tree of actual accepted search entries, not inferred adjacency. */
(() => {
  const byId = id => document.getElementById(id);
  const ns = 'http://www.w3.org/2000/svg';
  let zoom = .85, width = 0, height = 0;
  const controls = ['tree-zoom-out', 'tree-zoom-in', 'tree-fit'];
  function scale(value) {
    zoom = Math.max(.05, Math.min(1.5, value));
    const scene = byId('tree-canvas').firstElementChild;
    if (!scene) return;
    scene.style.transform = `scale(${zoom})`;
    byId('tree-canvas').style.width = `${width * zoom}px`;
    byId('tree-canvas').style.height = `${height * zoom}px`;
    byId('tree-zoom-level').textContent = `${Math.round(zoom * 100)}%`;
  }
  function clear() {
    byId('tree-canvas').replaceChildren();
    byId('tree-canvas').style.width = '0'; byId('tree-canvas').style.height = '0';
    byId('tree-empty').hidden = false;
    byId('tree-summary').textContent = 'Solve a puzzle to display the tree.';
    byId('tree-selection').textContent = 'Select a node for costs and expansion order. Solution nodes replay the move.';
    for (const id of controls) byId(id).disabled = true;
  }
  function render(data, replay) {
    clear();
    const tree = data.tree;
    if (!tree || !tree.nodes.length) return;
    byId('tree-empty').hidden = true;
    for (const id of controls) byId(id).disabled = false;
    const nodes = tree.nodes.map(node => ({...node, children: [], x: 0, y: 0}));
    const map = new Map(nodes.map(node => [node.id, node]));
    for (const node of nodes) if (map.has(node.parent)) map.get(node.parent).children.push(node);
    const roots = nodes.filter(node => !map.has(node.parent));
    let leaf = 0;
    const nodeWidth = data.size > 3 ? 126 : 108;
    const nodeHeight = data.size > 3 ? 164 : 144;
    function position(node, depth) {
      node.y = 24 + depth * (nodeHeight + 50);
      for (const child of node.children) position(child, depth + 1);
      node.x = node.children.length ? (node.children[0].x + node.children.at(-1).x) / 2 : 24 + leaf++ * (nodeWidth + 24);
    }
    roots.forEach(root => position(root, 0));
    width = Math.max(leaf * (nodeWidth + 24) + 48, 250);
    height = Math.max(...nodes.map(node => node.y)) + nodeHeight + 26;
    const scene = document.createElement('div'); scene.className = 'tree-scene'; scene.style.width = `${width}px`; scene.style.height = `${height}px`;
    const lines = document.createElementNS(ns, 'svg'); lines.classList.add('tree-edges');
    lines.setAttribute('width', width); lines.setAttribute('height', height); lines.setAttribute('aria-hidden', 'true'); scene.append(lines);
    for (const node of nodes) {
      const parent = map.get(node.parent);
      if (parent) {
        const x1 = parent.x + nodeWidth / 2, y1 = parent.y + nodeHeight;
        const x2 = node.x + nodeWidth / 2, y2 = node.y;
        const edge = document.createElementNS(ns, 'path');
        edge.setAttribute('d', `M${x1},${y1} C${x1},${y1 + 25} ${x2},${y2 - 25} ${x2},${y2}`);
        edge.classList.add(node.on_path && parent.on_path ? 'solution-edge' : 'search-edge'); lines.append(edge);
        const text = document.createElementNS(ns, 'text'); text.setAttribute('x', x2 + 7); text.setAttribute('y', y2 - 9); text.textContent = node.move; lines.append(text);
      }
      const button = document.createElement('button'); button.type = 'button';
      button.className = `tree-node${node.on_path ? ' solution-node' : node.expanded ? ' expanded-node' : ''}`;
      button.style.left = `${node.x}px`; button.style.top = `${node.y}px`; button.style.width = `${nodeWidth}px`; button.style.height = `${nodeHeight}px`;
      const title = document.createElement('span'); title.className = 'tree-node-title';
      title.textContent = node.goal ? 'Goal' : node.parent === null ? 'Start' : `Move ${node.g}`;
      const grid = document.createElement('span'); grid.className = 'mini-board tree-board'; grid.style.setProperty('--n', data.size);
      for (const tile of node.state) {
        const cell = document.createElement('span'); cell.className = `mini-tile${tile === 0 ? ' blank' : ''}`; cell.textContent = tile || ''; grid.append(cell);
      }
      const costs = document.createElement('span'); costs.className = 'tree-node-cost';
      costs.textContent = data.algorithm === 'astar' ? `g ${node.g} · h ${node.h}` : `Depth ${node.g}`;
      button.append(title, grid, costs);
      const stateLabel = node.state.map(t => t || 'blank').join(', ');
      button.setAttribute('aria-label', `${title.textContent}. Board ${stateLabel}. ${node.expanded ? `Expanded ${node.order}` : 'Not expanded'}.${node.on_path ? ' On solution path.' : ''}`);
      button.addEventListener('click', () => {
        for (const sibling of scene.querySelectorAll('.selected-node')) sibling.classList.remove('selected-node');
        button.classList.add('selected-node');
        const f = Math.round((node.g + node.h) * 1000) / 1000;
        byId('tree-selection').textContent = `${node.goal ? 'Goal board' : node.parent === null ? 'Initial board' : `Blank moves ${node.move}`} · g = ${node.g} · h = ${node.h} · f = ${f} · ${node.expanded ? `Expanded #${node.order}` : 'Generated, not expanded'}${node.on_path ? ' · On the solution path' : ''}`;
        if (node.on_path) replay(node.g);
      }); scene.append(button);
    }
    byId('tree-canvas').append(scene);
    const pass = tree.pass_limit === null ? '' : ` IDS depth limit: ${tree.pass_limit}.`;
    byId('tree-summary').textContent = `${nodes.length.toLocaleString()} of ${tree.total_generated.toLocaleString()} nodes shown.${pass}${tree.truncated ? ' First 300 nodes; solution may be outside the preview.' : ''}`;
    scale(.85); byId('tree-viewport').scrollTop = 0;
    byId('tree-viewport').scrollLeft = Math.max(0, roots[0].x * zoom - byId('tree-viewport').clientWidth / 2 + nodeWidth * zoom / 2);
  }
  window.searchTree = {clear, render};
  window.addEventListener('DOMContentLoaded', () => {
    byId('tree-zoom-out').addEventListener('click', () => scale(zoom / 1.2));
    byId('tree-zoom-in').addEventListener('click', () => scale(zoom * 1.2));
    byId('tree-fit').addEventListener('click', () => {scale(Math.min((byId('tree-viewport').clientWidth - 24) / width, (byId('tree-viewport').clientHeight - 24) / height, 1)); byId('tree-viewport').scrollLeft = 0;});
  });
})();
