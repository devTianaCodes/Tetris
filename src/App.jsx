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
    const stored = window.localStorage.getItem("tetris_high_score");
    if (stored) {
      const value = Number(stored);
      if (!Number.isNaN(value)) setHighScore(value);
    }
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      window.localStorage.setItem("tetris_high_score", String(score));
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
    <div className="min-h-screen bg-gradient-to-r from-[#0a0014] via-[#2a0650] to-[#0a0014] px-4 py-4 md:py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:flex-row md:items-start md:gap-8">
        <div className="order-1 flex-1 text-center pt-0 md:pt-[50px]">
          <h1 className="text-[20px] uppercase tracking-wide text-orange-400 md:text-4xl">
            Brick Drop
          </h1>
          <p className="mt-2 text-xs text-slate-300 md:mt-4 md:text-sm">
            <span className="hidden pb-6 md:block">Classic Tetris</span>
            <span className="hidden pb-10 pt-10 lg:block">
              Use arrows to move,
              <br />
              Up or X to rotate,
              <br />
              Space for hard drop,
              <br />
              and P to pause.
            </span>
          </p>

          {statusLabel !== "Ready" ? (
            <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-300 md:mt-8 md:text-xs">
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

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:mt-10 md:gap-4">
            <button
              type="button"
              onClick={startGame}
              className={`min-w-[110px] md:min-w-[140px] rounded-full border border-violet-400 bg-orange-400 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition hover:-translate-y-0.5 hover:bg-orange-300 md:px-5 md:py-2 md:text-xs ${
                status === "gameover" ? "text-[#0a0014]" : "text-slate-950"
              }`}
            >
              {status === "gameover" ? "Restart" : "Start"}
            </button>
            <button
              type="button"
              onClick={togglePause}
              className="min-w-[110px] md:min-w-[140px] rounded-full border border-violet-400 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-orange-400 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-400/20 hover:text-orange-300 md:px-5 md:py-2 md:text-xs"
              disabled={status !== "running" && status !== "paused"}
            >
              {status === "paused" ? "Resume" : "Pause"}
            </button>
          </div>
        </div>

        <div className="order-3 flex flex-1 items-center justify-center gap-2 md:order-2 md:flex-none">
          <div className="flex flex-col items-center gap-10 md:hidden">
            <button
              type="button"
              onClick={() => moveHorizontally(-1)}
              className="h-10 w-16 rounded-full border border-violet-400 text-[10px] font-semibold uppercase tracking-widest text-orange-400"
            >
              Left
            </button>
            <button
              type="button"
              onClick={hardDrop}
              className="h-10 w-16 rounded-full border border-violet-400 text-[10px] font-semibold uppercase tracking-widest text-orange-400"
            >
              Drop
            </button>
          </div>

          <div
            className="grid gap-0.5 rounded-2xl border border-violet-400 bg-board-900 p-1 shadow-2xl overflow-visible shrink-0 md:gap-1 md:p-2"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          >
            {displayBoard.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isGhost =
                  cell === 0 && ghostCells.has(`${rowIndex}-${colIndex}`);
                const isFlashing = flashingRows.includes(rowIndex) && cell !== 0;
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`relative h-4 w-4 rounded-sm border border-orange-400/70 md:h-7 md:w-7 ${
                      CELL_COLORS[cell]
                    } ${isFlashing ? "animate-pulse brightness-200" : ""}`}
                  >
                    {isGhost ? (
                      <div className="h-full w-full rounded-sm border border-white/40 bg-white/10" />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col items-center gap-10 md:hidden">
            <button
              type="button"
              onClick={() => moveHorizontally(1)}
              className="h-10 w-16 rounded-full border border-violet-400 text-[10px] font-semibold uppercase tracking-widest text-orange-400"
            >
              Right
            </button>
            <button
              type="button"
              onClick={rotate}
              className="h-10 w-16 rounded-full border border-violet-400 text-[10px] font-semibold uppercase tracking-widest text-orange-400"
            >
              Rotate
            </button>
          </div>
        </div>

        <div className="order-2 mx-auto flex w-full max-w-none flex-row gap-1 pt-1 md:order-3 md:ml-5 md:mx-0 md:max-w-xs md:flex-col md:gap-4 md:pt-[50px]">
          <div className="w-1/2 rounded-xl border border-violet-400 bg-board-800 p-1 flex flex-col items-center md:w-auto md:p-4 md:rounded-2xl">
            <p className="text-xs uppercase tracking-widest text-slate-400">Next</p>
            <div
              className="mt-1 inline-grid gap-0.5 rounded-lg bg-board-900 p-1 mb-2 md:mt-4 md:gap-1 md:p-2 md:mb-5 md:rounded-xl"
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
                          className={`h-3.5 w-3.5 rounded-[3px] border border-orange-400/70 md:h-5 md:w-5 md:rounded-sm ${
                            filled && nextPiece ? CELL_COLORS[nextPiece.id] : "bg-board-900"
                          }`}
                        />
                    );
                  })
                : null}
            </div>
          </div>

          <div className="w-1/2 rounded-xl border border-violet-400 bg-board-800 p-1 text-center md:w-auto md:p-4 md:rounded-2xl">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              <span className="block pb-1 md:pb-6">Stats</span>
            </p>
            <div className="grid grid-cols-2 gap-1 pb-1 text-[10px] text-slate-200 md:gap-3 md:pb-5 md:text-sm">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Score</p>
                <p className="mt-1 text-xs text-white md:font-display md:text-2xl">{score}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Board</p>
                <p className="mt-1 text-xs text-white md:font-display md:text-2xl">
                  {COLS} x {ROWS}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Level</p>
                <p className="mt-1 text-xs text-white md:font-display md:text-2xl">{level}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Lines</p>
                <p className="mt-1 text-xs text-white md:font-display md:text-2xl">{lines}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">High</p>
                <p className="mt-1 text-xs text-white md:font-display md:text-2xl">{highScore}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Speed</p>
                <p className="mt-1 text-xs text-white md:font-display md:text-2xl">
                  {Math.round(1000 / dropInterval)}x
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
