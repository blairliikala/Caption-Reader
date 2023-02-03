/* eslint-disable grouped-accessor-pairs */
/* eslint-disable lines-between-class-members */
import Utilities from './utilities.js';
import {
  parseVTT,
  parseSubTextCues,
  parseTextTrack,
  addCueSpaces,
  sortCues,
  removeDuplicateCues,
} from './parsers.js';
import { defaultStyles } from './defautStylesheet.js';

export class CaptionsViewer extends HTMLElement {
  #isInit = false;
  #divs;

  // Params
  #src = ''; // location of a vtt src.
  #playhead = 0; // current seconds from start.
  #height = '400px'; // Hight of container, applied as inline style.
  #debounce = 4000; // In seconds how long to
  #singleline = false;
  #color = ''; // Base 360 color for text.
  #disable = ''; // What vtt properties to disable, uses |
  #theme = ''; // blank/light or dark.  Dark shows lighter text.
  #youtube = false; // Makes vtt cue adjustments specific to YouTube.
  #enableCSS = true; // Removal of default styles.

  // Internal
  #captions = {}; // Master array of the cues.
  #currentCue = undefined; // for parser.
  #debounceScrolling = false; // for throttling scrolling.
  #paused = false; // toggle scrolling and highlighting.
  #textTrack = {}; // Native textTrack from video element.
  #spacer = 5; // Time in sec between cues where the progres bar cue will be shown.
  #nudge = 0.5; // Time in sec to start the cue early. comp for css transition.
  #isAutoScroll = false;

