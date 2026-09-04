let globalVenues = [];

const API_URL = 'https://script.google.com/macros/s/AKfycbwIZmQuDwQRcgzFON57xmkUEKISa6YHmVIqnpyhOkLZOUHKrCQeks5oepVAAyW7HRLH8Q/exec';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// --- Smart Time & Date Parsing ---
function parseTimeRobust(val, startMins = null) {
  if (!val) return { mins: null, cleanStr: '' };
  let s = String(val).trim().toLowerCase();

  // 1. Match 12-hour formats with AM/PM (11pm, 11:00 pm, 11p)
  let mAmPm = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)/);
  if (mAmPm) {
    let hh = parseInt(mAmPm[1], 10);
    let mm = mAmPm[2] ? parseInt(mAmPm[2], 10) : 0;
    let ampm = mAmPm[3];
    if (ampm.startsWith('p') && hh < 12) hh += 12;
    if (ampm.startsWith('a') && hh === 12) hh = 0;
    let mins = hh * 60 + mm;
    let cleanStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    return { mins, cleanStr };
  }

  // 2. Match HH:MM (:SS)
  let mHhmm = s.match(/(\d{1,2}):(\d{2})/);
  if (mHhmm) {
    let hh = parseInt(mHhmm[1], 10);
    let mm = parseInt(mHhmm[2], 10);

    if (s.includes('pm') && hh < 12) hh += 12;
    if (s.includes('am') && hh === 12) hh = 0;

    let mins = hh * 60 + mm;

    // Auto-fix: If end time < start time (e.g. start 16:00, end 11:00), treat 11:00 as 23:00 (11 PM)
    if (startMins !== null && mins < startMins && hh < 12) {
      if ((mins + 720) > startMins) {
        hh += 12;
        mins = hh * 60 + mm;
      }
    }
    let cleanStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    return { mins, cleanStr };
  }

  // 3. Match pure numbers like "23" or "11"
  let mNum = s.match(/^(\d{1,2})$/);
  if (mNum) {
    let hh = parseInt(mNum[1], 10);
    let mm = 0;
    if (startMins !== null && hh < 12 && (hh * 60) < startMins) {
      if (((hh + 12) * 60) > startMins) {
        hh += 12;
      }
    }
    let mins = hh * 60 + mm;
    let cleanStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    return { mins, cleanStr };
  }

  return { mins: null, cleanStr: String(val).trim() };
}

function cleanDateYYYYMMDD(val) {
  if (!val) return '';
  const str = String(val).trim();
  const m1 = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;
  
  const m2 = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return str;
}

