import { Engine, Render, Runner, Composite, Bodies, Body, Events } from 'matter-js';
import { gameState, GameState } from './core/GameState';
import { PieceManager } from './logic/PieceManager';
import { PieceState } from './core/Types';
import { ScrollSystem } from './logic/ScrollSystem';
import { ScoreManager } from './logic/ScoreManager';
import { RankingManager } from './logic/RankingManager';

const app = document.querySelector<HTMLDivElement>('#app')!;

// UI Elements
const startOverlay = document.getElementById('startOverlay')!;
const startBtn = document.getElementById('startBtn')!;
const scoreDisplay = document.getElementById('scoreValue')!;
const gameOverScreen = document.getElementById('gameOverScreen')!;
const finalScoreValue = document.getElementById('finalScoreValue')!;
const rankingList = document.getElementById('rankingList')!;
const nameInput = document.getElementById('nameInput')! as HTMLInputElement;
const submitNameBtn = document.getElementById('submitNameBtn')!;
const restartBtn = document.getElementById('restartBtn')!;

const GAME_WIDTH = 375;
const GAME_HEIGHT = 667;

// Preload images for custom rendering
const pieceImages: Record<number, HTMLImageElement> = {};
[1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(id => {
    const img = new Image();
    img.src = `assets/${id}.png`;
    pieceImages[id] = img;
});

// Basic Engine Setup
const engine = Engine.create();
const world = engine.world;

// Create Renderer
const render = Render.create({
    element: app,
    engine: engine,
    options: {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        wireframes: false,
        background: '#222'
    }
});

// Piece Manager & Logic
const pieceManager = new PieceManager(world);
(window as any).pieceManager = pieceManager; // Expose for debugging
const scoreManager = new ScoreManager();
const rankingManager = new RankingManager();

// Add Ground
const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 20, GAME_WIDTH, 40, { isStatic: true, label: 'ground' });
Composite.add(world, ground);

// Initialize ScrollSystem with world and ground references
const scrollSystem = new ScrollSystem(pieceManager, GAME_HEIGHT, world, ground);

// Collision Detection (OO Event Architecture)
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const pieceA = pieceManager.getPieceByBody(pair.bodyA);
        const pieceB = pieceManager.getPieceByBody(pair.bodyB);

        if (pieceA && pieceB) {
            // Each piece handles its own interaction logic
            pieceA.onInteract(pieceB, pieceManager.getAll());
            pieceB.onInteract(pieceA, pieceManager.getAll());
        }
    });
});

// Current Piece State
let activePiece: any = null;
let isSpawning = false;

const spawnPiece = () => {
    const types = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const type = types[Math.floor(Math.random() * types.length)];
    activePiece = pieceManager.createPiece(GAME_WIDTH / 2, 80, type, true);
    isSpawning = false;
};

// Input Handling
app.addEventListener('mousemove', (e) => {
    if (activePiece && activePiece.body.isStatic) {
        const rect = app.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const targetX = Math.max(30, Math.min(GAME_WIDTH - 30, mouseX));
        Body.setPosition(activePiece.body, { x: targetX, y: 80 });
    }
});

