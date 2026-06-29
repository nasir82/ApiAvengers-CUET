const StateMachine = require('../stateMachine');

describe('Payment StateMachine', () => {
  describe('isValidTransition', () => {
    it('allows the documented forward transitions', () => {
      expect(StateMachine.isValidTransition('INITIATED', 'AUTHORIZED')).toBe(true);
      expect(StateMachine.isValidTransition('AUTHORIZED', 'CAPTURED')).toBe(true);
      expect(StateMachine.isValidTransition('CAPTURED', 'COMPLETED')).toBe(true);
    });

    it('allows transitioning to FAILED from any non-terminal state', () => {
      expect(StateMachine.isValidTransition('INITIATED', 'FAILED')).toBe(true);
      expect(StateMachine.isValidTransition('AUTHORIZED', 'FAILED')).toBe(true);
      expect(StateMachine.isValidTransition('CAPTURED', 'FAILED')).toBe(true);
    });

    it('REJECTS backward transitions (the original CAPTURED -> AUTHORIZED bug)', () => {
      expect(StateMachine.isValidTransition('CAPTURED', 'AUTHORIZED')).toBe(false);
      expect(StateMachine.isValidTransition('AUTHORIZED', 'INITIATED')).toBe(false);
      expect(StateMachine.isValidTransition('COMPLETED', 'CAPTURED')).toBe(false);
    });

    it('rejects skipping states (INITIATED -> CAPTURED)', () => {
      expect(StateMachine.isValidTransition('INITIATED', 'CAPTURED')).toBe(false);
      expect(StateMachine.isValidTransition('INITIATED', 'COMPLETED')).toBe(false);
    });

    it('treats COMPLETED and FAILED as terminal (no outgoing transitions)', () => {
      expect(StateMachine.getAllowedTransitions('COMPLETED')).toEqual([]);
      expect(StateMachine.getAllowedTransitions('FAILED')).toEqual([]);
      expect(StateMachine.isValidTransition('COMPLETED', 'FAILED')).toBe(false);
    });

    it('allows a valid initial state when there is no fromState', () => {
      expect(StateMachine.isValidTransition(null, 'INITIATED')).toBe(true);
      expect(StateMachine.isValidTransition(undefined, 'AUTHORIZED')).toBe(true);
      expect(StateMachine.isValidTransition(null, 'CAPTURED')).toBe(false);
    });

    it('returns false for unknown states', () => {
      expect(StateMachine.isValidTransition('UNKNOWN', 'AUTHORIZED')).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('does not throw for a valid transition', () => {
      expect(() => StateMachine.validateTransition('INITIATED', 'AUTHORIZED')).not.toThrow();
    });

    it('throws with a descriptive message for an invalid transition', () => {
      expect(() => StateMachine.validateTransition('CAPTURED', 'AUTHORIZED'))
        .toThrow(/Invalid state transition: CAPTURED → AUTHORIZED/);
    });
  });

  describe('getAllowedTransitions', () => {
    it('returns the allowed next states', () => {
      expect(StateMachine.getAllowedTransitions('INITIATED')).toEqual(['AUTHORIZED', 'FAILED']);
      expect(StateMachine.getAllowedTransitions('AUTHORIZED')).toEqual(['CAPTURED', 'FAILED']);
    });

    it('returns an empty array for unknown states', () => {
      expect(StateMachine.getAllowedTransitions('NOPE')).toEqual([]);
    });
  });
});
