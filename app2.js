// app2.js - uses SUPABASE_URL and SUPABASE_ANON_KEY from app1.js

function goTo(screenId) {
  document.querySelectorAll('#mainApp > .screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(screenId);
  if (el) el.classList.add('active');
}
function showClientTab(tab) {
  document.querySelectorAll('#screen-client .screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = document.getElementById('c-' + tab);
  if (el) { el.classList.add('active'); el.style.display = 'flex'; }
  document.querySelectorAll('#screen-client .nav-btn').forEach(b => b.classList.remove('active'));
  const navEl = document.getElementById('cnav-' + tab);
  if (navEl) navEl.classList.add('active');
  if (tab === 'log') loadFoodLog();
  if (tab === 'dashboard') { updateDashboardStats(); generateAIInsight(); }
  if (tab === 'plan') loadClientPlansWithDays();
  if (tab === 'messages') loadClientMessages();
  if (tab === 'history') loadClientHistory();
}
let clientSelectedDay = null;
let clientCurrentPlanTab = 'meal';
async function loadClientPlansWithDays() {
  const today = new Date();
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayName = dayNames[today.getDay()];
  clientSelectedDay = clientSelectedDay || todayName;
  document.getElementById('plan-day-label').textContent = clientSelectedDay === todayName ? 'Today · ' + todayName : todayName;
  const tabsContainer = document.getElementById('clientDayTabs');
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  tabsContainer.innerHTML = days.map(d => {
    const isToday = d === todayName;
    const isSelected = d === clientSelectedDay;
    return `<button onclick="setClientDay('${d}')" style="flex-shrink:0;padding:7px 12px;border:none;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;background:${isSelected?'#2D6A4F':'#1E1E1B'};color:${isSelected?'#fff':isToday?'#C9B99A':'#5A5A52'};">${d.substring(0,3)}${isToday?' 📍':''}</button>`;
  }).join('');
  await loadClientPlanForDay();
}
function setClientDay(day) {
  clientSelectedDay = day;
  loadClientPlansWithDays();
}
async function loadClientPlanForDay() {
  if (!clientSelectedDay) return;
  const { data: mealPlans } = await sb.from('meal_plans').select('*').eq('client_id', currentUser.id).eq('day_label', clientSelectedDay).order('created_at');
  const { data: workoutPlans } = await sb.from('workout_plans').select('*').eq('client_id', currentUser.id).eq('day_label', clientSelectedDay).order('created_at');
  const today = new Date().toISOString().split('T')[0];
  const { data: todayLogs } = await sb.from('food_logs').select('*').eq('user_id', currentUser.id).gte('logged_at', today);
  const mealContainer = document.getElementById('cMealView');
  const workContainer = document.getElementById('cWorkView');
  const mealEmojis = { breakfast:'🌅', lunch:'☀️', dinner:'🌙', snack:'🍎', pre_workout:'💪', post_workout:'🔄' };
  if (!mealPlans || mealPlans.length === 0) {
    mealContainer.innerHTML = '<div class="empty-plan"><div class="empty-plan-icon">📋</div><div class="empty-plan-title">No meal plan for ' + clientSelectedDay + '</div><div class="empty-plan-sub">Your trainer hasn\'t set meals for this day yet.</div></div>';
  } else {
    let html = `<div style="font-size:11px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">${clientSelectedDay} · Planned meals</div>`;
    mealPlans.forEach(plan => {
      const emoji = mealEmojis[plan.meal_type] || '🍽️';
      const logged = (todayLogs || []).find(l => l.meal_type === plan.meal_type);
      const isLogged = !!logged;
      const isDifferent = isLogged && logged.food_name.toLowerCase() !== plan.description.toLowerCase();
      let statusHtml = '';
      if (isLogged && isDifferent) {
        statusHtml = `<div style="margin-top:6px;background:#FAF0E4;border-radius:8px;padding:6px 10px;font-size:11px;color:#C17D3C;">
          Had instead: ${logged.food_name} (${logged.calories} kcal)
        </div>`;
      } else if (isLogged) {
        statusHtml = `<div style="margin-top:4px;font-size:11px;color:#2D6A4F;">✓ Logged and matches plan</div>`;
      }
      html += `<div class="plan-item" onclick="toggleClientPlan(this,'meal_plans','${plan.id}')" style="flex-direction:column;align-items:flex-start;">
        <div style="display:flex;align-items:flex-start;gap:10px;width:100%;">
          <div class="plan-check ${plan.completed || isLogged ? 'done' : ''}">
            ${plan.completed || isLogged ? '<i class="ti ti-check" style="font-size:11px;"></i>' : ''}
          </div>
          <div style="flex:1;">
            <div class="plan-text-main">${emoji} ${plan.meal_type ? plan.meal_type.charAt(0).toUpperCase()+plan.meal_type.slice(1)+' — ':'' }${plan.description}</div>
            <div class="plan-detail">~${plan.calories||0} kcal · ${plan.protein||0}g protein</div>
          </div>
        </div>
        ${statusHtml}
      </div>`;
    });
    mealContainer.innerHTML = html;
  }
  if (!workoutPlans || workoutPlans.length === 0) {
    workContainer.innerHTML = '<div class="empty-plan"><div class="empty-plan-icon">💪</div><div class="empty-plan-title">No workout for ' + clientSelectedDay + '</div><div class="empty-plan-sub">Your trainer hasn\'t set a workout for this day yet.</div></div>';
  } else {
    const dayType = workoutPlans[0]?.day_type;
    const typeLabels = { push:'Push Day 💪', pull:'Pull Day 🏋️', legs:'Leg Day 🦵', fullbody:'Full Body 🔥' };
    let html = `
      ${dayType ? `<div style="background:#1A2A1F;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#2D6A4F;font-weight:500;">${typeLabels[dayType] || dayType}</div>` : ''}
      <div style="font-size:11px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">${clientSelectedDay} · ${workoutPlans.length} exercises</div>`;
    workoutPlans.forEach(plan => {
      html += `<div class="plan-item" onclick="toggleClientPlan(this,'workout_plans','${plan.id}')">
        <div class="plan-check ${plan.completed ? 'done' : ''}">
          ${plan.completed ? '<i class="ti ti-check" style="font-size:11px;"></i>' : ''}
        </div>
        <div style="flex:1;">
          <div class="plan-text-main">${plan.exercise_name}</div>
          <div class="plan-detail">${plan.sets} sets × ${plan.reps} reps${plan.weight_kg ? ' · '+plan.weight_kg+'kg' : ''} · Rest ${plan.rest_seconds||60}s</div>
        </div>
      </div>`;
    });
    workContainer.innerHTML = html;
  }
}
function showCPlan(t) {
  clientCurrentPlanTab = t;
  document.getElementById('cMealView').style.display = t === 'meal' ? 'block' : 'none';
  document.getElementById('cWorkView').style.display = t === 'workout' ? 'block' : 'none';
  document.getElementById('cMealBtn').className = 'sw-btn' + (t === 'meal' ? ' active' : '');
  document.getElementById('cWorkBtn').className = 'sw-btn' + (t === 'workout' ? ' active' : '');
}
async function loadClientHistory() {
  const container = document.getElementById('historyContent');
  container.innerHTML = '<div style="text-align:center;padding:20px;color:#5A5A52;font-size:13px;">Loading...</div>';
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const startDate = days[days.length - 1];
  const { data: logs } = await sb.from('food_logs').select('*').eq('user_id', currentUser.id).gte('logged_at', startDate).order('logged_at', { ascending: false });
  const { data: checkins } = await sb.from('body_checkins').select('*').eq('user_id', currentUser.id).gte('checkin_date', startDate).order('checkin_date', { ascending: false });
  const { data: workouts } = await sb.from('workout_plans').select('*').eq('client_id', currentUser.id).eq('completed', true);
  let html = `
    <div style="display:flex;background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:10px;padding:3px;margin-bottom:14px;">
      <button onclick="showHistoryTab('food')" id="histFoodBtn" style="flex:1;padding:7px;border:none;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;background:#2A2A26;color:#fff;">🍽️ Food</button>
      <button onclick="showHistoryTab('workout')" id="histWorkBtn" style="flex:1;padding:7px;border:none;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;background:transparent;color:rgba(255,255,255,0.3);">💪 Workouts</button>
    </div>
    <div id="histFoodView">`;
  let hasFoodData = false;
  days.forEach(dateStr => {
    const dayLogs = (logs || []).filter(l => l.logged_at.startsWith(dateStr));
    const checkin = (checkins || []).find(c => c.checkin_date === dateStr);
    const totalCal = dayLogs.reduce((s, l) => s + (l.calories || 0), 0);
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    if (dayLogs.length === 0 && !checkin) return;
    hasFoodData = true;
    html += `<div style="background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:12px;padding:14px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${dayLogs.length>0?'10px':'0'};">
        <div style="font-size:13px;font-weight:500;color:#fff;">${isToday?'Today':dayName}</div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${checkin ? `<span style="font-size:11px;color:#C9B99A;background:#2A2418;padding:3px 8px;border-radius:20px;">⚖️ ${checkin.weight}kg</span>` : ''}
          ${totalCal > 0 ? `<span style="font-size:12px;font-weight:500;color:#C17D3C;">${totalCal.toLocaleString()} kcal</span>` : ''}
        </div>
      </div>
      ${dayLogs.map(log => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid #2A2A26;font-size:12px;"><span style="color:rgba(255,255,255,0.4);">${log.food_name}</span><span style="color:rgba(255,255,255,0.3);">${log.calories} kcal</span></div>`).join('')}
    </div>`;
  });
  if (!hasFoodData) html += '<div style="text-align:center;padding:40px 20px;color:#5A5A52;font-size:13px;">No food logs yet.<br>Start logging meals to see history here.</div>';
  html += '</div>';
  html += '<div id="histWorkView" style="display:none;">';
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const completedByDay = {};
  (workouts || []).forEach(w => {
    const day = w.day_label || 'Unknown';
    if (!completedByDay[day]) completedByDay[day] = [];
    completedByDay[day].push(w);
  });
  if (Object.keys(completedByDay).length === 0) {
    html += '<div style="text-align:center;padding:40px 20px;color:#5A5A52;font-size:13px;">No completed workouts yet.<br>Mark exercises as done in your plan to track them here.</div>';
  } else {
    const typeLabels = { push:'Push Day 💪', pull:'Pull Day 🏋️', legs:'Leg Day 🦵', fullbody:'Full Body 🔥' };
    Object.entries(completedByDay).forEach(([day, exercises]) => {
      const dayType = exercises[0]?.day_type;
      html += `<div style="background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:12px;padding:14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-size:13px;font-weight:500;color:#fff;">${day}</div>
          ${dayType ? `<span style="font-size:11px;color:#2D6A4F;background:#1A2A1F;padding:3px 8px;border-radius:20px;">${typeLabels[dayType]||dayType}</span>` : ''}
        </div>
        ${exercises.map(ex => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid #2A2A26;font-size:12px;"><span style="color:rgba(255,255,255,0.4);">✓ ${ex.exercise_name}</span><span style="color:rgba(255,255,255,0.3);">${ex.sets}×${ex.reps}${ex.weight_kg?' · '+ex.weight_kg+'kg':''}</span></div>`).join('')}
      </div>`;
    });
  }
  html += '</div>';
  container.innerHTML = html;
}
function showHistoryTab(tab) {
  document.getElementById('histFoodView').style.display = tab === 'food' ? 'block' : 'none';
  document.getElementById('histWorkView').style.display = tab === 'workout' ? 'block' : 'none';
  document.getElementById('histFoodBtn').style.background = tab === 'food' ? '#2A2A26' : 'transparent';
  document.getElementById('histFoodBtn').style.color = tab === 'food' ? '#E8E4DC' : '#5A5A52';
  document.getElementById('histWorkBtn').style.background = tab === 'workout' ? '#2A2A26' : 'transparent';
  document.getElementById('histWorkBtn').style.color = tab === 'workout' ? '#E8E4DC' : '#5A5A52';
}
async function loadTrainerHistory() {
  const container = document.getElementById('tHistoryContent');
  if (container) {
    container.innerHTML = `
      <div style="font-size:11px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Select client to view history</div>
      <div class="card" style="padding:6px 12px;" id="tHistoryClientList">
        <div style="text-align:center;padding:20px;color:#5A5A52;font-size:13px;">Loading...</div>
      </div>`;
  }
  document.querySelectorAll('#screen-trainer .screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const histEl = document.getElementById('t-history');
  if (histEl) { histEl.classList.add('active'); histEl.style.display = 'flex'; }
  document.querySelectorAll('#screen-trainer .nav-btn').forEach(b => b.classList.remove('active'));
  const histNav = document.getElementById('tnav-history');
  if (histNav) histNav.classList.add('active');
  const { data: clients } = await sb.from('profiles').select('*').eq('trainer_id', currentUser.id);
  const listEl = document.getElementById('tHistoryClientList');
  if (!listEl) return;
  if (!clients || clients.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#5A5A52;font-size:13px;">No clients yet.</div>';
    return;
  }
  const colors = ['#2D6A4F','#C17D3C','#5C4A8A','#2C5F8A','#B54040'];
  listEl.innerHTML = clients.map((c, i) => `
    <div class="client-item" onclick="loadClientHistoryForTrainer('${c.id}','${c.full_name||'Client'}')">
      <div class="c-avatar" style="background:${colors[i%colors.length]};">${(c.full_name||'U').substring(0,2).toUpperCase()}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:500;color:#fff;">${c.full_name||'Unknown'}</div><div style="font-size:11px;color:#5C5C52;margin-top:1px;">Tap to view history</div></div>
      <i class="ti ti-chevron-right" style="color:#A0A090;font-size:16px;"></i>
    </div>`).join('');
}
async function loadClientHistoryForTrainer(clientId, clientName) {
  document.getElementById('t-history-client-label').textContent = clientName;
  const container = document.getElementById('tHistoryContent');
  container.innerHTML = `
    <button onclick="loadTrainerHistory()" style="background:#1E1E1B;border:none;color:#C9B99A;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;padding:6px 12px;border-radius:8px;display:flex;align-items:center;gap:4px;margin-bottom:14px;"><i class="ti ti-arrow-left"></i> All clients</button>
    <div style="text-align:center;padding:20px;color:#5A5A52;font-size:13px;">Loading...</div>`;
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const startDate = days[days.length - 1];
  const { data: logs } = await sb.from('food_logs').select('*').eq('user_id', clientId).gte('logged_at', startDate).order('logged_at', { ascending: false });
  const { data: checkins } = await sb.from('body_checkins').select('*').eq('user_id', clientId).gte('checkin_date', startDate).order('checkin_date', { ascending: false });
  let html = `
    <button onclick="loadTrainerHistory()" style="background:#1E1E1B;border:none;color:#C9B99A;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;padding:6px 12px;border-radius:8px;display:flex;align-items:center;gap:4px;margin-bottom:14px;"><i class="ti ti-arrow-left"></i> All clients</button>
    <div style="font-size:11px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;">${clientName} · Last 14 days</div>`;
  let hasData = false;
  days.forEach(dateStr => {
    const dayLogs = (logs || []).filter(l => l.logged_at.startsWith(dateStr));
    const checkin = (checkins || []).find(c => c.checkin_date === dateStr);
    const totalCal = dayLogs.reduce((s, l) => s + (l.calories || 0), 0);
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    if (dayLogs.length === 0 && !checkin) return;
    hasData = true;
    html += `<div style="background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:12px;padding:14px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${dayLogs.length>0?'10px':'0'};">
        <div style="font-size:13px;font-weight:500;color:#fff;">${isToday?'Today':dayName}</div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${checkin ? `<span style="font-size:11px;color:#C9B99A;background:#2A2418;padding:3px 8px;border-radius:20px;">⚖️ ${checkin.weight}kg</span>` : ''}
          ${totalCal > 0 ? `<span style="font-size:12px;font-weight:500;color:#C17D3C;">${totalCal.toLocaleString()} kcal</span>` : '<span style="font-size:11px;color:#B54040;">No log</span>'}
        </div>
      </div>
      ${dayLogs.map(log => `
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid #2A2A26;font-size:12px;">
          <span style="color:rgba(255,255,255,0.4);">${log.food_name}</span>
          <span style="color:rgba(255,255,255,0.3);">${log.calories} kcal</span>
        </div>`).join('')}
    </div>`;
  });
  if (!hasData) html += '<div style="text-align:center;padding:40px 20px;color:#5A5A52;font-size:13px;">No activity logged in the last 14 days.</div>';
  container.innerHTML = html;
}
function openEditProfile() {
  if (!currentProfile) return;
  document.getElementById('editProfileName').value = currentProfile.full_name || '';
  document.getElementById('editProfileWeight').value = currentProfile.weight || '';
  document.getElementById('editProfileHeight').value = currentProfile.height || '';
  document.getElementById('editProfileAge').value = currentProfile.age || '';
  document.getElementById('editProfileGoal').value = currentProfile.goal || 'lose';
  document.getElementById('editProfileActivity').value = currentProfile.activity_level || '1.55';
  document.getElementById('editProfileGender').value = currentProfile.gender || 'male';
  showClientTab('edit-profile');
}
async function saveEditProfile() {
  const wRaw = parseFloat(document.getElementById('editProfileWeight').value) || null;
  const hRaw = parseFloat(document.getElementById('editProfileHeight').value) || null;
  const a = parseInt(document.getElementById('editProfileAge').value) || null;
  const goal = document.getElementById('editProfileGoal').value;
  const activity = parseFloat(document.getElementById('editProfileActivity').value);
  const gender = document.getElementById('editProfileGender').value;
  const name = document.getElementById('editProfileName').value.trim();
  const w = wRaw;
  const h = hRaw;
  let calorieGoal = currentProfile?.calorie_goal || 1800;
  if (w && h && a) {
    let bmr = gender === 'male' ? 10*w + 6.25*h - 5*a + 5 : 10*w + 6.25*h - 5*a - 161;
    calorieGoal = goal === 'lose' ? Math.round(bmr * activity) - 500 : goal === 'muscle' ? Math.round(bmr * activity) + 300 : Math.round(bmr * activity);
  }
  const { error } = await sb.from('profiles').update({
    full_name: name, weight: w, height: h, age: a,
    goal, activity_level: activity, gender, calorie_goal: calorieGoal
  }).eq('id', currentUser.id);
  if (error) { showToast('Error saving. Try again.'); return; }
  currentProfile = { ...currentProfile, full_name: name, weight: w, height: h, age: a, goal, activity_level: activity, gender, calorie_goal: calorieGoal };
  updateClientProfile();
  showToast('✓ Profile updated');
  showClientTab('profile');
}
async function checkWeeklyWeightPrompt() {
  if (!currentProfile || currentProfile.role === 'trainer') return;
  const today = new Date();
  if (today.getDay() !== 0) return;
  const lastCheckIn = localStorage.getItem('lastWeightCheckIn');
  const todayStr = today.toISOString().split('T')[0];
  if (lastCheckIn === todayStr) return;
  setTimeout(() => openModal('weightCheckInModal'), 2000);
}
async function saveWeightCheckIn() {
  const weight = parseFloat(document.getElementById('checkInWeight').value);
  if (!weight) { showToast('Please enter your weight'); return; }
  const today = new Date().toISOString().split('T')[0];
  await sb.from('body_checkins').upsert({ user_id: currentUser.id, weight, checkin_date: today });
  await sb.from('profiles').update({ weight }).eq('id', currentUser.id);
  currentProfile.weight = weight;
  localStorage.setItem('lastWeightCheckIn', today);
  closeModal('weightCheckInModal');
  showToast('✓ Weight updated — ' + weight + 'kg');
  updateDashboardStats();
  updateClientProfile();
}
let mealRecsCache = {};
async function loadMealSuggestions() {
  if (!selectedClient) return;
  const container = document.getElementById('mealSuggestionsContainer');
  if (!container) return;
  const cached = mealRecsCache[selectedClient.id];
  if (cached) {
    renderMealSuggestions(cached.recs);
    return;
  }
  container.innerHTML = '<div style="color:#5A5A52;font-size:12px;">✨ Generating meal suggestions...</div>';
  const { data: clientProfile } = await sb.from('profiles').select('*').eq('id', selectedClient.id).single();
  const goal = clientProfile?.goal || 'maintain';
  const calorieGoal = clientProfile?.calorie_goal || 1800;
  const weight = clientProfile?.weight || 70;
  const goalLabels = { lose: 'fat loss', muscle: 'muscle building', maintain: 'maintenance', health: 'general health' };
  const prompt = `You are a professional nutritionist creating meal recommendations for a fitness app client.
Client stats:
- Name: ${selectedClient.name}
- Goal: ${goalLabels[goal]}
- Daily calorie target: ${calorieGoal} kcal
- Weight: ${weight}kg
Generate exactly 3 meal options for EACH of these 4 meal types: Breakfast, Lunch, Dinner, Snack.
Total = 12 meal suggestions.
Rules:
- Each meal should fit the client's goal (${goalLabels[goal]})
- Include UAE/Middle Eastern options alongside Western options for variety
- Keep meals practical and easy to prepare
- Each meal must have realistic macros
Return ONLY valid JSON in this exact format, no other text:
{
  "breakfast": [
    {"name": "meal name", "calories": 350, "protein": 30, "carbs": 40, "fat": 8, "description": "brief description"},
    {"name": "meal name", "calories": 320, "protein": 25, "carbs": 42, "fat": 7, "description": "brief description"},
    {"name": "meal name", "calories": 380, "protein": 28, "carbs": 45, "fat": 9, "description": "brief description"}
  ],
  "lunch": [...3 meals],
  "dinner": [...3 meals],
  "snack": [...3 meals]
}`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const recs = JSON.parse(clean);
    mealRecsCache[selectedClient.id] = { generated_at: Date.now(), recs };
    renderMealSuggestions(recs);
  } catch (e) {
    console.error('AI meal recs error:', e);
    container.innerHTML = '<div style="color:#B54040;font-size:12px;">Could not generate suggestions. Check your connection and try again.</div>';
  }
}
function renderMealSuggestions(recs) {
  const container = document.getElementById('mealSuggestionsContainer');
  if (!container || !recs) return;
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
  let html = '';
  mealTypes.forEach(type => {
    if (!recs[type]) return;
    html += `<div style="margin-bottom:12px;">
      <div style="font-size:10px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">${mealEmojis[type]} ${type}</div>`;
    recs[type].forEach((meal, i) => {
      html += `<div style="background:#111110;border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:500;color:#fff;">${meal.name}</div>
          <div style="font-size:10px;color:#5A5A52;margin-top:2px;">${meal.calories} kcal · P${meal.protein}g · C${meal.carbs}g · F${meal.fat}g</div>
          <div style="font-size:10px;color:#3A3A36;margin-top:1px;">${meal.description}</div>
        </div>
        <button onclick="addSuggestedMeal('${type}','${meal.name.replace(/[^a-zA-Z0-9 ]/g,'')}',${meal.calories},${meal.protein},${meal.carbs},${meal.fat})" style="background:#2D6A4F;color:#fff;border:none;border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;margin-left:8px;flex-shrink:0;">+ Add</button>
      </div>`;
    });
    html += '</div>';
  });
  container.innerHTML = html;
}
function addSuggestedMeal(mealType, name, cal, protein, carbs, fat) {
  if (!weeklyMeals[currentPlanDay]) weeklyMeals[currentPlanDay] = [];
  weeklyMeals[currentPlanDay].push({ meal_type: mealType, description: name, calories: cal, protein });
  showToast('✓ ' + name + ' added to ' + currentPlanDay);
  renderPlanBuilder();
}
async function loadMealRecommendations() {
  await loadMealSuggestions();
}
function showTrainerTab(tab) {
  document.querySelectorAll('#screen-trainer .screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = document.getElementById('t-' + tab);
  if (el) { el.classList.add('active'); el.style.display = 'flex'; }
  document.querySelectorAll('#screen-trainer .nav-btn').forEach(b => b.classList.remove('active'));
  const navEl = document.getElementById('tnav-' + tab);
  if (navEl) navEl.classList.add('active');
  else if (tab === 'detail') { const c = document.getElementById('tnav-clients'); if(c) c.classList.add('active'); }
  if (tab === 'clients') loadTrainerClients();
  if (tab === 'plans') loadTrainerPlans();
  if (tab === 'messages') loadTrainerMessages();
  if (tab === 'history') loadTrainerHistory();
}
let selectedClient = null;
async function loadTrainerPlans() {
  const container = document.getElementById('t-plans').querySelector('.scroll');
  const { data: clients } = await sb.from('profiles').select('*').eq('trainer_id', currentUser.id);
  if (!clients || clients.length === 0) {
    container.innerHTML = '<div class="empty-plan" style="padding:60px 20px;"><div class="empty-plan-icon">📋</div><div class="empty-plan-title">No clients yet</div><div class="empty-plan-sub">Invite clients first to build their plans.</div></div>';
    return;
  }
  const colors = ['#2D6A4F','#C17D3C','#5C4A8A','#2C5F8A','#B54040'];
  let html = '<div style="font-size:11px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Select a client to view or edit their plan</div>';
  clients.forEach((client, i) => {
    const initial = (client.full_name || 'U').substring(0, 2).toUpperCase();
    const color = colors[i % colors.length];
    html += `<div class="client-item" onclick="openClientPlan('${client.id}','${client.full_name || 'Client'}')">
      <div class="c-avatar" style="background:${color};">${initial}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:500;color:#fff;">${client.full_name || 'Unknown'}</div><div style="font-size:11px;color:#5C5C52;margin-top:1px;">Tap to view or send plan</div></div>
      <i class="ti ti-chevron-right" style="color:#A0A090;font-size:16px;"></i>
    </div>`;
  });
  container.innerHTML = '<div class="card" style="padding:6px 12px;">' + html + '</div>';
}
const WORKOUT_TEMPLATES = {
  push: {
    label: 'Push Day', emoji: '💪',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 8, weight_kg: 60, rest_seconds: 90 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight_kg: 20, rest_seconds: 75 },
      { name: 'Shoulder Press', sets: 3, reps: 10, weight_kg: 30, rest_seconds: 75 },
      { name: 'Lateral Raises', sets: 3, reps: 15, weight_kg: 8, rest_seconds: 60 },
      { name: 'Tricep Pushdowns', sets: 3, reps: 12, weight_kg: 25, rest_seconds: 60 },
      { name: 'Overhead Tricep Extension', sets: 3, reps: 12, weight_kg: 20, rest_seconds: 60 }
    ]
  },
  pull: {
    label: 'Pull Day', emoji: '🏋️',
    exercises: [
      { name: 'Deadlift', sets: 4, reps: 6, weight_kg: 80, rest_seconds: 120 },
      { name: 'Pull Ups', sets: 3, reps: 8, weight_kg: 0, rest_seconds: 90 },
      { name: 'Barbell Row', sets: 3, reps: 10, weight_kg: 50, rest_seconds: 75 },
      { name: 'Lat Pulldown', sets: 3, reps: 12, weight_kg: 45, rest_seconds: 60 },
      { name: 'Face Pulls', sets: 3, reps: 15, weight_kg: 20, rest_seconds: 60 },
      { name: 'Barbell Curl', sets: 3, reps: 12, weight_kg: 25, rest_seconds: 60 }
    ]
  },
  legs: {
    label: 'Leg Day', emoji: '🦵',
    exercises: [
      { name: 'Squat', sets: 4, reps: 8, weight_kg: 70, rest_seconds: 120 },
      { name: 'Romanian Deadlift', sets: 3, reps: 10, weight_kg: 60, rest_seconds: 90 },
      { name: 'Leg Press', sets: 3, reps: 12, weight_kg: 100, rest_seconds: 75 },
      { name: 'Leg Curl', sets: 3, reps: 12, weight_kg: 35, rest_seconds: 60 },
      { name: 'Leg Extension', sets: 3, reps: 15, weight_kg: 40, rest_seconds: 60 },
      { name: 'Calf Raises', sets: 4, reps: 20, weight_kg: 30, rest_seconds: 45 }
    ]
  },
  fullbody: {
    label: 'Full Body', emoji: '🔥',
    exercises: [
      { name: 'Squat', sets: 3, reps: 8, weight_kg: 60, rest_seconds: 90 },
      { name: 'Bench Press', sets: 3, reps: 8, weight_kg: 50, rest_seconds: 90 },
      { name: 'Barbell Row', sets: 3, reps: 10, weight_kg: 50, rest_seconds: 75 },
      { name: 'Shoulder Press', sets: 3, reps: 10, weight_kg: 25, rest_seconds: 75 },
      { name: 'Romanian Deadlift', sets: 3, reps: 10, weight_kg: 50, rest_seconds: 75 },
      { name: 'Pull Ups', sets: 3, reps: 8, weight_kg: 0, rest_seconds: 75 }
    ]
  }
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAMES_JS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
let currentPlanDay = DAY_NAMES_JS[new Date().getDay()];
let currentPlanTab = 'workout';
let weeklyPlan = {};
let weeklyMeals = {};
async function openClientPlan(clientId, clientName) {
  selectedClient = { id: clientId, name: clientName };
  const { data: mealPlans } = await sb.from('meal_plans').select('*').eq('client_id', clientId).order('created_at');
  const { data: workoutPlans } = await sb.from('workout_plans').select('*').eq('client_id', clientId).order('created_at');
  weeklyPlan = {};
  weeklyMeals = {};
  DAYS.forEach(d => { weeklyPlan[d] = { type: null, exercises: [] }; weeklyMeals[d] = []; });
  (workoutPlans || []).forEach(p => {
    const day = p.day_label || 'Monday';
    if (!weeklyPlan[day]) weeklyPlan[day] = { type: null, exercises: [] };
    weeklyPlan[day].exercises.push(p);
    if (p.day_type) weeklyPlan[day].type = p.day_type;
  });
  (mealPlans || []).forEach(p => {
    const day = p.day_label || 'Monday';
    if (!weeklyMeals[day]) weeklyMeals[day] = [];
    weeklyMeals[day].push(p);
  });
  renderPlanBuilder();
}
function renderPlanBuilder() {
  const container = document.getElementById('t-plans').querySelector('.scroll');
  const clientName = selectedClient?.name || 'Client';
  const typeColors = { push:'#2D6A4F', pull:'#5C4A8A', legs:'#C17D3C', fullbody:'#2C5F8A' };
  const typeLabelsShort = { push:'Push', pull:'Pull', legs:'Legs', fullbody:'Full' };
  const dayTabs = DAYS.map(d => {
    const hasWorkout = weeklyPlan[d]?.exercises?.length > 0;
    const hasMeals = weeklyMeals[d]?.length > 0;
    const isToday = d === DAY_NAMES_JS[new Date().getDay()];
    const isSelected = currentPlanDay === d;
    const dayType = weeklyPlan[d]?.type;
    const typeColor = typeColors[dayType] || '#C9B99A';
    const typeLabel = dayType ? typeLabelsShort[dayType] : (hasMeals ? 'Meal' : 'Rest');
    const typeLabelColor = dayType ? typeColor : (hasMeals ? '#C9B99A' : 'rgba(255,255,255,0.15)');
    const dot = (hasWorkout || hasMeals) ? `<div style="width:5px;height:5px;border-radius:50%;background:${typeColor};margin:3px auto 0;"></div>` : `<div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.08);margin:3px auto 0;"></div>`;
    return `<button onclick="setPlanDay('${d}')" style="flex:1;padding:7px 2px;border:none;border-radius:8px;font-size:8px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;background:${isSelected?'#2A2A26':isToday?'rgba(201,185,154,0.06)':'transparent'};border:${isSelected?'0.5px solid rgba(201,185,154,0.2)':isToday?'0.5px solid rgba(201,185,154,0.15)':'0.5px solid transparent'};text-align:center;">
      <div style="color:${isSelected?'#E8E4DC':isToday?'#C9B99A':'rgba(255,255,255,0.3)'};text-transform:uppercase;letter-spacing:0.04em;">${d.substring(0,3)}</div>
      <div style="font-size:9px;color:${typeLabelColor};margin-top:2px;">${typeLabel}</div>
      ${dot}
    </button>`;
  }).join('');
  const templateBtns = Object.entries(WORKOUT_TEMPLATES).map(([key, t]) => {
    const active = weeklyPlan[currentPlanDay]?.type === key;
    return `<button onclick="applyTemplate('${key}')" style="flex:1;padding:8px 4px;border:none;border-radius:10px;font-size:11px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;background:${active?'#2D6A4F':'#1E1E1B'};color:${active?'#fff':'#7A7A6E'};display:flex;flex-direction:column;align-items:center;gap:3px;">
      <span style="font-size:18px;">${t.emoji}</span>${t.label.split(' ')[0]}
    </button>`;
  }).join('');
  const exercises = weeklyPlan[currentPlanDay]?.exercises || [];
  let exHtml = '';
  if (exercises.length === 0) {
    exHtml = `<div style="text-align:center;padding:20px;color:#5A5A52;font-size:12px;">No exercises yet.<br>Pick a template above or add manually below.</div>`;
  } else {
    exercises.forEach((ex, i) => {
      exHtml += `<div style="background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;color:#fff;">${ex.exercise_name}</div>
          <div style="font-size:11px;color:#5A5A52;margin-top:2px;">${ex.sets} sets × ${ex.reps} reps${ex.weight_kg ? ' · ' + ex.weight_kg + 'kg' : ''} · Rest ${ex.rest_seconds||60}s</div>
        </div>
        <button onclick="removeExercise(${i})" style="background:#2A1A1A;border:none;border-radius:6px;padding:5px 8px;font-size:11px;color:#B54040;cursor:pointer;">✕</button>
      </div>`;
    });
  }
  const meals = weeklyMeals[currentPlanDay] || [];
  const mealEmojis = { breakfast:'🌅', lunch:'☀️', dinner:'🌙', snack:'🍎', pre_workout:'💪', post_workout:'🔄' };
  let mealHtml = '';
  if (meals.length === 0) {
    mealHtml = `<div style="text-align:center;padding:20px;color:#5A5A52;font-size:12px;">No meals yet. Add below.</div>`;
  } else {
    meals.forEach((m, i) => {
      mealHtml += `<div style="background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
        <div style="font-size:20px;">${mealEmojis[m.meal_type]||'🍽️'}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;color:#fff;">${m.meal_type ? m.meal_type.charAt(0).toUpperCase()+m.meal_type.slice(1)+' — ':'' }${m.description}</div>
          <div style="font-size:11px;color:#5A5A52;margin-top:2px;">~${m.calories||0} kcal · ${m.protein||0}g protein</div>
        </div>
        <button onclick="removeMeal(${i})" style="background:#2A1A1A;border:none;border-radius:6px;padding:5px 8px;font-size:11px;color:#B54040;cursor:pointer;">✕</button>
      </div>`;
    });
  }
  const tabStyle = (t) => `flex:1;padding:7px;border:none;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;background:${currentPlanTab===t?'#2A2A26':'transparent'};color:${currentPlanTab===t?'#E8E4DC':'#5A5A52'};`;
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <button onclick="loadTrainerPlans()" style="background:#1E1E1B;border:none;color:#C9B99A;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;padding:6px 12px;border-radius:8px;display:flex;align-items:center;gap:4px;"><i class="ti ti-arrow-left"></i> Back</button>
      <div style="font-size:15px;font-weight:500;color:#fff;">${clientName}'s plan</div>
    </div>
    <!-- DAY CALENDAR -->
    <div style="display:flex;background:rgba(201,185,154,0.04);border:0.5px solid rgba(201,185,154,0.1);border-radius:12px;padding:4px;gap:2px;margin-bottom:14px;">${dayTabs}</div>
    <!-- WORKOUT / MEAL SWITCHER -->
    <div style="display:flex;background:rgba(201,185,154,0.05);border:0.5px solid rgba(201,185,154,0.1);border-radius:10px;padding:3px;margin-bottom:14px;">
      <button style="${tabStyle('workout')}" onclick="setPlanTab('workout')">💪 Workout</button>
      <button style="${tabStyle('meal')}" onclick="setPlanTab('meal')">🍽️ Meal plan</button>
    </div>
    <!-- WORKOUT TAB -->
    <div id="planWorkoutView" style="display:${currentPlanTab==='workout'?'block':'none'};">
      <div style="font-size:11px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">${currentPlanDay} — Pick a template</div>
      <div style="display:flex;gap:6px;margin-bottom:14px;">${templateBtns}</div>
      <div style="font-size:11px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Exercises</div>
      ${exHtml}
      <!-- ADD ONE EXERCISE -->
      <div style="background:#1A1A18;border-radius:12px;padding:14px;margin-top:10px;border:0.5px solid #2A2A26;">
        <div style="font-size:11px;color:#C9B99A;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">+ Add one exercise to ${currentPlanDay}</div>
        <input type="text" id="addExName" placeholder="Exercise name e.g. Cable fly" style="width:100%;padding:8px;border-radius:8px;border:0.5px solid #2A2A26;background:#111110;color:#E8E4DC;font-family:'DM Sans',sans-serif;font-size:13px;margin-bottom:8px;outline:none;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
          <div><div style="font-size:10px;color:#5A5A52;margin-bottom:3px;">Sets</div><input type="number" id="addExSets" placeholder="4" style="width:100%;padding:7px;border-radius:8px;border:0.5px solid #2A2A26;background:#111110;color:#E8E4DC;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;"></div>
          <div><div style="font-size:10px;color:#5A5A52;margin-bottom:3px;">Reps</div><input type="number" id="addExReps" placeholder="10" style="width:100%;padding:7px;border-radius:8px;border:0.5px solid #2A2A26;background:#111110;color:#E8E4DC;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;"></div>
          <div><div style="font-size:10px;color:#5A5A52;margin-bottom:3px;">kg</div><input type="number" id="addExWeight" placeholder="0" style="width:100%;padding:7px;border-radius:8px;border:0.5px solid #2A2A26;background:#111110;color:#E8E4DC;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;"></div>
          <div><div style="font-size:10px;color:#5A5A52;margin-bottom:3px;">Rest s</div><input type="number" id="addExRest" placeholder="60" style="width:100%;padding:7px;border-radius:8px;border:0.5px solid #2A2A26;background:#111110;color:#E8E4DC;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;"></div>
        </div>
        <button onclick="addOneExercise()" class="btn-p">Add exercise</button>
      </div>
    </div>
    <!-- MEAL TAB -->
    <div id="planMealView" style="display:${currentPlanTab==='meal'?'block':'none'};">
      <div style="font-size:11px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">${currentPlanDay} — Meals</div>
      ${mealHtml}
      <!-- AI MEAL RECOMMENDATIONS -->
      <div style="background:#1A2A1F;border-radius:12px;padding:14px;margin-top:10px;border:0.5px solid #2D6A4F;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-size:11px;color:#2D6A4F;text-transform:uppercase;letter-spacing:0.06em;">✨ AI suggestions for ${clientName}</div>
          <button onclick="loadMealSuggestions()" style="background:#2D6A4F;color:#fff;border:none;border-radius:8px;padding:5px 12px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;">Generate</button>
        </div>
        <div id="mealSuggestionsContainer" style="font-size:12px;color:#5A5A52;line-height:1.6;">Tap Generate to get AI meal suggestions based on ${clientName}'s calorie goal and stats.</div>
      </div>
      <!-- MANUAL ADD -->
      <div style="background:#1A1A18;border-radius:12px;padding:14px;margin-top:10px;border:0.5px solid #2A2A26;">
        <div style="font-size:11px;color:#C9B99A;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">+ Add meal to ${currentPlanDay}</div>
        <select id="addMealType" style="width:100%;padding:8px;border-radius:8px;border:0.5px solid #2A2A26;background:#111110;color:#E8E4DC;font-family:'DM Sans',sans-serif;font-size:13px;margin-bottom:8px;outline:none;">
          <option value="breakfast">🌅 Breakfast</option>
          <option value="lunch">☀️ Lunch</option>
          <option value="dinner">🌙 Dinner</option>
          <option value="snack">🍎 Snack</option>
          <option value="pre_workout">💪 Pre-workout</option>
          <option value="post_workout">🔄 Post-workout</option>
        </select>
        <input type="text" id="addMealDesc" placeholder="e.g. 200g grilled chicken, 200g white rice, salad" style="width:100%;padding:8px;border-radius:8px;border:0.5px solid #2A2A26;background:#111110;color:#E8E4DC;font-family:'DM Sans',sans-serif;font-size:13px;margin-bottom:8px;outline:none;">
        <!-- AI Result for coach -->
        <div id="coachMealAIResult" style="display:none;background:rgba(201,185,154,0.06);border:0.5px solid rgba(201,185,154,0.15);border-radius:8px;padding:10px;margin-bottom:8px;">
          <div style="font-size:9px;color:#C9B99A;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">AI calculated</div>
          <div style="display:flex;gap:12px;">
            <div><div style="font-size:16px;font-weight:500;color:#fff;" id="coachMealCal">0</div><div style="font-size:9px;color:#5A5A52;">kcal</div></div>
            <div><div style="font-size:16px;font-weight:500;color:#2D6A4F;" id="coachMealProtein">0g</div><div style="font-size:9px;color:#5A5A52;">protein</div></div>
            <div><div style="font-size:16px;font-weight:500;color:#2C5F8A;" id="coachMealCarbs">0g</div><div style="font-size:9px;color:#5A5A52;">carbs</div></div>
            <div><div style="font-size:16px;font-weight:500;color:#C17D3C;" id="coachMealFat">0g</div><div style="font-size:9px;color:#5A5A52;">fat</div></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <button onclick="analyseCoachMeal()" id="coachAnalyseBtn" class="btn-s" style="flex:1;font-size:12px;padding:8px;">✨ Analyse</button>
          <button onclick="addOneMeal()" id="coachAddMealBtn" style="display:none;flex:1;padding:8px;background:#2D6A4F;border:none;border-radius:8px;font-size:12px;font-weight:500;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;">+ Add meal</button>
        </div>
      </div>

      <!-- CALORIE TARGET OVERRIDE -->
      <div style="background:#1A1A18;border-radius:12px;padding:14px;margin-top:10px;border:0.5px solid #2A2A26;">
        <div style="font-size:11px;color:#C9B99A;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Set calorie target for ${clientName}</div>
        <div style="font-size:11px;color:#5A5A52;margin-bottom:8px;">Override their AI-calculated target. Use when switching bulk to cut or adjusting intake.</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="number" id="coachCalOverride" placeholder="e.g. 1800" style="flex:1;padding:8px;border-radius:8px;border:0.5px solid #2A2A26;background:#111110;color:#E8E4DC;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;">
          <span style="font-size:12px;color:#5A5A52;">kcal / day</span>
        </div>
      </div>
    </div>
    <!-- SAVE BUTTON -->

    <button onclick="savePlanToDB()" class="btn-p" style="margin-top:14px;background:#C9B99A;color:#111110;font-weight:600;font-size:15px;">📤 Save & send full plan to ${clientName}</button>
  `;
}
function setPlanDay(day) {
  currentPlanDay = day;
  renderPlanBuilder();
}
function setPlanTab(tab) {
  currentPlanTab = tab;
  renderPlanBuilder();
}
function applyTemplate(key) {
  const template = WORKOUT_TEMPLATES[key];
  if (!template) return;
  weeklyPlan[currentPlanDay] = {
    type: key,
    exercises: template.exercises.map(e => ({ ...e, exercise_name: e.name || e.exercise_name }))
  };
  showToast('✓ ' + template.label + ' applied to ' + currentPlanDay);
  renderPlanBuilder();
}
function removeExercise(idx) {
  weeklyPlan[currentPlanDay].exercises.splice(idx, 1);
  renderPlanBuilder();
}
function removeMeal(idx) {
  weeklyMeals[currentPlanDay].splice(idx, 1);
  renderPlanBuilder();
}
function addOneExercise() {
  const name = document.getElementById('addExName').value.trim();
  if (!name) { showToast('Enter an exercise name'); return; }
  const sets = parseInt(document.getElementById('addExSets').value) || 3;
  const reps = parseInt(document.getElementById('addExReps').value) || 10;
  const weight = parseFloat(document.getElementById('addExWeight').value) || 0;
  const rest = parseInt(document.getElementById('addExRest').value) || 60;
  if (!weeklyPlan[currentPlanDay]) weeklyPlan[currentPlanDay] = { type: null, exercises: [] };
  weeklyPlan[currentPlanDay].exercises.push({ exercise_name: name, sets, reps, weight_kg: weight, rest_seconds: rest });
  showToast('✓ ' + name + ' added to ' + currentPlanDay);
  renderPlanBuilder();
}
let coachMealData = null;

async function analyseCoachMeal() {
  const desc = document.getElementById('addMealDesc').value.trim();
  if (!desc) { showToast('Enter a meal description first'); return; }
  const btn = document.getElementById('coachAnalyseBtn');
  btn.textContent = 'Analysing...';
  btn.disabled = true;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: 'Calculate nutritional values for: "' + desc + '". Return ONLY valid JSON: {"name":"short name","calories":0,"protein":0,"carbs":0,"fat":0}' }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const result = JSON.parse(text.replace(/```json|```/g,'').trim());
    coachMealData = result;
    document.getElementById('coachMealAIResult').style.display = 'block';
    document.getElementById('coachMealCal').textContent = result.calories;
    document.getElementById('coachMealProtein').textContent = result.protein + 'g';
    document.getElementById('coachMealCarbs').textContent = result.carbs + 'g';
    document.getElementById('coachMealFat').textContent = result.fat + 'g';
    btn.textContent = '✨ Re-analyse';
    btn.disabled = false;
    document.getElementById('coachAddMealBtn').style.display = 'block';
  } catch(e) {
    console.error('Coach meal AI error:', e);
    showToast('Could not analyse. Check connection.');
    btn.textContent = '✨ Analyse';
    btn.disabled = false;
  }
}

function addOneMeal() {
  const desc = document.getElementById('addMealDesc').value.trim();
  if (!desc) { showToast('Enter a meal description'); return; }
  const mealType = document.getElementById('addMealType').value;
  const cal = coachMealData?.calories || 0;
  const protein = coachMealData?.protein || 0;
  if (!weeklyMeals[currentPlanDay]) weeklyMeals[currentPlanDay] = [];
  weeklyMeals[currentPlanDay].push({ meal_type: mealType, description: desc, calories: cal, protein });
  showToast('✓ Meal added to ' + currentPlanDay);
  coachMealData = null;
  document.getElementById('addMealDesc').value = '';
  document.getElementById('coachMealAIResult').style.display = 'none';
  document.getElementById('coachAnalyseBtn').textContent = '✨ Analyse';
  document.getElementById('coachAddMealBtn').style.display = 'none';
  renderPlanBuilder();
}
async function savePlanToDB() {
  if (!selectedClient) return;
  const btn = document.querySelector('[onclick="savePlanToDB()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  await sb.from('workout_plans').delete().eq('client_id', selectedClient.id);
  await sb.from('meal_plans').delete().eq('client_id', selectedClient.id);
  const workoutRows = [];
  Object.entries(weeklyPlan).forEach(([day, dayPlan]) => {
    (dayPlan.exercises || []).forEach(ex => {
      workoutRows.push({
        trainer_id: currentUser.id,
        client_id: selectedClient.id,
        day_label: day,
        day_type: dayPlan.type,
        exercise_name: ex.exercise_name || ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight_kg: ex.weight_kg,
        rest_seconds: ex.rest_seconds || 60
      });
    });
  });
  const mealRows = [];
  Object.entries(weeklyMeals).forEach(([day, meals]) => {
    (meals || []).forEach(meal => {
      mealRows.push({
        trainer_id: currentUser.id,
        client_id: selectedClient.id,
        day_label: day,
        meal_type: meal.meal_type,
        description: meal.description,
        calories: meal.calories,
        protein: meal.protein
      });
    });
  });
  if (workoutRows.length > 0) await sb.from('workout_plans').insert(workoutRows);
  if (mealRows.length > 0) await sb.from('meal_plans').insert(mealRows);

  // Apply calorie override if coach set one
  const calOverrideEl = document.getElementById('coachCalOverride');
  const calOverride = calOverrideEl ? parseInt(calOverrideEl.value) : null;
  if (calOverride && calOverride > 500 && calOverride < 10000) {
    await sb.from('profiles').update({ calorie_goal: calOverride }).eq('id', selectedClient.id);
    showToast('✓ Calorie target updated to ' + calOverride + ' kcal');
    if (calOverrideEl) calOverrideEl.value = '';
  }

  // Notify client that their plan was updated
  if (workoutRows.length > 0 && mealRows.length > 0) {
    sb.from('notifications').insert({
      user_id: selectedClient.id,
      title: 'Plan updated',
      body: 'Meals & workout updated by coach',
      type: 'plan_update'
    }).then(() => {}).catch(() => {});
  } else if (workoutRows.length > 0) {
    sb.from('notifications').insert({
      user_id: selectedClient.id,
      title: 'Workout updated',
      body: 'Coach updated your workout plan',
      type: 'plan_update'
    }).then(() => {}).catch(() => {});
  } else if (mealRows.length > 0) {
    sb.from('notifications').insert({
      user_id: selectedClient.id,
      title: 'Meal plan updated',
      body: 'Coach updated your meal plan',
      type: 'plan_update'
    }).then(() => {}).catch(() => {});
  }

  showToast('✓ Full plan saved and sent to ' + selectedClient.name + '!');
  if (btn) { btn.disabled = false; btn.textContent = '📤 Save & send full plan to ' + selectedClient.name; }
}
async function addMealPlanItem() { addOneMeal(); }
async function addWorkoutPlanItem() { addOneExercise(); }
async function deletePlanItem(type, id) {
  const table = type === 'meal' ? 'meal_plans' : 'workout_plans';
  await sb.from(table).delete().eq('id', id);
  showToast('Removed');
  await openClientPlan(selectedClient.id, selectedClient.name);
}
async function sendPlan() {
  await savePlanToDB();
}
function switchPlanTab(t) {
  currentPlanTab = t === 'meal' ? 'meal' : 'workout';
  renderPlanBuilder();
}
async function loadTrainerMessages() {
  const container = document.getElementById('trainerMsgList');
  const { data: clients } = await sb.from('profiles').select('*').eq('trainer_id', currentUser.id);
  if (!clients || clients.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#5A5A52;font-size:13px;">No clients yet. Invite clients to start messaging.</div>';
    return;
  }
  const colors = ['#2D6A4F','#C17D3C','#5C4A8A','#2C5F8A','#B54040'];
  let html = '<div style="font-size:11px;color:#5A5A52;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;padding:0 4px;">Select a client to message</div>';
  clients.forEach((client, i) => {
    const initial = (client.full_name || 'U').substring(0, 2).toUpperCase();
    const color = colors[i % colors.length];
    html += `<div class="client-item" onclick="openClientMessages('${client.id}','${client.full_name || 'Client'}')">
      <div class="c-avatar" style="background:${color};">${initial}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:500;color:#fff;">${client.full_name || 'Unknown'}</div><div style="font-size:11px;color:#5C5C52;margin-top:1px;">Tap to open conversation</div></div>
      <i class="ti ti-chevron-right" style="color:#A0A090;font-size:16px;"></i>
    </div>`;
  });
  container.innerHTML = '<div class="card" style="padding:6px 12px;">' + html + '</div>';
  document.getElementById('trainerMsgInput').placeholder = 'Select a client above to message';
}
async function openClientMessages(clientId, clientName) {
  selectedClient = { id: clientId, name: clientName };
  const { data: sent } = await sb.from('messages').select('*').eq('sender_id', currentUser.id).eq('receiver_id', clientId);
  const { data: received } = await sb.from('messages').select('*').eq('sender_id', clientId).eq('receiver_id', currentUser.id);
  const filtered = [...(sent||[]), ...(received||[])].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  const container = document.getElementById('trainerMsgList');
  let html = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:0 4px;">
    <button onclick="loadTrainerMessages()" style="background:#1E1E1B;border:none;color:#C9B99A;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;padding:6px 12px;border-radius:8px;display:flex;align-items:center;gap:4px;"><i class="ti ti-arrow-left"></i> Back</button>
    <div style="font-size:15px;font-weight:500;color:#fff;">${clientName}</div>
  </div>`;
  if (filtered.length === 0) {
    html += '<div style="text-align:center;padding:30px 20px;color:#5A5A52;font-size:13px;">No messages yet. Send the first one below.</div>';
  } else {
    filtered.forEach(msg => {
      const isOwn = msg.sender_id === currentUser.id;
      const time = new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      html += `<div class="msg-item ${isOwn ? 'msg-own' : ''}">
        <div class="msg-avatar" style="${isOwn ? 'background:#2A2A26;' : ''}">${isOwn ? 'Me' : clientName.substring(0,2).toUpperCase()}</div>
        <div class="msg-bubble">
          <div class="msg-name-label">${isOwn ? 'You' : clientName}</div>
          <div class="msg-text">${msg.content}</div>
          <div class="msg-time">${time}</div>
        </div>
      </div>`;
    });
  }
  container.innerHTML = html;
  document.getElementById('trainerMsgInput').placeholder = 'Message ' + clientName + '...';
  document.getElementById('trainerMsgInput').onkeydown = (e) => { if (e.key === 'Enter') sendTrainerMessage(); };
}
async function sendTrainerMessage() {
  if (!selectedClient) { showToast('Select a client first'); return; }
  const input = document.getElementById('trainerMsgInput');
  const content = input.value.trim();
  if (!content) return;
  const { error } = await sb.from('messages').insert({ sender_id: currentUser.id, receiver_id: selectedClient.id, content: content });
  if (error) { showToast('Error sending message'); return; }
  input.value = '';
  await openClientMessages(selectedClient.id, selectedClient.name);
}
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
async function checkInviteCode() {
  const params = new URLSearchParams(window.location.search);
  const trainerId = params.get('trainer');
  if (!trainerId) return;
  localStorage.setItem('pendingTrainerId', trainerId);
  if (!currentUser) {
    showToast('Sign up or log in to connect with your trainer');
    goTo('screen-signup');
    return;
  }
  if (trainerId === currentUser.id) {
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  await connectToTrainer(trainerId);
}
async function connectToTrainer(trainerId) {
  if (!trainerId || !currentUser) return;
  if (trainerId === currentUser.id) { localStorage.removeItem('pendingTrainerId'); return; }
  const { data: trainerProfile } = await sb.from('profiles').select('full_name, role').eq('id', trainerId).single();
  if (!trainerProfile || trainerProfile.role !== 'trainer') { localStorage.removeItem('pendingTrainerId'); return; }
  const { error } = await sb.from('profiles').update({ trainer_id: trainerId, role: 'client' }).eq('id', currentUser.id);
  if (!error) {
    showToast('✓ Connected to ' + (trainerProfile.full_name || 'your trainer'));
    localStorage.removeItem('pendingTrainerId');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    console.error('Connect error:', error);
  }
}
async function checkPendingInvite() {
  const pendingTrainerId = localStorage.getItem('pendingTrainerId');
  if (pendingTrainerId && currentUser) {
    await connectToTrainer(pendingTrainerId);
  }
}
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBOxNjOZ0a5mR7xOdoShEX2tZhbIKA09-M",
  authDomain: "reforme-3f82c.firebaseapp.com",
  projectId: "reforme-3f82c",
  storageBucket: "reforme-3f82c.firebasestorage.app",
  messagingSenderId: "304977464183",
  appId: "1:304977464183:web:f68313c6fdebc8ec1d6f72",
  measurementId: "G-GYEQWV49HN"
};
const VAPID_KEY = "BLdjzhhu3UKd5JDmlIUqv4PVTr_GB3gri8CZvgP4zE9Ffu4XbCCNME_r9PZ09IYWdm7SrH1HWTfbweZxtW0VsMY";
let fbMessaging = null;
async function initFirebase() {
  if (typeof firebase === 'undefined') {
    await new Promise((resolve) => {
      const s1 = document.createElement('script');
      s1.src = 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js';
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js';
        s2.onload = resolve;
        document.head.appendChild(s2);
      };
      document.head.appendChild(s1);
    });
  }
  try {
    if (typeof firebase === 'undefined') {
      console.log('Firebase not loaded yet');
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    fbMessaging = firebase.messaging();
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } catch(e) {
        console.log('SW registration failed:', e);
      }
    }
    fbMessaging.onMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title) showNotificationToast(title, body);
    });
  } catch(e) {
    console.error('Firebase init error:', e);
  }
}
async function requestNotificationPermission() {
  try {
    if (!('Notification' in window)) {
      showToast('Notifications not supported on this browser');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('✓ Notifications enabled!');
      if (fbMessaging) {
        try {
          const token = await fbMessaging.getToken({ vapidKey: VAPID_KEY });
          if (token && currentUser && sb) {
            await sb.from('profiles').update({ fcm_token: token }).eq('id', currentUser.id);
          }
        } catch(e) {
          console.error('FCM token error:', e);
        }
      }
    } else {
      showToast('Notifications blocked. Enable in browser settings.');
    }
  } catch(e) {
    console.error('Permission error:', e);
    showToast('Could not request notification permission');
  }
}
function showNotificationToast(title, body) {
  const t = document.getElementById('toast');
  t.textContent = '🔔 ' + title + (body ? ' — ' + body : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}
async function scheduleNotification(userId, title, body, type) {
  try {
    await sb.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      sent: false,
      created_at: new Date().toISOString()
    });
  } catch(e) {
    console.error('Schedule notification error:', e);
  }
}
async function checkUnreadNotifications() {
  if (!currentUser || !sb) return;
  try {
    const { data: notifs } = await sb.from('notifications')
      .select('id, title, body, type')
      .eq('user_id', currentUser.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5);
    if (!notifs || notifs.length === 0) return;

    // Show notification dot on messages for clients
    const msgNavClient = document.getElementById('cnav-messages');
    if (msgNavClient) {
      const dot = msgNavClient.querySelector('.notif-dot');
      if (dot) dot.style.display = 'block';
    }

    // Show notification dot on messages for trainers
    const msgNavTrainer = document.getElementById('tnav-messages');
    if (msgNavTrainer) {
      const dot = msgNavTrainer.querySelector('.notif-dot');
      if (dot) dot.style.display = 'block';
    }

    // Show toast for each new notification
    notifs.forEach((notif, i) => {
      setTimeout(() => showNotificationToast(notif.title, notif.body), i * 1500);
    });

    // Mark all as read
    await sb.from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id)
      .eq('read', false);
  } catch(e) {
    console.error('checkUnreadNotifications error:', e);
  }
}
async function checkDailyReminders() {
  if (!currentProfile || currentProfile.role === 'trainer') return;
  const hour = new Date().getHours();
  if (hour < 8 || hour > 20) return;
  const today = new Date().toISOString().split('T')[0];
  const { data: logs } = await sb.from('food_logs').select('id').eq('user_id', currentUser.id).gte('logged_at', today);
  if (!logs || logs.length === 0) {
    if (hour >= 12 && hour <= 14) {
      showNotificationToast("Don't forget to log lunch!", "Tap Log food to add your meal");
    } else if (hour >= 18 && hour <= 20) {
      showNotificationToast("Log your dinner", "Keep your streak going — log your meal now");
    }
  }
}
let supabaseReady = false;
function showApp() {
  const loader = document.getElementById('loadingScreen');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => { loader.style.display = 'none'; }, 400);
  }
}
function startApp() {
  const params = new URLSearchParams(window.location.search);
  const trainerId = params.get('trainer');
  if (trainerId) localStorage.setItem('pendingTrainerId', trainerId);
  try {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    showApp();
    init();
  } catch(e) {
    console.error('Start error:', e);
    showApp();
    goTo('screen-welcome');
  }
}
if (typeof supabase !== 'undefined') {
  startApp();
} else {
  let tries = 0;
  const interval = setInterval(() => {
    tries++;
    if (typeof supabase !== 'undefined') {
      clearInterval(interval);
      startApp();
    } else if (tries > 30) {
      clearInterval(interval);
      // Try one more time with a fresh script load
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = () => {
        if (typeof supabase !== 'undefined') {
          startApp();
        } else {
          showApp();
          goTo('screen-welcome');
          setTimeout(() => showToast('Connection slow — try refreshing'), 500);
        }
      };
      s.onerror = () => {
        showApp();
        goTo('screen-welcome');
        setTimeout(() => showToast('Check your internet connection'), 500);
      };
      document.head.appendChild(s);
    }
  }, 200);
}
