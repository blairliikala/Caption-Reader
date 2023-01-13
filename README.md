# \<captions-viewer>

A web component to display captions as a video plays. Includes automatic scrolling to the caption cue, and events when a chapter is clicked.

## Basic Usage

## Install

```bash
npm i captions-viewer
```

Add video and the component to a web page.

```html
<video controls>
   <source src="video.mp4" type="video/mp4">
</video>

<captions-viewer></caption-viewer>

<script type="module" src="../../captions-viewer.js"></script>
```

## Add Captions

### Option 1: TextTrack Method (recomended)

Using a native `video` element or player, provide the `textTrack` object ([offical docs](https://developer.mozilla.org/en-US/docs/Web/API/TextTrack)).  First include the text track html in the video element, then push the object to the component.  This has the major advantage of allowing captions in the video player, and using the browser's more robust caption decoder.

```html
<video controls>
   <source src="video.mp4" type="video/mp4">
   <!-- Add text tracks -->
   <track label="English" kind="subtitles" srclang="en" src="en.vtt" default />
   <track label="French" kind="subtitles" srclang="fr" src="fr.vtt" />
   <track label="Spanish" kind="subtitles" srclang="es" src="es.es" />
</video>

<captions-viewer></caption-viewer>

<script>
    const component = document.querySelector('captions-viewer');
    const player = document.querySelector('video');
    const track = 0; // index of the caption you want to use.
    component.textTrack = player.textTracks[track];
</script>
```

### Option 2: File

Provide the path to a caption file the `file` parameter on the element.  This uses a lightweight caption parser and may be a bit more strict to file types.

```html
<video controls>
   <source src="video.mp4" type="video/mp4">
</video>

<captions-viewer file="caption.vtt"></caption-viewer>
```

## Link Elements

For the captions to update when the player is playing, the player's current position (playhead) must be sent to the captions component on a regular basis.  Luckily this is easy to do with the native video element, and most video players provide a time update event to listen for.

Example connecting a native video tag to the component;

```html
<video controls src="video.mp4"></video>

<captions-viewer file="caption.vtt"></caption-viewer>

<script>
const component = document.querySelector('captions-viewer');
const player = document.querySelector('video');

player.addEventListener('timeupdate', (e) => {
  component.playhead = player.currentTime;
})
</script>
```

The component can also jump the player when a cue is clicked.  To do this, setup a listener on the component `seek` event and then seek the video player:

```javascript
component.addEventListener('seek', e => {
  player.currentTime = e.detail.value;
});
```

When the viewer skips around in the video timeline the captions may not update as quickly as you would like.  To force an immediate jump, turn the debounce time off (to `false`).  This will reset on the next cue so no need to put it back to another value.

```javascript
player.addEventListener('seeking', () => {
  component.debounceScrolling = false;
});
```

## Tag Parameters

|  Name | Default | Description |
| - | - | - |
| `file`       | null   | (required) Location of the vtt/srt file. |
| `height`     | 300px  | Height of the scrolling box.  Valid CSS unit. |
| `singleline` | false  | True will show all text for a cue on a single line.  False will obey the line breaks in the caption file. |
| `playhead`   | 0      | The time the player is at, in seconds.  Used to keep the player and reader in-sync. (see more below) |
| `debounce`   | 5000   | Control the time between scrolling. Time in ms between the last scroll (user or automatic) |
| `disable`    | empty  | Turn off displaying `timecode` `chapters` or `text`. Use a `|` between each option, such as `timecode|chapters` |
| `color` | 360 | The Hue (0-360) of the base color to use.  This is put into an hsla color. |

## Methods

### `pause()`

Calling this method will toggle pausing the automatic reading.

```html
<button>Toggle Caption Reading</button>
<script>
...
const component = document.querySelector('captions-viewer');
const button document.querySelector('button')
button.addEventListener('click', () => {
  component.pause();
})
</script>
```

### `setTheme(theme)`

Calling this method with the name of the theme will immediately change the color scheme.  Options are currently only `dark` for making the text lighter for dark backgrounds, `light` for dark text on ligher backgrounds, and blank/empty for user's system theme.

```javascript
component.setTheme('dark');
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

  const component = document.querySelector('captions-viewer');
  const player = document.querySelector('video');

  player.onloadeddata = () => {
    component.textTrack = player.textTracks[0];
  }  

  // Updates the captions.
  player.ontimeupdate = () => {
    component.playhead = player.currentTime;
  }

  // On click, Seek's player to caption location.
  component.addEventListener('seek', e => {
    player.currentTime = e.detail.value;
  });

  // (optional) Scroll to the cue when user skips in the player timeline.
  player.onseeking = () => {
    component.debounceScrolling = false;
  };
</script>
```


REMOVE:

## Linting and formatting

To scan the project for linting and formatting errors, run

```bash
npm run lint
```

To automatically fix linting and formatting errors, run

```bash
npm run format
```
