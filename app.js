let globalVenues = [];

// Tab Switcher
function switchTab(tabName) {
  const tabs = ['home', 'drinks', 'sports', 'contact'];
  
  tabs.forEach(tab => {
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

// Render Venue Cards
function createVenueCard(venue) {
  return `
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-lg text-gray-900">${venue.name}</h3>
          <p class="text-sm text-gray-500">📍 ${venue.locality}</p>
        </div>
        ${venue.happyHour.active 
          ? '<span class="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold">🍻 Deal Active</span>' 
          : '<span class="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full">Inactive</span>'}
      </div>
      <div class="text-sm bg-red-50 text-red-900 p-2.5 rounded-lg">
        <strong>Happy Hour:</strong> ${venue.happyHour.deal} (${venue.happyHour.startTime} - ${venue.happyHour.endTime})
      </div>
      <div class="text-sm text-gray-600">
        <strong>Sports broadcast:</strong> ${venue.sports.map(s => s.category + ': ' + s.match).join(', ')}
      </div>
      <a href="${venue.googleMapsUrl}" target="_blank" class="block text-center bg-red-600 text-white text-sm py-2 rounded-lg font-semibold hover:bg-red-700 transition">
        Get Directions
      </a>
    </div>
  `;
}

// Load JSON Data
fetch('data.json')
  .then(res => res.json())
  .then(venues => {
    globalVenues = venues;
    
    let activeDealsCount = 0;
    let plCount = 0;
    let f1Count = 0;

    const homeContainer = document.getElementById('home-venue-list');
    const drinksContainer = document.getElementById('drinks-list');
    const sportsContainer = document.getElementById('sports-list');

    homeContainer.innerHTML = '';
    drinksContainer.innerHTML = '';
    sportsContainer.innerHTML = '';

    venues.forEach(venue => {
      // Counts
      if (venue.happyHour.active) activeDealsCount++;
      if (venue.sports.some(s => s.category === 'Premier League')) plCount++;
      if (venue.sports.some(s => s.category === 'F1')) f1Count++;

      // Append to Home Tab
      homeContainer.innerHTML += createVenueCard(venue);

      // Append to Drinks Tab if happy hour exists
      if (venue.happyHour) {
        drinksContainer.innerHTML += createVenueCard(venue);
      }

      // Append to Sports Tab if sports list exists
      if (venue.sports.length > 0) {
        sportsContainer.innerHTML += createVenueCard(venue);
      }
    });

    document.getElementById('count-deals').textContent = activeDealsCount;
    document.getElementById('count-pl').textContent = plCount;
    document.getElementById('count-f1').textContent = f1Count;
  });
  // Register PWA Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('PWA Service Worker registered successfully.'))
    .catch((err) => console.log('Service Worker registration failed:', err));
}