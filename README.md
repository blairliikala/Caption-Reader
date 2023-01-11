# \<captions-viewer>

A web component to display captions as a video plays. Includes automatic scrolling to the caption cue, and events when a chapter is clicked.

## Usage

First add video and the component to a web page.  Add the caption file to the component using the `file` parameter. Then connect the component to the player with a little bit of scripting.  The component needs to know the player's time (in seconds) to stay in sync.  

Example connecting a native video tag to the component;

```html
<video controls src="video.mp4"></video>

<captions-viewer file="caption.vtt"></caption-viewer>

<script type="module" src="../../captions-viewer.js"></script>
<script>
/*
 - The timeupdate fires a few times a second during playback.
 - player.currentTime gets the <video> playhead location in seconds.
 - component.playhead tells the component where the player is at to show the right caption cue.
*/  
const component = document.querySelector('captions-viewer');
const player = document.querySelector('video');

player.addEventListener('timeupdate', (e) => {
  component.playhead = player.currentTime;
})
</script>
```

To enable player seeking when a cue is clicked, listen for the component event and seek the video player:

```javascript
component.addEventListener('seek', e => {
  player.currentTime = e.detail.value;
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

### `pause`

Toggle pausing the automatic reading.

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





## Installation

```bash
npm i captions-viewer
```

## Linting and formatting

To scan the project for linting and formatting errors, run

```bash
npm run lint
```

To automatically fix linting and formatting errors, run

```bash
npm run format
```
