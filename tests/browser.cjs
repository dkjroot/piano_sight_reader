// Optional browser integration suite. Start app.py first; see DEVELOPMENT.md.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const bundledPieces=JSON.parse(require('node:fs').readFileSync('static/library/catalogue.json','utf8')).pieces;

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
    assert.equal(await page.locator('#practice-title').innerText(),'Random pitches');
    assert.match(await page.locator('#exercise-summary').innerText(),/C major \/ A minor/);
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
    assert.match(await page.locator('#exercise-summary').innerText(),/G major \/ E minor/);
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
      for (const [id, value] of Object.entries({low: 62, high: 67, size: 3, 'min-size':3, hand: 'right', span: 'full', material: 'sharps'})) document.getElementById(id).value = value;
      const random = Math.random; let calls=0;
      try { Math.random = () => [4,146].includes(++calls) ? .99 : 0; document.getElementById('high').dispatchEvent(new Event('change')); }
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
      const previous = Math.random;let calls=0;
      try {Math.random=()=>{calls++;return calls===3?.3:calls===4?.99:calls===146?.065:0;}; document.getElementById('length').dispatchEvent(new Event('change'));}
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
    assert.equal(await page.locator('#end-new').isDisabled(),false);
    assert.equal(await page.locator('#length').isDisabled(),true);
    assert.equal(await page.locator('#min-size').isDisabled(),true);
    assert.equal(await page.locator('#material').isDisabled(),false);
    assert.equal(await page.locator('#practice-title').innerText(),'Local MIDI outline');
    assert.match(await page.locator('#exercise-summary').innerText(),/polyphony.mid/);
    assert.match(await page.locator('#exercise-summary').innerText(),/Right hand/);
    assert.equal(await page.locator('#phrase-position').innerText(),'1 / 2');
    assert.deepEqual(await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>+key.dataset.pitch)),[60,64]);
    await send([0x90,60,90]); await send([0x90,64,90]); await page.waitForTimeout(160);
    await send([0x80,60,0]); await send([0x80,64,0]); await page.waitForTimeout(300);
    assert.equal(await page.locator('#phrase-position').innerText(),'2 / 2');
    assert.equal(await page.locator('.key.target').getAttribute('data-pitch'),'67');
    await send([0x90,67,90]); await page.waitForTimeout(160); await send([0x80,67,0]); await page.waitForTimeout(300);
    assert.equal(await page.locator('#phrase-position').innerText(),'1 / 2');
    await page.locator('#passage-start').fill('2'); await page.locator('#passage-start').dispatchEvent('change');
    assert.equal(await page.locator('#phrase-position').innerText(),'1 / 1');
    assert.equal(await page.locator('.key.target').getAttribute('data-pitch'),'67');
    await page.locator('#passage-name').fill('Closing note');
    await page.locator('#save-passage').click();
    const savedPassage=await page.inputValue('#saved-passages'); assert.ok(savedPassage);
    assert.equal(await page.locator('#saved-passages option').count(),2);
    await page.locator('#passage-start').fill('1'); await page.locator('#passage-start').dispatchEvent('change');
    assert.equal(await page.inputValue('#saved-passages'),'');
    assert.deepEqual(await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>+key.dataset.pitch)),[60,64],'endpoint edits activate the passage without another button');
    await page.selectOption('#saved-passages',savedPassage);
    assert.equal(await page.inputValue('#passage-start'),'2');
    assert.equal(await page.inputValue('#passage-end'),'2');
    assert.equal(await page.inputValue('#score-staff-1'),'treble');
    assert.equal(await page.locator('.key.target').getAttribute('data-pitch'),'67','restoring a bookmark automatically activates its passage');
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
    assert.equal(await page.locator('#live-sound').isChecked(),false,'audition must not enable live playing');
    assert.equal(await page.locator('#hear-live').getAttribute('aria-pressed'),null,'audition is not a toggle');
    await page.locator('#hear-live').click();
    assert.equal(await page.locator('#live-sound').isChecked(),false);
    assert.equal(await page.locator('#stats-count').innerText(),'0');
    assert.equal(await page.locator('.key[aria-pressed="true"]').count(),0);
    await page.locator('#live-sound').check();
    await page.locator('#hear-live').click();
    assert.equal(await page.locator('#live-sound').isChecked(),true,'audition must not disable live playing');
    assert.equal(await page.getByLabel('Target sound',{exact:true}).count(),1);
    assert.equal(await page.getByLabel('Reference sound',{exact:true}).count(),0);
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
    assert.equal(await page.locator('#hear-live').getAttribute('aria-pressed'),null);
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
    await page.selectOption('#live-instrument','acoustic');
    await page.locator('#hear-live').click(); await manifestWaiting;
    await page.locator('#sound-panic').click(); await releaseManifest();
    await page.unroute('**/static/audio/salamander/manifest.json');
    await page.waitForFunction(()=>document.getElementById('sound-status').textContent==='');
    assert.equal(await page.evaluate(()=>window.acousticStarts),0,'panic must cancel an audition waiting for samples');
    await page.locator('#hear-target').click();
    assert.ok(await page.evaluate(()=>window.acousticStarts)>0);
    await page.evaluate(()=>{AudioContext.prototype.createBufferSource=window.originalBufferSource;});
    await page.selectOption('#live-instrument','acoustic'); await page.locator('#hear-live').click();
    assert.equal(await page.locator('#live-sound').isChecked(),false);
    assert.equal(await page.locator('#sound-status').innerText(),'');
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
    await page.selectOption('#key','Ab'); await page.selectOption('#material','sharps');
    await page.locator('#score-file').setInputFiles('tests/fixtures/repeated-attacks.mid');
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.startsWith('repeated-attacks.mid'));
    await page.locator('#practice-score').click();
    const repeatedAttacks=await page.evaluate(()=>{
      const positions=[], ticks=[], hits=[], accidentals=[], send=(status,pitch)=>window.testMidi.send([status,pitch,90]);
      const read=()=>{
        positions.push(document.getElementById('phrase-position').textContent);
        ticks.push([...document.querySelectorAll('.note-check')].filter(note=>note.textContent==='✓').map(note=>+note.dataset.target));
        hits.push([...document.querySelectorAll('.note.hit')].map(note=>+note.dataset.midi));
        accidentals.push([...document.querySelectorAll('.accidental.hit')].map(note=>+note.dataset.midi));
      };
      send(0x90,60); send(0x90,64); read(); send(0x80,60);
      send(0x90,67); read(); send(0x80,64); send(0x90,64); read(); send(0x80,67);
      send(0x90,69); read(); send(0x80,64); send(0x90,64); read();
      return {positions,ticks,hits,accidentals};
    });
    assert.deepEqual(repeatedAttacks.positions,['2 / 3','2 / 3','3 / 3','3 / 3','1 / 3'],'shared E attacks must be replayed in each MIDI chord');
    assert.deepEqual(repeatedAttacks.ticks,[[],[67],[],[69],[]],'ticks must not transfer into the next source target');
    assert.deepEqual(repeatedAttacks.hits,repeatedAttacks.ticks,'green noteheads and ticks must agree');
    assert.deepEqual(repeatedAttacks.accidentals,[[],[],[],[69],[]],'accidentals must not turn green from carried keys');
    await page.locator('#reset').click();
    await page.evaluate(()=>{
      for(const [id,value] of Object.entries({source:'random',low:60,high:64,size:2,'min-size':2,length:2,preview:1,hand:'right',material:'white',span:'near',key:'C'})) document.getElementById(id).value=value;
      document.getElementById('end-repeat').checked=true;
      const original=Math.random; let calls=0;
      try {Math.random=()=>calls++<98 ? 0 : .999; document.getElementById('source').dispatchEvent(new Event('change'));}
      finally {Math.random=original;}
    });
    assert.deepEqual(await page.locator('.note[data-step="0"]').evaluateAll(notes=>notes.map(note=>+note.dataset.midi).sort()),[60,62]);
    assert.deepEqual(await page.locator('.note[data-step="1"]').evaluateAll(notes=>notes.map(note=>+note.dataset.midi).sort()),[62,64]);
    const generatedAttack=await page.evaluate(()=>{
      const send=(status,pitch)=>window.testMidi.send([status,pitch,90]);
      send(0x90,60); send(0x90,62); send(0x80,60); send(0x90,64);
      const pending={position:document.getElementById('phrase-position').textContent,ticks:[...document.querySelectorAll('.note-check')].filter(note=>note.textContent==='✓').map(note=>+note.dataset.target)};
      send(0x90,62); // A duplicate note-on while held must not earn a new attack.
      const duplicate=document.getElementById('phrase-position').textContent;
      send(0x80,62); send(0x90,62);
      return {pending,duplicate,complete:document.getElementById('phrase-position').textContent,ticksAfter:[...document.querySelectorAll('.note-check')].filter(note=>note.textContent==='✓').length};
    });
    assert.deepEqual(generatedAttack,{pending:{position:'2 / 2',ticks:[64]},duplicate:'2 / 2',complete:'1 / 2',ticksAfter:0});
    await page.locator('#reset').click(); await page.selectOption('#size','3');

    await page.reload(); await page.waitForSelector('.note');
    assert.equal(await page.inputValue('#progression'),'flow');
    await page.waitForFunction(total=>document.querySelectorAll('#library-piece option').length===total+1,bundledPieces.length);
    assert.equal(await page.locator('#practice-score').innerText(),'Start practising this passage');
    assert.equal(await page.locator('#export-score').innerText(),'Download MIDI data (JSON)');
    assert.deepEqual(await page.locator('#library-difficulty option').allTextContents(),['All','Unrated']);
    assert.equal(await page.locator('#recent-piece').isDisabled(),true,'local MIDI imports must not enter recent bundled pieces');
    await page.selectOption('#library-era','Baroque');
    const baroqueIds=await page.locator('#library-piece option').evaluateAll(options=>options.map(option=>option.value).filter(Boolean));
    assert.ok(baroqueIds.includes('bach-bwv846')); assert.ok(baroqueIds.every(id=>bundledPieces.find(piece=>piece.id===id).era==='Baroque'));
    await page.selectOption('#library-composer','Frédéric Chopin');
    assert.equal(await page.locator('#library-piece').isDisabled(),true);
    assert.equal(await page.locator('#load-piece').isDisabled(),true);
    assert.equal(await page.locator('#library-status').innerText(),`0 of ${bundledPieces.length} pieces`);
    assert.equal(await page.locator('#random-piece').isDisabled(),true);
    await page.selectOption('#library-era','Romantic');
    await page.selectOption('#library-piece','chopin-op28-7');
    await page.selectOption('#library-style','Prelude');
    assert.equal(await page.inputValue('#library-piece'),'chopin-op28-7','compatible filters preserve selection');
    await page.selectOption('#library-composer','Johann Sebastian Bach');
    assert.equal(await page.inputValue('#library-piece'),'','incompatible filters clear only the browse selection');
    for(const field of ['composer','era','style','difficulty']) await page.selectOption('#library-'+field,'');
    const requests=[]; page.on('request',request=>requests.push(request.url()));
    const beforeLibrary=await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>key.dataset.pitch));
    const keyBeforePreview=await page.inputValue('#key');
    for(const piece of bundledPieces.filter(piece=>!['chopin-op28-7','bach-bwv846'].includes(piece.id))) {
      const inspection=JSON.parse(require('node:fs').readFileSync('static/library/'+piece.inspection,'utf8'));
      await page.selectOption('#library-piece',piece.id); await page.locator('#load-piece').click();
      await page.waitForFunction(count=>document.getElementById('score-status').textContent.includes(count+' attacks'),inspection.notes.length);
      assert.ok((await page.locator('#library-credit').innerText()).includes(piece.contributor));
      assert.ok((await page.locator('#library-credit').innerText()).includes(piece.licence));
      assert.equal(await page.locator('#library-source').getAttribute('href'),piece.source_page);
      assert.deepEqual(await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>key.dataset.pitch)),beforeLibrary);
    }
    await page.selectOption('#library-piece','chopin-op28-7'); await page.locator('#load-piece').click();
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.includes('168 attacks'));
    assert.deepEqual(await page.locator('.key.target').evaluateAll(keys=>keys.map(key=>key.dataset.pitch)),beforeLibrary,'loading library preview must not replace active practice');
    assert.equal(await page.inputValue('#key'),keyBeforePreview,'loading a score preview must not change practice key');
    assert.match(await page.locator('#score-key-status').innerText(),/Key signature in MIDI: A major/);
    assert.match(await page.locator('#library-credit').innerText(),/Public Domain/);
    assert.equal(await page.locator('#library-source').getAttribute('href'),'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=470');
    assert.ok(await page.locator('#suggested-passages option').count()>1);
    await page.selectOption('#suggested-passages','0');
    assert.equal(await page.inputValue('#passage-start'),'1');
    assert.ok(+(await page.inputValue('#passage-end'))<=32);
    await page.locator('#practice-score').click();
    assert.equal(await page.inputValue('#key'),'A','starting a score follows its explicit opening key signature');
    assert.match(await page.locator('#score-key-status').innerText(),/Practice signature: A major \/ F♯ minor/);
    assert.match(await page.locator('#score-playing').innerText(),/Prelude in A major/);
    const activeDescription=await page.locator('#exercise-summary').innerText();
    assert.match(activeDescription,/Prelude in A major/);
    assert.match(activeDescription,/Up to 3 notes\/chord/);
    const activeChopin=await page.locator('#score-playing').innerText();
    await page.selectOption('#library-composer','Johann Sebastian Bach');
    assert.equal(await page.locator('#load-piece').isDisabled(),true);
    assert.equal(await page.locator('#score-playing').innerText(),activeChopin);
    assert.match(await page.locator('#score-status').innerText(),/168 attacks/);
    assert.equal(await page.locator('#random-piece').isDisabled(),false);
    await page.locator('#random-piece').click();
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.includes('549 attacks'));
    assert.match(await page.locator('#score-key-status').innerText(),/Estimated from MIDI pitches: C major \/ A minor/);
    assert.equal(await page.inputValue('#key'),'A','estimated preview keeps the active exercise key until start');
    assert.equal(await page.locator('#exercise-summary').innerText(),activeDescription,'loading another preview must not rename active practice');
    const summaryBox=await page.locator('#exercise-summary').boundingBox(), activeStaffBox=await page.locator('#staff').boundingBox();
    assert.ok(summaryBox.y+summaryBox.height<=activeStaffBox.y,'exercise description stays above the stave');
    assert.ok(await page.locator('#suggested-passages option').count()>5);
    assert.equal(await page.inputValue('#library-piece'),'bach-bwv846','random selection must follow the composer filter');
    await page.selectOption('#library-composer','');
    await page.locator('#library-search').fill('Rachmaninoff op3');
    assert.deepEqual(await page.locator('#library-piece option').evaluateAll(options=>options.map(option=>option.value).filter(Boolean)),['rachmaninoff-op3-2']);
    await page.locator('#random-piece').click();
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.includes('1725 attacks'));
    assert.equal(await page.inputValue('#library-piece'),'rachmaninoff-op3-2');
    assert.equal(await page.locator('#exercise-summary').innerText(),activeDescription,'search and preview leave active practice intact');
    await page.locator('#library-search').fill('frederic op28');
    await page.selectOption('#library-piece','chopin-op28-7');
    await page.locator('#library-search').fill('chopin');
    assert.equal(await page.inputValue('#library-piece'),'chopin-op28-7');
    await page.selectOption('#library-era','Baroque');
    assert.equal(await page.locator('#random-piece').isDisabled(),true);
    assert.equal(await page.inputValue('#library-piece'),'');
    await page.locator('#library-search').fill(''); await page.selectOption('#library-era','');
    assert.equal(await page.locator('#library-piece option').count(),bundledPieces.length+1);
    const recentKey='piano-sight-reader-recent-pieces-v1';
    const recentEntries=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),recentKey);
    assert.equal(recentEntries.version,1); assert.equal(recentEntries.pieces[0].id,'rachmaninoff-op3-2');
    assert.ok(recentEntries.pieces.every(piece=>Object.keys(piece).sort().join(',')==='id,sha256'));
    await page.selectOption('#library-era','Baroque'); await page.locator('#library-search').fill('no matching title');
    await page.selectOption('#recent-piece','chopin-op28-7');
    await page.waitForFunction(()=>document.getElementById('score-status').textContent.includes('168 attacks'));
    assert.equal(await page.inputValue('#library-search'),''); assert.equal(await page.inputValue('#library-era'),'');
    assert.equal(await page.locator('#exercise-summary').innerText(),activeDescription);
    const otherLibrary=await mainContext.newPage(); await otherLibrary.goto(page.url());
    await otherLibrary.waitForFunction(()=>!document.getElementById('recent-piece').disabled);
    assert.equal(await otherLibrary.locator('#recent-piece option').nth(1).getAttribute('value'),'chopin-op28-7','recent preview survives a new visit');
    await otherLibrary.evaluate(key=>localStorage.setItem(key,'invalid JSON'),recentKey);
    await page.waitForFunction(()=>document.getElementById('recent-status').textContent.includes('could not be read'));
    await otherLibrary.reload(); await otherLibrary.waitForFunction(()=>document.getElementById('recent-status').textContent.includes('could not be read'));
    await otherLibrary.locator('#clear-recent').click();
    await page.waitForFunction(()=>document.getElementById('recent-piece').disabled);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),recentKey),null);
    assert.equal(await page.locator('#exercise-summary').innerText(),activeDescription);
    await otherLibrary.evaluate(key=>{
      const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
      Storage.prototype.setItem=function(name,value){if(name===key) throw new DOMException('Full','QuotaExceededError'); return set.call(this,name,value);};
      Storage.prototype.removeItem=function(name){if(name===key) throw new DOMException('Blocked','SecurityError'); return remove.call(this,name);};
    },recentKey);
    await otherLibrary.selectOption('#library-piece','bach-bwv846'); await otherLibrary.locator('#load-piece').click();
    await otherLibrary.waitForFunction(()=>document.getElementById('score-status').textContent.includes('549 attacks'));
    assert.match(await otherLibrary.locator('#recent-status').innerText(),/this visit only/);
    assert.equal(await otherLibrary.locator('#recent-piece').isDisabled(),false);
    await otherLibrary.locator('#clear-recent').click();
    assert.match(await otherLibrary.locator('#recent-status').innerText(),/storage could not update/);
    assert.equal(await otherLibrary.locator('#recent-piece').isDisabled(),true);
    await otherLibrary.close(); await page.bringToFront();

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
    const generalSettings=await page.locator('.settings-grid').boundingBox();
    assert.ok(supportBox.y>=generalSettings.y+generalSettings.height,'support follows general settings');
    assert.ok(supportBox.y+supportBox.height<=settingsBox.y,'support belongs above Music library');
    const supportBorders=await support.evaluate(panel=>{const s=getComputedStyle(panel); return [s.borderTopStyle,s.borderBottomStyle,s.borderTopWidth,s.borderBottomWidth,s.borderTopColor,s.borderBottomColor];});
    assert.deepEqual(supportBorders.slice(0,4),['double','double','3px','3px']);
    assert.equal(supportBorders[4],supportBorders[5]);
    assert.equal(await page.locator('.score-panel').evaluate(panel=>getComputedStyle(panel).borderTopWidth),'0px');
    await page.screenshot({path:'test-results/library-dark.png',fullPage:true});
    await page.locator('#theme-toggle').click();
    await page.screenshot({path:'test-results/library-light.png',fullPage:true});
    assert.deepEqual(errors, []);
    for(const width of [320,390,530,650]) {
      await page.setViewportSize({width,height:740});
      const title=await page.locator('h1').boundingBox(), actions=await page.locator('.header-actions').boundingBox();
      assert.ok(title.x+title.width<=actions.x-4,'single-line title must not overlap the buttons');
      assert.ok(title.height<40);
      const connectBox=await page.locator('#connect').boundingBox(), helpBox=await page.locator('.header-help').boundingBox();
      assert.ok(helpBox.x>=connectBox.x+connectBox.width,'Help stays beside Connect MIDI');
      assert.ok(Math.abs(helpBox.y-connectBox.y)<4,'mobile Help shares the Connect MIDI row');
      assert.equal(await page.locator('.header-help .help-icon').isVisible(),true);
      assert.ok(await support.evaluate(panel=>panel.scrollWidth<=panel.clientWidth),'support URL must wrap on narrow screens');
    }
    await page.setViewportSize({width:1280,height:1000});
    const topHelp=page.locator('header').getByRole('link',{name:'Help',exact:true});
    assert.equal(await topHelp.getAttribute('href'),'/help');
    assert.equal(await topHelp.getAttribute('rel'),'noopener noreferrer');
    const topConnectBox=await page.locator('#connect').boundingBox(), topHelpBox=await topHelp.boundingBox();
    assert.ok(topHelpBox.x>=topConnectBox.x+topConnectBox.width);
    assert.equal(await topHelp.locator('.help-label').isVisible(),true);
    const [topGuide]=await Promise.all([page.waitForEvent('popup'),topHelp.click()]);
    await topGuide.waitForURL('**/help');
    assert.equal(await topGuide.getByRole('heading',{level:1}).innerText(),'Piano Sight Reader · Help');
    await Promise.all([topGuide.waitForEvent('close'),topGuide.getByRole('button',{name:'Close help',exact:true}).click()]);
    assert.equal(page.isClosed(),false);
    const guide=page.getByRole('link',{name:'Help & guide'});
    const [help]=await Promise.all([page.waitForEvent('popup'),guide.click()]);
    await help.waitForURL('**/help'); await help.waitForSelector('#help-theme');
    const backgroundMidiActivity=await page.locator('#midi-activity').innerText();
    await page.evaluate(()=>{window.testMidi.send([0x90,60,100]); window.testMidi.send([0x90,64,100]);});
    assert.equal(await page.locator('#midi-activity').innerText(),backgroundMidiActivity,'background practice must ignore MIDI consumed in a study tab');
    assert.equal(await page.locator('#keyboard [aria-pressed="true"]').count(),0);
    assert.equal(await help.title(),'Help · Piano Sight Reader');
    assert.equal(await help.getByRole('heading',{name:'Choose a piece or passage'}).count(),1);
    assert.equal(await help.getByRole('heading',{name:'Find your own music'}).count(),1);
    assert.match(await help.locator('#find-music').innerText(),/python tools\/discover_scores.py --composer ChopinFF --limit 8/);
    assert.match(await help.locator('#find-music').innerText(),/never downloads or imports/);
    assert.equal(await help.getByRole('complementary',{name:'Support this free tool'}).getByRole('link').getAttribute('href'),'https://buymeacoffee.com/dkjroot');
    assert.equal(await help.locator('script[src$="app.js"]').count(),0,'Help must not start the live MIDI controller');
    const helpTheme=await help.locator('html').getAttribute('data-theme');
    await help.locator('#help-theme').click();
    assert.notEqual(await help.locator('html').getAttribute('data-theme'),helpTheme);
    await help.reload();
    assert.notEqual(await help.locator('html').getAttribute('data-theme'),helpTheme,'Help remembers the theme');
    await help.locator('#help-theme').click();
    for(const width of [1280,320]) {
      await help.setViewportSize({width,height:800});
      assert.equal(await help.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Help fits narrow screens');
      const heading=await help.locator('header h1').boundingBox(), close=await help.locator('#help-close').boundingBox();
      assert.ok(close.x>=heading.x+heading.width,'Close stays to the right of the heading');
      assert.ok(Math.abs(close.y-heading.y)<5,'Close stays in the top-right corner');
      await help.screenshot({path:`test-results/help-${width}.png`,fullPage:true});
    }
    await help.getByRole('link',{name:'MIDI problems',exact:true}).click();
    assert.ok(await help.locator('#midi').evaluate(section=>section.getBoundingClientRect().top<200));
    await help.setViewportSize({width:1280,height:900});
    // Passage-study navigation and shared controls are covered in score_practice.browser.cjs.
    assert.equal(await help.getByRole('link',{name:'Open practice',exact:true}).count(),0);
    await Promise.all([help.waitForEvent('close'),help.getByRole('button',{name:'Close help',exact:true}).click()]);
    assert.equal(page.isClosed(),false);
    assert.equal(await page.locator('#exercise-summary').innerText(),activeDescription);
    await mainContext.close();

    // Custom positions, independent resizing and notation scale preserve the phrase.
    const layoutContext=await browser.newContext({viewport:{width:1440,height:900}});
    const custom=await layoutContext.newPage();
    custom.on('pageerror',error=>errors.push(error.message));
    await custom.goto(process.env.APP_URL || 'http://127.0.0.1:8766');
    await custom.evaluate(()=>{
      for(const [id,value] of Object.entries({low:0,high:0,hand:'left',span:'full',source:'random',size:1,'min-size':1,length:4})) document.getElementById(id).value=value;
      document.getElementById('source').dispatchEvent(new Event('change'));
    });
    const originalLayoutNotes=await custom.locator('.note').evaluateAll(notes=>notes.map(n=>[n.dataset.step,n.dataset.midi]));
    assert.equal(await custom.locator('#staff').evaluate(el=>el.scrollHeight>el.clientHeight),true,'extreme ledger notes reproduce the reported staff overflow');
    const drag=async(selector,dx,dy)=>{
      const handle=custom.locator(selector);await handle.scrollIntoViewIfNeeded();
      const box=await handle.boundingBox();
      await custom.mouse.move(box.x+box.width/2,box.y+box.height/2);await custom.mouse.down();
      await custom.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:8});await custom.mouse.up();
    };
    const originalPanelLeft=await custom.locator('#staff-panel').evaluate(el=>el.getBoundingClientRect().left);
    await drag('#staff-panel .layout-resize',-250,260);
    assert.ok(Math.abs(await custom.locator('#staff-panel').evaluate(el=>el.getBoundingClientRect().left)-originalPanelLeft)<2,'entering Custom must not jump the panel away from the pointer');
    const initialOffset=await custom.locator('#staff-panel').evaluate(el=>parseFloat(el.style.left));
    await drag('#staff-panel .layout-move',-initialOffset,0);
    assert.equal(await custom.inputValue('#density'),'custom');
    assert.equal(await custom.locator('html').getAttribute('data-layout'),'custom');
    await custom.locator('#staff-scale').evaluate(el=>{el.value='50';el.dispatchEvent(new Event('input'));el.dispatchEvent(new Event('change'));});
    assert.equal(await custom.locator('#staff-scale-value').innerText(),'50%');
    assert.equal(await custom.locator('#staff').evaluate(el=>el.scrollHeight<=el.clientHeight+1),true,'resizing and scaling fit the extreme ledger range without vertical staff scrolling');
    assert.deepEqual(await custom.locator('.note').evaluateAll(notes=>notes.map(n=>[n.dataset.step,n.dataset.midi])),originalLayoutNotes);
    assert.equal(await custom.locator('#phrase-position').innerText(),'1 / 4');
    await custom.evaluate(()=>{
      window.customHeldKey=document.querySelector('.key[data-pitch="0"]');
      window.customHeldKey.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    });
    const heldPosition=await custom.locator('#phrase-position').innerText();
    const oldKeyHeight=await custom.locator('.key.white').first().evaluate(el=>el.getBoundingClientRect().height);
    await drag('#keyboard-panel .layout-resize',-600,100);
    assert.ok(await custom.locator('.key.white').first().evaluate(el=>el.getBoundingClientRect().height)>oldKeyHeight+60);
    const oldPosition=await custom.locator('#keyboard-panel').evaluate(el=>parseFloat(el.style.top));
    await custom.evaluate(()=>window.scrollTo(0,0));
    await drag('#keyboard-panel .layout-move',820,-oldPosition);
    assert.ok(await custom.locator('#keyboard-panel').evaluate(el=>parseFloat(el.style.top))<oldPosition-40);
    assert.equal(await custom.evaluate(()=>window.customHeldKey===document.querySelector('.key[data-pitch="0"]')),true);
    assert.equal(await custom.locator('.key[data-pitch="0"]').getAttribute('aria-pressed'),'true');
    assert.equal(await custom.locator('#phrase-position').innerText(),heldPosition,'moving and resizing must not grant another held-note attack');
    await custom.evaluate(()=>window.customHeldKey.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true})));
    await custom.locator('#staff-panel .layout-move').press('ArrowDown');
    await custom.locator('#staff-panel .layout-resize').press('Shift+ArrowLeft');
    const savedGeometry=await custom.evaluate(()=>JSON.parse(localStorage.getItem('piano-sight-reader-custom-layout-v1')));
    await custom.reload();await custom.waitForSelector('.custom-layout');
    assert.equal(await custom.inputValue('#density'),'custom');assert.equal(await custom.inputValue('#staff-scale'),'50');
    assert.deepEqual(await custom.evaluate(()=>JSON.parse(localStorage.getItem('piano-sight-reader-custom-layout-v1'))),savedGeometry);
    await custom.evaluate(()=>window.scrollTo(0,0));
    await custom.screenshot({path:'test-results/custom-layout-desktop.png',fullPage:true});
    await custom.setViewportSize({width:390,height:844});
    await custom.waitForTimeout(80);
    assert.equal(await custom.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.ok(await custom.locator('.layout-move').evaluateAll(buttons=>buttons.every(button=>{const b=button.getBoundingClientRect();return b.left>=0 && b.right<=innerWidth;})));
    assert.deepEqual(await custom.evaluate(()=>JSON.parse(localStorage.getItem('piano-sight-reader-custom-layout-v1'))),savedGeometry,'responsive fitting preserves desktop geometry');
    await custom.setViewportSize({width:1440,height:1000});await custom.waitForTimeout(80);
    await custom.selectOption('#density','auto');
    assert.equal(await custom.locator('.custom-layout').count(),0);assert.equal(await custom.inputValue('#staff-scale'),'100');
    await custom.selectOption('#density','custom');
    assert.equal(await custom.inputValue('#staff-scale'),'50');
    for(let i=0;i<14;i++) await custom.locator('#staff-panel .layout-resize').press('Shift+ArrowLeft');
    assert.ok(await custom.locator('#staff-panel').evaluate(panel=>{
      const box=panel.getBoundingClientRect();
      return [...panel.querySelectorAll('.layout-move,.staff-scale,#pause-practice,.feedback')].every(control=>{const r=control.getBoundingClientRect();return r.left>=box.left && r.right<=box.right+1 && r.bottom<=box.bottom+1;});
    }),'a narrow custom staff panel keeps its scale, pause and feedback controls reachable');
    await custom.screenshot({path:'test-results/custom-layout-narrow.png',fullPage:true});
    await custom.selectOption('#density','720');
    assert.equal(await custom.inputValue('#staff-scale'),'75');
    await custom.selectOption('#density','1080');
    await custom.reload();await custom.waitForSelector('.note');
    assert.equal(await custom.inputValue('#density'),'1080');assert.equal(await custom.locator('.custom-layout').count(),0);
    // Broken/restricted storage must not prevent the normal playing surface.
    await custom.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked');};Storage.prototype.setItem=()=>{throw new Error('blocked');};});
    await custom.reload();await custom.waitForSelector('.note');
    await custom.locator('#staff-panel .layout-move').press('ArrowDown');
    assert.equal(await custom.inputValue('#density'),'custom');
    assert.deepEqual(errors,[]);
    await layoutContext.close();

    // Stage 1 controls, authored chromatic spelling and fresh alternate attacks.
    const generatedContext=await browser.newContext({viewport:{width:1280,height:900}});
    const generated=await generatedContext.newPage();
    generated.on('pageerror',error=>errors.push(error.message));
    await generated.goto(process.env.APP_URL || 'http://127.0.0.1:8766');
    const configured={source:'advanced','advanced-kind':'augmented-sixth',texture:'block',hand:'right',key:'C',low:48,high:84,span:'wide',size:4,'min-size':4,length:4,preview:3,'hand-span':'16','left-density':'2','right-density':'4','left-leap':'12','right-leap':'12','ledger-limit':'4','attack-pattern':'together'};
    await generated.evaluate(values=>{
      for(const [id,value] of Object.entries(values)) document.getElementById(id).value=value;
      document.getElementById('source').dispatchEvent(new Event('change'));
    },configured);
    assert.equal(await generated.locator('#advanced-kind').isDisabled(),false);
    assert.equal(await generated.locator('#material').isDisabled(),true);
    assert.match(await generated.locator('#exercise-summary').innerText(),/German augmented sixth/);
    const chromatic=await generated.locator('.note[data-step="1"]').evaluateAll(notes=>[...new Set(notes.map(n=>+n.dataset.midi%12))].sort((a,b)=>a-b));
    assert.deepEqual(chromatic,[0,3,6,8]);
    await generated.reload(); await generated.waitForSelector('.note');
    for(const id of ['source','advanced-kind','texture','left-density','right-density','left-leap','right-leap','ledger-limit','hand-span']) assert.equal(await generated.inputValue('#'+id),String(configured[id]));
    const generatedFeedback=await generated.evaluate(async()=>{
      const key=document.querySelector('.key:not(.target)'), samples=[];
      for(let i=0;i<20;i++) {
        await new Promise(requestAnimationFrame);
        const started=performance.now();
        key.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
        const synchronous=key.getAttribute('aria-pressed')==='true' && key.querySelector('.key-state').textContent==='×';
        await new Promise(requestAnimationFrame);
        samples.push({milliseconds:performance.now()-started,synchronous});
        key.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}));
      }
      return samples;
    });
    assert.ok(generatedFeedback.every(sample=>sample.synchronous),'key marks must update in the input task');
    require('node:fs').writeFileSync('test-results/generated-feedback-performance.json',JSON.stringify({kind:'Headless synthetic key event to next animation frame; a rendering opportunity proxy, not measured device-to-paint latency',samples:generatedFeedback},null,2));
    await generated.screenshot({path:'test-results/generated-advanced.png',fullPage:true});
    await generated.evaluate(()=>{
      for(const [id,value] of Object.entries({source:'advanced','advanced-kind':'secondary','harmony-scale':'minor',key:'B',hand:'right',texture:'block',size:4,'min-size':4,length:4,preview:3,'right-leap':'any',low:60,high:84})) document.getElementById(id).value=value;
      document.getElementById('source').dispatchEvent(new Event('change'));
    });
    assert.ok((await generated.locator('.accidental[data-step="1"]').allTextContents()).includes('𝄪'),'secondary dominant in G-sharp minor retains C-double-sharp');
    await generated.evaluate(()=>{
      for(const [id,value] of Object.entries({source:'random',texture:'melody',hand:'both',key:'C',low:48,high:84,size:1,'min-size':1,length:4,'attack-pattern':'alternate','left-leap':'5','right-leap':'5',span:'wide'})) document.getElementById(id).value=value;
      document.getElementById('source').dispatchEvent(new Event('change'));
    });
    for(let step=0;step<4;step++) {
      const pitches=await generated.locator('.key.target').evaluateAll(keys=>keys.map(n=>+n.dataset.pitch));
      assert.equal(pitches.length,1);
      assert.equal(pitches[0]<60,step%2===0);
      const key=generated.locator(`.key[data-pitch="${pitches[0]}"]`);
      await key.press('Enter');
      await generated.waitForFunction(expected=>document.getElementById('phrase-position').textContent===expected,`${step===3?1:step+2} / 4`);
    }
    await generated.selectOption('#texture','alberti');
    await generated.selectOption('#attack-pattern','together');
    await generated.reload(); await generated.waitForSelector('.note');
    assert.equal(await generated.inputValue('#texture'),'alberti');
    assert.deepEqual(errors,[]);
    await generatedContext.close();

    // Exhaust a deliberately delayed worker: keep feedback live, reject stale
    // settings, and preserve an earned advance while practice is paused.
    const delayedContext=await browser.newContext();
    await delayedContext.addInitScript(()=>{
      window.Worker=class {
        constructor(){window.testGenerationWorker=this;}
        postMessage(data){this.pending=data;}
      };
    });
    const delayed=await delayedContext.newPage();
    delayed.on('pageerror',error=>errors.push(error.message));
    await delayed.goto(process.env.APP_URL || 'http://127.0.0.1:8766');
    await delayed.evaluate(()=>{
      for(const [id,value] of Object.entries({source:'random',texture:'block',low:60,high:60,hand:'right',span:'full',size:1,'min-size':1,progression:'flow'})) document.getElementById(id).value=value;
      document.getElementById('end-new').checked=true;
      document.getElementById('source').dispatchEvent(new Event('change'));
      const key=document.querySelector('.key[data-pitch="60"]');
      for(let i=0;i<32;i++) {
        key.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
        key.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}));
      }
    });
    assert.equal(await delayed.locator('#count').innerText(),'32');
    assert.match(await delayed.locator('#feedback').innerText(),/Preparing/);
    await delayed.locator('#pause-practice').click();
    await delayed.evaluate(()=>{
      const worker=window.testGenerationWorker, revision=worker.pending.revision;
      const targets=Array.from({length:17},()=>[{midi:60,letter:'C',accidental:0,octave:4,staff:'treble',hand:'right'}]);
      worker.onmessage({data:{revision:revision-1,targets}});
      worker.onmessage({data:{revision,targets}});
    });
    assert.equal(await delayed.locator('#phrase-position').innerText(),'32');
    assert.equal(await delayed.locator('#feedback').innerText(),'Paused');
    await delayed.locator('#pause-practice').click();
    assert.equal(await delayed.locator('#phrase-position').innerText(),'33');
    assert.equal(await delayed.locator('#count').innerText(),'32');
    await delayed.locator('.key[data-pitch="60"]').press('Enter');
    assert.equal(await delayed.locator('#count').innerText(),'33');
    assert.deepEqual(errors,[]);
    await delayedContext.close();

    for (const mode of ['unsupported', 'denied']) {
      const context = await browser.newContext();
      await context.addInitScript(mode => Object.defineProperty(navigator, 'requestMIDIAccess', {value: mode === 'unsupported' ? undefined : async () => {throw new DOMException('Denied', 'NotAllowedError');}}), mode);
      const p = await context.newPage();
      await p.goto(process.env.APP_URL || 'http://127.0.0.1:8766');
      await p.waitForSelector('.key');
      await p.locator('#connect').click();
      await p.waitForFunction(mode=>document.getElementById('midi-status').textContent.includes(mode==='unsupported'?'unavailable':'denied'),mode);
      assert.match(await p.locator('#midi-status').innerText(), mode === 'unsupported' ? /unavailable/ : /denied/);
      assert.ok(await p.locator('.key').count() > 0);
      await context.close();
    }
    await require('./score_practice.browser.cjs')(browser,new URL(page.url()).origin);
    await require('./ui_flow.browser.cjs')(browser,new URL(page.url()).origin);
    await require('./mvp.browser.cjs')(browser,new URL(page.url()).origin);
    console.log('Browser checks passed: MIDI/input matching, authored-score practice/engraving, fluid/release progression, layout/themes, progress/history, library/passages, source playback/count-in, and synth/acoustic audio.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
