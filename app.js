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

// Populate the 7-day dropdown dynamically
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

function getStatusBadge(startTimeStr, endTimeStr, isDealAvailable, isSelectedToday) {
  if (!isDealAvailable || !startTimeStr || !endTimeStr) {
    return '<span class="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full font-bold">No Deal</span>';
  }

  // If viewing a future date, show static scheduled status
  if (!isSelectedToday) {
    return '<span class="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-bold">🗓️ Available</span>';
  }

  // Real-time calculation for Today
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

function createVenueCard(venue, dateSports, isDealAvailable, isSelectedToday) {
  const badgeHtml = getStatusBadge(venue.happyHour.startTime, venue.happyHour.endTime, isDealAvailable, isSelectedToday);

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
        <strong>Sports scheduled:</strong> ${sportsHtml}
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

    homeContainer.innerHTML += createVenueCard(venue, dateSports, isDealAvailable, isSelectedToday);
    if (isDealAvailable) drinksContainer.innerHTML += createVenueCard(venue, dateSports, isDealAvailable, isSelectedToday);
    if (dateSports.length > 0) sportsContainer.innerHTML += createVenueCard(venue, dateSports, isDealAvailable, isSelectedToday);
  });

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

// Initial Load
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