/**
 * TODO: implement independently using the README and fixture tests.
 * Validate array/object shape, nonempty string ids, boolean eligibility/bot fields,
 * and outcome useful | denied | error. People are unique by (tenant,userId).
 * Events have a global event id: exact redelivery is ignored; conflicting duplicate
 * content throws an error containing "conflict". An event for an unknown person,
 * duplicate person or invalid value throws an error containing "invalid".
 * Filter the named period; exclude bots and people not eligible for the cohort.
 * Caller must establish complete observation for the requested period separately;
 * a missing telemetry window is not measured zero use.
 * Denied/error attempts remain in the useful-task rate denominator.
 * Return {eligiblePeople, activePeople, repeatPeople, usefulTasks, attempts,
 *         activationRate, usefulTaskRate}; a zero denominator yields null.
 */
export function summarizeCohort(people, events, period) {
  throw new Error('TODO: independently implement tenant-scoped cohort analysis');
}

/**
 * Hypothetical sensitivity calculation ONLY, not observed ROI.
 * Inputs: baselineMinutesPerTask, pilotMinutesPerTask, completedComparableTasks,
 * hourlyValue, totalCost. Each must be finite and nonnegative or null/undefined.
 * Missing input returns {grossBenefit:null, netBenefit:null, roi:null}.
 * Invalid present input throws /invalid/. Benefit = time difference * tasks / 60
 * * hourlyValue; net = benefit - totalCost; ROI = net / totalCost (null at zero).
 * Keep negative results. Caller must label input provenance and comparability.
 */
export function hypotheticalRoi(inputs) {
  throw new Error('TODO: independently implement a labeled sensitivity calculation');
}
