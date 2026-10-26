const form = document.querySelector('#qr-form');
const urlInput = document.querySelector('#attendance-url');
const titleInput = document.querySelector('#session-title');
const colorInput = document.querySelector('#accent-color');
const colorValue = document.querySelector('#color-value');
const message = document.querySelector('#url-message');
const clearButton = document.querySelector('#clear-url');
const displayCard = document.querySelector('#display-card');
const displayTitle = document.querySelector('#display-title');
const shortUrl = document.querySelector('#short-url');
const qrStage = document.querySelector('#qr-stage');
const qrCodeElement = document.querySelector('#qr-code');
const presentButton = document.querySelector('#present-button');
const downloadButton = document.querySelector('#download-button');

const DEFAULT_MESSAGE = 'Use a link students can open without requesting access.';
let generatedUrl = '';

function normalizedUrl(value) {
  const input = value.trim();
  if (!input) throw new Error('Paste your attendance form URL first.');

  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
    throw new Error('Enter a complete web address, such as https://example.com/form.');
  }
  return parsed.toString();
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
  urlInput.setAttribute('aria-invalid', String(isError));
}

function updateDisplay() {
  const accent = colorInput.value.toUpperCase();
  colorValue.textContent = accent;
  displayCard.style.setProperty('--display-accent', accent);
  displayTitle.textContent = titleInput.value.trim() || 'Scan to sign in';
}

async function generateCode(event) {
  event?.preventDefault();
  setMessage(DEFAULT_MESSAGE);

  let url;
  try {
    url = normalizedUrl(urlInput.value);
  } catch (error) {
    setMessage(error.message, true);
    urlInput.focus();
    return;
  }

  if (typeof QRCode === 'undefined') {
    setMessage('The QR library could not load. Check your connection and try again.', true);
    return;
  }

  urlInput.value = url;
  updateDisplay();

  try {
    qrCodeElement.replaceChildren();
    new QRCode(qrCodeElement, {
      text: url,
      width: 1200,
      height: 1200,
      colorDark: '#0E2523',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H
    });
    generatedUrl = url;
    shortUrl.textContent = new URL(url).hostname + new URL(url).pathname;
    qrStage.classList.add('ready');
    presentButton.disabled = false;
    downloadButton.disabled = false;
    localStorage.setItem('classroomQrSettings', JSON.stringify({
      url,
      title: titleInput.value.trim(),
      color: colorInput.value
    }));
    setMessage('QR code ready. Scan it once before presenting.');
  } catch {
    setMessage('That link is too long to encode. Try a shorter share link.', true);
  }
}

async function enterPresentation() {
  if (!generatedUrl) return;
  document.body.classList.add('presentation-mode');
  try {
    await document.documentElement.requestFullscreen?.();
  } catch {
    // Presentation mode still fills the browser when fullscreen permission is unavailable.
  }
}

async function exitPresentation() {
  document.body.classList.remove('presentation-mode');
  if (document.fullscreenElement) await document.exitFullscreen?.();
}

function downloadCode() {
  if (!generatedUrl) return;
  const canvas = qrCodeElement.querySelector('canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  const safeTitle = (titleInput.value.trim() || 'attendance').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  link.download = `${safeTitle}-qr.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

form.addEventListener('submit', generateCode);
titleInput.addEventListener('input', updateDisplay);
colorInput.addEventListener('input', updateDisplay);
urlInput.addEventListener('input', () => {
  if (urlInput.getAttribute('aria-invalid') === 'true') setMessage(DEFAULT_MESSAGE);
});
clearButton.addEventListener('click', () => {
  urlInput.value = '';
  urlInput.focus();
  setMessage(DEFAULT_MESSAGE);
});
presentButton.addEventListener('click', enterPresentation);
downloadButton.addEventListener('click', downloadCode);
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) document.body.classList.remove('presentation-mode');
});
document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'f' && generatedUrl && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) enterPresentation();
  if (event.key === 'Escape' && document.body.classList.contains('presentation-mode')) exitPresentation();
});

try {
  const saved = JSON.parse(localStorage.getItem('classroomQrSettings'));
  if (saved) {
    urlInput.value = saved.url || '';
    titleInput.value = saved.title || '';
    colorInput.value = saved.color || '#ef5b3f';
  }
} catch {
  localStorage.removeItem('classroomQrSettings');
}

updateDisplay();
