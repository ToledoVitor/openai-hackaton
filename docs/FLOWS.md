# Product and System Flows

## Player journey

```mermaid
flowchart LR
    A[Mayor arrives] --> B[Inspect broken Town Hall]
    B --> C[Interview three citizens]
    C --> D[Project Brief gains three needs]
    D --> E[Type or speak Prompt Attempt]
    E --> F[Construction Sprites act]
    F --> G[Three.js animates matched repairs]
    G --> H[Citizen reaction + checklist + voice hint]
    H --> I{All needs passed?}
    I -- No --> J[Reveal or reinforce Prompt Blueprint]
    J --> E
    I -- Yes --> K[Town Hall celebration]
    K --> L[Next District lights up]
    L --> M[Optional Parameter Trial]
```

## Prompt Attempt sequence

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant UI as City Command UI
    participant Moderation as Moderation API
    participant Route as Evaluation Route
    participant Responses as Responses API
    participant Rules as Quest Rules
    participant Scene as Three.js Diorama
    participant SpeechRoute as Speech Route
    participant Speech as Speech API

    Player->>UI: Submit typed or transcribed prompt
    UI->>Route: prompt, quest ID, current stage
    Route->>Moderation: classify prompt
    alt Flagged input
        Moderation-->>Route: flagged
        Route-->>UI: Playful Redirect
        UI-->>Player: Safe redirect; City unchanged
    else Allowed input
        Moderation-->>Route: allowed
        Route->>Responses: extract Prompt Blueprint and civic traits
        Responses-->>Route: strict structured result
        Route->>Rules: compare traits with Project Brief
        Rules-->>Route: repair delta, checklist, next hint
        Route-->>UI: validated Turn Result
        UI->>Scene: animate repair delta
        UI->>SpeechRoute: request approved hint audio
        SpeechRoute->>Speech: generate bounded hint
        Speech-->>SpeechRoute: audio
        SpeechRoute-->>UI: audio
        par Visual feedback
            Scene-->>Player: repair or comic error animation
        and Audio feedback
            UI-->>Player: generated citizen hint
        end
    end
```

## Quest state machine

```mermaid
stateDiagram-v2
    [*] --> Arrival
    Arrival --> DiscoverNeeds: inspect Town Hall
    DiscoverNeeds --> ReadyToPrompt: three Citizen Requests collected
    ReadyToPrompt --> Evaluating: submit Prompt Attempt
    Evaluating --> Redirected: unsafe or off-topic
    Redirected --> ReadyToPrompt: City unchanged
    Evaluating --> PartialRepair: one or two needs newly pass
    Evaluating --> NoRepair: no new need passes
    NoRepair --> GuidedRetry: show one actionable hint
    PartialRepair --> GuidedRetry: update Project Brief
    GuidedRetry --> ReadyToPrompt
    Evaluating --> Restored: all needs pass
    Restored --> Celebration
    Celebration --> DistrictTeaser
    DistrictTeaser --> ParameterTrial: stretch feature available
    DistrictTeaser --> [*]: core demo ends
    ParameterTrial --> [*]
```

## Evaluation ownership

```mermaid
flowchart TD
    P[Free-text prompt] --> M[Model extracts semantic traits]
    M --> V{Schema valid?}
    V -- No --> F[Prepared fallback Turn Result]
    V -- Yes --> R[Local quest rules]
    R --> A[Authoritative repair delta]
    A --> S[Persist local progression]
    A --> T[Animate Three.js scene]

    style M fill:#ded7f7,stroke:#735da8
    style R fill:#fff0b8,stroke:#a47c18
    style A fill:#d9f2e6,stroke:#318069
```

Model interprets language. Local rules decide game progression. Scene only renders approved state changes.

## Failure and fallback flow

```mermaid
flowchart TD
    A[Prompt Attempt] --> B{Moderation reachable?}
    B -- No --> C[Block live call and offer retry]
    B -- Yes --> D{Input allowed?}
    D -- No --> E[Playful Redirect]
    D -- Yes --> F{Evaluation succeeds and validates?}
    F -- No --> G[Use prepared Turn Result + offline badge]
    F -- Yes --> H[Use live Turn Result]
    G --> I[Apply deterministic quest rules]
    H --> I
    I --> J{Speech succeeds?}
    J -- No --> K[Show text hint only]
    J -- Yes --> L[Play generated hint]
    K --> M[Continue quest]
    L --> M
```

## Public release flow

```mermaid
flowchart LR
    A[Build core locally] --> B[Publish Codex Sites preview]
    B --> C{Public HTTPS works?}
    C -- No --> D[Release blocked]
    C -- Yes --> E{Server secret protected?}
    E -- No --> D
    E -- Yes --> F{Responses + mic + fallback pass?}
    F -- No --> D
    F -- Yes --> G[Run two 3-minute rehearsals]
    G --> H{Both pass?}
    H -- No --> I[Fix or cut stretch scope]
    I --> F
    H -- Yes --> J[Hackathon-ready public URL]
```
