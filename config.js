// Only PUBLIC configuration belongs here. Never put a service_role key or private API key in GitHub.
export const CONFIG = Object.freeze({
  TTS_ENABLED: true, // Enable single, batch and export-time synthesis.
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  // Optional server proxy. Leave empty for the currently public ILRDF Gradio APIs.
  API_PROXY_URL: '',
  TTS_API_URL: 'https://ai-labs.ilrdf.org.tw/hnang-kari-ai-asi-sluhay/',
  MT_API_URL: 'https://ai-labs.ilrdf.org.tw/kari-seejiq-tnpusu-ai-hmjil/',
});
