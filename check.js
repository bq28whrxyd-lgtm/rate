const admin=require('firebase-admin');admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:'kimoota-15777'});
const db=admin.firestore();const A='3kcrm26nwc6hhos2mgxd';
const sum=o=>Object.values(o||{}).reduce((a,n)=>a+(+n>0?+n:0),0),kinds=o=>Object.keys(o||{}).filter(k=>+o[k]>0).length;
const J=t=>new Date(t+9*36e5).toISOString().slice(5,16).replace('T',' ');
(async()=>{const d=await db.doc('inv/'+A).get(),v=d.data()||{};
 console.log('admin inv updated',J(d.updateTime.toMillis()));
 const simple={};Object.keys(v).sort().forEach(k=>{const x=v[k];simple[k]=(typeof x==='number'||typeof x==='boolean')?x:Array.isArray(x)?'['+x.length+']':(x&&typeof x==='object')?'{'+Object.keys(x).length+'}':String(x).slice(0,12)});
 console.log('top-level:',JSON.stringify(simple));
 const day=Math.floor((Date.now()+144e5)/864e5);console.log('today dayNo',day,'lbd',v.lbd,'lbs',v.lbs);
 const o=await db.doc('own/'+A).get();if(o.exists){const w=o.data();console.log('own/{admin} updated',J(o.updateTime.toMillis()));const s={};Object.keys(w).forEach(k=>{const x=w[k];s[k]=Array.isArray(x)?'['+x.length+']':(x&&typeof x==='object')?'{'+Object.keys(x).length+' keys, sum '+sum(x)+'}':x});console.log('own doc:',JSON.stringify(s))}else console.log('no own doc');
 // admin's slabs / boxes can also show in the market
 const au=await db.collection('auc').get();let n=0;au.docs.forEach(x=>{const a=x.data();if(a.s===A||a.hp===A)n++});console.log('auc rows by/for admin',n);
 const g=await db.collection('grants').get().catch(()=>null);if(g){let k=0,kinds={};g.docs.forEach(x=>{const a=x.data();if(a.to===A||a.p===A||a.pid===A){k++;kinds[a.k||a.kind||'?']=(kinds[a.k||a.kind||'?']||0)+1}});console.log('grants to admin',k,JSON.stringify(kinds))}
})().catch(e=>console.log('ERR',e.message));
