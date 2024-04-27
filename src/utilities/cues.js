import { secondsToTimecode, timecodeToSeconds } from './utilities.js';

export class CueParser {
  #cues;

  constructor(cues) {
    this.#cues = cues;
  }

  get cues() {
    return this.#cues;
  }

  set cues(data) {
    this.#cues = data;
  }

  #_parseSubTextCue(text, startSec) {
    const timecodeRegex = /<(\d\d:\d\d:\d\d\.\d\d\d)>/;
    const timecodeText = text.split(timecodeRegex);

    const result = [];
    for (let i = 1; i < timecodeText.length; i += 1) {
      if (i === 1) {
        result.push({
          seconds: startSec,
          text: timecodeText[0],
          status: undefined,
        });
      }
      result.push({
        seconds: timecodeToSeconds(timecodeText[i]),
        text: timecodeText[i + 1],
        status: undefined,
      });
      i += 1;
    }
    return result;
  }

  // For parsing cues within a caption cue.  Normally for YouTube.
  parseSubTextCues() {
    const cues = this.#cues;
    this.#cues = cues.map(cue => {
      const texts = cue.text[1] || ''; // TODO Youtube specific. Lines repeat.
      cue.subCues = undefined;
      if (texts.includes('<')) {
        cue.subCues = this.#_parseSubTextCue(texts, cue.seconds.start);
      }
      return cue;
    });
    return this;
  }

  addCueSpaces(distance) {
    const cues = this.#cues;

    if (!cues || cues.length === 0) return undefined;
    // When blank is added to array, it messes with next loop.
    let isBlank = false;

    // start to first cue.
    const first = cues[0];
    if (first.seconds.start > distance) {
      const newCue = {
        chapter: '',
        text: [],
        type: 'spacer',
        timecode: {
          start: secondsToTimecode(0),
          end: secondsToTimecode(first.seconds.start),
        },
        seconds: {
          start: 0,
          end: first.seconds.start,
        },
      };
      cues.unshift(newCue);
    }

    cues.forEach((cue, index) => {
      const next = cues[index + 1];
      if (isBlank) {
        isBlank = false;
        return undefined;
      }
      if (!next) return undefined;
      const diff = next.seconds.start - cue.seconds.end;
      if (diff > distance) {
        const start = cue.seconds.end;
        const end = next.seconds.start;
        const newCue = {
          chapter: '',
          text: [],
          type: 'spacer',
          timecode: {
            start: secondsToTimecode(start),
            end: secondsToTimecode(start),
          },
          seconds: {
            start,
            end,
          },
        };
        cues.splice(index + 1, 0, newCue);
        isBlank = true;
      }
      return [];
    });
    this.#cues = cues;
    return this;
  }

  sortCues() {
    const cues = this.#cues;
    if (!cues) return cues;
    this.#cues = cues.sort((a, b) => {
      if (a.seconds.start < b.seconds.start) {
        return -1;
      }
      if (a.seconds.start > b.seconds.start) {
        return 1;
      }
      return 0;
    });
    return this;
  }

  removeDuplicateCues() {
    const cues = this.#cues;
    const cuesFlat = cues.map(cue => JSON.stringify(cue));
    this.#cues = cues.filter((cue, index) => {
      const match = cues.findIndex((c, i) => cuesFlat[i] === cuesFlat[index]);
      return index === match;
    });
    return this;
  }
}
