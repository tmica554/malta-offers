let globalVenues = [];

const API_URL = 'https://script.google.com/a/macros/um.edu.mt/s/AKfycbzjd2tfeFJHu3fNfDuO1JSJDJvv0yYDM5CZRcYUhUffP85QsHlRrMGahOiwtzRQVXerKA/exec';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function populateDateFilter() {
  const dateSelect = document.getElementById('date-filter');
  dateSelect.innerHTML = '';

  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const dayName = DAYS_SHORT[d.getDay()];
    const monthName = MONTHS_SHORT[d.getMonth()];
    const dateNum = d.getDate();

    let label = `${dayName}, ${monthName} ${dateNum}`;
    if (i === 0) label = `Today (${label})`;
    else if (i === 1) label = `Tomorrow (${label})`;

    const option = document.createElement('option');
    option.value = dateStr;
    option.textContent = label;
    dateSelect.appendChild(option);
  }
}

// Evaluate Happy Hour availability & time window
function getHHStatus(venue, selectedDateStr) {
  if (!venue.happyHour || !venue.happyHour.active || !venue.happyHour.days) {
    return { valid: false, status: 'none' };
  }

  const selectedDateObj = new Date(selectedDateStr + 'T00:00:00');
  const selectedDayName = DAYS_SHORT[selectedDateObj.getDay()];

  if (!venue.happyHour.days.includes(selectedDayName)) {
    return { valid: false, status: 'none' };
  }

  const isToday = selectedDateStr === getTodayString();
  if (!isToday) {
    return { valid: true, status: 'scheduled' };
  }

  if (!venue.happyHour.startTime || !venue.happyHour.endTime) {
    return { valid: false, status: 'none' };
  }

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const [sH, sM] = venue.happyHour.startTime.split(':').map(Number);
  const startMins = sH * 60 + sM;
  const [eH, eM] = venue.happyHour.endTime.split(':').map(Number);
  const endMins = eH * 60 + eM;

  // EXPIRED DEAL: Automatically hide if current time passed end time
  if (currentMins >= endMins) {
    return { valid: false, status: 'ended' };
  }

  if (currentMins >= startMins && currentMins < endMins) {
    const minsLeft = endMins - currentMins;
    if (minsLeft <= 30) {
      return { valid: true, status: 'last_drink', minsLeft };
    }
    return { valid: true, status: 'live' };
  }

  if (currentMins < startMins && (startMins - currentMins) <= 60) {
    const minsUntil = startMins - currentMins;
    return { valid: true, status: 'starting_soon', minsUntil };
  }

  if (currentMins < startMins) {
    return { valid: true, status: 'later_today' };
  }

  return { valid: false, status: 'none' };
}

// Filter valid sports (hiding finished matches on today's view)
function getValidSports(venue, selectedDateStr) {
  const isToday = selectedDateStr === getTodayString();
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  return (venue.sports || []).filter(s => {
    if (s.date !== selectedDateStr) return false;
    if (isToday && s.time) {
      const [mH, mM] = s.time.split(':').map(Number);
      const matchStartMins = mH * 60 + mM;
      if (currentMins >= matchStartMins + 115) return false; // Match finished
    }
    return true;
  });
}

function getBadgesHtml(hhInfo, validSports, isSelectedToday) {
  let badges = [];
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  // Happy Hour Badges
  if (hhInfo.valid) {
    if (!isSelectedToday) {
      badges.push('<span class="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-bold">🍺 HH Scheduled</span>');
    } else {
      if (hhInfo.status === 'live') {
        badges.push('<span class="bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">🍹 DRINKS UP!</span>');
      } else if (hhInfo.status === 'last_drink') {
        badges.push(`<span class="bg-red-600 text-white text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">🚨 LAST DRINK (${hhInfo.minsLeft}m left)</span>`);
      } else if (hhInfo.status === 'starting_soon') {
        badges.push(`<span class="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">🍊 HH IN ${hhInfo.minsUntil}M</span>`);
      } else if (hhInfo.status === 'later_today') {
        badges.push('<span class="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-bold">🍺 HH Today</span>');
      }
    }
  }

  // Sports Badges
  if (validSports.length > 0) {
    if (!isSelectedToday) {
      badges.push('<span class="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-bold">⚽ Match Day</span>');
    } else {
      validSports.forEach(s => {
        if (s.time) {
          const [mH, mM] = s.time.split(':').map(Number);
          const matchStartMins = mH * 60 + mM;
          const matchEndMins = matchStartMins + 115;

          if (currentMins >= matchStartMins && currentMins < matchEndMins) {
            badges.push('<span class="bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">⚽ MATCH LIVE</span>');
          } else if (currentMins < matchStartMins && (matchStartMins - currentMins) <= 60) {
            const minsUntil = matchStartMins - currentMins;
            badges.push(`<span class="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-bold">⚽ KICKOFF IN ${minsUntil}M</span>`);
          } else if (currentMins < matchStartMins) {
            badges.push(`<span class="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-bold">⚽ Match (${s.time})</span>`);
          }
        }
      });
    }
  }

  return `<div class="flex flex-wrap gap-1 justify-end">${badges.join('')}</div>`;
}

