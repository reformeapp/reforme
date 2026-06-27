 SUPABASE_URL = 'https://mzpvainvmhbpjyambwap.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHZhaW52bWhicGp5YW1id2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTI0NzIsImV4cCI6MjA5Nzg4ODQ3Mn0.evlBxIC8K-fplIrEIS8JsxMN8QSvmfr5q5r77JX-Gm0';
let sb;
let currentUser = null;
let currentProfile = null;
let selectedGoalVal = 'lose';
let selectedUserType = 'client';
let waterCount = 0;
let todayFoodLogs = [];
let editingFoodId = null;
async function init() {
  try {
    if (!sb) {
      document.getElementById('loadingScreen').style.display = 'none';
      document.getElementById('mainApp').style.display = 'flex';
      goTo('screen-welcome');
      showToast('Connection error. Check your internet.');
      return;
    }
    const { data: { session }, error } = await sb.auth.getSession();
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    if (error) {
      console.error('Session error:', error);
      goTo('screen-welcome');
      return;
    }
    if (session) {
      currentUser = session.user;
      await loadProfile();
    } else {
      goTo('screen-welcome');
    }
  } catch(e) {
    console.error('Init error:', e);
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    goTo('screen-welcome');
  }
}
async function loadProfile() {
  try {
    const { data, error } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    if (error || !data) {
      goTo('screen-ob-goal');
      return;
    }
    currentProfile = data;
    if (!data.role) { goTo('screen-ob-goal'); return; }
    if (data.role === 'client' && (!data.weight || !data.calorie_goal)) {
      goTo('screen-ob-goal');
      return;
    }
    if (data.role === 'trainer') {
      if (!data.calorie_goal) {
        currentProfile.calorie_goal = 2000;
        sb.from('profiles').update({ calorie_goal: 2000 }).eq('id', currentUser.id).then(() => {});
      }
      await loadTrainerApp();
    } else {
      await loadClientApp();
    }
  } catch(e) {
    console.error('loadProfile error:', e);
    showToast('Connection error. Please refresh.');
    goTo('screen-welcome');
  }
}
async function testConnection() {
  const err = document.getElementById('loginError');
  err.textContent = 'Testing connection...';
  err.style.color = '#C9B99A';
  err.classList.add('show');
  try {
    const res = await fetch('https://mzpvainvmhbpjyambwap.supabase.co/rest/v1/profiles?limit=1', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHZhaW52bWhicGp5YW1id2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTI0NzIsImV4cCI6MjA5Nzg4ODQ3Mn0.evlBxIC8K-fplIrEIS8JsxMN8QSvmfr5q5r77JX-Gm0',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cHZhaW52bWhicGp5YW1id2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTI0NzIsImV4cCI6MjA5Nzg4ODQ3Mn0.evlBxIC8K-fplIrEIS8JsxMN8QSvmfr5q5r77JX-Gm0'
      }
    });
    if (res.ok) {
      err.textContent = '✓ Database connected (' + res.status + '). Try logging in.';
      err.style.color = '#2D6A4F';
    } else {
      err.textContent = 'Database error: ' + res.status + ' ' + res.statusText;
      err.style.color = '#B54040';
    }
  } catch(e) {
    err.textContent = 'Network error: ' + e.message + '. Check your internet.';
    err.style.color = '#B54040';
  }
}
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');
  if (!email || !password) { err.textContent = 'Please fill in all fields'; err.classList.add('show'); return; }
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  err.classList.remove('show');
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      err.textContent = error.message.includes('Invalid') ? 'Invalid email or password' : error.message;
      err.classList.add('show');
      btn.disabled = false;
      btn.textContent = 'Sign in';
      return;
    }
    currentUser = data.user;
    await checkPendingInvite();
    await loadProfile();
  } catch(e) {
    console.error('Login error:', e);
    err.textContent = 'Connection error. Check your internet and try again.';
    err.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
}
async function handleSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const err = document.getElementById('signupError');
  const btn = document.getElementById('signupBtn');
  if (!name || !email || !password) { err.textContent = 'Please fill in all fields'; err.classList.add('show'); return; }
  if (password.length < 6) { err.textContent = 'Password must be at least 6 characters'; err.classList.add('show'); return; }
  btn.disabled = true;
  btn.textContent = 'Creating account...';
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error) {
    err.textContent = error.message;
    err.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Continue';
    return;
  }
  currentUser = data.user;
  await sb.from('profiles').upsert({ id: currentUser.id, full_name: name, role: selectedUserType });
  if (selectedUserType === 'trainer') {
    goTo('screen-ob-trainer');
  } else {
    goTo('screen-ob-goal');
  }
}
async function handleSignOut() {
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  goTo('screen-welcome');
  showToast('Signed out successfully');
}
function selectUserType(t) {
  selectedUserType = t;
  document.getElementById('type-client').className = 'type-card' + (t === 'client' ? ' selected' : '');
  document.getElementById('type-trainer').className = 'type-card' + (t === 'trainer' ? ' selected' : '');
}
function selectGoal(g) {
  selectedGoalVal = g;
  ['lose','muscle','maintain','health'].forEach(x => {
    document.getElementById('goal-' + x).className = 'ob-option' + (x === g ? ' selected' : '');
  });
}
let currentUnit = 'metric';
function setUnit(u) {
  currentUnit = u;
  document.getElementById('unit-metric').className = 'unit-btn' + (u === 'metric' ? ' active' : '');
  document.getElementById('unit-imperial').className = 'unit-btn' + (u === 'imperial' ? ' active' : '');
  document.getElementById('weight-label').textContent = u === 'metric' ? 'Weight (kg)' : 'Weight (lbs)';
  document.getElementById('height-label').textContent = u === 'metric' ? 'Height (cm)' : 'Height (ft)';
  document.getElementById('ob-weight').placeholder = u === 'metric' ? '75' : '165';
  document.getElementById('ob-height').placeholder = u === 'metric' ? '175' : '5.8';
  const hint = document.getElementById('height-hint');
  if (hint) hint.style.display = u === 'imperial' ? 'block' : 'none';
  calcTDEE();
}
function convertToMetric(w, h) {
  let weightKg = w;
  let heightCm = h;
  if (currentUnit === 'imperial') {
    weightKg = w * 0.453592;
    const feet = Math.floor(h);
    const inches = Math.round((h - feet) * 10);
    heightCm = (feet * 30.48) + (inches * 2.54);
  }
  return { weightKg: Math.round(weightKg * 10) / 10, heightCm: Math.round(heightCm) };
}
function calcTDEE() {
  const wRaw = parseFloat(document.getElementById('ob-weight').value);
  const hRaw = parseFloat(document.getElementById('ob-height').value);
  const a = parseFloat(document.getElementById('ob-age').value) || 25;
  const act = parseFloat(document.getElementById('ob-activity').value);
  const gender = document.getElementById('ob-gender').value;
  if (!wRaw || !hRaw) return;
  const { weightKg: w, heightCm: h } = convertToMetric(wRaw, hRaw);
  let bmr = gender === 'male' ? 10*w + 6.25*h - 5*a + 5 : 10*w + 6.25*h - 5*a - 161;
  let tdee = Math.round(bmr * act);
  let adj = selectedGoalVal === 'lose' ? tdee - 500 : selectedGoalVal === 'muscle' ? tdee + 300 : tdee;
  const resultEl = document.getElementById('tdee-result');
  if (resultEl) {
    resultEl.style.display = 'block';
    document.getElementById('tdee-num').textContent = adj.toLocaleString();
    document.getElementById('tdee-desc').textContent = selectedGoalVal === 'lose' ? '500 kcal deficit for fat loss' : selectedGoalVal === 'muscle' ? '300 kcal surplus for muscle gain' : 'Maintenance calories';
  }
  if (currentUnit === 'imperial') {
    resultEl.querySelector && (resultEl.innerHTML = resultEl.innerHTML);
    const hint = document.getElementById('unit-hint');
    if (hint) hint.textContent = `(${w}kg · ${h}cm)`;
  }
}
async function finishOnboarding() {
  const btns = document.querySelectorAll('#screen-ob-device .btn-p, #screen-ob-device .btn-ghost, #screen-ob-trainer-device .btn-p, #screen-ob-trainer-device .btn-ghost');
  btns.forEach(b => { b.disabled = true; });
  let updateData = { id: currentUser.id, role: selectedUserType };
  if (selectedUserType === 'client') {
    const wRaw = parseFloat(document.getElementById('ob-weight').value) || null;
    const hRaw = parseFloat(document.getElementById('ob-height').value) || null;
    const a = parseInt(document.getElementById('ob-age').value) || null;
    const act = parseFloat(document.getElementById('ob-activity').value) || 1.55;
    const gender = document.getElementById('ob-gender').value || 'male';
    let w = wRaw;
    let h = hRaw;
    if (wRaw && hRaw && currentUnit === 'imperial') {
      const converted = convertToMetric(wRaw, hRaw);
      w = converted.weightKg;
      h = converted.heightCm;
    }
    let calorieGoal = 1800;
    if (w && h && a) {
      let bmr = gender === 'male' ? 10*w + 6.25*h - 5*a + 5 : 10*w + 6.25*h - 5*a - 161;
      let tdee = Math.round(bmr * act);
      calorieGoal = selectedGoalVal === 'lose' ? tdee - 500 : selectedGoalVal === 'muscle' ? tdee + 300 : tdee;
    }
    updateData = { ...updateData, weight: w, height: h, age: a, gender: gender, goal: selectedGoalVal, activity_level: act, calorie_goal: calorieGoal };
  } else {
    const spec = document.getElementById('ob-speciality') ? document.getElementById('ob-speciality').value : null;
    const cert = document.getElementById('ob-cert') ? document.getElementById('ob-cert').value : null;
    const exp = document.getElementById('ob-exp') ? parseInt(document.getElementById('ob-exp').value) : null;
    updateData = { ...updateData, speciality: spec, certification: cert, experience_years: exp, calorie_goal: 2000 };
  }
  const { error } = await sb.from('profiles').update(updateData).eq('id', currentUser.id);
  if (error) {
    console.error('Save error:', error);
    const { error: e2 } = await sb.from('profiles').upsert(updateData);
    if (e2) {
      showToast('Error saving profile. Please try again.');
      btns.forEach(b => { b.disabled = false; });
      return;
    }
  }
  await checkPendingInvite();
  await loadProfile();
}
async function loadClientApp() {
  try {
    document.querySelectorAll('#mainApp > .screen').forEach(s => {
      s.style.display = 'none';
      s.classList.remove('active');
    });
    const clientScreen = document.getElementById('screen-client');
    if (clientScreen) { clientScreen.style.display = 'flex'; clientScreen.classList.add('active'); }
    document.querySelectorAll('#screen-client .screen').forEach(s => {
      s.style.display = 'none';
      s.classList.remove('active');
    });
    const dashTab = document.getElementById('c-dashboard');
    if (dashTab) { dashTab.style.display = 'flex'; dashTab.classList.add('active'); }
    document.querySelectorAll('#screen-client .nav-btn').forEach(b => b.classList.remove('active'));
    const dashNav = document.getElementById('cnav-dashboard');
    if (dashNav) dashNav.classList.add('active');
    updateClientGreeting();
    await updateDashboardStats();
    loadWaterTracker();
    loadFoodLog();
    loadClientPlansWithDays();
    updateClientProfile();
    generateAIInsight();
    checkWeeklyWeightPrompt();
    setTimeout(() => { initFirebase(); checkDailyReminders(); checkUnreadNotifications(); }, 2000);
  } catch(e) {
    console.error('loadClientApp error:', e);
    showToast('Error loading. Please refresh.');
  }
}
function updateClientGreeting() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = currentProfile?.full_name?.split(' ')[0] || 'there';
  const greetSub = document.getElementById('c-greeting-sub');
  if (greetSub) greetSub.textContent = greeting + ', ' + name;
  const greetEl = document.getElementById('c-greeting');
  if (greetEl) greetEl.textContent = greeting + ', ' + name;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
  const dateLbl = document.getElementById('c-date-label');
  if (dateLbl) dateLbl.textContent = dateStr;
  const logDateLbl = document.getElementById('log-date-label');
  if (logDateLbl) logDateLbl.textContent = dateStr;
}
async function updateDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
  const { data: logs } = await sb.from('food_logs').select('*').eq('user_id', currentUser.id).gte('logged_at', today);
  todayFoodLogs = logs || [];
  const totalCal = todayFoodLogs.reduce((s, l) => s + (l.calories || 0), 0);
  const totalProtein = todayFoodLogs.reduce((s, l) => s + (l.protein || 0), 0);
  const totalCarbs = todayFoodLogs.reduce((s, l) => s + (l.carbs || 0), 0);
  const totalFat = todayFoodLogs.reduce((s, l) => s + (l.fat || 0), 0);
  const goal = currentProfile?.calorie_goal || 1800;
  const pct = Math.min(100, Math.round((totalCal / goal) * 100));
  const todayCalEl = document.getElementById('todayCal');
  const remCalEl = document.getElementById('remCal');
  const calGoalEl = document.getElementById('calGoalLabel');
  const calBarEl = document.getElementById('calBar');
  if (todayCalEl) todayCalEl.textContent = totalCal.toLocaleString();
  if (remCalEl) remCalEl.textContent = Math.max(0, goal - totalCal).toLocaleString();
  if (calGoalEl) calGoalEl.textContent = 'Goal — ' + goal.toLocaleString() + ' kcal · Based on your stats';
  if (calBarEl) calBarEl.style.width = pct + '%';
  const proteinGoal = Math.round(goal * 0.3 / 4);
  const carbsGoal = Math.round(goal * 0.4 / 4);
  const fatGoal = Math.round(goal * 0.3 / 9);
  const avtCal = document.getElementById('avt-cal');
  const avtP = document.getElementById('avt-p');
  const avtC = document.getElementById('avt-c');
  const avtF = document.getElementById('avt-f');
  const avtTCal = document.getElementById('avt-tcal');
  const avtTP = document.getElementById('avt-tp');
  const avtTC = document.getElementById('avt-tc');
  const avtTF = document.getElementById('avt-tf');
  if (avtCal) avtCal.textContent = totalCal.toLocaleString();
  if (avtP) avtP.textContent = Math.round(totalProtein) + 'g';
  if (avtC) avtC.textContent = Math.round(totalCarbs) + 'g';
  if (avtF) avtF.textContent = Math.round(totalFat) + 'g';
  if (avtTCal) avtTCal.textContent = goal.toLocaleString();
  if (avtTP) avtTP.textContent = proteinGoal + 'g';
  if (avtTC) avtTC.textContent = carbsGoal + 'g';
  if (avtTF) avtTF.textContent = fatGoal + 'g';
  const pEl = document.getElementById('todayProtein');
  const cEl = document.getElementById('todayCarbs');
  const fEl = document.getElementById('todayFat');
  const pbEl = document.getElementById('proteinBar');
  const cbEl = document.getElementById('carbsBar');
  const fbEl = document.getElementById('fatBar');
  if (pEl) pEl.textContent = Math.round(totalProtein) + 'g';
  if (cEl) cEl.textContent = Math.round(totalCarbs) + 'g';
  if (fEl) fEl.textContent = Math.round(totalFat) + 'g';
  if (pbEl) pbEl.style.width = Math.min(100, (totalProtein/proteinGoal)*100) + '%';
  if (cbEl) cbEl.style.width = Math.min(100, (totalCarbs/carbsGoal)*100) + '%';
  if (fbEl) fbEl.style.width = Math.min(100, (totalFat/fatGoal)*100) + '%';
  const sNumEl = document.getElementById('streakNum');
  const sTxtEl = document.getElementById('streakText');
  const streak = todayFoodLogs.length > 0 ? 1 : 0;
  if (sNumEl) sNumEl.textContent = '🔥 ' + streak;
  if (sTxtEl) sTxtEl.textContent = streak > 0 ? 'day streak — keep it going!' : 'Start logging to build your streak!';
  const { data: todayMeals } = await sb.from('meal_plans').select('*').eq('client_id', currentUser.id).eq('day_label', dayName);
  const { data: todayWorkouts } = await sb.from('workout_plans').select('*').eq('client_id', currentUser.id).eq('day_label', dayName);
  const totalMeals = (todayMeals || []).length;
  const doneMeals = (todayMeals || []).filter(m => m.completed).length;
  const totalWorkouts = (todayWorkouts || []).length;
  const doneWorkouts = (todayWorkouts || []).filter(w => w.completed).length;
  const planProgressEl = document.getElementById('dashPlanProgress');
  if (planProgressEl) {
    if (totalMeals > 0 || totalWorkouts > 0) {
      planProgressEl.style.display = 'block';
      planProgressEl.innerHTML = `
        <div style="display:flex;gap:10px;">
          ${totalMeals > 0 ? `<div style="flex:1;background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:10px;padding:10px 12px;">
            <div style="font-size:10px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">Meals today</div>
            <div style="font-size:18px;font-weight:400;color:${doneMeals===totalMeals?'#2D6A4F':'#fff'};font-family:'DM Serif Display',serif;">${doneMeals}/${totalMeals}</div>
            <div style="height:2px;background:#111;border-radius:2px;margin-top:6px;overflow:hidden;"><div style="width:${totalMeals>0?Math.round((doneMeals/totalMeals)*100):0}%;height:100%;background:#2D6A4F;border-radius:2px;transition:width 0.4s;"></div></div>
          </div>` : ''}
          ${totalWorkouts > 0 ? `<div style="flex:1;background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:10px;padding:10px 12px;">
            <div style="font-size:10px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">Workout today</div>
            <div style="font-size:18px;font-weight:400;color:${doneWorkouts===totalWorkouts?'#2D6A4F':'#fff'};font-family:'DM Serif Display',serif;">${doneWorkouts}/${totalWorkouts}</div>
            <div style="height:2px;background:#111;border-radius:2px;margin-top:6px;overflow:hidden;"><div style="width:${totalWorkouts>0?Math.round((doneWorkouts/totalWorkouts)*100):0}%;height:100%;background:#2D6A4F;border-radius:2px;transition:width 0.4s;"></div></div>
          </div>` : ''}
        </div>`;
    } else {
      planProgressEl.style.display = 'none';
    }
  }
  if (currentProfile?.weight && currentProfile?.height) {
    const bmi = (currentProfile.weight / Math.pow(currentProfile.height / 100, 2)).toFixed(1);
    const status = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    const color = bmi < 18.5 ? '#2C5F8A' : bmi < 25 ? '#2D6A4F' : bmi < 30 ? '#C17D3C' : '#B54040';
    const pwEl = document.getElementById('profileWeight');
    const phEl = document.getElementById('profileHeight');
    const pbmiEl = document.getElementById('profileBMI');
    const pbmiSEl = document.getElementById('profileBMIStatus');
    if (pwEl) pwEl.textContent = currentProfile.weight + 'kg';
    if (phEl) phEl.textContent = currentProfile.height + 'cm';
    if (pbmiEl) pbmiEl.textContent = bmi;
    if (pbmiSEl) { pbmiSEl.textContent = status; pbmiSEl.style.color = color; }
  }
}
function generateAIInsight() {
  const goal = currentProfile?.calorie_goal || 1800;
  const totalCal = todayFoodLogs.reduce((s, l) => s + (l.calories || 0), 0);
  const remaining = goal - totalCal;
  const hour = new Date().getHours();
  let insight = '';
  if (totalCal === 0) {
    insight = "Start your day by logging your first meal. Tap the camera icon to snap a photo and get your calories and macros instantly.";
  } else if (remaining > 500 && hour < 14) {
    insight = `You have ${remaining} kcal remaining today and it's still early — great time to nail your lunch and stay on track. Make sure to hit your protein goal.`;
  } else if (remaining > 0 && hour >= 14) {
    insight = `${remaining} kcal remaining for today. With dinner ahead you're in a great position. Focus on protein-rich foods to hit your daily target.`;
  } else if (remaining <= 0) {
    insight = `You've hit your calorie goal for today — great work! Focus on staying hydrated and getting good sleep to support your recovery.`;
  } else {
    insight = `You're making good progress today. Keep logging your meals consistently to give your trainer the full picture of your nutrition habits.`;
  }
  document.getElementById('aiInsight').textContent = insight;
}
function updateClientProfile() {
  if (!currentProfile) return;
  const name = currentProfile.full_name || 'User';
  const initial = name.charAt(0).toUpperCase();
  const avatarEl = document.getElementById('clientAvatarBtn');
  const avatarInitialEl = document.getElementById('clientAvatarInitial');
  if (avatarEl) avatarEl.textContent = initial;
  if (avatarInitialEl) avatarInitialEl.textContent = initial;
  const nameEl = document.getElementById('clientProfileName');
  if (nameEl) nameEl.textContent = name;
  const roleEl = document.getElementById('clientProfileRole');
  if (roleEl) roleEl.textContent = 'Member';
  const goalMap = {lose:'Lose weight', muscle:'Build muscle', maintain:'Maintain', health:'Get healthier'};
  const wEl = document.getElementById('profileWeightSetting');
  const hEl = document.getElementById('profileHeightSetting');
  const gEl = document.getElementById('profileGoalSetting');
  const cEl = document.getElementById('profileCalTarget');
  if (wEl) wEl.textContent = currentProfile.weight ? currentProfile.weight + ' kg' : 'Not set';
  if (hEl) hEl.textContent = currentProfile.height ? currentProfile.height + ' cm' : 'Not set';
  if (gEl) gEl.textContent = goalMap[currentProfile.goal] || 'Not set';
  if (cEl) cEl.textContent = currentProfile.calorie_goal ? currentProfile.calorie_goal.toLocaleString() + ' kcal / day' : 'Not calculated';
}
async function loadWaterTracker() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await sb.from('water_logs').select('*').eq('user_id', currentUser.id).eq('logged_date', today).single();
  waterCount = data?.glasses || 0;
  renderWaterGlasses();
}
function renderWaterGlasses() {
  const container = document.getElementById('waterGlasses');
  container.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const g = document.createElement('div');
    g.className = 'wglass' + (i < waterCount ? ' filled' : '');
    g.textContent = '💧';
    g.onclick = () => toggleWaterGlass(i);
    container.appendChild(g);
  }
  document.getElementById('waterCountLabel').textContent = waterCount + ' / 8 glasses';
}
async function toggleWaterGlass(idx) {
  waterCount = waterCount === idx + 1 ? idx : idx + 1;
  renderWaterGlasses();
  const today = new Date().toISOString().split('T')[0];
  await sb.from('water_logs').upsert({ user_id: currentUser.id, glasses: waterCount, logged_date: today });
}
async function loadFoodLog() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await sb.from('food_logs').select('*').eq('user_id', currentUser.id).gte('logged_at', today).order('logged_at', { ascending: true });
  todayFoodLogs = data || [];
  renderFoodLog();
  updateDashboardStats();
}
function renderFoodLog() {
  const container = document.getElementById('foodLogList');
  if (todayFoodLogs.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:30px 20px;color:#5A5A52;font-size:13px;">No meals logged today yet.<br>Snap a photo or add manually above.</div>';
    return;
  }
  const meals = { breakfast: [], lunch: [], dinner: [], snack: [] };
  todayFoodLogs.forEach(log => { const t = log.meal_type || 'snack'; if (meals[t]) meals[t].push(log); });
  let html = '';
  const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
  const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
  Object.entries(meals).forEach(([type, logs]) => {
    if (logs.length === 0) return;
    html += `<div style="font-size:11px;font-weight:600;color:#5C5C52;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;margin-top:14px;">${mealLabels[type]}</div>`;
    html += '<div class="card" style="padding:6px 12px;margin-bottom:4px;">';
    logs.forEach(log => {
      html += `<div class="food-item">
        <div class="food-emoji">${mealEmojis[type]}</div>
        <div class="food-info">
          <div class="food-name">${log.food_name}</div>
          <div class="food-macros">P ${Math.round(log.protein||0)}g · C ${Math.round(log.carbs||0)}g · F ${Math.round(log.fat||0)}g</div>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <div class="food-cal">${log.calories} kcal</div>
          <button class="edit-btn" onclick="openEditFood('${log.id}','${log.food_name}',${log.calories},${log.protein||0},${log.carbs||0},${log.fat||0})">Edit</button>
          <button class="delete-btn" onclick="deleteFood('${log.id}')">✕</button>
        </div>
      </div>`;
    });
    html += '</div>';
  });
  container.innerHTML = html;
}
const SNAP_DEMO_MEALS = [
  {
    name: 'Grilled chicken with rice',
    type: 'complex',
    mealType: 'lunch',
    ingredients: [
      { emoji: '🍗', name: 'Chicken breast', defaultG: 150, per100: { cal: 165, p: 31, c: 0, f: 3.6 } },
      { emoji: '🍚', name: 'White rice (cooked)', defaultG: 200, per100: { cal: 130, p: 2.7, c: 28, f: 0.3 } }
    ]
  },
  {
    name: 'Chicken shawarma',
    type: 'simple',
    mealType: 'lunch',
    sizes: { small: { cal: 380, p: 28, c: 38, f: 10 }, medium: { cal: 580, p: 38, c: 52, f: 18 }, large: { cal: 780, p: 50, c: 68, f: 24 } }
  }
];
let snapState = {
  meal: SNAP_DEMO_MEALS[0],
  qty: 1,
  size: 'medium',
  editMode: false,
  cal: 487, p: 42, c: 51, f: 8
};
function showSnapDemo() {
  document.getElementById('snapResult').classList.add('show');
  snapState.meal = SNAP_DEMO_MEALS[0];
  renderSnapResult();
}
function renderSnapResult() {
  const meal = snapState.meal;
  document.getElementById('snapFoodName').value = meal.name;
  if (meal.type === 'complex') {
    document.getElementById('snapComplexView').style.display = 'block';
    document.getElementById('snapSimpleView').style.display = 'none';
    meal.ingredients.forEach((ing, i) => {
      const el = document.getElementById('ing' + i);
      if (el) el.value = ing.defaultG;
    });
    recalcSnapMacros();
  } else {
    document.getElementById('snapComplexView').style.display = 'none';
    document.getElementById('snapSimpleView').style.display = 'block';
    document.getElementById('snapSimpleName').textContent = meal.name;
    setSnapSize('medium');
    setSnapQty(1);
  }
}
function recalcSnapMacros() {
  const meal = snapState.meal;
  if (meal.type !== 'complex') return;
  let cal = 0, p = 0, c = 0, f = 0;
  meal.ingredients.forEach((ing, i) => {
    const grams = parseFloat(document.getElementById('ing' + i)?.value) || ing.defaultG;
    const ratio = grams / 100;
    cal += ing.per100.cal * ratio;
    p += ing.per100.p * ratio;
    c += ing.per100.c * ratio;
    f += ing.per100.f * ratio;
  });
  snapState.cal = Math.round(cal);
  snapState.p = Math.round(p);
  snapState.c = Math.round(c);
  snapState.f = Math.round(f);
  updateSnapDisplay();
}
function setSnapQty(n) {
  snapState.qty = n;
  [1,2,3].forEach(i => {
    const btn = document.getElementById('qty' + i);
    if (btn) btn.style.background = i === n ? '#2D6A4F' : '#1E1E1B';
    if (btn) btn.style.color = i === n ? '#fff' : '#E8E4DC';
  });
  recalcSimpleMacros();
}
function setSnapSize(size) {
  snapState.size = size;
  ['small','medium','large'].forEach(s => {
    const btn = document.getElementById('size' + s.charAt(0).toUpperCase() + s.slice(1));
    if (btn) btn.style.background = s === size ? '#2D6A4F' : '#1E1E1B';
    if (btn) btn.style.color = s === size ? '#fff' : '#E8E4DC';
  });
  recalcSimpleMacros();
}
function recalcSimpleMacros() {
  const meal = snapState.meal;
  if (meal.type !== 'simple') return;
  const base = meal.sizes[snapState.size] || meal.sizes.medium;
  snapState.cal = Math.round(base.cal * snapState.qty);
  snapState.p = Math.round(base.p * snapState.qty);
  snapState.c = Math.round(base.c * snapState.qty);
  snapState.f = Math.round(base.f * snapState.qty);
  updateSnapDisplay();
}
function updateSnapDisplay() {
  document.getElementById('snapTotalCal').innerHTML = snapState.cal + ' <span style="font-size:14px;color:#5C5C52;font-family:\'DM Sans\',sans-serif;">kcal</span>';
  document.getElementById('snapTotalP').textContent = snapState.p + 'g';
  document.getElementById('snapTotalC').textContent = snapState.c + 'g';
  document.getElementById('snapTotalF').textContent = snapState.f + 'g';
  if (snapState.editMode) {
    document.getElementById('snapEditCal').value = snapState.cal;
    document.getElementById('snapEditP').value = snapState.p;
    document.getElementById('snapEditC').value = snapState.c;
    document.getElementById('snapEditF').value = snapState.f;
  }
}
function toggleSnapEdit() {
  snapState.editMode = !snapState.editMode;
  const editView = document.getElementById('snapEditView');
  editView.style.display = snapState.editMode ? 'block' : 'none';
  if (snapState.editMode) {
    document.getElementById('snapEditCal').value = snapState.cal;
    document.getElementById('snapEditP').value = snapState.p;
    document.getElementById('snapEditC').value = snapState.c;
    document.getElementById('snapEditF').value = snapState.f;
  }
}
function updateSnapFromEdit() {
  snapState.cal = parseInt(document.getElementById('snapEditCal').value) || 0;
  snapState.p = parseInt(document.getElementById('snapEditP').value) || 0;
  snapState.c = parseInt(document.getElementById('snapEditC').value) || 0;
  snapState.f = parseInt(document.getElementById('snapEditF').value) || 0;
  updateSnapDisplay();
}
async function addSnapToLog() {
  const name = document.getElementById('snapFoodName').value || snapState.meal.name;
  const mealType = document.getElementById('snapMealType').value;
  await addFoodLog(name, snapState.cal, snapState.p, snapState.c, snapState.f, mealType);
  document.getElementById('snapResult').classList.remove('show');
  snapState.editMode = false;
  document.getElementById('snapEditView').style.display = 'none';
}
function toggleManualLog() {
  const form = document.getElementById('manualLogForm');
  form.classList.toggle('show');
}
async function addManualLog() {
  const name = document.getElementById('manualName').value.trim();
  if (!name) { showToast('Please enter a food name'); return; }
  const cal = parseInt(document.getElementById('manualCal').value) || 0;
  const protein = parseFloat(document.getElementById('manualProtein').value) || 0;
  const carbs = parseFloat(document.getElementById('manualCarbs').value) || 0;
  const fat = parseFloat(document.getElementById('manualFat').value) || 0;
  const mealType = document.getElementById('manualMealType').value;
  await addFoodLog(name, cal, protein, carbs, fat, mealType);
  document.getElementById('manualName').value = '';
  document.getElementById('manualCal').value = '';
  document.getElementById('manualProtein').value = '';
  document.getElementById('manualCarbs').value = '';
  document.getElementById('manualFat').value = '';
  toggleManualLog();
}
async function addFoodLog(name, cal, protein, carbs, fat, mealType) {
  const { error } = await sb.from('food_logs').insert({ user_id: currentUser.id, food_name: name, calories: cal, protein: protein, carbs: carbs, fat: fat, meal_type: mealType });
  if (error) { showToast('Error adding food. Try again.'); return; }
  showToast('✓ ' + name + ' added to log');
  await loadFoodLog();
}
function openEditFood(id, name, cal, protein, carbs, fat) {
  editingFoodId = id;
  document.getElementById('editFoodName').value = name;
  document.getElementById('editFoodCal').value = cal;
  document.getElementById('editFoodProtein').value = protein;
  document.getElementById('editFoodCarbs').value = carbs;
  document.getElementById('editFoodFat').value = fat;
  openModal('editFoodModal');
}
async function saveEditFood() {
  const name = document.getElementById('editFoodName').value;
  const cal = parseInt(document.getElementById('editFoodCal').value) || 0;
  const protein = parseFloat(document.getElementById('editFoodProtein').value) || 0;
  const carbs = parseFloat(document.getElementById('editFoodCarbs').value) || 0;
  const fat = parseFloat(document.getElementById('editFoodFat').value) || 0;
  const { error } = await sb.from('food_logs').update({ food_name: name, calories: cal, protein, carbs, fat }).eq('id', editingFoodId);
  if (error) { showToast('Error saving changes'); return; }
  closeModal('editFoodModal');
  showToast('✓ Changes saved');
  await loadFoodLog();
}
async function deleteFood(id) {
  const { error } = await sb.from('food_logs').delete().eq('id', id);
  if (error) { showToast('Error deleting'); return; }
  showToast('Meal removed');
  await loadFoodLog();
}
async function loadClientPlans() {
  await loadClientPlansWithDays();
}
async function toggleClientPlan(el, table, id) {
  const check = el.querySelector('.plan-check');
  const isDone = check.classList.contains('done');
  const newStatus = !isDone;
  check.className = 'plan-check' + (newStatus ? ' done' : '');
  check.innerHTML = newStatus ? '<i class="ti ti-check" style="font-size:11px;"></i>' : '';
  await sb.from(table).update({ completed: newStatus }).eq('id', id);
  if (table === 'meal_plans') {
    const { data: planItem } = await sb.from('meal_plans').select('*').eq('id', id).single();
    if (planItem) {
      const today = new Date().toISOString().split('T')[0];
      if (newStatus) {
        const { data: existing } = await sb.from('food_logs')
          .select('id').eq('user_id', currentUser.id)
          .eq('food_name', planItem.description)
          .gte('logged_at', today);
        if (!existing || existing.length === 0) {
          const cal = parseInt(planItem.calories) || 0;
          const prot = parseInt(planItem.protein) || 0;
          const { error: insertErr } = await sb.from('food_logs').insert({
            user_id: currentUser.id,
            food_name: planItem.description || 'Planned meal',
            calories: cal,
            protein: prot,
            carbs: 0,
            fat: 0,
            meal_type: planItem.meal_type || 'snack'
          });
          if (!insertErr) {
            showToast('✓ ' + (planItem.description || 'Meal') + ' logged' + (cal > 0 ? ' — ' + cal + ' kcal' : ''));
          } else {
            console.error('Food log insert error:', insertErr);
          }
        }
      } else {
        await sb.from('food_logs')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('food_name', planItem.description)
          .gte('logged_at', today);
      }
    }
  }
  await updateDashboardStats();
  generateAIInsight();
  const logEl = document.getElementById('c-log');
  if (logEl && logEl.classList.contains('active')) await loadFoodLog();
}
async function loadClientMessages() {
  if (!currentProfile?.trainer_id) {
    document.getElementById('clientMsgList').innerHTML = '<div style="text-align:center;padding:40px 20px;color:#5A5A52;font-size:13px;">No trainer connected yet.<br>Ask your trainer to send you an invite link.</div>';
    return;
  }
  const trainerId = currentProfile.trainer_id;
  const { data: trainerProfile } = await sb.from('profiles').select('full_name').eq('id', trainerId).single();
  document.getElementById('c-msg-trainer-label').textContent = trainerProfile?.full_name || 'Your trainer';
  const { data: sent } = await sb.from('messages').select('*').eq('sender_id', currentUser.id).eq('receiver_id', trainerId);
  const { data: received } = await sb.from('messages').select('*').eq('sender_id', trainerId).eq('receiver_id', currentUser.id);
  const msgs = [...(sent||[]), ...(received||[])].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  const container = document.getElementById('clientMsgList');
  if (!msgs || msgs.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#5A5A52;font-size:13px;">No messages yet.<br>Send your trainer a message below.</div>';
    return;
  }
  let html = '';
  msgs.forEach(msg => {
    const isOwn = msg.sender_id === currentUser.id;
    const time = new Date(msg.created_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    html += `<div class="msg-item ${isOwn ? 'msg-own' : ''}">
      <div class="msg-avatar" style="${isOwn ? 'background:#2A2A26;' : ''}">${isOwn ? 'Me' : (trainerProfile?.full_name || 'T').substring(0,2).toUpperCase()}</div>
      <div class="msg-bubble">
        <div class="msg-name-label">${isOwn ? 'You' : (trainerProfile?.full_name || 'Trainer')}</div>
        <div class="msg-text">${msg.content}</div>
        <div class="msg-time">${time}</div>
      </div>
    </div>`;
  });
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
  document.getElementById('clientMsgInput').onkeydown = (e) => { if (e.key === 'Enter') sendClientMessage(); };
}
async function sendClientMessage() {
  if (!currentProfile?.trainer_id) { showToast('No trainer connected'); return; }
  const input = document.getElementById('clientMsgInput');
  const content = input.value.trim();
  if (!content) return;
  const { error } = await sb.from('messages').insert({
    sender_id: currentUser.id,
    receiver_id: currentProfile.trainer_id,
    content: content
  });
  if (error) { showToast('Error sending message'); return; }
  input.value = '';
  await sb.from('notifications').insert({
    user_id: currentProfile.trainer_id,
    title: (currentProfile.full_name || 'Your member') + ' sent a message',
    body: content.substring(0, 100),
    type: 'message'
  }).then(() => {}).catch(() => {});
  await loadClientMessages();
}
async function loadTrainerApp() {
  document.querySelectorAll('#mainApp > .screen').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });

  const trainerScreen = document.getElementById('screen-trainer');
  if (trainerScreen) {
    trainerScreen.style.display = 'flex';
    trainerScreen.classList.add('active');
  }

  document.querySelectorAll('#screen-trainer .screen').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  const clientsTab = document.getElementById('t-clients');
  if (clientsTab) {
    clientsTab.style.display = 'flex';
    clientsTab.classList.add('active');
  }

  document.querySelectorAll('#screen-trainer .nav-btn').forEach(b => b.classList.remove('active'));
  const clientsNav = document.getElementById('tnav-clients');
  if (clientsNav) clientsNav.classList.add('active');
  try { updateTrainerProfile(); } catch(e) { console.error('profile err:', e); }
  try { await loadTrainerClients(); } catch(e) {
    console.error('clients err:', e);
    const c = document.getElementById('clientList');
    if (c) c.innerHTML = '<div style="padding:20px;color:#B54040;font-size:13px;">Error: ' + e.message + '</div>';
  }
  setTimeout(() => { initFirebase(); checkUnreadNotifications(); }, 2000);
}

