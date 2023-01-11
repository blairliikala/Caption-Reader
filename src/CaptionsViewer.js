export class CaptionsViewer extends HTMLElement {
  #isInit = false;
  #divs;

  // Params
  #file = ''; // location of a vtt file.
  #playhead = ''; // current seconds from start.
  #height = '300px';
  #debounce = 0; // In seconds how long to
  #singleline = false;
  #color = '';
  #disable = {};

  // Internal
  #captions = {}; // Array of the vtt cues.
  #currentCue = undefined; // for parser.
  #debounceScrolling = false; // for throttling scrolling.
  #paused = false; // toggle scrolling and highlighting.

  css = `<style>
    #root {
      scroll-behavior: smooth;
      height: ${this.#height};
      overflow-y: scroll;
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
      margin: 0;
      padding: 0.3rem;
      display: flex;
      gap: 1rem;
      list-style: none;
      color: hsla(var(--base), var(--sat)%, 50%, 1);
      transition: color 0.2s ease, font-size .3s ease;
    }
    li:hover {
      cursor: pointer;
      background: hsla(var(--base), 60%, 70%, .1);
    }
    .pending {
      
      color: hsla(var(--base), 100%, 80%, .8);
    }
    .active {
      font-size: 115%;
    }
      .active .timecode, .active .chapter {
        color: hsla(var(--base), 50%, 80%, 1);
      }
      .active .text, .active .chapter {
        color: hsla(var(--base), 0%, 100%, 1);
      }
    .disabled {
      color: hsla(var(--base), 20%, 80%, .9);
      font-size: 110%;
    }
    .passed {
      color: hsla(var(--base), 10%, 80%, .8);
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
      <section id="root"><slot name="cue"></slot></section>
    `;

    const html = template.content.cloneNode(true);
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(html);

    this.#divs = {
      root: this.shadowRoot?.querySelector('#root'),
      /*
      cue: this.shadowRoot?.querySelector('slot[name=cue]'),
      time: this.querySelector('[data-timecode]'),
      text: this.querySelector('[data-text]'),
      */
    };

    this.#divs.root.addEventListener('click', e => {
      // Mozilla has explicitOriginalTarget, but not path.
      const elm = 'explicitOriginalTarget' in e ? e.explicitOriginalTarget : e.path[0];
      const div = elm.closest('li');
      if (div.localName === 'li') {
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
    this.#singleline = (this.getAttribute('singleline') === 'true') || false;
    this.#color    = this.getAttribute('color');
    this.#disable  = this.getAttribute('disable') || null;
    const styles   = this.getAttribute('styles'); // Full replacement of css.

    if (!this.#file) {
      console.error('The file parameter pointing to a VTT or SRT file is required.');
      this.#event('error', 'The file parameter pointing to a VTT or SRT file is required.');
      return;
    }

    if (this.#height !== '400px') {
      this.#divs.root.style.height = this.#height;
    }

    if (this.#color) {
      this.#divs.root?.setAttribute('style', `--base: ${this.#color}`);
    }

    if (styles) {
      const existing = this.shadowRoot?.querySelector('style');
      existing.innerHTML = `<style>${styles}</style>`;
    }    

    const fileContents = await fetch(this.#file).then(response => response.text()); // TODO more on this.

    this.#captions = this.parseVTT(fileContents);
    this.#setCuesStatus();
    console.log(this.#captions); // TODO remove.

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
    let html = '<ol>';
    this.#captions.cues.forEach( (cue, index) => {
      if (cue.timecode) {
        const styleName = cue.status;
        const timecode = `<span class="timecode">${CaptionsViewer.prettyTimecode(cue.timecode.start)}</span>`;
        const chapter = cue.chapter ? `<span class="chapter">${cue.chapter}</span>` : '';
        //const text = `<span class="text">`+cue.text.map(line => `${line}<br />`).join('')+`</span>`;
        const textJoiner = this.#singleline ? " " : "<br />";
        const text = `<span class="text">`+cue.text.join(textJoiner)+`</span>`;
        html += `<li class="${styleName}" data-index="${index}">${!disabled.includes('timecode') ? timecode : ''} ${!disabled.includes('chapters') ? chapter : ''} ${!disabled.includes('text') ? text : ''}</li>`;
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
      item.classList.remove('active', 'pending', 'passed', 'disabled');
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
        cue.status = 'pending';
      }
      if (cue.seconds.start < this.#playhead && cue.seconds.end > this.#playhead) {
        cue.active = true;
        cue.status = 'active';
      }
      return cue;
    })

    const active = this.#captions.cues.filter(cue => cue.status === 'active');

    // no active cue, so mark last one as disabled.
    if (!active || active.length === 0) {
      const passed = this.#captions.cues.filter(cue => cue.status === 'passed');
      if (passed && passed.length > 0) {
        const lastCue = passed[passed.length -1];
        lastCue.status = 'disabled';
        const index = this.#captions.cues.findIndex(cue => cue.text === lastCue.text);
        this.#captions.cues[index] = lastCue;
      }
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


}
