import { useEffect, useMemo, useRef, useState } from "react";

const ROWS = 20;
const COLS = 10;
const BASE_DROP_INTERVAL = 500;
const MIN_DROP_INTERVAL = 100;
const LINES_PER_LEVEL = 10;

const TETROMINOES = [
  {
    id: 1,
    name: "I",
    color: "bg-cyan-400",
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    id: 2,
    name: "O",
    color: "bg-yellow-400",
    shape: [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    id: 3,
    name: "T",
    color: "bg-purple-400",
    shape: [
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    id: 4,
    name: "S",
    color: "bg-emerald-400",
    shape: [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    id: 5,
    name: "Z",
    color: "bg-red-400",
    shape: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    id: 6,
    name: "J",
    color: "bg-blue-400",
    shape: [
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    id: 7,
    name: "L",
    color: "bg-orange-400",
    shape: [
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
];

const CELL_COLORS = {
  0: "bg-board-900",
  1: "bg-cyan-400",
  2: "bg-yellow-400",
  3: "bg-purple-400",
  4: "bg-emerald-400",
  5: "bg-red-400",
  6: "bg-blue-400",
  7: "bg-orange-400",
};

const CELL_GLOW = {
  1: "rgba(34, 211, 238, 0.6)",
  2: "rgba(250, 204, 21, 0.6)",
  3: "rgba(192, 132, 252, 0.6)",
  4: "rgba(34, 197, 94, 0.6)",
  5: "rgba(239, 68, 68, 0.6)",
  6: "rgba(59, 130, 246, 0.6)",
  7: "rgba(249, 115, 22, 0.6)",
};

const SCORE_TABLE = [0, 100, 300, 500, 800];

const emptyBoard = () =>
  Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));

const rotateMatrix = (matrix) =>
  matrix[0].map((_, col) => matrix.map((row) => row[col]).reverse());

const cloneBoard = (board) => board.map((row) => [...row]);

const canPlace = (board, shape, x, y) => {
  for (let row = 0; row < shape.length; row += 1) {
    for (let col = 0; col < shape[row].length; col += 1) {
      if (!shape[row][col]) continue;
      const nextX = x + col;
      const nextY = y + row;
      if (nextX < 0 || nextX >= COLS || nextY >= ROWS) return false;
      if (nextY >= 0 && board[nextY][nextX]) return false;
    }
  }
  return true;
};

const mergePiece = (board, piece) => {
  const next = cloneBoard(board);
  piece.shape.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) return;
      const targetY = piece.y + rowIndex;
      const targetX = piece.x + colIndex;
      if (targetY >= 0 && targetY < ROWS) {
        next[targetY][targetX] = piece.id;
      }
    });
  });
  return next;
};

const clearLines = (board) => {
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = ROWS - remaining.length;
  const newRows = Array.from({ length: cleared }, () =>
    Array.from({ length: COLS }, () => 0)
  );
  return {
    board: [...newRows, ...remaining],
    cleared,
  };
};

const createPieceFromTemplate = (template) => ({
  id: template.id,
  color: template.color,
  shape: template.shape.map((row) => [...row]),
  x: Math.floor((COLS - 4) / 2),
  y: -1,
});

