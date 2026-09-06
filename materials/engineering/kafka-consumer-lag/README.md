# Kafka: locate the growing offset gap

This exercise uses fictional partition snapshots. It needs Node.js 20+ and no Kafka cluster or account. The starter is unsolved. The browser lesson introduces the model; your implementation and diagnosis are separate work.

## Reconstruct the system

A producer writes records to a topic's partitions, which brokers store and replicate. In a conventional consumer group, the consumers divide partition ownership. Two groups can read the same topic at different positions. Ordering is per partition, not across the whole topic. [Kafka design](https://kafka.apache.org/43/design/design/)

An offset identifies a position within one partition. Distinguish the consumer's current position (next record returned by polling) from its committed group position (restart checkpoint). Neither alone proves that an external side effect succeeded. [Consumer API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)

For this exercise, **group lag = log-end offset minus committed group position**, per partition at a comparable observation time. Log end is the next append position. An offset gap is not a duration, and compacted or transactional logs can contain gaps, so it need not equal a count of visible business records. A client metric based on current position can differ from committed-group lag. Missing samples or unknown commits are unknown, not zero. [Monitoring definitions](https://kafka.apache.org/43/operations/monitoring/)

Producer delay measures a different part of the path. Broker unavailability can delay progress or measurements; it does not define consumer lag. An old zero measurement during an outage does not prove health. Use the group inspection command and timestamps to establish what was measured. [Group operations](https://kafka.apache.org/43/operations/basic-kafka-operations/)

## Independent task

1. Read [snapshots.json](snapshots.json). Write your predictions on paper before editing code. Identify the hot partition and distinguish fetching/processing from checkpoint progress.
2. Implement `measureGap` in [lag.mjs](lag.mjs). Accept the documented synthetic row shape and return `{status, gap}`. Use `unknown` with `gap: null` for a null commit; reject malformed or inconsistent positions. Do not clamp a negative gap into a healthy value.
3. Run `node --test lag.test.mjs` from this folder. The supplied tests fail until you implement the function. Add your own tests for unsafe integers and a nonnumeric log end.
4. Fill [diagnosis.md](diagnosis.md). Compare successive per-partition snapshots. Propose a cause, the measurement that could disprove it, one bounded intervention, and a rollback signal. Do not invent observations.
5. Optional extension: use a disposable Kafka installation and synthetic topic, then record client/broker versions and actual group inspection output. Keep this separate from the fixture exercise. Do not reset a real group's offsets.

## Review criteria

Explain why adding more consumers than available partitions does not increase parallelism for the conventional group in this exercise. Contrast a slow dependency, repeated processing failures, partition skew and rebalances using evidence you would collect. Distinguish current-position lag from committed lag before interpreting either. A falling gap alone does not prove successful application processing.

Retell the diagnosis without these notes. Record assistance, tests run and remaining uncertainty in your own notebook. This starter does not claim a real incident, runtime integration or completed study.
