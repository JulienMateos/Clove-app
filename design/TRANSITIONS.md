# Transitions — code exact extrait de `Clove iOS v5.dc.html`

Les valeurs ci-dessous sont la **source de vérité** (durées, courbes, directions). Elles utilisent la Web Animations API (`el.animate`) ; en React Native, transposer avec Reanimated (`withTiming` + `Easing.bezier`), en SwiftUI avec `.animation(.timingCurve(...))`.

## 1. Accueil → « Prêt à vibrer » (`openWelcome`)
Séquence : battement du cœur (B = 560 ms) → bordures en tourbillon (SL = 1000 ms) → zoom dans le trou du pin (ZM = 1050 ms).
- Bas → gauche · Gauche → haut · Haut → droite · Droite → bas. Les blocs sous le logo descendent d'abord derrière la dernière rangée (z-index), puis partent à gauche avec elle.
- Chaque bloc garde `box-shadow: 0 0 0 5px #10182E` pendant le mouvement (même épaisseur que les gaps de la grille).
- Le zoom : la mosaïque scale autour du centre du trou (`cx=120, cy=58` dans le viewBox 240×266 du logo), la page 2 est révélée par un `clip-path: circle(r)` qui grandit du même point. Un anneau noir 3px suit le bord en apparaissant (opacité 0 → .85).

```js
  openWelcome=()=>{ if(this._wAnim||this.state.wOpen) return; const g=this.wMosRef.current, p=this.wP2Ref.current; const logo=g&&g.querySelector('[data-logo]'); const svg=logo&&logo.querySelector('svg');
    if(!g||!p||!svg||!g.animate){ this.setState({wOpen:true,wDone:true}); return; }
    this._wAnim=true; const gr=g.getBoundingClientRect(); const W=gr.width+60, H=gr.height+60;
    const B=560, SL=1000, ZM=1050;
    svg.style.transformOrigin='50% 60%';
    svg.animate([{transform:'scale(1)'},{transform:'scale(1.14)',offset:.16},{transform:'scale(.96)',offset:.32},{transform:'scale(1.1)',offset:.5},{transform:'scale(1)'}],{duration:B,easing:'ease-in-out'});
    setTimeout(()=>{
      g.style.background='transparent';
      const lb=logo.getBoundingClientRect().bottom, E='cubic-bezier(.7,0,.2,1)';
      [...g.children].forEach(t=>{ if(t===logo) return; const r=t.getBoundingClientRect(); const e=2;
        if(r.bottom>=gr.bottom-e){ t.style.zIndex='3'; t.style.position='relative'; t.style.boxShadow='0 0 0 5px #10182E'; t.animate([{transform:'none'},{transform:'none',offset:.45},{transform:'translateX('+(-W)+'px)'}],{duration:SL,easing:E,fill:'forwards'}); return; }
        if(r.top>=lb-e && r.left>gr.left+e){ const dy=gr.bottom-r.bottom; t.style.zIndex='1'; t.style.position='relative'; t.style.boxShadow='0 0 0 5px #10182E'; t.animate([{transform:'none'},{transform:'translateY('+dy+'px)',offset:.45,easing:E},{transform:'translate('+(-W)+'px,'+dy+'px)'}],{duration:SL,easing:E,fill:'forwards'}); return; }
        const bot=r.bottom>=gr.bottom-e, lef=r.left<=gr.left+e, top=r.top<=gr.top+e, rig=r.right>=gr.right-e;
        const dB='translateX('+(-W)+'px)', dL='translateY('+(-H)+'px)', dT='translateX('+W+'px)', dR='translateY('+H+'px)';
        let tr; if(bot&&!rig) tr=dB; else if(lef) tr=dL; else if(top) tr=dT; else if(rig) tr=dR; else if(bot) tr=dB;
        else { const d=[[gr.bottom-r.bottom,dB],[r.left-gr.left,dL],[r.top-gr.top,dT],[gr.right-r.right,dR]].sort((x,y)=>x[0]-y[0]); tr=d[0][1]; }
        t.style.boxShadow='0 0 0 5px #10182E';
        t.animate([{transform:'none'},{transform:tr}],{duration:SL,easing:'cubic-bezier(.7,0,.2,1)',fill:'forwards'}); });
    },B);
    setTimeout(()=>{
      const sr=svg.getBoundingClientRect(); const hx=sr.left+sr.width*120/240-gr.left, hy=sr.top+sr.height*58/266-gr.top, r0=sr.width*13/240;
      const far=Math.max(Math.hypot(hx,hy),Math.hypot(gr.width-hx,hy),Math.hypot(hx,gr.height-hy),Math.hypot(gr.width-hx,gr.height-hy));
      const S=far/r0*1.08, ease='cubic-bezier(.7,0,.16,1)', at=' at '+hx.toFixed(1)+'px '+hy.toFixed(1)+'px)';
      logo.style.boxShadow='none';
      g.style.transformOrigin=hx.toFixed(1)+'px '+hy.toFixed(1)+'px';
      g.animate([{transform:'scale(1)'},{transform:'scale('+S.toFixed(1)+')'}],{duration:ZM,easing:ease,fill:'forwards'});
      p.animate([{clipPath:'circle('+r0.toFixed(1)+'px'+at},{clipPath:'circle('+(r0*S).toFixed(1)+'px'+at}],{duration:ZM,easing:ease,fill:'forwards'});
      const ring=document.createElement('div'); const bw=3; ring.style.cssText='position:absolute;z-index:4;pointer-events:none;border-radius:50%;box-sizing:border-box;border:'+bw+'px solid #10182E';
      g.parentNode.appendChild(ring); const rk=(r)=>({left:(hx-r-bw/2)+'px',top:(hy-r-bw/2)+'px',width:(2*r+bw)+'px',height:(2*r+bw)+'px'});
      ring.animate([{...rk(r0),opacity:0},{...rk(r0*S),opacity:.85}],{duration:ZM,easing:ease,fill:'forwards'}); setTimeout(()=>ring.remove(),ZM+80);
      setTimeout(()=>this.setState({wOpen:true}),ZM*.62); setTimeout(()=>{ this.setState({wDone:true}); this._wAnim=false; },ZM+60);
    },B+SL-80); };
```

