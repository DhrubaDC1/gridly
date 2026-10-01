const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

/**
 * Creates a WAV file Buffer containing 16-bit mono PCM samples at 44.1kHz.
 *
 * @param {Float32Array | number[]} samples - Array of audio samples in range [-1.0, 1.0].
 * @returns {Buffer}
 */
function encodeWav(samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2; // 1 channel * 16 bits = 2 bytes per sample
  const blockAlign = 2;
  const subChunk2Size = numSamples * 2;
  const chunkSize = 36 + subChunk2Size;

  const buffer = Buffer.alloc(44 + subChunk2Size);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM = 16
  buffer.writeUInt16LE(1, 20); // AudioFormat: 1 = PCM
  buffer.writeUInt16LE(1, 22); // NumChannels: 1 = mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample: 16

  // "data" subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(subChunk2Size, 40);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const intSample = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, intSample)), offset);
    offset += 2;
  }

  return buffer;
}

/**
 * Applies a quick attack ramp and exponential decay envelope to a note.
 *
 * @param {number} t - Time in seconds from note start.
 * @param {number} duration - Total note duration in seconds.
 * @param {number} attackDuration - Attack duration in seconds.
 * @param {number} decayRate - Exponential decay rate multiplier.
 * @returns {number} Amplitude envelope multiplier (0.0 to 1.0).
 */
function getEnvelope(t, duration, attackDuration = 0.005, decayRate = 12) {
  if (t < 0 || t > duration) return 0;
  let attack = 1;
  if (t < attackDuration) {
    attack = t / attackDuration;
  }
  const decay = Math.exp(-decayRate * t);
  return attack * decay;
}

/**
 * Generates an array of samples of specified duration (in seconds).
 *
 * @param {number} duration
 * @param {(t: number, i: number) => number} sampleFn
 * @returns {Float32Array}
 */
function generateTone(duration, sampleFn) {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = sampleFn(t, i);
  }
  return samples;
}

// 1. pickup.wav: ~40ms, high and quiet
function generatePickup() {
  const duration = 0.04;
  const freq = 987.77; // B5 - high and pleasant
  const peakAmp = 0.18; // quiet
  return generateTone(duration, (t) => {
    const env = getEnvelope(t, duration, 0.004, 30);
    return peakAmp * env * Math.sin(2 * Math.PI * freq * t);
  });
}

// 2. place.wav: ~80ms, low thud-like tone
function generatePlace() {
  const duration = 0.08;
  const peakAmp = 0.35;
  return generateTone(duration, (t) => {
    // Pitch drops slightly from 140Hz to 85Hz for a gentle thud
    const progress = t / duration;
    const freq = 140 - 55 * progress;
    const env = getEnvelope(t, duration, 0.003, 20);
    return peakAmp * env * Math.sin(2 * Math.PI * freq * t);
  });
}

// 3. clear-1.wav through clear-6.wav: ~250ms soft chime, each whole step higher
function generateClear(comboIndex) {
  const duration = 0.25;
  const baseFreq = 523.25; // C5
  // Whole step = 2 semitones = 2^(2/12)
  const semitones = (comboIndex - 1) * 2;
  const freq = baseFreq * Math.pow(2, semitones / 12);
  const peakAmp = 0.3;

  return generateTone(duration, (t) => {
    const env = getEnvelope(t, duration, 0.006, 12);
    // 85% fundamental sine + 15% 2nd harmonic for gentle warmth
    const wave =
      0.85 * Math.sin(2 * Math.PI * freq * t) +
      0.15 * Math.sin(2 * Math.PI * freq * 2 * t);
    return peakAmp * env * wave;
  });
}

// 4. perfect.wav: gentle rising three-note arpeggio, ~600ms
function generatePerfect() {
  const duration = 0.6;
  const peakAmp = 0.28;
  // Major triad: C5 (523.25), E5 (659.25), G5 (783.99)
  const notes = [
    { start: 0.0, freq: 523.25, dur: 0.4 },
    { start: 0.15, freq: 659.25, dur: 0.38 },
    { start: 0.3, freq: 783.99, dur: 0.3 },
  ];

  return generateTone(duration, (t) => {
    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const { start, freq, dur } = notes[n];
      if (t >= start && t <= start + dur) {
        const localT = t - start;
        const env = getEnvelope(localT, dur, 0.008, 9);
        sample += env * (0.85 * Math.sin(2 * Math.PI * freq * localT) + 0.15 * Math.sin(4 * Math.PI * freq * localT));
      }
    }
    return peakAmp * sample;
  });
}

// 5. achievement.wav: two soft notes, ~300ms
function generateAchievement() {
  const duration = 0.3;
  const peakAmp = 0.25;
  // Rising fourth: G5 (783.99) -> C6 (1046.50)
  const notes = [
    { start: 0.0, freq: 783.99, dur: 0.2 },
    { start: 0.12, freq: 1046.5, dur: 0.18 },
  ];

  return generateTone(duration, (t) => {
    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const { start, freq, dur } = notes[n];
      if (t >= start && t <= start + dur) {
        const localT = t - start;
        const env = getEnvelope(localT, dur, 0.006, 12);
        sample += env * Math.sin(2 * Math.PI * freq * localT);
      }
    }
    return peakAmp * sample;
  });
}

// 6. gameover.wav: gentle falling two-note, ~400ms
function generateGameOver() {
  const duration = 0.4;
  const peakAmp = 0.25;
  // Gentle falling: E5 (659.25) -> B4 (493.88)
  const notes = [
    { start: 0.0, freq: 659.25, dur: 0.25 },
    { start: 0.16, freq: 493.88, dur: 0.24 },
  ];

  return generateTone(duration, (t) => {
    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const { start, freq, dur } = notes[n];
      if (t >= start && t <= start + dur) {
        const localT = t - start;
        const env = getEnvelope(localT, dur, 0.008, 10);
        sample += env * Math.sin(2 * Math.PI * freq * localT);
      }
    }
    return peakAmp * sample;
  });
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const sounds = [
    { name: 'pickup.wav', generate: generatePickup },
    { name: 'place.wav', generate: generatePlace },
    { name: 'clear-1.wav', generate: () => generateClear(1) },
    { name: 'clear-2.wav', generate: () => generateClear(2) },
    { name: 'clear-3.wav', generate: () => generateClear(3) },
    { name: 'clear-4.wav', generate: () => generateClear(4) },
    { name: 'clear-5.wav', generate: () => generateClear(5) },
    { name: 'clear-6.wav', generate: () => generateClear(6) },
    { name: 'perfect.wav', generate: generatePerfect },
    { name: 'achievement.wav', generate: generateAchievement },
    { name: 'gameover.wav', generate: generateGameOver },
  ];

  for (let i = 0; i < sounds.length; i++) {
    const { name, generate } = sounds[i];
    const samples = generate();
    const wavBuffer = encodeWav(samples);
    const dest = path.join(OUTPUT_DIR, name);
    fs.writeFileSync(dest, wavBuffer);
    console.log(`Generated ${name} (${samples.length} samples, ${wavBuffer.length} bytes)`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  encodeWav,
  generatePickup,
  generatePlace,
  generateClear,
  generatePerfect,
  generateAchievement,
  generateGameOver,
};
