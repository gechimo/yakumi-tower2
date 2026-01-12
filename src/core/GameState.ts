export enum GameState {
    Title = 'Title',
    Playing = 'Playing',
    Resolving = 'Resolving',
    Scrolling = 'Scrolling',
    GameOver = 'GameOver'
}

type StateChangeListener = (newState: GameState) => void;

class StateManager {
    private _currentState: GameState = GameState.Title;
    private _listeners: StateChangeListener[] = [];

    get current(): GameState {
        return this._currentState;
    }

    set state(newState: GameState) {
        if (this._currentState !== newState) {
            console.log(`[GameState] Transition: ${this._currentState} -> ${newState}`);
            this._currentState = newState;
            this.notify();
        }
    }

    private notify() {
        this._listeners.forEach(l => l(this._currentState));
    }

    subscribe(listener: StateChangeListener) {
        this._listeners.push(listener);
    }
}

export const gameState = new StateManager();