## 2. Radar — demi-tour de la barre (`toggleMode`)
Fond = carré de 2400 px centré sur le cœur (top 44%), moitié haute / moitié basse + barre noire 10px. Au tap : rotation +180° (1100 ms, `cubic-bezier(.65,0,.25,1)`), les couleurs basculent avec `transition: background .5s ease .3s`. Ordre des couleurs constant : inactif = vert / blanc cassé, actif = bleu / rouge.

```html
<div ref="{{ splitRef }}" style="position:absolute;left:50%;top:44%;width:2400px;height:2400px;margin:-1200px 0 0 -1200px;transform:rotate({{ splitRot }})">
<span style="position:absolute;left:0;right:0;top:0;height:1200px;background:{{ splitA }};transition:background .5s ease .3s"></span>
<span style="position:absolute;left:0;right:0;bottom:0;height:1200px;background:{{ splitB }};transition:background .5s ease .3s"></span>
<span style="position:absolute;left:0;right:0;top:1195px;height:10px;background:#10182E"></span>
```
```js
      toggleMode:()=>{ const n0=(s.radarTurn||0), el=this.splitRef.current; if(el&&el.animate) el.animate([{transform:'rotate('+(n0*180)+'deg)'},{transform:'rotate('+((n0+1)*180)+'deg)'}],{duration:1100,easing:'cubic-bezier(.65,0,.25,1)'}); this.setState(p=>({radarTurn:(p.radarTurn||0)+1})); this.setMode(mode==='full'?'ghost':'full'); },
```

## 3. Radar — 4 bandes qui montent depuis l'étiquette d'état
Le bouton cœur porte `data-nobands`. Au tap, 4 bandes (orange, bleu, crème, vert, ordre de départ aléatoire) de la taille de l'étiquette « ○ ALLUME-MOI / ● À L'ÉCOUTE » montent jusqu'à sortir par le haut (900 ms, décalage 55 ms, `cubic-bezier(.55,0,.35,1)`), derrière le contenu, au-dessus du fond.

