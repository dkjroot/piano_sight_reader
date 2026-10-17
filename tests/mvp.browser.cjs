const assert=require('node:assert/strict');
module.exports=async function mvpChecks(browser,url) {
  const context=await browser.newContext({viewport:{width:1440,height:900}}), page=await context.newPage(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const input={id:'mvp',name:'MVP test input',state:'connected',connection:'closed',async open(){this.connection='open';return this;},async close(){return this;}};
    window.mvpMidi=data=>input.onmidimessage?.({data:Uint8Array.from(data)});
    Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>({inputs:new Map([['mvp',input]])})});
  });
  const fullRange=async()=>page.evaluate(()=>{for(const [id,value] of Object.entries({hand:'both',size:10,span:'full',material:'sharps',low:0,high:127,'hand-span':24})) document.getElementById(id).value=value;document.getElementById('high').dispatchEvent(new Event('change'));});
  try {
    await page.goto(url); await page.waitForSelector('.note'); await fullRange();
    await page.locator('#mode-study').click(); await page.selectOption('#study-source','meter-groups');
    await page.waitForSelector('[data-score-note="pickup-melody-0-note"]');
    await page.selectOption('#study-bars','1');
    for(const theme of ['dark','light']) {
      if(await page.locator('html').getAttribute('data-theme')!==theme) await page.locator('#theme-toggle').click();
      const ledger=await page.evaluate(()=>{
        const note=document.querySelector('[data-score-note="pickup-melody-0-note"]'), group=note.closest('.vf-stavenote');
        const paths=[...group.querySelectorAll('path')].filter(path=>{const b=path.getBBox();return b.height<.1 && b.width>10;});
        const luminance=rgb=>{const values=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;});return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
        const sample=document.createElement('span');sample.style.color='var(--ink)';document.body.append(sample);const ink=getComputedStyle(sample).color;sample.remove();
        const paper=getComputedStyle(document.querySelector('main')).backgroundColor;
        return paths.map(path=>{const style=getComputedStyle(path), a=luminance(style.stroke),b=luminance(paper);return {stroke:style.stroke,ink,width:parseFloat(style.strokeWidth),contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
      });
      assert.equal(ledger.length,1,'treble middle C has one visible ledger line');
      assert.equal(ledger[0].stroke,ledger[0].ink,'ledger follows theme ink, never fixed #444');
      assert.ok(ledger[0].width>=1.4 && ledger[0].contrast>=7,JSON.stringify(ledger));
      await page.locator('#staff-panel').screenshot({path:`test-results/middle-c-${theme}.png`});
    }
    await page.locator('#connect').click(); await page.waitForFunction(()=>document.getElementById('midi-status').textContent.startsWith('Connected'));
    await page.locator('#study-start').click();
    await page.evaluate(()=>window.mvpMidi([0x90,60,100]));
    assert.equal(await page.locator('[data-score-note="pickup-melody-0-note"]').getAttribute('data-practice'),'accepted','the visible middle C is MIDI 60');
    await page.locator('#pause-practice').click();
    await page.evaluate(()=>window.mvpMidi([0x80,60,0]));
    await page.locator('#study-stop').click();
    const phrase=await page.locator('#phrase-position').innerText();
    for(const source of ['independent-voices','notation-cases','meter-groups','tempo-curves','burgmuller-op100-1-excerpt']) {
      await page.selectOption('#study-source',source); await page.waitForFunction(()=>!document.getElementById('study-start').disabled);
      for(const id of ['study-source','study-loop','study-tempo','hand','size','hand-span','ledger-limit']) assert.equal(await page.locator('#'+id).isVisible(),true,source+' exposes '+id);
      assert.ok(await page.locator('[data-score-note]').count()>0);
      await page.locator('#high').fill('0'); await page.locator('#high').dispatchEvent('change');
      await page.waitForFunction(()=>document.getElementById('study-start').disabled && !document.querySelector('[data-score-note]'));
      assert.equal(await page.locator('[data-score-note]').count(),0);
      await page.locator('#high').fill('127'); await page.locator('#high').dispatchEvent('change');
      await page.waitForFunction(()=>!document.getElementById('study-start').disabled);
    }
    await page.locator('#mode-outline').click();
    await page.evaluate(()=>{for(const [id,value] of Object.entries({source:'random',hand:'right',size:1,low:60,high:60,key:'C',material:'white',span:'full'}))document.getElementById(id).value=value;document.getElementById('high').dispatchEvent(new Event('change'));});
    for(const theme of ['dark','light']) {
      if(await page.locator('html').getAttribute('data-theme')!==theme) await page.locator('#theme-toggle').click();
      assert.ok(await page.locator('#staff .ledger').count()>0,'generated middle C retains its ledger');
      assert.equal(await page.locator('#staff .ledger').first().evaluate(node=>getComputedStyle(node).stroke),await page.locator('#staff .stem').first().evaluate(node=>getComputedStyle(node).stroke));
    }
    await fullRange();
    // Import/preview/source isolation and refresh are tested with three contrasting
    // actual editions; dense notation is displayed one bar per row.
    for(const id of ['chopin-op28-7','bach-bwv846','rachmaninoff-op3-2']) {
      await page.selectOption('#library-piece',id); await page.locator('#load-piece').click();
      await page.waitForFunction(()=>!document.getElementById('score-status').textContent.startsWith('Loading'));
      await page.waitForFunction(()=>!document.getElementById('practice-score').disabled);
      await page.locator('#passage-end').fill('16'); await page.locator('#passage-end').dispatchEvent('change');
      await page.locator('#practice-score').click(); await page.locator('#mode-study').click();
      await page.waitForFunction(()=>!document.getElementById('study-start').disabled);
      assert.equal(await page.locator('#study-source').inputValue(),'loaded');
      assert.ok(await page.locator('[data-score-note]').count()>0,id+' has readable notation');
      assert.equal(await page.locator('#staff').evaluate(node=>node.scrollWidth<=node.clientWidth+1),true);
      await page.locator('#staff-panel').screenshot({path:`test-results/mvp-${id}.png`});
      await page.locator('#mode-outline').click();
    }
    await page.reload(); await page.waitForSelector('.note');
    assert.notEqual(await page.locator('#source').inputValue(),'midi','refresh never leaves a missing local file selected');
    assert.equal(await page.locator('#study-source option[value=loaded]').evaluate(node=>node.disabled),true,await page.locator('#study-source').innerHTML());
    assert.equal(await page.locator('#study-source option[value=imported]').evaluate(node=>node.disabled),true);
    assert.deepEqual(errors,[]);
  } finally {await context.close();}
};