function checkDayActive(daysVal, targetDayName) {
  if (!daysVal) return false;
  let str = Array.isArray(daysVal) ? daysVal.join(' ').toLowerCase() : String(daysVal).toLowerCase();
  let target = targetDayName.toLowerCase();

  if (str.includes('mon') && str.includes('fri') && (str.includes('-') || str.includes('to'))) return true;
  if (str.includes('mon') && str.includes('sat') && (str.includes('-') || str.includes('to'))) return true;
  if (str.includes('mon') && str.includes('sun') && (str.includes('-') || str.includes('to'))) return true;
  if (str.includes('daily') || str.includes('everyday') || str.includes('all')) return true;

  return str.includes(target) || str.includes('friday');
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function populateDateFilter() {
  const dateSelect = document.getElementById('date-filter');
  if (!dateSelect) return;
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

function getHHStatus(venue, selectedDateStr) {
  if (!venue.happyHour || !venue.happyHour.active || !venue.happyHour.days) {
    return { valid: false, status: 'none' };
  }

  const selectedDateObj = new Date(selectedDateStr + 'T00:00:00');
  const selectedDayName = DAYS_SHORT[selectedDateObj.getDay()];

  if (!checkDayActive(venue.happyHour.days, selectedDayName)) {
    return { valid: false, status: 'none' };
  }

  const isToday = selectedDateStr === getTodayString();
  if (!isToday) {
    return { valid: true, status: 'scheduled' };
  }

  const startParsed = parseTimeRobust(venue.happyHour.startTime);
  const endParsed = parseTimeRobust(venue.happyHour.endTime, startParsed.mins);

  if (startParsed.mins === null || endParsed.mins === null) {
    return { valid: false, status: 'none' };
  }

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  if (currentMins >= endParsed.mins) {
    return { valid: false, status: 'ended' };
  }

  if (currentMins >= startParsed.mins && currentMins < endParsed.mins) {
    const minsLeft = endParsed.mins - currentMins;
    if (minsLeft <= 30) {
      return { valid: true, status: 'last_drink', minsLeft };
    }
    return { valid: true, status: 'live' };
  }

  if (currentMins < startParsed.mins && (startParsed.mins - currentMins) <= 60) {
    const minsUntil = startParsed.mins - currentMins;
    return { valid: true, status: 'starting_soon', minsUntil };
  }

  if (currentMins < startParsed.mins) {
    return { valid: true, status: 'later_today' };
  }

  return { valid: false, status: 'none' };
}

function getValidSports(venue, selectedDateStr) {
  const isToday = selectedDateStr === getTodayString();
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  return (venue.sports || []).filter(s => {
    const cleanDate = cleanDateYYYYMMDD(s.date);
    if (cleanDate !== selectedDateStr) return false;

    if (isToday && s.time) {
      const matchParsed = parseTimeRobust(s.time);
      if (matchParsed.mins !== null && currentMins >= matchParsed.mins + 115) {
        return false;
      }
    }
    return true;
  });
}

function getBadgesHtml(hhInfo, validSports, isSelectedToday) {
  let badges = [];
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

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

  if (validSports.length > 0) {
    if (!isSelectedToday) {
      badges.push('<span class="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-bold">⚽ Match Day</span>');
    } else {
      validSports.forEach(s => {
        if (s.time) {
          const matchParsed = parseTimeRobust(s.time);
          if (matchParsed.mins !== null) {
            const matchEndMins = matchParsed.mins + 115;
            if (currentMins >= matchParsed.mins && currentMins < matchEndMins) {
              badges.push('<span class="bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">⚽ MATCH LIVE</span>');
            } else if (currentMins < matchParsed.mins && (matchParsed.mins - currentMins) <= 60) {
              const minsUntil = matchParsed.mins - currentMins;
              badges.push(`<span class="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-bold">⚽ KICKOFF IN ${minsUntil}M</span>`);
            } else if (currentMins < matchParsed.mins) {
              badges.push(`<span class="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-bold">⚽ Match (${matchParsed.cleanStr})</span>`);
            }
          }
        }
      });
    }
  }

  return `<div class="flex flex-wrap gap-1 justify-end">${badges.join('')}</div>`;
}

function createVenueCard(venue, hhInfo, validSports, isSelectedToday) {
  const badgeHtml = getBadgesHtml(hhInfo, validSports, isSelectedToday);

  const startClean = parseTimeRobust(venue.happyHour?.startTime).cleanStr;
  const endClean = parseTimeRobust(venue.happyHour?.endTime, parseTimeRobust(venue.happyHour?.startTime).mins).cleanStr;

  const sportsHtml = validSports.length > 0
    ? validSports.map(s => `${s.category}: ${s.match} (${parseTimeRobust(s.time).cleanStr})`).join(', ')
    : 'None scheduled';

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
        <strong>Happy Hour:</strong> ${hhInfo.valid ? `${venue.happyHour.deal} (${startClean} - ${endClean})` : 'No active deal'}
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
  const selectedDateStr = dateSelect?.value || getTodayString();
  const selectedLocality = document.getElementById('locality-filter')?.value || 'ALL';
  const searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

  const isSelectedToday = selectedDateStr === getTodayString();

  const filtered = globalVenues.filter(venue => {
    const matchLocality = selectedLocality === 'ALL' || venue.locality === selectedLocality;
    if (!matchLocality) return false;

    if (!searchTerm) return true;

    const nameMatch = venue.name.toLowerCase().includes(searchTerm);
    const localityMatch = venue.locality.toLowerCase().includes(searchTerm);
    const dealMatch = (venue.happyHour?.deal || '').toLowerCase().includes(searchTerm);
    const sportsMatch = (venue.sports || []).some(s => 
      s.match.toLowerCase().includes(searchTerm) || 
      s.category.toLowerCase().includes(searchTerm)
    );

    return nameMatch || localityMatch || dealMatch || sportsMatch;
  });

  const homeContainer = document.getElementById('home-venue-list');
  const drinksContainer = document.getElementById('drinks-list');
  const sportsContainer = document.getElementById('sports-list');

  if (homeContainer) homeContainer.innerHTML = '';
  if (drinksContainer) drinksContainer.innerHTML = '';
  if (sportsContainer) sportsContainer.innerHTML = '';

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

    // Show on Home tab if there's any active deal or sports today
    if (hhInfo.valid || validSports.length > 0) {
      if (homeContainer) homeContainer.innerHTML += cardHtml;
    }

    if (hhInfo.valid && drinksContainer) drinksContainer.innerHTML += cardHtml;
    if (validSports.length > 0 && sportsContainer) sportsContainer.innerHTML += cardHtml;
  });

  if (homeContainer && homeContainer.innerHTML === '') {
    homeContainer.innerHTML = '<p class="text-gray-400 text-center py-6 text-sm">No active deals or live sports found for this selection.</p>';
  }

  const countDealsElem = document.getElementById('count-deals');
  const countPlElem = document.getElementById('count-pl');
  const countF1Elem = document.getElementById('count-f1');

  if (countDealsElem) countDealsElem.textContent = activeDealsCount;
  if (countPlElem) countPlElem.textContent = plCount;
  if (countF1Elem) countF1Elem.textContent = f1Count;
}

