/* eslint-disable brace-style */ // I think its more readable for this here.
import { timecodeToSeconds, isTimecode, secondsToTimecode } from './utilities.js';

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
        start: secondsToTimecode(cue.startTime),
        end: secondsToTimecode(cue.endTime),
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

// This is a simple parser to keep the size down. Works with SRT and VTT.
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
    else if (line !== '' && isTimecode(lines[count + 1])) {
      currentCue.chapter = line;
    }
    else if (isTimecode(line)) {
      const times = line.split('-->');

      // 00:00:08.880 --> 00:00:10.549 align:start position:0%
      const endSplit = times[1] ? times[1]?.split(' ') : undefined;
      const end = endSplit ? endSplit[1]?.trim() : '';

      currentCue.timecode = {
        start: times[0].trim(),
        end,
      };
      currentCue.seconds = {
        start: timecodeToSeconds(times[0]),
        end: timecodeToSeconds(end),
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
