// Working Memory Test game logic
(function(){
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const setupEl = document.getElementById('setup');
  const gameEl = document.getElementById('game');
  const endEl = document.getElementById('end');
  const displayEl = document.getElementById('display');
  const answerInput = document.getElementById('answerInput');
  const feedbackEl = document.getElementById('feedback');
  const roundNumEl = document.getElementById('roundNum');
  const avgEl = document.getElementById('avg');
  const finalScoreEl = document.getElementById('finalScore');
  const scoreBox = document.getElementById('score');

  const yearEl = document.getElementById('year');
  yearEl.textContent = new Date().getFullYear();

  let rounds = 10;
  // default ranges (normal)
  let minLength = 5;
  let maxLength = 9;
  let minDisplayMs = 5000;
  const modeSelect = document.getElementById('mode');
  const instructionsEl = document.getElementById('instructions');
  const rangeNoteEl = document.getElementById('rangeNote');
  const timingNoteEl = document.getElementById('timingNote');

  function setInstructionsAndTiming(mode){
    if(timingNoteEl){
      timingNoteEl.textContent = mode === 'normal'
        ? 'Digits flash for at least 5 seconds.'
        : 'Digits flash for 2.5 to 5 seconds.';
    }
    if(instructionsEl){
      instructionsEl.textContent = mode === 'normal'
        ? 'Instructions: Input the digits sorted. Numbers display for at least 5 seconds.'
        : 'Instructions: Input the digits sorted. Numbers display for 2.5 to 5 seconds.';
    }
  }

  function computeDisplayDuration(len){
    const base = 800 + (len * 350);
    return Math.max(minDisplayMs, base);
  }

  function applyMode(mode){
    if(mode === 'easy'){
      minLength = 3;
      maxLength = 7;
      minDisplayMs = 0;
      if(rangeNoteEl) rangeNoteEl.textContent = 'Each round will use a random length between 3 and 7 digits.';
      setInstructionsAndTiming(mode);
    } else if(mode === 'hard'){
      minLength = 5;
      maxLength = 9;
      minDisplayMs = 0;
      if(rangeNoteEl) rangeNoteEl.textContent = 'Each round will use a random length between 5 and 9 digits.';
      setInstructionsAndTiming(mode);
    } else {
      minLength = 5;
      maxLength = 9;
      minDisplayMs = 5000;
      if(rangeNoteEl) rangeNoteEl.textContent = 'Each round will use a random length between 5 and 9 digits.';
      setInstructionsAndTiming('normal');
    }
  }

  modeSelect && modeSelect.addEventListener('change', (e)=> applyMode(e.target.value));
  // initialize mode text
  modeSelect && applyMode(modeSelect.value);
  let currentRound = 0;
  let sequence = '';
  // answers will store objects: {correct, length}
  let answers = [];

  function rndDigit(){ return String(Math.floor(Math.random()*10)) }

  function makeSequence(len){
    let s = '';
    for(let i=0;i<len;i++) s += rndDigit();
    return s;
  }

  function showSequenceFor(ms){
    displayEl.textContent = sequence;
    // disable input while sequence is visible so player can't type early
    answerInput.disabled = true;
    answerInput.value = '';
    displayEl.style.visibility = 'visible';
    answerInput.blur();
    return new Promise(resolve => setTimeout(()=>{
      displayEl.style.visibility = 'hidden';
      // enable and focus input when it's time to enter the numbers
      answerInput.disabled = false;
      // small timeout to ensure browser focuses reliably
      setTimeout(()=> answerInput.focus(), 10);
      resolve();
    }, ms));
  }

  function evaluateAnswer(user){
    const rawInput = (user || '').replace(/\D/g, '');
    const sortedUser = rawInput.split('').sort().join('');
    const sortedTarget = sequence.split('').slice().sort().join('');

    const targetCounts = Array(10).fill(0);
    const userCounts = Array(10).fill(0);
    for(const ch of sequence) targetCounts[Number(ch)]++;
    for(const ch of rawInput) userCounts[Number(ch)]++;

    let correct = 0;
    let extras = 0;
    let missing = 0;
    for(let i=0;i<10;i++){
      const t = targetCounts[i];
      const u = userCounts[i];
      correct += Math.min(t, u);
      extras += Math.max(0, u - t);
      missing += Math.max(0, t - u);
    }

    return {correct, extras, missing, rawInput, sortedUser, sortedTarget};
  }

  function showTransientMessage(msg, ms = 800){
    // don't override a visible feedback (which is used after valid submissions)
    if(!feedbackEl.classList.contains('hidden')) return;
    feedbackEl.textContent = msg;
    feedbackEl.classList.remove('hidden');
    setTimeout(()=>{
      feedbackEl.classList.add('hidden');
    }, ms);
  }

  async function nextRound(){
    currentRound++;
    if(currentRound>rounds){
      finishGame();
      return;
    }
    roundNumEl.textContent = currentRound;
    // choose a random length for this round
    const len = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    sequence = makeSequence(len);
    // display duration scales with length and mode rules
    const displayMs = computeDisplayDuration(len);
    await showSequenceFor(displayMs);
    feedbackEl.classList.add('hidden');
    answerInput.value = '';
  }

  function finishGame(){
    gameEl.classList.add('hidden');
    endEl.classList.remove('hidden');
    instructionsEl && instructionsEl.classList.remove('hidden');
    if(answers.length === 0){
      finalScoreEl.textContent = 'No rounds played';
      if(avgEl) avgEl.textContent = '0%';
      return;
    }
    const totalRounds = answers.length;
    const totalDigitsShown = answers.reduce((sum, entry)=> sum + entry.length, 0);
    const totalCorrect = answers.reduce((sum, entry)=> sum + entry.correct, 0);
    const totalExtras = answers.reduce((sum, entry)=> sum + entry.extras, 0);
    const totalMissing = answers.reduce((sum, entry)=> sum + (entry.missing || 0), 0);
    const avgCorrectPerRound = totalCorrect / totalRounds;
    const avgDigitsPerRound = totalDigitsShown / totalRounds;
    const accuracyPct = totalDigitsShown ? (totalCorrect / totalDigitsShown) * 100 : 0;
    const extraRatePct = (totalCorrect + totalExtras) ? (totalExtras / (totalCorrect + totalExtras)) * 100 : 0;
    finalScoreEl.innerHTML = [
      `Rounds: ${totalRounds}`,
      `Accuracy: ${accuracyPct.toFixed(2)}% (${totalCorrect}/${totalDigitsShown})`,
      `Avg digits recalled: ${avgCorrectPerRound.toFixed(2)} of ${avgDigitsPerRound.toFixed(2)}`,
      `Extra digits: ${totalExtras} (${extraRatePct.toFixed(2)}% of entries)`,
      `Missed digits: ${totalMissing}`
    ].join('<br>') + '<br>';
    const avgRatio = answers.reduce((sum, entry)=> sum + (entry.length ? entry.correct / entry.length : 0), 0) / totalRounds;
    if(avgEl) avgEl.textContent = (avgRatio * 100).toFixed(2) + '%';
  }

  function showFeedback(result, len){
    const {correct, extras, missing, sortedTarget, sortedUser} = result;
    feedbackEl.textContent = `Correct digits: ${correct}/${len} | Extra digits: ${extras}`;
    console.log({
      round: currentRound,
      length: len,
      correct,
      extras,
      missing,
      targetSorted: sortedTarget,
      userSorted: sortedUser
    });
    feedbackEl.classList.remove('hidden');
    // show for 3 seconds then next round
    setTimeout(()=>{
      feedbackEl.classList.add('hidden');
      if(currentRound < rounds) nextRound();
      else finishGame();
    },3000);
  }

  startBtn.addEventListener('click', ()=>{
    rounds = parseInt(document.getElementById('rounds').value,10)||10;
    // apply mode again in case changed right before start
    modeSelect && applyMode(modeSelect.value);
    // reset state
    currentRound = 0;
    answers = [];
    setupEl.classList.add('hidden');
    endEl.classList.add('hidden');
    gameEl.classList.remove('hidden');
    if(scoreBox) scoreBox.classList.add('hidden');
    if(avgEl) avgEl.textContent = '0%';
    instructionsEl && instructionsEl.classList.add('hidden');
    nextRound();
  });

  resetBtn && resetBtn.addEventListener('click', ()=>{
    setupEl.classList.remove('hidden');
    gameEl.classList.add('hidden');
    endEl.classList.add('hidden');
    answerInput.value = '';
    answers = [];
    if(scoreBox) scoreBox.classList.add('hidden');
    if(avgEl) avgEl.textContent = '0%';
    instructionsEl && instructionsEl.classList.remove('hidden');
  });

  // keyboard handler for submit
  window.addEventListener('keydown', (e)=>{
    // if input is focused, let it handle keys
    if(document.activeElement === answerInput){
      if(e.code === 'Space' || e.key === 'Enter'){
        e.preventDefault();
        submitAnswer();
      }
      return;
    }
    // if not focused, pressing space focuses input only when input is enabled
    if((e.code === 'Space' || e.key === ' ') && !gameEl.classList.contains('hidden')){
      // don't steal focus while input disabled (e.g., during display)
      if(answerInput.disabled) return;
      e.preventDefault();
      answerInput.focus();
    }
  });

  function submitAnswer(){
    if(gameEl.classList.contains('hidden')) return;
    if(answerInput.disabled) return;
    const user = answerInput.value || '';
    const result = evaluateAnswer(user);
    // require at least one digit entered before accepting submission
    if(!result.rawInput || result.rawInput.length === 0){
      showTransientMessage('Type digits before submitting');
      return;
    }
    // record round metrics
    answers.push({correct: result.correct, extras: result.extras, missing: result.missing, length: sequence.length});
    if(avgEl && answers.length){
      const avgRatio = answers.reduce((sum, entry)=> sum + (entry.length ? entry.correct / entry.length : 0), 0) / answers.length;
      avgEl.textContent = (avgRatio * 100).toFixed(2) + '%';
      scoreBox && scoreBox.classList.remove('hidden');
    }
    // disable input immediately to prevent multiple submissions for the same round
    answerInput.disabled = true;
    answerInput.blur();
    showFeedback(result, sequence.length);
  }

  // allow Enter/Space while inside input
  answerInput.addEventListener('keydown', (e)=>{
    if(e.code === 'Enter' || e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      // only attempt submission when there's at least one digit
      const got = (answerInput.value||'').replace(/\D/g,'');
      if(got && got.length>0) submitAnswer();
      else showTransientMessage('Type digits before submitting');
    }
  });

})();