function switchTab(tabName) {
  const filterContainer = document.getElementById('filter-container');
  const dateWrapper = document.getElementById('date-filter-wrapper');
  const dateSelect = document.getElementById('date-filter');

  if (filterContainer) {
    if (tabName === 'contact') {
      filterContainer.classList.add('hidden');
    } else if (tabName === 'home') {
      filterContainer.classList.remove('hidden');
      if (dateWrapper) dateWrapper.classList.add('hidden');
      filterContainer.classList.remove('grid-cols-2');
      filterContainer.classList.add('grid-cols-1');
      if (dateSelect) dateSelect.value = getTodayString();
    } else {
      filterContainer.classList.remove('hidden');
      if (dateWrapper) dateWrapper.classList.remove('hidden');
      filterContainer.classList.remove('grid-cols-1');
      filterContainer.classList.add('grid-cols-2');
    }
  }

  ['home', 'drinks', 'sports', 'contact'].forEach(tab => {
    const content = document.getElementById(`tab-${tab}-content`);
    const navBtn = document.getElementById(`nav-${tab}`);
    if (content && navBtn) {
      if (tab === tabName) {
        content.classList.remove('hidden');
        navBtn.classList.add('text-red-600');
        navBtn.classList.remove('text-gray-400');
      } else {
        content.classList.add('hidden');
        navBtn.classList.remove('text-red-600');
        navBtn.classList.add('text-gray-400');
      }
    }
  });

  applyFilters();
}

// PWA Install Banner Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.remove('hidden');
});

document.getElementById('pwa-install-btn')?.addEventListener('click', () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      document.getElementById('pwa-install-banner').classList.add('hidden');
    });
  }
});

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
if (isIOS && !isStandalone) {
  const iosBanner = document.getElementById('ios-install-banner');
  if (iosBanner) iosBanner.classList.remove('hidden');
}

populateDateFilter();

const homeListElem = document.getElementById('home-venue-list');
if (homeListElem) {
  homeListElem.innerHTML = '<p class="text-gray-400 text-center py-6 text-sm animate-pulse">Fetching latest live data...</p>';
}

// FORCE FRESH FETCH WITH CACHE-BUSTING TIMESTAMP
fetch(`${API_URL}?t=${Date.now()}`, { cache: 'no-store' })
  .then(res => res.json())
  .then(venues => {
    globalVenues = venues;
    applyFilters();
  })
  .catch(err => {
    console.error('Error fetching sheet data:', err);
    if (homeListElem) {
      homeListElem.innerHTML = '<p class="text-red-500 text-center py-6 text-sm">Failed to load live data.</p>';
    }
  });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}