function createVenueCard(venue, hhInfo, validSports, isSelectedToday) {
  const badgeHtml = getBadgesHtml(hhInfo, validSports, isSelectedToday);

  const sportsHtml = validSports.length > 0
    ? validSports.map(s => `${s.category}: ${s.match} (${s.time})`).join(', ')
    : 'None scheduled';

  // WhatsApp Pre-filled Invite Text
  const shareMsg = `Check out ${venue.name} in ${venue.locality}!` +
    (hhInfo.valid ? `\n🍺 Happy Hour: ${venue.happyHour.deal}` : '') +
    (validSports.length > 0 ? `\n⚽ Live Sports: ${sportsHtml}` : '') +
    `\n📍 Location: ${venue.googleMapsUrl}`;
  
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMsg)}`;

  return `
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-lg text-gray-900">${venue.name}</h3>
          <p class="text-sm text-gray-500">📍 ${venue.locality}</p>
        </div>
        ${badgeHtml}
      </div>
      <div class="text-sm bg-red-50 text-red-900 p-2.5 rounded-lg">
        <strong>Happy Hour:</strong> ${hhInfo.valid ? `${venue.happyHour.deal} (${venue.happyHour.startTime} - ${venue.happyHour.endTime})` : 'No active deal'}
      </div>
      <div class="text-sm text-gray-600">
        <strong>Sports:</strong> ${sportsHtml}
      </div>
      <div class="grid grid-cols-2 gap-2 pt-1">
        <a href="${venue.googleMapsUrl}" target="_blank" class="block text-center bg-red-600 text-white text-xs py-2 px-2 rounded-lg font-semibold">
          📍 Directions
        </a>
        <a href="${whatsappUrl}" target="_blank" class="block text-center bg-emerald-600 text-white text-xs py-2 px-2 rounded-lg font-semibold flex items-center justify-center gap-1">
          💬 Share (WA)
        </a>
      </div>
    </div>
  `;
}

function applyFilters() {
  const dateSelect = document.getElementById('date-filter');
  const selectedDateStr = dateSelect.value || getTodayString();
  const selectedLocality = document.getElementById('locality-filter').value;

  const isSelectedToday = selectedDateStr === getTodayString();
  const filtered = globalVenues.filter(v => selectedLocality === 'ALL' || v.locality === selectedLocality);

  const homeContainer = document.getElementById('home-venue-list');
  const drinksContainer = document.getElementById('drinks-list');
  const sportsContainer = document.getElementById('sports-list');

  homeContainer.innerHTML = '';
  drinksContainer.innerHTML = '';
  sportsContainer.innerHTML = '';

  let activeDealsCount = 0;
  let plCount = 0;
  let f1Count = 0;

  filtered.forEach(venue => {
    const hhInfo = getHHStatus(venue, selectedDateStr);
    const validSports = getValidSports(venue, selectedDateStr);

    if (hhInfo.valid) activeDealsCount++;
    if (validSports.some(s => s.category.includes('Premier League') || s.category.includes('Championship'))) plCount++;
    if (validSports.some(s => s.category === 'F1')) f1Count++;

    const cardHtml = createVenueCard(venue, hhInfo, validSports, isSelectedToday);

    // HOME TAB STRICT FILTER: Show only live/imminent HH or live/upcoming sports today
    if (isSelectedToday) {
      const isHHLiveOrImminent = hhInfo.valid && (hhInfo.status === 'live' || hhInfo.status === 'last_drink' || hhInfo.status === 'starting_soon');
      if (isHHLiveOrImminent || validSports.length > 0) {
        homeContainer.innerHTML += cardHtml;
      }
    } else {
      if (hhInfo.valid || validSports.length > 0) {
        homeContainer.innerHTML += cardHtml;
      }
    }

    if (hhInfo.valid) drinksContainer.innerHTML += cardHtml;
    if (validSports.length > 0) sportsContainer.innerHTML += cardHtml;
  });

  if (homeContainer.innerHTML === '') {
    homeContainer.innerHTML = '<p class="text-gray-400 text-center py-6 text-sm">No active deals or live sports happening right now.</p>';
  }

  document.getElementById('count-deals').textContent = activeDealsCount;
  document.getElementById('count-pl').textContent = plCount;
  document.getElementById('count-f1').textContent = f1Count;
}

function switchTab(tabName) {
  const filterContainer = document.getElementById('filter-container');
  const dateWrapper = document.getElementById('date-filter-wrapper');
  const dateSelect = document.getElementById('date-filter');

  if (tabName === 'contact') {
    filterContainer.classList.add('hidden');
  } else if (tabName === 'home') {
    filterContainer.classList.remove('hidden');
    dateWrapper.classList.add('hidden');
    filterContainer.classList.remove('grid-cols-2');
    filterContainer.classList.add('grid-cols-1');
    dateSelect.value = getTodayString(); // Reset to today
  } else {
    filterContainer.classList.remove('hidden');
    dateWrapper.classList.remove('hidden');
    filterContainer.classList.remove('grid-cols-1');
    filterContainer.classList.add('grid-cols-2');
  }

  ['home', 'drinks', 'sports', 'contact'].forEach(tab => {
    const content = document.getElementById(`tab-${tab}-content`);
    const navBtn = document.getElementById(`nav-${tab}`);
    if (tab === tabName) {
      content.classList.remove('hidden');
      navBtn.classList.add('text-red-600');
      navBtn.classList.remove('text-gray-400');
    } else {
      content.classList.add('hidden');
      navBtn.classList.remove('text-red-600');
      navBtn.classList.add('text-gray-400');
    }
  });

  applyFilters();
}

populateDateFilter();

// Show initial loading state
document.getElementById('home-venue-list').innerHTML = '<p class="text-gray-400 text-center py-6 text-sm animate-pulse">Loading live deals from Google Sheet...</p>';

// Fetch directly from Google Apps Script Web App
fetch(API_URL)
  .then(res => res.json())
  .then(venues => {
    globalVenues = venues;
    applyFilters();
  })
  .catch(err => {
    console.error('Error fetching sheet data:', err);
    document.getElementById('home-venue-list').innerHTML = '<p class="text-red-500 text-center py-6 text-sm">Failed to load live data. Check Google Sheet permissions.</p>';
  });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}