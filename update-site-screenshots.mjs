import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='../iyal-ink/actone';
const themes=[['dark','Classic Dark','#101010'],['light','Classic Light','#eeeeee'],['catppuccin-mocha','Catppuccin Mocha','#11111b'],['catppuccin-latte','Catppuccin Latte','#eff1f5'],['plum','Plum','#1e1428'],['sunrise','Sunrise','#fffaf0'],['ocean','Ocean','#0e1a28'],['rose','Rose','#fdf0f4'],['forest','Forest','#101a14'],['mint','Mint','#f0faf2'],['berry','Berry','#1a1016'],['honey','Honey','#fefaf0']];
const features=['Editor','Navigator','Xray','Multi-Scripts','Prose','Canvas','Marker','UrAI','Export'];
await fs.mkdir(`${root}/assets/screenshots`,{recursive:true});
const items=[...features.map(n=>({name:`A1-${n}`,input:`A1-${n}.png`})),...themes.map(([id])=>({name:`A1-Editor-${id}`,input:`themes/A1-Editor-${id}.png`}))];
for(const item of items){for(const width of [1280,1920,3840])await sharp(`${root}/assets/screenshots-4k/${item.input}`).resize(width).webp({lossless:true}).toFile(`${root}/assets/screenshots/${item.name}-${width}.webp`);}
let html=await fs.readFile(`${root}/index.html`,'utf8');
html=html.replace(/<button class="screenshot-link"[^>]*><img src="\.\.\/assets\/website%20images\/(A1-[^"]+)\.png"([^>]+)><\/button>/g,(_,name,attrs)=>{
 attrs=attrs.replace(/width="\d+"/,'width="3840"').replace(/height="\d+"/,'height="2160"');
 if(name==='A1-Xray')attrs=attrs.replace(/alt="[^"]*"/,'alt="X-Ray World analysis showing scene settings, times of day, and locations in Interstellar"');
 if(name==='A1-Export')attrs=attrs.replace(/alt="[^"]*"/,'alt="PDF export settings with a live preview scrolled to page 6 of Interstellar"');
 return `<button class="screenshot-link" type="button" aria-haspopup="dialog" data-fullsize="assets/screenshots-4k/${name}.png"><img src="assets/screenshots/${name}-1920.webp" srcset="assets/screenshots/${name}-1280.webp 1280w, assets/screenshots/${name}-1920.webp 1920w, assets/screenshots/${name}-3840.webp 3840w" sizes="${name==='A1-Editor'?'(max-width: 760px) calc(100vw - 40px), (max-width: 1272px) calc(100vw - 112px), 1160px':'(max-width: 760px) calc(100vw - 40px), 720px'}"${attrs}></button>`;
});
html=html.replace('X-Ray brings pacing, dialogue, and character presence into view. Find the patterns that are hard to see on the page.','Explore pacing, characters, and the world of your screenplay. X-Ray reveals patterns in your scenes, locations, and times of day.');
const back=['light','catppuccin-mocha','plum','ocean','rose'].map((id,i)=>{const theme=themes.find(t=>t[0]===id);return `    <figure class="theme-card theme-card-back theme-card-${i+1}" aria-hidden="true"><figcaption>${theme[1]}</figcaption><img src="assets/screenshots/A1-Editor-${id}-1280.webp" alt="" width="3840" height="2160" loading="lazy"></figure>`;}).join('\n');
const swatches=themes.map(([id,name,color],i)=>`    <button class="theme-swatch" type="button" data-theme="${id}" data-theme-name="${name}" aria-label="Preview ${name}" aria-pressed="${i===0}" title="${name}" style="--swatch:${color}"><span aria-hidden="true"></span><span class="sr-only">${name}</span></button>`).join('\n');
const section=`<section class="theme-showcase wrap" id="themes" aria-labelledby="themes-heading">
  <div class="theme-intro"><p class="eyebrow">A workspace that feels like you</p><h2 id="themes-heading">Your story.<br>Your <em>shade.</em></h2><p>A quiet dark desk. A little daylight. A touch of color.<br>Find the theme that feels right for your next scene.</p></div>
  <div class="theme-stage">
${back}
    <figure class="theme-card theme-card-front">
      <button class="screenshot-link" id="theme-preview" type="button" aria-haspopup="dialog" data-fullsize="assets/screenshots-4k/themes/A1-Editor-dark.png"><img src="assets/screenshots/A1-Editor-dark-1920.webp" srcset="assets/screenshots/A1-Editor-dark-1280.webp 1280w, assets/screenshots/A1-Editor-dark-1920.webp 1920w, assets/screenshots/A1-Editor-dark-3840.webp 3840w" sizes="(max-width: 760px) calc(100vw - 48px), 960px" width="3840" height="2160" loading="lazy" alt="ActOne screenplay editor in Classic Dark"></button>
      <figcaption><span id="theme-preview-name">Classic Dark</span><span>Click to explore</span></figcaption>
    </figure>
  </div>
  <div class="theme-picker" role="group" aria-label="Preview editor themes">
${swatches}
  </div>
  <p class="theme-selection" aria-live="polite"><span id="theme-selection-name">Classic Dark</span><span aria-hidden="true"> / </span>12 shades to explore</p>
  <div class="custom-theme-note"><span class="custom-theme-icon" aria-hidden="true">✳</span><div><h3>Or make it entirely yours.</h3><p>Create a custom theme with your own colors. Save your palette, export it, and share it with another writer.</p></div></div>
</section>
`;
if(!html.includes('id="themes"'))html=html.replace('<div class="ownership-note wrap">',section+'<div class="ownership-note wrap">');
await fs.writeFile(`${root}/index.html`,html);
console.log(`Prepared ${items.length} screenshots in three responsive sizes and updated the website.`);
