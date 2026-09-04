let globalVenues = [];

const API_URL = 'https://script.google.com/macros/s/AKfycbwIZmQuDwQRcgzFON57xmkUEKISa6YHmVIqnpyhOkLZOUHKrCQeks5oepVAAyW7HRLH8Q/exec';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// --- Helper Sanitizers ---
function cleanTimeHHMM(val) {
  if (!val) return '';
  const str = String(val).trim();
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    return `${hh}:${mm}`;
  }
  return str;
}

function parseTimeToMinutes(val) {
  const clean = cleanTimeHHMM(val);
  if (!clean || !clean.includes(':')) return null;
  const [hh, mm] = clean.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
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

  const startMins = parseTimeToMinutes(venue.happyHour.startTime);
  const endMins = parseTimeToMinutes(venue.happyHour.endTime);

  if (startMins === null || endMins === null) {
    return { valid: false, status: 'none' };
  }

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

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

// Filter valid sports
function getValidSports(venue, selectedDateStr) {
  const isToday = selectedDateStr === getTodayString();
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  return (venue.sports || []).filter(s => {
    const cleanDate = cleanDateYYYYMMDD(s.date);
    if (cleanDate !== selectedDateStr) return false;

    if (isToday && s.time) {
      const matchStartMins = parseTimeToMinutes(s.time);
      if (matchStartMins !== null && currentMins >= matchStartMins + 115) {
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
          const matchStartMins = parseTimeToMinutes(s.time);
          if (matchStartMins !== null) {
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

    if (isSelectedToday) {
      const isHHLiveOrImminent = hhInfo.valid && (hhInfo.status === 'live' || hhInfo.status === 'last_drink' || hhInfo.status === 'starting_soon');
      if (isHHLiveOrImminent || validSports.length > 0) {
        if (homeContainer) homeContainer.innerHTML += cardHtml;
      }
    } else {
      if (hhInfo.valid || validSports.length > 0) {
        if (homeContainer) homeContainer.innerHTML += cardHtml;
      }
    }

    if (hhInfo.valid && drinksContainer) drinksContainer.innerHTML += cardHtml;
    if (validSports.length > 0 && sportsContainer) sportsContainer.innerHTML += cardHtml;
  });

  if (homeContainer && homeContainer.innerHTML === '') {
    homeContainer.innerHTML = '<p class="text-gray-400 text-center py-6 text-sm">No matching deals or live sports found.</p>';
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

// PWA Install Prompt
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
  homeListElem.innerHTML = '<p class="text-gray-400 text-center py-6 text-sm animate-pulse">Loading live deals from Google Sheet...</p>';
}

fetch(API_URL)
  .then(res => res.json())
  .then(venues => {
    // Sanitize raw Google Sheet outputs
    globalVenues = venues.map(venue => {
      if (venue.happyHour) {
        venue.happyHour.startTime = cleanTimeHHMM(venue.happyHour.startTime);
        venue.happyHour.endTime = cleanTimeHHMM(venue.happyHour.endTime);
      }
      if (venue.sports && Array.isArray(venue.sports)) {
        venue.sports = venue.sports.map(s => ({
          ...s,
          time: cleanTimeHHMM(s.time),
          date: cleanDateYYYYMMDD(s.date)
        }));
      }
      return venue;
    });

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