```js
if((this.props.tapFx||'blocs')==='blocs' && t.hasAttribute('data-nobands')){
        const scr=t.closest('[data-screen-label="Radar"]'), host=scr&&scr.parentElement;
        if(host){ const hr=host.getBoundingClientRect(), bdg=t.lastElementChild, br=(bdg||t).getBoundingClientRect(), k=hr.width?host.offsetWidth/hr.width:1;
          const lay=document.createElement('div'); lay.style.cssText='position:absolute;left:0;right:0;top:0;bottom:104px;overflow:hidden;pointer-events:none';
          host.insertBefore(lay, scr);
          const cols=4, L=(br.left-hr.left)*k, W=br.width*k, y0=(br.top-hr.top)*k, bh=Math.round(br.height*k), P2=['#E24B0B','#123C96','#EFE4CE','#0F6B60'], s0=Math.floor(Math.random()*4);
          for(let i=0;i<cols;i++){ const b=document.createElement('span');
            b.style.cssText='position:absolute;left:'+(L+i*W/cols)+'px;width:'+(W/cols+1)+'px;top:'+y0+'px;height:'+bh+'px;background:'+P2[(s0+i)%4]+';box-shadow:inset 0 3px 0 #10182E,inset 0 -3px 0 #10182E'+(i?',inset 3px 0 0 #10182E':'');
            lay.appendChild(b);
            b.animate([{transform:'translateY(0)'},{transform:'translateY('+(-(y0+bh+20))+'px)'}],{duration:900,delay:i*55,easing:'cubic-bezier(.55,0,.35,1)',fill:'both'}); }
          setTimeout(()=>lay.remove(),900+cols*55+80); }
```

## 4. Cadrage de la photo de profil
Glisser = translation bornée, slider = zoom 1→3, rognage carré 900×900 au moment de « TRANSFORMER ».

```js
  clampCrop(tx,ty,z){ const el=this.cropRef.current; const F=el?el.clientWidth:300; const w=this.state.photoW, hh=this.state.photoH; if(!w) return [0,0];
    const s0=Math.max(F/w,F/hh), mx=Math.max(0,(w*s0*z-F)/2), my=Math.max(0,(hh*s0*z-F)/2); return [Math.max(-mx,Math.min(mx,tx)), Math.max(-my,Math.min(my,ty))]; }
  onCropDown=(e)=>{ try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){} this._cp={x:e.clientX,y:e.clientY,tx:this.state.cropTx||0,ty:this.state.cropTy||0}; };
  onCropMove=(e)=>{ if(!this._cp) return; const el=this.cropRef.current; const r=el?el.getBoundingClientRect():null; const k=r&&r.width?el.offsetWidth/r.width:1;
    const [tx,ty]=this.clampCrop(this._cp.tx+(e.clientX-this._cp.x)*k, this._cp.ty+(e.clientY-this._cp.y)*k, this.state.cropZ||1); this.setState({cropTx:tx,cropTy:ty}); };
  onCropUp=()=>{ this._cp=null; };
  onCropZoom=(e)=>{ const z=Number(e.target.value); const [tx,ty]=this.clampCrop(this.state.cropTx||0,this.state.cropTy||0,z); this.setState({cropZ:z,cropTx:tx,cropTy:ty}); };
  applyCrop(done){ const s=this.state, el=this.cropRef.current; if(!s.photoRaw||!s.photoW||!el){ done(); return; }
    const F=el.clientWidth, w=s.photoW, hh=s.photoH, z=s.cropZ||1, sc=Math.max(F/w,F/hh)*z;
    const sw=F/sc, sx=w/2+(-F/2-(s.cropTx||0))/sc, sy=hh/2+(-F/2-(s.cropTy||0))/sc;
    const img=new Image(); img.onload=()=>{ const c=document.createElement('canvas'); c.width=c.height=900; c.getContext('2d').drawImage(img,sx,sy,sw,sw,0,0,900,900);
      const u=c.toDataURL('image/jpeg',0.9); this.setState({photoUrl:u}); this.processPhoto(u); done(); }; img.onerror=()=>done(); img.src=s.photoRaw; }
```

## 5. Petites animations (keyframes, dans `<helmet>`)
- `cloveBeat` : battement du cœur en mode actif.
- `cloveRise` : entrée de chaque écran (0.3 s).
- `clovePop` : dévoilement de la photo d'Emma (étape 2/2).
- `cloveGo` + `cloveArrow` : bouton « COMMENT Y ALLER » (ombre qui pulse noir → cobalt, flèche qui avance de 6 px).
- `cloveDemoShape / cloveDemoFinger / cloveDemoTag / cloveDemoTag2` : démo du tuto empreinte (boucle 4.2 s).
- Effet au toucher global (`initTapFx`) : battement du texte des boutons sélectionnés, **synchronisé** (`startTime = 0` pour toutes les animations en boucle).
