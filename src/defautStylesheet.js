export function defaultStyles() {
  return `<style>
    #root {
      display: block;
      scroll-behavior: smooth;
      height: 300px;
      overflow-y: scroll;
      overflow-x: hidden;
      scroll-snap-stop: always;
      position: relative;
      padding: .5rem;
      --base: 360;
    }
    #root * {
      box-sizing: border-box;
    }
    .empty {
      color: hsla(var(--base), 20%, 40%, .9);
    }
    ol {
      padding: 0;
      margin: 0;
    }
    li {
      list-style:none;
      width: 100%;
    }
    .cue {
      border: none;
      font: inherit;
      padding: 0.4rem 1.5rem .4rem .2rem;
      display: flex;
      gap: 1rem;
      list-style: none;
      transform: scale(1);
      transform-origin: left;
      color: hsla(var(--base), 20%, 40%, .9);
      transition: color 0.3s ease, font-size .2s ease, transform .1s ease;
      background: none;
      width: 100%;
      text-align: start;
    }
    @media(hover: hover) and (pointer: fine) {
      .cue:hover, .cue:active {
        cursor: pointer;
        background: hsla(var(--base), 60%, 70%, .1);
        outline: 1px solid hsla(var(--base), 60%, 50%, .1);
        color: hsla(var(--base), 10%, 20%, 1);
      }
    }
    .cue:focus-visible {
      cursor: pointer;
      background: hsla(var(--base), 60%, 70%, .1);
      outline: 1px solid hsla(var(--base), 60%, 50%, .1);
      color: hsla(var(--base), 10%, 20%, 1);
    }    
    .upcoming, .upcoming:focus-visable {
      color: hsla(var(--base), 20%, 60%, .7);
      transform: scale(1);
      transform-origin: left;
    }
    .next, .next:focus-visable {
      color: hsla(var(--base), 20%, 40%, .9);
      transform: scale(1);
      transform-origin: left;
    }
    .active {
      transform: scale(1.1);
      transform-origin: left;
      padding-right: 10%;
    }
      .active .timecode, .active .chapter {
        color: hsla(var(--base), 50%, 30%, 1);
      }
      .active .text, .active .chapter {
        color: hsla(var(--base), 0%, 30%, 1);
        font-weight: bold;
      }
    .passed, .passed:focus-visable  {
      color: hsla(var(--base), 20%, 60%, .7);
      transform: scale(1);
      transform-origin: left;
    }
    .spacer .text {
      color: hsla(var(--base), 20%, 60%, .5);
      letter-spacing: 5px;
      font-weight: bold;
    }

    [data-theme="dark"] .empty {
      color: hsla(var(--base), 30%, 80%, .9);
    }
    [data-theme="dark"] .cue {
      color: hsla(var(--base), 10%, 80%, .7);
    }
    @media(hover: hover) and (pointer: fine) {
      [data-theme="dark"] .cue:hover,
      [data-theme="dark"] .cue:active,
      [data-theme="dark"] .cue:focus {
        background: hsla(var(--base), 60%, 70%, .1);
        outline: 1px solid hsla(var(--base), 60%, 50%, .1);
        color: hsla(var(--base), 0%, 100%, 1);
      }
    }
    [data-theme="dark"] .cue:focus-visible {
      background: hsla(var(--base), 60%, 70%, .1);
      outline: 1px solid hsla(var(--base), 60%, 50%, .1);
      color: hsla(var(--base), 0%, 100%, 1);
    }
    [data-theme="dark"] .upcoming, .upcoming:focus-visable {
      color: hsla(var(--base), 10%, 80%, .7);
    }
    [data-theme="dark"] .next, .next:focus-visable {
      color: hsla(var(--base), 20%, 80%, .9);
    }
    [data-theme="dark"] .active .timecode,
    [data-theme="dark"] .active .chapter
    {
      color: hsla(var(--base), 50%, 80%, 1);
    }
    [data-theme="dark"] .active .text,
    [data-theme="dark"] .active .chapter
    {
      color: hsla(var(--base), 0%, 100%, 1);
    }

    [data-theme="dark"] .previous, .previous:focus-visable {
      color: hsla(var(--base), 20%, 80%, .9);
    }
    [data-theme="dark"] .passed, .passed:focus-visable {
      color: hsla(var(--base), 10%, 80%, .7);
    }

    @media (prefers-reduced-motion) {
      .active, .previous {
        font-size: unset;
      }
    }

    progress {
      appearance: none;
      background: hsla(var(--base), 10%, 10%, .1);
      border: none;
      border-radius: 2px;
      height: 8px;
      align-self: center;
    }

    progress[value]::-webkit-progress-bar {
      background: hsla(var(--base), 10%, 10%, .2);
      box-shadow: none;
    }

    progress[value]::-moz-progress-bar {
      background: hsla(var(--base), 10%, 10%, .2);
      box-shadow: none;
    }
    progress[value]::-webkit-progress-value {
      background: hsla(var(--base), 10%, 10%, .2);
      box-shadow: none;
    }

    .active .sub_upcoming {
    }
    .active .sub_active {
      text-decoration: underline;
    }
  </style>`;
}