const randomPiece = () => {
  const template = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return {
    ...createPieceFromTemplate(template),
  };
};

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export default function App() {
  const [board, setBoard] = useState(() => emptyBoard());
  const [active, setActive] = useState(() => randomPiece());
  const [nextPiece, setNextPiece] = useState(() => randomPiece());
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [flashingRows, setFlashingRows] = useState([]);
  const intervalRef = useRef(null);
  const clearTimeoutRef = useRef(null);
  const bagRef = useRef([]);

  const ghostPiece = useMemo(() => {
    if (!active) return null;
    let nextY = active.y;
    while (canPlace(board, active.shape, active.x, nextY + 1)) {
      nextY += 1;
    }
    return { ...active, y: nextY };
  }, [board, active]);

  const displayBoard = useMemo(() => {
    if (!active) return board;
    return mergePiece(board, active);
  }, [board, active]);

  const refillBag = () => {
    bagRef.current = shuffle(TETROMINOES);
  };

  const drawFromBag = () => {
    if (bagRef.current.length === 0) {
      refillBag();
    }
    const template = bagRef.current.pop();
    return createPieceFromTemplate(template);
  };

  const startGame = () => {
    const freshBoard = emptyBoard();
    refillBag();
    const firstPiece = drawFromBag();
    const upcoming = drawFromBag();
    setBoard(freshBoard);
    setScore(0);
    setLines(0);
    setLevel(0);
    if (!canPlace(freshBoard, firstPiece.shape, firstPiece.x, firstPiece.y)) {
      setStatus("gameover");
      return;
    }
    setActive(firstPiece);
    setNextPiece(upcoming);
    setStatus("running");
  };

  const togglePause = () => {
    setStatus((prev) => (prev === "running" ? "paused" : "running"));
  };

  const lockAndSpawn = (piece) => {
    const lockedBoard = mergePiece(board, piece);
    const fullRows = lockedBoard
      .map((row, index) => (row.every((cell) => cell !== 0) ? index : -1))
      .filter((index) => index !== -1);

    setBoard(lockedBoard);
    setActive(null);

    if (fullRows.length === 0) {
      const upcoming = nextPiece ?? drawFromBag();
      const newNext = drawFromBag();
      if (!canPlace(lockedBoard, upcoming.shape, upcoming.x, upcoming.y)) {
        setStatus("gameover");
        return;
      }
      setActive(upcoming);
      setNextPiece(newNext);
      return;
    }

    setIsClearing(true);
    setFlashingRows(fullRows);

    clearTimeoutRef.current = setTimeout(() => {
      const { board: clearedBoard, cleared } = clearLines(lockedBoard);
      setBoard(clearedBoard);
      setFlashingRows([]);
      setIsClearing(false);
      if (cleared > 0) {
        setScore((prev) => prev + SCORE_TABLE[cleared] * (level + 1));
        setLines((prev) => {
          const total = prev + cleared;
          setLevel(Math.floor(total / LINES_PER_LEVEL));
          return total;
        });
      }

      const upcoming = nextPiece ?? drawFromBag();
      const newNext = drawFromBag();
      if (!canPlace(clearedBoard, upcoming.shape, upcoming.x, upcoming.y)) {
        setStatus("gameover");
        return;
      }
      setActive(upcoming);
      setNextPiece(newNext);
    }, 550);
  };

  const stepDown = () => {
    if (!active) return;
    if (isClearing) return;
    if (canPlace(board, active.shape, active.x, active.y + 1)) {
      setActive((prev) => ({ ...prev, y: prev.y + 1 }));
      return;
    }
    lockAndSpawn(active);
  };

  const moveHorizontally = (direction) => {
    if (!active) return;
    const nextX = active.x + direction;
    if (canPlace(board, active.shape, nextX, active.y)) {
      setActive((prev) => ({ ...prev, x: nextX }));
    }
  };

  const rotate = () => {
    if (!active) return;
    const rotated = rotateMatrix(active.shape);
    if (canPlace(board, rotated, active.x, active.y)) {
      setActive((prev) => ({ ...prev, shape: rotated }));
      return;
    }
    if (canPlace(board, rotated, active.x - 1, active.y)) {
      setActive((prev) => ({ ...prev, shape: rotated, x: prev.x - 1 }));
      return;
    }
    if (canPlace(board, rotated, active.x + 1, active.y)) {
      setActive((prev) => ({ ...prev, shape: rotated, x: prev.x + 1 }));
    }
  };

  const hardDrop = () => {
    if (!active) return;
    let nextY = active.y;
    while (canPlace(board, active.shape, active.x, nextY + 1)) {
      nextY += 1;
    }
    const dropDistance = Math.max(0, nextY - active.y);
    if (dropDistance > 0) {
      setScore((prev) => prev + dropDistance * 2);
    }
    const landed = { ...active, y: nextY };
    setActive(landed);
    lockAndSpawn(landed);
  };

  const dropInterval = Math.max(
    MIN_DROP_INTERVAL,
    BASE_DROP_INTERVAL - level * 35
  );

  useEffect(() => {
    if (status !== "running") return;
    intervalRef.current = setInterval(stepDown, dropInterval);
    return () => clearInterval(intervalRef.current);
  }, [status, active, board, dropInterval]);

  useEffect(() => {
    const handleKey = (event) => {
      if (status === "idle") return;
      if (status === "gameover") return;
      if (isClearing) return;
      if (status === "paused") {
        if (event.code === "KeyP") togglePause();
        return;
      }
      switch (event.code) {
        case "ArrowLeft":
          moveHorizontally(-1);
          break;
        case "ArrowRight":
          moveHorizontally(1);
          break;
        case "ArrowDown":
          if (status === "running") {
            setScore((prev) => prev + 1);
          }
          stepDown();
          break;
        case "ArrowUp":
        case "KeyX":
          rotate();
          break;
        case "Space":
          event.preventDefault();
          hardDrop();
          break;
        case "KeyP":
          togglePause();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [status, active, board, isClearing]);

  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    const stored = window.localStorage.getItem("BrickDrop_high_score");
    if (stored) {
      const value = Number(stored);
      if (!Number.isNaN(value)) setHighScore(value);
    }
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      window.localStorage.setItem("BrickDrop_high_score", String(score));
    }
  }, [score, highScore]);

  const statusLabel =
    status === "running"
      ? "Running"
      : status === "paused"
      ? "Paused"
      : status === "gameover"
      ? "Game Over"
      : "Ready";

  const ghostCells = useMemo(() => {
    if (!ghostPiece) return new Set();
    const cells = new Set();
    ghostPiece.shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (!cell) return;
        const y = ghostPiece.y + rowIndex;
        const x = ghostPiece.x + colIndex;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
          cells.add(`${y}-${x}`);
        }
      });
    });
    return cells;
  }, [ghostPiece]);

  const nextBounds = useMemo(() => {
    if (!nextPiece) return null;
    let minRow = 4;
    let maxRow = -1;
    let minCol = 4;
    let maxCol = -1;
    nextPiece.shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (!cell) return;
        minRow = Math.min(minRow, rowIndex);
        maxRow = Math.max(maxRow, rowIndex);
        minCol = Math.min(minCol, colIndex);
        maxCol = Math.max(maxCol, colIndex);
      });
    });
    if (maxRow === -1 || maxCol === -1) return null;
    return {
      minRow,
      maxRow,
      minCol,
      maxCol,
      rows: maxRow - minRow + 1,
      cols: maxCol - minCol + 1,
    };
  }, [nextPiece]);

  const nextPreviewDims = useMemo(() => {
    if (!nextBounds) return { rows: 4, cols: 6, startRow: 0, startCol: 0 };
    const rows = 4;
    const cols = 6;
    return {
      rows,
      cols,
      startRow: Math.floor((rows - nextBounds.rows) / 2),
      startCol: Math.floor((cols - nextBounds.cols) / 2),
    };
  }, [nextBounds]);

  return (
    <div className="relative flex h-[100dvh] min-h-[100dvh] items-center overflow-hidden bg-gradient-to-br from-[#05000d] via-[#1b0a3d] to-[#060012] text-slate-100 md:h-screen md:min-h-screen md:px-6">
      <div className="flex h-full w-full flex-col md:hidden">
        <section className="flex h-[60dvh] min-h-0 items-center justify-center px-4 pb-3 pt-[max(3rem,calc(env(safe-area-inset-top)+2.5rem))]">
          <div className="relative shrink-0 overflow-hidden rounded-2xl">
            <div
              className="grid gap-0.5 rounded-2xl border border-violet-400/70 bg-black/40 p-1.5 shadow-[0_0_38px_rgba(92,60,160,0.48)]"
              style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
            >
              {displayBoard.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isGhost =
                    cell === 0 && ghostCells.has(`${rowIndex}-${colIndex}`);
                  const isFlashing =
                    flashingRows.includes(rowIndex) && cell !== 0;
                  return (
                    <div
                      key={`mobile-${rowIndex}-${colIndex}`}
                      className={`relative aspect-square w-[min(calc((60dvh-6.5rem)/20),calc((100vw-3rem)/10))] rounded-sm ${
                        cell === 0
                          ? "bg-black/40 border border-white/5 shadow-[0_0_8px_rgba(255,255,255,0.06)]"
                          : `${CELL_COLORS[cell]} border border-black/20`
                      } ${isFlashing ? "animate-pulse brightness-200" : ""}`}
                      style={
                        cell === 0
                          ? undefined
                          : {
                              boxShadow: `0 0 10px ${CELL_GLOW[cell]}, 0 0 20px ${CELL_GLOW[cell]}`,
                            }
                      }
                    >
                      {isGhost ? (
                        <div className="h-full w-full rounded-sm border border-white/40 bg-white/10" />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            {status === "gameover" ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/50 px-3 text-center backdrop-blur-[2px]">
                <div>
                  <p className="font-display text-4xl font-semibold uppercase leading-none text-orange-300 drop-shadow-[0_0_18px_rgba(249,115,22,0.85)]">
                    Game
                  </p>
                  <p className="font-display text-4xl font-semibold uppercase leading-none text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.45)]">
                    Over
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="flex h-[40dvh] min-h-0 flex-col justify-center bg-black/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[clamp(1.1rem,3dvh,2rem)]">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={togglePause}
              disabled={status !== "running" && status !== "paused"}
              className={`mobile-control-button ${status === "paused" ? "mobile-control-resume" : "mobile-control-pause"} h-[clamp(2.25rem,5.5dvh,2.75rem)] min-w-28 rounded-full px-4 text-[11px] font-black uppercase tracking-widest text-white transition-transform`}
            >
              <span className="mr-2 text-sm">Ⅱ</span>
              {status === "paused" ? "Resume" : "Pause"}
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_0.9fr] items-center gap-4">
            <div className="grid grid-cols-3 grid-rows-2 gap-[clamp(0.45rem,1.7dvh,0.9rem)]">
              <button
                type="button"
                onClick={() => moveHorizontally(-1)}
                disabled={status !== "running" || isClearing}
                className="mobile-control-button flex h-[clamp(2.9rem,9dvh,4.75rem)] w-full items-center justify-center rounded-2xl text-3xl font-black text-slate-950 transition-transform"
              >
                ←
              </button>
              <button
                type="button"
                onClick={hardDrop}
                disabled={status !== "running" || isClearing}
                className="mobile-control-button col-start-2 row-start-2 flex h-[clamp(2.9rem,9dvh,4.75rem)] w-full items-center justify-center rounded-2xl text-3xl font-black text-slate-950 transition-transform"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => moveHorizontally(1)}
                disabled={status !== "running" || isClearing}
                className="mobile-control-button col-start-3 flex h-[clamp(2.9rem,9dvh,4.75rem)] w-full items-center justify-center rounded-2xl text-3xl font-black text-slate-950 transition-transform"
              >
                →
              </button>
            </div>

            <div className="grid grid-rows-2 gap-[clamp(0.45rem,1.7dvh,0.9rem)]">
              <button
                type="button"
                onClick={rotate}
                disabled={status !== "running" || isClearing}
                className="mobile-control-button flex h-[clamp(2.9rem,9dvh,4.75rem)] w-full items-center justify-center rounded-2xl text-3xl font-black text-slate-950 transition-transform"
              >
                ↻
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto hidden h-full w-full max-w-7xl justify-center gap-3 md:grid md:grid-cols-[minmax(210px,1fr)_auto_minmax(260px,1fr)] md:items-center md:gap-10">
        <div className="order-1 flex-1 text-center md:flex md:flex-none md:flex-col md:items-center md:justify-center">
          <h1 className="text-2xl uppercase tracking-wide text-orange-400 md:text-5xl">
            Brick Drop
          </h1>
          <div className="mt-1 text-xs text-slate-200 md:mt-5 md:text-base">
            <span className="hidden pb-6 md:block">Classic BrickDrop</span>
            <div className="hidden pt-4 lg:flex lg:flex-col lg:items-center lg:gap-3 lg:text-xs lg:uppercase lg:tracking-widest lg:text-slate-300">
              <div className="grid w-44 grid-cols-[5.5rem_1fr] items-center gap-3 text-left">
                <span className="inline-flex min-w-[5.5rem] justify-center rounded-md border border-orange-200/70 bg-black/35 px-2 py-1 font-semibold text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.24)]">← →</span>
                <span>Move</span>
              </div>
              <div className="grid w-44 grid-cols-[5.5rem_1fr] items-center gap-3 text-left">
                <span className="inline-flex min-w-[5.5rem] justify-center rounded-md border border-orange-200/70 bg-black/35 px-2 py-1 font-semibold text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.24)]">↑ / X</span>
                <span>Rotate</span>
              </div>
              <div className="grid w-44 grid-cols-[5.5rem_1fr] items-center gap-3 text-left">
                <span className="inline-flex min-w-[5.5rem] justify-center rounded-md border border-orange-200/70 bg-black/35 px-2 py-1 font-semibold text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.24)]">Space</span>
                <span>Drop</span>
              </div>
              <div className="grid w-44 grid-cols-[5.5rem_1fr] items-center gap-3 text-left">
                <span className="inline-flex min-w-[5.5rem] justify-center rounded-md border border-orange-200/70 bg-black/35 px-2 py-1 font-semibold text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.24)]">P</span>
                <span>Pause</span>
              </div>
            </div>
          </div>

          {statusLabel !== "Ready" ? (
            <div className="mt-2 text-xs uppercase tracking-widest text-slate-200 md:mt-8 md:text-sm">
              Status:{" "}
              <span
                className={`font-semibold ${
                  status === "gameover" ? "text-orange-400" : "text-white"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:mt-10 md:gap-4">
            <button
              type="button"
              onClick={startGame}
              className={`min-w-[116px] rounded-full border border-orange-200/70 bg-orange-400/90 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-950 shadow-[0_0_18px_rgba(249,115,22,0.45)] transition hover:-translate-y-0.5 hover:bg-orange-300 md:min-w-[170px] md:px-6 md:py-3 md:text-sm ${
                status === "gameover" ? "text-[#0a0014]" : "text-slate-950"
              }`}
            >
              {status === "gameover" ? "Restart" : "Start"}
            </button>
            <button
              type="button"
              onClick={togglePause}
              className="min-w-[116px] rounded-full border border-violet-400/70 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-orange-300 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white/10 hover:text-orange-200 md:min-w-[170px] md:px-6 md:py-3 md:text-sm"
              disabled={status !== "running" && status !== "paused"}
            >
              {status === "paused" ? "Resume" : "Pause"}
            </button>
          </div>
        </div>

        <div className="order-3 flex flex-none items-center justify-center gap-4 md:order-2 md:h-full md:self-stretch">
          <div className="flex flex-col items-center gap-12 md:hidden">
            <button
              type="button"
              onClick={() => moveHorizontally(-1)}
              className="h-10 w-16 rounded-full border border-violet-400/70 bg-white/5 text-[10px] font-semibold uppercase tracking-widest text-orange-300 shadow-[0_0_12px_rgba(124,70,255,0.35)]"
            >
              Left
            </button>
            <button
              type="button"
              onClick={stepDown}
              className="h-10 w-16 rounded-full border border-violet-400/70 bg-white/5 text-[10px] font-semibold uppercase tracking-widest text-orange-300 shadow-[0_0_12px_rgba(124,70,255,0.35)]"
            >
              Down
            </button>
          </div>

          <div className="relative shrink-0 overflow-hidden rounded-2xl">
            <div
              className="grid gap-0.5 rounded-2xl border border-violet-400/70 bg-black/40 p-1.5 shadow-[0_0_38px_rgba(92,60,160,0.48)] md:gap-1 md:p-3"
              style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
            >
              {displayBoard.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isGhost =
                    cell === 0 && ghostCells.has(`${rowIndex}-${colIndex}`);
                  const isFlashing =
                    flashingRows.includes(rowIndex) && cell !== 0;
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`relative h-4 w-4 rounded-sm md:h-8 md:w-8 lg:h-9 lg:w-9 ${
                        cell === 0
                          ? "bg-black/40 border border-white/5 shadow-[0_0_8px_rgba(255,255,255,0.06)]"
                          : `${CELL_COLORS[cell]} border border-black/20`
                      } ${isFlashing ? "animate-pulse brightness-200" : ""}`}
                      style={
                        cell === 0
                          ? undefined
                          : {
                              boxShadow: `0 0 10px ${CELL_GLOW[cell]}, 0 0 20px ${CELL_GLOW[cell]}`,
                            }
                      }
                    >
                      {isGhost ? (
                        <div className="h-full w-full rounded-sm border border-white/40 bg-white/10" />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            {status === "gameover" ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/50 px-3 text-center backdrop-blur-[2px]">
                <div>
                  <p className="font-display text-4xl font-semibold uppercase leading-none text-orange-300 drop-shadow-[0_0_18px_rgba(249,115,22,0.85)] md:text-7xl">
                    Game
                  </p>
                  <p className="font-display text-4xl font-semibold uppercase leading-none text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.45)] md:text-7xl">
                    Over
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-12 md:hidden">
            <button
              type="button"
              onClick={() => moveHorizontally(1)}
              className="h-10 w-16 rounded-full border border-violet-400/70 bg-white/5 text-[10px] font-semibold uppercase tracking-widest text-orange-300 shadow-[0_0_12px_rgba(124,70,255,0.35)]"
            >
              Right
            </button>
            <button
              type="button"
              onClick={rotate}
              className="h-10 w-16 rounded-full border border-violet-400/70 bg-white/5 text-[10px] font-semibold uppercase tracking-widest text-orange-300 shadow-[0_0_12px_rgba(124,70,255,0.35)]"
            >
              Rotate
            </button>
          </div>
        </div>

        <div className="order-2 mx-auto flex w-full max-w-none flex-row gap-2 md:order-3 md:mx-0 md:flex-col md:gap-5 md:self-center">
          <div className="glass flex w-1/2 flex-col items-center rounded-lg p-2 md:w-auto md:rounded-2xl md:p-5">
            <p className="text-[10px] uppercase tracking-widest text-slate-300 md:text-sm">Next</p>
            <div
              className="mb-1 mt-2 inline-grid gap-0.5 rounded-lg bg-black/30 p-1 md:mb-5 md:mt-4 md:gap-1 md:rounded-xl md:p-2"
              style={{
                gridTemplateColumns: `repeat(${nextPreviewDims.cols}, minmax(0, 1fr))`,
              }}
            >
              {nextBounds
                ? Array.from({
                    length: nextPreviewDims.rows * nextPreviewDims.cols,
                  }).map((_, index) => {
                    const row = Math.floor(index / nextPreviewDims.cols);
                    const col = index % nextPreviewDims.cols;
                    const shapeRow =
                      row - nextPreviewDims.startRow + nextBounds.minRow;
                    const shapeCol =
                      col - nextPreviewDims.startCol + nextBounds.minCol;
                    const filled =
                      shapeRow >= nextBounds.minRow &&
                      shapeRow <= nextBounds.maxRow &&
                      shapeCol >= nextBounds.minCol &&
                      shapeCol <= nextBounds.maxCol &&
                      nextPiece?.shape?.[shapeRow]?.[shapeCol];
                    return (
                        <div
                          key={`${row}-${col}`}
                          className={`h-3.5 w-3.5 rounded-[3px] md:h-6 md:w-6 md:rounded-sm ${
                            filled && nextPiece
                              ? `${CELL_COLORS[nextPiece.id]} border border-black/20`
                              : "bg-black/40 border border-white/5 shadow-[0_0_6px_rgba(255,255,255,0.06)]"
                          }`}
                          style={
                            filled && nextPiece
                              ? {
                                  boxShadow: `0 0 10px ${CELL_GLOW[nextPiece.id]}, 0 0 20px ${CELL_GLOW[nextPiece.id]}`,
                                }
                              : undefined
                          }
                        />
                    );
                  })
                : null}
            </div>
          </div>

          <div className="glass w-1/2 rounded-lg p-2 text-center md:w-auto md:rounded-2xl md:p-5">
            <p className="text-[10px] uppercase tracking-widest text-slate-300 md:text-sm">
              <span className="block pb-1 md:pb-6">Stats</span>
            </p>
            <div className="grid grid-cols-2 gap-1 pb-1 text-[9px] text-slate-300 md:gap-4 md:pb-5 md:text-base">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 md:text-sm">Score</p>
                <p className="mt-0.5 text-base font-semibold text-white md:mt-1 md:font-display md:text-3xl">{score}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 md:text-sm">Board</p>
                <p className="mt-0.5 text-base font-semibold text-white md:mt-1 md:font-display md:text-3xl">
                  {COLS} x {ROWS}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 md:text-sm">Level</p>
                <p className="mt-0.5 text-base font-semibold text-white md:mt-1 md:font-display md:text-3xl">{level}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 md:text-sm">Lines</p>
                <p className="mt-0.5 text-base font-semibold text-white md:mt-1 md:font-display md:text-3xl">{lines}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 md:text-sm">High</p>
                <p className="mt-0.5 text-base font-semibold text-white md:mt-1 md:font-display md:text-3xl">{highScore}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 md:text-sm">Speed</p>
                <p className="mt-0.5 text-base font-semibold text-white md:mt-1 md:font-display md:text-3xl">
                  {Math.round(1000 / dropInterval)}x
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {status === "idle" ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05000d]/70 px-4 backdrop-blur-sm">
          <div className="glass w-full max-w-xl rounded-2xl p-8 text-center shadow-[0_0_45px_rgba(124,70,255,0.28)] md:p-12">
            <p className="text-sm uppercase tracking-[0.35em] text-orange-300/70 md:text-base">
              BrickDrop
            </p>
            <h2 className="mt-2 font-display text-5xl font-semibold uppercase text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)] md:text-7xl">
              Welcome
            </h2>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {TETROMINOES.map((tetromino) => (
                <div
                  key={tetromino.name}
                  className="rounded-lg border border-violet-400/35 bg-black/30 p-2 shadow-[0_0_16px_rgba(124,70,255,0.18)]"
                >
                  <div className="grid grid-cols-4 gap-0.5">
                    {tetromino.shape.flatMap((row, rowIndex) =>
                      row.map((cell, colIndex) => (
                        <div
                          key={[tetromino.name, rowIndex, colIndex].join("-")}
                          className={[
                            "h-2.5 w-2.5 rounded-[2px] md:h-3 md:w-3",
                            cell
                              ? tetromino.color + " border border-black/20 shadow-[0_0_8px_rgba(255,255,255,0.22)]"
                              : "bg-transparent",
                          ].join(" ")}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={startGame}
              className="mt-7 w-full rounded-full border border-orange-200/70 bg-orange-400/95 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-slate-950 shadow-[0_0_24px_rgba(249,115,22,0.48)] transition hover:-translate-y-0.5 hover:bg-orange-300 md:text-base"
            >
              Play
            </button>
          </div>
        </div>
      ) : null}

      {status === "gameover" ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05000d]/55 px-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl p-6 text-center shadow-[0_0_45px_rgba(249,115,22,0.25)] md:p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-orange-300/70 md:text-base">
              Brick Drop
            </p>
            <h2 className="mt-2 font-display text-5xl font-semibold uppercase text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)] md:text-7xl">
              Game Over
            </h2>

            <div className="mt-6 grid grid-cols-3 gap-3 text-slate-300">
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 md:text-xs">
                  Score
                </p>
                <p className="mt-1 font-display text-2xl text-white md:text-3xl">
                  {score}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 md:text-xs">
                  Level
                </p>
                <p className="mt-1 font-display text-2xl text-white md:text-3xl">
                  {level}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 md:text-xs">
                  Lines
                </p>
                <p className="mt-1 font-display text-2xl text-white md:text-3xl">
                  {lines}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="mt-7 w-full rounded-full border border-orange-200/70 bg-orange-400/95 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-slate-950 shadow-[0_0_24px_rgba(249,115,22,0.48)] transition hover:-translate-y-0.5 hover:bg-orange-300 md:text-base"
            >
              Play Again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