function updateTrainerProfile() {
  if (!currentProfile) return;
  const name = currentProfile.full_name || 'Coach';
  const initial = name.charAt(0).toUpperCase();
  const avatarBtn = document.getElementById('trainerAvatarBtn');
  const avatarInitial = document.getElementById('trainerAvatarInitial');
  if (avatarBtn) avatarBtn.textContent = initial;
  if (avatarInitial) avatarInitial.textContent = initial;
  const nameEl = document.getElementById('trainerProfileName');
  const specEl = document.getElementById('trainerSpeciality');
  const certEl = document.getElementById('trainerCert');
  if (nameEl) nameEl.textContent = name;
  if (specEl) specEl.textContent = currentProfile.speciality || 'Not set';
  if (certEl) certEl.textContent = currentProfile.certification || 'Not set';
}
async function loadTrainerClients() {
  const container = document.getElementById('clientList');
  if (container) container.innerHTML = '<div style="text-align:center;padding:20px;color:#5A5A52;font-size:12px;">Loading...</div>';
  const { data: clients, error } = await sb.from('profiles').select('*').eq('trainer_id', currentUser.id);
  const totalEl = document.getElementById('totalClients');
  const labelEl = document.getElementById('trainerClientsLabel');
  const countEl = document.getElementById('trainerClientCount');
  const onTrackEl = document.getElementById('onTrackCount');
  const attnEl = document.getElementById('attentionCount');
  if (error) {
    console.error('clients error:', error);
    if (container) container.innerHTML = '<div style="text-align:center;padding:30px 20px;color:#5A5A52;font-size:13px;">Could not load clients. Try again.</div>';
    return;
  }
  const clientList = clients || [];
  if (totalEl) totalEl.textContent = clientList.length;
  if (labelEl) labelEl.textContent = (currentProfile?.full_name?.split(' ')[0] || 'Coach') + ' · ' + clientList.length + ' active clients';
  if (countEl) countEl.textContent = clientList.length + ' clients';
  if (!container) return;
  if (clientList.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:30px 20px;color:#5A5A52;font-size:13px;">No clients yet.<br>Tap + Invite to add your first client.</div>';
    if (onTrackEl) onTrackEl.textContent = '0';
    if (attnEl) attnEl.textContent = '0';
    return;
  }
  const today = new Date().toISOString().split('T')[0];
  const clientIds = clientList.map(c => c.id);
  const { data: allLogs } = await sb.from('food_logs').select('user_id,calories').in('user_id', clientIds).gte('logged_at', today);
  const colors = ['#2D6A4F','#C17D3C','#5C4A8A','#2C5F8A','#B54040'];
  let html = '';
  let onTrack = 0, attention = 0;
  clientList.forEach((client, i) => {
    const clientLogs = (allLogs||[]).filter(l => l.user_id === client.id);
    const loggedToday = clientLogs.length > 0;
    const totalCal = clientLogs.reduce((s,l) => s+(l.calories||0), 0);
    if (loggedToday) onTrack++; else attention++;
    const initial = (client.full_name||'U').substring(0,2).toUpperCase();
    const color = colors[i%colors.length];
    const tag = loggedToday ? '<span class="tag tag-g">On track</span>' : '<span class="tag tag-r">No log</span>';
    const calText = loggedToday ? totalCal.toLocaleString()+' kcal today' : "Hasn't logged today";
    const safeName = (client.full_name||'Client').replace(/[^a-zA-Z0-9 ]/g,'');
    html += `<div class="client-item" onclick="openClientDetail('${client.id}','${safeName}','${color}')">
      <div class="c-avatar" style="background:${color};">${initial}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:500;color:#fff;">${client.full_name||'Unknown'}</div>
      <div style="font-size:11px;color:#5C5C52;margin-top:1px;">${calText}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">${tag}</div>
    </div>`;
  });
  container.innerHTML = html;
  if (onTrackEl) onTrackEl.textContent = onTrack;
  if (attnEl) attnEl.textContent = attention;
}
async function openClientDetail(clientId, clientName, avatarColor) {
  selectedClient = { id: clientId, name: clientName };
  const today = new Date().toISOString().split('T')[0];
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
  const { data: profile } = await sb.from('profiles').select('*').eq('id', clientId).single();
  const { data: logs } = await sb.from('food_logs').select('*').eq('user_id', clientId).gte('logged_at', today).order('logged_at');
  const { data: mealPlan } = await sb.from('meal_plans').select('*').eq('client_id', clientId).eq('day_label', dayName);
  const totalMeals = (mealPlan || []).length;
  const doneMeals = (mealPlan || []).filter(m => m.completed).length;
  const totalCal = (logs || []).reduce((s, l) => s + (l.calories || 0), 0);
  const totalProtein = (logs || []).reduce((s, l) => s + (l.protein || 0), 0);
  const goal = profile?.calorie_goal || 1800;
  const calPct = Math.min(100, Math.round((totalCal / goal) * 100));
  const proteinGoal = Math.round(goal * 0.3 / 4);
  const proteinPct = Math.min(100, Math.round((totalProtein / proteinGoal) * 100));
  let bmiHtml = '';
  if (profile?.weight && profile?.height) {
    const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
    const status = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    bmiHtml = `<div style="font-size:10px;color:rgba(255,255,255,0.3);">${profile.weight}kg · ${profile.height}cm · BMI ${bmi} · ${status}</div>`;
  }
  let insight = '';
  if (totalCal === 0) {
    insight = `${clientName} hasn't logged anything today. Consider sending them a reminder.`;
  } else if (totalCal < goal * 0.5) {
    insight = `${clientName} is well below their calorie goal today at ${totalCal} kcal. Check in to see if they need support.`;
  } else if (totalProtein < proteinGoal * 0.6) {
    insight = `${clientName} is hitting calories but protein is low at ${Math.round(totalProtein)}g. Suggest a protein-rich dinner.`;
  } else {
    insight = `${clientName} is on track today with ${totalCal} kcal and ${Math.round(totalProtein)}g protein. Good progress.`;
  }
  const mealEmojis = { breakfast:'🌅', lunch:'☀️', dinner:'🌙', snack:'🍎' };
  let foodHtml = '';
  if (!logs || logs.length === 0) {
    foodHtml = '<div style="text-align:center;padding:20px;color:#5A5A52;font-size:13px;">No meals logged today</div>';
  } else {
    logs.forEach(log => {
      const emoji = mealEmojis[log.meal_type] || '🍽️';
      foodHtml += `<div class="food-item">
        <div class="food-emoji">${emoji}</div>
        <div class="food-info">
          <div class="food-name">${log.food_name}</div>
          <div class="food-macros">P ${Math.round(log.protein||0)}g · C ${Math.round(log.carbs||0)}g · F ${Math.round(log.fat||0)}g</div>
        </div>
        <div class="food-cal">${log.calories} kcal</div>
      </div>`;
    });
  }
  const initial = clientName.substring(0, 2).toUpperCase();
  const detailHtml = `
    <div class="page-header">
      <button onclick="showTrainerTab('clients')" style="background:none;border:none;color:#C9B99A;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:4px;margin-bottom:10px;"><i class="ti ti-arrow-left"></i> All clients</button>
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="c-avatar" style="background:${avatarColor};width:46px;height:46px;font-size:16px;">${initial}</div>
        <div>
          <div class="page-title" style="font-size:19px;">${clientName}</div>
          <div class="page-sub">Active today</div>
        </div>
      </div>
    </div>
    <div class="scroll">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div style="background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:12px;padding:12px;">
          <div style="font-size:10px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.03em;">Calories</div>
          <div style="font-size:22px;font-weight:400;color:#fff;font-family:'DM Serif Display',serif;margin-top:2px;">${totalCal.toLocaleString()}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.3);">/ ${goal.toLocaleString()} kcal</div>
          <div style="height:3px;background:#111;border-radius:2px;margin-top:7px;overflow:hidden;"><div style="width:${calPct}%;height:100%;background:#C17D3C;border-radius:2px;"></div></div>
        </div>
        <div style="background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:12px;padding:12px;">
          <div style="font-size:10px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.03em;">Protein</div>
          <div style="font-size:22px;font-weight:400;color:#2D6A4F;font-family:'DM Serif Display',serif;margin-top:2px;">${Math.round(totalProtein)}g</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.3);">/ ${proteinGoal}g goal</div>
          <div style="height:3px;background:#111;border-radius:2px;margin-top:7px;overflow:hidden;"><div style="width:${proteinPct}%;height:100%;background:#2D6A4F;border-radius:2px;"></div></div>
        </div>
      </div>
      ${totalMeals > 0 ? `<div style="background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:12px;padding:12px;margin-bottom:10px;">
        <div style="font-size:10px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.03em;margin-bottom:6px;">Meal plan today</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:22px;font-weight:400;color:${doneMeals===totalMeals?'#2D6A4F':'#fff'};font-family:'DM Serif Display',serif;">${doneMeals}/${totalMeals} meals checked</div>
          ${doneMeals===totalMeals?'<span style="font-size:11px;color:#2D6A4F;background:#1A2A1F;padding:3px 10px;border-radius:20px;">✓ All done</span>':'<span style="font-size:11px;color:#C17D3C;background:#2A1A08;padding:3px 10px;border-radius:20px;">${totalMeals-doneMeals} remaining</span>'}
        </div>
        <div style="height:3px;background:#111;border-radius:2px;margin-top:8px;overflow:hidden;"><div style="width:${totalMeals>0?Math.round((doneMeals/totalMeals)*100):0}%;height:100%;background:#2D6A4F;border-radius:2px;"></div></div>
        <div style="margin-top:8px;">${(mealPlan||[]).map(m=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;"><span style="color:${m.completed?'#2D6A4F':'#5A5A52'};">${m.completed?'✓':'○'}</span><span style="color:${m.completed?'#E8E4DC':'#5A5A52'};">${m.meal_type?m.meal_type.charAt(0).toUpperCase()+m.meal_type.slice(1)+' — ':''}${m.description}</span></div>`).join('')}</div>
      </div>` : ''}
      ${profile?.weight ? `<div style="background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:12px;padding:12px;margin-bottom:10px;">${bmiHtml}<div style="font-size:11px;color:#5A5A52;margin-top:4px;">Goal: ${profile.goal || 'Not set'}</div></div>` : ''}
      <div class="ai-card">
        <div class="ai-lbl">Reformé insight</div>
        <div class="ai-text">${insight}</div>
      </div>
      <div class="card" style="padding:8px 12px;margin-bottom:10px;">
        <div style="font-size:12px;font-weight:600;color:#1A1A18;margin-bottom:8px;">Today's food log</div>
        ${foodHtml}
      </div>
      <div style="background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:12px;padding:12px;margin-bottom:10px;">
        <div style="font-size:12px;font-weight:600;color:#E8E4DC;margin-bottom:8px;">Today's workout</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.3);" id="clientDetailWorkout">Loading...</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn-p" style="flex:1;" onclick="showTrainerTab('messages');setTimeout(()=>openClientMessages('${clientId}','${clientName}'),100)"><i class="ti ti-message-circle"></i> Message</button>
        <button class="btn-s" style="flex:1;" onclick="showTrainerTab('plans');setTimeout(()=>openClientPlan('${clientId}','${clientName}'),100)"><i class="ti ti-edit"></i> Edit plan</button>
      </div>
    </div>`;
  document.getElementById('t-detail-content').innerHTML = detailHtml;
  document.querySelectorAll('#screen-trainer .screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const detailEl = document.getElementById('t-detail');
  if (detailEl) { detailEl.classList.add('active'); detailEl.style.display = 'flex'; }
  document.querySelectorAll('#screen-trainer .nav-btn').forEach(b => b.classList.remove('active'));
  const clientsNav = document.getElementById('tnav-clients');
  if (clientsNav) clientsNav.classList.add('active');
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayName = dayNames[new Date().getDay()];
  const { data: workouts } = await sb.from('workout_plans').select('*').eq('client_id', clientId).eq('day_label', todayName);
  const workoutEl = document.getElementById('clientDetailWorkout');
  if (workoutEl) {
    if (!workouts || workouts.length === 0) {
      workoutEl.innerHTML = '<span style="color:rgba(255,255,255,0.3);">No workout scheduled for today</span>';
    } else {
      const typeLabels = { push:'Push Day 💪', pull:'Pull Day 🏋️', legs:'Leg Day 🦵', fullbody:'Full Body 🔥' };
      const dayType = workouts[0]?.day_type;
      workoutEl.innerHTML = `
        ${dayType ? `<div style="font-size:11px;color:#2D6A4F;margin-bottom:8px;">${typeLabels[dayType]||dayType}</div>` : ''}
        ${workouts.map(w => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid #2A2A26;font-size:12px;">
          <span style="color:#fff;">${w.exercise_name} ${w.completed?'✓':''}</span>
          <span style="color:rgba(255,255,255,0.3);">${w.sets}×${w.reps}${w.weight_kg?' · '+w.weight_kg+'kg':''}</span>
        </div>`).join('')}`;
    }
  }
}
async function openInviteModal() {
  openModal('inviteModal');
  const code = currentUser.id.substring(0, 8);
  const link = `${window.location.href.split('?')[0]}?invite=${code}&trainer=${currentUser.id}`;
  document.getElementById('inviteLinkText').textContent = link;
  window._inviteLink = link;
}
function copyInviteLink() {
  if (navigator.clipboard && window._inviteLink) {
    navigator.clipboard.writeText(window._inviteLink);
    showToast('✓ Link copied to clipboard');
  } else {
    showToast('Copy the link manually');
  }
}
function shareWhatsApp() {
  const link = window._inviteLink || '';
  const msg = encodeURIComponent('Join me on Reformé — the app that helps you track every meal and your trainer can see it in real time. Sign up here: ' + link);
  window.open('https://wa.me/?text=' + msg);
}