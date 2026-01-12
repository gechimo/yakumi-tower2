import { Body, Composite } from 'matter-js';
import { gameState, GameState } from '../core/GameState';
import { PieceManager } from './PieceManager';
import { PieceState, FixedType } from '../core/Types';

export class ScrollSystem {
    private _isScrolling = false;
    private _ground: Body | null = null;
    private _world: Composite | null = null;

    constructor(
        private pieceManager: PieceManager,
        private height: number,
        world?: Composite,
        ground?: Body
    ) {
        if (world) {
            this._world = world;
        }
        if (ground) {
            this._ground = ground;
        }
    }

    checkAndScroll(activePieceId?: number) {
        if (gameState.current !== GameState.Playing || this._isScrolling) return;

        // Filter: exclude Falling pieces AND the active piece (not yet dropped)
        const pieces = this.pieceManager.getAll().filter(p =>
            p.state !== PieceState.Falling &&
            (!activePieceId || p.id !== activePieceId)
        );
        if (pieces.length === 0) return;

        const minY = Math.min(...pieces.map(p => p.body.position.y));
        const threshold = this.height * 0.3;

        // Debug: Log position checks
        if (pieces.length > 0 && minY < this.height * 0.5) {
            console.log(`[Scroll Check] minY=${minY.toFixed(1)}, threshold=${threshold.toFixed(1)}, pieces=${pieces.length}, excludedActive=${activePieceId}`);
        }

        // 「下から7割の高さ」＝「上から3割の位置」に到達したか判定
        if (minY <= threshold) {
            console.log('[Scroll] TRIGGERING! minY:', minY, 'threshold:', threshold);
            this.startScroll();
        }
    }

    private async startScroll() {
        this._isScrolling = true;
        gameState.state = GameState.Scrolling;
        console.log('[Scroll] Started');

        // Remove ground at scroll start
        if (this._ground && this._world) {
            Composite.remove(this._world, this._ground);
            console.log('[Scroll] Ground removed from world');
            this._ground = null;
        }

        const scrollDistance = this.height * 0.6;
        const duration = 500;
        const startTime = performance.now();

        // Store initial positions and make all pieces static during scroll
        const initialPositions = new Map<number, { x: number, y: number, wasStatic: boolean }>();
        this.pieceManager.getAll().forEach(p => {
            initialPositions.set(p.id, {
                x: p.body.position.x,
                y: p.body.position.y,
                wasStatic: p.body.isStatic
            });
            // Make piece static to prevent physics interference during scroll
            Body.setStatic(p.body, true);
        });

        const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = ease(progress);

            this.pieceManager.getAll().forEach(p => {
                const start = initialPositions.get(p.id);
                if (start) {
                    const currentY = start.y + (scrollDistance * easedProgress);
                    Body.setPosition(p.body, { x: start.x, y: currentY });
                }
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.completeScroll(initialPositions);
            }
        };

        requestAnimationFrame(animate);
    }

    private completeScroll(initialPositions: Map<number, { x: number, y: number, wasStatic: boolean }>) {
        console.log('[Scroll] Animation completed, now processing pieces...');

        // First, restore non-static state to falling pieces that weren't originally static
        this.pieceManager.getAll().forEach(p => {
            const initial = initialPositions.get(p.id);
            if (initial && !initial.wasStatic && p.state === PieceState.Falling) {
                Body.setStatic(p.body, false);
                Body.setVelocity(p.body, { x: 0, y: 0 });
            }
        });

        // Wait a frame for physics to settle
        setTimeout(() => {
            const allPieces = this.pieceManager.getAll();

            // Auto-fix all pieces that remain on screen (new foundation)
            const onScreenPieces = allPieces.filter(p => p.body.position.y < this.height);

            console.log(`[Scroll] Auto-fixing ${onScreenPieces.length} on-screen pieces as new foundation`);

            onScreenPieces.forEach(p => {
                if (p.state !== PieceState.Fixed) {
                    p.state = PieceState.Fixed;
                    p.fixedType = FixedType.Forced;
                    Body.setStatic(p.body, true);
                    console.log(`[Scroll] Fixed piece #${p.id} at Y=${p.body.position.y.toFixed(1)}`);
                }
            });

            // Remove pieces that went off-screen
            const offScreenPieces = allPieces.filter(p => p.body.position.y >= this.height);
            console.log(`[Scroll] Removing ${offScreenPieces.length} off-screen pieces`);

            offScreenPieces.forEach(p => {
                this.pieceManager.removePiece(p.id);
            });

            if (onScreenPieces.length === 0) {
                console.log('[Scroll] No pieces remain on screen - Game Over condition');
                gameState.state = GameState.GameOver;
                return;
            }

            this._isScrolling = false;
            gameState.state = GameState.Playing;
            console.log('[Scroll] Completed successfully');
        }, 50);
    }
}
