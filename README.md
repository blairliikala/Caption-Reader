# \<captions-viewer>

A web component to display captions as a video plays. Includes automatic scrolling to the caption cue, and events when a chapter is clicked.

## Basic Usage

## Install

```bash
npm i captions-viewer
```

## Add Captions

Provide the path to a caption file the `src` parameter on the element.  The caption file procesesd by the browser-native caption parser for vtt with a backup lightweight parser for srt or if there is a problem.

```html
<video controls>
   <source src="video.mp4" type="video/mp4">
</video>

<captions-viewer src="caption.vtt"></caption-viewer>
```

## Link Elements

To make the captions to update when the video is playing, the player's current position (playhead) must be regularly sent to the captions component.  Luckily this is easy to do by using the native video element, and most video players provide a time update event to listen for.

Example connecting a native video tag to the component;

```html
<video controls src="video.mp4"></video>

<captions-viewer file="caption.vtt"></caption-viewer>

<script>
const captions = document.querySelector('captions-viewer');
const player = document.querySelector('video');

player.addEventListener('timeupdate', (e) => {
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
| `src`       | null   | (required) Location of the vtt/srt file. |
| `playhead`   | 0      | The time the player is at, in seconds.  Used to keep the player and reader in-sync. (see more below) |
| `height`     | 300px  | Height of the scrolling box.  Valid CSS unit. |
| `debounce`   | 5000   | Control the time between scrolling. Time in ms between the last scroll (user or automatic) |
| `singleline` | false  | True will show all text for a cue on a single line.  False will obey the line breaks in the caption file. |
| `color` | 360 | The Hue (0-360) of the base color to use.  This is put into an hsla color. |
| `disable`    | empty  | Turn off displaying `timecode` `chapters` or `text`. Use a pipe `\|` between each option, such as `timecode\|chapters` |
| `theme` | light, dark | Light theme shades the text darker for a whiter background.  Dark will lighten text for a darker background. |
| `youtube` | false | Enable `true` if the caption vtt track came from YouTube for some special handling. |

## Methods

### `pause()`

Calling this method will toggle pausing the automatic reading.

```html
<button>Toggle Caption Reading</button>
<script>
...
button.addEventListener('click', () => {
  captions.pause();
})
</script>
```

### `setTheme(theme)`

Calling this method with the name of the theme will immediately change the color scheme.  Options are currently only `dark` for making the text lighter for dark backgrounds, `light` for dark text on ligher backgrounds, and blank/empty for user's system theme.

```javascript
captions.setTheme('dark');
```

## Events

|  Name | Description |
| - | - |
| `error` | Fired when an error occurs. Returns the text description of the error. |
| `seek` | Fired when a click/select is made on a caption cue. Returns the start of that cue in seconds. |

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
    margin: 1em 0;
    border: 3px solid hsla(200, 20%, 50%, .5);
    border-radius: 5px;
    font-family: arial;
    display: block;
    background: rgba(0,0,0,.2);
  }
</style>

<video controls width="100%" playsinline autopictureinpicture>
  <source src="content/dune/dune.mp4" type="video/mp4">
  <track label="English" kind="subtitles" srclang="en" src="content/dune/dune_en.vtt" default />
</video>

<captions-viewer
  height="30vw"
  singleline="true"
  color="300"
  theme="dark"
  disable="chapters"
>
</captions-viewer>

<script type="module" src="../../captions-viewer.js"></script>
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

Download the vtt option from YouTube in the Creator Studio and make it available online.

**Note** when using the vtt file, one edit needs to be made to the first cue.  Normally there is a blank line between the timecode and cue code.  Due to an issue with Firefox, add text in this blank line.  Any text will do, and will be removed by the parser.

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
