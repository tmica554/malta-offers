let globalVenues = [];

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDayName() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date().getDay()];
}

function getStatusBadge(startTimeStr, endTimeStr, isDealToday) {
  if (!isDealToday || !startTimeStr || !endTimeStr) {
    return '<span class="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full font-bold">No Deal Today</span>';
  }

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const [sH, sM] = startTimeStr.split(':').map(Number);
  const startMins = sH * 60 + sM;
  const [eH, eM] = endTimeStr.split(':').map(Number);
  const endMins = eH * 60 + eM;

  if (currentMins >= startMins && currentMins < endMins) {
    const minsLeft = endMins - currentMins;
    if (minsLeft <= 30) {
      return `<span class="bg-red-600 text-white text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">🚨 LAST DRINK (${minsLeft}m left)</span>`;
    }
    return '<span class="bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">🟢 LIVE NOW</span>';
  }

  if (currentMins < startMins && (startMins - currentMins) <= 60) {
    const minsUntil = startMins - currentMins;
    return `<span class="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">🍊 STARTING SOON (${minsUntil}m)</span>`;
  }

  return '<span class="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full font-bold">Inactive</span>';
}

function createVenueCard(venue, todaySports) {
  const todayDay = getTodayDayName();
  const isDealToday = venue.happyHour.active && venue.happyHour.days && venue.happyHour.days.includes(todayDay);
  const badgeHtml = getStatusBadge(venue.happyHour.startTime, venue.happyHour.endTime, isDealToday);

  const sportsHtml = todaySports.length > 0
    ? todaySports.map(s => `${s.category}: ${s.match} (${s.time})`).join(', ')
    : 'None today';

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
        <strong>Happy Hour:</strong> ${isDealToday ? `${venue.happyHour.deal} (${venue.happyHour.startTime} - ${venue.happyHour.endTime})` : 'No deal today'}
      </div>
      <div class="text-sm text-gray-600">
        <strong>Sports today:</strong> ${sportsHtml}
      </div>
      <a href="${venue.googleMapsUrl}" target="_blank" class="block text-center bg-red-600 text-white text-sm py-2 rounded-lg font-semibold">
        Get Directions
      </a>
    </div>
  `;
}

function applyFilters() {
  const selectedLocality = document.getElementById('locality-filter').value;
  const todayStr = getTodayString();
  const todayDay = getTodayDayName();

  const filtered = globalVenues.filter(v => selectedLocality === 'ALL' || v.locality === selectedLocality);

  const homeContainer = document.getElementById('home-venue-list');
  const drinksContainer = document.getElementById('drinks-list');
  const sportsContainer = document.getElementById('sports-list');

  homeContainer.innerHTML = '';
  drinksContainer.innerHTML = '';
  sportsContainer.innerHTML = '';

  filtered.forEach(venue => {
    const todaySports = (venue.sports || []).filter(s => s.date === todayStr);
    const isDealToday = venue.happyHour.active && venue.happyHour.days && venue.happyHour.days.includes(todayDay);

    homeContainer.innerHTML += createVenueCard(venue, todaySports);
    if (isDealToday) drinksContainer.innerHTML += createVenueCard(venue, todaySports);
    if (todaySports.length > 0) sportsContainer.innerHTML += createVenueCard(venue, todaySports);
  });
}

function switchTab(tabName) {
  const filterContainer = document.getElementById('locality-filter-container');
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

fetch('data.json')
  .then(res => res.json())
  .then(venues => {
    globalVenues = venues;
    const todayStr = getTodayString();
    const todayDay = getTodayDayName();

    document.getElementById('count-deals').textContent = venues.filter(v => v.happyHour.active && v.happyHour.days && v.happyHour.days.includes(todayDay)).length;
    document.getElementById('count-pl').textContent = venues.filter(v => v.sports.some(s => s.date === todayStr && s.category.includes('Championship'))).length;
    document.getElementById('count-f1').textContent = venues.filter(v => v.sports.some(s => s.date === todayStr && s.category === 'F1')).length;

    applyFilters();
  });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}