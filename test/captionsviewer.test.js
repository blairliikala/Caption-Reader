/* eslint-disable no-undef */
import { fixture, assert, waitUntil, oneEvent, aTimeout } from '@open-wc/testing';
import { expect } from '@esm-bundle/chai';
import '../captions-viewer.js';

describe('<captions-viewer>', () => {
  it('has correct properties', async () => {
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

  it('src changes', async () => {
    const component = await fixture('<captions-viewer src="test/dune_en.vtt"></captions-viewer>');
    component.src = 'test/duplicates.vtt';
    expect(component.src).to.equal('test/duplicates.vtt');
    component.src = 'failed';
    expect(component.src).to.equal('failed');
    expect(component.querySelector('captionselement').innerHTML).to.contain('something happenin');
  });
  it('height changes', async () => {
    const component = await fixture('<captions-viewer height="100vw" src="test/dune_en.vtt"></captions-viewer>');
    expect(component.height).to.equal('100vw');
    expect(component.querySelector('captionselement').style.height).to.equal('100vw');
    component.height = '200vw';
    expect(component.height).to.equal('200vw');
    expect(component.querySelector('captionselement').style.height).to.equal('200vw');
  });

  it('sets custom captions message', async () => {
    const component = await fixture('<captions-viewer><captions-viewer-empty>EmptyCaptions</captions-viewer-empty></captions-viewer>');
    expect(component.querySelector('captions-viewer-empty').innerHTML).to.equal('EmptyCaptions');
  });
  it('sets default captions message', async () => {
    const component = await fixture('<captions-viewer><captions-viewer-empty></captions-viewer-empty></captions-viewer>');
    expect(component.querySelector('captions-viewer-empty').innerHTML).to.equal('No captions.');
  });
  it('sets empty message when there are no captions, and no custom element.', async () => {
    const component = await fixture('<captions-viewer></captions-viewer>');
    expect(component.querySelector('captions-viewer-empty')).to.equal(null);
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

  it('tests config setup.', async () => {
    const component = await fixture('<captions-viewer src="/test/dune_en.vtt"></captions-viewer>');
    const player = await fixture('<video src="/test/dune.mp4" muted></video>');
    await waitUntil(() => ('cues' in component.captions), 'Captions parsed');
    component.config({ player });
    player.play();
    await aTimeout(1100);
    // setTimeout(() => player.pause(), 1100);
    expect(Math.round(component.playhead)).to.equal(1);
  });

  /* NOt working yet
  it('tests config setup.', async () => {
    const component = await fixture('<captions-viewer src="/test/dune_en.vtt"></captions-viewer>');
    const player = await fixture('<video src="/test/dune.mp4" muted></video>');
    await waitUntil(() => ('cues' in component.captions), 'Captions parsed');
    component.config({ player });

    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: false,
    });
    const li = component.querySelectorAll('li');
    const first = li[10];
    console.log(first);
    first.querySelector('button').dispatchEvent(clickEvent);
    const test = await oneEvent(component, 'seek');
    console.log(test);
    await aTimeout(900);
    console.log(player.currentTime);
  });
  */
});
