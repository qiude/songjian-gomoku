/* UI only. Rules and AI live in engine.js; classic scripts also work from file://. */
(function () {
  'use strict';
  const { SIZE, BLACK, WHITE, createGame, playMove, undoMoves, chooseAIMove } = window.GomokuCore;
  const $ = (id) => document.getElementById(id);
  const board = $('board');
  const cells = [];
  let game = createGame();
  let mode = 'ai';
  let human = BLACK;
  let difficulty = 'normal';
  let showNumbers = false;
  let aiTimer = null;
  let generation = 0;
  let thinking = false;
  let focused = [7, 7];
  let previouslyPlaced = 0;
  const letters = 'ABCDEFGHIJKLMNO';
  const playerLabel = (player) => mode === 'local' ? (player === BLACK ? '黑棋' : '白棋') : (player === human ? '你' : '电脑');

  function buildBoard() {
    const svg = document.querySelector('.board-lines');
    let lines = '';
    for (let i = 0; i < SIZE; i++) {
      const p = i * 10 + 5;
      lines += `<line x1="5" y1="${p}" x2="145" y2="${p}"/><line x1="${p}" y1="5" x2="${p}" y2="145"/>`;
    }
    for (const [r, c] of [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]]) {
      lines += `<circle cx="${c * 10 + 5}" cy="${r * 10 + 5}" r=".7"/>`;
    }
    svg.innerHTML = lines;
    document.querySelector('.top-coordinates').innerHTML = [...letters].map((c) => `<span>${c}</span>`).join('');
    document.querySelector('.side-coordinates').innerHTML = Array.from({ length: SIZE }, (_, i) => `<span>${i + 1}</span>`).join('');
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < SIZE; row++) {
      const rowElement = document.createElement('div');
      rowElement.className = 'board-row';
      rowElement.setAttribute('role', 'row');
      rowElement.setAttribute('aria-rowindex', row + 1);
      cells[row] = [];
      for (let col = 0; col < SIZE; col++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-colindex', col + 1);
        cell.tabIndex = row === 7 && col === 7 ? 0 : -1;
        const stone = document.createElement('span');
        stone.className = 'stone';
        stone.setAttribute('aria-hidden', 'true');
        cell.append(stone);
        cells[row][col] = cell;
        rowElement.append(cell);
      }
      fragment.append(rowElement);
    }
    board.append(fragment);
  }

  function focusCell(row, col, moveFocus) {
    cells[focused[0]][focused[1]].tabIndex = -1;
    focused = [row, col];
    cells[row][col].tabIndex = 0;
    if (moveFocus) cells[row][col].focus({ preventScroll: true });
  }

  function undoCount() {
    if (mode === 'local') return game.history.length ? 1 : 0;
    for (let i = game.history.length - 1; i >= 0; i--) {
      if (game.history[i].player === human) return game.history.length - i;
    }
    return 0;
  }

  function render() {
    const last = game.history[game.history.length - 1];
    const numbers = new Map(game.history.map((m, i) => [`${m.row},${m.col}`, i + 1]));
    const winners = new Set(game.winningLine.map((m) => `${m.row},${m.col}`));
    const locked = game.status !== 'playing' || (mode === 'ai' && game.currentPlayer !== human);
    board.classList.toggle('locked', locked);
    board.classList.toggle('numbers', showNumbers);
    board.dataset.turn = game.currentPlayer;
    board.setAttribute('aria-busy', String(thinking));
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = cells[r][c];
        const stone = game.board[r][c];
        const recent = !!last && last.row === r && last.col === c;
        cell.className = 'cell' + (stone === BLACK ? ' black' : stone === WHITE ? ' white' : '') + (recent ? ' recent' : '') + (winners.has(`${r},${c}`) ? ' winning' : '') + (recent && game.history.length > previouslyPlaced ? ' placed' : '');
        cell.firstElementChild.textContent = showNumbers && stone ? numbers.get(`${r},${c}`) : '';
        cell.setAttribute('aria-label', `${letters[c]}${r + 1}，${stone === BLACK ? '黑棋' : stone === WHITE ? '白棋' : '空位'}${recent ? '，最后一手' : ''}${winners.has(`${r},${c}`) ? '，获胜连线' : ''}`);
        cell.setAttribute('aria-disabled', String(locked || !!stone));
      }
    }
    previouslyPlaced = game.history.length;
    $('move-count').textContent = game.history.length;
    $('black-name').textContent = playerLabel(BLACK);
    $('white-name').textContent = playerLabel(WHITE);
    $('black-player').classList.toggle('active', game.status === 'playing' && game.currentPlayer === BLACK);
    $('white-player').classList.toggle('active', game.status === 'playing' && game.currentPlayer === WHITE);
    $('undo').disabled = undoCount() === 0;
    $('ai-settings').hidden = mode !== 'ai';
    $('mode-note').textContent = mode === 'ai' ? '与电脑切磋，随时开始。' : '同一台设备，两个人轮流落子。';
    $('turn-stone').className = 'mini-stone ' + ((game.status === 'won' ? game.winner : game.currentPlayer) === BLACK ? 'black' : 'white');
    let title, detail;
    if (game.status === 'won') {
      title = mode === 'ai' ? (game.winner === human ? '你赢了！好棋。' : '电脑获胜，再来一局？') : `${playerLabel(game.winner)}获胜！`;
      detail = `${game.winner === BLACK ? '黑棋' : '白棋'}连成五子 · 共 ${game.history.length} 手`;
    } else if (game.status === 'draw') {
      title = '旗鼓相当，本局平局';
      detail = '棋盘已满，试试再来一局';
    } else if (thinking) {
      title = '电脑正在思考…';
      detail = '你可以等待，也可以悔棋或重新开始';
    } else {
      title = mode === 'ai' ? '轮到你落子' : `轮到${playerLabel(game.currentPlayer)}落子`;
      detail = mode === 'ai' ? `你执${human === BLACK ? '黑' : '白'}棋，${game.history.length ? '请继续落子' : '点击棋盘开始'}` : '点击空交叉点，开始你的下一手';
    }
    $('status-title').textContent = title;
    $('status-detail').textContent = detail;
    $('live-status').textContent = `${title}。${detail}。已落 ${game.history.length} 手。`;
  }

  function cancelAI() {
    generation++;
    if (aiTimer !== null) clearTimeout(aiTimer);
    aiTimer = null;
    thinking = false;
  }

  function scheduleAI() {
    if (mode !== 'ai' || game.status !== 'playing' || game.currentPlayer === human) return;
    thinking = true;
    const ticket = generation;
    render();
    aiTimer = setTimeout(() => {
      aiTimer = null;
      if (ticket !== generation || mode !== 'ai' || game.status !== 'playing' || game.currentPlayer === human) return;
      const move = chooseAIMove(game.board, game.currentPlayer, { difficulty });
      if (move) playMove(game, move.row, move.col);
      thinking = false;
      render();
    }, 260);
  }

  function reset() {
    cancelAI();
    game = createGame();
    previouslyPlaced = 0;
    focusCell(7, 7, false);
    render();
    scheduleAI();
  }

  function onMove(row, col) {
    if (thinking || game.status !== 'playing' || (mode === 'ai' && game.currentPlayer !== human)) return;
    if (playMove(game, row, col)) {
      render();
      scheduleAI();
    }
  }

  board.addEventListener('click', (event) => {
    const cell = event.target.closest('.cell');
    if (!cell) return;
    const row = Number(cell.dataset.row), col = Number(cell.dataset.col);
    focusCell(row, col, false);
    onMove(row, col);
  });
  board.addEventListener('keydown', (event) => {
    const cell = event.target.closest('.cell');
    if (!cell) return;
    const row = Number(cell.dataset.row), col = Number(cell.dataset.col);
    let nr = row, nc = col;
    if (event.key === 'ArrowUp') nr = Math.max(0, row - 1);
    else if (event.key === 'ArrowDown') nr = Math.min(SIZE - 1, row + 1);
    else if (event.key === 'ArrowLeft') nc = Math.max(0, col - 1);
    else if (event.key === 'ArrowRight') nc = Math.min(SIZE - 1, col + 1);
    else if (event.key === 'Home') { nc = 0; if (event.ctrlKey) nr = 0; }
    else if (event.key === 'End') { nc = SIZE - 1; if (event.ctrlKey) nr = SIZE - 1; }
    else return;
    event.preventDefault();
    focusCell(nr, nc, true);
  });
  $('restart').addEventListener('click', reset);
  $('undo').addEventListener('click', () => {
    const count = undoCount();
    if (!count) return;
    cancelAI();
    undoMoves(game, count);
    render();
  });
  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      if (mode === button.dataset.mode) return;
      mode = button.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
      reset();
    });
  });
  $('human-color').addEventListener('change', (event) => { human = Number(event.target.value); reset(); });
  $('difficulty').addEventListener('change', (event) => { difficulty = event.target.value; reset(); });
  $('toggle-numbers').addEventListener('click', () => {
    showNumbers = !showNumbers;
    $('toggle-numbers').setAttribute('aria-pressed', String(showNumbers));
    render();
  });
  const dialog = $('rules-dialog');
  let dialogTrigger = null;
  function openRules(event) { dialogTrigger = event.currentTarget; dialog.showModal(); }
  $('open-rules').addEventListener('click', openRules);
  $('more-rules').addEventListener('click', openRules);
  $('close-rules').addEventListener('click', () => dialog.close());
  $('rules-done').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { if (dialogTrigger) dialogTrigger.focus({ preventScroll: true }); });
  buildBoard();
  render();
})();
