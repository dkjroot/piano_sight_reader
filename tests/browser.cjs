// Optional browser integration suite. Start app.py first; see DEVELOPMENT.md.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
  try {
    const mainContext=await browser.newContext({viewport:{width:1280,height:1000}});
    const page = await mainContext.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      if(!localStorage.getItem('piano-sight-reader-v1')) localStorage.setItem('piano-sight-reader-v1',JSON.stringify({progression:'release'}));
      const makeInput = () => ({id: 'synthetic', name: 'Synthetic test piano', state: 'connected', connection: 'closed', onmidimessage: null,
        async open() { if (this.failOpen) throw new DOMException('Device busy', 'InvalidStateError'); this.connection = 'open'; access.onstatechange?.(); return this; },
        async close() { this.connection = 'closed'; access.onstatechange?.(); return this; }});
      let input = makeInput();
      const access = {inputs: new Map([[input.id, input]]), onstatechange: null};
      window.testMidi = {
        send: data => { if (input.connection === 'open') input.onmidimessage?.({data: new Uint8Array(data)}); },
        disconnect: () => {input.state = 'disconnected'; access.onstatechange();},
        reconnect: () => {input.state = 'connected'; access.onstatechange();},
        failOpen: fail => {input.failOpen = fail;},
        replace: () => {input = makeInput(); access.inputs.set(input.id, input); access.onstatechange();}
      };
      Object.defineProperty(navigator, 'requestMIDIAccess', {value: async () => access});
    });
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:8766');
    await page.waitForSelector('.key.target').catch(error=>{throw new Error(error.message+'; page errors: '+errors.join('; '));});
    assert.equal(await page.locator('#repeat, #skip').count(),0);
    assert.equal(await page.getByRole('heading',{level:1,name:'Piano Sight Reader'}).count(),1);
    assert.equal(await page.locator('h1').evaluate(heading=>heading.getBoundingClientRect().height<40),true);
    assert.match(await page.locator('header').evaluate(header=>getComputedStyle(header,'::before').maskImage),/score-banner-v1.png/);
    await page.selectOption('#length','1');
    await page.selectOption('#preview','0');
    assert.equal(await page.locator('.staff-line').count(), 11);
    assert.equal(await page.locator('#show-targets').isChecked(), false);
    const marker = () => page.locator('.key.target').first().evaluate(key => getComputedStyle(key, '::after').content);
    assert.equal(await marker(), 'none');
    await page.locator('#show-targets').check();
    assert.notEqual(await marker(), 'none');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('#theme-toggle').innerText(),'Light mode');
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('.note').first().getAttribute('rx'), '7.5');
    assert.equal(await page.locator('.note').first().getAttribute('ry'), '4.5');
    await page.selectOption('#key', 'G');
    await page.evaluate(() => {
      for (const [id,value] of Object.entries({low:65, high:66, size:1, hand:'right', material:'white'})) document.getElementById(id).value = value;
      document.getElementById('high').dispatchEvent(new Event('change'));
    });
    assert.equal(await page.locator('.key-signature').count(), 2);
    assert.equal(await page.locator('.note').getAttribute('data-midi'), '66');
    assert.equal(await page.locator('.accidental').count(), 0);
    await page.evaluate(() => {
      document.getElementById('material').value = 'sharps';
      document.getElementById('high').value = '65';
      document.getElementById('high').dispatchEvent(new Event('change'));
    });
    assert.equal(await page.locator('.accidental[data-accidental-midi="65"]').textContent(), '♮');
    await page.selectOption('#key', 'Cb');
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#key'), 'Cb');
    assert.equal(await page.locator('.key-signature').count(), 14);
    await page.screenshot({path:'test-results/key-signature.png', fullPage:true});
    await page.selectOption('#key', 'C');
    await page.evaluate(() => {
      for (const [id,value] of Object.entries({low:48, high:84, size:1, 'min-size':1, hand:'right', material:'white', span:'near'})) document.getElementById(id).value = value;
      document.getElementById('high').dispatchEvent(new Event('change'));
    });
    await page.locator('#invert-keyboard').check();
    await page.reload(); await page.waitForSelector('.key.target').catch(error=>{throw new Error(error.message+'; page errors: '+errors.join('; '));});
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.equal(await page.locator('#invert-keyboard').isChecked(), true);
    assert.equal(await page.locator('#keyboard').getAttribute('data-inverted'), 'true');
    assert.equal(await page.locator('#show-targets').isChecked(), true);
    await page.locator('#show-targets').uncheck();
    assert.equal(await marker(), 'none');
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('#invert-keyboard').isChecked(), true);
    await page.locator('#invert-keyboard').uncheck();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('#connect').click();
    assert.match(await page.locator('#midi-status').innerText(), /Connected/);
    // A brief correct tap must not advance; one-note directions are unambiguous.
    const first = +(await page.locator('.key.target').getAttribute('data-pitch'));
    const initialSend = data => page.evaluate(data => window.testMidi.send(data), data);
    await initialSend([0x90, first-1, 90]);
    assert.match(await page.locator('#feedback').innerText(), /Adjust/);
    assert.equal(await page.locator(`.key[data-pitch="${first-1}"] .key-direction`).innerText(), '↑');
    assert.equal(await page.locator('.note-direction').textContent(), '↑');
    await page.screenshot({path: 'test-results/dark-hint.png', fullPage: true});
    await initialSend([0x80, first-1, 0]);
    assert.equal(await page.locator('.note-direction').textContent(), '');
    await initialSend([0x90, first+1, 90]);
    assert.equal(await page.locator(`.key[data-pitch="${first+1}"] .key-direction`).innerText(), '↓');
    assert.equal(await page.locator('.note-direction').textContent(), '↓');
    await initialSend([0x80, first+1, 0]);
    await page.evaluate(n => { window.testMidi.send([0x90, n, 90]); window.testMidi.send([0x80, n, 0]); }, first);
    await page.waitForTimeout(160);
    assert.equal(await page.locator('#count').innerText(), '0');
    // Native pointer capture drives on-screen keys independently of MIDI.
    const virtualKey = page.locator(`.key[data-pitch="${first}"]`);
    await virtualKey.hover(); await page.mouse.down();
    assert.equal(await virtualKey.getAttribute('aria-pressed'), 'true');
    await page.mouse.up();
    assert.equal(await virtualKey.getAttribute('aria-pressed'), 'false');
    await page.selectOption('#hand', 'both');
    await page.selectOption('#size', '3');
    await page.selectOption('#min-size', '3');
    const pitches = await page.locator('.key.target').evaluateAll(keys => keys.map(k => +k.dataset.pitch));
    const send = data => page.evaluate(data => window.testMidi.send(data), data);
    const highest = Math.max(...pitches);
    for (const n of pitches.filter(n => n !== highest)) await send([0x90, n, 90]);
    await send([0x90, highest+1, 90]);
    assert.equal(await page.locator(`.key[data-pitch="${highest+1}"] .key-direction`).innerText(), '↓');
    assert.equal(await page.locator(`.note-direction[data-target="${highest}"]`).textContent(), '↓');
    assert.ok(await page.locator(`.note-direction:not([data-target="${highest}"])`).evaluateAll(hints => hints.every(h => !h.textContent)));
    assert.equal(await page.locator('.key.correct').count(), 2);
    assert.ok(await page.locator('.key.correct .key-state').evaluateAll(marks => marks.every(mark => mark.textContent === '✓')));
    assert.equal(await page.locator(`.key[data-pitch="${highest+1}"] .key-state`).innerText(), '×');
    assert.equal(await page.locator('.note-check').evaluateAll(marks => marks.filter(mark => mark.textContent === '✓').length), 2);
    // Feedback foregrounds must remain readable in both themes and keyboard modes.
    for (const theme of ['dark', 'light']) for (const inverted of [false, true]) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      await page.locator('#invert-keyboard').setChecked(inverted);
      assert.ok(await page.locator('.key.correct, .key.wrong').evaluateAll(keys => {
        const luminance = colour => {
          const rgb = colour.match(/[\d.]+/g).slice(0,3).map(Number).map(v => v/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
          return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
        };
        return keys.every(key => {
          const style = getComputedStyle(key);
          const a = luminance(style.color), b = luminance(style.backgroundColor);
          return (Math.max(a,b)+.05)/(Math.min(a,b)+.05) >= 4.5;
        });
      }));
      assert.ok(await page.locator('#keyboard').evaluate(keyboard => {
        const previous = keyboard.dataset.showTargets; keyboard.dataset.showTargets = 'true';
        const luminance = colour => {
          const c = colour.match(/[\d.]+/g).slice(0,3).map(Number).map(v => v/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
          return c[0]*.2126+c[1]*.7152+c[2]*.0722;
        };
        const passed = [...keyboard.querySelectorAll('.key')].every(key => {
          const wasTarget = key.classList.contains('target'); key.classList.add('target');
          const a = luminance(getComputedStyle(key, '::after').color), b = luminance(getComputedStyle(key).backgroundColor);
          key.classList.toggle('target', wasTarget);
          return (Math.max(a,b)+.05)/(Math.min(a,b)+.05) >= 3;
        });
        keyboard.dataset.showTargets = previous;
        return passed;
      }));
    }
    await page.evaluate(() => {document.documentElement.dataset.theme = 'dark';});
    await page.locator('#invert-keyboard').uncheck();
    await page.screenshot({path: 'test-results/chord-hint-dark.png', fullPage: true});
    await page.locator('#theme-toggle').click();
    await page.screenshot({path: 'test-results/chord-hint-light.png', fullPage: true});
    await page.locator('#theme-toggle').click();
    for (const n of [...pitches.filter(n => n !== highest), highest+1]) await send([0x80, n, 0]);
    const extra = pitches.includes(61) ? 63 : 61;
    await send([0x90, pitches[0], 90]);
    await page.waitForTimeout(180);
    assert.equal(await page.locator('#count').innerText(), '0');
    await send([0x90, extra, 90]);
    assert.equal(await page.locator('.key.wrong').count(), 1);
    assert.doesNotMatch(await page.locator('#feedback').innerText(), /move up|move down/);
    for (const n of pitches.slice(1)) await send([0x90, n, 90]);
    assert.ok(await page.locator('.note-direction, .key-direction').evaluateAll(hints => hints.every(h => h.textContent === '')));
    await page.waitForTimeout(160);
    assert.equal(await page.locator('#count').innerText(), '0');
    await send([0x80, extra, 0]);
    // A clock/active-sensing flood must not postpone chord completion.
    await page.evaluate(async () => {
      for (let i = 0; i < 22; i++) { window.testMidi.send([0xfe]); window.testMidi.send([0xf8]); await new Promise(r => setTimeout(r, 10)); }
    });
    assert.equal(await page.locator('#count').innerText(), '1');
    assert.match(await page.locator('#feedback').innerText(), /Release/);
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#count').innerText(), '1');
    await send([0xb0, 64, 127]);
    for (const n of pitches) await send([0x90, n, 0]);
    await page.waitForTimeout(350);
    assert.equal(await page.locator('#count').innerText(), '1');
    assert.equal(await page.locator('.key.correct').count(), 0);
    assert.equal(await page.locator('.key.sustained').count(), 3);
    assert.ok(await page.locator('.key.sustained .key-state').evaluateAll(marks => marks.every(mark => mark.textContent === '≈')));
    await send([0xb0, 64, 0]);
    assert.equal(await page.locator('.key.sustained').count(), 0);

    await page.locator('#learn-low').click(); await send([0x90, 12, 90]);
    await page.locator('#learn-high').click(); await send([0x90, 115, 90]);
    assert.equal(await page.inputValue('#low'), '12');
    assert.equal(await page.inputValue('#high'), '115');
    await page.reload(); await page.waitForSelector('.key.target');
    assert.equal(await page.inputValue('#low'), '12');
    assert.equal(await page.inputValue('#high'), '115');
    await page.locator('#connect').click();
    await send([0x90, 60, 90]);
    await page.evaluate(() => window.testMidi.disconnect());
    assert.equal(await page.locator('.key.correct, .key.wrong').count(), 0);
    assert.match(await page.locator('#midi-status').innerText(), /No MIDI input/);
    await page.evaluate(() => window.testMidi.reconnect());
    await page.waitForFunction(() => document.getElementById('midi-status').textContent.startsWith('Connected'));
    assert.match(await page.locator('#midi-status').innerText(), /Connected/);
    // Real input ports must open, not merely appear in the device list. Native
    // open/close emits statechange; replacement ports may preserve the same ID.
    await page.evaluate(() => window.testMidi.replace());
    await page.waitForFunction(() => document.getElementById('midi-status').textContent.startsWith('Connected'));
    await send([0x90, 60, 90]);
    assert.match(await page.locator('#midi-activity').innerText(), /C4.*MIDI 60/);
    assert.equal(await page.locator('.key[data-pitch="60"]').getAttribute('aria-pressed'), 'true');
    await send([0x80, 60, 0]);
    await page.evaluate(() => window.testMidi.failOpen(true));
    await page.locator('#connect').click();
    assert.match(await page.locator('#midi-status').innerText(), /could not open.*InvalidStateError/);
    await page.evaluate(() => window.testMidi.failOpen(false));
    await page.locator('#connect').click();
    assert.match(await page.locator('#midi-status').innerText(), /Connected/);
    await send([0x90, 62, 90]);
    assert.match(await page.locator('#midi-activity').innerText(), /D4.*MIDI 62/);
    assert.equal(await page.locator('.key[data-pitch="62"]').getAttribute('aria-pressed'), 'true');
    await send([0x80, 62, 0]);

    // Desktop and narrow-screen rendering: keyboard scrolls within its card.
    await page.screenshot({path: 'test-results/desktop.png', fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: 'test-results/mobile.png', fullPage: true});
    await page.locator('#invert-keyboard').check();
    await page.screenshot({path: 'test-results/mobile-inverted.png', fullPage: true});
    await page.locator('#theme-toggle').click();
    await page.screenshot({path: 'test-results/light-inverted.png', fullPage: true});
    await page.locator('#theme-toggle').click();
    await page.locator('#invert-keyboard').uncheck();
    await page.setViewportSize({width: 1280, height: 1000});
    // Reproduce D4 / D-sharp4 / G4 through the real generator and renderer.
    await page.evaluate(() => {
      for (const [id, value] of Object.entries({low: 62, high: 67, size: 3, hand: 'right', span: 'full', material: 'sharps'})) document.getElementById(id).value = value;
      const random = Math.random, values = [0, 0, .99];
      try { Math.random = () => values.shift() ?? 0; document.getElementById('high').dispatchEvent(new Event('change')); }
      finally { Math.random = random; }
    });
    assert.deepEqual(await page.locator('.note').evaluateAll(notes => notes.map(n => +n.dataset.midi)), [62,63,67]);
    assert.equal(await page.locator('.accidental[data-accidental-midi="63"]').textContent(), '♭');
    assert.equal(await page.locator('.note').evaluateAll(notes => new Set(notes.map(n => n.getAttribute('cy'))).size), 3);
    const accidental = await page.locator('.accidental').evaluate(el => el.getBBox().x + el.getBBox().width);
    const chordLeft = await page.locator('.note').evaluateAll(notes => Math.min(...notes.map(n => +n.getAttribute('cx')-9)));
    assert.ok(chordLeft-accidental >= 7 && chordLeft-accidental < 12);
    await page.screenshot({path: 'test-results/enharmonic-chord-dark.png', fullPage: true});
    await page.locator('#theme-toggle').click();
    await page.screenshot({path: 'test-results/enharmonic-chord-light.png', fullPage: true});
    await page.locator('#theme-toggle').click();
    for (const [pitch, hand, label] of [[127, 'right', 'high'], [0, 'left', 'low']]) {
      await page.evaluate(({pitch, hand}) => {
        for (const [id, value] of Object.entries({low: pitch, high: pitch, size: 1, hand, span: 'full', material: 'sharps'})) document.getElementById(id).value = value;
        document.getElementById('high').dispatchEvent(new Event('change'));
      }, {pitch, hand});
      assert.ok(await page.locator('.ledger').count() > 8);
      assert.ok(await page.locator('#staff svg').evaluate(svg => {
        const view = svg.viewBox.baseVal;
        return [...svg.querySelectorAll('.note, .ledger, .stem, .clef')].every(el => {
          const box = el.getBBox();
          return box.y >= 0 && box.y+box.height <= view.height;
        });
      }));
      await page.screenshot({path: `test-results/ledger-${label}.png`, fullPage: true});
    }
    // Phrase progression is pitch-gated, advances only after physical release,
    // retains the exact sequence for replay, and keeps the active column fixed.
    await page.locator('#connect').click();
    await page.evaluate(() => {
      for (const [id,value] of Object.entries({low:60, high:72, size:3, 'min-size':1, length:8, preview:3, hand:'right', material:'white', span:'near', key:'C'})) document.getElementById(id).value = value;
      document.getElementById('length').dispatchEvent(new Event('change'));
    });
    const original = [];
    const startingCount = +(await page.locator('#count').innerText());
    const pointerX = await page.locator('.phrase-pointer').getAttribute('d');
    await page.screenshot({path:'test-results/phrase-dark.png', fullPage:true});
    await page.locator('#theme-toggle').click();
    await page.screenshot({path:'test-results/phrase-light.png', fullPage:true});
    await page.locator('#theme-toggle').click();
    await send([0x90,61,90]); await page.waitForTimeout(160);
    assert.equal(await page.locator('.phrase-pointer').getAttribute('data-step'),'0');
    await send([0x80,61,0]); await send([0xb0,64,127]);
    for (let step=0; step<8; step++) {
      const notes = await page.locator('.key.target').evaluateAll(keys => keys.map(key => +key.dataset.pitch));
      original.push(notes);
      if (step === 7) {
        assert.ok(await page.locator('.phrase-boundary').count() > 0);
        assert.deepEqual(await page.locator('.note[data-step="8"]').evaluateAll(heads => heads.map(head => +head.dataset.midi)), original[0]);
        assert.ok(await page.locator('.step-number').count() > 1);
        await page.screenshot({path:'test-results/repeat-boundary.png',fullPage:true});
      }
      assert.equal(await page.locator('.phrase-pointer').getAttribute('data-step'),String(step));
      assert.equal(await page.locator('.phrase-pointer').getAttribute('d'),pointerX);
      await page.waitForTimeout(160); // Sustained earlier notes cannot advance.
      assert.equal(await page.locator('.phrase-pointer').getAttribute('data-step'),String(step));
      for (const n of notes) await send([0x90,n,90]);
      await page.waitForTimeout(160);
      assert.ok(await page.locator('.note.hit').evaluateAll(heads => heads.every(head => +head.dataset.step === +document.querySelector('.phrase-pointer').dataset.step)));
      assert.match(await page.locator('#feedback').innerText(),/Release/);
      for (const n of notes) await send([0x80,n,0]);
      await page.waitForTimeout(300);
    }
    assert.equal(+(await page.locator('#count').innerText()),startingCount+1);
    assert.equal(await page.locator('.phrase-pointer').getAttribute('data-step'),'0');
    await page.selectOption('#preview','0');
    assert.ok(await page.locator('.note').evaluateAll(notes => notes.every(note => note.dataset.step === '0')));
    await page.selectOption('#preview','3');
    for (let step=0; step<8; step++) {
      assert.deepEqual(await page.locator('.key.target').evaluateAll(keys => keys.map(key => +key.dataset.pitch)),original[step]);
      for (const n of original[step]) await send([0x90,n,90]);
      await page.waitForTimeout(160);
      for (const n of original[step]) await send([0x80,n,0]);
      await page.waitForTimeout(300);
    }
    await send([0x90,original[0][0],90]);
    await page.selectOption('#key','G');
    await page.waitForTimeout(170);
    assert.equal(await page.locator('#feedback').innerText(),'Release keys');
    await send([0x80,original[0][0],0]); await send([0xb0,64,0]);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await page.locator('.phrase-pointer').getAttribute('data-step'),'0');
    await page.screenshot({path:'test-results/phrase-mobile.png',fullPage:true});
    await page.setViewportSize({width:1280,height:1000});
    // An exactly recognised chord is named only after it is played correctly.
    await page.evaluate(() => {
      for (const [id,value] of Object.entries({low:60, high:67, size:3, 'min-size':3, length:1, hand:'right', material:'white', key:'C'})) document.getElementById(id).value=value;
      const previous = Math.random, values=[0,0,.3,.99];
      try {Math.random=()=>values.shift()??0; document.getElementById('length').dispatchEvent(new Event('change'));}
      finally {Math.random=previous;}
    });
    assert.deepEqual(await page.locator('.key.target').evaluateAll(keys => keys.map(key=>+key.dataset.pitch)),[60,64,67]);
    assert.equal(await page.locator('#chord-name').innerText(),'');
    for (const n of [60,64,67]) await send([0x90,n,90]);
    await page.waitForTimeout(160);
    assert.equal(await page.locator('#chord-name').innerText(),'C');
    await page.selectOption('#preview','0');
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#preview'),'0');
    assert.ok(await page.locator('.note').evaluateAll(notes => notes.every(note => note.dataset.step === '0')));
    await page.selectOption('#length','2');
    await page.selectOption('#size','1');
    await page.locator('#end-new').check();
    assert.equal(await page.locator('#length').isDisabled(),true);
    assert.equal(await page.locator('#repeat, #skip').count(),0);
    assert.equal(await page.getByRole('heading',{level:1,name:'Piano Sight Reader'}).count(),1);
    assert.equal(await page.locator('h1').evaluate(heading=>heading.getBoundingClientRect().height<40),true);
    assert.match(await page.locator('header').evaluate(header=>getComputedStyle(header,'::before').maskImage),/score-banner-v1.png/);
    assert.equal(await page.locator('.phrase-boundary').count(),0);
    await page.locator('#connect').click();
    for (let step=1; step<=29; step++) {
      assert.equal(await page.locator('#phrase-position').innerText(),String(step));
      const note = +(await page.locator('.key.target').getAttribute('data-pitch'));
      await send([0x90,note,90]); await page.waitForTimeout(160);
      await send([0x80,note,0]); await page.waitForTimeout(300);
    }
    assert.equal(await page.locator('#phrase-position').innerText(),'30');
    assert.equal(await page.locator('#count').innerText(),'29');
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.locator('#end-new').isChecked(),true);
    assert.equal(await page.locator('#length').isDisabled(),true);
    await page.locator('#end-repeat').check();
    assert.equal(await page.locator('#length').isDisabled(),false);
    assert.equal(await page.inputValue('#length'),'2');
    assert.equal(await page.locator('#phrase-position').innerText(),'1 / 2');
    await page.locator('#connect').click();
    await page.evaluate(() => {
      for (const [id,value] of Object.entries({low:60,high:72,size:1,'min-size':1,length:8,preview:3,'scroll-mode':'page',hand:'right',material:'white',key:'C'})) document.getElementById(id).value=value;
      document.getElementById('length').dispatchEvent(new Event('change'));
    });
    const pageGeometry = await page.locator('.note').evaluateAll(notes=>notes.map(n=>[n.dataset.step,n.getAttribute('cx')]));
    for (let step=0; step<4; step++) {
      const pitch=+(await page.locator('.key.target').getAttribute('data-pitch'));
      await send([0x90,pitch,90]); await page.waitForTimeout(160);
      await send([0x80,pitch,0]); await page.waitForTimeout(300);
      if (step<3) assert.deepEqual(await page.locator('.note').evaluateAll(notes=>notes.map(n=>[n.dataset.step,n.getAttribute('cx')])),pageGeometry);
    }
    assert.equal(await page.locator('.phrase-system').getAttribute('data-start'),'4');
    const current=await page.locator('.key.target').getAttribute('data-pitch');
    await page.selectOption('#scroll-mode','note');
    assert.equal(await page.locator('.key.target').getAttribute('data-pitch'),current);
    assert.equal(await page.locator('.phrase-pointer').getAttribute('data-step'),'4');
    await page.selectOption('#scroll-mode','page');
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#scroll-mode'),'page');
    const densityTarget=await page.locator('.key.target').getAttribute('data-pitch');
    for (const [width,height] of [[1920,900],[1536,800],[1280,720]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.waitForFunction(()=>document.documentElement.dataset.density === 'compact');
      assert.equal(await page.locator('html').getAttribute('data-density'),'compact');
      const keyboard=await page.locator('#keyboard').boundingBox();
      assert.ok(keyboard.y >= 0 && keyboard.y+keyboard.height <= height-8,JSON.stringify({width,height,keyboard}));
      assert.equal(await page.locator('.key.target').getAttribute('data-pitch'),densityTarget);
      await page.screenshot({path:`test-results/compact-${width}x${height}.png`,fullPage:true});
    }
    await page.selectOption('#density','1440');
    assert.equal(await page.locator('html').getAttribute('data-density'),'comfortable');
    await page.selectOption('#density','1080');
    await page.setViewportSize({width:1920,height:1200});
    assert.equal(await page.locator('html').getAttribute('data-density'),'compact');
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#density'),'1080');
    await page.locator('#connect').click();
    await page.evaluate(()=>{
      for(const [id,value] of Object.entries({source:'random',low:60,high:67,size:3,'min-size':3,length:1,preview:0,hand:'right',material:'white',span:'near',key:'C'})) document.getElementById(id).value=value;
      document.getElementById('source').dispatchEvent(new Event('change'));
    });
    for(const [preset,width,height] of [['720',1280,540],['1080',1920,880],['1440',2560,1160],['2160',3840,1920]]) {
      await page.setViewportSize({width,height});
      for(const selection of [preset,'auto']) {
        await page.selectOption('#density',selection); await page.evaluate(()=>window.scrollTo(0,0));
        await page.waitForFunction(preset=>document.documentElement.dataset.layout===preset,preset);
        const anchor=await page.locator('#keyboard').boundingBox();
        assert.ok(anchor.y+anchor.height<=height-8,JSON.stringify({preset,selection,height,anchor}));
        const clefs=await page.locator('.clef').evaluateAll(elements=>elements.map(element=>element.getBoundingClientRect().toJSON()));
        const staffBox=await page.locator('#staff').boundingBox();
        assert.ok(clefs.every(clef=>clef.top>=staffBox.y-1 && clef.bottom<=staffBox.y+staffBox.height+1),'both clefs must remain visible');
        if(preset==='1440') assert.equal(await page.locator('#staff').evaluate(staff=>staff.scrollHeight<=staff.clientHeight+1),true,'ordinary 1440p notation must fit without a scrollbar');
        if(preset==='1440') assert.equal(await page.locator('#staff').evaluate(staff=>staff.scrollHeight<=staff.clientHeight+1),true,'ordinary 1440p notation must fit without a scrollbar');
        const checkAnchor=async()=>assert.ok(Math.abs((await page.locator('#keyboard').boundingBox()).y-anchor.y)<1,'playing feedback must not move the keyboard');
        await send([0x90,59,90]); await checkAnchor(); await send([0x80,59,0]);
        const notes=await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>+key.dataset.pitch));
        await send([0x90,notes[0],90]); await checkAnchor();
        for(const note of notes.slice(1)) await send([0x90,note,90]);
        await page.waitForTimeout(160); await checkAnchor();
        for(const note of notes) await send([0x80,note,0]);
        await page.waitForTimeout(300); await checkAnchor();
        await page.evaluate(()=>document.getElementById('pause-practice').click()); await checkAnchor();
        await page.evaluate(()=>document.getElementById('pause-practice').click()); await checkAnchor();
        await page.screenshot({path:`test-results/layout-${selection}-${height}.png`,fullPage:false});
      }
    }
    await page.selectOption('#density','1080');
    await page.setViewportSize({width:1280,height:1000});
    await page.evaluate(()=>{document.getElementById('low').value=21; document.getElementById('high').value=108; document.getElementById('high').dispatchEvent(new Event('change'));});
    const scaledTarget=await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>key.dataset.pitch));
    assert.ok(await page.locator('#keyboard-scroll').evaluate(container=>container.scrollWidth<=container.clientWidth+1),'88 keys should fit automatically');
    await page.selectOption('#key-size','36');
    assert.ok(await page.locator('#keyboard-scroll').evaluate(container=>container.scrollWidth>container.clientWidth));
    assert.deepEqual(await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>key.dataset.pitch)),scaledTarget);
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#key-size'),'36');
    await page.selectOption('#key-size','auto');
    const keyElement=await page.locator('.key').first().elementHandle();
    await page.setViewportSize({width:1536,height:900});
    await page.waitForTimeout(60);
    assert.equal(await keyElement.evaluate(element=>element.isConnected),true,'resizing must preserve captured key nodes');
    await page.setViewportSize({width:1280,height:1000});
    await page.locator('#connect').click();
    await page.evaluate(()=>{
      for (const [id,value] of Object.entries({source:'cadence' ,'harmony-scale':'major','hand-span':12,low:60,high:84,size:3,'min-size':3,length:4,preview:3,'scroll-mode':'note',hand:'right',material:'white',span:'wide',key:'C'})) document.getElementById(id).value=value;
      document.getElementById('source').dispatchEvent(new Event('change'));
    });
    assert.equal(await page.locator('#material').isDisabled(),true);
    assert.equal(await page.locator('#harmony-scale').isDisabled(),false);
    const cadencePcs=[[0,4,7],[0,5,9],[2,7,11],[0,4,7]];
    for (let step=0;step<4;step++) {
      const notes=await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>+key.dataset.pitch));
      assert.deepEqual([...new Set(notes.map(n=>n%12))].sort((a,b)=>a-b),cadencePcs[step]);
      for (const n of notes) await send([0x90,n,90]); await page.waitForTimeout(160);
      for (const n of notes) await send([0x80,n,0]); await page.waitForTimeout(300);
    }
    await page.screenshot({path:'test-results/harmonic-cadence.png',fullPage:true});
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#source'),'cadence');
    await page.selectOption('#harmony-kind','sevenths');
    await page.selectOption('#cadence-shape','ii-v-i');
    await page.selectOption('#size','4'); await page.selectOption('#min-size','4');
    await page.selectOption('#length','3');
    const seventhSteps=await page.locator('.note').evaluateAll(notes=>Object.entries(Object.groupBy(notes,note=>note.dataset.step)).map(([,group])=>[...new Set(group.map(note=>+note.dataset.midi%12))].sort((a,b)=>a-b)));
    assert.deepEqual(seventhSteps.slice(0,3),[[0,2,5,9],[2,5,7,11],[0,4,7,11]]);
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#harmony-kind'),'sevenths'); assert.equal(await page.inputValue('#cadence-shape'),'ii-v-i');
    await page.selectOption('#harmony-scale','minor');
    assert.equal(await page.locator('#cadence-shape option:checked').textContent(),'iiø7–v7–i7');
    await page.selectOption('#harmony-scale','major');
    await page.locator('#save-history').check();
    await page.locator('#connect').click();
    await page.evaluate(()=>{
      for (const [id,value] of Object.entries({source:'random',low:60,high:60,size:1,'min-size':1,length:1,preview:0,hand:'right',material:'white',span:'near',key:'C'})) document.getElementById(id).value=value;
      document.getElementById('source').dispatchEvent(new Event('change'));
    });
    await send([0x90,61,90]); await send([0x80,61,0]);
    await send([0x90,60,90]); await page.waitForTimeout(170);
    assert.equal(await page.locator('#stats-count').innerText(),'1');
    assert.equal(await page.locator('#stats-accuracy').innerText(),'0%');
    await send([0x80,60,0]); await page.waitForTimeout(300);
    await send([0x90,60,90]); await page.waitForTimeout(170);
    assert.equal(await page.locator('#stats-count').innerText(),'2');
    assert.equal(await page.locator('#stats-accuracy').innerText(),'50%');
    assert.notEqual(await page.locator('#stats-best').innerText(),'—');
    await send([0x80,60,0]); await page.waitForTimeout(350);
    await page.selectOption('#analysis-dimension','position');
    assert.match(await page.locator('#analysis-rows').innerText(),/ledger 1 below/);
    assert.equal(await page.locator('#progress-chart svg').count(),1);
    assert.equal(await page.locator('#progress-chart .chart-point').getAttribute('cx'),'320','a single UTC practice day is centred');
    const [historyDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#export-history').click()]);
    const exported=JSON.parse(require('node:fs').readFileSync(await historyDownload.path(),'utf8'));
    assert.equal(exported.records.length,2);
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.locator('#stats-count').innerText(),'2');
    assert.equal(await page.locator('#save-history').isChecked(),true);
    await page.locator('#clear-history').click();
    assert.equal(await page.locator('#stats-count').innerText(),'0');
    assert.equal(await page.evaluate(()=>localStorage.getItem('piano-sight-reader-history-v1')),null);
    await page.locator('#history-file').setInputFiles({name:'history.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
    await page.waitForFunction(()=>document.getElementById('stats-count').textContent==='2');
    assert.match(await page.locator('#history-import-status').innerText(),/imported/);
    assert.equal(await page.locator('#daily-rows tr').count(),1);
    assert.notEqual(await page.locator('#stats-tail').innerText(),'—');
    await page.locator('#history-file').setInputFiles({name:'history.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#stats-count').innerText(),'2');
    await page.locator('#history-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":99,"records":[]}')});
    await page.waitForFunction(()=>document.getElementById('history-import-status').textContent.startsWith('Import failed'));
    assert.equal(await page.locator('#stats-count').innerText(),'2');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('piano-sight-reader-history-v1')||'[]').length===2);
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.locator('#stats-count').innerText(),'2');
    await page.locator('#clear-history').click();
    await page.evaluate(()=>{window.originalFileText=File.prototype.text; File.prototype.text=function(){return new Promise(resolve=>{window.finishHistoryRead=resolve;});};});
    await page.locator('#history-file').setInputFiles({name:'delayed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
    await page.waitForFunction(()=>!!window.finishHistoryRead);
    await page.locator('#clear-history').click();
    assert.equal(await page.inputValue('#history-file'),'');
    await page.evaluate(text=>{window.finishHistoryRead(text); File.prototype.text=window.originalFileText;},JSON.stringify(exported));
    await page.waitForTimeout(50);
    assert.equal(await page.locator('#stats-count').innerText(),'0');
    assert.equal(await page.locator('#history-import-status').innerText(),'');
    const periodHistory=await page.evaluate(record=>{
      const now=new Date(), midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      // Avoid timing-dependent overlap when the suite is run just after midnight.
      return {version:1,records:[new Date(+midnight-86400000).toISOString(),new Date(Date.now()-1800000).toISOString()].map(at=>({...record,at}))};
    },exported.records[0]);
    await page.locator('#history-file').setInputFiles({name:'periods.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(periodHistory))});
    await page.waitForFunction(()=>document.getElementById('stats-count').textContent==='2');
    await page.locator('#clear-hour').click();
    assert.equal(await page.locator('#stats-count').innerText(),'1');
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.locator('#stats-count').innerText(),'1');
    await page.locator('#history-file').setInputFiles({name:'today.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...periodHistory,records:[{...exported.records[0],at:new Date().toISOString()}]}))});
    await page.waitForFunction(()=>document.getElementById('stats-count').textContent==='2');
    await page.locator('#clear-today').click();
    assert.equal(await page.locator('#stats-count').innerText(),'1');
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.locator('#stats-count').innerText(),'1');
    await page.locator('#clear-history').click();
    const patternHistory=await page.evaluate(async()=>{
      const {exerciseIdentity}=await import('/static/metrics.js'), {spell}=await import('/static/core.js');
      const settings={hand:'right',key:'C',source:'random',material:'white',span:'near',low:60,high:72,size:1,'min-size':1,endAction:'new'};
      return {version:1,records:[60,62,64].flatMap((pitch,group)=>Array.from({length:8},(_,i)=>{
        const note={...spell(pitch),staff:'treble'}, clean=group!==2||i>=3;
        return {version:1,at:new Date(Date.UTC(2026,9,15,12,0,group*8+i)).toISOString(),responseMs:[100,200,1000][group],wrongPresses:clean?0:1,firstAttemptCorrect:clean,notes:[note],context:{identity:exerciseIdentity([note],settings,[]),key:'C',hand:'right',source:'random',mode:'new'}};
      }))};
    });
    await page.locator('#history-file').setInputFiles({name:'patterns.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(patternHistory))});
    await page.waitForFunction(()=>document.querySelectorAll('#pattern-rows tr').length===1);
    assert.match(await page.locator('#pattern-rows').innerText(),/E4/);
    assert.match(await page.locator('#pattern-rows').innerText(),/Repeated corrections/);
    assert.match(await page.locator('#pattern-rows').innerText(),/Slower responses/);
    await page.locator('#clear-history').click();
    assert.equal(await page.locator('#patterns-table').isVisible(),false);
    // Range-learning and device recovery are pauses, not slow reading attempts.
    await page.locator('#connect').click();
    await page.locator('#learn-low').click();
    await page.waitForTimeout(350);
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(350);
    await page.locator('#learn-low').click();
    await send([0x90,60,90]); await page.waitForTimeout(160); await send([0x80,60,0]); await page.waitForTimeout(300);
    let pauseRecord=await page.evaluate(()=>JSON.parse(localStorage.getItem('piano-sight-reader-history-v1')).at(-1));
    assert.ok(pauseRecord.responseMs<650,'range learning time must be excluded');
    await page.evaluate(()=>window.testMidi.disconnect());
    await page.waitForTimeout(750);
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.evaluate(()=>window.testMidi.reconnect());
    await page.waitForFunction(()=>document.getElementById('midi-status').textContent.startsWith('Connected'));
    await send([0x90,60,90]); await page.waitForTimeout(160); await send([0x80,60,0]); await page.waitForTimeout(300);
    pauseRecord=await page.evaluate(()=>JSON.parse(localStorage.getItem('piano-sight-reader-history-v1')).at(-1));
    assert.ok(pauseRecord.responseMs<650,'device disconnection must be excluded');
    await page.evaluate(()=>window.testMidi.disconnect());
    const fallbackKey=page.locator('.key[data-pitch="60"]'); await fallbackKey.hover(); await page.mouse.down(); await page.waitForTimeout(160); await page.mouse.up(); await page.waitForTimeout(300);
    assert.equal(await page.locator('#stats-count').innerText(),'3');
    await page.evaluate(()=>window.testMidi.reconnect());
    await page.waitForFunction(()=>document.getElementById('midi-status').textContent.startsWith('Connected'));
    await page.locator('#clear-history').click();
    await page.locator('#score-file').setInputFiles('tests/fixtures/polyphony.mid');
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.includes('3 attacks'));
    assert.match(await page.locator('#score-details').innerText(),/Two voices study/);
    const inspectionDownload=page.waitForEvent('download');
    await page.locator('#export-score').click();
    const inspected=JSON.parse(require('node:fs').readFileSync(await (await inspectionDownload).path(),'utf8'));
    assert.equal(inspected.notes.length,3); assert.equal(inspected.duration_seconds,1.1);
    await page.locator('#score-file').setInputFiles({name:'broken.mid',mimeType:'audio/midi',buffer:Buffer.from('bad')});
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.includes('Import failed'));
    assert.equal(await page.locator('#export-score').isDisabled(),false);
    await page.locator('#connect').click();
    await page.evaluate(()=>{
      for(const [id,value] of Object.entries({low:48,high:84,hand:'right',size:3,'min-size':1,span:'wide',material:'sharps',key:'C'})) document.getElementById(id).value=value;
      document.getElementById('high').dispatchEvent(new Event('change'));
    });
    assert.match(await page.locator('#outline-status').innerText(),/2 targets/);
    assert.equal(await page.locator('#score-track-0').isDisabled(),true);
    await page.locator('#score-track-1').uncheck();
    assert.equal(await page.locator('#practice-score').isDisabled(),true);
    await page.locator('#score-track-1').check();
    await page.selectOption('#score-staff-1','bass');
    assert.equal(await page.locator('#practice-score').isDisabled(),true);
    await page.selectOption('#hand','both');
    assert.match(await page.locator('#outline-status').innerText(),/2 targets/);
    await page.locator('#practice-score').click();
    assert.equal(await page.locator('.note[data-step="0"]').first().evaluate(note=>+note.getAttribute('cy')>150),true);
    await page.selectOption('#hand','right');
    assert.match(await page.locator('#feedback').innerText(),/No notes/);
    await page.selectOption('#score-staff-1','treble');
    await page.locator('#practice-score').click();
    assert.equal(await page.inputValue('#source'),'midi');
    assert.equal(await page.locator('#end-new').isDisabled(),true);
    assert.equal(await page.locator('#length').isDisabled(),true);
    assert.equal(await page.locator('#min-size').isDisabled(),true);
    assert.equal(await page.locator('#material').isDisabled(),false);
    assert.equal(await page.locator('#practice-title').innerText(),'Pitch outline');
    assert.equal(await page.locator('#phrase-position').innerText(),'1 / 2');
    assert.deepEqual(await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>+key.dataset.pitch)),[60,64]);
    await send([0x90,60,90]); await send([0x90,64,90]); await page.waitForTimeout(160);
    await send([0x80,60,0]); await send([0x80,64,0]); await page.waitForTimeout(300);
    assert.equal(await page.locator('#phrase-position').innerText(),'2 / 2');
    assert.equal(await page.locator('.key.target').getAttribute('data-pitch'),'67');
    await send([0x90,67,90]); await page.waitForTimeout(160); await send([0x80,67,0]); await page.waitForTimeout(300);
    assert.equal(await page.locator('#phrase-position').innerText(),'1 / 2');
    await page.locator('#passage-start').fill('2'); await page.locator('#passage-start').dispatchEvent('change');
    await page.locator('#practice-score').click();
    assert.equal(await page.locator('#phrase-position').innerText(),'1 / 1');
    assert.equal(await page.locator('.key.target').getAttribute('data-pitch'),'67');
    await page.locator('#passage-name').fill('Closing note');
    await page.locator('#save-passage').click();
    const savedPassage=await page.inputValue('#saved-passages'); assert.ok(savedPassage);
    assert.equal(await page.locator('#saved-passages option').count(),2);
    await page.locator('#passage-start').fill('1'); await page.locator('#passage-start').dispatchEvent('change');
    assert.equal(await page.inputValue('#saved-passages'),'');
    await page.selectOption('#saved-passages',savedPassage);
    assert.equal(await page.inputValue('#passage-start'),'2');
    assert.equal(await page.inputValue('#passage-end'),'2');
    assert.equal(await page.inputValue('#score-staff-1'),'treble');
    assert.equal(await page.locator('.key.target').getAttribute('data-pitch'),'67','restoring preview must not change active practice');
    const savedPage=await page.context().newPage(); savedPage.on('pageerror',error=>errors.push(error.message));
    await savedPage.goto(process.env.APP_URL || 'http://127.0.0.1:8766');
    assert.equal(await savedPage.locator('#saved-passages').isDisabled(),true);
    await savedPage.locator('#score-file').setInputFiles('tests/fixtures/polyphony.mid');
    await savedPage.waitForFunction(()=>document.querySelectorAll('#saved-passages option').length===2);
    await savedPage.selectOption('#saved-passages',savedPassage);
    assert.equal(await savedPage.inputValue('#passage-start'),'2');
    await savedPage.locator('#delete-passage').click();
    assert.equal(await savedPage.locator('#saved-passages option').count(),1);
    await page.waitForFunction(()=>document.querySelectorAll('#saved-passages option').length===1);
    await savedPage.close(); await page.bringToFront();
    const previewBuffer=require('node:fs').readFileSync('tests/fixtures/polyphony.mid');
    const pitchIndex=previewBuffer.indexOf(Buffer.from([0x90,67,80])); assert.ok(pitchIndex>=0); previewBuffer[pitchIndex+1]=69;
    await page.locator('#score-file').setInputFiles({name:'preview.mid',mimeType:'audio/midi',buffer:previewBuffer});
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.startsWith('preview.mid'));
    assert.equal(await page.locator('.key.target').getAttribute('data-pitch'),'67');
    assert.match(await page.locator('#score-playing').innerText(),/polyphony.mid/);
    await page.evaluate(()=>{document.getElementById('low').value=80; document.getElementById('high').value=90; document.getElementById('high').dispatchEvent(new Event('change'));});
    assert.match(await page.locator('#feedback').innerText(),/No notes/);
    assert.equal(await page.locator('#practice-score').isDisabled(),true);
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#source'),'random');
    assert.equal(await page.locator('#source-midi').evaluate(option=>option.disabled),true);
    await page.evaluate(()=>{
      for(const [id,value] of Object.entries({low:60,high:60,size:1,'min-size':1,hand:'right',material:'white',span:'near'})) document.getElementById(id).value=value;
      document.getElementById('high').dispatchEvent(new Event('change'));
    });
    await page.locator('#clear-history').click();
    // Source playback stays independent of physical input and practice completion.
    await page.locator('#reference-sound').check();
    await page.locator('#score-file').setInputFiles('tests/fixtures/polyphony.mid');
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.includes('3 attacks'));
    await page.selectOption('#source-speed','0.5');
    await page.locator('#play-source').click();
    await page.waitForFunction(()=>document.getElementById('source-playback-status').textContent.startsWith('Playing'));
    await page.waitForTimeout(120);
    await page.locator('#pause-source').click();
    assert.match(await page.locator('#source-playback-status').innerText(),/Paused/);
    assert.equal(await page.locator('#play-source').innerText(),'Resume passage');
    assert.equal(await page.locator('#stats-count').innerText(),'0');
    assert.equal(await page.locator('.key[aria-pressed="true"]').count(),0);
    await page.locator('#play-source').click();
    await page.locator('#stop-source').click();
    assert.equal(await page.locator('#source-playback-status').innerText(),'');
    await page.selectOption('#source-speed','2');
    await page.locator('#play-source').click();
    await page.waitForFunction(()=>document.getElementById('source-playback-status').textContent.startsWith('Finished'));
    assert.equal(await page.locator('#stats-count').innerText(),'0');
    await page.locator('#play-source').click();
    await page.locator('#score-track-1').uncheck();
    assert.equal(await page.locator('#play-source').isDisabled(),true);
    assert.equal(await page.locator('#source-playback-status').innerText(),'');
    await page.locator('#score-track-1').check();
    await page.locator('#play-source').click();
    await page.locator('#sound-panic').click();
    assert.equal(await page.locator('#source-playback-status').innerText(),'');
    await page.locator('#source-clicks').check(); await page.selectOption('#source-countin','1');
    await page.locator('#play-source').click();
    await page.waitForFunction(()=>document.getElementById('source-playback-status').textContent.startsWith('Count-in'));
    assert.equal(await page.locator('#stats-count').innerText(),'0');
    await page.locator('#pause-source').click();
    assert.match(await page.locator('#source-playback-status').innerText(),/Paused/);
    await page.locator('#play-source').click();
    await page.waitForFunction(()=>document.getElementById('source-playback-status').textContent.startsWith('Playing'));
    await page.locator('#stop-source').click();
    await page.locator('#play-source').click();
    await page.waitForFunction(()=>document.getElementById('source-playback-status').textContent.startsWith('Finished'));
    assert.equal(await page.locator('#stats-count').innerText(),'0');
    await page.locator('#source-clicks').uncheck(); await page.selectOption('#source-countin','0');
    // Actual Web Audio nodes in the browser: the two paths never feed the matcher.
    await page.locator('#connect').click();
    assert.equal(await page.locator('#live-sound').isChecked(),false);
    await page.selectOption('#reference-instrument','organ');
    await page.locator('#hear-target').click();
    assert.equal(await page.locator('#sound-status').innerText(),'');
    assert.equal(await page.locator('.key[aria-pressed="true"]').count(),0);
    assert.equal(await page.locator('#stats-count').innerText(),'0');
    await page.locator('#reference-sound').uncheck();
    assert.equal(await page.locator('#hear-target').isDisabled(),true);
    await page.locator('#hear-live').click();
    assert.equal(await page.locator('#live-sound').isChecked(),true);
    assert.equal(await page.locator('#hear-live').getAttribute('aria-pressed'),'true');
    await page.locator('#hear-live').click();
    assert.equal(await page.locator('#live-sound').isChecked(),false);
    await page.locator('#live-sound').check();
    assert.equal(await page.locator('#hear-live').getAttribute('aria-pressed'),'true');
    await page.evaluate(()=>window.testMidi.send([0x90,60,90]));
    await page.evaluate(()=>window.testMidi.send([0xb0,64,127]));
    await page.evaluate(()=>window.testMidi.send([0x80,60,0]));
    assert.equal(await page.locator('.key.sustained').count(),1);
    await page.evaluate(()=>window.testMidi.send([0x90,60,25]));
    assert.equal(await page.locator('.key[aria-pressed="true"]').count(),1);
    await page.evaluate(()=>window.testMidi.send([0x90,60,120]));
    await page.evaluate(()=>window.testMidi.send([0x80,60,0]));
    assert.equal(await page.locator('.key.sustained').count(),1);
    await page.evaluate(()=>window.testMidi.send([0xb0,64,0]));
    assert.equal(await page.locator('.key.sustained').count(),0);
    await page.selectOption('#live-instrument','organ');
    await page.locator('#metronome').check();
    await page.waitForTimeout(180);
    assert.equal(await page.locator('#metronome').isChecked(),true);
    await page.locator('#tempo').fill('120'); await page.locator('#tempo').dispatchEvent('change');
    await page.selectOption('#beats','3');
    await page.locator('#sound-panic').click();
    assert.equal(await page.locator('#metronome').isChecked(),false);
    assert.equal(await page.locator('#live-sound').isChecked(),false);
    assert.equal(await page.locator('#hear-live').getAttribute('aria-pressed'),'false');
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#reference-instrument'),'organ');
    assert.equal(await page.inputValue('#live-instrument'),'organ');
    assert.equal(await page.inputValue('#tempo'),'120');
    assert.equal(await page.inputValue('#beats'),'3');
    assert.equal(await page.inputValue('#source-speed'),'2');
    assert.equal(await page.locator('#reference-sound').isChecked(),false);
    assert.equal(await page.locator('#live-sound').isChecked(),false);
    assert.equal(await page.locator('#metronome').isChecked(),false);
    let releaseManifest;
    const manifestWaiting=new Promise(resolve=>page.route('**/static/audio/salamander/manifest.json',route=>{releaseManifest=async()=>route.continue(); resolve();}));
    await page.evaluate(()=>{
      window.acousticStarts=0; window.originalBufferSource=AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource=function(...args) {const source=window.originalBufferSource.apply(this,args), start=source.start; source.start=(...values)=>{window.acousticStarts++; return start.apply(source,values);}; return source;};
    });
    await page.selectOption('#reference-instrument','acoustic');
    await page.locator('#reference-sound').check();
    await page.locator('#hear-target').click(); await manifestWaiting;
    await page.locator('#sound-panic').click(); await releaseManifest();
    await page.unroute('**/static/audio/salamander/manifest.json');
    await page.waitForFunction(()=>document.getElementById('sound-status').textContent==='');
    assert.equal(await page.evaluate(()=>window.acousticStarts),0,'panic must cancel an audition waiting for samples');
    await page.locator('#hear-target').click();
    assert.ok(await page.evaluate(()=>window.acousticStarts)>0);
    await page.evaluate(()=>{AudioContext.prototype.createBufferSource=window.originalBufferSource;});
    await page.selectOption('#live-instrument','acoustic'); await page.locator('#hear-live').click();
    assert.equal(await page.locator('#live-sound').isChecked(),true);
    await page.locator('#sound-panic').click();
    const acoustic=await page.evaluate(async()=>{
      const {LocalAudio}=await import('/static/audio.js');
      const context=new OfflineAudioContext(1,48000*1.2,48000), audio=new LocalAudio(context);
      await audio.samples.load(); audio.reference.configure('acoustic',.35);
      audio.reference.noteOn(61,0,.8); const buffer=await context.startRendering(), data=buffer.getChannelData(0);
      const rms=(a,b)=>{const slice=data.slice(a*48000,b*48000); return Math.sqrt(slice.reduce((sum,v)=>sum+v*v,0)/slice.length);};
      return {samples:audio.samples.buffers.size,sound:rms(.05,.5),tail:rms(1,1.1),voices:audio.reference.voices.size,sounding:audio.reference.sounding.size};
    });
    assert.equal(acoustic.samples,30); assert.ok(acoustic.sound>.001); assert.ok(acoustic.tail<.0001);
    assert.equal(acoustic.voices,0); assert.equal(acoustic.sounding,0);
    const rendered=await page.evaluate(async()=>{
      const {LocalAudio}=await import('/static/audio.js');
      const context=new OfflineAudioContext(1,48000*1.2,48000), audio=new LocalAudio(context);
      audio.reference.configure('organ',.3); audio.audition([60,64,67]);
      const buffer=await context.startRendering(), data=buffer.getChannelData(0);
      const rms=(start,end)=>Math.sqrt(data.slice(start*48000,end*48000).reduce((sum,n)=>sum+n*n,0)/((end-start)*48000));
      return {sound:rms(.1,.3),tail:rms(1,1.1),voices:audio.reference.voices.size};
    });
    assert.ok(rendered.sound>.001); assert.ok(rendered.tail<.0001); assert.equal(rendered.voices,0);
    const cancelled=await page.evaluate(async()=>{
      const {LocalAudio}=await import('/static/audio.js');
      const context=new OfflineAudioContext(1,48000,48000), audio=new LocalAudio(context);
      audio.reference.noteOn(60,.5,.4,'future'); audio.reference.stop();
      const buffer=await context.startRendering();
      return {peak:Math.max(...buffer.getChannelData(0).map(Math.abs)),voices:audio.reference.voices.size,sounding:audio.reference.sounding.size};
    });
    assert.equal(cancelled.peak,0); assert.equal(cancelled.voices,0); assert.equal(cancelled.sounding,0);
    const dynamics=await page.evaluate(async()=>{
      const {LocalAudio}=await import('/static/audio.js');
      return Promise.all([20,120].map(async velocity=>{
        const context=new OfflineAudioContext(1,12000,48000), audio=new LocalAudio(context);
        audio.live.configure('organ',.2); audio.live.sync(new Set([60]),new Map([[60,{serial:1,velocity}]]));
        const buffer=await context.startRendering(), values=buffer.getChannelData(0).slice(2400,7200);
        return Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)/values.length);
      }));
    });
    assert.ok(dynamics[1]>dynamics[0]*4,'live velocity must change actual rendered audio');
    await page.reload(); await page.waitForSelector('.note');
    await page.evaluate(()=>{Object.defineProperty(window,'AudioContext',{value:undefined}); Object.defineProperty(window,'webkitAudioContext',{value:undefined});});
    await page.evaluate(()=>{const input=document.getElementById('live-sound'); input.checked=true; input.dispatchEvent(new Event('change'));});
    await page.waitForFunction(()=>!document.getElementById('live-sound').checked);
    assert.match(await page.locator('#sound-status').innerText(),/unavailable/);
    await page.setViewportSize({width:1280,height:1000});
    await page.selectOption('#progression','flow');
    await page.evaluate(()=>{
      for(const [id,value] of Object.entries({source:'random',low:60,high:60,size:1,'min-size':1,length:1,hand:'right',key:'C',material:'white'})) document.getElementById(id).value=value;
      document.getElementById('source').dispatchEvent(new Event('change'));
    });
    await page.locator('#connect').click();
    const rapid=await page.evaluate(()=>{
      const read=()=>+document.getElementById('count').textContent, start=performance.now(), counts=[];
      for(let i=0;i<8;i++) {window.testMidi.send([0x90,60,90]); counts.push(read()); window.testMidi.send([0x80,60,0]);}
      return {counts,elapsed:performance.now()-start};
    });
    assert.deepEqual(rapid.counts,[1,2,3,4,5,6,7,8]);
    await page.locator('#pause-practice').click();
    assert.equal(await page.locator('#pause-practice').getAttribute('aria-pressed'),'true');
    await page.evaluate(()=>window.testMidi.send([0x90,60,90])); await page.waitForTimeout(350);
    assert.equal(await page.locator('#count').innerText(),'8');
    assert.equal(await page.locator('.key[aria-pressed="true"]').count(),1,'paused input still gives key feedback');
    assert.equal(await page.locator('#feedback').innerText(),'Paused');
    await page.locator('#pause-practice').click();
    assert.equal(await page.locator('#count').innerText(),'8','already held keys cannot score on resume');
    await page.evaluate(()=>{window.testMidi.send([0x80,60,0]); window.testMidi.send([0x90,60,90]); window.testMidi.send([0x80,60,0]);});
    assert.equal(await page.locator('#count').innerText(),'9');
    await page.selectOption('#progression','release');
    await page.locator('#pause-practice').click();
    await page.evaluate(()=>window.testMidi.send([0x90,60,90]));
    await page.locator('#pause-practice').click(); await page.waitForTimeout(180);
    assert.equal(await page.locator('#count').innerText(),'9');
    assert.match(await page.locator('#feedback').innerText(),/Release/);
    const attemptsBeforePause=+(await page.locator('#stats-count').innerText());
    await page.locator('#pause-practice').click();
    await page.evaluate(()=>window.testMidi.send([0x80,60,0]));
    await page.locator('#pause-practice').click();
    await page.evaluate(()=>window.testMidi.send([0x90,60,90])); await page.waitForTimeout(160);
    assert.equal(await page.locator('#count').innerText(),'10');
    assert.equal(+(await page.locator('#stats-count').innerText()),attemptsBeforePause+1,'repeated pauses must not leave measurements permanently paused');
    await page.evaluate(()=>window.testMidi.send([0x80,60,0])); await page.waitForTimeout(300);
    await page.selectOption('#progression','flow');

    const keyboardPresses=await page.evaluate(()=>{
      const key=document.querySelector('.key[data-pitch="60"]'), read=()=>+document.getElementById('count').textContent, before=read();
      const event=(type,value,repeat=false)=>key.dispatchEvent(new KeyboardEvent(type,{key:value,repeat}));
      event('keydown',' '); const first=read();
      for(let i=0;i<5;i++) event('keydown',' ',true);
      event('keydown','Enter'); const held=read();
      event('keyup',' '); event('keydown','Enter'); const fresh=read(); event('keyup','Enter');
      return [first-before,held-before,fresh-before];
    });
    assert.deepEqual(keyboardPresses,[1,1,2],'computer-key repeats or a second activator while held must not fake new attacks');
    assert.ok(rapid.elapsed<250,'a rapid phrase must not wait for settle/release timers');
    await page.locator('#clear-history').click(); await page.locator('#save-history').check();
    await Promise.all([page.waitForEvent('domcontentloaded'),page.evaluate(()=>{window.testMidi.send([0x90,60,90]); window.testMidi.send([0x80,60,0]); location.reload();})]);
    await page.waitForSelector('.note');
    assert.equal(await page.locator('#stats-count').innerText(),'1','a result must survive refresh before the debounce fires');
    await page.locator('#connect').click(); await page.locator('#clear-history').click();
    await page.evaluate(()=>new Promise(resolve=>{
      let count=0; const timer=setInterval(()=>{window.testMidi.send([0x90,60,90]); window.testMidi.send([0x80,60,0]); if(++count===45) {clearInterval(timer); resolve();}},50);
    }));
    assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('piano-sight-reader-history-v1')||'[]').length>0),'continuous playing must not postpone saving indefinitely');
    await page.locator('#clear-history').click(); await page.locator('#save-history').uncheck();
    await Promise.all([page.waitForEvent('domcontentloaded'),page.evaluate(()=>{window.testMidi.send([0x90,60,90]); window.testMidi.send([0x80,60,0]); location.reload();})]);
    await page.waitForSelector('.note');
    assert.equal(await page.locator('#stats-count').innerText(),'0','clearing and opting out must cancel every pending save');
    assert.equal(await page.locator('#pause-practice').getAttribute('aria-label'),'Pause practice');
    await page.locator('#connect').click();

    await page.locator('#score-file').setInputFiles('tests/fixtures/polyphony.mid');
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.startsWith('polyphony.mid'));
    await page.evaluate(()=>{
      document.getElementById('high').value=72; document.getElementById('size').value=3;
      document.getElementById('high').dispatchEvent(new Event('change'));
    });
    await page.locator('#practice-score').click();
    const legato=await page.evaluate(()=>{
      const positions=[]; const read=()=>positions.push(document.getElementById('phrase-position').textContent);
      window.testMidi.send([0x90,60,90]); read(); window.testMidi.send([0x90,64,90]); read();
      window.testMidi.send([0x90,67,90]); read();
      return positions;
    });
    assert.deepEqual(legato,['1 / 2','2 / 2','1 / 2']);
    await page.locator('#reset').click();
    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#progression'),'flow');
    await page.waitForFunction(()=>document.querySelectorAll('#library-piece option').length===3);
    const requests=[]; page.on('request',request=>requests.push(request.url()));
    const beforeLibrary=await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>key.dataset.pitch));
    await page.selectOption('#library-piece','chopin-op28-7'); await page.locator('#load-piece').click();
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.includes('168 attacks'));
    assert.deepEqual(await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>key.dataset.pitch)),beforeLibrary,'loading library preview must not replace active practice');
    assert.match(await page.locator('#library-credit').innerText(),/Public Domain/);
    assert.equal(await page.locator('#library-source').getAttribute('href'),'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=470');
    assert.ok(await page.locator('#suggested-passages option').count()>1);
    await page.selectOption('#suggested-passages','0');
    assert.equal(await page.inputValue('#passage-start'),'1');
    assert.ok(+(await page.inputValue('#passage-end'))<=32);
    await page.locator('#practice-score').click();
    assert.match(await page.locator('#score-playing').innerText(),/Prelude in A major/);
    await page.selectOption('#library-piece','bach-bwv846'); await page.locator('#load-piece').click();
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.includes('549 attacks'));
    assert.ok(await page.locator('#suggested-passages option').count()>5);
    assert.ok(requests.every(url=>!url.includes('/api/inspect-midi')),'bundled pieces use pre-ingested local data');
    assert.equal(await page.locator('.settings-stack #live-instrument').count(),1);
    assert.equal(await page.locator('.settings-stack #metronome').count(),1);
    assert.ok(await page.locator('#score-tracks input[type=checkbox]').first().evaluate(input=>input.getBoundingClientRect().width<20));
    assert.equal(await page.locator('#live-sound').evaluate(input=>getComputedStyle(input.parentElement).justifyContent),'flex-start');
    assert.ok((await page.locator('#analysis-dimension').boundingBox()).width<=220);
    assert.equal(await page.locator('#score-file').evaluate(input=>getComputedStyle(input,'::file-selector-button').backgroundColor===getComputedStyle(document.getElementById('load-piece')).backgroundColor),true);
    const support=page.getByRole('complementary',{name:'Support this free tool'});
    assert.equal(await support.innerText(),'Do you like this free tool? Support my opensource work at https://buymeacoffee.com/dkjroot');
    const supportLink=support.getByRole('link');
    assert.equal(await supportLink.getAttribute('href'),'https://buymeacoffee.com/dkjroot');
    assert.equal(await supportLink.getAttribute('target'),'_blank');
    assert.match(await supportLink.getAttribute('rel'),/noopener/);
    const supportBox=await support.boundingBox(), settingsBox=await page.locator('.score-panel').boundingBox();
    assert.ok(supportBox.y>=settingsBox.y+settingsBox.height,'support link belongs below settings');
    await page.screenshot({path:'test-results/library-dark.png',fullPage:true});
    await page.locator('#theme-toggle').click();
    await page.screenshot({path:'test-results/library-light.png',fullPage:true});
    assert.deepEqual(errors, []);
    for(const width of [320,390]) {
      await page.setViewportSize({width,height:740});
      const title=await page.locator('h1').boundingBox(), actions=await page.locator('.header-actions').boundingBox();
      assert.ok(title.x+title.width<=actions.x-4,'single-line title must not overlap the buttons');
      assert.ok(title.height<40);
      assert.ok(await support.evaluate(panel=>panel.scrollWidth<=panel.clientWidth),'support URL must wrap on narrow screens');
    }
    await mainContext.close();

    for (const mode of ['unsupported', 'denied']) {
      const context = await browser.newContext();
      await context.addInitScript(mode => Object.defineProperty(navigator, 'requestMIDIAccess', {value: mode === 'unsupported' ? undefined : async () => {throw new DOMException('Denied', 'NotAllowedError');}}), mode);
      const p = await context.newPage();
      await p.goto(process.env.APP_URL || 'http://127.0.0.1:8766');
      await p.locator('#connect').click();
      assert.match(await p.locator('#midi-status').innerText(), mode === 'unsupported' ? /unavailable/ : /denied/);
      assert.ok(await p.locator('.key').count() > 0);
      await context.close();
    }
    console.log('Browser checks passed: MIDI/input matching, fluid/release progression, layout/themes, progress/history, library/passages, source playback/count-in, and synth/acoustic audio.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
