# Prefix-sum coding rep

Implement `SubarraySum.countSubarrays` yourself. Use a `long` for the running prefix, target, stored count, and result so the contract survives values whose cumulative sum exceeds the `int` range.

Before coding, say the pattern, invariant, expected time/space complexity, and why a sum-based sliding window is unsafe when negative values are allowed.

## Prerequisites

- JDK 17 or newer
- No external libraries

## Compile and run

From this folder:

```bash
mkdir -p /tmp/study-lab-dsa-prefix
javac -d /tmp/study-lab-dsa-prefix SubarraySum.java SubarraySumTest.java
java -cp /tmp/study-lab-dsa-prefix SubarraySumTest
```

The untouched starter compiles and then exits non-zero. All six cases report `TODO`: normal input, negative values, repeated prefixes, zeros, empty input, and a prefix beyond the `int` range. Replace only the learner TODO in `SubarraySum.java`; do not weaken the harness.

## Return evidence

Keep the exact command and complete output, your final source path, stated complexity, one hand trace, and one sentence naming the failure you corrected. A green run is self-reported evidence until independently reviewed.
