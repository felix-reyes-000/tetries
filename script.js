// Tetris Game with AI Enemy
class TetrisGame {
    constructor() {
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        this.CELL_SIZE = 30;

        // Game state
        this.gameRunning = false;
        this.gamePaused = false;
        this.currentLevel = 1;
        this.playerScore = 0;
        this.aiScore = 0;
        this.dropTime = 0;
        this.dropInterval = 1000; // milliseconds
        this.infiniteMode = false;
        this.opponent = 'ai'; // 'ai' | 'p2'

        // Player and AI/P2 boards
        this.playerBoard = this.createEmptyBoard();
        this.aiBoard = this.createEmptyBoard();

        // Current pieces
        this.playerPiece = null;
        this.aiPiece = null;
        this.p2Piece = null;
        this.nextPiece = null;

        // AI decision making
        this.aiThinkTime = 0;
        this.aiDecisionDelay = 200; // AI takes time to "think"

        // Tetris pieces (Tetrominoes)
        this.pieces = {
            I: {
                shape: [
                    [0, 0, 0, 0],
                    [1, 1, 1, 1],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ],
                color: '#00f5ff'
            },
            O: {
                shape: [
                    [1, 1],
                    [1, 1]
                ],
                color: '#ffff00'
            },
            T: {
                shape: [
                    [0, 1, 0],
                    [1, 1, 1],
                    [0, 0, 0]
                ],
                color: '#a000f0'
            },
            S: {
                shape: [
                    [0, 1, 1],
                    [1, 1, 0],
                    [0, 0, 0]
                ],
                color: '#00f000'
            },
            Z: {
                shape: [
                    [1, 1, 0],
                    [0, 1, 1],
                    [0, 0, 0]
                ],
                color: '#f00000'
            },
            J: {
                shape: [
                    [1, 0, 0],
                    [1, 1, 1],
                    [0, 0, 0]
                ],
                color: '#0000f0'
            },
            L: {
                shape: [
                    [0, 0, 1],
                    [1, 1, 1],
                    [0, 0, 0]
                ],
                color: '#ff7f00'
            }
        };

        this.pieceTypes = Object.keys(this.pieces);

        // Canvas elements
        this.playerCanvas = document.getElementById('player-board');
        this.aiCanvas = document.getElementById('ai-board');
        this.nextPieceCanvas = document.getElementById('next-piece');

        this.playerCtx = this.playerCanvas.getContext('2d');
        this.aiCtx = this.aiCanvas.getContext('2d');
        this.nextPieceCtx = this.nextPieceCanvas.getContext('2d');

        this.keybinds = this.loadKeybinds();

        this.initializeEventListeners();
        this.initializeGame();
    }

    createEmptyBoard() {
        return Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
    }

    initializeEventListeners() {
        // Button events
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('open-settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancel-settings-btn').addEventListener('click', () => this.closeSettings());
        document.getElementById('opponent-select').addEventListener('change', (e) => this.setOpponent(e.target.value));
        document.getElementById('infinite-mode').addEventListener('change', (e) => this.setInfinite(e.target.checked));

        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    initializeGame() {
        this.updateUI();
        this.drawBoards();
        this.generateNextPiece();
        this.reflectOpponentLabels();
        this.populateSettingsUI();
    }

    generateNextPiece() {
        const randomType = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
        this.nextPiece = {
            type: randomType,
            shape: this.pieces[randomType].shape,
            color: this.pieces[randomType].color,
            x: 0,
            y: 0
        };
        this.drawNextPiece();
    }

    spawnPiece(isPlayer = true) {
        const board = isPlayer ? this.playerBoard : (this.opponent === 'ai' ? this.aiBoard : this.aiBoard);
        const piece = {
            type: this.nextPiece.type,
            shape: this.nextPiece.shape,
            color: this.nextPiece.color,
            x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(this.nextPiece.shape[0].length / 2),
            y: 0
        };

        if (isPlayer) {
            this.playerPiece = piece;
        } else {
            if (this.opponent === 'ai') {
                this.aiPiece = piece;
            } else {
                this.p2Piece = piece;
            }
        }

        this.generateNextPiece();

        // Check for game over
        if (this.checkCollision(piece, board)) {
            this.gameOver();
        }
    }

    checkCollision(piece, board, dx = 0, dy = 0) {
        const newX = piece.x + dx;
        const newY = piece.y + dy;

        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardX = newX + x;
                    const boardY = newY + y;

                    if (boardX < 0 || boardX >= this.BOARD_WIDTH ||
                        boardY >= this.BOARD_HEIGHT ||
                        (boardY >= 0 && board[boardY][boardX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    rotatePiece(piece) {
        const rotated = {
            ...piece,
            shape: piece.shape[0].map((_, index) =>
                piece.shape.map(row => row[index]).reverse()
            )
        };
        return rotated;
    }

    placePiece(piece, board) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardX = piece.x + x;
                    const boardY = piece.y + y;
                    if (boardY >= 0) {
                        board[boardY][boardX] = piece.color;
                    }
                }
            }
        }
    }

    clearLines(board) {
        let linesCleared = 0;
        for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
            if (board[y].every(cell => cell !== 0)) {
                board.splice(y, 1);
                board.unshift(Array(this.BOARD_WIDTH).fill(0));
                linesCleared++;
                y++; // Check the same line again
            }
        }
        return linesCleared;
    }

