(() => {
  'use strict';
  const STORAGE_KEY = 'livingDexPWA.progress.v1';
  const FILTERS = [
    ['all','Todos'],['pending','Pendientes'],['own','Mi OT'],['other','OT ajeno'],['alpha','Alfa']
  ];
  const GAME_ICONS = {bdsp:'💎',pla:'🏔️',sword:'⚔️',letsgo:'⚡',za:'🌆'};
  let db = null;
  let state = loadState();
  let route = {gameId:null, sectionId:null};
  let searchText = '';
  let filter = 'all';
  let deferredInstall = null;

  const el = id => document.getElementById(id);
  const main = el('main');

  function entryKey(game, section, entry){
    return `${game.id}|${section.id}|${entry.nationalNumber}|${entry.name}`;
  }
  function getStatus(key){ return state[key] || {captured:false, ownOT:false, alpha:false}; }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function setStatus(key, value){ state[key] = value; saveState(); }
  function progressFor(game, section=null){
    const sections = section ? [section] : game.sections;
    let total=0,captured=0,own=0,other=0,alpha=0;
    sections.forEach(sec => sec.entries.forEach(entry => {
      total++;
      const s=getStatus(entryKey(game,sec,entry));
      if(s.captured){captured++; s.ownOT ? own++ : other++;}
      if(s.alpha) alpha++;
    }));
    return {total,captured,own,other,alpha,pending:total-captured,pct:total?Math.round(captured/total*100):0};
  }
  function overallProgress(){
    let total=0,captured=0,own=0,other=0,alpha=0;
    db.games.forEach(g => {const p=progressFor(g);total+=p.total;captured+=p.captured;own+=p.own;other+=p.other;alpha+=p.alpha;});
    return {total,captured,own,other,alpha,pending:total-captured,pct:total?Math.round(captured/total*100):0};
  }
  function esc(s){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function progressBar(p){ return `<div class="progress"><span style="width:${p.pct}%"></span></div>`; }
  function hero(title, subtitle, p, extra=''){
    return `<section class="hero"><div class="hero-top"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><div class="big-percent">${p.pct}%</div></div>${progressBar(p)}<div class="hero-stats"><div class="stat"><strong>${p.captured}/${p.total}</strong><span>Capturados</span></div><div class="stat"><strong>${p.own}</strong><span>Mi OT</span></div><div class="stat"><strong>${p.pending}</strong><span>Pendientes</span></div></div>${extra}</section>`;
  }
  function currentGame(){ return db.games.find(g=>g.id===route.gameId); }
  function currentSection(){ const g=currentGame(); return g?.sections.find(s=>s.id===route.sectionId); }
  function setTitle(text, back){ el('pageTitle').textContent=text; el('backBtn').classList.toggle('hidden',!back); }

  function render(){
    searchText=''; filter='all';
    if(!route.gameId) return renderHome();
    if(!route.sectionId) return renderGame();
    return renderSection();
  }
  function renderHome(){
    setTitle('Living Dex',false);
    const p=overallProgress();
    main.innerHTML = hero('Tu Living Dex','Progreso combinado de todos tus juegos y Pokédex',p) +
      `<div class="section-label">Juegos</div><div class="game-grid">${db.games.map(g=>{
        const gp=progressFor(g);return `<button class="game-card" data-game="${esc(g.id)}"><div class="card-icon">${GAME_ICONS[g.id]||'◉'}</div><h3>${esc(g.title)}</h3><p>${esc(g.subtitle||'')}</p><div class="card-progress-row"><span>${gp.captured} / ${gp.total}</span><strong>${gp.pct}%</strong></div><div class="mini-progress"><span style="width:${gp.pct}%"></span></div></button>`;
      }).join('')}</div>`;
    main.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>{route={gameId:b.dataset.game,sectionId:null};history.pushState(route,'',`#${route.gameId}`);render();scrollTop();}));
  }
  function renderGame(){
    const g=currentGame(); if(!g){route={gameId:null,sectionId:null};return renderHome();}
    setTitle(g.title,true); const p=progressFor(g);
    const alphaStat=g.supportsAlpha?`<div class="section-label">Alfas registrados: <strong>${p.alpha}</strong></div>`:'';
    main.innerHTML=hero(g.title,g.subtitle||'',p,alphaStat)+`<div class="section-label">Pokédex y bloques</div><div class="section-list">${g.sections.map(s=>{
      const sp=progressFor(g,s); return `<button class="section-card" data-section="${esc(s.id)}"><div><div class="card-icon">${s.subtitle?.toLowerCase().includes('dlc')?'🧩':'📘'}</div><h3>${esc(s.title)}</h3><p>${esc(s.subtitle||'')}</p><div class="card-progress-row"><span>${sp.captured}/${sp.total} capturados · ${sp.pending} pendientes</span><strong>${sp.pct}%</strong></div><div class="mini-progress"><span style="width:${sp.pct}%"></span></div></div><span class="chevron">›</span></button>`;
    }).join('')}</div>`;
    main.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{route.sectionId=b.dataset.section;history.pushState(route,'',`#${route.gameId}/${route.sectionId}`);render();scrollTop();}));
  }
  function renderSection(){
    const g=currentGame(), s=currentSection(); if(!g||!s){route.sectionId=null;return renderGame();}
    setTitle(s.title,true);
    main.innerHTML=`<div id="sectionHero"></div><div class="toolbar"><input id="searchBox" class="search" type="search" placeholder="Buscar por nombre o número…" autocomplete="off"><div id="filterBar" class="filters"></div></div><div id="dexList" class="dex-list"></div>`;
    const filterBar=el('filterBar');
    FILTERS.filter(([id])=>id!=='alpha'||g.supportsAlpha).forEach(([id,label])=>{
      const b=document.createElement('button');b.className='filter-chip'+(filter===id?' active':'');b.textContent=label;b.dataset.filter=id;filterBar.appendChild(b);
    });
    el('searchBox').addEventListener('input',e=>{searchText=e.target.value;renderEntries();});
    filterBar.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;filterBar.querySelectorAll('.filter-chip').forEach(x=>x.classList.toggle('active',x===b));renderEntries();});
    renderEntries();
  }
  function renderEntries(){
    const g=currentGame(), s=currentSection(), p=progressFor(g,s);
    el('sectionHero').innerHTML=hero(s.title,s.subtitle||'',p,g.supportsAlpha?`<div class="section-label">Alfas: <strong>${p.alpha}</strong></div>`:'');
    const q=searchText.trim().toLocaleLowerCase('es');
    const rows=s.entries.filter(entry=>{
      const st=getStatus(entryKey(g,s,entry));
      const match=!q||entry.name.toLocaleLowerCase('es').includes(q)||String(entry.nationalNumber).includes(q)||`#${String(entry.nationalNumber).padStart(3,'0')}`.includes(q);
      const f=filter==='all'||(filter==='pending'&&!st.captured)||(filter==='own'&&st.captured&&st.ownOT)||(filter==='other'&&st.captured&&!st.ownOT)||(filter==='alpha'&&st.alpha);
      return match&&f;
    });
    const list=el('dexList');
    if(!rows.length){list.innerHTML='<div class="empty">No hay Pokémon que coincidan con este filtro.</div>';return;}
    list.innerHTML=rows.map(entry=>{
      const key=entryKey(g,s,entry), st=getStatus(key), cls=st.captured?(st.ownOT?' own':' other'):'';
      const statusText=!st.captured?'Pendiente':st.ownOT?'Capturado · Mi OT':'Capturado · OT ajeno';
      return `<article class="pokemon-row${cls}" data-key="${esc(key)}"><div class="dex-number">#${String(entry.nationalNumber).padStart(3,'0')}</div><div><div class="pokemon-name">${esc(entry.name)}</div><div class="row-sub">${statusText}${st.alpha?' · Alfa':''}</div></div><div class="check-actions"><button class="check-btn ${st.captured?'on':''}" data-action="captured" aria-label="Capturado"><span class="mark">${st.captured?'✓':'○'}</span><small>TENGO</small></button><button class="check-btn ${st.ownOT?'on':''}" data-action="ot" aria-label="Soy su OT"><span class="mark">${st.ownOT?'✓':'○'}</span><small>MI OT</small></button>${g.supportsAlpha?`<button class="check-btn alpha ${st.alpha?'on':''}" data-action="alpha" aria-label="Alfa"><span class="mark">${st.alpha?'★':'☆'}</span><small>ALFA</small></button>`:''}</div></article>`;
    }).join('');
    list.onclick=e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const row=btn.closest('[data-key]'),key=row.dataset.key;const st={...getStatus(key)};if(btn.dataset.action==='captured'){st.captured=!st.captured;if(!st.captured){st.ownOT=false;st.alpha=false;}}if(btn.dataset.action==='ot'){st.ownOT=!st.ownOT;if(st.ownOT)st.captured=true;}if(btn.dataset.action==='alpha'){st.alpha=!st.alpha;if(st.alpha)st.captured=true;}setStatus(key,st);renderEntries();};
  }
  function scrollTop(){ window.scrollTo({top:0,behavior:'auto'}); }
  function navigateBack(){
    if(route.sectionId){route.sectionId=null;history.pushState(route,'',`#${route.gameId}`);render();scrollTop();}
    else if(route.gameId){route={gameId:null,sectionId:null};history.pushState(route,'','#');render();scrollTop();}
  }
  function routeFromHash(){const h=location.hash.replace(/^#/,'');const [gameId,sectionId]=h.split('/');route={gameId:gameId||null,sectionId:sectionId||null};}
  function showToast(msg){const t=el('toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2200);}
  function openSheet(which){el('sheetBackdrop').classList.remove('hidden');el(which).classList.remove('hidden');}
  function closeSheets(){el('sheetBackdrop').classList.add('hidden');el('menuSheet').classList.add('hidden');el('installSheet').classList.add('hidden');}
  function showInstall(){closeSheets();openSheet('installSheet');const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;let html='';if(standalone){html='<p><strong>Ya está instalada.</strong> Estás usando Living Dex en modo aplicación.</p>';}else if(ios){html='<p>En iPhone se instala desde Safari:</p><ol><li>Abre esta web en <strong>Safari</strong>.</li><li>Pulsa el botón <strong>Compartir</strong> (cuadrado con flecha hacia arriba).</li><li>Elige <strong>Añadir a pantalla de inicio</strong>.</li><li>Pulsa <strong>Añadir</strong>.</li></ol><p>Después podrás abrirla desde su icono y funcionará también sin conexión.</p>';}else{html='<p>Puedes instalarla como aplicación desde el menú del navegador. Si aparece el botón inferior, úsalo para iniciar la instalación.</p>';}
    el('installText').innerHTML=html;el('nativeInstallBtn').classList.toggle('hidden',!deferredInstall||ios||standalone);
  }
  function exportBackup(){const payload={app:'Mi Living Dex',version:1,exportedAt:new Date().toISOString(),progress:state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`living-dex-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast('Copia de seguridad creada');}
  async function importBackup(file){try{const data=JSON.parse(await file.text());const progress=data.progress||data;if(!progress||typeof progress!=='object'||Array.isArray(progress))throw new Error();state=progress;saveState();closeSheets();render();showToast('Progreso importado');}catch{showToast('El archivo no es una copia válida');}}
  function resetAll(){if(confirm('¿Seguro que quieres borrar todo el progreso? Esta acción no se puede deshacer.')){state={};saveState();closeSheets();render();showToast('Progreso borrado');}}

  async function init(){
    try{const r=await fetch('pokedex-data.json');db=await r.json();}catch(err){main.innerHTML='<div class="empty">No se pudo cargar la Pokédex. Comprueba que la app se abre desde un servidor web.</div>';return;}
    routeFromHash();render();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }
  el('backBtn').onclick=navigateBack;el('menuBtn').onclick=()=>openSheet('menuSheet');el('closeSheetBtn').onclick=closeSheets;el('sheetBackdrop').onclick=closeSheets;el('installBtn').onclick=showInstall;el('closeInstallBtn').onclick=closeSheets;el('exportBtn').onclick=exportBackup;el('resetBtn').onclick=resetAll;el('importInput').onchange=e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.target.value='';};
  el('nativeInstallBtn').onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;closeSheets();};
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
  window.addEventListener('popstate',()=>{routeFromHash();render();});
  init();
})();
