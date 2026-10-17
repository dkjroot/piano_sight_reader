import {makePracticePhrase} from './harmony.js';

self.onmessage=({data})=>{
  try {
    self.postMessage({revision:data.revision,targets:makePracticePhrase(data.settings)});
  } catch {
    self.postMessage({revision:data.revision,error:'Continuous generation unavailable. Choose Repeat phrase.'});
  }
};