    updateScore(linesCleared, isPlayer = true) {
        const points = [0, 40, 100, 300, 1200][linesCleared] * this.currentLevel;
        if (isPlayer) {
            this.playerScore += points;
        } else {
            this.aiScore += points;
        }

        // Level up every 10 lines
        const totalLines = Math.floor((this.playerScore + this.aiScore) / 100);
        this.currentLevel = Math.floor(totalLines / 10) + 1;
        this.dropInterval = Math.max(100, 1000 - (this.currentLevel - 1) * 50);
    }

    // AI Logic (enhanced)
    analyzeBoardFeatures(board) {
        const heights = new Array(this.BOARD_WIDTH).fill(0);
        let holes = 0;
        let completeLines = 0;
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            let full = true;
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                if (board[y][x]) {
                    if (heights[x] === 0) heights[x] = this.BOARD_HEIGHT - y;
                } else {
                    full = false;
                }
            }
            if (full) completeLines++;
        }
        // Count holes (empty cells with at least one block above)
        for (let x = 0; x < this.BOARD_WIDTH; x++) {
            let seenBlock = false;
            for (let y = 0; y < this.BOARD_HEIGHT; y++) {
                if (board[y][x]) seenBlock = true; else if (seenBlock) holes++;
            }
        }
        const aggregateHeight = heights.reduce((a, b) => a + b, 0);
        let bumpiness = 0;
        for (let i = 0; i < this.BOARD_WIDTH - 1; i++) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }
        const maxHeight = Math.max(...heights);
        return { aggregateHeight, completeLines, holes, bumpiness, maxHeight };
    }

    heuristicScore(board) {
        const f = this.analyzeBoardFeatures(board);
        const wAggregateHeight = -0.510066;
        const wCompleteLines   =  0.760666;
        const wHoles           = -0.35663;
        const wBumpiness       = -0.184483;
        const wMaxHeight       = -0.02;
        return (
            wAggregateHeight * f.aggregateHeight +
            wCompleteLines   * f.completeLines +
            wHoles           * f.holes +
            wBumpiness       * f.bumpiness +
            wMaxHeight       * f.maxHeight
        );
    }

    evaluatePlacement(piece, board, considerNext = true) {
        const temp = board.map(row => [...row]);
        this.placePiece(piece, temp);
        this.clearLines(temp);
        let score = this.heuristicScore(temp);
        if (considerNext && this.nextPiece) {
            const nxt = { type: this.nextPiece.type, shape: this.nextPiece.shape, color: this.nextPiece.color, x: 0, y: 0 };
            const bestNext = this.getBestMoveForBoard(nxt, temp, false);
            score += 0.5 * bestNext.score; // discounted future
        }
        return score;
    }

    getUniqueRotations(piece) {
        const rotations = [];
        let current = { ...piece, shape: piece.shape.map(row => [...row]) };
        for (let r = 0; r < 4; r++) {
            const key = current.shape.map(row => row.join('')).join('|');
            if (!rotations.some(k => k.key === key)) {
                rotations.push({ key, shape: current.shape.map(row => [...row]), rotation: r });
            }
            current = this.rotatePiece(current);
        }
        return rotations;
    }

    simulateDrop(piece, board) {
        const test = { ...piece, shape: piece.shape.map(row => [...row]) };
        while (!this.checkCollision(test, board, 0, 1)) {
            test.y++;
        }
        return test;
    }

    getBestMoveForBoard(piece, board, considerNext = true) {
        let best = { x: piece.x, y: piece.y, rotation: 0, score: -Infinity };
        const rotations = this.getUniqueRotations(piece);
        for (const rot of rotations) {
            const shape = rot.shape;
            const width = shape[0].length;
            const minX = 0;
            const maxX = this.BOARD_WIDTH - width;
            for (let x = minX; x <= maxX; x++) {
                const candidate = { type: piece.type, shape, color: piece.color, x, y: 0 };
                if (this.checkCollision(candidate, board)) continue;
                const landed = this.simulateDrop(candidate, board);
                const score = this.evaluatePlacement(landed, board, considerNext);
                if (score > best.score) best = { x: landed.x, y: landed.y, rotation: rot.rotation, score };
            }
        }
        return best;
    }

    getBestMove(piece, board) {
        return this.getBestMoveForBoard(piece, board, true);
    }

    updateAI() {
        if (!this.gameRunning || this.gamePaused || this.opponent !== 'ai' || !this.aiPiece) return;

        this.aiThinkTime += 16; // Assuming 60fps

        if (this.aiThinkTime >= this.aiDecisionDelay) {
            const bestMove = this.getBestMove(this.aiPiece, this.aiBoard);

            // Move horizontally
            if (bestMove.x < this.aiPiece.x) {
                this.movePiece(this.aiPiece, this.aiBoard, -1, 0);
            } else if (bestMove.x > this.aiPiece.x) {
                this.movePiece(this.aiPiece, this.aiBoard, 1, 0);
            }

            // Rotate
            for (let i = 0; i < bestMove.rotation; i++) {
                const rotated = this.rotatePiece(this.aiPiece);
                if (!this.checkCollision(rotated, this.aiBoard)) {
                    this.aiPiece = rotated;
                }
            }

            this.aiThinkTime = 0;
        }
    }

    movePiece(piece, board, dx, dy) {
        if (!this.checkCollision(piece, board, dx, dy)) {
            piece.x += dx;
            piece.y += dy;
            return true;
        }
        return false;
    }

    dropPiece(piece, board, isPlayer = true) {
        if (this.movePiece(piece, board, 0, 1)) {
            return true;
        } else {
            // Piece has landed
            this.placePiece(piece, board);
            const linesCleared = this.clearLines(board);
            this.updateScore(linesCleared, isPlayer);

            if (isPlayer) {
                this.playerPiece = null;
            } else if (this.opponent === 'ai') {
                this.aiPiece = null;
            } else {
                this.p2Piece = null;
            }

            this.spawnPiece(isPlayer);
            return false;
        }
    }

    handleKeyPress(e) {
        if (!this.gameRunning || this.gamePaused) {
            if (e.code === 'KeyP') {
                this.togglePause();
            }
            return;
        }

        const p1 = this.playerPiece;
        const p2 = this.p2Piece;
        if (!p1 && this.opponent !== 'p2') return;

        // Player 1 controls
        if (p1) {
            if (e.code === this.keybinds.p1.left) this.movePiece(p1, this.playerBoard, -1, 0);
            else if (e.code === this.keybinds.p1.right) this.movePiece(p1, this.playerBoard, 1, 0);
            else if (e.code === this.keybinds.p1.down) this.dropPiece(p1, this.playerBoard, true);
            else if (e.code === this.keybinds.p1.rotate) {
                const r = this.rotatePiece(p1);
                if (!this.checkCollision(r, this.playerBoard)) this.playerPiece = r;
            } else if (e.code === this.keybinds.p1.hard) {
                e.preventDefault();
                while (this.dropPiece(p1, this.playerBoard, true)) { }
            }
        }

        // Player 2 controls (if enabled)
        if (this.opponent === 'p2' && p2) {
            if (e.code === this.keybinds.p2.left) this.movePiece(p2, this.aiBoard, -1, 0);
            else if (e.code === this.keybinds.p2.right) this.movePiece(p2, this.aiBoard, 1, 0);
            else if (e.code === this.keybinds.p2.down) this.dropPiece(p2, this.aiBoard, false);
            else if (e.code === this.keybinds.p2.rotate) {
                const r2 = this.rotatePiece(p2);
                if (!this.checkCollision(r2, this.aiBoard)) this.p2Piece = r2;
            } else if (e.code === this.keybinds.p2.hard) {
                e.preventDefault();
                while (this.dropPiece(p2, this.aiBoard, false)) { }
            }
        }
    }

    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        this.playerScore = 0;
        this.aiScore = 0;
        this.currentLevel = 1;
        this.dropInterval = 1000;

        this.playerBoard = this.createEmptyBoard();
        this.aiBoard = this.createEmptyBoard();

        this.spawnPiece(true); // Player
        this.spawnPiece(false); // Opponent (AI or P2)

        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;

        this.gameLoop();
    }

    togglePause() {
        if (!this.gameRunning) return;

        this.gamePaused = !this.gamePaused;
        document.getElementById('pause-btn').textContent = this.gamePaused ? 'Resume' : 'Pause';

        if (!this.gamePaused) {
            this.gameLoop();
        }
    }

    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.playerScore = 0;
        this.aiScore = 0;
        this.currentLevel = 1;

        this.playerBoard = this.createEmptyBoard();
        this.aiBoard = this.createEmptyBoard();
        this.playerPiece = null;
        this.aiPiece = null;

        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('pause-btn').textContent = 'Pause';
        document.getElementById('game-over-modal').classList.add('hidden');

        this.updateUI();
        this.drawBoards();
        this.generateNextPiece();
    }

    gameOver() {
        if (this.infiniteMode) {
            // In infinite mode, do not end; instead, reset the board that failed
            // Detect which side collided at spawn by checking if current piece overlaps at y<=0
            // For simplicity, if either board top is blocked, clear top few rows and continue
            this.playerBoard = this.createEmptyBoard();
            this.aiBoard = this.createEmptyBoard();
            this.playerPiece = null;
            this.aiPiece = null;
            this.p2Piece = null;
            this.spawnPiece(true);
            this.spawnPiece(false);
            return;
        }

        this.gameRunning = false;
        this.gamePaused = false;

        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;

        // Determine winner
        const oppLabel = this.opponent === 'ai' ? 'AI' : 'Player 2';
        const winner = this.playerScore > this.aiScore ? 'player' :
            this.aiScore > this.playerScore ? (this.opponent === 'ai' ? 'ai' : 'p2') : 'tie';

        document.getElementById('final-player-score').textContent = this.playerScore;
        document.getElementById('final-ai-score').textContent = this.aiScore;

        const winnerElement = document.getElementById('winner');
        document.getElementById('final-opponent-label').textContent = oppLabel;
        winnerElement.textContent = winner === 'player' ? 'Player Wins!' :
            winner === 'ai' ? 'AI Wins!' : winner === 'p2' ? 'Player 2 Wins!' : 'It\'s a Tie!';
        const winnerClass = winner === 'p2' ? 'ai' : winner; // reuse ai style for p2
        winnerElement.className = `winner ${winnerClass}-wins`;

        document.getElementById('game-over-modal').classList.remove('hidden');
    }

    gameLoop() {
        if (!this.gameRunning || this.gamePaused) return;

        const now = Date.now();

        // Drop pieces
        if (now - this.dropTime > this.dropInterval) {
            this.dropPiece(this.playerPiece, this.playerBoard, true);
            if (this.opponent === 'ai') {
                this.dropPiece(this.aiPiece, this.aiBoard, false);
            } else {
                this.dropPiece(this.p2Piece, this.aiBoard, false);
            }
            this.dropTime = now;
        }

        // Update AI
        this.updateAI();

        // Update UI
        this.updateUI();
        this.drawBoards();

        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    updateUI() {
        document.getElementById('player-score').textContent = this.playerScore;
        document.getElementById('ai-score').textContent = this.aiScore;
        document.getElementById('level').textContent = this.currentLevel;
    }

    drawBoards() {
        this.drawBoard(this.playerCtx, this.playerBoard, this.playerPiece);
        const oppPiece = this.opponent === 'ai' ? this.aiPiece : this.p2Piece;
        this.drawBoard(this.aiCtx, this.aiBoard, oppPiece);
    }

    drawBoard(ctx, board, currentPiece) {
        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.CELL_SIZE, 0);
            ctx.lineTo(x * this.CELL_SIZE, this.BOARD_HEIGHT * this.CELL_SIZE);
            ctx.stroke();
        }

        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.CELL_SIZE);
            ctx.lineTo(this.BOARD_WIDTH * this.CELL_SIZE, y * this.CELL_SIZE);
            ctx.stroke();
        }

        // Draw placed pieces
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                if (board[y][x]) {
                    this.drawCell(ctx, x, y, board[y][x]);
                }
            }
        }

        // Draw current piece
        if (currentPiece) {
            for (let y = 0; y < currentPiece.shape.length; y++) {
                for (let x = 0; x < currentPiece.shape[y].length; x++) {
                    if (currentPiece.shape[y][x]) {
                        this.drawCell(ctx, currentPiece.x + x, currentPiece.y + y, currentPiece.color, true);
                    }
                }
            }
        }
    }

    drawCell(ctx, x, y, color, isGhost = false) {
        const pixelX = x * this.CELL_SIZE;
        const pixelY = y * this.CELL_SIZE;

        if (isGhost) {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.5;
        } else {
            ctx.fillStyle = color;
            ctx.globalAlpha = 1;
        }

        ctx.fillRect(pixelX + 1, pixelY + 1, this.CELL_SIZE - 2, this.CELL_SIZE - 2);

        // Add border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(pixelX + 1, pixelY + 1, this.CELL_SIZE - 2, this.CELL_SIZE - 2);

        ctx.globalAlpha = 1;
    }

    drawNextPiece() {
        const ctx = this.nextPieceCtx;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (!this.nextPiece) return;

        const cellSize = 20;
        const offsetX = (ctx.canvas.width - this.nextPiece.shape[0].length * cellSize) / 2;
        const offsetY = (ctx.canvas.height - this.nextPiece.shape.length * cellSize) / 2;

        for (let y = 0; y < this.nextPiece.shape.length; y++) {
            for (let x = 0; x < this.nextPiece.shape[y].length; x++) {
                if (this.nextPiece.shape[y][x]) {
                    ctx.fillStyle = this.nextPiece.color;
                    ctx.fillRect(
                        offsetX + x * cellSize + 1,
                        offsetY + y * cellSize + 1,
                        cellSize - 2,
                        cellSize - 2
                    );

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(
                        offsetX + x * cellSize + 1,
                        offsetY + y * cellSize + 1,
                        cellSize - 2,
                        cellSize - 2
                    );
                }
            }
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TetrisGame();
});

