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

(function initGame() {
  const canvas = document.getElementById('gameCanvas');
  const statusEl = document.getElementById('game-status');
  const scoreEl = document.getElementById('game-score');
  const highScoreEl = document.getElementById('game-high-score');
  const countdownEl = document.getElementById('game-countdown');
  const overlayEl = document.getElementById('game-overlay');
  const actionButtons = document.querySelectorAll('[data-action]');
  const directionButtons = document.querySelectorAll('[data-direction]');

  if (!canvas || !canvas.getContext || !statusEl || !scoreEl || !highScoreEl || !countdownEl || !overlayEl) {
    return;
  }

  const context = canvas.getContext('2d');
  const GRID_SIZE = 20;
  const COLS = canvas.width / GRID_SIZE;
  const ROWS = canvas.height / GRID_SIZE;
  const STORAGE_KEY = 'qvkill-create-snake-high-score';
  const MOVE_INTERVAL = 120;
  const ENEMY_MOVE_INTERVAL = 170;
  const ENEMY_EXPLOSION_INTERVAL = 5000;
  const ENEMY_EXPLOSION_DURATION = 650;

  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const oppositeDirections = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  };

  let loopId = 0;
  let lastFrame = 0;
  let snakeAccumulator = 0;
  let enemyAccumulator = 0;
  let enemyExplosionAccumulator = 0;
  let gamePhase = 'idle';
  let score = 0;
  let highScore = 0;
  let snake = [];
  let food = { x: 0, y: 0 };
  let enemy = {
    position: { x: 0, y: 0 },
    exploding: false,
    explosionTime: 0,
    hue: 24,
  };
  let currentDirection = { ...directions.right };
  let pendingDirection = { ...directions.right };
  let enemyDirection = { ...directions.left };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const serialize = (point) => `${point.x},${point.y}`;
  const isSamePoint = (a, b) => a.x === b.x && a.y === b.y;

  function readHighScore() {
    try {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY));
      return Number.isFinite(stored) ? stored : 0;
    } catch {
      return 0;
    }
  }

  function writeHighScore(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    highScoreEl.textContent = String(highScore);
    const countdown = Math.max(0, (ENEMY_EXPLOSION_INTERVAL - enemyExplosionAccumulator) / 1000);
    countdownEl.textContent = `${countdown.toFixed(1)}s`;

    const labels = {
      idle: '대기 중',
      running: '진행 중',
      paused: '일시정지',
      gameOver: '게임 오버',
    };
    statusEl.textContent = labels[gamePhase] || '대기 중';

    let headline = '시작하려면 버튼을 누르거나 방향키를 입력하세요.';
    let detail = '일시정지와 재시작도 지원합니다.';
    if (gamePhase === 'paused') {
      headline = '일시정지 상태입니다.';
      detail = '다시 시작하려면 Start를 누르세요.';
    } else if (gamePhase === 'gameOver') {
      headline = '게임 오버!';
      detail = 'Restart로 다시 도전하세요.';
    }

    overlayEl.innerHTML = `<strong>${headline}</strong><span>${detail}</span>`;
    overlayEl.classList.toggle('is-visible', gamePhase !== 'running');
  }

  function randomEnemyDirection() {
    const options = Object.values(directions);
    return { ...options[randomInt(0, options.length - 1)] };
  }

  function spawnFood() {
    const blocked = new Set(snake.map(serialize));
    blocked.add(serialize(enemy.position));

    let point = { x: randomInt(0, COLS - 1), y: randomInt(0, ROWS - 1) };
    let safety = COLS * ROWS;
    while (blocked.has(serialize(point)) && safety > 0) {
      point = { x: randomInt(0, COLS - 1), y: randomInt(0, ROWS - 1) };
      safety -= 1;
    }

    return point;
  }

  function spawnEnemy() {
    const blocked = new Set(snake.map(serialize));
    blocked.add(serialize(food));

    let position = { x: randomInt(1, COLS - 2), y: randomInt(1, ROWS - 2) };
    let safety = COLS * ROWS;
    while (blocked.has(serialize(position)) && safety > 0) {
      position = { x: randomInt(1, COLS - 2), y: randomInt(1, ROWS - 2) };
      safety -= 1;
    }

    enemy = {
      position,
      exploding: false,
      explosionTime: 0,
      hue: randomInt(12, 32),
    };
    enemyDirection = randomEnemyDirection();
  }

  function resetRound(keepPhase = false) {
    snake = [
      { x: 6, y: 9 },
      { x: 5, y: 9 },
      { x: 4, y: 9 },
    ];
    score = 0;
    snakeAccumulator = 0;
    enemyAccumulator = 0;
    enemyExplosionAccumulator = 0;
    currentDirection = { ...directions.right };
    pendingDirection = { ...directions.right };
    enemy = {
      position: { x: 0, y: 0 },
      exploding: false,
      explosionTime: 0,
      hue: 24,
    };
    food = spawnFood();
    spawnEnemy();
    food = spawnFood();

    if (!keepPhase) {
      gamePhase = 'idle';
    }

    updateHud();
  }

  function stopLoop() {
    if (loopId) {
      window.cancelAnimationFrame(loopId);
      loopId = 0;
    }
  }

  function startLoop() {
    if (!loopId) {
      lastFrame = performance.now();
      loopId = window.requestAnimationFrame(step);
    }
  }

  function setGameOver(reason) {
    gamePhase = 'gameOver';
    stopLoop();
    if (score > highScore) {
      highScore = score;
      writeHighScore(highScore);
    }
    statusEl.textContent = reason;
    updateHud();
  }

  function startGame() {
    if (gamePhase === 'gameOver') {
      restartGame();
      return;
    }

    if (gamePhase === 'idle' || gamePhase === 'paused') {
      gamePhase = 'running';
      startLoop();
      updateHud();
    }
  }

  function pauseGame() {
    if (gamePhase !== 'running') {
      return;
    }

    gamePhase = 'paused';
    stopLoop();
    updateHud();
  }

  function restartGame() {
    resetRound(true);
    gamePhase = 'running';
    startLoop();
    updateHud();
  }

  function changeDirection(nextName) {
    if (!directions[nextName]) {
      return;
    }

    const currentName = Object.entries(directions).find(([, value]) => value.x === currentDirection.x && value.y === currentDirection.y)?.[0];
    if (currentName && oppositeDirections[currentName] === nextName) {
      return;
    }

    pendingDirection = { ...directions[nextName] };
    if (gamePhase === 'idle') {
      startGame();
    }
  }

  function moveSnake() {
    currentDirection = { ...pendingDirection };
    const nextHead = {
      x: snake[0].x + currentDirection.x,
      y: snake[0].y + currentDirection.y,
    };

    if (nextHead.x < 0 || nextHead.x >= COLS || nextHead.y < 0 || nextHead.y >= ROWS) {
      setGameOver('벽에 충돌했습니다');
      return;
    }

    const bodyWithoutTail = snake.slice(0, -1);
    if (bodyWithoutTail.some((segment) => isSamePoint(segment, nextHead))) {
      setGameOver('자기 몸에 충돌했습니다');
      return;
    }

    if (!enemy.exploding && isSamePoint(nextHead, enemy.position)) {
      setGameOver('적과 충돌했습니다');
      return;
    }

    snake.unshift(nextHead);

    if (isSamePoint(nextHead, food)) {
      score += 10;
      if (score > highScore) {
        highScore = score;
        writeHighScore(highScore);
      }
      food = spawnFood();
    } else {
      snake.pop();
    }
  }

  function moveEnemy() {
    if (enemy.exploding) {
      return;
    }

    if (Math.random() < 0.55) {
      enemyDirection = randomEnemyDirection();
    }

    let nextPosition = {
      x: enemy.position.x + enemyDirection.x,
      y: enemy.position.y + enemyDirection.y,
    };

    if (nextPosition.x < 0 || nextPosition.x >= COLS) {
      enemyDirection = { x: -enemyDirection.x, y: enemyDirection.y };
      nextPosition.x = clamp(enemy.position.x + enemyDirection.x, 0, COLS - 1);
    }

    if (nextPosition.y < 0 || nextPosition.y >= ROWS) {
      enemyDirection = { x: enemyDirection.x, y: -enemyDirection.y };
      nextPosition.y = clamp(enemy.position.y + enemyDirection.y, 0, ROWS - 1);
    }

    if (snake.some((segment) => isSamePoint(segment, nextPosition))) {
      setGameOver('적이 지렁이를 덮쳤습니다');
      return;
    }

    enemy.position = nextPosition;
  }

  function handleEnemyExplosion(dt) {
    enemyExplosionAccumulator += dt;

    if (!enemy.exploding && enemyExplosionAccumulator >= ENEMY_EXPLOSION_INTERVAL) {
      enemy.exploding = true;
      enemy.explosionTime = 0;
      enemyExplosionAccumulator = 0;
    }

    if (enemy.exploding) {
      enemy.explosionTime += dt;
      const dangerCells = [
        enemy.position,
        { x: enemy.position.x + 1, y: enemy.position.y },
        { x: enemy.position.x - 1, y: enemy.position.y },
        { x: enemy.position.x, y: enemy.position.y + 1 },
        { x: enemy.position.x, y: enemy.position.y - 1 },
      ].filter((point) => point.x >= 0 && point.x < COLS && point.y >= 0 && point.y < ROWS);

      if (snake.some((segment) => dangerCells.some((cell) => isSamePoint(segment, cell)))) {
        setGameOver('폭발에 휘말렸습니다');
        return;
      }

      if (enemy.explosionTime >= ENEMY_EXPLOSION_DURATION) {
        spawnEnemy();
        food = spawnFood();
        enemyExplosionAccumulator = 0;
      }
    }
  }

  function drawRoundRect(x, y, width, height, radius, fillStyle) {
    context.fillStyle = fillStyle;
    context.beginPath();
    if (typeof context.roundRect === 'function') {
      context.roundRect(x, y, width, height, radius);
    } else {
      context.moveTo(x + radius, y);
      context.arcTo(x + width, y, x + width, y + height, radius);
      context.arcTo(x + width, y + height, x, y + height, radius);
      context.arcTo(x, y + height, x, y, radius);
      context.arcTo(x, y, x + width, y, radius);
    }
    context.fill();
  }

  function drawBackground() {
    context.fillStyle = '#08111f';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    context.lineWidth = 1;

    for (let x = 0; x <= COLS; x += 1) {
      const px = x * GRID_SIZE + 0.5;
      context.beginPath();
      context.moveTo(px, 0);
      context.lineTo(px, canvas.height);
      context.stroke();
    }

    for (let y = 0; y <= ROWS; y += 1) {
      const py = y * GRID_SIZE + 0.5;
      context.beginPath();
      context.moveTo(0, py);
      context.lineTo(canvas.width, py);
      context.stroke();
    }
  }

  function drawCell(point, fillStyle, radius = 6) {
    const x = point.x * GRID_SIZE + 2;
    const y = point.y * GRID_SIZE + 2;
    const size = GRID_SIZE - 4;
    drawRoundRect(x, y, size, size, radius, fillStyle);
  }

  function drawFood() {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
    drawCell(food, `rgba(255, 197, 87, ${0.88 + pulse * 0.12})`, 8);

    context.fillStyle = '#321800';
    context.beginPath();
    context.arc(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, 4, 0, Math.PI * 2);
    context.fill();
  }

  function drawEnemy() {
    if (enemy.exploding) {
      const scale = 1 + enemy.explosionTime / ENEMY_EXPLOSION_DURATION;
      const centerX = enemy.position.x * GRID_SIZE + GRID_SIZE / 2;
      const centerY = enemy.position.y * GRID_SIZE + GRID_SIZE / 2;
      const rings = [12, 18, 24];

      rings.forEach((radius, index) => {
        context.strokeStyle = index === 0 ? '#ffcf8d' : '#ff624b';
        context.lineWidth = 4 - index;
        context.beginPath();
        context.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
        context.stroke();
      });
      return;
    }

    drawCell(enemy.position, `hsl(${enemy.hue} 90% 58%)`, 10);
    context.fillStyle = '#1b0505';
    context.beginPath();
    context.arc(enemy.position.x * GRID_SIZE + GRID_SIZE / 2, enemy.position.y * GRID_SIZE + GRID_SIZE / 2, 4, 0, Math.PI * 2);
    context.fill();
  }

  function drawSnake() {
    snake.forEach((segment, index) => {
      const hue = index === 0 ? 142 : 160;
      const light = index === 0 ? 56 : 34;
      drawCell(segment, `hsl(${hue} 58% ${light}%)`, index === 0 ? 9 : 7);
    });

    const head = snake[0];
    context.fillStyle = '#08111f';
    context.beginPath();
    context.arc(head.x * GRID_SIZE + GRID_SIZE / 2 - 3, head.y * GRID_SIZE + GRID_SIZE / 2 - 2, 1.8, 0, Math.PI * 2);
    context.arc(head.x * GRID_SIZE + GRID_SIZE / 2 + 3, head.y * GRID_SIZE + GRID_SIZE / 2 - 2, 1.8, 0, Math.PI * 2);
    context.fill();
  }

  function drawOverlayTint() {
    if (gamePhase !== 'running') {
      context.fillStyle = 'rgba(4, 8, 16, 0.18)';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function render() {
    drawBackground();
    drawFood();
    drawEnemy();
    drawSnake();
    drawOverlayTint();
  }

  function step(now) {
    const dt = now - lastFrame;
    lastFrame = now;

    if (gamePhase === 'running') {
      snakeAccumulator += dt;
      enemyAccumulator += dt;

      while (snakeAccumulator >= MOVE_INTERVAL && gamePhase === 'running') {
        moveSnake();
        snakeAccumulator -= MOVE_INTERVAL;
      }

      while (enemyAccumulator >= ENEMY_MOVE_INTERVAL && gamePhase === 'running') {
        moveEnemy();
        enemyAccumulator -= ENEMY_MOVE_INTERVAL;
      }

      if (gamePhase === 'running') {
        handleEnemyExplosion(dt);
      }
    }

    render();
    updateHud();

    if (gamePhase === 'running') {
      loopId = window.requestAnimationFrame(step);
    } else {
      loopId = 0;
    }
  }

  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'start') {
        startGame();
      } else if (action === 'pause') {
        pauseGame();
      } else if (action === 'restart') {
        restartGame();
      }
    });
  });

  directionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      changeDirection(button.dataset.direction);
    });
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
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
      event.preventDefault();
      changeDirection(mapping[key]);
      return;
    }

    if (key === ' ' || key === 'spacebar') {
      event.preventDefault();
      if (gamePhase === 'running') {
        pauseGame();
      } else {
        startGame();
      }
    }

    if (key === 'r') {
      restartGame();
    }
  });

  highScore = readHighScore();
  resetRound();
  render();
  updateHud();
})();
