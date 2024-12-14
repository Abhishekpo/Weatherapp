// DOM Elements
const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const weatherDisplay = document.getElementById('weatherDisplay');
const pinnedCitiesList = document.getElementById('pinnedCitiesList');

// Event Listeners for City Pinning Page
if (searchBtn && cityInput && weatherDisplay) {
    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather(city);
        }
    });
}

// Fetch weather data from OpenWeatherMap API
async function fetchWeather(city) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
            throw new Error('City not found');
        }

        const data = await response.json();
        displayWeather(data);
    } catch (error) {
        alert(error.message);
    }
}

// Display weather data on the page
function displayWeather(data) {
    weatherDisplay.innerHTML = `
        <h2>${data.name}</h2>
        <p><strong>Temperature:</strong> ${data.main.temp}°C</p>
        <p><strong>Weather:</strong> ${data.weather[0].description}</p>
        <p><strong>Humidity:</strong> ${data.main.humidity}%</p>
        <button id="pinCityBtn">Pin this City</button>
    `;
    const pinCityBtn = document.getElementById('pinCityBtn');
    pinCityBtn.addEventListener('click', () => pinCity(data.name));
}

// Load and display pinned cities
if (pinnedCitiesList) {
    loadPinnedCities();
}

function loadPinnedCities() {
    fetch('/api/pinned-cities')
        .then(response => response.json())
        .then(cities => {
            cities.forEach(city => addCityToList(city.cityName));
        })
        .catch(error => console.error('Error loading pinned cities:', error));
}

// Add a city to the pinned cities list
function addCityToList(city) {
    if (!pinnedCitiesList) return;

    const li = document.createElement('li');
    li.textContent = city;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeCity(city));

    li.appendChild(removeBtn);
    pinnedCitiesList.appendChild(li);
}

// Pin a city
async function pinCity(city) {
    try {
        const response = await fetch('/api/add-city', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cityName: city }),
        });

        if (!response.ok) {
            throw new Error('Failed to pin city');
        }

        alert(`${city} has been pinned.`);
    } catch (error) {
        alert(error.message);
    }
}

// Remove a city
async function removeCity(city) {
    try {
        const response = await fetch(`/api/delete-city/${city}`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error('Failed to remove city');
        }

        // Reload pinned cities
        pinnedCitiesList.innerHTML = '';
        loadPinnedCities();
    } catch (error) {
        alert(error.message);
    }
}
