export class ScoreManager {
    private _score: number = 0;

    get score(): number {
        return this._score;
    }

    reset() {
        this._score = 0;
    }

    addPoints(amount: number) {
        this._score += amount;
        console.log(`[Score] +${amount} points (Total: ${this._score})`);
    }

    // Scoring actions
    onPieceDrop() {
        this.addPoints(10);
    }

    onClusterFormed(clusterSize: number) {
        const points = 50 * clusterSize;
        this.addPoints(points);
    }

    onScrollComplete() {
        this.addPoints(100);
    }
}
