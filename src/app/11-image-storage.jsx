/* ============ IndexedDB（画像保存） ============ */
const IDB_NAME = 'novel-world-builder-images';
const IDB_STORE = 'images';

// DB接続はPromiseとしてキャッシュし、呼び出しのたびにopenし直さない。
// 接続失敗・切断時はキャッシュを解除して再試行できるようにする。
let imageDbPromise = null;
function openImageDB(){
  if(imageDbPromise) return imageDbPromise;
  imageDbPromise = new Promise((resolve, reject)=>{
    try{
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = () => {
        const db = req.result;
        db.onclose = () => { imageDbPromise = null; };
        db.onversionchange = () => { db.close(); imageDbPromise = null; };
        resolve(db);
      };
      req.onerror = () => { imageDbPromise = null; reject(req.error || new Error('画像データベースを開けませんでした')); };
    }catch(err){
      imageDbPromise = null;
      reject(err);
    }
  });
  return imageDbPromise;
}
async function idbPut(id, dataUrl){
  const db = await openImageDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('保存が中断されました'));
  });
}
async function idbGet(id){
  if(!id) return null;
  const db = await openImageDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readonly');
    const r = tx.objectStore(IDB_STORE).get(id);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}
async function idbDelete(id){
  if(!id) return;
  const db = await openImageDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGetAll(){
  const db = await openImageDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readonly');
    const store = tx.objectStore(IDB_STORE);
    const out = {};
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cur = e.target.result;
      if(cur){ out[cur.key] = cur.value; cur.continue(); }
      else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

// UIコンポーネントはIndexedDBを直接叩かず、この薄いラッパーだけを使う。
// 将来Cloudflare R2などへ移行する場合は、この4つの中身だけ差し替えればよい。
const imageStorage = {
  save: (id, dataUrl) => idbPut(id, dataUrl),
  get: (id) => idbGet(id),
  remove: (id) => {
    if(!id) return Promise.resolve();
    return idbDelete(id).catch(err => { console.error('画像の削除に失敗しました（無視して続行）', err); });
  },
  getAll: () => idbGetAll(),
};

// 画像1枚をJPEGのdata URLへ変換（共通処理）
function drawToJpegDataUrl(source, srcW, srcH, maxW, quality){
  let width = srcW, height = srcH;
  if(width > maxW){ height = Math.round(height * (maxW/width)); width = maxW; }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  // 使用済みcanvasのメモリを解放
  canvas.width = 0; canvas.height = 0;
  return dataUrl;
}

// スマホの高解像度写真でも重くなりにくいよう、可能ならcreateImageBitmapを優先し、
// 使えない環境ではFileReader方式へフォールバックする。
async function compressImageFile(file, maxW=1000, quality=0.82){
  if(!file) throw new Error('ファイルが選択されていません');

  if(window.createImageBitmap){
    let bitmap = null;
    try{
      bitmap = await createImageBitmap(file);
      return drawToJpegDataUrl(bitmap, bitmap.width, bitmap.height, maxW, quality);
    }catch(err){
      console.error('createImageBitmapでの読み込みに失敗、従来方式へフォールバックします', err);
    }finally{
      if(bitmap && bitmap.close) bitmap.close();
    }
  }

  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try{
          resolve(drawToJpegDataUrl(img, img.naturalWidth, img.naturalHeight, maxW, quality));
        }catch(err){ reject(err); }
      };
      img.onerror = () => reject(new Error('画像を読み込めませんでした'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('ファイルを読み込めませんでした'));
    reader.readAsDataURL(file);
  });
}

