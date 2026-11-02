<!-- beat: Circulated review -->

```typeout
@format janus

**Date:** 4 November 2030
**To:** Review committee
**Subject:** Observatory comparison

The comparison retains **signed values**, uncertainty and the original ordering. This fictional report demonstrates document playback without adapting a manuscript. See the [[Review note|comparison note]].

| Observatory | Change | Assessment |
| :--- | ---: | :---: |
| North | **+12** | Stable |
| South | −3 → 0 | *Review pending* |
| The remote western observatory with a deliberately long name | ±2 | Awaiting comparison |

- Retain the first reading.
- Compare the second reading before drawing conclusions.

A second comparison follows the list.

| Interval | Reading | Reference |
| :--- | ---: | :--- |
| First | +0.025 | [Record](https://example.org/record) |
| Second | −0.010 | Δ ≠ 0 |

The review remains open.
```

---
<!-- beat: Internal comparison -->

```typeout
@format janus-log

**Date:** 4 November 2030
**Subject:** Alternative interpretation

## Comparison

The circulated account contains **two unresolved readings**. *The difference deserves attention.*

First analytical statement.\
Second analytical statement.

| Hypothesis | Confidence | Next observation |
| :--- | ---: | :--- |
| Drift | +0.4 | Repeat the measurement |
| Calibration | −0.2 | Compare an independent instrument |

1. Preserve the earlier results.
2. Record the next comparison.

No conclusion is asserted.
```

---

The document study is complete.

---
<!-- beat: Two documents in one beat -->

```typeout
@format janus
@speed 120

A short circulated comparison.

| Reading | Change |
| --- | ---: |
| First | +1 |
```

The second document follows in the same beat.

```typeout
@format janus-log
@speed 120

A short internal comparison.

| Reading | Change |
| --- | ---: |
| Second | −1 |
```
