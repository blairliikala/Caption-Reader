var o=class extends HTMLElement{#m=!1;#e;#i="";#s=0;#o="300px";#n=0;#p=!1;#f="";#c="";#l="";#t={};#a=void 0;#h=!1;#d=!1;#r={};#x=3;css=`<style>
    #root {
      scroll-behavior: smooth;
      height: 300px;
      overflow-y: scroll;
      overflow-x: hidden;
      scroll-snap-stop: always;
      position: relative;
      padding: .5rem;
      --base: 360;
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
    .cue:hover, .cue:active, .cue:focus-visible {
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
    [data-theme="dark"] .cue:hover, .cue:active, .cue:focus-visible {
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
  </style>`;constructor(){super(),this.isConnected&&this.#g()}static get observedAttributes(){return["src","playhead","height","debounce","singleline","color","disable"]}attributeChangedCallback(t,s,e){if(t==="playhead"){this.#b(e);return}if(t==="debounce"){this.#n=e;return}this.#u()}set src(t){this.setAttribute("src",t)}set playhead(t){this.setAttribute("playhead",t)}set debounce(t){this.setAttribute("debounce",t)}set singleline(t){if(typeof t!="boolean"){console.warn("debounceScrolling must be a boolean.");return}this.setAttribute("singleline",t)}set disable(t){this.setAttribute("disable",t)}set debounceScrolling(t){if(typeof t!="boolean"){console.warn("debounceScrolling must be a boolean.");return}this.#h=t}set textTrack(t){this.#r=t,this.#u()}get src(){return this.#i}get playhead(){return this.#s}get captions(){return this.#t}get debounce(){return this.#n}get singleline(){return this.#p}get height(){return this.#o}get paused(){return this.#d}get disable(){return this.#c}get theme(){return this.#l}connectedCallback(){this.#g()}#g(){if(this.#m){this.#u();return}this.#m=!0;let t=document.createElement("template");t.innerHTML=`
      ${this.css}
      <section id="root" data-theme=""></section>
    `;let s=t.content.cloneNode(!0);this.attachShadow({mode:"open"}).appendChild(s),this.#e={root:this.shadowRoot?.querySelector("#root")},this.#e.root.addEventListener("click",i=>{let r=i.composedPath()[0].closest("button");if(r&&"localName"in r&&r.localName==="button"){let{index:h}=r.dataset,c=this.#t.cues[h].seconds.start;this.#A("seek",c),this.#b(c+.2)}}),this.#e.root.addEventListener("scroll",()=>{this.#h=!0,setTimeout(()=>{this.#h=!1},this.#n)}),this.#u()}async#u(){this.#i=this.getAttribute("src")||"",this.#s=parseInt(this.getAttribute("playhead"),10)||0,this.#o=this.getAttribute("height")||"400px",this.#n=parseInt(this.getAttribute("debounce"),10)||5e3,this.#p=this.getAttribute("singleline")==="true"||this.getAttribute("singleline")===!0||!1,this.#f=this.getAttribute("color")||"",this.#c=this.getAttribute("disable")||"",this.#l=this.getAttribute("theme")||"";let t=this.getAttribute("styles");if(!(!this.#i&&!("id"in this.#r))){if(this.setTheme(void 0),this.#o!=="400px"&&(this.#e.root.style.height=this.#o),this.#f&&this.#e.root?.setAttribute("style",`--base: ${this.#f}`),t){let s=this.shadowRoot?.querySelector("style");s&&(s.innerHTML+=`${t}`)}if(this.#i&&(console.log("Using the src."),this.#r=await this.#E(this.#i)),this.#r&&Array.from(this.#r.cues).length&&(console.log("Parsing through foo parser."),this.#t=o.parseTextTrack(this.#r)),this.#i&&!this.#t){console.log("Using backup parser.");let s=await fetch(this.#i).then(e=>e.text());s&&(this.#t=o.parseVTT(s))}if(!this.#t||!this.#t.cues||Array.from(this.#r.cues).length===0){console.error("Not able to find and render captions."),this.#e.root.innerHTML='<p class="empty">No captions.</p>';return}this.#w(this.#t.cues),this.#v(),this.querySelector("#cue")?this.#T():this.#y()}}#b(t){if(this.#d)return;this.#s=t,this.#v();let s=this.#t.cues?.findIndex(i=>i.status==="active"),e=this.#e.root.querySelectorAll("[data-progress]");e&&[...e].forEach(i=>{let r=i;r.value=0}),this.#t.cues?.forEach((i,r)=>{if(i.type==="spacer"&&i.status==="active"){let h=Math.round(this.#s-i.seconds.start),c=this.#e.root.querySelector(`[data-progress="${r}"]`);c&&(c.value=h)}}),s!==this.#a&&(this.#a=s,this.#k(),this.#S())}#y(){if(!this.#t)return;let t=this.#c?this.#c.split("|"):[];this.#e.root.innerHTML="";let s='<ol tabindex="0">';this.#t.cues?.forEach((e,i)=>{if(e.timecode){let r=e.status,h=`<span class="timecode">${o.prettyTimecode(e.timecode.start)}</span>`,c=e.chapter?`<span class="chapter">${e.chapter}</span>`:"",l=this.#p?" ":"<br />",d="";e.type==="spacer"&&(d=`<progress max="${Math.round(e.seconds.end-e.seconds.start)}" value="0" data-progress="${i}"></progress>`);let a=`<span class="text">${e.text.join(l)}</span>`;s+=`<li><button type="button" tabindex="${i+1}" class="cue ${r} ${e.type||""}" data-index="${i}">${!t.includes("timecode")&&e.type!=="spacer"?h:""} ${t.includes("chapters")?"":c} ${t.includes("text")?"":a} ${d}</button></li>`}}),s+="</ol>",this.#e.root.innerHTML=s}#T(){let t=this.querySelector("#cue");this.#t.cues?.forEach((s,e)=>{if(!s.timecode)return;let i=o.prettyTimecode(s.timecode.start),r=s.chapter?s.chapter:"",{text:h}=s.text,l=t.content.cloneNode(!0).firstElementChild;l.setAttribute("data-index",e);let d=l.querySelector("[data-timecode]");d&&(d.innerHTML=i);let a=l.querySelector("[data-text]");a&&(a.innerHTML=h);let n=l.querySelector("[data-chapter]");n&&(n.innerHTML=r),this.#e.stuff.appendChild(l)})}#k(){this.#e.root.querySelectorAll("[data-index]").forEach(s=>{let{index:e}=s.dataset,i=this.#t.cues[e];s.classList.remove("upcoming","next","active","previous","passed"),s.classList.add(i.status)})}#v(){if(!this.#t)return;this.#t.cues=this.#t.cues.map(e=>(e.seconds.end<this.#s&&(e.status="passed"),e.seconds.start>this.#s&&(e.status="upcoming"),e.seconds.start<this.#s&&e.seconds.end>this.#s&&(e.active=!0,e.status="active"),e));let t=this.#t.cues.filter(e=>e.status==="passed"),s=this.#t.cues.findIndex(e=>e.status==="upcoming");s>0&&(this.#t.cues[s].status="next"),t&&t.length>0&&(this.#t.cues[t.length-1].status="previous")}#S(){if(!this.#a||this.#a<0||this.#h)return;let s=this.#e.root.querySelectorAll("li")[this.#a],e=s.offsetHeight,i=s.offsetTop;this.#e.root.scrollTop=i-e}pause(){this.#d=!this.#d}#A(t,s,e){this.dispatchEvent(new CustomEvent("all",{detail:{name:t,value:s,full:e}})),this.dispatchEvent(new CustomEvent(t,{detail:{value:s,full:e}}))}async#E(t){let s=document.createElement("track");s.mode="hidden",s.default=!0,s.src=t;let e=document.createElement("video");e.setAttribute("id","tempVid"),e.appendChild(s),this.#e.root.appendChild(e);let i=this.#e.root.querySelector("#tempVid");return await o.trackReady(i),i.textTracks[0]}static trackReady(t){let s=0;return new Promise(e=>{let i=setInterval(()=>{s+=1,s>50&&(clearInterval(i),e()),Array.from(t.textTracks[0].cues).length&&(clearInterval(i),e())},1)})}static parseTextTrack(t){if(!t.cues)return console.warn("No cues found in the text track."),{};let s=Object.entries(t.cues).map(i=>{let r=i[1];return{chapter:r.id,status:"",text:r.text.split(`
`),seconds:{start:r.startTime-.5,end:r.endTime},timecode:{start:o.secondsToTimecode(r.startTime),end:o.secondsToTimecode(r.endTime)}}});return{kind:t.kind,lang:t.language,label:t.label,header:t.id,styles:void 0,cues:s}}static timecodeToSeconds(t){let s=t.split(":"),e=parseInt(s[0],10),i=parseInt(s[1],10),r=parseInt(s[2],10);return e*3600+i*60+r}static isValidJSON(t){return/^[\],:{}\s]*$/.test(t.replace(/\\["\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))}static isTimecode(t){return/^[0-9][0-9]/.test(t)}static prettyTimecode(t){let s=t.split(":");if(s.length===0)return[];s.length-1===2&&s[0]==="00"&&s.splice(0,1);let e=s[s.length-1];return e=e.replace(",","."),e=Math.round(e),e<10&&(e=`0${e}`),s[s.length-1]=e,s.join(":")}static secondsToTimecode(t){return t==null?"":t<0?"00:00:00":new Date(t*1e3).toISOString().substring(11,11+8)}static getTheme(t){return t==="light"?"light":t==="dark"?"dark":matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}setTheme(t){let s=o.getTheme(t||this.#l||"");this.#l=s,this.#e.root.dataset.theme=s}#w(t){let s=this.#x,e=!1;t.forEach((i,r)=>{let h=t[r+1];if(e){e=!1;return}if(!h)return;if(h.seconds.start-i.seconds.end>s){let l=i.seconds.end,d=h.seconds.start,a={chapter:"",text:[""],status:"",type:"spacer",timecode:{start:o.secondsToTimecode(l),end:o.secondsToTimecode(l)},seconds:{start:l,end:d}};this.#t.cues.splice(r+1,0,a),e=!0}})}static parseVTT(t,s){let e=t.split(`
`),i={kind:s||e[0].startsWith("WEBVTT"),lang:void 0,header:void 0,styles:void 0,cues:[]},r={text:[]},h=0,c=!1,l="",d="";for(let a of e){if(a.startsWith("WEBVTT")){let n=a.split(" - ");n.length>0&&(i.header=n[1])}else if(a.startsWith("Kind")){let n=a.split(":");i.kind=n[1]?.trim()}else if(a.startsWith("Language")){let n=a.split(":");i.lang=n[1]?.trim()}else if(a.startsWith("STYLE"))c=!0,d="styles";else if(!a.startsWith("NOTE"))if(c===!0&&a!=="")l+=a;else if(c===!0&&a==="")i.styles=l,c=!1,l="";else if(a!==""&&o.isTimecode(e[h+1]))r.chapter=a;else if(o.isTimecode(a)){let n=a.split("-->");r.timecode={start:n[0].trim(),end:n[1].trim()},r.seconds={start:o.timecodeToSeconds(n[0])-.5,end:o.timecodeToSeconds(n[1])},r.length=n[0].trim()+n[1].trim();let u=a.split(" ");u.length>2&&(r.styles=u.splice(3).join(" "))}else a!==""&&r.text.push(a);a===""&&r.timecode?.start!==void 0&&(c&&(c=!1,d=""),r.active=!1,i.cues.push(r),r={text:[]}),h+=1}return i}};window.customElements.define("captions-viewer",o);
