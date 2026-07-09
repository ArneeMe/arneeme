import { useState, useEffect } from 'preact/hooks';
import { playSound } from '../../../lib/sounds';

interface Props {
  instanceId: string;
}

const ROWS = 9;
const COLS = 9;
const MINES = 10;

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adj: number;
}

type GameState = 'ready' | 'playing' | 'won' | 'lost';

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adj: 0,
    })),
  );
}

function neighbors(r: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push([nr, nc]);
    }
  }
  return out;
}

/** Plasser miner etter første klikk, slik at første rute alltid er trygg. */
function placeMines(board: Cell[][], safeR: number, safeC: number) {
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (board[r][c].mine || (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)) continue;
    board[r][c].mine = true;
    placed++;
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      board[r][c].adj = neighbors(r, c).filter(([nr, nc]) => board[nr][nc].mine).length;
    }
  }
}

function floodReveal(board: Cell[][], r: number, c: number) {
  const stack: [number, number][] = [[r, c]];
  while (stack.length > 0) {
    const [cr, cc] = stack.pop()!;
    const cell = board[cr][cc];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adj === 0 && !cell.mine) {
      for (const [nr, nc] of neighbors(cr, cc)) {
        if (!board[nr][nc].revealed) stack.push([nr, nc]);
      }
    }
  }
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export default function Minesveiper(_props: Props) {
  const [board, setBoard] = useState<Cell[][]>(emptyBoard);
  const [game, setGame] = useState<GameState>('ready');
  const [flagMode, setFlagMode] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (game !== 'playing') return;
    const id = setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000);
    return () => clearInterval(id);
  }, [game]);

  const reset = () => {
    setBoard(emptyBoard());
    setGame('ready');
    setTime(0);
  };

  const checkWin = (b: Cell[][]): boolean =>
    b.every((row) => row.every((cell) => cell.mine || cell.revealed));

  const revealCell = (r: number, c: number) => {
    if (game === 'won' || game === 'lost') return;
    const next = cloneBoard(board);
    const cell = next[r][c];
    if (cell.revealed || cell.flagged) return;

    if (game === 'ready') {
      placeMines(next, r, c);
      setGame('playing');
    }

    if (cell.mine) {
      // Tapt: vis uflaggede miner; korrekt plasserte flagg blir stående.
      for (const row of next) {
        for (const cl of row) {
          if (cl.mine && !cl.flagged) cl.revealed = true;
        }
      }
      setBoard(next);
      setGame('lost');
      playSound('boom');
      return;
    }

    floodReveal(next, r, c);
    if (checkWin(next)) {
      // Vunnet i det siste trygge feltet åpnes – som i klassisk Minesveiper
      // flagges gjenværende miner automatisk, ellers ville det siste flagget
      // vært umulig å sette (spillet er jo allerede over).
      for (const row of next) {
        for (const cl of row) {
          if (cl.mine) cl.flagged = true;
        }
      }
      setBoard(next);
      setGame('won');
      playSound('win');
      return;
    }
    setBoard(next);
  };

  const toggleFlag = (r: number, c: number) => {
    if (game === 'won' || game === 'lost') return;
    const next = cloneBoard(board);
    const cell = next[r][c];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    setBoard(next);
    playSound('click');
  };

  const onCellClick = (r: number, c: number) => {
    if (flagMode) toggleFlag(r, c);
    else revealCell(r, c);
  };

  const flags = board.flat().filter((c) => c.flagged).length;
  const minesLeft = Math.max(-99, MINES - flags);
  const face = game === 'lost' ? '😵' : game === 'won' ? '😎' : '🙂';
  const NUM_CLASS = ['', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];

  const pad = (n: number) => `${Math.max(0, n)}`.padStart(3, '0');

  return (
    <div class="mines-app">
      <div class="mines-status">
        <span class="mines-counter">{minesLeft < 0 ? `-${pad(-minesLeft).slice(1)}` : pad(minesLeft)}</span>
        <button class="mines-face" onClick={reset} aria-label="Nytt spill">
          {face}
        </button>
        <span class="mines-counter">{pad(time)}</span>
      </div>
      <div
        class="mines-grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, 22px)` }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const revealed = cell.revealed;
            let content = '';
            if (revealed && cell.mine) content = '💣';
            else if (revealed && cell.adj > 0) content = `${cell.adj}`;
            else if (!revealed && cell.flagged) content = '🚩';
            return (
              <button
                key={`${r}-${c}`}
                class={`mines-cell${revealed ? ' revealed' : ''}${revealed && cell.mine ? ' mine' : ''} ${revealed ? NUM_CLASS[cell.adj] : ''}`}
                onClick={() => onCellClick(r, c)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleFlag(r, c);
                }}
                aria-label={`Rute ${r + 1},${c + 1}`}
              >
                {content}
              </button>
            );
          }),
        )}
      </div>
      <div class="mines-footer">
        <button
          class={`mines-flagmode${flagMode ? ' active' : ''}`}
          onClick={() => setFlagMode((v) => !v)}
          title="Flaggmodus – for berøringsskjermer"
        >
          🚩 Flaggmodus {flagMode ? 'på' : 'av'}
        </button>
        <span class="mines-hint">Høyreklikk for flagg</span>
      </div>
    </div>
  );
}
