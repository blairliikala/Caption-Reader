export class CaptionsViewer extends HTMLElement {
  #isInit = false;
  #divs;

  // Params
  #file = ''; // location of a vtt file.
  #playhead = ''; // current seconds from start.
  #height = '300px';
  #debounce = 0; // In seconds how long to
  #singleline = false;
  #color = ''; // Base 360 color for text.
  #disable = {}; // What vtt properties to disable, uses |
  #theme = ''; // blank/light or dark.  Dark shows lighter text.

  // Internal
  #captions = {}; // Array of the vtt cues.
  #currentCue = undefined; // for parser.
  #debounceScrolling = false; // for throttling scrolling.
  #paused = false; // toggle scrolling and highlighting.

  css = `<style>
    #root {
      scroll-behavior: smooth;
      height: 300px;
      overflow-y: scroll;
      overflow-x: hidden;
      scroll-snap-stop: always;
      position: relative;
      padding: .5rem;
      --base: 360;
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
      padding: 0.4rem;
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
      transform: scale(1.2);
      transform-origin: left;
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


    [data-theme="dark"] .cue {
      color: hsla(var(--base), 10%, 80%, .7);
    }
    [data-theme="dark"] .cue:hover, .cue:active, .cue:focus-visible {
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
  </style>`;

  constructor() {
    super();
    if (this.isConnected) {
      this.#init();
    }
  }

  static get observedAttributes() {
    return [
      'file',
      'playhead',
      'height',
      'debounce',
      'singleline',
      'color',
      'disable'
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

  set file(item) {
    this.setAttribute('file', item);
  }
  set playhead(item) {
    this.setAttribute('playhead', item);
  }
  set debounce(item) {
    this.setAttribute('debounce', item);
  }
  set singleline(item) {
    this.setAttribute('singleline', (item === true));
  }
  set disable(item) {
    this.setAttribute('disable', item);
  }
  set debounceScrolling(item) {
    if (typeof item != "boolean") {
      console.warn('debounceScrolling must be a boolean.');
      return;
    }
    this.#debounceScrolling = item;
  }

  get file() {
    return this.#file;
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
      <section id="root" data-theme="" ><slot name="cue"></slot></section>
    `;

    const html = template.content.cloneNode(true);
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(html);

    this.#divs = {
      root: this.shadowRoot?.querySelector('#root'),
    };

    this.#divs.root.addEventListener('click', e => {
      // Mozilla has explicitOriginalTarget, but not path.
      const elm = 'explicitOriginalTarget' in e ? e.explicitOriginalTarget : e.path[0];
      const div = elm.closest('button');
      if ('localName' in div && div.localName === 'button') {
        const index = div.dataset.index;
        const seconds = this.#captions.cues[index].seconds.start;
        this.#event('seek', seconds);
        this.#updateCaptionStatus(seconds + .2);
      }
    })

    this.#divs.root.addEventListener('scroll', () => {
      this.#debounceScrolling = true;
      setTimeout(() => this.#debounceScrolling = false, this.#debounce);
    });

    this.#create();
  }

  async #create() {

    this.#file     = this.getAttribute('file') || '';
    this.#playhead = this.getAttribute('playhead') || 0;
    this.#height   = this.getAttribute('height') || '400px';
    this.#debounce = parseInt(this.getAttribute('debounce')) || 5000;
    this.#singleline = (this.getAttribute('singleline') === true) || false;
    this.#color    = this.getAttribute('color');
    this.#disable  = this.getAttribute('disable') || null;
    this.#theme    = this.getAttribute('theme') || '';
    const styles   = this.getAttribute('styles'); // Full replacement of css.

    if (!this.#file) {
      console.error('The file parameter pointing to a VTT or SRT file is required.');
      this.#event('error', 'The file parameter pointing to a VTT or SRT file is required.');
      return;
    }

    this.setTheme();

    if (this.#height !== '400px') {
      this.#divs.root.style.height = this.#height;
    }

    if (this.#color) {
      this.#divs.root?.setAttribute('style', `--base: ${this.#color}`);
    }

    if (styles) {
      const existing = this.shadowRoot?.querySelector('style');
      existing.innerHTML += `${styles}`;
    }

    const fileContents = await fetch(this.#file).then(response => response.text()); // TODO more on this.

    this.#captions = this.parseVTT(fileContents);
    this.#addCueSpaces(this.#captions.cues);
    this.#setCuesStatus();
    //console.log(this.#captions); // TODO remove.

    if (!this.querySelector('#cue')) {
      this.#showCaptions();
    } else {
      this.#showCaptions_slot();
    }
  }

  #updateCaptionStatus(playhead) {
    if (this.#paused) return;
    this.#playhead = playhead;
    this.#setCuesStatus();
    const index = this.#captions.cues?.findIndex(cue => cue.status === 'active');
    const activeCues = this.#captions.cues?.filter(cue => cue.status === 'active');

    // Clear other Progress bar.
    const progressbars = this.#divs.root.querySelectorAll('[data-progress]');
    if (progressbars) {
      [...progressbars].map(bar => bar.value = 0);
    }

    // Update progress bar.
    this.#captions.cues.forEach((cue,index) => {
      if (cue.type === 'spacer' && cue.status === 'active') {
        let progValue = Math.round(this.#playhead - cue.seconds.start);
        //progValue = progValue > 0 ? progValue : 0; // Keep postive number or 0
        const progress = this.#divs.root.querySelector(`[data-progress="${index}"]`);
        if (progress) progress.value = progValue;
      }
    })

    if (index !== this.#currentCue) {
      this.#currentCue = index;
      this.#updateCaption();
      this.#scrollToCue();
    }
  }

  #showCaptions() {
    if (!this.#captions) return;
    const disabled = this.#disable ? this.#disable.split('|') : [];
    this.#divs.root.innerHTML = '';
    let html = '<ol tabindex="0">';
    this.#captions.cues.forEach( (cue, index) => {
      if (cue.timecode) {
        const styleName = cue.status;
        const timecode = `<span class="timecode">${CaptionsViewer.prettyTimecode(cue.timecode.start)}</span>`;
        const chapter = cue.chapter ? `<span class="chapter">${cue.chapter}</span>` : '';
        //const text = `<span class="text">`+cue.text.map(line => `${line}<br />`).join('')+`</span>`;
        const textJoiner = this.#singleline ? " " : "<br />";

        let spacerProgress = '';
        if (cue.type === 'spacer') {
          let progMax = Math.round(cue.seconds.end - cue.seconds.start);
          spacerProgress = `<progress max="${progMax}" value="0" data-progress="${index}"></progress>`;
        }

        const text = `<span class="text">`+cue.text.join(textJoiner)+`</span>`;
        html += `<li><button type="button" tabindex="${index + 1}" class="cue ${styleName} ${cue.type || ''}" data-index="${index}">${!disabled.includes('timecode') && cue.type !== 'spacer' ? timecode : ''} ${!disabled.includes('chapters') ? chapter : ''} ${!disabled.includes('text') ? text : ''} ${spacerProgress}</button></li>`;
      }
    })
    html += '</ol>';
    this.#divs.root.innerHTML = html;
  }

  #showCaptions_slot() {
    //this.#divs.cue.innerHTML = '';
    const template = this.querySelector('#cue');

    this.#captions.cues.forEach( (cue, index) => {
      if (!cue.timecode) return;

      const timecode = CaptionsViewer.prettyTimecode(cue.timecode.start);
      const chapter = cue.chapter ? cue.chapter : '';
      const text = cue.text

      //const container = template?.cloneNode(true);
      const container = template.content.cloneNode(true);
      const div = container.firstElementChild;

      div.setAttribute('data-index', index);

      const divTime = div.querySelector('[data-timecode]');
      if (divTime) divTime.innerHTML = timecode;

      const divText = div.querySelector('[data-text]');
      if (divText) divText.innerHTML = text;

      const divChapter = div.querySelector('[data-chapter]');
      if (divChapter) divChapter.innerHTML = chapter;

      this.#divs.stuff.appendChild(div);

    });
  }

  #updateCaption() {
    const divs = this.#divs.root.querySelectorAll('[data-index]');
    //const divs = this.querySelectorAll('[data-index]'); // Slot.
    divs.forEach( (item) => {
      const index = item.dataset.index;
      const cue = this.#captions.cues[index];
      item.classList.remove('upcoming', 'next', 'active', 'previous', 'passed');
      item.classList.add(cue.status);
    });
  }


  #setCuesStatus() {
    if (!this.#captions) return;
    this.#captions.cues = this.#captions.cues.map(cue => {
      if (cue.seconds.end < this.#playhead) {
        cue.status = 'passed';
      }
      if (cue.seconds.start > this.#playhead) {
        cue.status = 'upcoming';
      }
      if (cue.seconds.start < this.#playhead && cue.seconds.end > this.#playhead) {
        cue.active = true;
        cue.status = 'active';
      }
      return cue;
    })

    //const active = this.#captions.cues.filter(cue => cue.status === 'active');
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

  }

  #scrollToCue() {
    if (this.#currentCue < 0) return;
    if (this.#debounceScrolling) return;
    const elms = this.#divs.root.querySelectorAll('li');
    const elm = elms[this.#currentCue];
    // Commenting out as the feel wasn't quite right.
    //if (this.checkInView(this.#divs.root, elm)) {
      const elmHeight = elm.offsetHeight;
      const elmOffset = elm.offsetTop;
      this.#divs.root.scrollTop = elmOffset - elmHeight; // Scroll cue to top leaving one.
    //}
  }

  checkInView(container, element, partial) {

    const cTop = container.scrollTop;
    const cBottom = cTop + container.clientHeight;

    const eTop = element.offsetTop;
    const eBottom = eTop + element.clientHeight;

    const isTotal = (eTop >= cTop && eBottom <= cBottom);
    const isPartial = partial && (
      (eTop < cTop && eBottom > cTop) ||
      (eBottom > cBottom && eTop < cBottom)
    );
    return  (isTotal || isPartial || false);
  }

  pause() {
    this.#paused = !this.#paused;
  }

  #event(name, value, object) {
    this.dispatchEvent(new CustomEvent('all', {detail: {"name": name, "value": value, "full": object}}));
    this.dispatchEvent(new CustomEvent(name, {detail: {"value": value, "full": object}}));
  }


  // HH:MM:SS, or HH:MM:SS.FFF
  static timecodeToSeconds(timecode) {
    const parts = timecode.split(":");
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);
    // TODO account for srt using , instead of .
    return (hours * 3600) + (minutes * 60) + seconds;
  }


  // This is a simple parser, used for now to keep the filesize down.
  parseVTT(file, type) {
    const lines = file.split('\n');

    if (!type) {
      if (lines[0].startsWith('WEBVTT')) {
        type = 'vtt';
      }
      if (!lines[0].isNaN) {
        type = 'srt';
      }
    }

    const caption = {
      kind: type,
      lang: undefined,
      header: undefined,
      styles: undefined,
      cues: []
    }
    let currentCue = {
      text: []
    };
    let count = 0;
    let cueBlock = false;
    let cueBlockData = '';
    let cueBlockName = '';
    for (const line of lines) {
      if (line.startsWith('WEBVTT')) {
        let split = line.split(" - ");
        if (split.length > 0) {
          caption.header = split[1];
        }
      }
      else if (line.startsWith('Kind')) {
        let split = line.split(":");
        caption.kind = split[1]?.trim();
      }
      else if (line.startsWith('Language')) {
        let split = line.split(":");
        caption.lang = split[1]?.trim();
      }
      else if (line.startsWith('STYLE')) {
        cueBlock = true;
        cueBlockName = 'styles';
      }
      else if (line.startsWith('NOTE')) {
        // Skip notes.
      }

      else if (cueBlock === true && line !== '') {
        cueBlockData += line;
      }
      else if (cueBlock === true && line === '') {
        caption.styles = cueBlockData;
        cueBlock = false;
        cueBlockData = '';
      }

      else if (line !== "" && CaptionsViewer.isTimecode(lines[count+1]) ) {
        currentCue.chapter = line;
      }
      else if (CaptionsViewer.isTimecode(line)) {
        const times = line.split('-->');
        currentCue.timecode = {
          start: times[0].trim(),
          end: times[1].trim()
        }
        currentCue.seconds = {
          start: CaptionsViewer.timecodeToSeconds(times[0]),
          end: CaptionsViewer.timecodeToSeconds(times[1]),
        }
        currentCue.length =  times[0].trim() + times[1].trim();
        // Check for position after the timecode.
        const spaces = line.split(" ");
        if (spaces.length > 2) {
          currentCue.styles = spaces.splice(3).join(" ");
        }
        //currentCue.text.push( (currentCue.text || '') + lines[count + 1] + '\n' );
        //currentCue.text.push(lines[count + 1]);
      }
      else if (line !== '') {
        currentCue.text.push(line);
      }

      if (line === '' && currentCue.timecode?.start !== undefined) {
        if (cueBlock) {
          cueBlock = false;
          cueBlockName = '';
        }
        currentCue.active = false;
        caption.cues.push(currentCue);
        currentCue = {
          text: []
        };
      }

      count++;

    }
    return caption;
  }

  // Credit: Chat GPT
  static isValidJSON(input) {
    return /^[\],:{}\s]*$/.test(input.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''));
  }

  static isTimecode(input) {
    const regex = /^[0-9][0-9]/;
    return regex.test(input);
  }

  static prettyTimecode(timecode) {
    const split = timecode.split(":");
    if (split.length === 0) return;

    if (split.length-1 === 2 ) {
      if (split[0] === "00") {
        split.splice(0, 1);
      }
    }

    // Round miliseconds, and handle srt/vtt differences.
    let seconds = split[split.length-1];
    seconds = seconds.replace(',','.');
    seconds = Math.round(seconds);
    if (seconds < 10) {
      seconds = `0${seconds}`;
    }
    split[split.length-1] = seconds;
    return split.join(":");
  }

  static secondsToTimecode(seconds) {
    if (seconds === undefined || seconds === null) return;
    if (seconds < 0) return '00:00:00';
    return new Date(seconds * 1000).toISOString().substring(11, 11+8);
  }

  static getTheme(userPreference) {
      if (userPreference === 'light') {
        return 'light';
      }
      if (userPreference === 'dark') {
        return 'dark';
      }
      // system
      if (matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
      return 'dark';
  }

  setTheme(userPreference) {
    const theme = CaptionsViewer.getTheme(userPreference || '');
    this.#theme = theme;
    this.#divs.root.dataset.theme = theme;
  }

  #addCueSpaces(cues) {
    const distance = 5; // 10 seconds.
    // When blank is added to array, it messes with next loop.
    let isBlank = false;
    cues.forEach((cue, index, array) => {
      const next = cues[index+1];
      if (isBlank) {
        isBlank = false
        return;
      }
      if (!next) return;
      const diff = next.seconds.start - cue.seconds.end;
      if (diff > distance) {
        const start = cue.seconds.end;
        const end   = next.seconds.start;
        const newCue = {
          chapter: '',
          text: ['- - -'],
          status: '',
          type: 'spacer',
          timecode: {
            start: CaptionsViewer.secondsToTimecode(start),
            end: CaptionsViewer.secondsToTimecode(start)
          },
          seconds: {
            start: start,
            end: end
          }            
        }
        this.#captions.cues.splice(index + 1, 0, newCue);
        isBlank = true;
      }
    })

  }

}
