export function defaultStyles() {
  return `<style id="theme_a">
  #root {
    display: block;
    scroll-behavior: smooth;
    height: 300px;
    overflow-y: scroll;
    overflow-x: hidden;
    scroll-snap-stop: always;
    position: relative;
    padding: .5rem;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    --base: 360;

    --gray-10-sat: 10%;
    --gray-10-light: 10%;
    --gray-10-opacity: 0.1;
    --gray-20-sat: 10%;
    --gray-20-light: 10%;
    --gray-20-opacity: 0.2;
    --gray-70-opacity: 0.7;
    --inactive: hsla(var(--base), 20%, 40%, 0.9);
    --inactive-90: hsla(var(--base), 20%, 40%, 0.5);
    --active-primary: hsla(var(--base), 0%, 30%, 1);
    --active-secondary: hsla(var(--base), 40%, 70%, 1);
    --highlight: hsla(var(--base), 50%, 50%, 0.9);
  }
  [data-theme="dark"]#root {
    --gray-10-sat: 10%;
    --gray-10-light: 10%;
    --gray-10-opacity: 0.1;
    --gray-20-sat: 10%;
    --gray-20-light: 10%;
    --gray-20-opacity: 0.2;
    --gray-70-opacity: 0.7;
    --inactive: hsla(var(--base), 10%, 80%, 0.7);
    --inactive-90: hsla(var(--base), 10%, 80%, 0.5);
    --active-primary: hsla(var(--base), 0%, 100%, 1);
    --active-secondary: hsla(var(--base), 20%, 80%, 1);
    --highlight: hsla(var(--base), 50%, 60%, 0.9);
  }
  #root * {
    box-sizing: border-box;
  }
  .empty {
    color: hsla(var(--base), var(--gray-10-sat), var(--gray-10-light), var(--gray-70-opacity));
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
    padding: 0.4rem 10% 0.4rem .4rem;
    display: flex;
    gap: 1rem;
    transform: scale(1);
    transform-origin: left;
    color: var(--inactive);
    transition: all .3s ease;
    background: none;
    width: 100%;
    text-align: start;
    border-left: 2px solid hsla(var(--base), 60%, 70%, 0.1);
    border-radius: 0;
    color: transparent;
    text-shadow: 0 0 2px var(--inactive-90);
    font-weight: bold;
  }
  .cue:focus {
    background: none;
    border: none;
    outline: none;
  }
  .cue:hover, .cue:active {
    cursor: pointer;
    color: var(--active-secondary);
    background: none;
    border-left-color: var(--highlight);
    outline: 1px solid var(--highlight);
    text-shadow: none;
  }
  @supports (-webkit-touch-callout: none) {
    .cue:hover {
      outline: none;
    }
  }
  .cue:focus-visible, .cue:focus {
    cursor: pointer;
    border-left-color: var(--highlight);
    outline: 1px solid var(--highlight);
    color: var(--secondary);
    background: none;
    text-shadow: none;
  }
  .cue:hover {
    background :none;
  }
  .upcoming {
    transform: scale(1);
    transform-origin: left;
  }
  .next {
    transform: scale(1);
    transform-origin: left;
    text-shadow: none;
    color: var(--inactive);
  }
  .active {
    transform: scale(1.05);
    transform-origin: left;
    border-color: var(--highlight);
    text-shadow: none;
    font-weight: bold;
    color: var(--active-secondary);
  }
  .active .timecode {
    color: var(--active-secondary);
  }
  .active .chapter {
    color: var(--active-secondary);
  }
  .active .text  {
    color: var(--active-primary);
  }
  .active .sub_active {
    text-decoration: underline;
  }
  .previous {
    color: var(--inactive);
  }
  .passed  {
    transform: scale(1);
    transform-origin: left;
  }
  .scrolling .cue {
    text-shadow: none;
    color: var(--inactive);
  }
  @media (prefers-reduced-motion) {
    .active {
      transform: scale(1);
    }
  }
  progress {
    appearance: none;
    background: hsla(var(--base), var(--gray-10-sat), var(--gray-10-light), var(--gray-10-opacity));
    border: none;
    border-radius: 2px;
    height: 8px;
    align-self: center;
  }
  progress[value]::-webkit-progress-bar {
    background: hsla(var(--base), var(--gray-20-sat), var(--gray-20-light), var(--gray-20-opacity));
    box-shadow: none;
  }
  progress[value]::-moz-progress-bar {
    background: hsla(var(--base), var(--gray-20-sat), var(--gray-20-light), var(--gray-20-opacity));
    box-shadow: none;
  }
  progress[value]::-webkit-progress-value {
    background: hsla(var(--base), var(--gray-20-sat), var(--gray-20-light), var(--gray-20-opacity));
    box-shadow: none;
  }
  </style>`;
}
