// Reconnaissance des commandes vocales en darija.
// Tout reste local : la transcription du navigateur est lue puis interprétée ici.

const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(ARABIC_MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PRESENT_WORDS = ['حاضر', 'حاضره', 'حاضرين', 'حضور', 'جا', 'جاء', 'جاو', 'جيت', 'hader', 'hadra', 'hadrin', 'present', 'ja', 'jaw'];
const ABSENT_WORDS = ['غايب', 'غايبه', 'غايبين', 'غياب', 'ماجا', 'ماجاش', 'ghayeb', 'ghayba', 'ghyab', 'absent'];
const SEARCH_WORDS = ['قلب', 'قلبلي', 'بحث', 'وين', 'فين', 'شكون', 'شوف', 'cherche', 'qelleb', 'win', 'fin', 'find', 'search'];
const ADD_WORDS = ['زيد', 'زد', 'جديد', 'زيدو', 'zid', 'jdid', 'ajouter', 'add', 'nouveau'];

const ABSENT_PHRASES = ['ما جا', 'ما جاش', 'ماجا', 'ماجاش'];

function hasWord(tokens, words) {
  return words.some((word) => tokens.includes(normalizeText(word)));
}

function findWorker(text, tokens, workers) {
  let best = null;
  workers.forEach((worker) => {
    [worker.name, worker.latin].forEach((value) => {
      const normalized = normalizeText(value);
      if (!normalized) return;
      const candidates = [normalized, ...normalized.split(' ').filter((part) => part.length >= 3)];
      candidates.forEach((candidate) => {
        const matched = candidate.includes(' ') ? text.includes(candidate) : tokens.includes(candidate);
        if (matched && (!best || candidate.length > best.length)) best = { worker, length: candidate.length };
      });
    });
  });
  return best ? best.worker : null;
}

export function parseDarijaCommand(transcript, workers = []) {
  const raw = String(transcript || '').trim();
  const text = normalizeText(raw);
  if (!text) return { kind: 'unknown', worker: null, raw };

  const tokens = text.split(' ');
  const worker = findWorker(text, tokens, workers);

  let kind = 'unknown';
  if (hasWord(tokens, ADD_WORDS)) kind = 'add';
  else if (hasWord(tokens, SEARCH_WORDS)) kind = 'search';
  else if (hasWord(tokens, ABSENT_WORDS) || ABSENT_PHRASES.some((phrase) => text.includes(normalizeText(phrase)))) kind = 'absent';
  else if (hasWord(tokens, PRESENT_WORDS)) kind = 'present';

  return { kind, worker, raw };
}

export function isVoiceSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startDarijaRecognition(handlers = {}) {
  if (typeof window === 'undefined') return null;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = 'ar-MA';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let finalText = '';
    let interim = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    handlers.onResult?.({ finalText, interim });
  };
  recognition.onerror = (event) => handlers.onError?.(event.error || 'error');
  recognition.onend = () => handlers.onEnd?.();

  try {
    recognition.start();
  } catch {
    handlers.onError?.('start_failed');
    return null;
  }
  return recognition;
}