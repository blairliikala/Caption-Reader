/* eslint-disable no-param-reassign */ // TODO
/* eslint-disable grouped-accessor-pairs */
/* eslint-disable lines-between-class-members */

import Utilities from './utilities.js';
import { parseVTT, parseSubTextCues, parseTextTrack } from './parsers.js';

export class CaptionsViewer extends HTMLElement {
  #isInit = false;
  #divs;

  // Params
  #src = ''; // location of a vtt src.
  #playhead = 0; // current seconds from start.
  #height = '300px'; // Hight of container, applied as inline style.
  #debounce = 0; // In seconds how long to
  #singleline = false;
  #color = ''; // Base 360 color for text.
  #disable = ''; // What vtt properties to disable, uses |
  #theme = ''; // blank/light or dark.  Dark shows lighter text.
  #youtube = false; // Makes vtt cue adjustments specific to YouTube.

  // Internal
  #captions = {}; // Master array of the cues.
  #currentCue = undefined; // for parser.
  #debounceScrolling = false; // for throttling scrolling.
  #paused = false; // toggle scrolling and highlighting.
  #textTrack = {}; // Native textTrack from video element.
  #spacer = 5; // Time in sec between cues where the progres bar cue will be shown.
  #nudge = 0.5; // Time in sec to start the cue early. comp for css transition.

  css = `<style>
    #root {
      display: block;
      scroll-behavior: smooth;
      height: 300px;
      overflow-y: scroll;
      overflow-x: hidden;
      scroll-snap-stop: always;
      position: relative;
      padding: .5rem;
      --base: 360;
    }
    #root * {
      box-sizing: border-box;
    }
    .empty {
      color: hsla(var(--base), 20%, 40%, .9);
    }
    ol {
      padding: 0;
      margin: 0;
    }
    li {
      list-style:none;
      width: 100%;
    }
    .cue {
      border: none;
      font: inherit;
      padding: 0.4rem 1.5rem .4rem .2rem;
      display: flex;
      gap: 1rem;
      list-style: none;
      transform: scale(1);
      transform-origin: left;
      color: hsla(var(--base), 20%, 40%, .9);
      transition: color 0.3s ease, font-size .2s ease, transform .1s ease;
      background: none;
      width: 100%;
      text-align: start;
    }
    .cue:hover, .cue:active, .cue:focus-visible {
      cursor: pointer;
      background: hsla(var(--base), 60%, 70%, .1);
      outline: 1px solid hsla(var(--base), 60%, 50%, .1);
      color: hsla(var(--base), 10%, 20%, 1);
    }
    .upcoming, .upcoming:focus-visable {
      color: hsla(var(--base), 20%, 60%, .7);
      transform: scale(1);
      transform-origin: left;
    }
    .next, .next:focus-visable {
      color: hsla(var(--base), 20%, 40%, .9);
      transform: scale(1);
      transform-origin: left;
    }
    .active {
      transform: scale(1.1);
      transform-origin: left;
      padding-right: 10%;
    }
      .active .timecode, .active .chapter {
        color: hsla(var(--base), 50%, 30%, 1);
      }
      .active .text, .active .chapter {
        color: hsla(var(--base), 0%, 30%, 1);
        font-weight: bold;
      }
    .passed, .passed:focus-visable  {
      color: hsla(var(--base), 20%, 60%, .7);
      transform: scale(1);
      transform-origin: left;
    }
    .spacer .text {
      color: hsla(var(--base), 20%, 60%, .5);
      letter-spacing: 5px;
      font-weight: bold;
    }

    [data-theme="dark"] .empty {
      color: hsla(var(--base), 30%, 80%, .9);
    }
    [data-theme="dark"] .cue {
      color: hsla(var(--base), 10%, 80%, .7);
    }
    [data-theme="dark"] .cue:hover, .cue:active, .cue:focus, .cue:focus-visible {
      background: hsla(var(--base), 60%, 70%, .1);
      outline: 1px solid hsla(var(--base), 60%, 50%, .1);
      color: hsla(var(--base), 0%, 100%, 1);
    }
    [data-theme="dark"] .upcoming, .upcoming:focus-visable {
      color: hsla(var(--base), 10%, 80%, .7);
    }
    [data-theme="dark"] .next, .next:focus-visable {
      color: hsla(var(--base), 20%, 80%, .9);
    }
    [data-theme="dark"] .active .timecode,
    [data-theme="dark"] .active .chapter
    {
      color: hsla(var(--base), 50%, 80%, 1);
    }
    [data-theme="dark"] .active .text,
    [data-theme="dark"] .active .chapter
    {
      color: hsla(var(--base), 0%, 100%, 1);
    }

    [data-theme="dark"] .previous, .previous:focus-visable {
      color: hsla(var(--base), 20%, 80%, .9);
    }
    [data-theme="dark"] .passed, .passed:focus-visable {
      color: hsla(var(--base), 10%, 80%, .7);
    }

    @media (prefers-reduced-motion) {
      .active, .previous {
        font-size: unset;
      }
    }

    progress {
      appearance: none;
      background: hsla(var(--base), 10%, 10%, .1);
      border: none;
      border-radius: 2px;
      height: 8px;
      align-self: center;
    }

    progress[value]::-webkit-progress-bar {
      background: hsla(var(--base), 10%, 10%, .2);
      box-shadow: none;
    }

    progress[value]::-moz-progress-bar {
      background: hsla(var(--base), 10%, 10%, .2);
      box-shadow: none;
    }
    progress[value]::-webkit-progress-value {
      background: hsla(var(--base), 10%, 10%, .2);
      box-shadow: none;
    }

    .active .sub_upcoming {
    }
    .active .sub_active {
      text-decoration: underline;
    }
  </style>`;

