'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const Core = require('../engine.js');
const { SIZE, EMPTY, BLACK, WHITE, createGame, playMove, undoMoves, getWinningLine, chooseAIMove } = Core;

function boardWith(stones) {
  const board = createGame().board;
  for (const [row, col, player] of stones) board[row][col] = player;
  return board;
}

function drawBoard() {
  // In all four directions this pattern has runs of at most two.
  return Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, col) => (row + 2 * col) % 4 < 2 ? BLACK : WHITE));
}

test('new games have independent empty 15 x 15 boards and Black starts', () => {
  const a = createGame();
  const b = createGame();
  assert.equal(a.board.length, 15);
  assert.ok(a.board.every(row => row.length === 15 && row.every(cell => cell === EMPTY)));
  assert.equal(a.currentPlayer, BLACK);
  assert.equal(a.status, 'playing');
  assert.equal(a.winner, EMPTY);
  a.board[0][0] = BLACK;
  assert.equal(a.board[1][0], EMPTY);
  assert.equal(b.board[0][0], EMPTY);
});

test('legal moves alternate and record their player', () => {
  const game = createGame();
  assert.equal(playMove(game, 7, 7), true);
  assert.equal(game.currentPlayer, WHITE);
  assert.equal(playMove(game, 8, 8), true);
  assert.equal(game.currentPlayer, BLACK);
  assert.deepEqual(game.history, [{ row: 7, col: 7, player: BLACK }, { row: 8, col: 8, player: WHITE }]);
});

test('invalid, fractional, occupied and postgame moves do not mutate the game', () => {
  const game = createGame();
  for (const [r, c] of [[-1, 0], [0, -1], [15, 0], [0, 15], [1.5, 2], [NaN, 0], [0, Infinity], ['2', 3], [null, 1]]) {
    const before = JSON.stringify(game);
    assert.equal(playMove(game, r, c), false);
    assert.equal(JSON.stringify(game), before);
  }
  playMove(game, 0, 0);
  const before = JSON.stringify(game);
  assert.equal(playMove(game, 0, 0), false);
  assert.equal(JSON.stringify(game), before);
  game.status = 'won';
  assert.equal(playMove(game, 1, 1), false);
  game.status = 'draw';
  assert.equal(playMove(game, 1, 1), false);
});

for (const [name, dr, dc, row, col] of [
  ['horizontal', 0, 1, 0, 10],
  ['vertical', 1, 0, 10, 14],
  ['descending diagonal', 1, 1, 0, 0],
  ['ascending diagonal', 1, -1, 10, 4]
]) {
  test(`${name} five at an edge wins and returns the entire line`, () => {
    const game = createGame();
    for (let n = 0; n < 4; n++) game.board[row + n * dr][col + n * dc] = BLACK;
    assert.equal(playMove(game, row + 4 * dr, col + 4 * dc), true);
    assert.equal(game.status, 'won');
    assert.equal(game.winner, BLACK);
    assert.equal(game.winningLine.length, 5);
    assert.ok(game.winningLine.every(point => game.board[point.row][point.col] === BLACK));
  });
}

test('white can win and freestyle six or more in a row also wins', () => {
  const game = createGame();
  game.currentPlayer = WHITE;
  for (const col of [3, 4, 5, 7, 8]) game.board[7][col] = WHITE;
  playMove(game, 7, 6);
  assert.equal(game.winner, WHITE);
  assert.equal(game.winningLine.length, 6);
  assert.deepEqual(game.winningLine.map(point => point.col), [3, 4, 5, 6, 7, 8]);
});

test('broken lines, mixed colors and row wrapping are not wins', () => {
  const board = boardWith([[0, 12, BLACK], [0, 13, BLACK], [0, 14, BLACK], [1, 0, BLACK], [1, 1, BLACK],
    [7, 1, WHITE], [7, 2, WHITE], [7, 3, BLACK], [7, 4, WHITE], [7, 5, WHITE],
    [10, 1, BLACK], [10, 2, BLACK], [10, 4, BLACK], [10, 5, BLACK]]);
  for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
    if (board[row][col]) assert.deepEqual(getWinningLine(board, row, col, board[row][col]), []);
  }
  assert.deepEqual(getWinningLine(board, -1, 0, BLACK), []);
  assert.deepEqual(getWinningLine(board, 0, 0, EMPTY), []);
  assert.deepEqual(getWinningLine(board, 0, 0, BLACK), []);
});

test('a genuinely full board without five is a draw', () => {
  const game = createGame();
  game.board = drawBoard();
  for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
    assert.deepEqual(getWinningLine(game.board, row, col, game.board[row][col]), []);
  }
  const lastPlayer = game.board[14][14];
  game.board[14][14] = EMPTY;
  game.currentPlayer = lastPlayer;
  assert.equal(playMove(game, 14, 14), true);
  assert.equal(game.status, 'draw');
  assert.equal(game.winner, EMPTY);
  assert.deepEqual(game.winningLine, []);
});

test('a win on the final empty square takes precedence over draw', () => {
  const game = createGame();
  game.board = drawBoard();
  for (const col of [10, 11, 13, 14]) game.board[14][col] = BLACK;
  game.board[14][12] = EMPTY;
  game.currentPlayer = BLACK;
  playMove(game, 14, 12);
  assert.equal(game.status, 'won');
  assert.equal(game.winner, BLACK);
});

