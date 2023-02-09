# \<captions-viewer>

A web component to display captions as a video plays. Think Spotify or Apple Music lyrics. Includes automatic scrolling to the caption cue as the video plays, and events when a chapter is clicked.

Also check out the other component that makes it easier to manage starting and ending live streams for viewers [https://livestreamwrapper.vercel.app/demo/](https://livestreamwrapper.vercel.app/demo/)

## In Development

While this remains under a 1.0 release, some things might change.  I am not happy yet with how HLS captions are working, or how styling is applied and plan to do some releases to improve those.

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

Or

```html
<script src="https://cdn.jsdelivr.net/npm/captions-viewer/dist/captions-viewer.min.js"></script>
```

## Add Captions

Provide the path to a caption file the `src` parameter on the element.  The caption file procesesd by the browser-native caption parser for vtt with a backup lightweight parser for srt or if there is a problem.

```html
<script type="module" src="/dist/captions-viewer.min.js"></script>
<video controls>
   <source src="video.mp4" type="video/mp4">
</video>

<captions-viewer src="caption.vtt"></caption-viewer>
```

## Link the video Player and Captions Reader

To make the captions to update when the video is playing, the player's current position (playhead) must be regularly sent to the captions component.  Luckily this is easy to do by using the native video element, and most video players provide a time update event to listen for.

Simple example connecting a native video tag to the component:

```html
<video controls src="video.mp4"></video>

<captions-viewer file="caption.vtt"></caption-viewer>

<script>
const captions = document.querySelector('captions-viewer');
const player = document.querySelector('video');

player.addEventListener('timeupdate', () => {
  captions.playhead = player.currentTime;
})
</script>
```

The component can also jump the player when a cue is clicked.  To do this, setup a listener on the component `seek` event and then seek the video player:

```javascript
captions.addEventListener('seek', e => {
  player.currentTime = e.detail.value;
});
```

When the viewer skips around in the video timeline the captions may not update as quickly as you would like.  To force an immediate jump, turn the debounce time off (to `false`).  This will reset on the next cue so no need to put it back to another value.

```javascript
player.addEventListener('seeking', () => {
  captions.debounceScrolling = false;
});
```

## Tag Parameters

|  Name | Default | Description |
| - | - | - |
| `src`       | null   | Location of the vtt/srt file. |
| `playhead`   | 0      | The current player time, in seconds, to keep the player and reader in-sync. (see more below) |
| `debounce`   | 5000   | Control the time between scrolling. Time in ms between the last scroll (user or automatic) |
| `singleline` | false  | True will show all text for a cue on a single line.  False will obey the line breaks in the caption file. |
| `disable`    | empty  | Turn off displaying `timecode` `chapters` or `text`. Use a pipe `\|` between each option, such as `timecode\|chapters` |
| `youtube` | false | Enable `true` if the caption vtt track came from YouTube for some special handling. |
| `nudge` | 0.5 | Amount in seconds to adjust the cues to trigger sooner. |
| `spacer` | 5 | Time in seconds between cues where a spacer (progress bar) will display |
| `captions` | undefined | Read-only property of the internal object of caption cues. |
| `paused` | false | Read-only property if the reader system is enabled or not. |
| `textTrack` | undefined |  |

### Simple Theming

| Name | Default | Description |
| - | - | - |
| `height`     | 300px  | Height of the scrolling box.  Valid CSS unit. |
| `color` | 360 | The Hue (0-360) of the base color to use.  This is put into an hsla color. |
| `theme` | light, dark | Light theme shades the text darker for a whiter background.  Dark will lighten text for a darker background. |
| `css` | true | True/False to enable the default stylesheet.  False will remove all styling, default is True. See the guide below. |

## Methods

### `pause()`

A toggle to stop/start the component without removing it.  All events, scrolling and updating stop.

```html
<button>Toggle Caption Reading</button>
<script>
...
button.addEventListener('click', () => {
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

Intended for cue updates such as live streaming or HLS, this expects a `textTrack` cue list of all the current cues, plus new cues. This method has better performance by only rendering the new cues, while updating the `textTrack` property is a complete refresh and re-render of all the cues.

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
<captions-viewer>
  <captions-viewer-empty>
    Your Custom Message
  </captions-viewer-empty>
</caption-viewer>
```

## Complete Examples

Show captions for a video using the native caption tracy system, with a dynamic container height, custom color, and only showing timecode and the text.  The theme is set for dark, so the background will darker with lighter captions.

```html
<style>
  /* Hides the component until it has loaded */
  captions-viewer:not(:defined) {
    visibility: hidden
  }
  /* set the container styles */
  captions-viewer {
    font-family: arial;
    display: block;
    background: rgba(0,0,0,.2);
  }
</style>

<video controls>
  <source src="movie.mp4" type="video/mp4">
  <!-- Not required for the reader,
      but best for accessibility to keep them here for the actual player. -->
  <track label="English" kind="subtitles" srclang="en" src="subtitle.vtt" />
</video>

<captions-viewer
  src="subtitle.vtt"
  height="30vw"
  singleline="true"
  color="300"
  theme="dark"
  disable="chapters"
  >
  <captions-viewer-empty></captions-viewer-empty>
</captions-viewer>

<script type="module" src="/dist/captions-viewer.js"></script>
<script type="module">

  const captions = document.querySelector('captions-viewer');
  const player = document.querySelector('video');

  player.onloadeddata = () => {
    captions.textTrack = player.textTracks[0];
  }  

  // Updates the captions.
  player.ontimeupdate = () => {
    captions.playhead = player.currentTime;
  }

  // On click, Seek's player to caption location.
  captions.addEventListener('seek', e => {
    player.currentTime = e.detail.value;
  });

  // (optional) Scroll to the cue when user skips in the player timeline.
  player.onseeking = () => {
    captions.debounceScrolling = false;
  };
</script>
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
