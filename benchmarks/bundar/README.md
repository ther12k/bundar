# benchmarks/bundar

The Bundar adapter is intentionally deferred in GH-007 because runtime
behavior lands in M1/M2. It returns an explicit `501` and is never included in
timed results. Once Bundar behavior exists, this adapter must pass the same
parity scenarios before it can enter timing reports.
