/* QR pairing: WebAuthn signs the snapshot; AES-GCM + RSA-OAEP protect LAN transport.
   No private key, password, portfolio or reusable secret is published with this app. */
(function () {
  'use strict';
  const b64 = b => { const a=new Uint8Array(b); let s=''; for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); };
  const un64 = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const enc = s => new TextEncoder().encode(s);
  let stream = null, frame = null, session = null, panel = null;
  function stopCamera() { if (stream) stream.getTracks().forEach(t=>t.stop()); stream=null; cancelAnimationFrame(frame); }
  function close() { stopCamera(); if(panel) panel.remove(); panel=null; session=null; }
  function message(text) { const el=document.getElementById('citySyncMessage'); if(el) el.textContent=text; }
  function shell() {
    close(); panel=document.createElement('div');panel.className='sheet';panel.style.zIndex='100';panel.style.maxHeight='95svh';
    panel.innerHTML='<div class="sheet-head"><b>Sincronizare cu orașul</b><button class="btn" id="citySyncClose">Închide</button></div><p id="citySyncMessage" class="small">Pe PC: Telefon · Fonduri → Sincronizare. Scanează aici QR-ul afișat în oraș. Telefonul și PC-ul trebuie să fie pe același Wi-Fi.</p><div id="citySyncContent"></div>';
    document.body.appendChild(panel);document.getElementById('citySyncClose').onclick=close;
  }
  function validateQR(text) {
    const link=new URL(text);
    if(link.origin!==location.origin || link.pathname!=='/Fonduri/' || !link.hash.startsWith('#oras=')) throw Error('Acesta nu este un QR Fonduri emis de oraș.');
    const data=JSON.parse(new TextDecoder().decode(un64(link.hash.slice(6))));
    const u=new URL(data.u), parts=u.hostname.split('.').map(Number);
    const privateIP=parts.length===4 && parts.every(n=>Number.isInteger(n)&&n>=0&&n<=255) && (parts[0]===10 || (parts[0]===192&&parts[1]===168) || (parts[0]===172&&parts[1]>=16&&parts[1]<=31));
    if(data.v!==1 || u.protocol!=='http:' || !privateIP || u.pathname!=='/fonduri-primire' || u.search || u.hash || u.username || u.password || !/^[\w-]{20,80}$/.test(data.s) || !/^[\w-]{40,60}$/.test(data.n) || typeof data.k!=='string' || data.k.length>600 || !(data.e>Date.now()) || data.e>Date.now()+360000) throw Error('QR invalid sau expirat. Generează altul în oraș.');
    const pinned=localStorage.getItem('fonduri.receiver.v1');
    if(pinned && pinned!==data.k)throw Error('Cheia orașului este diferită. Nu am trimis nimic. Verifică pe PC și elimină asocierea veche din Setări numai dacă ai schimbat intenționat PC-ul.');
    return data;
  }
  function found(text) {
    try {
      session=validateQR(text);stopCamera();
      const snapshot=window.fonduriSnapshot();
      message('Destinație: '+new URL(session.u).host+'. Se trimit '+snapshot.funds.length+' fonduri, '+snapshot.coins.length+' monede și '+snapshot.earn.length+' poziții Earn. Istoricul complet rămâne pe telefon.');
      const content=document.getElementById('citySyncContent');content.replaceChildren();
      const explanation=document.createElement('p');explanation.className='small muted';explanation.textContent='Confirmarea folosește o cheie de acces verificată de PC. iPhone-ul poate cere Face ID sau codul dispozitivului. După aprobare se deschide pagina locală de transfer; acolo nu introduci date sau parole.';content.appendChild(explanation);
      const button=document.createElement('button');button.className='btn primary block';button.textContent=session.c?'Aprobă și sincronizează':'Asociază telefonul și sincronizează';content.appendChild(button);
      button.onclick=()=>send(button);
    } catch(e) { message(e.message); }
  }
  function credentialJSON(c) {
    const response={clientDataJSON:b64(c.response.clientDataJSON)};
    if(c.response.attestationObject) { response.attestationObject=b64(c.response.attestationObject);response.transports=c.response.getTransports?c.response.getTransports():[]; }
    else { response.authenticatorData=b64(c.response.authenticatorData);response.signature=b64(c.response.signature);response.userHandle=c.response.userHandle?b64(c.response.userHandle):null; }
    return {id:c.id,rawId:b64(c.rawId),type:c.type,response,clientExtensionResults:c.getClientExtensionResults(),authenticatorAttachment:c.authenticatorAttachment};
  }
  async function send(button) {
    button.disabled=true;
    try {
      if(!session || Date.now()>session.e)throw Error('QR expirat. Generează altul în oraș.');
      if(!window.isSecureContext || !navigator.credentials || !crypto.subtle)throw Error('Deschide aplicația Fonduri de la adresa HTTPS.');
      const current=session;
      const snapshot=JSON.stringify(window.fonduriSnapshot());
      const challenge=await crypto.subtle.digest('SHA-256',enc(current.n+'.'+snapshot));
      const c=current.c?await navigator.credentials.get({publicKey:{challenge,rpId:location.hostname,userVerification:'required',timeout:120000,allowCredentials:[{type:'public-key',id:un64(current.c)}]}}):
        await navigator.credentials.create({publicKey:{challenge,rp:{id:location.hostname,name:'Fonduri · Orașul DSL'},user:{id:crypto.getRandomValues(new Uint8Array(32)),name:'fonduri-oras',displayName:'Fonduri pentru oraș'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},attestation:'none',timeout:120000}});
      if(session!==current || Date.now()>current.e)throw Error('Sesiunea s-a închis sau a expirat.');
      const payload=JSON.stringify({snapshot,credential:credentialJSON(c)});
      const aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
      const iv=crypto.getRandomValues(new Uint8Array(12));
      const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc(current.s)},aes,enc(payload));
      const rsa=await crypto.subtle.importKey('spki',un64(current.k),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
      const key=await crypto.subtle.encrypt('RSA-OAEP',rsa,await crypto.subtle.exportKey('raw',aes));
      const envelope=b64(enc(JSON.stringify({s:current.s,iv:b64(iv),key:b64(key),data:b64(data)})));
      if(envelope.length>180000)throw Error('Portofoliul este prea mare pentru transferul direct. Folosește exportul criptat complet.');
      const navigate=()=>{ localStorage.setItem('fonduri.receiver.v1',current.k);stopCamera();location.assign(current.u+'#'+envelope); };
      if(!current.c) {
        const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',enc(c.id)));
        const code=Array.from(hash).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,8).toUpperCase();
        message('Cod de asociere: '+code+'. Reține-l și confirmă pe PC numai dacă apare același cod.');
        button.textContent='Trimite și verifică acest cod pe PC';button.disabled=false;button.onclick=navigate;
      } else navigate();
    } catch(e) { message(e.name==='NotAllowedError'?'Aprobarea a fost anulată. Nu am trimis nimic.':e.message);button.disabled=false; }
  }
  window.startCitySync=async function () {
    shell();const content=document.getElementById('citySyncContent');
    try {
      const video=document.createElement('video');video.setAttribute('playsinline','');video.muted=true;video.style.width='100%';content.appendChild(video);
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      if(!panel){stopCamera();return;}video.srcObject=stream;await video.play();
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
      function scan() {
        if(!stream)return;
        if(video.readyState>=2){canvas.width=video.videoWidth;canvas.height=video.videoHeight;ctx.drawImage(video,0,0);const im=ctx.getImageData(0,0,canvas.width,canvas.height);const qr=jsQR(im.data,im.width,im.height,{inversionAttempts:'dontInvert'});if(qr){found(qr.data);if(session)return;}}
        frame=requestAnimationFrame(scan);
      }scan();
    }catch(e){message('Camera nu este disponibilă. Permite accesul la cameră pentru Fonduri sau scanează QR-ul cu aplicația Cameră a telefonului.');stopCamera();}
  };
  if(location.hash.startsWith('#oras=')) { const text=location.href;history.replaceState(null,'',location.pathname);shell();found(text); }
  window.addEventListener('pagehide',stopCamera);
})();

