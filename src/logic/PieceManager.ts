import { Bodies, Body, Composite, Vertices } from 'matter-js';
import { YakumiPiece } from './YakumiPiece';
import { yakumiShapes } from '../core/ShapeData';

export class PieceManager {
    private _pieces: Map<number, YakumiPiece> = new Map();
    private _nextId = 1;
    constructor(private world: Composite) { }

    async init() {
        console.log('[PieceManager] Initialization complete (OO architecture)');
        return Promise.resolve();
    }

    createPiece(x: number, y: number, type: number, isStatic: boolean = false): YakumiPiece {
        const id = this._nextId++;

        const assetMap: Record<number, string> = {
            1: 'assets/1.png',
            2: 'assets/2.png',
            3: 'assets/3.png',
            4: 'assets/4.png',
            5: 'assets/5.png',
            6: 'assets/6.png',
            7: 'assets/7.png',
            8: 'assets/8.png',
            9: 'assets/9.png'
        };
        const spritePath = assetMap[type] || 'assets/1.png';

        // Constraint: pieces should not exceed 1/8 of ground width (375/8 = 46.875px)
        const GROUND_WIDTH = 375;
        const MAX_SIZE = GROUND_WIDTH / 8;
        let appliedScale = 1.0;
        let originalWidth = 60;
        let originalHeight = 60;
        const cachedVertices = yakumiShapes[type];

        if (cachedVertices && cachedVertices.length > 0) {
            const xs = cachedVertices.map(v => v.x);
            const ys = cachedVertices.map(v => v.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            originalWidth = maxX - minX;
            originalHeight = maxY - minY;
            const maxDim = Math.max(originalWidth, originalHeight);

            // Only scale down if collision box exceeds constraint
            if (maxDim > MAX_SIZE) {
                appliedScale = MAX_SIZE / maxDim;
                console.log(`[PieceManager] Type ${type}: maxDim=${maxDim.toFixed(1)}, scaling body by ${appliedScale.toFixed(3)}`);
            }
        }

        let body: Body;

        if (cachedVertices && cachedVertices.length > 0) {
            body = Bodies.fromVertices(x, y, [cachedVertices], {
                isStatic: isStatic,
                friction: 0.5,
                restitution: 0.1,
                inertia: Infinity,
                label: `piece-${id}`,
                render: {
                    visible: false
                },
                plugin: { pieceId: id }
            });
        } else {
            body = Bodies.rectangle(x, y, originalWidth, originalHeight, {
                isStatic: isStatic,
                friction: 0.5,
                restitution: 0.1,
                inertia: Infinity,
                label: `piece-${id}`,
                render: {
                    visible: false
                },
                plugin: { pieceId: id }
            });
        }

        // Apply physical scaling to the body
        if (appliedScale !== 1.0) {
            Body.scale(body, appliedScale, appliedScale);
        }

        const piece = new YakumiPiece(id, type, body, spritePath);

        // Calculate centroid for precise rendering alignment
        if (cachedVertices && cachedVertices.length > 0) {
            piece.centroid = Vertices.centre(cachedVertices);
        } else {
            piece.centroid = { x: originalWidth / 2, y: originalHeight / 2 };
        }

        piece.appliedScale = appliedScale;

        // Store the final physical dimensions (fixed, no matter the rotation)
        piece.displayWidth = originalWidth * appliedScale;
        piece.displayHeight = originalHeight * appliedScale;

        // Set up cluster scoring callback
        piece.onClusterFormed = this._onClusterCallback;

        this._pieces.set(id, piece);
        Composite.add(this.world, body);

        return piece;
    }

    // Set the score callback
    private _onClusterCallback?: (size: number) => void;

    setClusterCallback(callback: (size: number) => void) {
        this._onClusterCallback = callback;
    }

    getPiece(id: number): YakumiPiece | undefined {
        return this._pieces.get(id);
    }

    getPieceByBody(body: Body): YakumiPiece | undefined {
        const id = (body as any).plugin?.pieceId;
        return id ? this._pieces.get(id) : undefined;
    }

    getAll(): YakumiPiece[] {
        return Array.from(this._pieces.values());
    }

    removePiece(id: number) {
        const piece = this._pieces.get(id);
        if (piece) {
            Composite.remove(this.world, piece.body);
            this._pieces.delete(id);
        }
    }
}
