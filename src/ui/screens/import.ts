/**
 * "Add words" screen: file picker, drag-and-drop, paste box and the sample.
 *
 * Every accepted input goes through `beginPreview()` in `ui/importFlow.ts`,
 * exactly as the single-file app did.
 */

import { t } from '../../i18n';
import { SAMPLE_TEXT } from '../../parser/sample';
import { beginPreview, setPendingImport } from '../importFlow';
import { $ } from '../dom';
import { navigate } from '../nav';
import { toast } from '../toast';

/** Clear the paste box and any parse errors when opening a fresh import. */
export function resetImportScreen(): void {
  const paste = $<HTMLTextAreaElement>('#pasteArea');
  if (paste) paste.value = '';
  const errors = $<HTMLElement>('#parseErrors');
  if (errors) errors.innerHTML = '';
  setPendingImport(null);
}

/** Read a File as UTF-8 (BOM stripped by the parser) and start the preview. */
function readFile(file: File): void {
  // The extension/MIME pair is only a hint in the legacy app, so any file that
  // reaches here is read as text and left to the parser.
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || '');
      beginPreview(text, file.name.replace(/\.[^.]+$/, ''));
    } catch {
      toast(t('import.badFile'));
    }
  };
  reader.onerror = () => toast(t('import.badFile'));
  reader.readAsText(file, 'UTF-8');
}

/** Bind the static controls once, when the shell markup exists. */
export function bindImportScreen(): void {
  $('#btnNewDeck')?.addEventListener('click', () => {
    resetImportScreen();
    navigate('import');
  });

  const dz = $<HTMLElement>('#dropzone');
  const fileInput = $<HTMLInputElement>('#fileInput');
  if (dz && fileInput) {
    dz.addEventListener('click', () => fileInput.click());
    dz.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => {
      e.preventDefault(); dz.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => {
      e.preventDefault(); dz.classList.remove('dragover');
    }));
    dz.addEventListener('drop', e => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) readFile(file);
    });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) readFile(file);
      fileInput.value = '';
    });
  }

  $('#btnParsePaste')?.addEventListener('click', () => {
    const text = $<HTMLTextAreaElement>('#pasteArea')?.value ?? '';
    if (!text.trim()) { toast(t('import.empty')); return; }
    beginPreview(text, '');
  });
  $('#btnSample')?.addEventListener('click', () => beginPreview(SAMPLE_TEXT, 'German → Serbian sample'));
  $('#btnSampleHome')?.addEventListener('click', () => beginPreview(SAMPLE_TEXT, 'German → Serbian sample'));
}