/* Sincronizare automată cu orașul (1.12.0): fără QR, fără confirmare, prin Tailscale.
   Asocierea se face o dată, cu cheia generată în aplicația orașului. Telefonul își creează o cheie ECDSA
   care nu poate fi exportată, iar orașul păstrează doar partea publică. Adresa orașului vine din cheia de
   asociere și stă doar pe telefon, nu în codul public. Istoricul complet rămâne pe telefon. */
(function () {
  'use strict';
  const K='fonduri.city.v2', enc=s=>new TextEncoder().encode(s);
  const b64=b=>{const a=new Uint8Array(b);let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
  const un64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const cfg=()=>{try{return JSON.parse(localStorage.getItem(K))||{};}catch(e){return {};}};
  const setCfg=o=>{const c=Object.assign(cfg(),o);localStorage.setItem(K,JSON.stringify(c));return c;};
  function db(){return new Promise((res,rej)=>{const r=indexedDB.open('fonduri-city',1);r.onupgradeneeded=()=>r.result.createObjectStore('k');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
  async function keyOp(mode,val){const d=await db();return new Promise((res,rej)=>{const st=d.transaction('k',mode==='get'?'readonly':'readwrite').objectStore('k');const q=mode==='get'?st.get('device'):mode==='put'?st.put(val,'device'):st.delete('device');q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error);});}
  async function call(url,opt,ms){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms||5000);
    try{const r=await fetch(url,Object.assign({signal:ac.signal,cache:'no-store',credentials:'omit'},opt||{}));const j=await r.json().catch(()=>({ok:false,msg:'Răspuns invalid de la oraș.'}));return j;}
    finally{clearTimeout(t);}}
  function parseKey(text){
    const t=String(text||'').trim();if(!t.startsWith('ORAS2.'))throw Error('Cheia trebuie să înceapă cu ORAS2. Copiaz-o din aplicația orașului → Setări → Fonduri.');
    const d=JSON.parse(new TextDecoder().decode(un64(t.slice(6))));const u=new URL(d.u);
    if(d.v!==2||u.protocol!=='https:'||!u.hostname.endsWith('.ts.net')||u.pathname!=='/'&&u.pathname!==''||!/^[0-9A-F]{8}$/.test(d.c))throw Error('Cheie invalidă.');
    return {u:u.origin,c:d.c};
  }
  window.cityStatus=()=>cfg();
  window.cityPair=async function(text){
    if(!window.isSecureContext||!crypto.subtle||!window.indexedDB)throw Error('Telefonul nu permite asocierea aici.');
    const k=parseKey(text);
    const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
    const pub=b64(await crypto.subtle.exportKey('spki',kp.publicKey));
    let r;try{r=await call(k.u+'/api/fonduri/v2/asociere',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cod:k.c,pub,nume:/iPhone/.test(navigator.userAgent)?'iPhone':'Telefon'})},8000);}
    catch(e){throw Error('Nu ajung la oraș. Pornește Tailscale pe telefon și încearcă din nou.');}
    if(!r.ok)throw Error(r.msg||'Asocierea a fost refuzată.');
    await keyOp('put',{priv:kp.privateKey,id:r.id});
    setCfg({u:k.u,id:r.id,paired:Date.now(),hash:null,lastOk:null,lastErr:null,lastTry:0});
    return r;
  };
  window.cityForget=async function(){await keyOp('del').catch(()=>{});localStorage.removeItem(K);};
  async function digest(o){const c=Object.assign({},o);delete c.at;const h=await crypto.subtle.digest('SHA-256',enc(JSON.stringify(c)));return b64(h).slice(0,22);}
  let busy=false;
  /* force=true: butonul „Trimite acum”. Altfel: trimite doar dacă portofoliul s-a schimbat sau au trecut 24 h;
     după o încercare nereușită așteaptă 10 minute. Nu arată nimic dacă orașul nu răspunde. */
  window.citySyncAuto=async function(force){
    const c=cfg();if(!c.u||!c.id||busy)return {ok:false,skip:true};
    let snap;try{snap=window.fonduriSnapshot();}catch(e){return {ok:false,skip:true,msg:e.message};}
    const h=await digest(snap);
    if(!force){
      if(c.hash===h&&c.lastOk&&Date.now()-c.lastOk<864e5)return {ok:true,skip:true};
      if(c.lastErr&&Date.now()-(c.lastTry||0)<6e5)return {ok:false,skip:true};
    }
    busy=true;setCfg({lastTry:Date.now()});
    try{
      const key=await keyOp('get');if(!key||key.id!==c.id)throw Error('Cheia telefonului lipsește. Asociază din nou.');
      let ss;try{ss=await call(c.u+'/api/fonduri/v2/sesiune?d='+encodeURIComponent(c.id),{},4000);}catch(e){throw Error('Orașul nu răspunde (Tailscale oprit sau PC închis).');}
      if(!ss.ok)throw Error(ss.msg||'Orașul a refuzat.');
      const text=JSON.stringify(snap);
      const sig=b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key.priv,enc(ss.n+'.'+text)));
      let r;try{r=await call(c.u+'/api/fonduri/v2/trimite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({d:c.id,s:ss.s,snapshot:text,sig})},8000);}catch(e){throw Error('Trimiterea a fost întreruptă.');}
      if(!r.ok)throw Error(r.msg||'Orașul a refuzat portofoliul.');
      setCfg({lastOk:Date.now(),hash:h,lastErr:null});
      return r;
    }catch(e){setCfg({lastErr:e.message});return {ok:false,msg:e.message};}
    finally{busy=false;}
  };
})();
