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
    color: "rgb(78, 8, 175)",
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
    color: "rgb(175, 12, 88)",
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
    color: "#22d3ee",
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
    color: "#22c55e",
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
    color: "#facc15",
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
    color: "#3b82f6",
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
    color: "#f97316",
    shape: [
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
];

const CELL_COLORS = {
  1: "rgb(78, 8, 175)",
  2: "rgb(175, 12, 88)",
  3: "#22d3ee",
  4: "#22c55e",
  5: "#facc15",
  6: "#3b82f6",
  7: "#f97316",
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
  const intervalRef = useRef(null);
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
    const { board: clearedBoard, cleared } = clearLines(lockedBoard);
    setBoard(clearedBoard);
    if (cleared > 0) {
      setScore((prev) => prev + SCORE_TABLE[cleared] * (level + 1));
    }
    if (cleared > 0) {
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
  };

  const stepDown = () => {
    if (!active) return;
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
  }, [status, active, board]);
  
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
    <div className="min-h-screen bg-gradient-to-r from-[#0a0014] via-[#2a0650] to-[#0a0014] px-4 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1 text-center">
          <h1 className="text-4xl uppercase tracking-wide text-white">Brick Drop</h1>
          <p className="mt-4 text-sm text-slate-300">
            <span className="block pb-6">Classic Tetris.</span>
            <span className="block pb-10 pt-10">
              Use arrows to move,
              <br />
              Up or X to rotate,
              <br />
              Space for hard drop,
              <br />
              and P to pause.
            </span>
          </p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-violet-400 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-widest">
            <span className="text-violet-200">Status</span>
            <span className="font-semibold text-white">{statusLabel}</span>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={startGame}
              className="rounded-full bg-orange-400 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-300"
            >
              {status === "gameover" ? "Restart" : "Start"}
            </button>
            <button
              type="button"
              onClick={togglePause}
              className="rounded-full border border-violet-400 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-violet-100 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-white"
              disabled={status !== "running" && status !== "paused"}
            >
              {status === "paused" ? "Resume" : "Pause"}
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-4">
          <div
            className="grid gap-1 rounded-2xl border border-violet-400 bg-board-900 p-2 shadow-2xl"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          >
            {displayBoard.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isGhost =
                  cell === 0 && ghostCells.has(`${rowIndex}-${colIndex}`);
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`h-7 w-7 rounded-sm border border-orange-400/70 ${
                      cell === 0 ? "bg-board-900" : ""
                    }`}
                    style={cell === 0 ? undefined : { backgroundColor: CELL_COLORS[cell] }}
                  >
                    {isGhost ? (
                      <div className="h-full w-full rounded-sm border border-white/40 bg-white/10" />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <div className="rounded-2xl border border-violet-400 bg-board-800 p-4 flex flex-col items-center">
            <p className="text-xs uppercase tracking-widest text-slate-400">Next</p>
            <div
              className="mt-4 inline-grid gap-1 rounded-xl bg-board-900 p-2"
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
                          className={`h-5 w-5 rounded-sm border border-orange-400/70 ${
                            filled && nextPiece ? "" : "bg-board-900"
                          }`}
                          style={
                            filled && nextPiece
                              ? { backgroundColor: CELL_COLORS[nextPiece.id] }
                              : undefined
                          }
                        />
                    );
                  })
                : null}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-400 bg-board-800 p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              <span className="block pb-6">Stats</span>
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Score</p>
                <p className="mt-1 font-display text-2xl text-white">{score}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Board</p>
                <p className="mt-1 text-sm text-slate-200">{COLS} x {ROWS}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Level</p>
                <p className="mt-1 font-display text-2xl text-white">{level}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Lines</p>
                <p className="mt-1 font-display text-2xl text-white">{lines}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">High</p>
                <p className="mt-1 font-display text-2xl text-white">{highScore}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Speed</p>
                <p className="mt-1 font-display text-2xl text-white">
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
