// Payment State Machine
const VALID_TRANSITIONS = {
  'INITIATED': ['AUTHORIZED', 'FAILED'],
  'AUTHORIZED': ['CAPTURED', 'FAILED'],
  'CAPTURED': ['COMPLETED', 'FAILED'],
  'COMPLETED': [], // Terminal state
  'FAILED': []     // Terminal state
};

class StateMachine {
  static isValidTransition(fromState, toState) {
    if (!fromState) {
      // Initial state - can go to any starting state
      return ['INITIATED', 'AUTHORIZED', 'FAILED'].includes(toState);
    }

    const allowedStates = VALID_TRANSITIONS[fromState] || [];
    return allowedStates.includes(toState);
  }

  static validateTransition(fromState, toState) {
    if (!this.isValidTransition(fromState, toState)) {
      throw new Error(
        `Invalid state transition: ${fromState || 'null'} → ${toState}. ` +
        `Allowed transitions from ${fromState}: ${VALID_TRANSITIONS[fromState]?.join(', ') || 'none'}`
      );
    }
  }

  static getAllowedTransitions(currentState) {
    return VALID_TRANSITIONS[currentState] || [];
  }
}

module.exports = StateMachine;

