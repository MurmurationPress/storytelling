<!-- beat: Multiple formatted components share this beat -->

Synthetic prose, assets and diagrams.

````typeout
@format janus
@identity component
@title janus — Relationship model
@timestamp 2030-10-20 02:19
@sound none
@speed 120

Opening **formatted prose** before the first image.

![Three retained observations converge on a shared hypothesis; the arrows record relationships, not chronology.](<../assets/Relationship model α.png>)

*Caption: A synthetic retained relationship model.*

| Subject | Relation | Evidence |
| :--- | :---: | :--- |
| Observation A | supports | ![A JPEG graph in a cell](../assets/Detail.jpg) |
| Observation B | qualifies | +0.94 |

```mermaid
flowchart LR
  accTitle: Retained relationship model
  accDescr: Two observations support a shared hypothesis.
  A[Observation A] --> C[Hypothesis C]
  B[Observation B] --> C
```

*Caption: The retained model, as authored.*

Text between diagrams and another image.

- An image within an item: ![A WebP observation](../assets/Detail.webp)
- A second item with **emphasis**.

An inline image ![Inline observation](../assets/Repeated.png) appears atomically while its surrounding prose retains its format.

```mermaid
sequenceDiagram
  accTitle: Observation exchange
  Observer->>Record: Retain the observation
  Record-->>Observer: Recorded
```

Concluding prose after the second diagram. [[Media note|Read the media note]].
````

````typeout
@format janus-log
@identity component
@title janus-log — Relationship model
@timestamp 2030-10-20 02:19
@sound none
@speed 120

Opening **formatted prose** before the first image.

![Three retained observations converge on a shared hypothesis; the arrows record relationships, not chronology.](<../assets/Relationship model α.png>)

*Caption: A synthetic retained relationship model.*

| Subject | Relation | Evidence |
| :--- | :---: | :--- |
| Observation A | supports | ![A JPEG graph in a cell](../assets/Detail.jpg) |
| Observation B | qualifies | +0.94 |

```mermaid
---
config:
  look: handDrawn
  handDrawnSeed: 42
---
flowchart LR
  accTitle: Retained relationship model
  accDescr: Two observations support a shared hypothesis.
  A[Observation A] --> C[Hypothesis C]
  B[Observation B] --> C
```

*Caption: The retained model, as authored.*

Text between diagrams and another image.

- An image within an item: ![A WebP observation](../assets/Detail.webp)
- A second item with **emphasis**.

An inline image ![Inline observation](../assets/Repeated.png) appears atomically while its surrounding prose retains its format.

```mermaid
sequenceDiagram
  accTitle: Observation exchange
  Observer->>Record: Retain the observation
  Record-->>Observer: Recorded
```

Concluding prose after the second diagram. [[Media note|Read the media note]].
````

````typeout
@format annotation
@identity component
@title annotation — Relationship model
@timestamp 2030-10-20 02:19
@sound none
@speed 120

Opening **formatted prose** before the first image.

![Three retained observations converge on a shared hypothesis; the arrows record relationships, not chronology.](<../assets/Relationship model α.png>)

*Caption: A synthetic retained relationship model.*

| Subject | Relation | Evidence |
| :--- | :---: | :--- |
| Observation A | supports | ![A JPEG graph in a cell](../assets/Detail.jpg) |
| Observation B | qualifies | +0.94 |

```mermaid
flowchart LR
  accTitle: Retained relationship model
  accDescr: Two observations support a shared hypothesis.
  A[Observation A] --> C[Hypothesis C]
  B[Observation B] --> C
```

*Caption: The retained model, as authored.*

Text between diagrams and another image.

- An image within an item: ![A WebP observation](../assets/Detail.webp)
- A second item with **emphasis**.

An inline image ![Inline observation](../assets/Repeated.png) appears atomically while its surrounding prose retains its format.

```mermaid
sequenceDiagram
  accTitle: Observation exchange
  Observer->>Record: Retain the observation
  Record-->>Observer: Recorded
```

Concluding prose after the second diagram. [[Media note|Read the media note]].
````

---
<!-- beat: Recoverable media failures -->

````typeout
@format janus-log
@identity component
@title Failures remain readable
@sound none
@speed 120

![Missing local illustration](../assets/missing.png)

```mermaid
flowchart TD
  A[Unclosed
```

Further analysis continues after the error.
````

---
<!-- beat: Legacy media heading -->

````typeout
@format janus
@sound none
@speed 120

![Legacy image](../assets/Repeated.png)

```mermaid
flowchart TD
 A[Legacy] --> B[Retained]
```
````

---

````typeout
@format yaml
@identity component
@title Literal media-like data
@sound none
@speed 120

![Never loaded](../assets/yaml-only-secret.png)
```mermaid
flowchart TD
 A --> B
```
````

---

End of the synthetic media review.
