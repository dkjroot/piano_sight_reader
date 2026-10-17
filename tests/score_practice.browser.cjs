const assert=require('node:assert/strict');
module.exports=async function scorePracticeChecks(browser,url) {
  const context=await browser.newContext({viewport:{width:1280,height:1000}}), page=await context.newPage(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    let current;
    const make=()=>({id:'study-midi',name:'Study test input',state:'connected',connection:'closed',onmidimessage:null,
      async open(){if(window.holdStudyOpen) await new Promise(resolve=>{window.releaseStudyOpen=resolve;}); if(window.failStudyOpen) throw new Error('Device busy'); this.connection='open'; access.onstatechange?.(); return this;},
      async close(){this.connection='closed'; access.onstatechange?.(); return this;}});
    current=make(); const access={inputs:new Map([[current.id,current]]),onstatechange:null};
    window.studyMidi={send:data=>current.onmidimessage?.({data:Uint8Array.from(data)}),
      disconnect:()=>{window.staleStudyCallback=current.onmidimessage; current.state='disconnected'; access.onstatechange?.();},
      replace:()=>{current=make(); access.inputs.set(current.id,current); access.onstatechange?.();}};
    Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>access});
  });
  try {
    await page.goto(url+'/notation-study'); await page.waitForSelector('[data-score-note]');
    assert.equal(await page.locator('#study-keyboard').evaluate(node=>node.getBoundingClientRect().bottom<900),true,'staff and keyboard fit a desktop content viewport');
    await page.locator('#study-midi-connect').click(); await page.waitForFunction(()=>document.getElementById('study-midi-status').textContent.startsWith('Connected'));
    const send=async data=>page.evaluate(data=>window.studyMidi.send(data),data);
    const on=async pitch=>send([0x90,pitch,100]), off=async pitch=>send([0x80,pitch,0]);
    await page.locator('#study-practise').click();
    await on(72); await on(64); await on(48);
    assert.equal(await page.locator('#study-keyboard .held').count(),3);
    assert.equal(await page.locator('[data-practice=accepted]').count(),3);
    assert.equal(await page.locator('[data-practice=accepted] [data-score-tick]').first().evaluate(node=>getComputedStyle(node).visibility),'visible');
    await off(64); assert.match(await page.locator('#study-practice-status').innerText(),/Hold again E4.*Short holds 1/);
    const before=await page.inputValue('#notation-position'); await page.waitForTimeout(850);
    assert.equal(await page.inputValue('#notation-position'),before,'short holds freeze score time');
    await on(64); await page.waitForFunction(()=>document.getElementById('notation-position').value==='1');
    await off(72); await on(74); assert.equal(await page.locator('#study-keyboard .extra').count(),0);
    const renders=await page.locator('#engraving-output').getAttribute('data-renders');
    await page.evaluate(()=>window.studyMidi.disconnect());
    assert.match(await page.locator('#study-practice-status').innerText(),/Paused/);
    assert.equal(await page.locator('#study-keyboard .held').count(),0);
    await page.evaluate(()=>window.staleStudyCallback?.({data:Uint8Array.from([0x90,60,100])}));
    assert.equal(await page.locator('#study-keyboard .held').count(),0,'stale disconnected MIDI must be ignored');
    await page.evaluate(()=>window.studyMidi.replace()); await page.locator('#study-midi-connect').click();
    await page.locator('#study-practice-stop').click();
    await on(60);
    await page.locator('#study-low').fill('36'); await page.locator('#study-low').dispatchEvent('change');
    assert.equal(await page.locator('#study-keyboard .held').count(),1,'changing visible range preserves MIDI ownership');
    await page.locator('#study-inverted').check();
    assert.equal(await page.locator('#study-keyboard').getAttribute('data-inverted'),'true');
    assert.equal(await page.locator('#study-keyboard .held').evaluate(key=>getComputedStyle(key).color),'rgb(255, 255, 255)');
    await off(60);
    await page.selectOption('#study-speed','2'); await page.selectOption('#study-loop-start','7'); await page.selectOption('#study-loop-end','9');
    await page.locator('#study-practise').click(); await on(76); await on(67); await on(53);
    await page.waitForFunction(()=>document.getElementById('notation-position').value==='8');
    await on(76); assert.match(await page.locator('#study-practice-status').innerText(),/Play E5/);
    await off(76); await on(76);
    await page.waitForFunction(()=>document.getElementById('notation-position').value==='9');
    for(const pitch of [76,67,53]) await off(pitch);
    assert.match(await page.locator('#study-practice-status').innerText(),/Passage complete/);
    assert.equal(await page.locator('#engraving-output').getAttribute('data-renders'),renders,'live matching never engraves');
    await page.locator('#study-practice-stop').click(); await page.selectOption('#study-loop-start','0'); await page.selectOption('#study-loop-end','1');
    await page.selectOption('#study-continuity','pedal'); await page.locator('#study-loop').check(); await page.locator('#study-practise').click();
    await send([0xb0,64,127]); for(const pitch of [72,64,48]) await on(pitch); await off(64);
    assert.equal(await page.locator('#study-keyboard .sustained').count(),1);
    await page.waitForFunction(()=>document.getElementById('notation-position').value==='1');
    await off(72); await off(48); assert.match(await page.locator('#study-practice-status').innerText(),/Release keys and pedal/);
    await send([0xb0,64,0]); await page.waitForFunction(()=>document.getElementById('notation-position').value==='0');
    assert.equal(await page.locator('[data-practice=accepted]').count(),0,'a loop needs new attacks');
    await page.locator('#study-practice-pause').click();
    assert.match(await page.locator('#study-practice-status').innerText(),/Paused/);
    await page.locator('#study-practice-stop').click();
    const computerKey=page.locator('#study-keyboard [data-pitch="72"]'); await computerKey.focus();
    await computerKey.dispatchEvent('keydown',{key:' ',repeat:false}); await computerKey.dispatchEvent('keydown',{key:' ',repeat:true});
    assert.equal(await page.locator('#study-keyboard .held').count(),1);
    await computerKey.dispatchEvent('keyup',{key:' '}); assert.equal(await page.locator('#study-keyboard .held').count(),0);
    const other=await context.newPage(); await other.goto(url+'/help'); await other.bringToFront();
    // Headless Edge can report multiple tabs focused; inject deterministic focus.
    await page.evaluate(()=>{window.studyOriginalFocus=document.hasFocus.bind(document); document.hasFocus=()=>false; window.dispatchEvent(new Event('blur'));});
    await on(60); assert.equal(await page.locator('#study-keyboard .held').count(),0,'unfocused studies ignore MIDI');
    await other.close(); await page.bringToFront();
    await page.evaluate(()=>{document.hasFocus=window.studyOriginalFocus;});
    await page.locator('#study-practise').click(); await on(60);
    assert.match(await page.locator('#study-practice-status').innerText(),/Release keys and pedal/,'a key held while inactive must be released before entry');
    assert.equal(await page.locator('#study-keyboard .held').count(),1); await off(60); await page.locator('#study-practice-stop').click();
    await page.evaluate(()=>{window.failStudyOpen=true;}); await page.locator('#study-midi-connect').click();
    await page.waitForFunction(()=>document.getElementById('study-midi-status').textContent.includes('Device busy'));
    await page.evaluate(()=>{window.failStudyOpen=false; window.holdStudyOpen=true;}); await page.locator('#study-midi-connect').click();
    await page.waitForFunction(()=>!!window.releaseStudyOpen);
    await page.evaluate(()=>{window.studyMidi.disconnect(); window.holdStudyOpen=false; window.releaseStudyOpen();});
    await page.waitForFunction(()=>document.getElementById('study-midi-status').textContent==='No MIDI input');
    await page.waitForTimeout(30); await on(60);
    assert.equal(await page.locator('#study-keyboard .held').count(),0,'late input opens cannot attach after disconnect');
    await page.goto(url+'/notation-study?study=notation-cases');
    await page.waitForSelector('[data-score-page="2"]');
    const representation=await page.evaluate(async()=>{
      const {compileScore}=await import('/static/score_model.js');
      const score=compileScore(await(await fetch('/static/studies/notation-cases.json')).json());
      return {notes:score.notes.length,tuplets:new Set(score.events.flatMap(event=>event.tuplets.map(rule=>rule.group))).size};
    });
    assert.equal(await page.locator('[data-score-note]').count(),representation.notes);
    assert.equal(await page.locator('.vf-tuplet').count(),representation.tuplets);
    assert.equal(await page.locator('.vf-stavetie').count(),2,'ties split at page boundaries');
    const accidentals=await page.locator('svg text').evaluateAll(nodes=>nodes.flatMap(node=>[...node.textContent].map(char=>char.codePointAt(0))).filter(code=>code>=0xe260 && code<=0xe26b));
    assert.ok(accidentals.length>8,'engraving contains actual accidental glyphs');
    assert.ok(accidentals.includes(0xe263) && accidentals.includes(0xe264),'double sharp and double flat spellings must survive engraving');
    assert.equal(await page.locator('[data-pedal-value="100"]').count(),1);
    const cross=await page.locator('[data-score-note^="case-6-melody-"]').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().y));
    assert.ok(cross[1]>cross[0]+40,'authored cross-staff beam notes stay on their destination staves');
    const exact=await page.evaluate(async()=>{
      const {compileScore}=await import('/static/score_model.js'),{ScoreEngraver}=await import('/static/engraving.js');
      const score=compileScore(await(await fetch('/static/studies/notation-cases.json')).json());
      const box=document.createElement('div'); box.id='fixture-time-test'; box.style.width='1100px'; document.body.append(box);
      const renderer=new ScoreEngraver(box); renderer.draw(score);
      // Equal score-time onsets share an x coordinate even with different values.
      const noteIds=score.measures[3].events.filter(event=>event.at[0]===0).flatMap(event=>event.notes.map(note=>note.id));
      const x=noteIds.map(id=>renderer.nodes.get(id).getBoundingClientRect().x);
      const result=Math.max(...x)-Math.min(...x); box.remove(); return result;
    });
    assert.ok(exact<12,'independent voices must align by onset rather than note index');
    for(const theme of ['light','dark']) {
      if(await page.locator('html').getAttribute('data-theme')!==theme) await page.locator('#help-theme').click();
      await page.locator('.engraving-scroll').evaluate(node=>{node.style.height='auto';});
      await page.locator('.engraving-scroll').screenshot({path:`test-results/stage2-notation-${theme}.png`});
      await page.locator('.engraving-scroll').evaluate(node=>{node.style.height='';});
    }
    await page.setViewportSize({width:360,height:800});
    await page.waitForFunction(()=>+document.getElementById('engraving-output').dataset.renders>1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
  } finally {await context.close();}
  for(const mode of ['unsupported','denied']) {
    const blocked=await browser.newContext();
    await blocked.addInitScript(mode=>{window.studyMidiRequests=0; Object.defineProperty(navigator,'requestMIDIAccess',{value:mode==='unsupported'?undefined:async()=>{window.studyMidiRequests++; throw new DOMException('Denied','NotAllowedError');}});},mode);
    const tab=await blocked.newPage();
    try {
      await tab.goto(url+'/notation-study'); await tab.waitForSelector('[data-score-note]');
      assert.equal(await tab.evaluate(()=>window.studyMidiRequests),0,'loading notation does not request MIDI');
      await tab.locator('#study-midi-connect').click();
      assert.match(await tab.locator('#study-midi-status').innerText(),mode==='unsupported'?/unavailable/:/Denied/);
      assert.equal(await tab.locator('#study-practise').isDisabled(),false,'on-screen practice remains available');
    } finally {await blocked.close();}
  }
};
