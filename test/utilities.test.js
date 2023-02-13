/* eslint-disable import/no-unresolved */
/* eslint-disable no-undef */
import { expect } from '@esm-bundle/chai';
import {
  timecodeToSeconds,
  isTimecode,
  prettyTimecode,
  secondsToTimecode,
  getTheme,
  getSupportedFileType,
} from '../src/utilities/utilities.js';

it('is timecode.', () => {
  expect(isTimecode('00:01:01.000')).to.equal(true);
  expect(isTimecode('00:01:01,000')).to.equal(true);
  expect(isTimecode('00:01:01')).to.equal(true);
  expect(isTimecode('10:01:01')).to.equal(true);
  expect(isTimecode('xxxx')).to.equal(false);
});

it('should change timecode to seconds.', () => {
  expect(timecodeToSeconds('00:01:30.000')).to.equal(90);
  expect(timecodeToSeconds('xxxx')).to.equal(undefined);
  expect(timecodeToSeconds(123445)).to.equal(undefined);
  expect(timecodeToSeconds('0012')).to.equal('0012');
});

it('is correct seconds.', () => {
  expect(secondsToTimecode(0)).to.equal('00:00:00');
  expect(secondsToTimecode(1)).to.equal('00:00:01');
  expect(secondsToTimecode(1.5)).to.equal('00:00:01');
  expect(secondsToTimecode(65)).to.equal('00:01:05');
  expect(secondsToTimecode(3600)).to.equal('01:00:00');
  expect(secondsToTimecode(9000)).to.equal('02:30:00'); // 25hrs.
});

it('is incorrect seconds.', () => {
  expect(secondsToTimecode(-1)).to.equal('00:00:00');
  expect(secondsToTimecode('string')).to.equal('');
});

it('has the correct theme.', () => {
  expect(getTheme('light')).to.equal('light');
  expect(getTheme('dark')).to.equal('dark');
});

it('has the correct file type.', () => {
  expect(getSupportedFileType('somefile.srt')).to.equal('srt');
  expect(getSupportedFileType('somefile.vtt')).to.equal('vtt');
  expect(getSupportedFileType('somefile.txt')).to.equal(undefined);
});

it('is pretty timecode.', () => {
  expect(prettyTimecode('00:00:01')).to.equal('00:01');
  expect(prettyTimecode('00:01:01')).to.equal('01:01');
  expect(prettyTimecode('01:00:01')).to.equal('01:00:01');
  expect(prettyTimecode('00:00:01.600')).to.equal('00:02');
  expect(prettyTimecode('00:01')).to.equal('00:01');
  expect(prettyTimecode('01')).to.equal('01');
  expect(prettyTimecode(123)).to.equal(undefined);
  expect(prettyTimecode('-1')).to.equal(undefined);
});
