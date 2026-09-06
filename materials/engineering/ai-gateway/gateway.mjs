/**
 * Return { evaluate(input) } using only the injected provider.
 * Valid output: { decision: 'continue'|'pause', operatorMessage: string }.
 * Reject invalid input or provider outcomes with stable error codes documented in README.md.
 */
export function createGateway({ provider }) {
  return {
    async evaluate(input) {
      void provider;
      void input;
      throw new Error('TODO: implement provider adaptation and output validation yourself');
    }
  };
}
