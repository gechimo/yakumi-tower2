interface RankingEntry {
    name: string;
    score: number;
    date: string;
}

export class RankingManager {
    private readonly STORAGE_KEY = 'yakumiTowerRankings';
    private readonly MAX_RANKINGS = 5;

    getRankings(): RankingEntry[] {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return [];

        try {
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    addScore(name: string, score: number): number {
        const rankings = this.getRankings();
        const newEntry: RankingEntry = {
            name,
            score,
            date: new Date().toISOString()
        };

        rankings.push(newEntry);
        rankings.sort((a, b) => b.score - a.score);

        const finalRankings = rankings.slice(0, this.MAX_RANKINGS);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(finalRankings));

        // Return the rank (1-based index)
        const rank = finalRankings.findIndex(r => r === newEntry) + 1;
        return rank > 0 ? rank : -1;
    }

    isHighScore(score: number): boolean {
        const rankings = this.getRankings();
        if (rankings.length < this.MAX_RANKINGS) return true;
        return score > rankings[rankings.length - 1].score;
    }
}
