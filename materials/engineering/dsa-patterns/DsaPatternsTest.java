import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class DsaPatternsTest {
    @FunctionalInterface
    private interface Check { void run() throws Exception; }

    private record NamedCheck(String name, Check check) {}

    public static void main(String[] args) {
        List<NamedCheck> checks = List.of(
            new NamedCheck("two-sum", () -> assertArray(new int[] {0, 1}, TwoSum.solve(new int[] {2, 7, 11, 15}, 9))),
            new NamedCheck("two-sum-sorted", () -> assertArray(new int[] {1, 2}, TwoSumSorted.solve(new int[] {2, 7, 11, 15}, 9))),
            new NamedCheck("subarray-sum", () -> assertEquals(2L, SubarraySumEqualsK.count(new int[] {1, 1, 1}, 2L))),
            new NamedCheck("longest-substring", () -> assertEquals(3, LongestSubstring.lengthWithoutRepeating("abcabcbb"))),
            new NamedCheck("daily-temperatures", () -> assertArray(new int[] {1, 1, 4, 2, 1, 1, 0, 0}, DailyTemperatures.waits(new int[] {73, 74, 75, 71, 69, 72, 76, 73}))),
            new NamedCheck("sliding-window-maximum", () -> assertArray(new int[] {3, 3, 5, 5, 6, 7}, SlidingWindowMaximum.maximums(new int[] {1, 3, -1, -3, 5, 3, 6, 7}, 3))),
            new NamedCheck("closed-islands", () -> assertEquals(1, ClosedIslands.count(new int[][] {{1,1,1,1,1},{1,0,0,0,1},{1,0,1,0,1},{1,1,1,1,1}}))),
            new NamedCheck("bipartite", () -> assertEquals(true, BipartiteGraph.isBipartite(new int[][] {{1,3},{0,2},{1,3},{0,2}}))),
            new NamedCheck("min-cost-connect", () -> assertEquals(20L, MinCostConnectPoints.minimumCost(new int[][] {{0,0},{2,2},{3,10},{5,2},{7,0}})))
        );

        List<String> failures = new ArrayList<>();
        for (NamedCheck named : checks) {
            try {
                named.check().run();
            } catch (Throwable error) {
                failures.add(named.name() + ": " + error.getClass().getSimpleName() + ": " + error.getMessage());
            }
        }

        if (!failures.isEmpty()) {
            System.err.println("DSA pattern learner tests failed (expected for untouched TODO starters):");
            failures.forEach(failure -> System.err.println("- " + failure));
            System.exit(1);
        }
        System.out.println("DSA pattern learner tests passed.");
    }

    private static void assertArray(int[] expected, int[] actual) {
        if (!Arrays.equals(expected, actual)) {
            throw new AssertionError("expected " + Arrays.toString(expected) + ", got " + Arrays.toString(actual));
        }
    }

    private static void assertEquals(long expected, long actual) {
        if (expected != actual) throw new AssertionError("expected " + expected + ", got " + actual);
    }

    private static void assertEquals(boolean expected, boolean actual) {
        if (expected != actual) throw new AssertionError("expected " + expected + ", got " + actual);
    }
}
