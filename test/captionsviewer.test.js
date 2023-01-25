import { fixture, html, assert, aTimeout, waitUntil, oneEvent } from '@open-wc/testing';
import { expect } from '@esm-bundle/chai';
import '../captions-viewer.js';

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('<captions-viewer>', () => {
  it('has correct properties', async () => {
    await timeout(1000);

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
    await timeout(1000);

    const component = await fixture(`<captions-viewer
        src="test/dune_en.vtt"
      ></captions-viewer>`);

    const { captions } = component;
    expect(captions.cues?.length).to.equal(63);
    expect(captions.cues[0].seconds.start).to.equal(8.342);
  });

  it('Advances cues when the playhead parameter is updated', async () => {
    await timeout(1000);

    const component = await fixture(`<captions-viewer
        src="test/dune_en.vtt"
      ></captions-viewer>`);

    // Test difference note:
    // In the browser, time will snap to nearest keyframe based on video.
    component.playhead = 20; // 20 seconds in.
    expect(component.captions.cues[2].status).to.equal('passed');
    expect(component.captions.cues[3].status).to.equal('previous');
    expect(component.captions.cues[4].status).to.equal('active');
    expect(component.captions.cues[5].status).to.equal('next');
    expect(component.captions.cues[6].status).to.equal('upcoming');
  });
});
