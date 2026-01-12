import { Cluster, Piece } from '../core/Types';

class ClusterManager {
    private _clusters: Map<number, Cluster> = new Map();
    private _nextClusterId = 1;

    createCluster(initialMembers: number[]): number {
        const id = this._nextClusterId++;
        const cluster: Cluster = {
            id,
            members: new Set(initialMembers)
        };
        this._clusters.set(id, cluster);
        console.log(`[Cluster] Created #${id} with members [${initialMembers.join(', ')}]`);
        return id;
    }

    getCluster(id: number): Cluster | undefined {
        return this._clusters.get(id);
    }

    // Pure logic for merging, returns true if merged, false if failed (e.g. limit)
    // Logic: 
    // 1. Both unassigned -> Create new
    // 2. One assigned -> Add to existing (check limit)
    // 3. Both assigned -> Merge (check limit)
    // * Returns struct with 'action' to apply to Pieces
    resolveContact(a: Piece, b: Piece): { action: 'NONE' | 'NEW' | 'ADD_A_TO_B' | 'ADD_B_TO_A' | 'MERGE' } {
        const idA = a.clusterId;
        const idB = b.clusterId;

        const clusterA = idA ? this._clusters.get(idA) : null;
        const clusterB = idB ? this._clusters.get(idB) : null;

        const sizeA = clusterA ? clusterA.members.size : 1;
        const sizeB = clusterB ? clusterB.members.size : 1;

        // RULE: If either cluster is size 5, do NOT fix (unless exception logic, handled higher up? No, here.)
        // Spec: "size = 5 のクラスタが関与している場合 -> この接触では固定しない"
        if (sizeA >= 5 || sizeB >= 5) {
            // NOTE: User spec says "6th and 7th contact -> New Cluster". 
            // If A is size 5 (Fixed) and B is size 1 (Free), normally we don't fix.
            // But if both are Free (and thus size=1, unassigned), we make a new cluster.

            // If both are unassigned, neither has size 5 yet (sizeA=1, sizeB=1).
            // So this check only triggers if at least one IS assigned.
            if (clusterA || clusterB) {
                return { action: 'NONE' };
            }
        }

        // Case 1: Both unassigned
        if (!clusterA && !clusterB) {
            return { action: 'NEW' };
        }

        // Case 2: One assigned
        if (clusterA && !clusterB) {
            // A exists, B is new. Check if A can take B.
            // Already checked sizeA >= 5 above, so sizeA < 5 here. 
            // Adding B (size 1) -> sizeA + 1 <= 5.  (Max 4+1=5). Safe.
            return { action: 'ADD_B_TO_A' };
        }
        if (!clusterA && clusterB) {
            return { action: 'ADD_A_TO_B' };
        }

        // Case 3: Both assigned
        if (clusterA && clusterB) {
            if (clusterA.id === clusterB.id) return { action: 'NONE' }; // Already same cluster

            if (sizeA + sizeB <= 5) {
                return { action: 'MERGE' };
            }
        }

        return { action: 'NONE' };
    }

    // Execute the merge
    mergeClusters(targetId: number, sourceId: number) {
        const target = this._clusters.get(targetId);
        const source = this._clusters.get(sourceId);
        if (!target || !source) return;

        source.members.forEach(mId => target.members.add(mId));
        this._clusters.delete(sourceId);
        console.log(`[Cluster] Merged #${sourceId} into #${targetId}. New Size: ${target.members.size}`);
    }

    addToCluster(clusterId: number, pieceId: number) {
        const cluster = this._clusters.get(clusterId);
        if (cluster) {
            cluster.members.add(pieceId);
            console.log(`[Cluster] Added Piece #${pieceId} to #${clusterId}. Size: ${cluster.members.size}`);
        }
    }
}

export const clusterManager = new ClusterManager();
