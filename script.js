const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (siteNav.classList.contains('is-open')) {
        siteNav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

(function initGames() {
  const gameCards = Array.from(document.querySelectorAll('[data-game]'));
  const snake = {
    canvas: document.getElementById('snakeCanvas'),
    status: document.getElementById('snake-status'),
    score: document.getElementById('snake-score'),
    highScore: document.getElementById('snake-high-score'),
    countdown: document.getElementById('snake-countdown'),
    overlay: document.getElementById('snake-overlay'),
    start: document.querySelector('[data-action="snake-start"]'),
    pause: document.querySelector('[data-action="snake-pause"]'),
    restart: document.querySelector('[data-action="snake-restart"]'),
  };
  const tetris = {
    canvas: document.getElementById('tetrisCanvas'),
    status: document.getElementById('tetris-status'),
    score: document.getElementById('tetris-score'),
    lines: document.getElementById('tetris-lines'),
    level: document.getElementById('tetris-level'),
    overlay: document.getElementById('tetris-overlay'),
    start: document.querySelector('[data-action="tetris-start"]'),
    pause: document.querySelector('[data-action="tetris-pause"]'),
    restart: document.querySelector('[data-action="tetris-restart"]'),
  };

  if (
    !snake.canvas ||
    !snake.canvas.getContext ||
    !snake.status ||
    !snake.score ||
    !snake.highScore ||
    !snake.countdown ||
    !snake.overlay ||
    !tetris.canvas ||
    !tetris.canvas.getContext ||
    !tetris.status ||
    !tetris.score ||
    !tetris.lines ||
    !tetris.level ||
    !tetris.overlay
  ) {
    return;
  }

  const snakeCtx = snake.canvas.getContext('2d');
  const tetrisCtx = tetris.canvas.getContext('2d');
  const GRID = 20;
  const snakeCols = snake.canvas.width / GRID;
  const snakeRows = snake.canvas.height / GRID;
  const TETRIS_COLS = 10;
  const TETRIS_ROWS = 20;
  const TETRIS_CELL = tetris.canvas.width / TETRIS_COLS;
  const snakeKey = 'qvkill-create-snake-high-score';

  const dirs = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const snakeStates = { idle: '대기 중', running: '진행 중', paused: '일시정지', gameOver: '게임 오버' };
  const tetrisStates = { idle: '대기 중', running: '진행 중', paused: '일시정지', gameOver: '게임 오버' };
  const pieceColors = { I: '#59d6ff', J: '#6f8cff', L: '#ffb05b', O: '#ffd86e', S: '#6be29a', T: '#cf84ff', Z: '#ff6d7c' };

  const state = {
    activeGame: 'snake',
    lastFrame: 0,
    snake: {
      phase: 'idle',
      score: 0,
      highScore: 0,
      snake: [],
      food: { x: 0, y: 0 },
      enemy: null,
      enemyDirection: { ...dirs.left },
      currentDirection: { ...dirs.right },
      pendingDirection: { ...dirs.right },
      snakeAccumulator: 0,
      enemyAccumulator: 0,
      explosionAccumulator: 0,
      loop: 0,
    },
    tetris: {
      phase: 'idle',
      score: 0,
      lines: 0,
      level: 1,
      board: createBoard(),
      piece: null,
      rotation: 0,
      dropAccumulator: 0,
      loop: 0,
    },
  };

  function loadSnakeHighScore() {
    try {
      const stored = Number(window.localStorage.getItem(snakeKey));
      return Number.isFinite(stored) ? stored : 0;
    } catch {
      return 0;
    }
  }

  function saveSnakeHighScore(value) {
    try {
      window.localStorage.setItem(snakeKey, String(value));
    } catch {
      // Local storage may be unavailable in restricted environments.
    }
  }

  function createBoard() {
    return Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(''));
  }

  function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
  }

  function rotateMatrix(matrix, direction = 1) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (direction > 0) {
          rotated[x][rows - 1 - y] = matrix[y][x];
        } else {
          rotated[cols - 1 - x][y] = matrix[y][x];
        }
      }
    }

    return rotated;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function serialize(point) {
    return `${point.x},${point.y}`;
  }

  function isSamePoint(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function setActiveGame(name) {
    state.activeGame = name;
    gameCards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.game === name);
    });
  }

  function updateSnakeHud() {
    snake.status.textContent = snakeStates[state.snake.phase] || snakeStates.idle;
    snake.score.textContent = String(state.snake.score);
    snake.highScore.textContent = String(state.snake.highScore);
    const countdown = Math.max(0, (5000 - state.snake.explosionAccumulator) / 1000);
    snake.countdown.textContent = `${countdown.toFixed(1)}s`;
    const overlayVisible = state.snake.phase !== 'running';
    snake.overlay.classList.toggle('is-visible', overlayVisible);
    snake.overlay.innerHTML =
      state.snake.phase === 'running'
        ? ''
        : state.snake.phase === 'paused'
          ? '<strong>지렁이 게임이 일시정지 상태입니다.</strong><span>다시 시작하려면 Start를 누르세요.</span>'
          : state.snake.phase === 'gameOver'
            ? '<strong>지렁이 게임 오버!</strong><span>Restart로 다시 도전하세요.</span>'
            : '<strong>지렁이 게임을 선택하면 방향키로 시작합니다.</strong><span>일시정지와 재시작을 지원합니다.</span>';
  }

  function updateTetrisHud() {
    tetris.status.textContent = tetrisStates[state.tetris.phase] || tetrisStates.idle;
    tetris.score.textContent = String(state.tetris.score);
    tetris.lines.textContent = String(state.tetris.lines);
    tetris.level.textContent = String(state.tetris.level);
    tetris.overlay.classList.toggle('is-visible', state.tetris.phase !== 'running');
    tetris.overlay.innerHTML =
      state.tetris.phase === 'running'
        ? ''
        : state.tetris.phase === 'paused'
          ? '<strong>테트리스가 일시정지 상태입니다.</strong><span>다시 시작하려면 Start를 누르세요.</span>'
          : state.tetris.phase === 'gameOver'
            ? '<strong>테트리스 게임 오버!</strong><span>Restart로 새 판을 시작하세요.</span>'
            : '<strong>테트리스 게임을 선택하면 키보드로 시작합니다.</strong><span>좌우 이동, 회전, 하드 드롭, 재시작을 지원합니다.</span>';
  }

  function randomEnemyDirection() {
    const options = Object.values(dirs);
    return { ...options[randomInt(0, options.length - 1)] };
  }

  function spawnSnakeFood() {
    const blocked = new Set(state.snake.snake.map(serialize));
    if (state.snake.enemy) {
      blocked.add(serialize(state.snake.enemy.position));
    }

    let point = { x: randomInt(0, snakeCols - 1), y: randomInt(0, snakeRows - 1) };
    let safety = snakeCols * snakeRows;
    while (blocked.has(serialize(point)) && safety > 0) {
      point = { x: randomInt(0, snakeCols - 1), y: randomInt(0, snakeRows - 1) };
      safety -= 1;
    }

    return point;
  }

  function spawnSnakeEnemy() {
    const blocked = new Set(state.snake.snake.map(serialize));
    blocked.add(serialize(state.snake.food));
    let position = { x: randomInt(1, snakeCols - 2), y: randomInt(1, snakeRows - 2) };
    let safety = snakeCols * snakeRows;
    while (blocked.has(serialize(position)) && safety > 0) {
      position = { x: randomInt(1, snakeCols - 2), y: randomInt(1, snakeRows - 2) };
      safety -= 1;
    }

    state.snake.enemy = {
      position,
      exploding: false,
      explosionTime: 0,
      hue: randomInt(12, 32),
    };
    state.snake.enemyDirection = randomEnemyDirection();
  }

  function resetSnake(keepPhase = false) {
    state.snake.snake = [
      { x: 6, y: 9 },
      { x: 5, y: 9 },
      { x: 4, y: 9 },
    ];
    state.snake.score = 0;
    state.snake.snakeAccumulator = 0;
    state.snake.enemyAccumulator = 0;
    state.snake.explosionAccumulator = 0;
    state.snake.currentDirection = { ...dirs.right };
    state.snake.pendingDirection = { ...dirs.right };
    state.snake.food = { x: 16, y: 10 };
    spawnSnakeEnemy();
    state.snake.food = spawnSnakeFood();
    if (!keepPhase) {
      state.snake.phase = 'idle';
    }
    updateSnakeHud();
  }

  function snakeStart() {
    if (state.snake.phase === 'gameOver') {
      snakeRestart();
      return;
    }
    if (state.snake.phase === 'idle' || state.snake.phase === 'paused') {
      state.snake.phase = 'running';
      updateSnakeHud();
    }
  }

  function snakePause() {
    if (state.snake.phase !== 'running') {
      return;
    }
    state.snake.phase = 'paused';
    updateSnakeHud();
  }

  function snakeRestart() {
    resetSnake(true);
    state.snake.phase = 'running';
    updateSnakeHud();
  }

  function snakeChangeDirection(nextName) {
    if (!dirs[nextName]) {
      return;
    }
    const currentName = Object.entries(dirs).find(([, value]) => value.x === state.snake.currentDirection.x && value.y === state.snake.currentDirection.y)?.[0];
    if (currentName && opposite[currentName] === nextName) {
      return;
    }
    state.snake.pendingDirection = { ...dirs[nextName] };
    if (state.snake.phase === 'idle') {
      snakeStart();
    }
  }

  function snakeStep() {
    state.snake.currentDirection = { ...state.snake.pendingDirection };
    const nextHead = {
      x: state.snake.snake[0].x + state.snake.currentDirection.x,
      y: state.snake.snake[0].y + state.snake.currentDirection.y,
    };

    if (nextHead.x < 0 || nextHead.x >= snakeCols || nextHead.y < 0 || nextHead.y >= snakeRows) {
      state.snake.phase = 'gameOver';
      if (state.snake.score > state.snake.highScore) {
        state.snake.highScore = state.snake.score;
        saveSnakeHighScore(state.snake.highScore);
      }
      updateSnakeHud();
      return;
    }

    const bodyWithoutTail = state.snake.snake.slice(0, -1);
    if (bodyWithoutTail.some((segment) => isSamePoint(segment, nextHead))) {
      state.snake.phase = 'gameOver';
      if (state.snake.score > state.snake.highScore) {
        state.snake.highScore = state.snake.score;
        saveSnakeHighScore(state.snake.highScore);
      }
      updateSnakeHud();
      return;
    }

    if (state.snake.enemy && !state.snake.enemy.exploding && isSamePoint(nextHead, state.snake.enemy.position)) {
      state.snake.phase = 'gameOver';
      if (state.snake.score > state.snake.highScore) {
        state.snake.highScore = state.snake.score;
        saveSnakeHighScore(state.snake.highScore);
      }
      updateSnakeHud();
      return;
    }

    state.snake.snake.unshift(nextHead);

    if (isSamePoint(nextHead, state.snake.food)) {
      state.snake.score += 10;
      if (state.snake.score > state.snake.highScore) {
        state.snake.highScore = state.snake.score;
        saveSnakeHighScore(state.snake.highScore);
      }
      state.snake.food = spawnSnakeFood();
    } else {
      state.snake.snake.pop();
    }
  }

  function moveSnakeEnemy() {
    if (!state.snake.enemy || state.snake.enemy.exploding) {
      return;
    }
    if (Math.random() < 0.55) {
      state.snake.enemyDirection = randomEnemyDirection();
    }

    let nextPosition = {
      x: state.snake.enemy.position.x + state.snake.enemyDirection.x,
      y: state.snake.enemy.position.y + state.snake.enemyDirection.y,
    };

    if (nextPosition.x < 0 || nextPosition.x >= snakeCols) {
      state.snake.enemyDirection = { x: -state.snake.enemyDirection.x, y: state.snake.enemyDirection.y };
      nextPosition.x = Math.min(snakeCols - 1, Math.max(0, state.snake.enemy.position.x + state.snake.enemyDirection.x));
    }

    if (nextPosition.y < 0 || nextPosition.y >= snakeRows) {
      state.snake.enemyDirection = { x: state.snake.enemyDirection.x, y: -state.snake.enemyDirection.y };
      nextPosition.y = Math.min(snakeRows - 1, Math.max(0, state.snake.enemy.position.y + state.snake.enemyDirection.y));
    }

    if (state.snake.snake.some((segment) => isSamePoint(segment, nextPosition))) {
      state.snake.phase = 'gameOver';
      if (state.snake.score > state.snake.highScore) {
        state.snake.highScore = state.snake.score;
        saveSnakeHighScore(state.snake.highScore);
      }
      updateSnakeHud();
      return;
    }

    state.snake.enemy.position = nextPosition;
  }

  function handleSnakeExplosion(dt) {
    state.snake.explosionAccumulator += dt;
    if (!state.snake.enemy.exploding && state.snake.explosionAccumulator >= 5000) {
      state.snake.enemy.exploding = true;
      state.snake.enemy.explosionTime = 0;
      state.snake.explosionAccumulator = 0;
    }

    if (state.snake.enemy.exploding) {
      state.snake.enemy.explosionTime += dt;
      const dangerCells = [
        state.snake.enemy.position,
        { x: state.snake.enemy.position.x + 1, y: state.snake.enemy.position.y },
        { x: state.snake.enemy.position.x - 1, y: state.snake.enemy.position.y },
        { x: state.snake.enemy.position.x, y: state.snake.enemy.position.y + 1 },
        { x: state.snake.enemy.position.x, y: state.snake.enemy.position.y - 1 },
      ].filter((point) => point.x >= 0 && point.x < snakeCols && point.y >= 0 && point.y < snakeRows);

      if (state.snake.snake.some((segment) => dangerCells.some((cell) => isSamePoint(segment, cell)))) {
        state.snake.phase = 'gameOver';
        if (state.snake.score > state.snake.highScore) {
          state.snake.highScore = state.snake.score;
          saveSnakeHighScore(state.snake.highScore);
        }
        updateSnakeHud();
        return;
      }

      if (state.snake.enemy.explosionTime >= 650) {
        spawnSnakeEnemy();
        state.snake.food = spawnSnakeFood();
        state.snake.explosionAccumulator = 0;
      }
    }
  }

  function drawSnakeRoundRect(ctx, x, y, width, height, radius, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + width, y, x + width, y + height, radius);
      ctx.arcTo(x + width, y + height, x, y + height, radius);
      ctx.arcTo(x, y + height, x, y, radius);
      ctx.arcTo(x, y, x + width, y, radius);
    }
    ctx.fill();
  }

  function renderSnake() {
    snakeCtx.fillStyle = '#08111f';
    snakeCtx.fillRect(0, 0, snake.canvas.width, snake.canvas.height);

    snakeCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    snakeCtx.lineWidth = 1;
    for (let x = 0; x <= snakeCols; x += 1) {
      const px = x * GRID + 0.5;
      snakeCtx.beginPath();
      snakeCtx.moveTo(px, 0);
      snakeCtx.lineTo(px, snake.canvas.height);
      snakeCtx.stroke();
    }
    for (let y = 0; y <= snakeRows; y += 1) {
      const py = y * GRID + 0.5;
      snakeCtx.beginPath();
      snakeCtx.moveTo(0, py);
      snakeCtx.lineTo(snake.canvas.width, py);
      snakeCtx.stroke();
    }

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
    drawSnakeRoundRect(snakeCtx, state.snake.food.x * GRID + 2, state.snake.food.y * GRID + 2, GRID - 4, GRID - 4, 8, `rgba(255, 197, 87, ${0.88 + pulse * 0.12})`);
    snakeCtx.fillStyle = '#321800';
    snakeCtx.beginPath();
    snakeCtx.arc(state.snake.food.x * GRID + GRID / 2, state.snake.food.y * GRID + GRID / 2, 4, 0, Math.PI * 2);
    snakeCtx.fill();

    if (state.snake.enemy) {
      if (state.snake.enemy.exploding) {
        const scale = 1 + state.snake.enemy.explosionTime / 650;
        const centerX = state.snake.enemy.position.x * GRID + GRID / 2;
        const centerY = state.snake.enemy.position.y * GRID + GRID / 2;
        [12, 18, 24].forEach((radius, index) => {
          snakeCtx.strokeStyle = index === 0 ? '#ffcf8d' : '#ff624b';
          snakeCtx.lineWidth = 4 - index;
          snakeCtx.beginPath();
          snakeCtx.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
          snakeCtx.stroke();
        });
      } else {
        drawSnakeRoundRect(snakeCtx, state.snake.enemy.position.x * GRID + 2, state.snake.enemy.position.y * GRID + 2, GRID - 4, GRID - 4, 10, `hsl(${state.snake.enemy.hue} 90% 58%)`);
        snakeCtx.fillStyle = '#1b0505';
        snakeCtx.beginPath();
        snakeCtx.arc(state.snake.enemy.position.x * GRID + GRID / 2, state.snake.enemy.position.y * GRID + GRID / 2, 4, 0, Math.PI * 2);
        snakeCtx.fill();
      }
    }

    state.snake.snake.forEach((segment, index) => {
      drawSnakeRoundRect(snakeCtx, segment.x * GRID + 2, segment.y * GRID + 2, GRID - 4, GRID - 4, index === 0 ? 9 : 7, `hsl(${index === 0 ? 142 : 160} 58% ${index === 0 ? 56 : 34}%)`);
    });
    const head = state.snake.snake[0];
    snakeCtx.fillStyle = '#08111f';
    snakeCtx.beginPath();
    snakeCtx.arc(head.x * GRID + GRID / 2 - 3, head.y * GRID + GRID / 2 - 2, 1.8, 0, Math.PI * 2);
    snakeCtx.arc(head.x * GRID + GRID / 2 + 3, head.y * GRID + GRID / 2 - 2, 1.8, 0, Math.PI * 2);
    snakeCtx.fill();
  }

  function createTetrisPiece(type) {
    const shapes = {
      I: [[1, 1, 1, 1]],
      J: [[1, 0, 0], [1, 1, 1]],
      L: [[0, 0, 1], [1, 1, 1]],
      O: [[1, 1], [1, 1]],
      S: [[0, 1, 1], [1, 1, 0]],
      T: [[0, 1, 0], [1, 1, 1]],
      Z: [[1, 1, 0], [0, 1, 1]],
    };
    return {
      type,
      matrix: cloneMatrix(shapes[type]),
      x: Math.floor(TETRIS_COLS / 2) - 2,
      y: -1,
    };
  }

  function randomPiece() {
    const types = Object.keys(pieceColors);
    return createTetrisPiece(types[randomInt(0, types.length - 1)]);
  }

  function collides(board, piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) {
          continue;
        }
        const boardX = piece.x + x + offsetX;
        const boardY = piece.y + y + offsetY;
        if (boardX < 0 || boardX >= TETRIS_COLS || boardY >= TETRIS_ROWS) {
          return true;
        }
        if (boardY >= 0 && board[boardY][boardX]) {
          return true;
        }
      }
    }
    return false;
  }

  function mergePiece() {
    const { piece, board } = state.tetris;
    piece.matrix.forEach((row, y) => {
      row.forEach((filled, x) => {
        if (!filled) {
          return;
        }
        const boardY = piece.y + y;
        const boardX = piece.x + x;
        if (boardY >= 0) {
          board[boardY][boardX] = piece.type;
        }
      });
    });
  }

  function clearLines() {
    let cleared = 0;
    for (let y = state.tetris.board.length - 1; y >= 0; y -= 1) {
      if (state.tetris.board[y].every(Boolean)) {
        state.tetris.board.splice(y, 1);
        state.tetris.board.unshift(Array(TETRIS_COLS).fill(''));
        cleared += 1;
        y += 1;
      }
    }

    if (cleared > 0) {
      state.tetris.lines += cleared;
      const lineScores = [0, 100, 300, 500, 800];
      state.tetris.score += lineScores[cleared] * state.tetris.level;
      state.tetris.level = Math.floor(state.tetris.lines / 10) + 1;
    }
  }

  function spawnTetrisPiece() {
    state.tetris.piece = randomPiece();
    state.tetris.piece.x = Math.floor(TETRIS_COLS / 2) - 2;
    state.tetris.piece.y = 0;
    if (collides(state.tetris.board, state.tetris.piece)) {
      state.tetris.phase = 'gameOver';
      updateTetrisHud();
      return false;
    }
    return true;
  }

  function resetTetris(keepPhase = false) {
    state.tetris.board = createBoard();
    state.tetris.score = 0;
    state.tetris.lines = 0;
    state.tetris.level = 1;
    state.tetris.dropAccumulator = 0;
    spawnTetrisPiece();
    if (!keepPhase) {
      state.tetris.phase = 'idle';
    }
    updateTetrisHud();
  }

  function tetrisStart() {
    if (state.tetris.phase === 'gameOver') {
      tetrisRestart();
      return;
    }
    if (state.tetris.phase === 'idle' || state.tetris.phase === 'paused') {
      state.tetris.phase = 'running';
      updateTetrisHud();
    }
  }

  function tetrisPause() {
    if (state.tetris.phase !== 'running') {
      return;
    }
    state.tetris.phase = 'paused';
    updateTetrisHud();
  }

  function tetrisRestart() {
    resetTetris(true);
    state.tetris.phase = 'running';
    updateTetrisHud();
  }

  function lockTetrisPiece() {
    mergePiece();
    clearLines();
    if (!spawnTetrisPiece()) {
      return;
    }
  }

  function moveTetrisPiece(offsetX, offsetY) {
    if (state.tetris.phase !== 'running') {
      return false;
    }
    if (!collides(state.tetris.board, state.tetris.piece, offsetX, offsetY)) {
      state.tetris.piece.x += offsetX;
      state.tetris.piece.y += offsetY;
      return true;
    }
    if (offsetY > 0) {
      lockTetrisPiece();
    }
    return false;
  }

  function rotateTetrisPiece(direction) {
    if (state.tetris.phase !== 'running') {
      return;
    }
    const rotated = rotateMatrix(state.tetris.piece.matrix, direction);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collides(state.tetris.board, state.tetris.piece, kick, 0, rotated)) {
        state.tetris.piece.matrix = rotated;
        state.tetris.piece.x += kick;
        return;
      }
    }
  }

  function hardDropTetris() {
    if (state.tetris.phase !== 'running') {
      return;
    }
    while (!collides(state.tetris.board, state.tetris.piece, 0, 1)) {
      state.tetris.piece.y += 1;
    }
    lockTetrisPiece();
  }

  function tetrisStep(dt) {
    if (state.tetris.phase !== 'running') {
      return;
    }
    state.tetris.dropAccumulator += dt;
    const interval = Math.max(90, 700 - (state.tetris.level - 1) * 55);
    while (state.tetris.dropAccumulator >= interval && state.tetris.phase === 'running') {
      state.tetris.dropAccumulator -= interval;
      if (!moveTetrisPiece(0, 1)) {
        break;
      }
    }
  }

  function drawTetrisCell(x, y, color, alpha = 1) {
    tetrisCtx.globalAlpha = alpha;
    tetrisCtx.fillStyle = color;
    tetrisCtx.fillRect(x * TETRIS_CELL + 1, y * TETRIS_CELL + 1, TETRIS_CELL - 2, TETRIS_CELL - 2);
    tetrisCtx.globalAlpha = 1;
  }

  function renderTetris() {
    tetrisCtx.fillStyle = '#07101d';
    tetrisCtx.fillRect(0, 0, tetris.canvas.width, tetris.canvas.height);

    tetrisCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    tetrisCtx.lineWidth = 1;
    for (let x = 0; x <= TETRIS_COLS; x += 1) {
      const px = x * TETRIS_CELL + 0.5;
      tetrisCtx.beginPath();
      tetrisCtx.moveTo(px, 0);
      tetrisCtx.lineTo(px, tetris.canvas.height);
      tetrisCtx.stroke();
    }
    for (let y = 0; y <= TETRIS_ROWS; y += 1) {
      const py = y * TETRIS_CELL + 0.5;
      tetrisCtx.beginPath();
      tetrisCtx.moveTo(0, py);
      tetrisCtx.lineTo(tetris.canvas.width, py);
      tetrisCtx.stroke();
    }

    state.tetris.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          drawTetrisCell(x, y, pieceColors[cell] || '#ffffff');
        }
      });
    });

    if (state.tetris.piece) {
      state.tetris.piece.matrix.forEach((row, y) => {
        row.forEach((filled, x) => {
          if (!filled) {
            return;
          }
          const boardX = state.tetris.piece.x + x;
          const boardY = state.tetris.piece.y + y;
          if (boardY >= 0) {
            drawTetrisCell(boardX, boardY, pieceColors[state.tetris.piece.type]);
          }
        });
      });
    }
  }

  function handleSnakeKey(key) {
    const mapping = {
      arrowup: 'up',
      w: 'up',
      arrowdown: 'down',
      s: 'down',
      arrowleft: 'left',
      a: 'left',
      arrowright: 'right',
      d: 'right',
    };
    if (mapping[key]) {
      snakeChangeDirection(mapping[key]);
      return true;
    }
    if (key === ' ' || key === 'spacebar') {
      if (state.snake.phase === 'running') {
        snakePause();
      } else {
        snakeStart();
      }
      return true;
    }
    if (key === 'p') {
      if (state.snake.phase === 'running') {
        snakePause();
      } else {
        snakeStart();
      }
      return true;
    }
    if (key === 'r') {
      snakeRestart();
      return true;
    }
    return false;
  }

  function handleTetrisKey(key) {
    if (key === 'arrowleft' || key === 'a') {
      moveTetrisPiece(-1, 0);
      return true;
    }
    if (key === 'arrowright' || key === 'd') {
      moveTetrisPiece(1, 0);
      return true;
    }
    if (key === 'arrowdown' || key === 's') {
      moveTetrisPiece(0, 1);
      state.tetris.score += 1;
      updateTetrisHud();
      return true;
    }
    if (key === 'arrowup' || key === 'x') {
      rotateTetrisPiece(1);
      return true;
    }
    if (key === 'z') {
      rotateTetrisPiece(-1);
      return true;
    }
    if (key === ' ' || key === 'spacebar') {
      hardDropTetris();
      return true;
    }
    if (key === 'p') {
      if (state.tetris.phase === 'running') {
        tetrisPause();
      } else {
        tetrisStart();
      }
      return true;
    }
    if (key === 'r') {
      tetrisRestart();
      return true;
    }
    return false;
  }

  function frame(now) {
    const dt = now - state.lastFrame;
    state.lastFrame = now;

    if (state.snake.phase === 'running') {
      state.snake.snakeAccumulator += dt;
      state.snake.enemyAccumulator += dt;
      while (state.snake.snakeAccumulator >= 120 && state.snake.phase === 'running') {
        snakeStep();
        state.snake.snakeAccumulator -= 120;
      }
      while (state.snake.enemyAccumulator >= 170 && state.snake.phase === 'running') {
        moveSnakeEnemy();
        state.snake.enemyAccumulator -= 170;
      }
      if (state.snake.phase === 'running') {
        handleSnakeExplosion(dt);
      }
    }

    tetrisStep(dt);
    renderSnake();
    renderTetris();
    updateSnakeHud();
    updateTetrisHud();

    window.requestAnimationFrame(frame);
  }

  function bindGameControls() {
    gameCards.forEach((card) => {
      card.addEventListener('pointerdown', () => setActiveGame(card.dataset.game));
      card.addEventListener('focusin', () => setActiveGame(card.dataset.game));
    });

    snake.start.addEventListener('click', () => {
      setActiveGame('snake');
      snakeStart();
    });
    snake.pause.addEventListener('click', () => {
      setActiveGame('snake');
      snakePause();
    });
    snake.restart.addEventListener('click', () => {
      setActiveGame('snake');
      snakeRestart();
    });

    tetris.start.addEventListener('click', () => {
      setActiveGame('tetris');
      tetrisStart();
    });
    tetris.pause.addEventListener('click', () => {
      setActiveGame('tetris');
      tetrisPause();
    });
    tetris.restart.addEventListener('click', () => {
      setActiveGame('tetris');
      tetrisRestart();
    });
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    let handled = false;

    if (state.activeGame === 'snake') {
      handled = handleSnakeKey(key);
    } else {
      handled = handleTetrisKey(key);
    }

    if (handled) {
      event.preventDefault();
    }
  });

  snake.highScore = loadSnakeHighScore();
  resetSnake();
  resetTetris();
  bindGameControls();
  setActiveGame('snake');
  updateSnakeHud();
  updateTetrisHud();
  state.lastFrame = performance.now();
  window.requestAnimationFrame(frame);
})();
