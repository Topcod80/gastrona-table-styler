'use strict';
// One atomic IndexedDB record: scene metadata and original image bytes.
// ArrayBuffer storage avoids WebKit file-backed Blob persistence failures.
// No network, image encoding, cookies, or server persistence.
const TableStorage = (()=>{
  const database='table-studio-local',store='scenes',key='current';
  function open(){return new Promise((resolve,reject)=>{
    let settled=false,request;
    const fail=()=>{if(!settled){settled=true;clearTimeout(timer);reject(Error('Local photo storage unavailable'));}};
    const timer=setTimeout(fail,5000);
    try{request=indexedDB.open(database,1);}catch{fail();return;}
    request.onupgradeneeded=()=>request.result.createObjectStore(store);
    request.onerror=fail;request.onblocked=fail;
    request.onsuccess=()=>{if(settled){request.result.close();return;}settled=true;clearTimeout(timer);resolve(request.result);};
  });}
  async function operation(mode,value){const db=await open();return new Promise((resolve,reject)=>{
    let tx,request,finished=false;
    const timer=setTimeout(()=>{try{tx?.abort();}catch{}finish(Error('Local storage timed out'));},8000);
    function finish(error,result){if(finished)return;finished=true;clearTimeout(timer);db.close();error?reject(error):resolve(result);}
    try{tx=db.transaction(store,mode==='get'?'readonly':'readwrite');const objectStore=tx.objectStore(store);request=mode==='get'?objectStore.get(key):mode==='put'?objectStore.put(value,key):objectStore.delete(key);tx.oncomplete=()=>finish(null,request.result);tx.onerror=()=>finish(tx.error||request?.error||Error('Local storage failed'));tx.onabort=()=>finish(tx.error||request?.error||Error('Local storage aborted'));}catch(error){finish(error);}
  });}
  return {
    async read(){const record=await operation('get');if(record?.photo?.bytes instanceof ArrayBuffer){record.photo=new Blob([record.photo.bytes],{type:record.photo.type||'application/octet-stream'});}return record;},
    async write(value){
      // Resolve the image bytes before opening a transaction (Safari auto-closes idle transactions).
      const photo=value.photo instanceof Blob?{bytes:await value.photo.arrayBuffer(),type:value.photo.type}:value.photo;
      return operation('put',{...value,photo});
    },
    clear:()=>operation('delete')
  };
})();
