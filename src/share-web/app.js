'use strict';
const $=s=>document.querySelector(s);
const formatSize=n=>{const u=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++;}return `${n.toFixed(i?1:0)} ${u[i]}`;};
let pending=null,timer=null,connected=false;
const invite=new URLSearchParams(location.search).get('join');
if(invite){$('#pairCode').value=invite;history.replaceState({},'',location.pathname);} // avoid retaining QR invite in history
function msg(text){$('#alert').textContent=text;}
async function api(path,options={}){
 const res=await fetch(path,{cache:'no-store',credentials:'same-origin',...options});
 let json={};try{json=await res.json();}catch{}
 if(!res.ok)throw Error(json.error||`Request failed (${res.status}).`);return json;
}
function connectedUI(ok){connected=ok;$('#pair').hidden=ok;$('#waiting').hidden=true;$('#transfers').hidden=!ok;$('#connection').textContent=ok?'● Connected':'Disconnected';$('#connection').classList.toggle('online',ok);if(ok)refresh().catch(e=>msg(e.message));}
async function pair(e){e.preventDefault();$('#pairButton').disabled=true;msg('');
 try{const body=JSON.stringify({device:$('#deviceName').value.trim(),join:$('#pairCode').value.trim()});
  pending=await api('/api/pair/request',{method:'POST',headers:{'Content-Type':'application/json'},body});
  $('#pair').hidden=true;$('#waiting').hidden=false;$('#matchCode').textContent=pending.match;
  $('#pairMessage').textContent='Waiting for approval on Windows. Match these 6 digits on both screens.';
  timer=setInterval(pollPair,1400);
 }catch(e){msg(e.message);$('#pairButton').disabled=false;}
}
async function pollPair(){if(!pending)return;
 try{const result=await api(`/api/pair/status?id=${encodeURIComponent(pending.id)}&key=${encodeURIComponent(pending.key)}`);
  if(result.status==='approved'){clearInterval(timer);pending=null;connectedUI(true);msg('Connected!');}
  if(result.status==='rejected'){clearInterval(timer);pending=null;$('#pair').hidden=false;$('#waiting').hidden=true;$('#pairButton').disabled=false;msg('The Windows user declined pairing.');}
 }catch(e){clearInterval(timer);pending=null;$('#pair').hidden=false;$('#waiting').hidden=true;$('#pairButton').disabled=false;msg(e.message);}
}
async function refresh(){if(!connected)return;
 try{
  const [status,manifest]=await Promise.all([api('/api/status'),api('/api/manifest')]);
  $('#inboxMessage').textContent=status.canUpload?'Files will be stored in the folder selected on the Windows PC.':'The PC needs to choose a receive folder before you can send files.';
  $('#sendFiles').disabled=!status.canUpload || !$('#selectedFiles').files.length;
  const container=$('#downloadList');container.replaceChildren();
  if(!manifest.files.length) {container.textContent='No files shared by Windows yet.';return;}
  for(const file of manifest.files) {
   const row=document.createElement('div');row.className='file-item';
   const left=document.createElement('span');left.className='text';left.textContent=file.name;
   const small=document.createElement('small');small.textContent=formatSize(file.size);left.append(small);
   const a=document.createElement('a');a.textContent='↓ Save';a.href=`/api/download?id=${encodeURIComponent(file.id)}`;
   row.append(left,a);container.append(row);
  }
 }catch(e){if(/Pair your phone/.test(e.message)){connectedUI(false);}msg(e.message);}
}
function selected(){const files=[...$('#selectedFiles').files];$('#selectedList').replaceChildren();
 for(const file of files){const row=document.createElement('div');row.className='file-item';const title=document.createElement('span');title.className='text';title.textContent=file.name;const small=document.createElement('small');small.textContent=formatSize(file.size);title.append(small);row.append(title);$('#selectedList').append(row);}
 $('#sendFiles').disabled=!connected || !files.length;
}
async function uploadAll(){const files=[...$('#selectedFiles').files];$('#sendFiles').disabled=true;const root=$('#uploadStatus');
 for(let i=0;i<files.length;i++) {
  const file=files[i];
  if(file.size>512*1024*1024){root.textContent=`${file.name}: maximum is 512 MiB.`;continue;}
  try{
   // XMLHttpRequest provides upload progress on mobile browsers.
   const data=await new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('POST',`/api/upload?name=${encodeURIComponent(file.name)}`);
    xhr.withCredentials=true;xhr.responseType='json';
    xhr.upload.onprogress=e=>{const p=e.lengthComputable?Math.round(e.loaded/e.total*100):0;root.replaceChildren();const label=document.createElement('div');label.textContent=`Sending ${i+1}/${files.length}: ${file.name} · ${p}%`;const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('span');fill.style.width=`${p}%`;bar.append(fill);root.append(label,bar);};
    xhr.onload=()=>xhr.status===200?resolve(xhr.response):reject(Error(xhr.response?.error||`Transfer failed (${xhr.status}).`));
    xhr.onerror=()=>reject(Error('Connection was interrupted.'));xhr.send(file);
   });
   root.textContent=`✓ ${file.name} → saved as ${data.savedName} on Windows`;
  }catch(e){root.textContent=`✕ ${file.name}: ${e.message}`;break;}
 }
 $('#selectedFiles').value='';selected();
}
$('#pairForm').addEventListener('submit',pair);
$('#cancel').addEventListener('click',()=>{clearInterval(timer);pending=null;$('#pair').hidden=false;$('#waiting').hidden=true;$('#pairButton').disabled=false;});
$('#selectedFiles').addEventListener('change',selected);
$('#sendFiles').addEventListener('click',uploadAll);
$('#refresh').addEventListener('click',()=>refresh().catch(e=>msg(e.message)));
api('/api/status').then(()=>connectedUI(true)).catch(()=>{});
