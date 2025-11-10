import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './state';

describe('reducer', () => {
    it('should return the initial state', () => {
        expect(reducer(initialState, { type: 'RESET_STATE' })).toEqual(initialState);
    });

    it('should handle SET_IS_RUNNING', () => {
        const action = { type: 'SET_IS_RUNNING', payload: true };
        const state = reducer(initialState, action);
        expect(state.isRunning).toBe(true);
    });

    it('should handle SET_ACTIVE_NODE', () => {
        const action = { type: 'SET_ACTIVE_NODE', payload: 'sast_scan' };
        const state = reducer(initialState, action);
        expect(state.activeNode).toBe('sast_scan');
    });
});
