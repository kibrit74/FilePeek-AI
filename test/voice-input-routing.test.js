const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appPath = path.join(__dirname, "..", "src", "renderer", "app.js");

test("browser read aloud uses speechSynthesis without AI transcription", () => {
  const app = fs.readFileSync(appPath, "utf8");
  const speakHandler = app.match(/speakBtn\.addEventListener\("click", \(\) => \{[\s\S]*?\n\}\);/);

  assert.ok(speakHandler, "speak button handler should exist");
  assert.match(speakHandler[0], /speakText\(textSource\)/);
  assert.doesNotMatch(speakHandler[0], /aiTranscribeAudio|aiQuestion|gemini/i);
});

test("voice question uses recorded local STT before browser speech fallback", () => {
  const app = fs.readFileSync(appPath, "utf8");
  const handler = app.match(/async function startVoiceQuestionInput\(\) \{[\s\S]*?\n\}/);

  assert.ok(handler, "voice question handler should exist");
  assert.match(app, /window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/);
  assert.match(app, /function startBrowserVoiceQuestionInput/);
  assert.ok(
    handler[0].indexOf("await startRecordedVoiceQuestionInput()") <
      handler[0].indexOf("startBrowserVoiceQuestionInput()"),
    "local recorded STT should be attempted before browser speech fallback"
  );
});

test("browser speech network errors fall back to recorded transcription", () => {
  const app = fs.readFileSync(appPath, "utf8");

  assert.match(app, /function startRecordedVoiceQuestionInput/);
  assert.match(app, /event\.error === "network"/);
  assert.match(app, /startRecordedVoiceQuestionInput\(\)/);
});

test("voice question records WAV audio for local whisper transcription", () => {
  const app = fs.readFileSync(appPath, "utf8");

  assert.match(app, /function createWavAudioBlob/);
  assert.match(app, /audio\/wav/);
  assert.match(app, /window\.kankaAPI\.aiTranscribeAudio\(base64Audio, "audio\/wav"\)/);
});