app.addEventListener('click', () => {
    if (activePiece && activePiece.body.isStatic && !isSpawning && gameState.current === GameState.Playing) {
        isSpawning = true;

        const pieceToDrop = activePiece;
        activePiece = null;

        Body.setVelocity(pieceToDrop.body, { x: 0, y: 0 });
        Body.setAngularVelocity(pieceToDrop.body, 0);
        Body.setStatic(pieceToDrop.body, false);
        pieceToDrop.state = PieceState.Falling;

        // Score for dropping a piece
        scoreManager.onPieceDrop();
        updateScoreDisplay();

        setTimeout(spawnPiece, 800);
    }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Set up cluster scoring
pieceManager.setClusterCallback((size) => {
    scoreManager.onClusterFormed(size);
    updateScoreDisplay();
});

// Game Loop
const gameLoop = () => {
    if (gameState.current === GameState.Playing) {
        scrollSystem.checkAndScroll(activePiece?.id);

        const pieces = pieceManager.getAll();
        for (const p of pieces) {
            if (p.state !== PieceState.Fixed && p.body.position.y > GAME_HEIGHT + 100) {
                console.log('[Game Over] Piece fell out of bounds');
                gameState.state = GameState.GameOver;
            }
        }
    }

    requestAnimationFrame(gameLoop);
};

gameState.subscribe((state) => {
    if (state === GameState.GameOver) {
        showGameOver();
    }
});

// UI Update Functions
function updateScoreDisplay() {
    scoreDisplay.textContent = scoreManager.score.toString();
}

function showGameOver() {
    const finalScore = scoreManager.score;
    finalScoreValue.textContent = finalScore.toString();

    // Show rankings
    const rankings = rankingManager.getRankings();
    rankingList.innerHTML = '<h3 style="color:white; margin-top:0;">🏆 Top Rankings</h3>';

    if (rankings.length === 0) {
        rankingList.innerHTML += '<p style="color:#aaa; text-align:center;">No rankings yet!</p>';
    } else {
        rankings.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'rankingItem';
            item.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.score}</span>`;
            rankingList.appendChild(item);
        });
    }

    // Check if new high score
    if (rankingManager.isHighScore(finalScore)) {
        nameInput.style.display = 'block';
        submitNameBtn.style.display = 'block';
        nameInput.value = '';
        nameInput.focus();

        // Handle Enter key
        nameInput.onkeydown = (e) => {
            if (e.key === 'Enter' && nameInput.value.trim()) {
                saveScore();
            }
        };

        // Handle button click
        submitNameBtn.onclick = () => {
            if (nameInput.value.trim()) {
                saveScore();
            }
        };
    } else {
        nameInput.style.display = 'none';
        submitNameBtn.style.display = 'none';
    }

    gameOverScreen.classList.add('show');
}

function saveScore() {
    const name = nameInput.value.trim() || 'Player';
    const rank = rankingManager.addScore(name, scoreManager.score);

    console.log('[Ranking] Saved score:', name, scoreManager.score, 'Rank:', rank);

    // Refresh rankings display
    const rankings = rankingManager.getRankings();
    rankingList.innerHTML = '<h3 style="color:white; margin-top:0;">🏆 Top Rankings</h3>';

    rankings.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'rankingItem';
        if (index === rank - 1) {
            item.classList.add('highlight');
        }
        item.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.score}</span>`;
        rankingList.appendChild(item);
    });

    nameInput.style.display = 'none';
    submitNameBtn.style.display = 'none';
}

// Sprite Rendering
Events.on(render, 'afterRender', () => {
    const context = render.context;
    const pieces = pieceManager.getAll();

    pieces.forEach(p => {
        const { position, angle } = p.body;
        const img = pieceImages[p.type];

        if (img && img.complete) {
            const scale = p.appliedScale;
            const centroid = p.centroid;

            context.save();
            context.translate(position.x, position.y);
            context.rotate(angle);

            // Apply +70% saturation for pieces in a cluster
            if (p.clusterId !== null) {
                context.filter = 'saturate(1.7)';
            } else {
                context.filter = 'none';
            }

            // Draw image offset by its centroid and scaled by appliedScale
            context.drawImage(
                img,
                -centroid.x * scale,
                -centroid.y * scale,
                img.naturalWidth * scale,
                img.naturalHeight * scale
            );
            context.restore();
        }
    });

    // Info
    context.save();
    context.filter = 'none';
    context.fillStyle = 'rgba(255, 255, 255, 0.5)';
    context.font = '14px Arial';
    context.fillText(`GameState: ${gameState.current}`, 20, 30);
    context.restore();
});

// Initialize and Start
const start = () => {
    console.log('[Game] Starting game (OO Architecture)...');

    // Hide start overlay
    startOverlay.classList.add('hidden');

    // Start game
    gameState.state = GameState.Playing;
    pieceManager.init();
    spawnPiece();
    gameLoop();
};

// Event Handlers
startBtn.addEventListener('click', start);

restartBtn.addEventListener('click', () => {
    location.reload();
});

// Don't auto-start, wait for button click
console.log('Yakumi Tower Initialized. State:', gameState.current);
