export class TeacherRecorder {
  constructor({mediaDevices=globalThis.navigator?.mediaDevices,Recorder=globalThis.MediaRecorder}={}){this.mediaDevices=mediaDevices;this.Recorder=Recorder;this.pending=false;this.cancelled=false;}
  async start({onStop,onCancel=()=>{},onError=()=>{}}){
    if(this.pending||this.recorder)throw Error('已有錄音正在進行。');
    if(!this.mediaDevices?.getUserMedia||!this.Recorder)throw Error('這個瀏覽器無法錄音，請以 Chrome、Edge 或 Safari 開啟 HTTPS 網址。');
    this.pending=true;this.cancelled=false;
    try{
      this.stream=await this.mediaDevices.getUserMedia({audio:true});
      if(this.cancelled){this.release();this.pending=false;onCancel();return;}
      const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>this.Recorder.isTypeSupported(t));
      const recorder=new this.Recorder(this.stream,mime?{mimeType:mime}:undefined);this.recorder=recorder;this.pending=false;const chunks=[];let failed=false;
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
      recorder.onstop=()=>{const cancelled=this.cancelled;this.release();this.recorder=null;if(failed)return;if(cancelled)onCancel();else onStop(new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||'audio/webm'}));};
      recorder.onerror=()=>{failed=true;this.release();this.recorder=null;onError(Error('錄音中斷，請檢查麥克風後重試。'));};
      recorder.start();
    }catch(e){this.pending=false;this.release();this.recorder=null;throw Error(e.name==='NotAllowedError'?'麥克風未獲允許，請在瀏覽器設定中允許後再試。':e.name==='NotFoundError'?'找不到麥克風，請確認裝置已連接。':'無法開始錄音，請確認麥克風可用。');}
  }
  stop(){if(this.recorder?.state==='recording')this.recorder.stop();}
  cancel(){this.cancelled=true;if(this.recorder?.state==='recording')this.recorder.stop();}
  release(){this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;}
}
