import {ensureGrammarExamples} from './grammar-model.js';
// U+02BC MODIFIER LETTER APOSTROPHE is the canonical glottal-stop character.
export function normalizeNative(text){return String(text??'').replace(/['\u2018\u2019\u02bb\uff07\u0060\u00b4]/g,'\u02bc');}
export function normalizeUnitNative(unit){
  const audio=entry=>{if(entry.audio?.textSnapshot!==undefined)entry.audio.textSnapshot=normalizeNative(entry.audio.textSnapshot);};
  for(const d of unit.context.dialogues){d.text.indigenous=normalizeNative(d.text.indigenous);audio(d);}
  for(const v of unit.languageFocus.vocabulary){v.term=normalizeNative(v.term);if(v.source?.selection)v.source.selection.quote=normalizeNative(v.source.selection.quote);audio(v);}
  for(const g of unit.languageFocus.grammar){g.pattern=normalizeNative(g.pattern);for(const e of ensureGrammarExamples(g)){e.indigenous=normalizeNative(e.indigenous);audio(e);}}
  return unit;
}
