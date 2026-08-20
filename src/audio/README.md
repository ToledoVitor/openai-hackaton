# Audio integration

Start audio from the app's first user gesture so browser autoplay rules are satisfied:

```ts
import { createAudioManager } from "./audio";

const audio = createAudioManager();
startButton.addEventListener("click", audio.start, { once: true });
```

Call `audio.stop()` when the game unmounts. Wrap generated speech with `beginVoice()` and `endVoice()` for automatic music and ambience ducking. The standalone `audio-preview` uses the same public module because this repository does not yet contain the game shell.

AI City entry controls use the same manager and stored preference record. Do not start playback from generic page pointer or keyboard listeners: only a deliberate sound control may call `start()`. Automated tests must inject audio/storage fakes and remain fully offline.
