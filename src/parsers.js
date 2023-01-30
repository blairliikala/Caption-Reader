/* eslint-disable brace-style */ // I think its more readable for this here.

import util from './utilities.js';

function parseSubTextCue(text, startSec) {
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
      seconds: util.timecodeToSeconds(timecodeText[i]),
      text: timecodeText[i + 1],
      status: undefined,
    });
    i += 1;
  }
  return result;
}

// Create internal object from the HTML textTrack interface.
export function parseTextTrack(textTrack) {
  if (!textTrack.cues) {
    return undefined;
  }
  const cues = Object.entries(textTrack.cues).map(cuesArray => {
    const cue = cuesArray[1];
    return {
      chapter: cue.id,
      status: '',
      text: cue.text.split('\n').map(split => split.replace(/^\s+/g, '')), // remove starting whitespace
      subCues: undefined,
      seconds: {
        start: cue.startTime,
        end: cue.endTime,
      },
      timecode: {
        start: util.secondsToTimecode(cue.startTime),
        end: util.secondsToTimecode(cue.endTime),
      },
    };
  });

  const track = {
    kind: textTrack.kind,
    lang: textTrack.language,
    label: textTrack.label,
    header: textTrack.id,
    styles: undefined,
    cues,
  };

  return track;
}

// For parsing cues within a caption cue.  Normally for YouTube.
export function parseSubTextCues(cues) {
  return cues.map(cue => {
    const texts = cue.text[1] || ''; // TODO Youtube specific. Lines repeat.
    cue.subCues = undefined;
    if (texts.includes('<')) {
      cue.subCues = parseSubTextCue(texts, cue.seconds.start);
    }
    return cue;
  });
}

export function addCueSpaces(cues, distance) {
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
        start: util.secondsToTimecode(0),
        end: util.secondsToTimecode(first.seconds.start),
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
          start: util.secondsToTimecode(start),
          end: util.secondsToTimecode(start),
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
  return cues;
}

export function sortCues(cues) {
  if (!cues) return cues;
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

// This is a simple parser to keep the size down.
export function parseVTT(contents, type) {
  const lines = contents.split('\n');

  const caption = {
    kind: type || lines[0].startsWith('WEBVTT'),
    lang: undefined,
    header: undefined,
    styles: undefined,
    cues: [],
  };
  let currentCue = {
    text: [],
  };
  let count = 0;
  let cueBlock = false;
  let cueBlockData = '';
  let cueBlockName = '';
  for (const line of lines) {
    if (line.startsWith('WEBVTT')) {
      const split = line.split(' - ');
      if (split.length > 0) {
        const index = 1;
        caption.header = split[index];
      }
    }
    else if (line.startsWith('Kind')) {
      const split = line.split(':');
      caption.kind = split[1]?.trim();
    }
    else if (line.startsWith('Language')) {
      const split = line.split(':');
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
    else if (line !== '' && util.isTimecode(lines[count + 1])) {
      currentCue.chapter = line;
    }
    else if (util.isTimecode(line)) {
      const times = line.split('-->');

      // 00:00:08.880 --> 00:00:10.549 align:start position:0%
      const endSplit = times[1] ? times[1]?.split(' ') : undefined;
      const end = endSplit ? endSplit[1]?.trim() : '';

      currentCue.timecode = {
        start: times[0].trim(),
        end,
      };
      currentCue.seconds = {
        start: util.timecodeToSeconds(times[0]),
        end: util.timecodeToSeconds(end),
      };
      currentCue.length = currentCue.seconds.start + currentCue.seconds.end;
      // Check for position after the timecode.
      const spaces = line.split(' ');
      if (spaces.length > 2) {
        currentCue.styles = spaces.splice(3).join(' ');
      }
    }
    else if (line !== '') {
      if (type === 'srt') {
        // remove html tags in srt so a stylesheet has complete control.
        // Also Final Cut and Premiere, and probably most NLE's, butcher this.
        currentCue.text.push(line.replace(/(<([^>]+)>)/gi, ''));
      } else {
        currentCue.text.push(line);
      }
    }

    if (line === '' && currentCue.timecode?.start !== undefined) {
      if (cueBlock) {
        cueBlock = false;
        // eslint-disable-next-line no-unused-vars
        cueBlockName = '';
      }
      currentCue.active = false;
      caption.cues.push(currentCue);
      currentCue = {
        text: [],
      };
    }

    count += 1;
  }
  return caption;
}
