import { Body } from 'matter-js';

export enum PieceState {
    Falling = 'Falling',
    Free = 'Free',
    Fixed = 'Fixed' // Includes Normal, Forced, Rescue internally
}

export enum FixedType {
    None = 'None',
    Normal = 'Normal',
    Forced = 'Forced', // Scroll push
    Rescue = 'Rescue'  // Single item rescue
}

export interface Piece {
    id: number;
    type: number;
    state: PieceState;
    fixedType: FixedType;
    clusterId: number | null;
    displayWidth: number;
    displayHeight: number;
    body: Body;
}

export interface Cluster {
    id: number;
    members: Set<number>; // Set of Piece IDs
}
