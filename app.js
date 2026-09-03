const phrases = [
  { en: 'How are you?', hi: 'आप कैसे हैं?', santali: 'ᱵᱟᱝ ᱟᱢ ᱠᱟᱹᱢᱤ ᱫᱚ?', latin: 'Bang am kãmi do?', tag: 'Greeting' },
  { en: 'Good morning', hi: 'सुप्रभात', santali: 'ᱥᱟᱹᱜᱟᱹᱭ ᱡᱚᱦᱟᱨ', latin: 'Sãgãy johar', tag: 'Greeting' },
  { en: 'Thank you', hi: 'धन्यवाद', santali: 'ᱡᱚᱦᱟᱨ', latin: 'Johar', tag: 'Everyday' },
  { en: 'What is your name?', hi: 'आपका नाम क्या है?', santali: 'ᱟᱢᱟᱜ ᱧᱩᱛᱩᱢ ᱫᱚ ᱪᱮᱫ?', latin: 'Amag nutum do cet?', tag: 'Introduction' },
  { en: 'I need help', hi: 'मुझे मदद चाहिए', santali: 'ᱤᱧ ᱥᱟᱦᱟᱭ ᱥᱟᱹᱜᱟᱹᱭ ᱢᱮ', latin: 'In sahay sãgãy me', tag: 'Essential' },
  { en: 'Where is the hospital?', hi: 'अस्पताल कहाँ है?', santali: 'ᱦᱚᱥᱯᱤᱴᱟᱞ ᱚᱠᱟᱛᱮ ᱢᱮᱱᱟᱜ?', latin: 'Hospital okate menag?', tag: 'Health' },
  { en: 'Please sit', hi: 'कृपया बैठिए', santali: 'ᱫᱟᱭᱟ ᱠᱟᱛᱮ ᱫᱩᱵ ᱢᱮ', latin: 'Daya kate dub me', tag: 'Everyday' },
  { en: 'I understand', hi: 'मैं समझता/समझती हूँ', santali: 'ᱤᱧ ᱵᱩᱡᱷᱟᱹᱣᱟᱫᱟ', latin: 'In bujhau ada', tag: 'Everyday' }
];

const sourceText = document.querySelector('#sourceText');
const resultText = document.querySelector('#resultText');
const translit = document.querySelector('#translit');
const charCount = document.querySelector('#charCount');
const detected = document.querySelector('#detected');
const toast = document.querySelector('#toast');
let reverse = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const micBtn = document.querySelector('#micBtn');

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-IN';
  micBtn.addEventListener('click', () => {
    recognition.start();
    micBtn.textContent = '● Listening…';
    micBtn.classList.add('listening');
  });
  recognition.onresult = event => {
    sourceText.value = event.results[0][0].transcript;
    updateCount();
    translateInput();
  };
  recognition.onend = () => {
    micBtn.textContent = '● Speak';
    micBtn.classList.remove('listening');
  };
  recognition.onerror = () => {
    micBtn.textContent = '● Speak';
    micBtn.classList.remove('listening');
    toast.textContent = 'Microphone access was unavailable';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  };
} else {
  micBtn.textContent = '● Mic unavailable';
  micBtn.disabled = true;
  micBtn.title = 'Use Chrome or Edge for voice input';
}

function renderPhrases() {
  document.querySelector('#phrases').innerHTML = phrases.map((phrase, index) => `
    <button class="phrase" data-index="${index}">
      <strong>${phrase.en}</strong><small>${phrase.latin}</small><div class="phrase-tag">${phrase.tag}</div>
    </button>`).join('');
  document.querySelectorAll('.phrase').forEach(button => button.addEventListener('click', () => selectPhrase(Number(button.dataset.index))));
}

function selectPhrase(index) {
  const phrase = phrases[index];
  sourceText.value = reverse ? phrase.latin : phrase.en;
  showTranslation(phrase);
  updateCount();
}

function showTranslation(phrase) {
  resultText.textContent = reverse ? phrase.en : phrase.santali;
  translit.textContent = reverse ? 'English meaning' : phrase.latin;
  detected.textContent = reverse ? 'Santali · Latin input' : 'English detected';
}

function findPhrase(value) {
  const query = value.trim().toLowerCase();
  if (!query) return phrases[0];
  return phrases.find(phrase => [phrase.en, phrase.hi, phrase.latin].some(text => text.toLowerCase().includes(query))) || null;
}

function translateInput() {
  const phrase = findPhrase(sourceText.value);
  if (phrase) showTranslation(phrase);
  else {
    resultText.textContent = 'Phrase not in demo set';
    translit.textContent = 'Add a community-reviewed translation next';
    detected.textContent = 'Try one of the phrasebook examples';
  }
}

function updateCount() { charCount.textContent = `${sourceText.value.length} / 160`; }
sourceText.addEventListener('input', () => { updateCount(); translateInput(); });
document.querySelector('#clearBtn').addEventListener('click', () => { sourceText.value = ''; updateCount(); showTranslation(phrases[0]); detected.textContent = 'Language detected automatically'; sourceText.focus(); });
document.querySelector('#swapBtn').addEventListener('click', () => {
  reverse = !reverse;
  document.querySelector('[data-lang="source"]').textContent = reverse ? 'Santali · Latin' : 'Hindi / English';
  document.querySelector('[data-lang="target"]').textContent = reverse ? 'English' : 'Santali · Ol Chiki';
  const phrase = findPhrase(sourceText.value) || phrases[0];
  sourceText.value = reverse ? phrase.latin : phrase.en;
  showTranslation(phrase); updateCount();
});
document.querySelector('#copyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(`${resultText.textContent}\n${translit.textContent}`); } catch { /* clipboard may be unavailable from a local file */ }
  toast.textContent = 'Translation copied'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1600);
});
renderPhrases();
