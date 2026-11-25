export function audioMime(bytes,fallback=''){
 const ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WAVE')return 'audio/wav';
 if(ascii(0,4)==='OggS')return 'audio/ogg';
 if(ascii(0,3)==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224))return 'audio/mpeg';
 if(ascii(0,4)==='fLaC')return 'audio/flac';
 if(ascii(4,8)==='ftyp')return 'audio/mp4';
 return fallback.startsWith('audio/')?fallback:'application/octet-stream';
}
export async function normaliseAudioBlob(blob){const mime=audioMime(new Uint8Array(await blob.slice(0,16).arrayBuffer()),blob.type);return mime===blob.type?blob:new Blob([blob],{type:mime});}
export function playbackErrorMessage(error){
 if(error?.name==='NotAllowedError')return '瀏覽器未允許播放。請再按播放，或在瀏覽器開啟此教材。';
 if(error?.name==='NotSupportedError')return '瀏覽器無法解碼這份音檔，請重新準備或下載最新版教材。';
 if(error?.name==='AbortError')return '播放已中止，請再按播放。';
 return '語音播放失敗，請重新準備或下載教材。';
}
