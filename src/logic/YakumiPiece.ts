import { Body } from 'matter-js';
import { PieceState, FixedType } from '../core/Types';
import { clusterManager } from './ClusterManager';

export class YakumiPiece {
    public id: number;
    public type: number;
    public state: PieceState = PieceState.Falling;
    public fixedType: FixedType = FixedType.None;
    public clusterId: number | null = null;
    public body: Body;
    public spritePath: string;
    public displayWidth: number = 0;
    public displayHeight: number = 0;
    public centroid: { x: number; y: number } = { x: 0, y: 0 };
    public appliedScale: number = 1.0;

    // Callback for scoring
    public onClusterFormed?: (clusterSize: number) => void;

    constructor(id: number, type: number, body: Body, spritePath: string) {
        this.id = id;
        this.type = type;
        this.body = body;
        this.spritePath = spritePath;
    }

    /**
     * The core logic for interactions between pieces.
     * When this piece collides with another, we decide if they should merge/fix.
     */
    onInteract(other: YakumiPiece, allPieces: YakumiPiece[]) {
        // Only same-type pieces can trigger clustering/fixing
        if (this.type !== other.type) return;

        // If they are already in the same cluster, nothing to do
        if (this.clusterId !== null && this.clusterId === other.clusterId) return;

        // Determine the action using ClusterManager's logic (or inline it if preferred)
        // Here we use the existing manager to keep the 'Size 5' logic central.
        const result = clusterManager.resolveContact(this as any, other as any);

        switch (result.action) {
            case 'NEW':
                const newId = clusterManager.createCluster([this.id, other.id]);
                this.fix(newId);
                other.fix(newId);
                // Score for new cluster
                this.onClusterFormed?.(2);
                break;

            case 'ADD_A_TO_B': // This piece joins other's cluster
                if (other.clusterId !== null) {
                    clusterManager.addToCluster(other.clusterId, this.id);
                    this.fix(other.clusterId);
                    const cluster = clusterManager.getCluster(other.clusterId)!;
                    this.onClusterFormed?.(cluster.members.size);
                }
                break;

            case 'ADD_B_TO_A': // Other piece joins this piece's cluster
                if (this.clusterId !== null) {
                    clusterManager.addToCluster(this.clusterId, other.id);
                    other.fix(this.clusterId);
                    const cluster = clusterManager.getCluster(this.clusterId)!;
                    this.onClusterFormed?.(cluster.members.size);
                }
                break;

            case 'MERGE':
                if (this.clusterId !== null && other.clusterId !== null) {
                    const clusterA = clusterManager.getCluster(this.clusterId)!;
                    const clusterB = clusterManager.getCluster(other.clusterId)!;

                    let targetId: number;
                    let sourceId: number;

                    // Choose larger cluster as target
                    if (clusterA.members.size >= clusterB.members.size) {
                        targetId = this.clusterId;
                        sourceId = other.clusterId;
                    } else {
                        targetId = other.clusterId;
                        sourceId = this.clusterId;
                    }

                    clusterManager.mergeClusters(targetId, sourceId);
                    const mergedCluster = clusterManager.getCluster(targetId)!;
                    this.onClusterFormed?.(mergedCluster.members.size);

                    // Update all pieces that were in the dissolved cluster
                    allPieces.forEach(p => {
                        if (p.clusterId === sourceId) {
                            p.clusterId = targetId;
                        }
                    });

                    // Ensure both participating pieces have the correct ID
                    this.clusterId = targetId;
                    other.clusterId = targetId;
                }
                break;
        }
    }

    /**
     * Transition this piece to a fixed state.
     */
    fix(clusterId: number | null = null, type: FixedType = FixedType.Normal) {
        this.state = PieceState.Fixed;
        this.fixedType = type;
        this.clusterId = clusterId;

        // Matter.js setup for static pieces
        Body.setStatic(this.body, true);
        Body.setVelocity(this.body, { x: 0, y: 0 });
        Body.setAngularVelocity(this.body, 0);
    }
}
