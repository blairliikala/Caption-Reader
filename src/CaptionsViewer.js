import { parseVTT, parseTextTrack } from './utilities/parsers.js';
import { getSupportedFileType, isElementInViewport } from './utilities/utilities.js';
import { CueParser } from './utilities/cues.js';
import { getTheme, CustomStyles } from './themes/themes.js';
import { cueToHTML, renderAllCaptions, updateCaptionClasses } from './utilities/dom.js';
import { defaultStyles } from './themes/stylesheet.js';

export class CaptionsViewer extends HTMLElement {
  #isInit = false;
  #divs;

  // Params
  #src = ''; // location of a vtt src.
  #elementName;
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
      'enableCSS',
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'playhead') {
      this.#update(newValue);
      return;
    }
    if (name === 'debounce') {
      this.#debounce = newValue;
      return;
    }
    this.#create({ changes: { name, oldValue, newValue } });
  }

  get captions() {
    return this.#captions;
  }

  get debounce() {
    return this.#debounce;
  }

  set debounce(item) {
    if (typeof item !== 'number') {
      this.#event('error', 'debounce must be a number.');
      return;
    }
    if (item) {
      this.setAttribute('debounce', item);
    } else {
      this.removeAttribute('debounce');
    }
  }

  get debounceScrolling() {
    return this.#debounceScrolling;
  }

  set debounceScrolling(item) {
    if (typeof item !== 'boolean') {
      this.#event('error', 'debounceScrolling must be a boolean.');
      return;
    }
    this.#debounceScrolling = item;
  }

  get disable() {
    return this.#disable;
  }

  set disable(item) {
    if (typeof item !== 'string') {
      this.#event('error', 'Disable must be a string.');
      return;
    }
    this.setAttribute('disable', item);
    if (item) {
      this.setAttribute('disable', item);
    } else {
      this.removeAttribute('disabled');
    }
  }

  get enableCSS() {
    return this.#enableCSS;
  }

  set enableCSS(item) {
    if (typeof item !== 'boolean') {
      this.#event('error', 'enableCSS must be a boolean.');
      return;
    }
    this.#enableCSS = item;
  }

  get height() {
    return this.#height;
  }

  set height(item) {
    if (typeof item !== 'string') {
      this.#event('error', 'height must be a string with a unit value.');
      return;
    }
    this.setAttribute('height', item);
  }

  get nudge() {
    return this.#nudge;
  }

  set nudge(item) {
    if (typeof item !== 'number') {
      this.#event('error', 'nudge must be a number');
      return;
    }
    this.#nudge = item;
  }

  get paused() {
    return this.#paused;
  }

  set paused(item) {
    this.passed(item);
  }

  get singleline() {
    return this.#singleline;
  }

  set singleline(item) {
    if (typeof item !== 'boolean') {
      this.#event('error', 'singleline must be a boolean.');
      return;
    }
    this.setAttribute('singleline', item);
  }

  get playhead() {
    return this.#playhead;
  }

  set playhead(item) {
    if (typeof item !== 'number') {
      this.#event('error', 'playhead must be a number.');
      return;
    }
    this.setAttribute('playhead', item);
  }

  get spacer() {
    return this.#spacer;
  }

  set spacer(item) {
    if (typeof item !== 'number') {
      this.#event('error', 'spacer must be a number.');
      return;
    }
    this.#spacer = item;
  }

  get src() {
    return this.#src;
  }

  set src(item) {
    if (typeof item !== 'string') {
      this.#event('error', 'src must be a string.');
      return;
    }
    if (item) {
      this.setAttribute('src', item);
    } else {
      this.removeAttribute('src');
    }
  }

  get textTrack() {
    return this.#textTrack;
  }

  set textTrack(item) {
    this.#textTrack = item;
    this.#create({ changes: { name: 'textTrack' } });
  }

  get theme() {
    return this.#theme;
  }

  set theme(item) {
    this.setTheme(item);
  }

  get youtube() {
    return this.#youtube;
  }

  set youtube(item) {
    if (typeof item !== 'boolean') {
      this.#event('error', 'youtube must be a boolean.');
      return;
    }
    this.#youtube = item;
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
    /* Apply using shadow DOM instead of made-up element trick.
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(html);

    this.#divs = {
      root: this.shadowRoot?.querySelector('#root'),
    };
    */
    this.appendChild(html);

    this.#divs = {
      root: this.querySelector('#root'),
      empty: this.querySelector('captions-viewer-empty'),
    };

    this.#divs.root.addEventListener('click', e => {
      const div = e.composedPath()[0].closest('button');
      if (div && 'localName' in div && div.localName === 'button') {
        const seconds = div.dataset.start;
        this.#event('seek', seconds);
        this.#update(seconds + 0.2);
      }
    });
    this.#setScrollingEvents();
    this.#create();
  }

  //********************** Startup **********************//
  async #create(params) {
    this.#src = this.getAttribute('src') || this.#src;
    this.#elementName = this.getAttribute('player') || this.#elementName;
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
      this.#displayNoCaptions();
      return;
    }

    if (this.#enableCSS === 'false' || this.#enableCSS === false) {
      const stylesheet = this.querySelector('#theme_a');
      stylesheet.innerHTML = '';
    }

    this.setTheme();
    const customStyles = new CustomStyles({ height: this.#height, color: this.#color })
    this.#divs.root?.setAttribute('style', customStyles.toCss);

    if (params?.changes.name === 'src' || params?.changes.name === 'textTrack') {
      this.#captions = await this.#parse(this.#textTrack, this.#src);
      if (!this.#captions || !this.#captions.cues) return;
      this.#event('parsed', 'Caption file has been parsed.', this.#captions);
      if (this.#youtube) this.#captions.cues = this.#youtubeAdjustments(this.#captions.cues);
      this.#setCuesStatus();
      this.#update(this.#playhead + 0.9);
    }

    this.#removeNoCaptions();
    this.#divs.root.innerHTML = renderAllCaptions(this.#captions, this.#disable, this.#singleline);

    if (this.#elementName) {
      this.#connectPlayhead();
    }
  }

  #displayNoCaptions() {
    this.#divs.root?.classList.add('hidden');
    if (!this.#divs.empty) {
      this.#divs.root.innerHTML = '';
      return;
    }
    if (this.#divs.empty?.innerHTML === '') {
      this.#divs.empty.innerHTML = 'No captions.';
      return;
    }

    this.#divs.empty.classList.remove('hidden');
  }  

  async #parse(TEXTTRACK, SRC) {
    let captions;
    let textTrack = TEXTTRACK;

    // Send file through native browser parser.
    if (SRC && getSupportedFileType(SRC) === 'vtt') {
      textTrack = await this.#renderCaptionSrc(SRC);
    }

    // Track in video element. Pushed after load.
    if (textTrack && 'cues' in textTrack) {
      captions = parseTextTrack(textTrack);
    }

    // Both failed, use the fallback src parser, mostly for SRT.
    if (SRC && (!captions || !captions.cues)) {
      const srcText = await fetch(SRC).then(res => res.text());
      const type = getSupportedFileType(SRC);
      if (srcText) captions = parseVTT(srcText, type);
    }

    if (!captions || !captions.cues) {
      this.#displayNoCaptions();
      return null;
    }

    captions.cues = new CueParser(captions.cues)
      .parseSubTextCues()
      .removeDuplicateCues()
      .addCueSpaces(this.#spacer)
      .sortCues().cues;

    this.#textTrack = textTrack;
    return captions;
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

  #removeNoCaptions() {
    this.#divs.empty?.classList.add('hidden');
  }

  #setScrollingEvents() {
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
    }, { passive: true });
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

  #update(playhead) {
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
    this.#event('cuechange', this.#captions.cues[this.#currentCue]);

    // Clear other Progress bar.
    const progressbars = this.#divs.root.querySelectorAll('[data-progress]');
    if (progressbars) {
      [...progressbars].forEach(bar => {
        if (bar.value === 0) return;
        const newBar = bar;
        newBar.value = 0;
      });
    }

    // If the cue is outside the view, scroll immediately.
    if (this.#debounceScrolling) {
      const elms = this.#divs.root.querySelectorAll('[data-index]');
      const elm = elms[this.#currentCue];
      if (elm) {
        if (!isElementInViewport(elm, 'captionselement')) this.#debounceScrolling = false;
      }
    }

    updateCaptionClasses(this.#divs, this.#captions);
    this.#scrollToCue();
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
    const subtitleTrack = await CaptionsViewer.trackReady(videodiv).catch(e => {
      this.#event('error', 'No Tracks found.', e);
    });
    await CaptionsViewer.cuesReady(subtitleTrack).catch(e => {
      this.#event('error', 'No cues found in track.', e);
    });
    return videodiv.textTracks[0];
  }

  static trackReady(video, lang) {
    let count = 0;
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        count += 1;
        if (count > 1000) {
          clearInterval(interval);
          reject(new Error('No tracks found in time.'));
        }
        const textTracks = Array.from(video.textTracks);
        if (textTracks.length > 0) {
          const subtitles = (lang)
            ? textTracks.find(track => track.language === lang)
            : textTracks.find(track => track.kind === 'captions' || track.kind === 'subtitles');
          if (subtitles) {
            clearInterval(interval);
            resolve(subtitles);
          }
        }
      }, 2);
    });
  }

  static cuesReady(track) {
    let count = 0;
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        count += 1;
        if (count > 1000) {
          clearInterval(interval);
          reject(new Error('No cues found in time.'));
        }
        if (track.cues && track.cues.length > 0) {
          clearInterval(interval);
          resolve(track.cues);
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

  async #connectCaptions(player, lang) {
    const track = await CaptionsViewer.trackReady(player, lang).catch(() => undefined);
    if (!track) {
      return new Error('No subtitle track found.', player.textTracks);
    }
    track.mode = 'hidden';
    await CaptionsViewer.cuesReady(track);
    this.textTrack = track;
    track.addEventListener('cuechange', e => {
      this.updateCues(e.target);
    });
    return track;
  }

  #findPlayerElement(playerDiv, elementName) {
    const player_candidate = playerDiv ? playerDiv : document.querySelector(`${elementName}`);

    if (!player_candidate) {
      return;
    }

    let player_search;
    if (player_candidate.tagName !== 'VIDEO' && player_candidate.tagName !== 'AUDIO') {
      player_search = player_candidate.querySelector('video') ?? player_candidate.querySelector('audio');
    } else {
      player_search = player_candidate
    }
    return player_search;
  }

  #connectPlayhead(playerDiv, refresh = 0) {

    const player = this.#findPlayerElement(playerDiv, this.#elementName);

    if (!player) {
      this.#event('error', 'A video or audio player element can not be found for automatic setup.');
      return;
    }

    if (refresh === 0) {
      player.addEventListener('timeupdate', () => {
        this.#playhead = player.currentTime;
        this.#update(this.#playhead);
      });
    }

    let hasPlayed = false;
    player.addEventListener('play', () => {
      hasPlayed = true;
    });
    if (refresh > 0) {
      let pingInterval;
      player.addEventListener('play', () => {
        this.#playhead = player.currentTime;
        pingInterval = setInterval(() => {
          this.#playhead = player.currentTime;
          this.#update(this.#playhead);
        });
      }, refresh);
      player.addEventListener('pause', () => {
        clearInterval(pingInterval);
      });
    }
    player.addEventListener('seeking', () => {
      this.#debounceScrolling = false;
    });
    this.addEventListener('seek', e => {
      if (!hasPlayed) player.play();
      // eslint-disable-next-line no-param-reassign
      player.currentTime = e.detail.value;
    });
  }

  // ********* Public Methods ********* //
  config(CONFIG) {
    if (!CONFIG.player) {
      this.#event('error', 'player is not defined.');
      return;
    }
    const refresh = CONFIG.refresh || undefined;
    const lang = CONFIG.language || undefined;
    const setPlayhead = CONFIG.setPlayhead === undefined || CONFIG.setPlayhead === false;
    const setCaptions = CONFIG.setCaptions === undefined || CONFIG.setCaptions === false;
    const useSRC = (this.#src !== '');
    if (setPlayhead) this.#connectPlayhead(CONFIG.player, refresh);
    if (setCaptions && !useSRC) this.#connectCaptions(CONFIG.player, lang);
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
      html += cueToHTML(cue, index + prevLength, this.#disable, this.#singleline);
    });
    const contianer = this.#divs.root.querySelector('ol');
    if (contianer) contianer.innerHTML += html;

    // No captions yet, need to add the ol.
    if (!contianer) {
      this.#divs.root.innerHTML = `<ol>${html}</ol>`;
    }

    this.#update(this.#playhead);
    return html;
  }

  pause() {
    this.#paused = !this.#paused;
  }

  setTheme(userPreference) {
    const theme = getTheme(userPreference || this.#theme || '');
    this.#theme = theme;
    this.#divs.root.dataset.theme = theme;
    return theme;
  }
}
