/* eslint-disable import/no-unresolved */
/* eslint-disable no-undef */
import { expect } from '@esm-bundle/chai';
import util from '../src/utilities.js';

it('is timecode.', () => {
  expect(util.isTimecode('00:01:01.000')).to.equal(true);
  expect(util.isTimecode('00:01:01,000')).to.equal(true);
  expect(util.isTimecode('00:01:01')).to.equal(true);
  expect(util.isTimecode('10:01:01')).to.equal(true);
  expect(util.isTimecode('xxxx')).to.equal(false);
});

it('should change timecode to seconds.', () => {
  expect(util.timecodeToSeconds('00:01:30.000')).to.equal(90);
  expect(util.timecodeToSeconds('xxxx')).to.equal(undefined);
  expect(util.timecodeToSeconds(123445)).to.equal(undefined);
  expect(util.timecodeToSeconds('0012')).to.equal('0012');
});

it('is correct seconds.', () => {
  expect(util.secondsToTimecode(0)).to.equal('00:00:00');
  expect(util.secondsToTimecode(1)).to.equal('00:00:01');
  expect(util.secondsToTimecode(1.5)).to.equal('00:00:01');
  expect(util.secondsToTimecode(65)).to.equal('00:01:05');
  expect(util.secondsToTimecode(3600)).to.equal('01:00:00');
  expect(util.secondsToTimecode(9000)).to.equal('02:30:00'); // 25hrs.
});

it('is incorrect seconds.', () => {
  expect(util.secondsToTimecode(-1)).to.equal('00:00:00');
  expect(util.secondsToTimecode('string')).to.equal('');
});

it('has the correct theme.', () => {
  expect(util.getTheme('light')).to.equal('light');
  expect(util.getTheme('dark')).to.equal('dark');
});

it('has the correct file type.', () => {
  expect(util.getSupportedFileType('somefile.srt')).to.equal('srt');
  expect(util.getSupportedFileType('somefile.vtt')).to.equal('vtt');
  expect(util.getSupportedFileType('somefile.txt')).to.equal(undefined);
});

it('is pretty timecode.', () => {
  expect(util.prettyTimecode('00:00:01')).to.equal('00:01');
  expect(util.prettyTimecode('00:01:01')).to.equal('01:01');
  expect(util.prettyTimecode('01:00:01')).to.equal('01:00:01');
  expect(util.prettyTimecode('00:00:01.600')).to.equal('00:02');
  expect(util.prettyTimecode('00:01')).to.equal('00:01');
  expect(util.prettyTimecode('01')).to.equal('01');
  expect(util.prettyTimecode(123)).to.equal(undefined);
  expect(util.prettyTimecode('-1')).to.equal(undefined);
});
