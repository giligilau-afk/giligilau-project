// Demo access is a convenience switch, not an authentication mechanism.
export function isSpeechDemo(search=globalThis.location?.search||''){return new URLSearchParams(search).get('demo')==='1';}
export function canSynthesizeEntry({enabled,search=globalThis.location?.search||''}){return enabled!==false||isSpeechDemo(search);}
