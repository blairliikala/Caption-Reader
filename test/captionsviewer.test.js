/* eslint-disable import/no-unresolved */
/* eslint-disable no-undef */

import { fixture, assert, aTimeout, waitUntil, oneEvent } from '@open-wc/testing';
// import { expect } from '@esm-bundle/chai';
import '../captions-viewer.js';

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('<captions-viewer>', () => {
  it('has correct properties', async () => {
    timeout(5000);

    const component = await fixture(`<captions-viewer
        src="dune_en.vtt"
        height="25vh"
        singleline="true"
        color="300"
        theme="dark"
      ></captions-viewer>`);
  });

  assert.equal(component.src, 'dune_en.vtt', 'src is set.');
});
