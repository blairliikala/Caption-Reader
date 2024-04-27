import { prettyTimecode } from './utilities.js';

export function cueToHTML(cue, index, disabled, singleline) {
  if (!cue.timecode) return '';
  const styleName = cue.status || '';
  const timecode = `<span class="timecode">${prettyTimecode(cue.timecode.start)}</span>`;
  const chapter = cue.chapter ? `<span class="chapter">${cue.chapter}</span>` : '';
  const textJoiner = singleline ? ' ' : '<br />';

  let spacerProgress = '';
  if (cue.type === 'spacer') {
    const progMax = Math.round(cue.seconds.end - cue.seconds.start);
    spacerProgress = `<progress max="${progMax}" value="0" data-progress="${index}"></progress>`;
  }

  let text = `<span class="text">${cue.text.join(textJoiner)}</span>`;
  if (cue.subCues) {
    text = '<span class="text">';
    text += cue.subCues.map(sub => `<span class="${sub.status}">${sub.text}</span>`).join('');
    text += '</span>';
  }

  return `<li class="cueitem">
    <button
      type="button"
      tabindex="0"
      data-start="${cue.seconds.start}"
      class="cue ${styleName} ${cue.type || ''}"
      data-index="${index}"
      style="animation-duration: ${Math.round(cue.seconds.end - cue.seconds.start)}s"
    >${!disabled.includes('timecode') && cue.type !== 'spacer' ? timecode : ''} ${!disabled.includes('chapters') ? chapter : ''} ${!disabled.includes('text') ? text : ''} ${spacerProgress}
    </button></li>`;
}

export function renderAllCaptions(captions, disable, singleline) {
  if (!captions) return '';
  const disabled = disable ? disable.split('|') : [];
  let html = '<ol>';
  captions.cues?.forEach((cue, index) => {
    html += cueToHTML(cue, index, disabled, singleline);
  });
  html += '</ol>';
  return html;
}

export function updateCaptionClasses(elms, captions) {
  const divs = elms.root.querySelectorAll('.cueitem');
  divs.forEach((item, index) => {
    const cue = captions.cues[index];
    item.firstElementChild.classList.remove('upcoming', 'next', 'active', 'previous', 'passed');
    item.firstElementChild.classList.add(cue?.status);
  });
}
