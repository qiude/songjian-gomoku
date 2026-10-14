/* Gomoku rules and a deterministic tactical AI. No DOM or external libraries. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GomokuCore = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SIZE = 15;
  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const inside = (row, col) => Number.isInteger(row) && Number.isInteger(col) &&
    row >= 0 && row < SIZE && col >= 0 && col < SIZE;
  const other = player => 3 - player;

  function createGame() {
    return {
      board: Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY)),
      history: [],
      currentPlayer: BLACK,
      status: 'playing',
      winner: EMPTY,
      winningLine: []
    };
  }

  function getWinningLine(board, row, col, player) {
    if (!inside(row, col) || ![BLACK, WHITE].includes(player) || board[row][col] !== player) return [];
    for (const [dr, dc] of DIRECTIONS) {
      const before = [];
      const after = [];
      for (let n = 1; inside(row - n * dr, col - n * dc) &&
        board[row - n * dr][col - n * dc] === player; n++) {
        before.push({ row: row - n * dr, col: col - n * dc });
      }
      for (let n = 1; inside(row + n * dr, col + n * dc) &&
        board[row + n * dr][col + n * dc] === player; n++) {
        after.push({ row: row + n * dr, col: col + n * dc });
      }
      if (before.length + after.length >= 4) return before.reverse().concat({ row, col }, after);
    }
    return [];
  }

  function playMove(game, row, col) {
    if (game.status !== 'playing' || !inside(row, col) || game.board[row][col] !== EMPTY) return false;
    const player = game.currentPlayer;
    game.board[row][col] = player;
    game.history.push({ row, col, player });
    game.winningLine = getWinningLine(game.board, row, col, player);
    if (game.winningLine.length) {
      game.status = 'won';
      game.winner = player;
    } else if (game.board.every(line => line.every(cell => cell !== EMPTY))) {
      game.status = 'draw';
    } else {
      game.currentPlayer = other(player);
    }
    return true;
  }

  // Returns the number actually undone. Terminal games become playable again.
  function undoMoves(game, count = 1) {
    if (!Number.isFinite(count) || count < 1) return 0;
    let undone = 0;
    const limit = Math.min(Math.floor(count), game.history.length);
    while (undone < limit) {
      const move = game.history.pop();
      game.board[move.row][move.col] = EMPTY;
      game.currentPlayer = move.player;
      undone++;
    }
    if (undone) {
      game.status = 'playing';
      game.winner = EMPTY;
      game.winningLine = [];
    }
    return undone;
  }

  function wouldWin(board, row, col, player) {
    if (!inside(row, col) || board[row][col] !== EMPTY) return false;
    for (const [dr, dc] of DIRECTIONS) {
      let length = 1;
      for (const sign of [-1, 1]) {
        for (let n = 1; inside(row + n * dr * sign, col + n * dc * sign) &&
          board[row + n * dr * sign][col + n * dc * sign] === player; n++) length++;
      }
      if (length >= 5) return true;
    }
    return false;
  }

  // Limiting moves to two intersections from existing stones avoids aimless play.
  function candidateMoves(board) {
    const seen = new Set();
    const moves = [];
    let stones = 0;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[row][col] === EMPTY) continue;
        stones++;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const r = row + dr;
            const c = col + dc;
            const key = r * SIZE + c;
            if (!inside(r, c) || board[r][c] !== EMPTY || seen.has(key)) continue;
            seen.add(key);
            moves.push({ row: r, col: c });
          }
        }
      }
    }
    return stones ? moves : [{ row: 7, col: 7 }];
  }

  function centeredRun(line) {
    let length = 1;
    for (let i = 4; i >= 0 && line[i] === 'X'; i--) length++;
    for (let i = 6; i < 11 && line[i] === 'X'; i++) length++;
    return length;
  }

  function hasCenteredPattern(line, patterns) {
    const text = line.join('');
    return patterns.some(pattern => {
      for (let start = 0; start + pattern.length <= text.length; start++) {
        if (start <= 5 && start + pattern.length > 5 && text.slice(start, start + pattern.length) === pattern) return true;
      }
      return false;
    });
  }

  // All analysis uses the supplied square as a hypothetical stone. Board is untouched.
  function analyzeMove(board, row, col, player) {
    let score = 0;
    let fours = 0;
    let openThrees = 0;
    const winningTargets = new Map();
    for (const [dr, dc] of DIRECTIONS) {
      const line = [];
      for (let offset = -5; offset <= 5; offset++) {
        const r = row + offset * dr;
        const c = col + offset * dc;
        line.push(offset === 0 ? 'X' : !inside(r, c) ? '#' :
          board[r][c] === player ? 'X' : board[r][c] === EMPTY ? '.' : 'O');
      }
      if (centeredRun(line) >= 5) return { score: 100000000, winningTargets: [] };
      let directionWins = 0;
      for (let i = 1; i < 10; i++) {
        if (line[i] !== '.') continue;
        line[i] = 'X';
        if (centeredRun(line) >= 5) {
          directionWins++;
          const r = row + (i - 5) * dr;
          const c = col + (i - 5) * dc;
          winningTargets.set(r * SIZE + c, { row: r, col: c });
        }
        line[i] = '.';
      }
      if (directionWins >= 2) {
        score += 1000000;
        fours++;
      } else if (directionWins === 1) {
        score += 65000;
        fours++;
      } else if (hasCenteredPattern(line, ['.XXX.', '.XX.X.', '.X.XX.'])) {
        score += 10000;
        openThrees++;
      } else {
        let best = 0;
        for (let start = 1; start <= 5; start++) {
          const window = line.slice(start, start + 5);
          if (window.includes('#') || window.includes('O')) continue;
          const stones = window.filter(cell => cell === 'X').length;
          best = Math.max(best, stones === 3 ? 1200 : stones === 2 ? 90 : 8);
        }
        if (hasCenteredPattern(line, ['.XX.', '.X.X.', '.X..X.'])) best = Math.max(best, 450);
        score += best;
      }
    }
    // Threats in different directions can force a win even without a long run yet.
    if (winningTargets.size >= 2) score += 1600000;
    if (fours && openThrees) score += 700000;
    if (openThrees >= 2) score += 260000;
    return { score, winningTargets: Array.from(winningTargets.values()) };
  }

  function positionTie(a, b) {
    const centerDistance = move => Math.abs(move.row - 7) + Math.abs(move.col - 7);
    return centerDistance(a) - centerDistance(b) || a.row - b.row || a.col - b.col;
  }

  function rankMoves(board, player, moves) {
    const opponent = other(player);
    return moves.map(move => {
      const attack = analyzeMove(board, move.row, move.col, player);
      const defense = analyzeMove(board, move.row, move.col, opponent);
      return { ...move, attack, defense, score: attack.score + defense.score * 1.08 };
    }).sort((a, b) => b.score - a.score || positionTie(a, b));
  }

  function chooseAIMove(board, player = WHITE, options = {}) {
    if (![BLACK, WHITE].includes(player)) return null;
    const moves = candidateMoves(board);
    if (!moves.length) return null;
    const opponent = other(player);
    const wins = moves.filter(move => wouldWin(board, move.row, move.col, player));
    if (wins.length) return plainMove(rankMoves(board, player, wins)[0]);
    const blocks = moves.filter(move => wouldWin(board, move.row, move.col, opponent));
    // Win immediately before blocking. If several losses are unavoidable, block the best square.
    if (blocks.length) return plainMove(rankMoves(board, player, blocks)[0]);
    const ranked = rankMoves(board, player, moves);
    // With no immediate enemy win, two distinct winning replies force victory.
    // This certainty takes priority over preventing a future opponent pattern.
    const forcedWin = ranked.find(move => move.attack.winningTargets.length >= 2);
    if (forcedWin) return plainMove(forcedWin);
    if (options.difficulty !== 'hard' || ranked.length === 1) return plainMove(ranked[0]);

    // Hard mode looks ahead to the opponent's strongest threat at up to 12 promising moves.
    // A private board also makes the public no-mutation contract explicit.
    const scratch = board.map(line => line.slice());
    let best = null;
    for (const move of ranked.slice(0, 12)) {
      scratch[move.row][move.col] = player;
      let score = move.score;
      if (move.attack.winningTargets.length >= 2) {
        score += 20000000;
      } else if (move.attack.winningTargets.length === 1) {
        // A four forces this single reply; judge what can follow the reply.
        const reply = move.attack.winningTargets[0];
        scratch[reply.row][reply.col] = opponent;
        let continuation = 0;
        for (const next of candidateMoves(scratch)) {
          continuation = Math.max(continuation, analyzeMove(scratch, next.row, next.col, player).score);
        }
        score += Math.min(continuation, 3000000) * 0.55;
        scratch[reply.row][reply.col] = EMPTY;
      } else {
        let worstThreat = 0;
        for (const reply of candidateMoves(scratch)) {
          worstThreat = Math.max(worstThreat, analyzeMove(scratch, reply.row, reply.col, opponent).score);
        }
        score -= worstThreat * 0.65;
      }
      scratch[move.row][move.col] = EMPTY;
      if (!best || score > best.score || (score === best.score && positionTie(move, best) < 0)) {
        best = { row: move.row, col: move.col, score };
      }
    }
    return plainMove(best);
  }

  function plainMove(move) {
    return { row: move.row, col: move.col };
  }

  return { SIZE, EMPTY, BLACK, WHITE, createGame, playMove, undoMoves, getWinningLine, chooseAIMove };
}));
