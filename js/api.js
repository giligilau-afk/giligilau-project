import {normaliseAudioBlob,playbackErrorMessage} from './audio-format.js?v=3.4-speech';
import {canSynthesizeEntry} from './speech-availability.js?v=19-speech-on';
import {CONFIG} from '../config.js?v=19-speech-on';

const bases = {
  tts: CONFIG.API_PROXY_URL ? `${CONFIG.API_PROXY_URL.replace(/\/$/,'')}/tts/` : CONFIG.TTS_API_URL,
  mt: CONFIG.API_PROXY_URL ? `${CONFIG.API_PROXY_URL.replace(/\/$/,'')}/mt/` : CONFIG.MT_API_URL,
};
const queues = {tts:Promise.resolve(),mt:Promise.resolve()};
const sessions = {tts:crypto.randomUUID().replaceAll('-',''),mt:crypto.randomUUID().replaceAll('-','')};

// Gradio's /call/{name}/{event_id} SSE shortcut does not support a custom session_hash.
// Use the queue stream to preserve the selected ethnicity in the SAME session.
async function gradioCall(kind, endpoint, data, signal) {
  const base=bases[kind].replace(/\/?$/,'/');
  const started=await fetch(`${base}gradio_api/call/${endpoint}`, {
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({data,session_hash:sessions[kind]}),signal,
  });
  if(!started.ok)throw Error(`服務連線失敗（${started.status}），請稍後重試。`);
  const {event_id}=await started.json();
  if(!event_id)throw Error('服務沒有回傳工作編號。');
  const response=await fetch(`${base}gradio_api/queue/data?session_hash=${sessions[kind]}`,{signal});
  if(!response.ok||!response.body)throw Error('無法取得語言服務的處理結果。');
  const reader=response.body.getReader(), decoder=new TextDecoder();let buffer='';
  try {
    while(true) {
      const {value,done}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      let boundary;
      while((boundary=buffer.indexOf('\n'))>=0) {
        const line=buffer.slice(0,boundary).trim();buffer=buffer.slice(boundary+1);
        if(!line.startsWith('data:'))continue;
        const event=JSON.parse(line.slice(5).trim());
        if(event.msg==='queue_full')throw Error('語言服務使用人數較多，請稍後重試。');
        if(event.event_id!==event_id)continue;
        if(event.msg==='process_completed') {
          if(!event.success)throw Error('語言服務暫時無法處理這段文字，請檢查語別或稍後重試。');
          return event.output.data;
        }
      }
    }
    throw Error('語言服務連線中斷，請重新嘗試。');
  } finally { await reader.cancel().catch(()=>{}); }
}

function serial(kind,work) {
  const run=queues[kind].catch(()=>{}).then(async()=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),90000);
    try{return await work(controller.signal);}catch(e){
      if(e.name==='AbortError')throw Error('處理超過 90 秒，請稍後重試。');
      if(e instanceof TypeError)throw Error('目前無法連線至族語服務，請檢查網路後重試。');
      throw e;
    }finally{clearTimeout(timer);}
  }); queues[kind]=run;return run;
}

const audioCache=new Map(),audioInFlight=new Map();
export async function synthesizeSpeech({text,ethnicity,voice}) {
  if(!canSynthesizeEntry({enabled:CONFIG.TTS_ENABLED}))throw Error('語音合成暫停中，請使用「自己錄音」。');
  if(!text.trim())throw Error('請先輸入族語文字。');
  if(text.length>300)throw Error('語音服務限制為 300 字元，請縮短句子。');
  const key=JSON.stringify([text,ethnicity,voice]);
  if(audioCache.has(key))return audioCache.get(key);
  if(audioInFlight.has(key))return audioInFlight.get(key);
  const pending=serial('tts',async signal=>{
    await gradioCall('tts','lambda',[ethnicity],signal);
    const [file]=await gradioCall('tts','default_speaker_tts',[voice,text],signal);
    const url=file?.url || (file?.path?`${CONFIG.TTS_API_URL}gradio_api/file=${file.path}`:'');
    if(!/^https:\/\//.test(url))throw Error('沒有取得可播放的音檔。');
    audioCache.set(key,url);if(audioCache.size>100)audioCache.delete(audioCache.keys().next().value);
    return url;
  });
  audioInFlight.set(key,pending);try{return await pending;}finally{audioInFlight.delete(key);}
}

export async function translateText({text,ethnicity,language,direction}) {
  if(!text.trim())throw Error('請先填寫要翻譯的文字。');
  if(text.length>3000)throw Error('翻譯文字過長。');
  return serial('mt',async signal=>{
    const toNative=direction==='toNative';
    await gradioCall('mt',toNative?'to_formosan_languages':'to_zh_languages',[ethnicity],signal);
    const data=toNative?[text,'zho_Hant',language]:[text,language,'zho_Hant'];
    const [result]=await gradioCall('mt',toNative?'translate_1':'translate',data,signal);
    if(typeof result!=='string'||!result.trim())throw Error('翻譯服務未回傳文字。');
    return result;
  });
}

let currentAudio=null, playbackVersion=0,currentAudioURL='';
export function stopSpeech(){playbackVersion++;if(currentAudioURL){URL.revokeObjectURL(currentAudioURL);currentAudioURL='';}if(currentAudio){currentAudio.onended=null;currentAudio.onerror=null;currentAudio.pause();currentAudio.removeAttribute('src');currentAudio.load();currentAudio=null;}}
export async function playSpeech(args,onStatus=()=>{}) {
  stopSpeech();const version=playbackVersion;onStatus('正在合成族語語音…');
  const url=await synthesizeSpeech(args);
  if(version!==playbackVersion)return;
  onStatus('正在下載合成音檔…');const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('無法下載語音，請稍後重試。');const blob=await normaliseAudioBlob(await response.blob());if(version!==playbackVersion)return;currentAudioURL=URL.createObjectURL(blob);currentAudio=document.getElementById('live-audio-player')||Object.assign(document.createElement('audio'),{id:'live-audio-player',hidden:true});if(!currentAudio.isConnected)document.body.append(currentAudio);currentAudio.src=currentAudioURL;currentAudio.load();onStatus('正在播放');
  currentAudio.onended=()=>{if(version===playbackVersion)onStatus('播放完畢');};
  currentAudio.onerror=()=>{if(version===playbackVersion){audioCache.delete(JSON.stringify([args.text,args.ethnicity,args.voice]));onStatus('音檔無法載入，請再按一次播放。');}};
  try{await currentAudio.play();}catch(error){if(version===playbackVersion)throw Error(playbackErrorMessage(error));}
}
