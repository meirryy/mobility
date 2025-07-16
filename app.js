const map = L.map('map').setView([42.2808, -83.7430], 13); // Example: Ann Arbor, MI

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);
