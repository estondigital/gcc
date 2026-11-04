const ID='G-28TWC9G9TJ';
window.dataLayer=window.dataLayer||[];
window.gtag=function(){window.dataLayer.push(arguments)};
let choice=null;try{choice=localStorage.getItem('gc-analytics')}catch{}
gtag('consent','default',{analytics_storage:choice==='yes'?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
window['ga-disable-'+ID]=choice!=='yes';
gtag('js',new Date());gtag('config',ID,{send_page_view:choice==='yes',allow_google_signals:false,page_location:location.origin+location.pathname});
const tag=document.createElement('script');tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id='+ID;document.head.appendChild(tag);
const consent=document.querySelector('.consent');consent.hidden=choice!==null;
document.querySelectorAll('[data-consent]').forEach(b=>b.addEventListener('click',()=>{choice=b.dataset.consent;try{localStorage.setItem('gc-analytics',choice)}catch{}window['ga-disable-'+ID]=choice!=='yes';gtag('consent','update',{analytics_storage:choice==='yes'?'granted':'denied'});if(choice==='yes')gtag('event','page_view');consent.hidden=true}));
document.querySelector('.preferences').addEventListener('click',()=>{consent.hidden=false;consent.querySelector('button').focus()});
document.querySelector('.menu').addEventListener('click',e=>{const open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));document.querySelector('nav').classList.toggle('open',open)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelector('nav').classList.remove('open');document.querySelector('.menu').setAttribute('aria-expanded','false')}});
if(document.querySelector('#diagnosis'))fetch('/scenarios.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(s=>{const show=i=>{const labels=['Observed symptom','Possible explanations','Evidence needed','Questions to investigate','Practical next investigation'];const panel=document.querySelector('#diagnosis');panel.replaceChildren();const h=document.createElement('h3');h.textContent=s[i][0];panel.append(h);labels.forEach((x,n)=>{const title=document.createElement('h4');title.textContent=x;const p=document.createElement('p');p.textContent=s[i][n+1];panel.append(title,p)});document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.scenario)===i)))};show(0);document.querySelectorAll('[data-scenario]').forEach(b=>b.addEventListener('click',()=>show(Number(b.dataset.scenario))))}).catch(()=>{document.querySelector('#diagnosis').textContent='The examples could not load. Please refresh or explore the diagnostic approach page.'});
document.querySelectorAll('form[data-type]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const btn=form.querySelector('button');btn.disabled=true;const status=form.querySelector('.form-status');status.textContent='Preparing your draft…';try{const data=new FormData(form);const type=form.dataset.type;const body=Array.from(data.entries()).map(([k,v])=>k+': '+v).join('\n');const draft=form.querySelector('.draft');draft.href='mailto:'+(type==='platform'?'demo':'growth')+'@growthclarityco.com?subject='+encodeURIComponent(type+' enquiry — Growth Clarity Co.')+'&body='+encodeURIComponent(body);draft.hidden=false;status.textContent='Draft ready. Nothing has been submitted or saved. Open the draft and send it using your email application.';if(choice==='yes')gtag('event','enquiry_draft_prepared',{enquiry_type:type});}catch{status.textContent='The draft could not be prepared. Please use the email link beside this form.'}finally{btn.disabled=false}}));

// Pass only campaign labels, never form answers or arbitrary query parameters.
const attributionKeys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
const pageParams=new URLSearchParams(location.search);
let attribution={};
try{attribution=JSON.parse(sessionStorage.getItem('gc-attribution')||'{}')}catch{}
for(const key of attributionKeys){const value=pageParams.get(key);if(value&&/^[a-zA-Z0-9_.~-]{1,120}$/.test(value))attribution[key]=value;}
try{sessionStorage.setItem('gc-attribution',JSON.stringify(attribution))}catch{}
document.querySelectorAll('a[href^="/research/"]').forEach(a=>{const u=new URL(a.getAttribute('href'),location.origin);for(const key of attributionKeys)if(attribution[key])u.searchParams.set(key,attribution[key]);a.href=u.pathname+u.search+u.hash;});
const tallyFrame=document.querySelector('#research-tally');
if(tallyFrame){
 const embed=new URL(tallyFrame.src);const direct=new URL('https://tally.so/r/2jXgEg');
 direct.searchParams.set('form_type','customer_research');
 for(const key of attributionKeys)if(attribution[key]){embed.searchParams.set(key,attribution[key]);direct.searchParams.set(key,attribution[key]);}
 embed.searchParams.set('originPage','/research/');direct.searchParams.set('originPage','/research/');
 tallyFrame.src=embed.href;document.querySelector('#tally-direct').href=direct.href;
 const status=document.querySelector('#tally-status');let confirmed=false;
 const delay=setTimeout(()=>{if(!confirmed)status.textContent='If the form is not visible below, use the direct Tally link.'},12000);
 tallyFrame.addEventListener('error',()=>{status.textContent='The form could not load here. Please use the direct Tally link.'});
 let recorded=false;
 window.addEventListener('message',event=>{
  if(event.origin!=='https://tally.so'||event.source!==tallyFrame.contentWindow)return;
  let data;try{data=typeof event.data==='string'?JSON.parse(event.data):event.data}catch{return;}
  if(!data||data.payload?.formId!=='2jXgEg')return;
  if(data.event==='Tally.FormLoaded'){confirmed=true;clearTimeout(delay);status.textContent='Research form ready.';}
  if(data.event==='Tally.FormSubmitted'&&!recorded){
   recorded=true;status.textContent='Tally has confirmed your research submission. Thank you for your interest.';
   if(choice==='yes')gtag('event','generate_lead',{enquiry_type:'customer_research',form_provider:'tally'});
   try{sessionStorage.setItem('gc-research-confirmed','yes')}catch{}
   const next=document.createElement('a');next.className='button';next.href='/research/thank-you/';next.textContent='View research next steps ↗';status.after(next);
  }
 });
 // Tally's widget handles dynamic iframe height as the form pages change.
 const widget=document.createElement('script');widget.src='https://tally.so/widgets/embed.js';widget.async=true;document.head.appendChild(widget);
}
if(location.pathname==='/research/thank-you/'){
 let received=false;try{received=sessionStorage.getItem('gc-research-confirmed')==='yes'}catch{}
 if(received){const intro=document.querySelector('.page-hero p');intro.textContent='Tally has confirmed your research application. Thank you for sharing your perspective. We may contact you if your experience matches current research priorities.';}
}
