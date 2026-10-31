A neutral example. [[Signal note|About the signal]]

```mermaid
flowchart LR
  accTitle: Signal route
  accDescr: A signal moves from sender to relay to receiver.
  A[Sender] --> B[Relay] --> C[Receiver]
```

@pause 800ms

```mermaid
sequenceDiagram
  accTitle: Acknowledgement
  accDescr: Sender sends a signal and receiver acknowledges it.
  Sender->>Receiver: Signal
  Receiver-->>Sender: Acknowledgement
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

```javascript
const value = 1;
```

---

```mermaid
flowchart LR
  accTitle: Signal route
  accDescr: A signal moves from sender to relay to receiver.
  A[Sender] --> B[Relay] --> C[Receiver]
```