test('undo handles empty games, invalid counts, pairs, and excessive counts', () => {
  const game = createGame();
  assert.equal(undoMoves(game), 0);
  playMove(game, 7, 7);
  playMove(game, 7, 8);
  playMove(game, 8, 8);
  for (const count of [0, -1, NaN, Infinity]) assert.equal(undoMoves(game, count), 0);
  assert.equal(undoMoves(game, 2), 2);
  assert.equal(game.currentPlayer, WHITE);
  assert.equal(game.history.length, 1);
  assert.equal(game.board[7][8], EMPTY);
  assert.equal(game.board[8][8], EMPTY);
  assert.equal(undoMoves(game, 100), 1);
  assert.equal(game.currentPlayer, BLACK);
  assert.equal(game.history.length, 0);
});

test('undo a winning move clears the result and supports another win', () => {
  const game = createGame();
  for (let col = 0; col < 4; col++) {
    playMove(game, 7, col);
    playMove(game, 0, col);
  }
  playMove(game, 7, 4);
  assert.equal(game.status, 'won');
  assert.equal(undoMoves(game), 1);
  assert.equal(game.status, 'playing');
  assert.equal(game.winner, EMPTY);
  assert.deepEqual(game.winningLine, []);
  assert.equal(game.currentPlayer, BLACK);
  playMove(game, 7, 4);
  assert.equal(game.status, 'won');
});

test('undo a draw restores its last player and empty square', () => {
  const game = createGame();
  game.board = drawBoard();
  const player = game.board[14][14];
  game.currentPlayer = player;
  game.board[14][14] = EMPTY;
  playMove(game, 14, 14);
  assert.equal(game.status, 'draw');
  assert.equal(undoMoves(game), 1);
  assert.equal(game.status, 'playing');
  assert.equal(game.currentPlayer, player);
  assert.equal(game.board[14][14], EMPTY);
});

for (const difficulty of ['normal', 'hard']) {
  test(`${difficulty} AI starts in center, is deterministic and returns null on a full board`, () => {
    const board = createGame().board;
    assert.deepEqual(chooseAIMove(board, BLACK, { difficulty }), { row: 7, col: 7 });
    board[7][7] = BLACK;
    const first = chooseAIMove(board, WHITE, { difficulty });
    assert.deepEqual(chooseAIMove(board, WHITE, { difficulty }), first);
    assert.equal(board[first.row][first.col], EMPTY);
    assert.equal(chooseAIMove(drawBoard(), WHITE, { difficulty }), null);
  });

  test(`${difficulty} AI wins before defending an immediate opponent win`, () => {
    const board = boardWith([[3, 1, WHITE], [3, 2, WHITE], [3, 3, WHITE], [3, 4, WHITE], [3, 0, BLACK],
      [8, 5, BLACK], [8, 6, BLACK], [8, 7, BLACK], [8, 8, BLACK], [8, 4, WHITE]]);
    assert.deepEqual(chooseAIMove(board, WHITE, { difficulty }), { row: 3, col: 5 });
  });

  test(`${difficulty} AI blocks an immediate broken four, including on an edge`, () => {
    const board = boardWith([[0, 10, BLACK], [0, 11, BLACK], [0, 13, BLACK], [0, 14, BLACK], [7, 7, WHITE]]);
    assert.deepEqual(chooseAIMove(board, WHITE, { difficulty }), { row: 0, col: 12 });
  });

  test(`${difficulty} AI makes a double open-three fork`, () => {
    const board = boardWith([[7, 6, WHITE], [7, 8, WHITE], [6, 7, WHITE], [8, 7, WHITE], [2, 2, BLACK], [3, 4, BLACK]]);
    assert.deepEqual(chooseAIMove(board, WHITE, { difficulty }), { row: 7, col: 7 });
  });

  test(`${difficulty} AI recognizes a broken-three setup and does not mutate its input`, () => {
    const board = boardWith([[7, 5, WHITE], [7, 7, WHITE], [7, 8, WHITE], [2, 2, BLACK]]);
    const before = JSON.stringify(board);
    const move = chooseAIMove(board, WHITE, { difficulty });
    assert.deepEqual(move, { row: 7, col: 6 });
    assert.equal(JSON.stringify(board), before);
  });

  test(`${difficulty} AI blocks an opponent double open-three fork`, () => {
    const board = boardWith([[7, 6, BLACK], [7, 8, BLACK], [6, 7, BLACK], [8, 7, BLACK], [2, 2, WHITE]]);
    assert.deepEqual(chooseAIMove(board, WHITE, { difficulty }), { row: 7, col: 7 });
  });

  test(`${difficulty} AI takes a forced two-ended four before preventing a future threat`, () => {
    const board = boardWith([[7, 5, WHITE], [7, 7, WHITE], [7, 8, WHITE],
      [2, 4, BLACK], [2, 5, BLACK], [2, 6, BLACK]]);
    assert.deepEqual(chooseAIMove(board, WHITE, { difficulty }), { row: 7, col: 6 });
  });
}

test('hard AI handles a representative midgame within a broad 2-second budget', () => {
  const board = boardWith([[7, 7, BLACK], [7, 8, WHITE], [8, 7, BLACK], [6, 7, WHITE], [9, 7, BLACK],
    [8, 8, WHITE], [5, 9, BLACK], [10, 7, WHITE], [6, 9, BLACK], [5, 8, WHITE], [6, 8, BLACK], [9, 9, WHITE]]);
  const before = JSON.stringify(board);
  const started = performance.now();
  const move = chooseAIMove(board, WHITE, { difficulty: 'hard' });
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 2000, `AI took ${elapsed.toFixed(1)}ms`);
  assert.equal(board[move.row][move.col], EMPTY);
  assert.equal(JSON.stringify(board), before);
  console.log(`Hard AI representative midgame: ${elapsed.toFixed(1)} ms`);
});
