export function ensureGrammarExamples(g){
  if(!Array.isArray(g.examples))g.examples=[{...(g.example||{indigenous:'',zhHant:''})}];
  while(g.examples.length<3)g.examples.push({indigenous:'',zhHant:''});
  g.examples.forEach((e,i)=>{e.id||=`${g.id}_example_${i+1}`;e.indigenous??='';e.zhHant??='';});
  // Keep the first example readable by the earlier draft format.
  g.example=g.examples[0];return g.examples;
}
export function grammarEntries(unit){return unit.languageFocus.grammar.flatMap(g=>ensureGrammarExamples(g));}
