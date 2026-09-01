let globalVenues = [];

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

// Generate badges for Happy Hour AND Live Sports
function getBadgesHtml(venue, dateSports, isDealAvailable, isSelectedToday) {
  let badges = [];

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  // 1. Happy Hour Badge
  if (isDealAvailable && venue.happyHour.startTime && venue.happyHour.endTime) {
    if (!isSelectedToday) {
      badges.push('<span class="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-bold">🍺 HH Scheduled</span>');
    } else {
      const [sH, sM] = venue.happyHour.startTime.split(':').map(Number);
      const startMins = sH * 60 + sM;
      const [eH, eM] = venue.happyHour.endTime.split(':').map(Number);
      const endMins = eH * 60 + eM;

      if (currentMins >= startMins && currentMins < endMins) {
        const minsLeft = endMins - currentMins;
        if (minsLeft <= 30) {
          badges.push(`<span class="bg-red-600 text-white text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">🚨 LAST DRINK (${minsLeft}m left)</span>`);
        } else {
          badges.push('<span class="bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">🟢 HH LIVE</span>');
        }
      } else if (currentMins < startMins && (startMins - currentMins) <= 60) {
        const minsUntil = startMins - currentMins;
        badges.push(`<span class="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">🍊 HH IN ${minsUntil}M</span>`);
      }
    }
  }

  // 2. Sports Badge
  if (dateSports.length > 0) {
    if (!isSelectedToday) {
      badges.push('<span class="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-bold">⚽ Match Day</span>');
    } else {
      dateSports.forEach(s => {
        if (s.time) {
          const [mH, mM] = s.time.split(':').map(Number);
          const matchStartMins = mH * 60 + mM;
          const matchEndMins = matchStartMins + 115; // Estimated 115 min broadcast

          if (currentMins >= matchStartMins && currentMins < matchEndMins) {
            badges.push('<span class="bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">⚽ MATCH LIVE</span>');
          } else if (currentMins < matchStartMins && (matchStartMins - currentMins) <= 60) {
            const minsUntil = matchStartMins - currentMins;
            badges.push(`<span class="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-bold">⚽ KICKOFF IN ${minsUntil}M</span>`);
          }
        }
      });
    }
  }

  if (badges.length === 0) {
    return '<span class="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full font-bold">Inactive</span>';
  }

  return `<div class="flex flex-wrap gap-1 justify-end">${badges.join('')}</div>`;
}

function createVenueCard(venue, dateSports, isDealAvailable, isSelectedToday) {
  const badgeHtml = getBadgesHtml(venue, dateSports, isDealAvailable, isSelectedToday);

  const sportsHtml = dateSports.length > 0
    ? dateSports.map(s => `${s.category}: ${s.match} (${s.time})`).join(', ')
    : 'None scheduled';

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
        <strong>Happy Hour:</strong> ${isDealAvailable ? `${venue.happyHour.deal} (${venue.happyHour.startTime} - ${venue.happyHour.endTime})` : 'No deal on this date'}
      </div>
      <div class="text-sm text-gray-600">
        <strong>Sports:</strong> ${sportsHtml}
      </div>
      <a href="${venue.googleMapsUrl}" target="_blank" class="block text-center bg-red-600 text-white text-sm py-2 rounded-lg font-semibold text-white">
        Get Directions
      </a>
    </div>
  `;
}

function applyFilters() {
  const selectedDateStr = document.getElementById('date-filter').value || getTodayString();
  const selectedLocality = document.getElementById('locality-filter').value;

  const selectedDateObj = new Date(selectedDateStr + 'T00:00:00');
  const selectedDayName = DAYS_SHORT[selectedDateObj.getDay()];
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
    const dateSports = (venue.sports || []).filter(s => s.date === selectedDateStr);
    const isDealAvailable = venue.happyHour.active && venue.happyHour.days && venue.happyHour.days.includes(selectedDayName);

    if (isDealAvailable) activeDealsCount++;
    if (dateSports.some(s => s.category.includes('Premier League') || s.category.includes('Championship'))) plCount++;
    if (dateSports.some(s => s.category === 'F1')) f1Count++;

    const cardHtml = createVenueCard(venue, dateSports, isDealAvailable, isSelectedToday);

    // HOME TAB STRICT FILTER: Only show cards with active deals OR sports on the selected date
    if (isDealAvailable || dateSports.length > 0) {
      homeContainer.innerHTML += cardHtml;
    }

    if (isDealAvailable) drinksContainer.innerHTML += cardHtml;
    if (dateSports.length > 0) sportsContainer.innerHTML += cardHtml;
  });

  if (homeContainer.innerHTML === '') {
    homeContainer.innerHTML = '<p class="text-gray-400 text-center py-6">No active deals or live sports scheduled for this selection.</p>';
  }

  document.getElementById('count-deals').textContent = activeDealsCount;
  document.getElementById('count-pl').textContent = plCount;
  document.getElementById('count-f1').textContent = f1Count;
}

function switchTab(tabName) {
  const filterContainer = document.getElementById('filter-container');
  if (tabName === 'contact') {
    filterContainer.classList.add('hidden');
  } else {
    filterContainer.classList.remove('hidden');
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
}

populateDateFilter();

fetch('data.json')
  .then(res => res.json())
  .then(venues => {
    globalVenues = venues;
    applyFilters();
  });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}