  constructor() {
    super();
    if (this.isConnected) {
      this.#init();
    }
  }

  static get observedAttributes() {
    return [
      'src',
      'playhead',
      'height',
      'debounce',
      'singleline',
      'color',
      'disable',
      'spacer',
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'playhead') {
      this.#updateCaptionStatus(newValue);
      return;
    }
    if (name === 'debounce') {
      this.#debounce = newValue;
      return;
    }
    this.#create();
  }

  set src(item) {
    this.setAttribute('src', item);
  }
  set playhead(item) {
    this.setAttribute('playhead', item);
  }
  set debounce(item) {
    this.setAttribute('debounce', item);
  }
  set singleline(item) {
    if (typeof item !== 'boolean') {
      console.warn('singleline must be a boolean.', item);
      this.#event('error', 'singleline must be a boolean.');
      return;
    }
    this.setAttribute('singleline', item);
  }
  set disable(item) {
    this.setAttribute('disable', item);
  }
  set debounceScrolling(item) {
    if (typeof item !== 'boolean') {
      console.warn('debounceScrolling must be a boolean.', item);
      this.#event('error', 'debounceScrolling must be a boolean.');
      return;
    }
    this.#debounceScrolling = item;
  }
  set textTrack(item) {
    this.#textTrack = item;
    this.#create();
  }
  set spacer(item) {
    this.#spacer = item;
  }
  set youtube(item) {
    if (typeof item !== 'boolean') {
      console.warn('youtube must be a boolean.', item);
      this.#event('error', 'youtube must be a boolean.');
      return;
    }
    this.#youtube = item;
  }

  get src() {
    return this.#src;
  }
  get playhead() {
    return this.#playhead;
  }
  get captions() {
    return this.#captions;
  }
  get debounce() {
    return this.#debounce;
  }
  get singleline() {
    return this.#singleline;
  }
  get height() {
    return this.#height;
  }
  get paused() {
    return this.#paused;
  }
  get disable() {
    return this.#disable;
  }
  get theme() {
    return this.#theme;
  }
  get spacer() {
    return this.#spacer;
  }
  get textTrack() {
    return this.#textTrack;
  }
  get youtube() {
    return this.#youtube;
  }

  connectedCallback() {
    this.#init();
  }

