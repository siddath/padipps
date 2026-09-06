import java.util.ArrayList;
import java.util.List;

public final class SubarraySumTest {
    private record Case(String name, int[] nums, long target, long expected) {}

    public static void main(String[] args) {
        List<Case> cases = List.of(
            new Case("normal", new int[] {1, 1, 1}, 2L, 2L),
            new Case("negative-values", new int[] {1, -1, 0}, 0L, 3L),
            new Case("repeated-prefix", new int[] {1, -1, 1, -1}, 0L, 4L),
            new Case("zeros", new int[] {0, 0, 0}, 0L, 6L),
            new Case("empty", new int[] {}, 0L, 0L),
            new Case("long-prefix", new int[] {Integer.MAX_VALUE, 1, -Integer.MAX_VALUE, -1}, 2_147_483_648L, 1L)
        );

        List<String> failures = new ArrayList<>();
        for (Case testCase : cases) {
            try {
                long actual = SubarraySum.countSubarrays(testCase.nums(), testCase.target());
                if (actual != testCase.expected()) {
                    failures.add(testCase.name() + ": expected " + testCase.expected() + ", got " + actual);
                }
            } catch (Throwable error) {
                failures.add(testCase.name() + ": " + error.getClass().getSimpleName() + ": " + error.getMessage());
            }
        }

        if (!failures.isEmpty()) {
            System.err.println("SubarraySum learner tests failed (expected for untouched TODO starter):");
            failures.forEach(failure -> System.err.println("- " + failure));
            System.exit(1);
        }

        System.out.println("SubarraySum learner tests passed.");
    }
}
