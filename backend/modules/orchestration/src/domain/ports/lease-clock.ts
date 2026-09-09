export interface LeaseClock {
    now(): Date;
    expiresIn(ttlMs: number): Date;
}
