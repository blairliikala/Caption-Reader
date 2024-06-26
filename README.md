# \<captions-viewer>

A web component to display captions as a video plays. Think Spotify or Apple Music lyrics. Includes automatic scrolling to the caption cue as the video plays, and events when a chapter is clicked.

The component takes a webvtt or srt caption file and renders to a list.  Caption parsing uses the faster native browser `textTracks` for vtt files, or a super small srt parser.  Classes are updated depending on if the cue is upcoming, active or passed, and a little JS is used to move the cue into view.  Cues are sorted, and larger gaps show a progress bar.

HLS streaming files with captions are supported, but take a few extra steps to send caption cues to the component.  Examples are shown below.

The component has been tested with about 3,000 cues (2hr move) for performance.

Also check out the other component that makes it easier to manage starting and ending live streams for viewers [https://livestreamwrapper.vercel.app/demo/](https://livestreamwrapper.vercel.app/demo/)

## In Development

While this remains under 1.0, things are probably going to change.

## Basic Usage

## Install

```bash
npm i captions-viewer
```

```html
<script type="module">
  import captionsViewer from 'https://cdn.jsdelivr.net/npm/captions-viewer/+esm'
</script>
```

```html
<script type="module" src="'https://cdn.jsdelivr.net/npm/captions-viewer/+esm"></script>
```

## Quickstart

```html
<video controls src="video.mp4" id="my_player"></video>
<captions-viewer src="caption.vtt" player="#my_player"></caption-viewer>
```

## Guide

### Add Caption File

First, provide the path to a caption file the `src` parameter on the element.  This must be an already created vtt or srt captions file.  The caption file procesesd by the browser-native caption parser for vtt with a backup lightweight parser for srt or if there is a problem.

This example will display captions, but will not follow the video yet:

```html
<video controls src="video.mp4"></video>

<captions-viewer src="caption.vtt"></caption-viewer>
```

### Link the Video Player and Captions Reader

To make the captions to update when the video is playing, and respond to clicks, the captions component needs to be linked to the video player. Simply use the `config` setup and pass the video element shown below. Most (if not all) have a property to get the native `<video>` or `<audio>` element, but if not there is a way describe later on to manually connect the listeners.

Simple example connecting a native video tag to the component:

### Auto Linking to `<video>` Events

```html
<video id="myVideo" controls src="video.mp4"></video>
<captions-viewer file="caption.vtt"></caption-viewer>

<script>
  const player = document.querySelector('#myVideo');
  const captions = document.querySelector('captions-viewer');
  captions.config({ player: player });
</script>
```

### Manual Linking Events

For more fine-tunned control or if the video/audio element is not available, setup the listeners as shown below:

```html
<video controls src="video.mp4"></video>
<captions-viewer file="caption.vtt"></caption-viewer>

<script>
const captions = document.querySelector('captions-viewer');
const player = document.querySelector('video');

// Regularly update the reader with the player's current time:
player.addEventListener('timeupdate', () => {
  captions.playhead = player.currentTime;
});
// ** note that you could also setup an interval to get a faster response ** //

// When a caption cue is clicked, seek the player.
captions.addEventListener('seek', e => {
  player.currentTime = e.detail.value;
});

// Quickly scroll to the current cue after player seek.
player.addEventListener('seeking', () => {
  captions.debounceScrolling = false;
});
</script>
```

## HLS

HLS videos work the same way as flat mp4 files when there is a separate caption file.

If the captions/subtitles are in the HLS stream, such as during a live stream, caption cues are progressively loaded as each video chunk is downloaded.  Simply pass the video element hls.js creates to the reader component:

```html
<video></video>
<captions-viewer file="caption.vtt"></caption-viewer>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script>
  const captions = document.querySelector('captions-viewer');
  const player = document.querySelector('video');
  const videoSrc = 'https://mysite.com/playlist.m3u8';
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(player);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      player.addEventListener('loadedmetadata', async () => {;
        captions.config({ player: player });
      });
    });
  } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
    player.src = videoSrc;
    player.addEventListener('play', () => {
      captions.config({ player: player });
    });
  }
</script>
```

## Tag Parameters

### Setup

|  Name | Default | Description |
| - | - | - |
| `src`       | null   | Location of the vtt/srt file. |
| `playhead`   | 0      | The current video/audio player time, in seconds, to keep the player and reader in-sync. (see more below) |
| `youtube` | false | Enable `true` if the caption vtt track came from YouTube for some special handling. |
| `textTrack` | undefined |  Will hold the HTMLTextTrack.  The native browser text track object.  Pass this along for more custom player implementations. |
| `captions` | undefined | Read-only property of the internal caption cues list. Useful for debugging. |
| `paused` | false | The on/off button.  If the reader system is enabled or not. |

### Display

|  Name | Default | Description |
| - | - | - |
| `singleline` | false  | True will show all text for a cue on a single line.  False will obey the line breaks in the caption file. |
| `disable`    | empty  | Turn off displaying `timecode` `chapters` or `text`. Use a pipe `\|` between each option, such as `timecode\|chapters` |

### Adjusting Playback

|  Name | Default | Description |
| - | - | - |
| `debounce`   | 5000   | Control the time between scrolling. Time in ms between the last scroll (user or automatic) |
| `nudge` | 0.5 | Amount in seconds to adjust the cues to trigger sooner. 0.5 means the cue will show 500ms sooner than the timecode. |
| `spacer` | 5 | Time in seconds between cues where a spacer (progress bar) will display |

### Simple Theming

| Name | Default | Description |
| - | - | - |
| `height`     | 300px  | Height of the scrolling box.  Valid CSS unit. |
| `color` | 360 | The Hue (0-360) of the base color to use.  This is put into an hsla color. |
| `theme` | light, dark | Light theme shades the text darker for a whiter background.  Dark will lighten text for a darker background. |
| `stylesheet` | true | True/False to enable the default stylesheet.  False will remove all styling, default is True. See the guide below. |

## Methods

### `config(options)`

| Name | Description | Type | Default |
| - | - | - | - |
| `player` | (Required) The video or audio element. | htmlElement | `undefined` |
| `lang` | Language code that matches the tracks code. | string | `en` |
| `refresh` | Time in milliseconds to update cues as player plays. | number | player `timeUpdate` |

Example:

```javascript
const captions = document.querySelector('captions-viewer');
captions.config({
  player: document.querySelector('video'),
  lang: 'fr',
  refresh: 500,
});
```

### `pause()`

A toggle to stop/start the component without removing it.  All events, scrolling and updating will stop.

```html
<button type="button">Toggle Caption Reading</button>
<script>
document.querySelector('button').addEventListener('click', () => {
  captions.pause();
});
</script>
```

### `setTheme(theme)`

Calling this method with the name of the theme will immediately change the color scheme.  Options are currently only `dark` for making the text lighter for dark backgrounds, `light` for dark text on ligher backgrounds, and blank/empty for user's system theme.

```javascript
captions.setTheme('dark');
```

### `updateCues(textTrack.cues)`

Live streaming and HLS can push text cue updates as the video plays.  To update the reader with new use, this method will append those cues. This method expects a `textTrack` cue list of all the current cues, plus new cues. It has better performance by only rendering the new cues than pushing updates to the `textTrack` property as `textTrack` is a complete refresh and re-render of all the cues.

```javascript
const tracks = player.textTracks;
const track = tracks[0]; // example, pick the first track.
track.addEventListener('cuechange', (e) => {
  component.updateCues(e.target);
});
```

## Events

|  Name | Description |
| - | - |
| `parsed` | When the caption file has been parsed. |
| `error` | Fires when an error occurs. Returns the text description of the error. |
| `seek` | Fires when a click/select is made on a caption cue. Returns the start of that cue in seconds. |
| `cuechange` | Fires when cues change.  Returns the internal cue object of the single active track, or the last one if there are multiple. `undefined` if no cue is active. |

## No Captions

To display a "no captions" message, add the custom element:

```html
<captions-viewer ...>
  <captions-viewer-empty>
    Your Custom Message
  </captions-viewer-empty>
</caption-viewer>
```

## Complete Examples

For more examples, see the /demo folder.

Show captions for a video using the native caption tracy system, with a dynamic container height, custom color, and only showing timecode and the text.  The theme is set for dark, so the background will darker with lighter captions.

```html
<style>
  /* Hides the component until it has loaded */
  captions-viewer:not(:defined) {
    visibility: hidden
  }
  /* set some container styles */
  captions-viewer {
    font-family: arial;
    display: block;
    background: rgba(0,0,0,.2);
  }
</style>

<video controls id="demo_video">
  <source src="movie.mp4" type="video/mp4">
  <!-- Not required for the reader,
      but best for accessibility to keep them here for the actual player. -->
  <track label="English" kind="subtitles" srclang="en" src="subtitle.vtt" />
</video>

<captions-viewer
  src="subtitle.vtt"
  player="#demo_video"
  height="30vw"
  singleline="true"
  color="300"
  theme="dark"
  disable="chapters"
  >
  <captions-viewer-empty></captions-viewer-empty>
</captions-viewer>

<script type="module" src="/dist/captions-viewer.js"></script>
```

### YouTube

YouTube captions are not accessible publicly.  One way is to download the vtt option from YouTube in the Creator Studio, put it on your own server.  Another is using YouTube's API.

**Note** when using the YouTube vtt file, one edit may be needed to the first cue.  Normally there is a blank line between the timecode and cue code. Each browser handles this slightly differently, so to provide browser parity simply add text in this blank line.  Any text will do, and will be removed by the parser.

```text
WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:02.810 align:start position:0%
[add any text here]
hello<00:00:00.539><c> boys</c><00:00:00.719><c> and</c><00:00:00.750><c> girls</c>

...etc
```

```html
<div id="player"></div>

<captions-viewer
  src="caption.vtt"
  disable="chapters"
  debounce="1000"
  youtube="true"
  >
  <captions-viewer-empty></captions-viewer-empty>
</captions-viewer>

<script type="module" src="captions-viewer.js"></script>
<script defer src="https://www.youtube.com/iframe_api"></script>
<script>
  const captions = document.querySelector('captions-viewer');

  // From YouTube documentation
  // https://developers.google.com/youtube/iframe_api_reference
  let player;
  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      height: '390',
      width: '100%',
      videoId: 'abcdefg', // Add YouTube video ID.
      playerVars: {
        'playsinline': 1
      },
      events: {
        'onStateChange': onPlayerStateChange
      }
    });
  }

  // While playing, update the component with the current time.
  // YouTube does not have an event for when time is updating, so we have to poll with an interval.
  // The faster 200ms is to make sure the sub cues are showing on time.  Keep this above 200ms to not tax the client's CPU.
  let pingInterval;
  let playheadUpdate = 200;
  function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
      pingInterval = setInterval(() => {
        captions.playhead = player.getCurrentTime()
      }, playheadUpdate)
    } else {
       // Stop when paused.
      clearInterval(pingInterval);
    }
  }

  // On click, Seek's player to caption location.
  // seekTo is YouTube's method to seek the player.
  component.addEventListener('seek', e => {
    player.seekTo(e.detail.value);
  });
</script>
```
