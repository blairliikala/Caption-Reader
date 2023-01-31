// src/utilities.js
var Utilities = class {
  // HH:MM:SS, or HH:MM:SS.FFF
  static timecodeToSeconds(timecode = "") {
    const regex = /^[0-9][0-9]/;
    if (!regex.test(timecode) || typeof timecode !== "string") {
      return void 0;
    }
    const parts = timecode.split(":");
    if (!parts || parts.length === 1)
      return timecode;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    let mili = timecode.split(".");
    if (mili.length === 1) {
      mili = timecode.split(",");
    }
    return hours * 3600 + minutes * 60 + seconds + mili[1] / 1e3;
  }
  // Credit: Chat GPT
  static isValidJSON(input) {
    return /^[\],:{}\s]*$/.test(input.replace(/\\["\\/bfnrtu]/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""));
  }
  static isTimecode(input) {
    const regex = /^[0-9][0-9]/;
    return regex.test(input);
  }
  static prettyTimecode(timecode) {
    const regex = /^[0-9][0-9]/;
    if (!regex.test(timecode) || typeof timecode !== "string") {
      return void 0;
    }
    const split = timecode.split(":");
    if (split.length === 0)
      return [];
    if (split.length - 1 === 2) {
      if (split[0] === "00") {
        split.splice(0, 1);
      }
    }
    let seconds = split[split.length - 1];
    seconds = seconds.replace(",", ".");
    seconds = Math.round(seconds);
    if (seconds < 10) {
      seconds = `0${seconds}`;
    }
    split[split.length - 1] = seconds;
    return split.join(":");
  }
  static secondsToTimecode(seconds = 0) {
    if (typeof seconds !== "number")
      return "";
    if (seconds < 0)
      return "00:00:00";
    return new Date(seconds * 1e3).toISOString().substring(11, 11 + 8);
  }
  static getTheme(userPreference) {
    if (userPreference === "light") {
      return "light";
    }
    if (userPreference === "dark") {
      return "dark";
    }
    if (matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  }
  static getSupportedFileType(file) {
    const split = file.split(".");
    const extension = split[split.length - 1];
    const supported = ["vtt", "srt"];
    return supported.find((ext) => ext === extension);
  }
  // Remove: my text as<00:02:56.080><c> ids</c><00:02:56.640><c> or</c>
  /*
  static removeExtraTimecode(cues) {
    if (!cues) return cues;
    return cues.map(cue => {
      cue.text.forEach((line, index) => {
        cue.text[index] = line.replace(/<.*?>/g, '');
      });
      return cue;
    });
  }
  */
};

// src/parsers.js
function parseSubTextCue(text, startSec) {
  const timecodeRegex = /<(\d\d:\d\d:\d\d\.\d\d\d)>/;
  const timecodeText = text.split(timecodeRegex);
  const result = [];
  for (let i = 1; i < timecodeText.length; i += 1) {
    if (i === 1) {
      result.push({
        seconds: startSec,
        text: timecodeText[0],
        status: void 0
      });
    }
    result.push({
      seconds: Utilities.timecodeToSeconds(timecodeText[i]),
      text: timecodeText[i + 1],
      status: void 0
    });
    i += 1;
  }
  return result;
}
function parseTextTrack(textTrack) {
  if (!textTrack.cues) {
    return void 0;
  }
  const cues = Object.entries(textTrack.cues).map((cuesArray) => {
    const cue = cuesArray[1];
    return {
      chapter: cue.id,
      status: "",
      text: cue.text.split("\n").map((split) => split.replace(/^\s+/g, "")),
      // remove starting whitespace
      subCues: void 0,
      seconds: {
        start: cue.startTime,
        end: cue.endTime
      },
      timecode: {
        start: Utilities.secondsToTimecode(cue.startTime),
        end: Utilities.secondsToTimecode(cue.endTime)
      }
    };
  });
  const track = {
    kind: textTrack.kind,
    lang: textTrack.language,
    label: textTrack.label,
    header: textTrack.id,
    styles: void 0,
    cues
  };
  return track;
}
function parseSubTextCues(cues) {
  return cues.map((cue) => {
    const texts = cue.text[1] || "";
    cue.subCues = void 0;
    if (texts.includes("<")) {
      cue.subCues = parseSubTextCue(texts, cue.seconds.start);
    }
    return cue;
  });
}
function addCueSpaces(cues, distance) {
  if (!cues || cues.length === 0)
    return void 0;
  let isBlank = false;
  const first = cues[0];
  if (first.seconds.start > distance) {
    const newCue = {
      chapter: "",
      text: [],
      type: "spacer",
      timecode: {
        start: Utilities.secondsToTimecode(0),
        end: Utilities.secondsToTimecode(first.seconds.start)
      },
      seconds: {
        start: 0,
        end: first.seconds.start
      }
    };
    cues.unshift(newCue);
  }
  cues.forEach((cue, index) => {
    const next = cues[index + 1];
    if (isBlank) {
      isBlank = false;
      return void 0;
    }
    if (!next)
      return void 0;
    const diff = next.seconds.start - cue.seconds.end;
    if (diff > distance) {
      const start = cue.seconds.end;
      const end = next.seconds.start;
      const newCue = {
        chapter: "",
        text: [],
        type: "spacer",
        timecode: {
          start: Utilities.secondsToTimecode(start),
          end: Utilities.secondsToTimecode(start)
        },
        seconds: {
          start,
          end
        }
      };
      cues.splice(index + 1, 0, newCue);
      isBlank = true;
    }
    return [];
  });
  return cues;
}
function sortCues(cues) {
  if (!cues)
    return cues;
  return cues.sort((a, b) => {
    if (a.seconds.start < b.seconds.start) {
      return -1;
    }
    if (a.seconds.start > b.seconds.start) {
      return 1;
    }
    return 0;
  });
}
function parseVTT(contents, type) {
  const lines = contents.split("\n");
  const caption = {
    kind: type || lines[0].startsWith("WEBVTT"),
    lang: void 0,
    header: void 0,
    styles: void 0,
    cues: []
  };
  let currentCue = {
    text: []
  };
  let count = 0;
  let cueBlock = false;
  let cueBlockData = "";
  let cueBlockName = "";
  for (const line of lines) {
    if (line.startsWith("WEBVTT")) {
      const split = line.split(" - ");
      if (split.length > 0) {
        const index = 1;
        caption.header = split[index];
      }
    } else if (line.startsWith("Kind")) {
      const split = line.split(":");
      caption.kind = split[1]?.trim();
    } else if (line.startsWith("Language")) {
      const split = line.split(":");
      caption.lang = split[1]?.trim();
    } else if (line.startsWith("STYLE")) {
      cueBlock = true;
      cueBlockName = "styles";
    } else if (line.startsWith("NOTE")) {
    } else if (cueBlock === true && line !== "") {
      cueBlockData += line;
    } else if (cueBlock === true && line === "") {
      caption.styles = cueBlockData;
      cueBlock = false;
      cueBlockData = "";
    } else if (line !== "" && Utilities.isTimecode(lines[count + 1])) {
      currentCue.chapter = line;
    } else if (Utilities.isTimecode(line)) {
      const times = line.split("-->");
      const endSplit = times[1] ? times[1]?.split(" ") : void 0;
      const end = endSplit ? endSplit[1]?.trim() : "";
      currentCue.timecode = {
        start: times[0].trim(),
        end
      };
      currentCue.seconds = {
        start: Utilities.timecodeToSeconds(times[0]),
        end: Utilities.timecodeToSeconds(end)
      };
      currentCue.length = currentCue.seconds.start + currentCue.seconds.end;
      const spaces = line.split(" ");
      if (spaces.length > 2) {
        currentCue.styles = spaces.splice(3).join(" ");
      }
    } else if (line !== "") {
      if (type === "srt") {
        currentCue.text.push(line.replace(/(<([^>]+)>)/gi, ""));
      } else {
        currentCue.text.push(line);
      }
    }
    if (line === "" && currentCue.timecode?.start !== void 0) {
      if (cueBlock) {
        cueBlock = false;
        cueBlockName = "";
      }
      currentCue.active = false;
      caption.cues.push(currentCue);
      currentCue = {
        text: []
      };
    }
    count += 1;
  }
  return caption;
}

// src/defautStylesheet.js
function defaultStyles() {
  return `<style id="theme_a">
  #root {
    display: block;
    scroll-behavior: smooth;
    height: 300px;
    overflow-y: scroll;
    overflow-x: hidden;
    scroll-snap-stop: always;
    position: relative;
    padding: .5rem;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    --base: 360;

    --gray-10-sat: 10%;
    --gray-10-light: 10%;
    --gray-10-opacity: 0.1;
    --gray-20-sat: 10%;
    --gray-20-light: 10%;
    --gray-20-opacity: 0.2;
    --gray-50-opacity: 0.5;
    --gray-70-opacity: 0.7;
    --inactive: hsla(var(--base), 20%, 40%, 0.9);
    --inactive-90: hsla(var(--base), 20%, 40%, 0.5);
    --active-primary: hsla(var(--base), 0%, 30%, 1);
    --active-secondary: hsla(var(--base), 40%, 70%, 1);
    --highlight: hsla(var(--base), 50%, 50%, 0.9);
  }
  [data-theme="dark"]#root {
    --gray-10-sat: 10%;
    --gray-10-light: 10%;
    --gray-10-opacity: 0.1;
    --gray-20-sat: 10%;
    --gray-20-light: 10%;
    --gray-20-opacity: 0.2;
    --gray-70-opacity: 0.7;
    --inactive: hsla(var(--base), 10%, 80%, 0.7);
    --inactive-90: hsla(var(--base), 10%, 80%, 0.5);
    --active-primary: hsla(var(--base), 0%, 100%, 1);
    --active-secondary: hsla(var(--base), 20%, 80%, 1);
    --highlight: hsla(var(--base), 50%, 60%, 0.9);
  }
  #root * {
    box-sizing: border-box;
  }
  .empty {
    color: hsla(var(--base), var(--gray-10-sat), var(--gray-10-light), var(--gray-70-opacity));
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
    padding: 0.4rem 10% 0.4rem .4rem;
    display: flex;
    gap: 1rem;
    transform: scale(1);
    transform-origin: left;
    color: var(--inactive);
    transition: all .3s ease;
    background: none;
    width: 100%;
    text-align: start;
    border-left: 2px solid hsla(var(--base), 60%, 70%, 0.1);
    border-radius: 0;
    color: transparent;
    text-shadow: 0 0 2px var(--inactive-90);
    font-weight: bold;
  }
  .cue:focus {
    background: none;
    border: none;
    outline: none;
  }
  .cue:hover, .cue:active {
    cursor: pointer;
    color: var(--active-secondary);
    background: none;
    border-left-color: var(--highlight);
    outline: 1px solid var(--highlight);
    text-shadow: none;
  }
  @supports (-webkit-touch-callout: none) {
    .cue:hover {
      outline: none;
    }
  }
  .cue:focus-visible, .cue:focus {
    cursor: pointer;
    border-left-color: var(--highlight);
    outline: 1px solid var(--highlight);
    color: var(--secondary);
    background: none;
    text-shadow: none;
  }
  .cue:hover {
    background :none;
  }
  .upcoming {
    transform: scale(1);
    transform-origin: left;
  }
  .next {
    transform: scale(1);
    transform-origin: left;
    text-shadow: none;
    color: var(--inactive);
  }
  .active {
    transform: scale(1.05);
    transform-origin: left;
    border-color: var(--highlight);
    text-shadow: none;
    font-weight: bold;
    color: var(--active-secondary);
  }
  .active .timecode {
    color: var(--active-secondary);
  }
  .active .chapter {
    color: var(--active-secondary);
  }
  .active .text  {
    color: var(--active-primary);
  }
  .active .sub_active {
    text-decoration: underline;
  }
  .previous {
    color: var(--inactive);
  }
  .passed  {
    transform: scale(1);
    transform-origin: left;
  }
  .scrolling .cue {
    text-shadow: none;
    color: var(--inactive);
  }
  @media (prefers-reduced-motion) {
    .active {
      transform: scale(1);
    }
  }
  progress {
    appearance: none;
    background: hsla(var(--base), var(--gray-10-sat), var(--gray-10-light), var(--gray-10-opacity));
    border: none;
    border-radius: 2px;
    height: 8px;
    align-self: center;
  }
  progress[value]::-webkit-progress-bar {
    background: hsla(var(--base), var(--gray-20-sat), var(--gray-20-light), var(--gray-20-opacity));
    box-shadow: none;
  }
  progress[value]::-moz-progress-bar {
    background: hsla(var(--base), var(--gray-20-sat), var(--gray-20-light), var(--gray-50-opacity));
    box-shadow: none;
  }
  progress[value]::-webkit-progress-value {
    background: hsla(var(--base), var(--gray-20-sat), var(--gray-20-light), var(--gray-50-opacity));
    box-shadow: none;
  }
  </style>`;
}

// src/CaptionsViewer.js
var CaptionsViewer = class extends HTMLElement {
  #isInit = false;
  #divs;
  // Params
  #src = "";
  // location of a vtt src.
  #playhead = 0;
  // current seconds from start.
  #height = "400px";
  // Hight of container, applied as inline style.
  #debounce = 4e3;
  // In seconds how long to
  #singleline = false;
  #color = "";
  // Base 360 color for text.
  #disable = "";
  // What vtt properties to disable, uses |
  #theme = "";
  // blank/light or dark.  Dark shows lighter text.
  #youtube = false;
  // Makes vtt cue adjustments specific to YouTube.
  #enableCSS = true;
  // Removal of default styles.
  // Internal
  #captions = {};
  // Master array of the cues.
  #currentCue = void 0;
  // for parser.
  #debounceScrolling = false;
  // for throttling scrolling.
  #paused = false;
  // toggle scrolling and highlighting.
  #textTrack = {};
  // Native textTrack from video element.
  #spacer = 5;
  // Time in sec between cues where the progres bar cue will be shown.
  #nudge = 0.5;
  // Time in sec to start the cue early. comp for css transition.
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
      "src",
      "playhead",
      "height",
      "debounce",
      "singleline",
      "color",
      "disable",
      "spacer"
    ];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "playhead") {
      this.#updateCaptionStatus(newValue);
      return;
    }
    if (name === "debounce") {
      this.#debounce = newValue;
      return;
    }
    this.#create({ changes: { name, oldValue, newValue } });
  }
  set src(item) {
    if (item) {
      this.setAttribute("src", item);
    } else {
      this.removeAttribute("src");
    }
  }
  set playhead(item) {
    this.setAttribute("playhead", item);
  }
  set debounce(item) {
    if (item) {
      this.setAttribute("debounce", item);
    } else {
      this.removeAttribute("debounce");
    }
  }
  set singleline(item) {
    if (typeof item !== "boolean") {
      console.warn("singleline must be a boolean.", item);
      this.#event("error", "singleline must be a boolean.");
      return;
    }
    this.setAttribute("singleline", item);
  }
  set disable(item) {
    this.setAttribute("disable", item);
    if (item) {
      this.setAttribute("disable", item);
    } else {
      this.removeAttribute("disabled");
    }
  }
  set debounceScrolling(item) {
    if (typeof item !== "boolean") {
      console.warn("debounceScrolling must be a boolean.", item);
      this.#event("error", "debounceScrolling must be a boolean.");
      return;
    }
    this.#debounceScrolling = item;
  }
  set textTrack(item) {
    this.#textTrack = item;
    this.#create({ changes: { name: "textTrack" } });
  }
  set spacer(item) {
    this.#spacer = item;
  }
  set youtube(item) {
    if (typeof item !== "boolean") {
      console.warn("youtube must be a boolean.", item);
      this.#event("error", "youtube must be a boolean.");
      return;
    }
    this.#youtube = item;
  }
  set height(item) {
    if (typeof item !== "string") {
      console.warn("height must be a string with a unit value.", item);
      this.#event("error", "height must be a string with a unit value.");
      return;
    }
    this.setAttribute("height", item);
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
    const template = document.createElement("template");
    template.innerHTML = `
      ${this.css}
      <captionselement id="root" data-theme=""></captionselement>
    `;
    const html = template.content.cloneNode(true);
    this.appendChild(html);
    this.#divs = {
      root: this.querySelector("#root")
    };
    this.#divs.root.addEventListener("click", (e) => {
      const div = e.composedPath()[0].closest("button");
      if (div && "localName" in div && div.localName === "button") {
        const seconds = div.dataset.start;
        this.#event("seek", seconds);
        this.#updateCaptionStatus(seconds + 0.2);
      }
    });
    this.#iniScrollingEvents();
    this.#create();
  }
  async #create(params) {
    this.#src = this.getAttribute("src") || this.#src;
    this.#playhead = parseInt(this.getAttribute("playhead"), 10) || this.#playhead;
    this.#height = this.getAttribute("height") || this.#height;
    this.#debounce = parseInt(this.getAttribute("debounce"), 10) || this.#debounce;
    this.#singleline = this.getAttribute("singleline") === "true" || this.getAttribute("singleline") === true || false;
    this.#color = this.getAttribute("color") || this.#color;
    this.#disable = this.getAttribute("disable") || "";
    this.#theme = this.getAttribute("theme") || this.#theme;
    this.#youtube = this.getAttribute("youtube") === "true" || this.getAttribute("youtube") === true || this.#youtube;
    this.#enableCSS = this.getAttribute("stylesheet") || this.#enableCSS;
    if (!this.#src && !(this.#textTrack && "id" in this.#textTrack)) {
      console.debug("No text track");
      return;
    }
    if (this.#enableCSS === "false" || this.#enableCSS === false) {
      const stylesheet = this.querySelector("#theme_a");
      stylesheet.innerHTML = "";
    }
    this.setTheme();
    const customStyles = [];
    if (this.#height !== "400px") {
      customStyles.push(`height: ${this.#height}`);
    }
    if (this.#color) {
      customStyles.push(`--base: ${this.#color}`);
    }
    this.#divs.root?.setAttribute("style", customStyles.join("; "));
    if (params?.changes.name === "src" || params?.changes.name === "textTrack") {
      this.#captions = await this.#parse(this.#textTrack, this.#src);
      if (!this.#captions || !this.#captions.cues)
        return;
      this.#event("parsed", "Caption file has been parsed.");
      if (this.#youtube)
        this.#captions.cues = this.#youtubeAdjustments(this.#captions.cues);
      this.#setCuesStatus();
      this.#updateCaptionStatus(this.#playhead + 0.9);
    }
    this.#divs.root.innerHTML = this.#renderAllCaptions(this.#captions);
  }
  async #parse(TEXTTRACK, SRC) {
    let captions;
    let textTrack = TEXTTRACK;
    if (SRC && Utilities.getSupportedFileType(SRC) === "vtt") {
      textTrack = await this.#renderCaptionSrc(SRC);
    }
    if (textTrack && "cues" in textTrack) {
      captions = parseTextTrack(textTrack);
    }
    if (SRC && (!captions || !captions.cues)) {
      const srcContents = await fetch(SRC).then((res) => res.text());
      const type = Utilities.getSupportedFileType(SRC);
      if (srcContents)
        captions = parseVTT(srcContents, type);
    }
    if (!captions || !captions.cues) {
      console.error("Not able to find and render captions.", captions);
      this.#divs.root.innerHTML = '<p class="empty">No captions.</p>';
      return void 0;
    }
    captions.cues = parseSubTextCues(captions.cues);
    captions.cues = addCueSpaces(captions.cues, this.#spacer);
    captions.cues = sortCues(captions.cues);
    this.#textTrack = textTrack;
    return captions;
  }
  #iniScrollingEvents() {
    let isTouch = false;
    let timeout;
    const addScrollStyle = () => {
      this.#divs.root.classList.add("scrolling");
    };
    const removeScrollStyle = () => {
      this.#divs.root.classList.remove("scrolling");
    };
    this.#divs.root.addEventListener("touchstart", () => {
      isTouch = true;
      this.#debounceScrolling = true;
      clearTimeout(timeout);
      addScrollStyle();
    });
    this.#divs.root.addEventListener("touchend", () => {
      isTouch = false;
      timeout = setTimeout(() => {
        isTouch = false;
        this.#debounceScrolling = false;
        removeScrollStyle();
      }, this.#debounce);
    });
    setTimeout(() => {
      this.#divs.root.addEventListener("scroll", () => {
        if (isTouch)
          return;
        if (this.#isAutoScroll) {
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
    }, 1e3);
  }
  #updateCaptionStatus(playhead) {
    if (this.#paused)
      return;
    this.#playhead = playhead;
    if (!this.#captions || !this.#captions.cues)
      return;
    this.#setCuesStatus();
    const activeIndex = this.#captions.cues?.findIndex((cue) => cue.status === "active");
    this.#captions.cues?.forEach((cue, index) => {
      if (cue.type === "spacer" && cue.status === "active") {
        const progValue = Math.round(this.#playhead - cue.seconds.start);
        const progress = this.#divs.root.querySelector(`[data-progress="${index}"]`);
        if (progress && progValue)
          progress.value = progValue;
      }
    });
    this.#divs.root.querySelectorAll(".active")?.forEach((item) => {
      const { index } = item.dataset;
      const cue = this.#captions.cues[index];
      if (cue.subCues) {
        const textDiv = item.querySelector(".text");
        textDiv.innerHTML = cue.subCues.map((sub) => `<span class="${sub.status}">${sub.text}</span>`).join("");
      }
    });
    if (activeIndex === this.#currentCue) {
      return;
    }
    this.#currentCue = activeIndex;
    const progressbars = this.#divs.root.querySelectorAll("[data-progress]");
    if (progressbars) {
      [...progressbars].forEach((bar) => {
        const newBar = bar;
        newBar.value = 0;
      });
    }
    if (this.#debounceScrolling) {
      const elms = this.#divs.root.querySelectorAll("[data-index]");
      const elm = elms[this.#currentCue];
      if (elm) {
        if (!CaptionsViewer.isElementInViewport(elm, "captionselement"))
          this.#debounceScrolling = false;
      }
    }
    this.#updateCaption();
    this.#scrollToCue();
  }
  static isElementInViewport(el, container) {
    const rect = el.getBoundingClientRect();
    const parent = el.closest(container);
    const parentRect = parent.getBoundingClientRect();
    return rect.bottom <= parentRect.bottom;
  }
  #renderAllCaptions(captions) {
    if (!captions)
      return "";
    const disabled = this.#disable ? this.#disable.split("|") : [];
    let html = "<ol>";
    captions.cues?.forEach((cue, index) => {
      html += this.#cueToHTML(cue, index, disabled);
    });
    html += "</ol>";
    return html;
  }
  #cueToHTML(cue, index, disabled) {
    if (!cue.timecode)
      return "";
    const styleName = cue.status || "";
    const timecode = `<span class="timecode">${Utilities.prettyTimecode(cue.timecode.start)}</span>`;
    const chapter = cue.chapter ? `<span class="chapter">${cue.chapter}</span>` : "";
    const textJoiner = this.#singleline ? " " : "<br />";
    let spacerProgress = "";
    if (cue.type === "spacer") {
      const progMax = Math.round(cue.seconds.end - cue.seconds.start);
      spacerProgress = `<progress max="${progMax}" value="0" data-progress="${index}"></progress>`;
    }
    let text = `<span class="text">${cue.text.join(textJoiner)}</span>`;
    if (cue.subCues) {
      text = '<span class="text">';
      text += cue.subCues.map((sub) => `<span class="${sub.status}">${sub.text}</span>`).join("");
      text += "</span>";
    }
    return `<li class="cueitem">
      <button
        type="button"
        tabindex="0"
        data-start="${cue.seconds.start}"
        class="cue ${styleName} ${cue.type || ""}"
        data-index="${index}"
      >${!disabled.includes("timecode") && cue.type !== "spacer" ? timecode : ""} ${!disabled.includes("chapters") ? chapter : ""} ${!disabled.includes("text") ? text : ""} ${spacerProgress}
      </button></li>`;
  }
  #updateCaption() {
    const divs = this.#divs.root.querySelectorAll(".cueitem");
    divs.forEach((item, index) => {
      const cue = this.#captions.cues[index];
      item.firstElementChild.classList.remove("upcoming", "next", "active", "previous", "passed");
      item.firstElementChild.classList.add(cue?.status);
    });
  }
  #setCuesStatus() {
    if (!this.#captions || !("cues" in this.#captions))
      return;
    this.#captions.cues = this.#captions.cues.map((cue) => {
      if (cue.seconds.end - this.#nudge < this.#playhead) {
        cue.active = false;
        cue.status = "passed";
      }
      if (cue.seconds.start - this.#nudge > this.#playhead) {
        cue.active = false;
        cue.status = "upcoming";
      }
      if (cue.seconds.start - this.#nudge < this.#playhead && cue.seconds.end - this.#nudge > this.#playhead) {
        cue.active = true;
        cue.status = "active";
      }
      return cue;
    });
    const passed = this.#captions.cues.filter((cue) => cue.status === "passed");
    const upcomingIndex = this.#captions.cues.findIndex((cue) => cue.status === "upcoming");
    if (upcomingIndex > 0) {
      this.#captions.cues[upcomingIndex].status = "next";
    }
    if (passed && passed.length > 0) {
      this.#captions.cues[passed.length - 1].status = "previous";
    }
    this.#captions.cues = this.#captions.cues.map((cue) => {
      if (cue.subCues) {
        cue.subCues.map((sub) => {
          sub.status = sub.seconds < this.#playhead ? "sub_active" : "sub_upcoming";
          return sub;
        });
      }
      return cue;
    });
  }
  #scrollToCue() {
    if (!this.#currentCue || this.#currentCue < 0)
      return;
    if (this.#debounceScrolling)
      return;
    const elms = this.#divs.root.querySelectorAll("li");
    const elm = elms[this.#currentCue];
    if (!elm)
      return;
    const elmHeight = elm.offsetHeight;
    const elmOffset = elm.offsetTop;
    this.#divs.root.scrollTop = elmOffset - elmHeight;
    this.#isAutoScroll = true;
    setTimeout(() => {
      this.#isAutoScroll = false;
    }, 1e3);
  }
  pause() {
    this.#paused = !this.#paused;
  }
  setTheme(userPreference = void 0) {
    const theme = Utilities.getTheme(userPreference || this.#theme || "");
    this.#theme = theme;
    this.#divs.root.dataset.theme = theme;
  }
  // textTrack.cues would be the complete cue list plus more.
  async updateCues(textTrack) {
    if (!textTrack)
      return "";
    if (!this.#captions || !this.#captions.cues)
      return "";
    const prevLength = this.#captions.cues.length;
    if (textTrack.cues.length <= this.#captions.cues.length)
      return "";
    const newCaptions = await this.#parse(textTrack);
    this.#captions.cues = newCaptions.cues;
    this.#setCuesStatus();
    newCaptions.cues.splice(0, prevLength);
    let html = "";
    newCaptions.cues.forEach((cue, index) => {
      html += this.#cueToHTML(cue, index, this.#disable);
    });
    const contianer = this.#divs.root.querySelector("ol");
    contianer.innerHTML += html;
    this.#updateCaptionStatus(this.#playhead);
    return html;
  }
  #event(name, value, object) {
    this.dispatchEvent(new CustomEvent("all", { detail: { name, value, full: object } }));
    this.dispatchEvent(new CustomEvent(name, { detail: { value, full: object } }));
  }
  async #renderCaptionSrc(src) {
    if (!this.#divs.root.querySelector("#tempVid")) {
      const track = document.createElement("track");
      track.mode = "active";
      track.default = true;
      track.src = src;
      const video = document.createElement("video");
      video.preload = "auto";
      video.setAttribute("id", "tempVid");
      video.appendChild(track);
      this.#divs.root.appendChild(video);
    }
    const videodiv = this.#divs.root.querySelector("#tempVid");
    await CaptionsViewer.trackReady(videodiv);
    return videodiv.textTracks[0];
  }
  static trackReady(video) {
    let count = 0;
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        count += 1;
        if (count > 1e3) {
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
    this.#captions.cues.splice(1, 1);
    let newCues;
    newCues = cues.map((cue, index) => {
      if (cue.text.length > 0 && index !== 1) {
        cue.text.shift();
      }
      return cue;
    });
    newCues = cues.filter((cue) => cue.text.length !== 0);
    newCues = cues.filter((cue) => cue.text[0] && cue.text[0].length !== 0);
    return newCues;
  }
};

// captions-viewer.js
window.customElements.define("captions-viewer", CaptionsViewer);
