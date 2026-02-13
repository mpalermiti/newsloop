(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const e of s.addedNodes)e.tagName==="LINK"&&e.rel==="modulepreload"&&r(e)}).observe(document,{childList:!0,subtree:!0});function o(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(a){if(a.ep)return;a.ep=!0;const s=o(a);fetch(a.href,s)}})();async function v(){try{const t=await fetch("https://corsproxy.io/?"+encodeURIComponent("https://www.techmeme.com/feed.xml"));if(!t.ok)throw new Error(`HTTP error! status: ${t.status}`);const n=await t.text(),a=new DOMParser().parseFromString(n,"text/xml").querySelectorAll("item"),s=[];return a.forEach((e,d)=>{if(d<20){const l=e.querySelector("title")?.textContent||"",i=e.querySelector("link")?.textContent||"",c=e.querySelector("description")?.textContent||"",f=e.querySelector("pubDate")?.textContent||"";let p="";try{p=new URL(i).hostname.replace("www.","")}catch{p="techmeme.com"}s.push({title:l,link:i,description:h(c),domain:p,pubDate:w(f)})}}),s}catch(t){return console.error("Error fetching Techmeme:",t),[]}}function h(t){const n=document.createElement("div");return n.innerHTML=t,n.textContent||n.innerText||""}function w(t){const n=new Date(t),r=new Date-n,a=Math.floor(r/6e4),s=Math.floor(r/36e5);return a<60?`${a}m ago`:s<24?`${s}h ago`:n.toLocaleDateString("en-US",{month:"short",day:"numeric"})}const m=document.querySelector("#app");m.innerHTML=`
  <div class="news-container">
    <h1 class="page-title">Latest tech news</h1>
    <div class="loading">Loading latest tech news...</div>
  </div>
`;async function u(){const t=document.querySelector(".news-container"),n=await v();if(n.length===0){t.querySelector(".error")||(t.innerHTML+='<div class="error">Failed to load news. Retrying...</div>');return}const o=document.createElement("div");o.className="news-grid",n.forEach((e,d)=>{const l=d%8+1,i=document.createElement("div");i.className=`news-card card-type-${l}`,i.dataset.link=e.link,i.style.animationDelay=`${d*.05}s`;const c=`
      <div class="news-card-header">
        <span class="option-badge">Option ${l}</span>
        <span class="news-source">${e.domain}</span>
        <span class="news-time">${e.pubDate}</span>
      </div>
      <h3 class="news-title">${e.title}</h3>
    `;switch(l){case 1:i.innerHTML=`
          ${c}
          <p class="news-description">${e.description?e.description.substring(0,100)+"...":""}</p>
          <div class="expand-content">
            <p class="full-description">${e.description||""}</p>
            <p class="ai-summary"><strong>Quick take:</strong> ${e.description?e.description.substring(0,150):""}</p>
            <a href="${e.link}" target="_blank" class="read-link">Read full article →</a>
          </div>
          <button class="expand-btn">Expand ▼</button>
        `;break;case 2:i.innerHTML=`
          ${c}
          <p class="news-description">${e.description?e.description.substring(0,100)+"...":""}</p>
          <div class="hover-peek">
            <div class="reading-time">⏱ 3 min read</div>
            <div class="quick-actions">
              <button class="action-btn">🔖 Save</button>
              <button class="action-btn">🔗 Share</button>
              <a href="${e.link}" target="_blank" class="action-btn">📖 Read</a>
            </div>
          </div>
        `;break;case 3:i.innerHTML=`
          ${c}
          <p class="news-description">${e.description?e.description.substring(0,100)+"...":""}</p>
          <button class="preview-btn">Preview →</button>
        `,i.dataset.description=e.description;break;case 4:i.innerHTML=`
          ${c}
          <p class="news-description">${e.description?e.description.substring(0,100)+"...":""}</p>
          <div class="longpress-hint">Press & hold to preview</div>
          <div class="preview-overlay">
            <div class="preview-content">
              <h4>${e.title}</h4>
              <p>${e.description||""}</p>
              <a href="${e.link}" target="_blank">Read article →</a>
            </div>
          </div>
        `;break;case 5:i.innerHTML=`
          <div class="swipe-actions-left">
            <div class="swipe-action bookmark">🔖 Bookmark</div>
          </div>
          <div class="swipe-actions-right">
            <div class="swipe-action share">🔗 Share</div>
          </div>
          <div class="card-content">
            ${c}
            <p class="news-description">${e.description?e.description.substring(0,100)+"...":""}</p>
            <div class="swipe-hint">← Swipe left or right →</div>
          </div>
        `;break;case 6:i.innerHTML=`
          ${c}
          <div class="reading-meta">
            <span class="read-time">⏱ 3 min read</span>
            <span class="progress">Progress: 0%</span>
          </div>
          <p class="news-description">${e.description?e.description.substring(0,100)+"...":""}</p>
          <a href="${e.link}" target="_blank" class="read-link">Read article →</a>
        `;break;case 7:i.innerHTML=`
          ${c}
          <p class="news-description">${e.description?e.description.substring(0,100)+"...":""}</p>
          <div class="related-popover">
            <div class="related-title">Related Stories:</div>
            <div class="related-item">• AI regulation updates</div>
            <div class="related-item">• Tech company layoffs</div>
            <div class="related-item">• Industry analysis</div>
          </div>
          <a href="${e.link}" target="_blank" class="read-link">Read article →</a>
        `;break;case 8:i.innerHTML=`
          ${c}
          <p class="news-description">${e.description?e.description.substring(0,100)+"...":""}</p>
          <div class="actions-toolbar">
            <button class="toolbar-btn">🔖</button>
            <button class="toolbar-btn">🔗</button>
            <button class="toolbar-btn">💾</button>
            <a href="${e.link}" target="_blank" class="toolbar-btn">📖</a>
          </div>
        `;break}o.appendChild(i)});const r=t.querySelector(".loading");r&&r.remove();const a=t.querySelector(".error");a&&a.remove();const s=t.querySelector(".news-grid");s&&s.remove(),t.appendChild(o),g()}function g(){document.querySelectorAll(".card-type-1 .expand-btn").forEach(t=>{t.addEventListener("click",n=>{n.stopPropagation();const o=t.closest(".news-card");o.classList.toggle("expanded"),t.textContent=o.classList.contains("expanded")?"Collapse ▲":"Expand ▼"})}),document.querySelectorAll(".card-type-3 .preview-btn").forEach(t=>{t.addEventListener("click",n=>{n.stopPropagation();const o=t.closest(".news-card"),r=document.createElement("div");r.className="slide-panel",r.innerHTML=`
        <button class="close-panel">✕</button>
        <h2>${o.querySelector(".news-title").textContent}</h2>
        <p>${o.dataset.description}</p>
        <a href="${o.dataset.link}" target="_blank" class="read-link">Read full article →</a>
      `,document.body.appendChild(r),setTimeout(()=>r.classList.add("open"),10),r.querySelector(".close-panel").addEventListener("click",()=>{r.classList.remove("open"),setTimeout(()=>r.remove(),300)})})}),document.querySelectorAll(".card-type-4").forEach(t=>{let n;t.addEventListener("mousedown",()=>{n=setTimeout(()=>{t.classList.add("show-preview")},500)}),t.addEventListener("mouseup",()=>{clearTimeout(n)}),t.addEventListener("mouseleave",()=>{clearTimeout(n),t.classList.remove("show-preview")})}),document.querySelectorAll(".card-type-5").forEach(t=>{let n,o;const r=t.querySelector(".card-content");r.addEventListener("touchstart",s=>{n=s.touches[0].clientX}),r.addEventListener("touchmove",s=>{o=s.touches[0].clientX;const e=o-n;r.style.transform=`translateX(${e}px)`}),r.addEventListener("touchend",()=>{const s=o-n;Math.abs(s)>100?(t.classList.add(s>0?"swiped-right":"swiped-left"),setTimeout(()=>{r.style.transform="",t.classList.remove("swiped-right","swiped-left")},1500)):r.style.transform=""});let a=!1;r.addEventListener("mousedown",s=>{a=!0,n=s.clientX,o=n}),document.addEventListener("mousemove",s=>{if(!a)return;o=s.clientX;const e=o-n;r.style.transform=`translateX(${e}px)`}),document.addEventListener("mouseup",()=>{if(!a)return;a=!1;const s=o-n;Math.abs(s)>100?(t.classList.add(s>0?"swiped-right":"swiped-left"),setTimeout(()=>{r.style.transform="",t.classList.remove("swiped-right","swiped-left")},1500)):r.style.transform=""})}),document.querySelectorAll(".card-type-6 .read-link").forEach(t=>{t.addEventListener("click",()=>{const o=t.closest(".news-card").querySelector(".progress");let r=0;const a=setInterval(()=>{r+=10,o.textContent=`Progress: ${r}%`,r>=100&&clearInterval(a)},200)})})}u();setInterval(()=>{u()},300*1e3);
