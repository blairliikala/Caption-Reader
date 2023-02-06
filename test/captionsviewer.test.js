/* eslint-disable no-undef */
import {
  fixture, assert, aTimeout, waitUntil, oneEvent,
} from '@open-wc/testing';
import { expect } from '@esm-bundle/chai';
import '../captions-viewer.js';

describe('<captions-viewer>', () => {
  it('has correct properties', async () => {
    aTimeout(500);

    const component = await fixture(`<captions-viewer
        src="test/dune_en.vtt"
      ></captions-viewer>`);

    assert.equal(component.src, 'test/dune_en.vtt', 'src is set.');
    assert.equal(component.height, '400px', 'Height is set.');
    assert.equal(component.playhead, 0, 'playhead is set.');
    assert.equal(component.debounce, 4000, 'debounce scrolling is set.');
    assert.equal(component.singleline, false, 'single line is set.');
    assert.equal(component.color, undefined, 'color is set.');
    assert.equal(component.disable, '', 'disable is set.');
    assert.equal(component.theme, 'light', 'theme is set.');
    assert.equal(component.youtube, false, 'no special YouTube.');
    // assert.equal(component.enableCSS, true, 'default stylesheet is set');
  });

  it('parsed the dune vtt correctly', async () => {
    const component = await fixture(`<captions-viewer
        src="test/dune_en.vtt"
      ></captions-viewer>`);

    await waitUntil(() => ('cues' in component.captions), 'Captions parsed');

    const { captions } = component;
    expect(captions.cues?.length).to.equal(65);
    expect(captions.cues[1].seconds.start).to.equal(8.842);
  });

  it('Advances cues and updates statuses when the playhead parameter is updated', async () => {
    const component = await fixture(`<captions-viewer
        src="test/dune_en.vtt"
      ></captions-viewer>`);

    await waitUntil(() => ('cues' in component.captions), 'Captions parsed');

    // Test difference note:
    // In the browser, time will snap to nearest keyframe based on video.
    component.playhead = 20; // 20 seconds in.
    expect(component.captions.cues[3].status).to.equal('passed');
    expect(component.captions.cues[4].status).to.equal('previous');
    expect(component.captions.cues[5].status).to.equal('active');
    expect(component.captions.cues[6].status).to.equal('next');
    expect(component.captions.cues[7].status).to.equal('upcoming');
  });

  it('fires an event when parsed', async () => {
    const component = await fixture('<captions-viewer></captions-viewer>');
    const listener = oneEvent(component, 'parsed');
    component.src = 'test/dune_en.vtt';
    const { detail } = await listener;
    expect(detail.value).to.equal('Caption file has been parsed.');
  });

  it('adds cue to tracklist and shows progress bar in html', async () => {
    const component = await fixture('<captions-viewer src="test/dune_en.vtt"></captions-viewer>');
    await waitUntil(() => ('cues' in component.captions), 'Captions parsed');
    expect(component.captions.cues[62].type).to.equal('spacer');
    const htmlCues = document.querySelectorAll('progress');
    expect(htmlCues.length).to.equal(3);
  });

  it('Cues are put in order.', async () => {
    const component = await fixture('<captions-viewer src="test/out_of_order_cues.vtt"></captions-viewer>');
    await waitUntil(() => ('cues' in component.captions), 'Captions parsed');
    expect(component.captions.cues[4].text[0]).to.equal('- out of order cue.');
  });

  it('removes duplicate cues', async () => {
    const component = await fixture('<captions-viewer src="test/duplicates.vtt"></captions-viewer>');
    await waitUntil(() => ('cues' in component.captions), 'Captions parsed');
    expect(component.captions.cues.length).to.equal(5);
  });
});
