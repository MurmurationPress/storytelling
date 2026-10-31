A neutral example. [[Signal note|About the signal]]

```mermaid
flowchart LR
  accTitle: Signal route
  accDescr: PRIME examines an image of the reserve.
  A[Satellite image] --> B[Habitat assessment] --> C[Receiver]
```

*Caption: The default signal route.*

@pause 800ms

```mermaid
sequenceDiagram
  accTitle: Acknowledgement
  accDescr: Sender sends a signal and receiver acknowledges it.
  Sender->>Receiver: Signal
  Receiver-->>Sender: What style do you prefer?
```

```chat
@delay 0ms
Sender: Received.
```

After the diagrams.

---

```mermaid
flowchart LR
 broken [
```

The scene continues after malformed source.

```mermaid
---
config:
  securityLevel: loose
---
flowchart LR
  A --> B
```


```javascript
const value = 1;
```

---

```mermaid
---
config:
  look: handDrawn
  handDrawnSeed: 42
  flowchart:
    curve: linear
---
flowchart LR
  accTitle: Signal route
  accDescr: PRIME examines an image of the reserve.
  A[Satellite image] --> B[Habitat assessment] --> C[Receiver]
```
