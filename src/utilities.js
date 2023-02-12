export default class Utilities {
  // HH:MM:SS, or HH:MM:SS.FFF
  static timecodeToSeconds(timecode = '') {
    const regex = /^[0-9][0-9]/;
    if (!regex.test(timecode) || typeof (timecode) !== 'string') {
      return undefined;
    }
    const parts = timecode.split(':'); // vtt
    if (!parts || parts.length === 1) return timecode;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    let mili = timecode.split('.');
    if (mili.length === 1) {
      mili = timecode.split(',');
    }
    return (hours * 3600) + (minutes * 60) + seconds + (mili[1] / 1000);
  }

  static isTimecode(input) {
    const regex = /^[0-9][0-9]/;
    return regex.test(input);
  }

  static prettyTimecode(timecode) {
    const regex = /^[0-9][0-9]/;
    if (!regex.test(timecode) || typeof (timecode) !== 'string') {
      return undefined;
    }
    const split = timecode.split(':');
    if (split.length === 0) return [];

    if (split.length - 1 === 2) {
      if (split[0] === '00') {
        split.splice(0, 1);
      }
    }

    // Round miliseconds, and handle srt/vtt differences.
    let seconds = split[split.length - 1];
    seconds = seconds.replace(',', '.');
    seconds = Math.round(seconds);
    if (seconds < 10) {
      seconds = `0${seconds}`;
    }
    split[split.length - 1] = seconds;
    return split.join(':');
  }

  static secondsToTimecode(seconds = 0) {
    if (typeof (seconds) !== 'number') return '';
    if (seconds < 0) return '00:00:00';
    return new Date(seconds * 1000).toISOString().substring(11, 11 + 8);
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

  static getSupportedFileType(file) {
    const split = file.split('.');
    const extension = split[split.length - 1];
    const supported = ['vtt', 'srt'];
    return supported.find(ext => ext === extension);
  }

  static isElementInViewport(el, container) {
    const rect = el.getBoundingClientRect();
    const parent = el.closest(container);
    const parentRect = parent.getBoundingClientRect();
    return (rect.bottom <= parentRect.bottom);
  }
}
