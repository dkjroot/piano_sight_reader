// Optional browser integration suite. Start app.py first; see DEVELOPMENT.md.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
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
    await page.waitForSelector('.key.target');
    assert.equal(await page.locator('#repeat, #skip').count(),0);
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
    await page.reload(); await page.waitForSelector('.key.target');
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
    assert.deepEqual(errors, []);
    await page.close();

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
    console.log('Browser checks passed: phrase progress/replay/release, fixed active column and remembered look-ahead, chord names, key signatures/naturals, enharmonic spacing, target contrast, MIDI port lifecycle, sustain, permissions, and desktop/mobile layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