  css = defaultStyles();

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
    this.#create({ changes: { name, oldValue, newValue } });
  }

  set src(item) {
    if (item) {
      this.setAttribute('src', item);
    } else {
      this.removeAttribute('src');
    }
  }
  set playhead(item) {
    this.setAttribute('playhead', item);
  }
  set debounce(item) {
    if (item) {
      this.setAttribute('debounce', item);
    } else {
      this.removeAttribute('debounce');
    }
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
    if (item) {
      this.setAttribute('disable', item);
    } else {
      this.removeAttribute('disabled');
    }
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
    this.#create({ changes: { name: 'textTrack' } });
  }
  set spacer(item) {
    // TODO needs validation.
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
  set height(item) {
    if (typeof item !== 'string') {
      console.warn('height must be a string with a unit value.', item);
      this.#event('error', 'height must be a string with a unit value.');
      return;
    }
    this.setAttribute('height', item);
  }
  set nudge(item) {
    this.#nudge = item;
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
  get enableCSS() {
    return this.#enableCSS;
  }
  get nudge() {
    return this.#nudge;
  }

  connectedCallback() {
    this.#init();
  }

  disconnectedCallback() {

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
    /* Apply using shadow DOM instead of made-up unknown element trick.
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
        const seconds = div.dataset.start;
        this.#event('seek', seconds);
        this.#updateCaptionStatus(seconds + 0.2);
      }
    });

    this.#iniScrollingEvents();
    this.#create();
  }

  async #create(params) {
    this.#src = this.getAttribute('src') || this.#src;
    this.#playhead = parseInt(this.getAttribute('playhead'), 10) || this.#playhead;
    this.#height = this.getAttribute('height') || this.#height;
    this.#debounce = parseInt(this.getAttribute('debounce'), 10) || this.#debounce;
    this.#singleline = (this.getAttribute('singleline') === 'true' || this.getAttribute('singleline') === true) || false;
    this.#color = this.getAttribute('color') || this.#color;
    this.#disable = this.getAttribute('disable') || '';
    this.#theme = this.getAttribute('theme') || this.#theme;
    this.#youtube = (this.getAttribute('youtube') === 'true' || this.getAttribute('youtube') === true) || this.#youtube;
    this.#enableCSS = this.getAttribute('stylesheet') || this.#enableCSS;

    if (!this.#src && !(this.#textTrack && 'id' in this.#textTrack)) {
      console.debug('No text track');
      return;
    }

    if (this.#enableCSS === 'false' || this.#enableCSS === false) {
      const stylesheet = this.querySelector('#theme_a');
      stylesheet.innerHTML = '';
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

    if (params?.changes.name === 'src' || params?.changes.name === 'textTrack') {
      this.#captions = await this.#parse(this.#textTrack, this.#src);
      if (!this.#captions || !this.#captions.cues) return;
      this.#event('parsed', 'Caption file has been parsed.');
      if (this.#youtube) this.#captions.cues = this.#youtubeAdjustments(this.#captions.cues);
      this.#setCuesStatus();
      this.#updateCaptionStatus(this.#playhead + 0.9);
    }

    this.#divs.root.innerHTML = this.#renderAllCaptions(this.#captions);
  }

  async #parse(TEXTTRACK, SRC) {
    let captions;
    let textTrack = TEXTTRACK;

    // Send file through native browser parser.
    if (SRC && Utilities.getSupportedFileType(SRC) === 'vtt') {
      textTrack = await this.#renderCaptionSrc(SRC);
    }

    // Track in video element. Pushed after load.
    if (textTrack && 'cues' in textTrack) {
      captions = parseTextTrack(textTrack);
    }

    // Both failed, use the fallback src parser, mostly for SRT.
    if (SRC && (!captions || !captions.cues)) {
      const srcContents = await fetch(SRC).then(res => res.text());
      const type = Utilities.getSupportedFileType(SRC);
      if (srcContents) captions = parseVTT(srcContents, type);
    }

    if (!captions || !captions.cues) {
      console.error('Not able to find and render captions.', captions);
      this.#divs.root.innerHTML = '<p class="empty">No captions.</p>';
      return undefined;
    }
    captions.cues = parseSubTextCues(captions.cues);
    captions.cues = removeDuplicateCues(captions.cues);
    captions.cues = addCueSpaces(captions.cues, this.#spacer);
    captions.cues = sortCues(captions.cues);

    this.#textTrack = textTrack;
    return captions;
  }

  #iniScrollingEvents() {
    let isTouch = false;
    let timeout;
    const addScrollStyle = () => {
      this.#divs.root.classList.add('scrolling');
    };
    const removeScrollStyle = () => {
      this.#divs.root.classList.remove('scrolling');
    };

    // Touch Devices
    this.#divs.root.addEventListener('touchstart', () => {
      isTouch = true;
      this.#debounceScrolling = true;
      clearTimeout(timeout);
      addScrollStyle();
    });
    this.#divs.root.addEventListener('touchend', () => {
      isTouch = false;
      timeout = setTimeout(() => {
        isTouch = false;
        this.#debounceScrolling = false;
        removeScrollStyle();
      }, this.#debounce);
    });

    // Browsers
    // Timeout to avoid the initial scroll when box is first sized.
    setTimeout(() => {
      this.#divs.root.addEventListener('scroll', () => {
        if (isTouch) return;
        if (this.#isAutoScroll) {
          // removeScrollStyle();
          return;
        }
        if (this.#debounceScrolling === true) {
          clearTimeout(timeout);
        }
        this.#debounceScrolling = true;
        addScrollStyle();
        timeout = setTimeout(() => {
          this.#debounceScrolling = false;
          removeScrollStyle();
        }, this.#debounce);
      }, false);
    }, 1000);
  }

  #updateCaptionStatus(playhead) {
    if (this.#paused) return;
    this.#playhead = playhead;
    if (!this.#captions || !this.#captions.cues) return;
    this.#setCuesStatus();
    const activeIndex = this.#captions.cues?.findIndex(cue => cue.status === 'active');

    // Update progress bar.
    this.#captions.cues?.forEach((cue, index) => {
      if (cue.type === 'spacer' && cue.status === 'active') {
        const progValue = Math.round(this.#playhead - cue.seconds.start);
        const progress = this.#divs.root.querySelector(`[data-progress="${index}"]`);
        if (progress && progValue) progress.value = progValue;
      }
    });

    // Update HTML for sub cues.
    this.#divs.root.querySelectorAll('.active')?.forEach(item => {
      const { index } = item.dataset;
      const cue = this.#captions.cues[index];
      if (cue.subCues) {
        const textDiv = item.querySelector('.text');
        textDiv.innerHTML = cue.subCues.map(sub => `<span class="${sub.status}">${sub.text}</span>`).join('');
      }
    });

    // Only update if the cue changes to save CPU.
    if (activeIndex === this.#currentCue) {
      return;
    }

    this.#currentCue = activeIndex;

    // Clear other Progress bar.
    const progressbars = this.#divs.root.querySelectorAll('[data-progress]');
    if (progressbars) {
      [...progressbars].forEach(bar => {
        const newBar = bar;
        newBar.value = 0;
      });
    }

    // If the cue is outside the view, scroll immediately.
    if (this.#debounceScrolling) {
      const elms = this.#divs.root.querySelectorAll('[data-index]');
      const elm = elms[this.#currentCue];
      if (elm) {
        if (!CaptionsViewer.isElementInViewport(elm, 'captionselement')) this.#debounceScrolling = false;
      }
    }

    this.#updateCaption();
    this.#scrollToCue();
  }

  static isElementInViewport(el, container) {
    const rect = el.getBoundingClientRect();
    const parent = el.closest(container);
    const parentRect = parent.getBoundingClientRect();
    return (rect.bottom <= parentRect.bottom);
  }

  #renderAllCaptions(captions) {
    if (!captions) return '';
    const disabled = this.#disable ? this.#disable.split('|') : [];
    let html = '<ol>';
    captions.cues?.forEach((cue, index) => {
      html += this.#cueToHTML(cue, index, disabled);
    });
    html += '</ol>';
    return html;
  }

  #cueToHTML(cue, index, disabled) {
    if (!cue.timecode) return '';
    const styleName = cue.status || '';
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

    return `<li class="cueitem">
      <button
        type="button"
        tabindex="0"
        data-start="${cue.seconds.start}"
        class="cue ${styleName} ${cue.type || ''}"
        data-index="${index}"
      >${!disabled.includes('timecode') && cue.type !== 'spacer' ? timecode : ''} ${!disabled.includes('chapters') ? chapter : ''} ${!disabled.includes('text') ? text : ''} ${spacerProgress}
      </button></li>`;
  }

  #updateCaption() {
    const divs = this.#divs.root.querySelectorAll('.cueitem');
    divs.forEach((item, index) => {
      const cue = this.#captions.cues[index];
      item.firstElementChild.classList.remove('upcoming', 'next', 'active', 'previous', 'passed');
      item.firstElementChild.classList.add(cue?.status);
    });
  }

  #setCuesStatus() {
    if (!this.#captions || !('cues' in this.#captions)) return;
    this.#captions.cues = this.#captions.cues.map(cue => {
      if (cue.seconds.end - this.#nudge < this.#playhead) {
        cue.active = false;
        cue.status = 'passed';
      }
      if (cue.seconds.start - this.#nudge > this.#playhead) {
        cue.active = false;
        cue.status = 'upcoming';
      }
      if (cue.seconds.start - this.#nudge < this.#playhead
            && cue.seconds.end - this.#nudge > this.#playhead) {
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
    this.#captions.cues = this.#captions.cues.map(cue => {
      if (cue.subCues) {
        cue.subCues.map(sub => {
          // Disabling becuase a deep clone is a performane hit.
          // eslint-disable-next-line no-param-reassign
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
    if (!elm) return;
    const elmHeight = elm.offsetHeight;
    const elmOffset = elm.offsetTop;
    this.#divs.root.scrollTop = elmOffset - elmHeight; // Scroll cue to top leaving one.
    this.#isAutoScroll = true;
    // About how long a browser smooth-scroll will take:
    setTimeout(() => { this.#isAutoScroll = false; }, 1000);
  }

  pause() {
    this.#paused = !this.#paused;
  }

  setTheme(userPreference = undefined) {
    const theme = Utilities.getTheme(userPreference || this.#theme || '');
    this.#theme = theme;
    this.#divs.root.dataset.theme = theme;
  }

  // textTrack.cues would be the complete cue list plus more.
  async updateCues(textTrack) {
    if (!textTrack) return '';
    // if (!this.#captions || !this.#captions.cues) return '';
    const prevLength = (this.#captions.cues) ? this.#captions.cues.length : 0;
    if (textTrack.cues.length <= prevLength) return '';
    const newCaptions = await this.#parse(textTrack);

    // Update Internals.
    this.#captions.cues = newCaptions.cues;
    this.#setCuesStatus();

    newCaptions.cues.splice(0, prevLength);

    // Update DOM.
    let html = '';
    newCaptions.cues.forEach((cue, index) => {
      html += this.#cueToHTML(cue, index + prevLength, this.#disable);
    });
    const contianer = this.#divs.root.querySelector('ol');
    if (contianer) contianer.innerHTML += html;

    // No captions yet, need to add the ol.
    if (!contianer) {
      this.#divs.root.innerHTML = `<ol>${html}</ol>`;
    }

    this.#updateCaptionStatus(this.#playhead);
    return html;
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

  #youtubeAdjustments(cues) {
    // FYI, Firefox textTracks will remove blank (1 space) text lines differently than others.

    // Remove the second cue since it duplicates.
    this.#captions.cues.splice(1, 1);

    let newCues;

    // Remove single lines.
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