// ===== Extensions: Settings & Modes =====
TetrisGame.prototype.setOpponent = function (value) {
    this.opponent = value === 'p2' ? 'p2' : 'ai';
    this.reflectOpponentLabels();
    if (this.gameRunning) {
        // Reset opponent side piece so it respawns with correct control
        this.aiPiece = null;
        this.p2Piece = null;
        this.spawnPiece(false);
    }
};

TetrisGame.prototype.setInfinite = function (enabled) {
    this.infiniteMode = !!enabled;
};

TetrisGame.prototype.reflectOpponentLabels = function () {
    const label = this.opponent === 'ai' ? 'AI Enemy' : 'Player 2';
    const scoreLabel = this.opponent === 'ai' ? 'AI Score:' : 'P2 Score:';
    document.getElementById('opponent-board-label').textContent = label;
    document.getElementById('opponent-score-label').textContent = scoreLabel;
};

TetrisGame.prototype.loadKeybinds = function () {
    const defaults = {
        p1: { left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', rotate: 'ArrowUp', hard: 'Space' },
        p2: { left: 'KeyA', right: 'KeyD', down: 'KeyS', rotate: 'KeyW', hard: 'ShiftRight' }
    };
    try {
        const stored = localStorage.getItem('tetris_keybinds');
        if (!stored) return defaults;
        const parsed = JSON.parse(stored);
        return { p1: { ...defaults.p1, ...parsed.p1 }, p2: { ...defaults.p2, ...parsed.p2 } };
    } catch (_) {
        return defaults;
    }
};

TetrisGame.prototype.populateSettingsUI = function () {
    document.querySelectorAll('.keybind').forEach(btn => {
        const player = btn.getAttribute('data-player');
        const action = btn.getAttribute('data-action');
        btn.textContent = this.keybinds[player][action];
        btn.onclick = () => this.awaitKey(btn, player, action);
    });
};

TetrisGame.prototype.awaitKey = function (button, player, action) {
    button.textContent = 'Press key...';
    const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.code === 'Escape') {
            button.textContent = '(unbound)';
            this.keybinds[player][action] = '';
        } else {
            this.keybinds[player][action] = e.code;
            button.textContent = e.code;
        }
        window.removeEventListener('keydown', handler, true);
    };
    window.addEventListener('keydown', handler, true);
};

TetrisGame.prototype.openSettings = function () {
    document.getElementById('settings-modal').classList.remove('hidden');
};

TetrisGame.prototype.closeSettings = function () {
    document.getElementById('settings-modal').classList.add('hidden');
};

TetrisGame.prototype.saveSettings = function () {
    localStorage.setItem('tetris_keybinds', JSON.stringify(this.keybinds));
    this.closeSettings();
};
