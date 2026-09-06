/**
 * TODO: implement independently. Input is an array of terminal request events.
 * Each event has ONLY id, tenant, traceId, outcome and durationMs.
 * Validate nonempty string identities, finite nonnegative durations and outcomes
 * success | dependency-error | denied. Reject unknown fields (privacy boundary).
 * Deduplicate identical events by id; conflicting duplicate content is an error.
 * Return {requests, successes, dependencyErrors, denied, successRate, meanDurationMs}.
 * Rate denominator includes every unique terminal request, including denials.
 * This is a fixture completion rate, NOT a production SLI definition or SLA.
 * Both rate and mean are null for an empty population.
 */
export function summarize(events) {
  throw new Error('TODO: independently implement terminal-request analysis');
}