  #init() {
    if (this.#isInit) {
      this.#create();
      return;
    }
    this.#isInit = true;

    const template = document.createElement('template');

    template.innerHTML = `
      ${this.css}
      <captionselement id="root" data-theme=""></captionselement>
    `;

    const html = template.content.cloneNode(true);
    /* Apply using shadow DOM instead of made-up unknown element hack.
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(html);

    this.#divs = {
      root: this.shadowRoot?.querySelector('#root'),
    };
    */
    this.appendChild(html);

    this.#divs = {
      root: this.querySelector('#root'),
    };

    this.#divs.root.addEventListener('click', e => {
      const div = e.composedPath()[0].closest('button');
      if (div && 'localName' in div && div.localName === 'button') {
        const { index } = div.dataset;
        const seconds = this.#captions.cues[index].seconds.start;
        this.#event('seek', seconds);
        this.#updateCaptionStatus(seconds + 0.2);
      }
    });

    this.#divs.root.addEventListener('touchmove', () => {
      this.#debounceScrolling = true;
      console.log('[touchmove] touch move...');
      this.#divs.root.addEventListener('mouseup', () => {
        setTimeout(() => { this.#debounceScrolling = false; }, this.#debounce);
      });
    }, false);

    this.#divs.root.addEventListener('scroll', () => {
      this.#debounceScrolling = true;
      console.log('[scroll] touch move...');
      this.#divs.root.addEventListener('mouseup', () => {
        setTimeout(() => { this.#debounceScrolling = false; }, this.#debounce);
      });
      setTimeout(() => { this.#debounceScrolling = false; }, this.#debounce * 3);
    }, false);

    this.#create();
  }

  async #create() {
    this.#src = this.getAttribute('src') || '';
    this.#playhead = parseInt(this.getAttribute('playhead'), 10) || 0;
    this.#height = this.getAttribute('height') || '400px';
    this.#debounce = parseInt(this.getAttribute('debounce'), 10) || 5000;
    this.#singleline = (this.getAttribute('singleline') === 'true' || this.getAttribute('singleline') === true) || false;
    this.#color = this.getAttribute('color') || '';
    this.#disable = this.getAttribute('disable') || '';
    this.#theme = this.getAttribute('theme') || '';
    this.#youtube = (this.getAttribute('youtube') === 'true' || this.getAttribute('youtube') === true) || false;
    const styles = this.getAttribute('styles'); // Full replacement of css.

    if (!this.#src && !(this.#textTrack && 'id' in this.#textTrack)) {
      console.debug('No text track');
      return;
    }

    this.setTheme();

    const customStyles = [];
    if (this.#height !== '400px') {
      customStyles.push(`height: ${this.#height}`);
    }
    if (this.#color) {
      customStyles.push(`--base: ${this.#color}`);
    }
    this.#divs.root?.setAttribute('style', customStyles.join('; '));

    if (styles) {
      const existing = this.shadowRoot?.querySelector('style');
      if (existing) existing.innerHTML += `${styles}`;
    }

    // Send src through native parser.
    if (this.#src && Utilities.getFileType(this.#src) === 'vtt') {
      this.#textTrack = await this.#renderCaptionSrc(this.#src);
    }

    // Track in video element. Pushed after load.
    if (this.#textTrack && 'cues' in this.#textTrack) {
      console.log('Trying foo parser.');
      this.#captions = parseTextTrack(this.#textTrack, this.#nudge);
    }

    // Both failed, use the fallback src parser.
    if (this.#src && (!this.#captions || !this.#captions.cues)) {
      console.log('Trying backup parser.');
      const srcContents = await fetch(this.#src).then(res => res.text()); // TODO more on this.
      const type = Utilities.getFileType(this.#src);
      if (srcContents) this.#captions = parseVTT(srcContents, type);
    }

    // || Array.from(this.#textTrack.cues).length === 0
    if (!this.#captions || !this.#captions.cues) {
      console.error('Not able to find and render captions.', this.#captions);
      this.#divs.root.innerHTML = '<p class="empty">No captions.</p>';
      return;
    }
    this.#captions.cues = parseSubTextCues(this.#captions.cues);
    if (this.#youtube) this.#captions.cues = this.#youtubeAdjustments(this.#captions.cues);
    this.#addCueSpaces(this.#captions.cues);
    this.#setCuesStatus();
    console.log('Final Captions.', this.#captions); // TODO remove.

    this.#showCaptions();
  }

  #updateCaptionStatus(playhead) {
    if (this.#paused) return;
    this.#playhead = playhead;
    this.#setCuesStatus();
    const activeIndex = this.#captions.cues?.findIndex(cue => cue.status === 'active');

    // Clear other Progress bar.
    const progressbars = this.#divs.root.querySelectorAll('[data-progress]');
    if (progressbars) {
      [...progressbars].forEach(bar => {
        const newBar = bar;
        newBar.value = 0;
      });
    }

    // Update progress bar.
    this.#captions.cues?.forEach((cue, index) => {
      if (cue.type === 'spacer' && cue.status === 'active') {
        const progValue = Math.round(this.#playhead - cue.seconds.start);
        const progress = this.#divs.root.querySelector(`[data-progress="${index}"]`);
        if (progress) progress.value = progValue;
      }
    });

    // Update HTML for sub cues.
    const activeDivs = this.#divs.root.querySelectorAll('.active');
    activeDivs.forEach(item => {
      const { index } = item.dataset;
      const cue = this.#captions.cues[index];
      if (cue.subCues) {
        const textDiv = item.querySelector('.text');
        textDiv.innerHTML = cue.subCues.map(sub => `<span class="${sub.status}">${sub.text}</span>`).join('');
      }
    });

    if (activeIndex !== this.#currentCue) {
      this.#currentCue = activeIndex;
      this.#updateCaption();
      this.#scrollToCue();
    }
  }

  #showCaptions() {
    if (!this.#captions) return;
    const disabled = this.#disable ? this.#disable.split('|') : [];
    this.#divs.root.innerHTML = '';
    let html = '<ol tabindex="0">';
    this.#captions.cues?.forEach((cue, index) => {
      if (cue.timecode) {
        const styleName = cue.status;
        const timecode = `<span class="timecode">${Utilities.prettyTimecode(cue.timecode.start)}</span>`;
        const chapter = cue.chapter ? `<span class="chapter">${cue.chapter}</span>` : '';
        const textJoiner = this.#singleline ? ' ' : '<br />';

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

        html += `<li>
          <button
            type="button"
            tabindex="${index + 1}"
            class="cue ${styleName} ${cue.type || ''}"
            data-index="${index}"
          >${!disabled.includes('timecode') && cue.type !== 'spacer' ? timecode : ''} ${!disabled.includes('chapters') ? chapter : ''} ${!disabled.includes('text') ? text : ''} ${spacerProgress}
          </button></li>`;
      }
    });
    html += '</ol>';
    this.#divs.root.innerHTML = html;
  }

  #updateCaption() {
    const divs = this.#divs.root.querySelectorAll('[data-index]');
    divs.forEach(item => {
      const { index } = item.dataset;
      const cue = this.#captions.cues[index];
      item.classList.remove('upcoming', 'next', 'active', 'previous', 'passed');
      item.classList.add(cue.status);
    });
  }

  #setCuesStatus() {
    if (!('cues' in this.#captions)) return;
    this.#captions.cues = this.#captions.cues.map(cue => {
      if (cue.seconds.end < this.#playhead) {
        cue.active = false;
        cue.status = 'passed';
      }
      if (cue.seconds.start > this.#playhead) {
        cue.active = false;
        cue.status = 'upcoming';
      }
      if (cue.seconds.start < this.#playhead && cue.seconds.end > this.#playhead) {
        cue.active = true;
        cue.status = 'active';
      }
      return cue;
    });

    const passed = this.#captions.cues.filter(cue => cue.status === 'passed');

    // Mark the upcoming cue.
    const upcomingIndex = this.#captions.cues.findIndex(cue => cue.status === 'upcoming');
    if (upcomingIndex > 0) {
      this.#captions.cues[upcomingIndex].status = 'next';
    }

    // Mark the previous cue.
    if (passed && passed.length > 0) {
      this.#captions.cues[passed.length - 1].status = 'previous';
    }

    // Mark sub cues if they exist.
    this.#captions.cues.map(cue => {
      if (cue.subCues) {
        cue.subCues.map(sub => {
          sub.status = sub.seconds < this.#playhead ? 'sub_active' : 'sub_upcoming';
          return sub;
        });
      }
      return cue;
    });
  }

  #scrollToCue() {
    if (!this.#currentCue || this.#currentCue < 0) return;
    if (this.#debounceScrolling) return;
    const elms = this.#divs.root.querySelectorAll('li');
    const elm = elms[this.#currentCue];
    // Commenting out as the feel wasn't quite right.
    // if (this.#checkInView(this.#divs.root, elm)) {
    const elmHeight = elm.offsetHeight;
    const elmOffset = elm.offsetTop;
    this.#divs.root.scrollTop = elmOffset - elmHeight; // Scroll cue to top leaving one.
    // }
  }

  pause() {
    this.#paused = !this.#paused;
  }

  setTheme(userPreference = undefined) {
    const theme = Utilities.getTheme(userPreference || this.#theme || '');
    this.#theme = theme;
    this.#divs.root.dataset.theme = theme;
  }

  #event(name, value, object) {
    this.dispatchEvent(new CustomEvent('all', { detail: { name, value, full: object } }));
    this.dispatchEvent(new CustomEvent(name, { detail: { value, full: object } }));
  }

  async #renderCaptionSrc(src) {
    if (!this.#divs.root.querySelector('#tempVid')) {
      const track = document.createElement('track');
      track.mode = 'active';
      track.default = true;
      track.src = src;
      const video = document.createElement('video');
      video.preload = 'auto';
      video.setAttribute('id', 'tempVid');
      video.appendChild(track);
      this.#divs.root.appendChild(video);
    }
    const videodiv = this.#divs.root.querySelector('#tempVid');
    // We have to wait till the cues are ready (foo async).
    await CaptionsViewer.trackReady(videodiv);
    return videodiv.textTracks[0];
  }

  static trackReady(video) {
    let count = 0;
    return new Promise(resolve => {
      const interval = setInterval(() => {
        count += 1;
        if (count > 1000) {
          clearInterval(interval);
          resolve();
        }
        if (Array.from(video.textTracks[0].cues).length) {
          clearInterval(interval);
          resolve();
        }
      }, 2);
    });
  }

  #addCueSpaces(cues) {
    const distance = this.#spacer; // 10 seconds.
    // When blank is added to array, it messes with next loop.
    let isBlank = false;
    cues.forEach((cue, index) => {
      const next = cues[index + 1];
      if (isBlank) {
        isBlank = false;
        return;
      }
      if (!next) return;
      const diff = next.seconds.start - cue.seconds.end;
      if (diff > distance) {
        const start = cue.seconds.end;
        const end = next.seconds.start;
        const newCue = {
          chapter: '',
          text: [''],
          status: '',
          type: 'spacer',
          timecode: {
            start: Utilities.secondsToTimecode(start),
            end: Utilities.secondsToTimecode(start),
          },
          seconds: {
            start,
            end,
          },
        };
        this.#captions.cues.splice(index + 1, 0, newCue);
        isBlank = true;
      }
    });
  }

  #youtubeAdjustments(cues) {
    // Remove the second cue since it duplicates.
    this.#captions.cues.splice(1, 1);

    // Remove single lines.
    let newCues;
    newCues = cues.map((cue, index) => {
      if (cue.text.length > 0 && index !== 1) {
        cue.text.shift();
      }
      return cue;
    });

    // Remove blank text.
    newCues = cues.filter(cue => cue.text.length !== 0);

    // Remove if the cue is a blank space.
    newCues = cues.filter(cue => cue.text[0] && cue.text[0].length !== 0);

    return newCues;
  }
}
