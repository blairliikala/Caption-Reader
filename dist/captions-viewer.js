// src/utilities.js
var Utilities = class {
  // HH:MM:SS, or HH:MM:SS.FFF
  static timecodeToSeconds(timecode) {
    let parts = timecode.split(":");
    if (parts.lenght === 1)
      parts = timecode.split(",");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    const mili = timecode.split(".");
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
  static secondsToTimecode(seconds) {
    if (seconds === void 0 || seconds === null)
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
  static getFileType(file) {
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
function parseTextTrack(textTrack, nudge = 0) {
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
        start: cue.startTime - nudge,
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
  let isBlank = false;
  cues.forEach((cue, index) => {
    const next = cues[index + 1];
    if (isBlank) {
      isBlank = false;
      return;
    }
    if (!next)
      return;
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
  });
  return cues;
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
      currentCue.text.push(line);
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
  return `<style>

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
    
    --gray-10-sat: 10%;
    --gray-10-light: 10%;
    --gray-10-opacity: 0.1;
    --gray-20-sat: 10%;
    --gray-20-light: 10%;
    --gray-20-opacity: 0.2;
    --gray-70-opacity: 0.7;
    --inactive: hsla(var(--base), 20%, 40%, 0.9);
    --active-primary: hsla(var(--base), 0%, 30%, 1);
    --active-secondary: hsla(var(--base), 20%, 80%, 1);
    --highlight: hsla(var(--base), 50%, 50%, 0.9);
  }
  #root * {
    box-sizing: border-box;
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
    --active-primary: hsla(var(--base), 0%, 100%, 1);
    --active-secondary: hsla(var(--base), 20%, 80%, 1);
    --highlight: hsla(var(--base), 50%, 60%, 0.9);
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
    padding: 0.3rem 1.5rem 0.3rem .4rem;
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
  }
  @media(hover: hover) and (pointer: fine) {
    .cue:hover, .cue:active, .cue:focus {
      cursor: pointer;
      color: var(--active-secondary);
      background: none;
      border-left-color: var(--highlight);
      outline: 1px solid var(--highlight);
    }
  }
  .cue:focus-visible {
    cursor: pointer;
    border-left-color: var(--highlight);
    outline: 1px solid var(--highlight);
    color: var(--highlight);
    background: none;
  }    
  .upcoming {
    transform: scale(1);
    transform-origin: left;
  }
  .next {
    transform: scale(1);
    transform-origin: left;
  }
  .active {
    transform: scale(1.05);
    transform-origin: left;
    padding-right: 10%;
    border-color: var(--highlight);
    font-weight: bold;
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
  .passed  {
    transform: scale(1);
    transform-origin: left;
  }
  
  @media (prefers-reduced-motion) {
    .active, .previous {
      font-size: unset;
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
    background: hsla(var(--base), var(--gray-20-sat), var(--gray-20-light), var(--gray-20-opacity));
    box-shadow: none;
  }
  progress[value]::-webkit-progress-value {
    background: hsla(var(--base), var(--gray-20-sat), var(--gray-20-light), var(--gray-20-opacity));
    box-shadow: none;
  }
  
  .active .sub_active {
    text-decoration: underline;
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
  #debounce = 0;
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
    this.setAttribute("src", item);
  }
  set playhead(item) {
    this.setAttribute("playhead", item);
  }
  set debounce(item) {
    this.setAttribute("debounce", item);
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
    this.#create();
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
        const { index } = div.dataset;
        const seconds = this.#captions.cues[index].seconds.start;
        this.#event("seek", seconds);
        this.#updateCaptionStatus(seconds + 0.2);
      }
    });
    this.#divs.root.addEventListener("scroll", () => {
      this.#debounceScrolling = true;
      console.log("[scroll] touch move...");
      this.#divs.root.addEventListener("mouseup", () => {
        setTimeout(() => {
          this.#debounceScrolling = false;
        }, this.#debounce);
      });
      setTimeout(() => {
        this.#debounceScrolling = false;
      }, this.#debounce * 3);
    }, false);
    this.#create();
  }
  async #create(params) {
    this.#src = this.getAttribute("src") || "";
    this.#playhead = parseInt(this.getAttribute("playhead"), 10) || 0;
    this.#height = this.getAttribute("height") || "400px";
    this.#debounce = parseInt(this.getAttribute("debounce"), 10) || 5e3;
    this.#singleline = this.getAttribute("singleline") === "true" || this.getAttribute("singleline") === true || false;
    this.#color = this.getAttribute("color") || "";
    this.#disable = this.getAttribute("disable") || "";
    this.#theme = this.getAttribute("theme") || "";
    this.#youtube = this.getAttribute("youtube") === "true" || this.getAttribute("youtube") === true || false;
    if (!this.#src && !(this.#textTrack && "id" in this.#textTrack)) {
      console.debug("No text track");
      return;
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
    if (params?.changes.name === "src") {
      this.#captions = await this.#parse();
    }
    this.#showCaptions();
  }
  async #parse() {
    let captions;
    if (this.#src && Utilities.getFileType(this.#src) === "vtt") {
      this.#textTrack = await this.#renderCaptionSrc(this.#src);
    }
    if (this.#textTrack && "cues" in this.#textTrack) {
      console.log("Trying foo parser.");
      captions = parseTextTrack(this.#textTrack, this.#nudge);
    }
    if (this.#src && (!captions || !captions.cues)) {
      console.log("Trying backup parser.");
      const srcContents = await fetch(this.#src).then((res) => res.text());
      const type = Utilities.getFileType(this.#src);
      if (srcContents)
        captions = parseVTT(srcContents, type);
    }
    if (!captions || !captions.cues) {
      console.error("Not able to find and render captions.", captions);
      this.#divs.root.innerHTML = '<p class="empty">No captions.</p>';
      return void 0;
    }
    captions.cues = parseSubTextCues(captions.cues);
    if (this.#youtube)
      captions.cues = this.#youtubeAdjustments(captions.cues);
    captions.cues = addCueSpaces(captions.cues, this.#spacer);
    this.#setCuesStatus();
    console.log("Final Captions.", captions);
    return captions;
  }
  #updateCaptionStatus(playhead) {
    if (this.#paused)
      return;
    this.#playhead = playhead;
    this.#setCuesStatus();
    const activeIndex = this.#captions.cues?.findIndex((cue) => cue.status === "active");
    this.#captions.cues?.forEach((cue, index) => {
      if (cue.type === "spacer" && cue.status === "active") {
        const progValue = Math.round(this.#playhead - cue.seconds.start);
        const progress = this.#divs.root.querySelector(`[data-progress="${index}"]`);
        if (progress)
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
  #showCaptions() {
    if (!this.#captions)
      return;
    const disabled = this.#disable ? this.#disable.split("|") : [];
    this.#divs.root.innerHTML = "";
    let html = "<ol>";
    this.#captions.cues?.forEach((cue, index) => {
      if (cue.timecode) {
        const styleName = cue.status;
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
        html += `<li tabindex="0">
          <button
            type="button"
            tabindex="${index + 1}"
            class="cue ${styleName} ${cue.type || ""}"
            data-index="${index}"
          >${!disabled.includes("timecode") && cue.type !== "spacer" ? timecode : ""} ${!disabled.includes("chapters") ? chapter : ""} ${!disabled.includes("text") ? text : ""} ${spacerProgress}
          </button></li>`;
      }
    });
    html += "</ol>";
    this.#divs.root.innerHTML = html;
  }
  #updateCaption() {
    const divs = this.#divs.root.querySelectorAll("[data-index]");
    divs.forEach((item) => {
      const { index } = item.dataset;
      const cue = this.#captions.cues[index];
      item.classList.remove("upcoming", "next", "active", "previous", "passed");
      item.classList.add(cue.status);
    });
  }
  #setCuesStatus() {
    if (!("cues" in this.#captions))
      return;
    this.#captions.cues = this.#captions.cues.map((cue) => {
      if (cue.seconds.end < this.#playhead) {
        cue.active = false;
        cue.status = "passed";
      }
      if (cue.seconds.start > this.#playhead) {
        cue.active = false;
        cue.status = "upcoming";
      }
      if (cue.seconds.start < this.#playhead && cue.seconds.end > this.#playhead) {
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
    const elmHeight = elm.offsetHeight;
    const elmOffset = elm.offsetTop;
    this.#divs.root.scrollTop = elmOffset - elmHeight;
  }
  pause() {
    this.#paused = !this.#paused;
  }
  setTheme(userPreference = void 0) {
    const theme = Utilities.getTheme(userPreference || this.#theme || "");
    this.#theme = theme;
    this.#divs.root.dataset.theme = theme;
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
