let globalVenues = [];

// Calculate Status Badges (LIVE, LAST DRINK, STARTING SOON)
function getStatusBadge(startTimeStr, endTimeStr, isActive) {
  if (!isActive || !startTimeStr || !endTimeStr) {
    return '<span class="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full font-bold">Inactive</span>';
  }

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = startTimeStr.split(':').map(Number);
  const startMins = sH * 60 + sM;

  const [eH, eM] = endTimeStr.split(':').map(Number);
  const endMins = eH * 60 + eM;

  // Active Deal
  if (currentMins >= startMins && currentMins < endMins) {
    const minsLeft = endMins - currentMins;
    if (minsLeft <= 30) {
      return `<span class="bg-red-600 text-white text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">🚨 LAST DRINK (${minsLeft}m left)</span>`;
    }
    return '<span class="bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">🟢 LIVE NOW</span>';
  }

  // Starting Soon (within 60 minutes)
  if (currentMins < startMins && (startMins - currentMins) <= 60) {
    const minsUntil = startMins - currentMins;
    return `<span class="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">🍊 STARTING SOON (${minsUntil}m)</span>`;
  }

  return '<span class="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full font-bold">Inactive</span>';
}

function createVenueCard(venue) {
  const badgeHtml = getStatusBadge(venue.happyHour.startTime, venue.happyHour.endTime, venue.happyHour.active);
  
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
        <strong>Happy Hour:</strong> ${venue.happyHour.deal} (${venue.happyHour.startTime} - ${venue.happyHour.endTime})
      </div>
      <div class="text-sm text-gray-600">
        <strong>Sports:</strong> ${venue.sports.map(s => s.category + ': ' + s.match).join(', ')}
      </div>
      <a href="${venue.googleMapsUrl}" target="_blank" class="block text-center bg-red-600 text-white text-sm py-2 rounded-lg font-semibold">
        Get Directions
      </a>
    </div>
  `;
}

function applyFilters() {
  const selectedLocality = document.getElementById('locality-filter').value;
  
  const filtered = globalVenues.filter(v => {
    return selectedLocality === 'ALL' || v.locality === selectedLocality;
  });

  const homeContainer = document.getElementById('home-venue-list');
  const drinksContainer = document.getElementById('drinks-list');
  const sportsContainer = document.getElementById('sports-list');

  homeContainer.innerHTML = '';
  drinksContainer.innerHTML = '';
  sportsContainer.innerHTML = '';

  filtered.forEach(venue => {
    homeContainer.innerHTML += createVenueCard(venue);
    if (venue.happyHour) drinksContainer.innerHTML += createVenueCard(venue);
    if (venue.sports.length > 0) sportsContainer.innerHTML += createVenueCard(venue);
  });
}

function switchTab(tabName) {
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
    
    document.getElementById('count-deals').textContent = venues.filter(v => v.happyHour.active).length;
    document.getElementById('count-pl').textContent = venues.filter(v => v.sports.some(s => s.category === 'Premier League')).length;
    document.getElementById('count-f1').textContent = venues.filter(v => v.sports.some(s => s.category === 'F1')).length;

    applyFilters();
  });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}