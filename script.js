const API_KEY = '30c8843c2a56f89265ac272e77341bf7';
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

const appState = {
    currentLocation: null,
    additionalCities: [],
    isLoading: false
};

const elements = {
    loadingMessage: document.getElementById('loadingMessage'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText'),
    currentLocationSection: document.getElementById('currentLocationSection'),
    currentLocationCards: document.getElementById('currentLocationCards'),
    additionalCitiesSection: document.getElementById('additionalCitiesSection'),
    additionalCitiesContainer: document.getElementById('additionalCitiesContainer'),
    addCitySection: document.getElementById('addCitySection'),
    addCityForm: document.getElementById('addCityForm'),
    cityInput: document.getElementById('cityInput'),
    autocompleteDropdown: document.getElementById('autocompleteDropdown'),
    cityError: document.getElementById('cityError'),
    refreshBtn: document.getElementById('refreshBtn')
};

const popularCities = [
    'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
    'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
    'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград',
    'Киев', 'Минск', 'Алматы', 'Ташкент', 'Баку',
    'Лондон', 'Париж', 'Берлин', 'Мадрид', 'Рим', 'Амстердам',
    'Нью-Йорк', 'Лос-Анджелес', 'Чикаго', 'Токио', 'Пекин', 'Сеул',
    'Дубай', 'Стамбул', 'Каир', 'Йоханнесбург', 'Сидней', 'Мельбурн'
];

function init() {
    loadState();
    setupEventListeners();
    
    if (appState.currentLocation) {
        loadCurrentLocationWeather();
    } else {
        requestGeolocation();
    }
    
    if (appState.additionalCities.length > 0) {
        loadAdditionalCitiesWeather();
    }
}

function setupEventListeners() {
    elements.addCityForm.addEventListener('submit', handleAddCity);
    elements.cityInput.addEventListener('input', handleCityInput);
    elements.cityInput.addEventListener('keydown', handleCityInputKeydown);
    elements.refreshBtn.addEventListener('click', handleRefresh);

    document.addEventListener('click', (e) => {
        if (!elements.cityInput.contains(e.target) && 
            !elements.autocompleteDropdown.contains(e.target)) {
            elements.autocompleteDropdown.style.display = 'none';
        }
    });
}

function requestGeolocation() {
    if (!navigator.geolocation) {
        console.log('Геолокация не поддерживается браузером');
        return;
    }

    showLoading();
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            appState.currentLocation = { lat: latitude, lon: longitude };
            saveState();
            loadCurrentLocationWeather();
        },
        (error) => {
            hideLoading();
            console.log('Геолокация отклонена или недоступна:', error.message);
        },
        { 
            timeout: 10000,
            enableHighAccuracy: false,
            maximumAge: 300000
        }
    );
}

async function loadCurrentLocationWeather() {
    if (!appState.currentLocation) return;
    
    showLoading();
    hideError();
    
    try {
        const weatherData = await getWeatherByCoords(
            appState.currentLocation.lat,
            appState.currentLocation.lon
        );
        
        displayWeatherCards(
            elements.currentLocationCards,
            weatherData,
            true
        );
        
        elements.currentLocationSection.style.display = 'block';
        hideLoading();
    } catch (error) {
        hideLoading();
        if (error.message.includes('API ключ')) {
            showError(error.message);
        } else {
            showError('Не удалось загрузить данные о погоде для текущего местоположения');
        }
        console.error('Ошибка загрузки погоды для текущего местоположения:', error);
    }
}

async function loadAdditionalCitiesWeather() {
    if (appState.additionalCities.length === 0) return;
    
    showLoading();
    hideError();
    
    try {
        const promises = appState.additionalCities.map(async (city) => {
            try {
                return { city, data: await getWeatherByCityName(city) };
            } catch (error) {
                console.error(`Ошибка при загрузке погоды для ${city}:`, error);
                return { city, data: null, error: error.message };
            }
        });
        
        const results = await Promise.all(promises);
        
        elements.additionalCitiesContainer.innerHTML = '';
        
        let hasValidData = false;
        results.forEach((result) => {
            if (result.data) {
                const citySection = createCitySection(result.city, result.data);
                elements.additionalCitiesContainer.appendChild(citySection);
                hasValidData = true;
            }
        });
        
        if (hasValidData) {
            elements.additionalCitiesSection.style.display = 'block';
        }
        
        hideLoading();
    } catch (error) {
        hideLoading();
        if (error.message && error.message.includes('API ключ')) {
            showError(error.message);
        } else {
            showError('Не удалось загрузить данные о погоде для некоторых городов');
        }
        console.error('Ошибка загрузки погоды для городов:', error);
    }
}

async function getWeatherByCoords(lat, lon) {
    
    const response = await fetch(
        `${API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`
    );
    
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Неверный API ключ. Проверьте правильность ключа в script.js');
        }
        throw new Error(`Ошибка при получении данных о погоде: ${response.status}`);
    }
    
    return await response.json();
}

async function getWeatherByCityName(cityName) {
    
    const response = await fetch(
        `${API_BASE_URL}/forecast?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=metric&lang=ru`
    );
    
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Неверный API ключ. Проверьте правильность ключа в script.js');
        }
        if (response.status === 404) {
            throw new Error('Город не найден');
        }
        throw new Error(`Ошибка при получении данных о погоде: ${response.status}`);
    }
    
    return await response.json();
}

function displayWeatherCards(container, weatherData, isToday = false) {
    container.innerHTML = '';
    
    if (!weatherData || !weatherData.list) {
        const errorMsg = document.createElement('p');
        errorMsg.textContent = 'Данные о погоде недоступны';
        errorMsg.style.color = 'var(--text-secondary)';
        container.appendChild(errorMsg);
        return;
    }

    const forecastsByDay = groupForecastsByDay(weatherData.list);
    const days = Object.keys(forecastsByDay).slice(0, 3);
    
    days.forEach((day, index) => {
        const forecasts = forecastsByDay[day];
        const mainForecast = forecasts[Math.floor(forecasts.length / 2)] || forecasts[0];
        
        const card = createWeatherCard(mainForecast, day, index === 0);
        container.appendChild(card);
    });
}

function groupForecastsByDay(forecasts) {
    const grouped = {};
    
    forecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dayKey = date.toLocaleDateString('ru-RU', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        if (!grouped[dayKey]) {
            grouped[dayKey] = [];
        }
        
        grouped[dayKey].push(forecast);
    });
    
    return grouped;
}

function createWeatherCard(forecast, date, isToday = false) {
    const card = document.createElement('div');
    card.className = `weather-card ${isToday ? 'today' : ''}`;
    card.setAttribute('role', 'listitem');
    
    const dateLabel = isToday ? 'Сегодня' : date;
    const temp = Math.round(forecast.main.temp);
    const description = forecast.weather[0].description;
    const humidity = forecast.main.humidity;
    const windSpeed = Math.round(forecast.wind.speed * 10) / 10;
    const pressure = Math.round(forecast.main.pressure * 0.750062);
    const icon = forecast.weather[0].icon;
    
    card.innerHTML = `
        <div class="weather-card__date">${dateLabel}</div>
        <div class="weather-card__temp">${temp}°C</div>
        <div class="weather-card__description">${description}</div>
        <div class="weather-card__details">
            <div class="weather-card__detail-item">
                <span class="weather-card__detail-label">Влажность:</span>
                <span>${humidity}%</span>
            </div>
            <div class="weather-card__detail-item">
                <span class="weather-card__detail-label">Ветер:</span>
                <span>${windSpeed} м/с</span>
            </div>
            <div class="weather-card__detail-item">
                <span class="weather-card__detail-label">Давление:</span>
                <span>${pressure} мм рт.ст.</span>
            </div>
        </div>
    `;
    
    return card;
}

function createCitySection(cityName, weatherData) {
    const section = document.createElement('div');
    section.className = 'city-section';
    section.dataset.city = cityName;
    
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'weather-cards';
    
    displayWeatherCards(cardsContainer, weatherData, false);
    
    section.innerHTML = `
        <div class="city-section__header">
            <h3 class="city-section__name">${cityName}</h3>
            <button class="remove-city-btn" data-city="${cityName}" aria-label="Удалить город ${cityName}">
                Удалить
            </button>
        </div>
    `;
    
    section.appendChild(cardsContainer);
    
    const removeBtn = section.querySelector('.remove-city-btn');
    removeBtn.addEventListener('click', () => removeCity(cityName));
    
    return section;
}

async function handleAddCity(e) {
    e.preventDefault();
    
    const cityName = elements.cityInput.value.trim();
    
    if (!cityName) {
        showCityError('Введите название города');
        return;
    }
    
    if (appState.additionalCities.includes(cityName)) {
        showCityError('Этот город уже добавлен');
        return;
    }

    if (appState.additionalCities.length >= 10) {
        showCityError('Можно добавить не более 10 городов');
        return;
    }
    
    hideCityError();
    showLoading();
    elements.addCityForm.querySelector('.add-btn').disabled = true;
    
    try {
        const weatherData = await getWeatherByCityName(cityName);
        
        appState.additionalCities.push(cityName);
        saveState();

        const citySection = createCitySection(cityName, weatherData);
        elements.additionalCitiesContainer.appendChild(citySection);
        elements.additionalCitiesSection.style.display = 'block';
        
        elements.cityInput.value = '';
        elements.autocompleteDropdown.style.display = 'none';
        hideLoading();
    } catch (error) {
        hideLoading();
        if (error.message.includes('API ключ')) {
            showCityError(error.message);
        } else if (error.message.includes('не найден')) {
            showCityError('Город не найден. Проверьте правильность написания');
        } else {
            showCityError('Не удалось добавить город. Попробуйте еще раз');
        }
        console.error('Ошибка добавления города:', error);
    } finally {
        elements.addCityForm.querySelector('.add-btn').disabled = false;
    }
}

function removeCity(cityName) {
    appState.additionalCities = appState.additionalCities.filter(
        city => city !== cityName
    );
    saveState();
    
    const citySection = elements.additionalCitiesContainer.querySelector(
        `[data-city="${cityName}"]`
    );
    
    if (citySection) {
        citySection.remove();
    }
    
    if (appState.additionalCities.length === 0) {
        elements.additionalCitiesSection.style.display = 'none';
    }
}

function handleCityInput(e) {
    const value = e.target.value.trim().toLowerCase();
    
    if (value.length === 0) {
        elements.autocompleteDropdown.style.display = 'none';
        hideCityError();
        return;
    }
    
    const matches = popularCities.filter(city =>
        city.toLowerCase().includes(value)
    ).slice(0, 5);
    
    if (matches.length > 0) {
        elements.autocompleteDropdown.innerHTML = matches.map((city, index) => `
            <div class="autocomplete-item" 
                 role="option" 
                 data-city="${city}" 
                 tabindex="0"
                 aria-selected="false"
                 id="autocomplete-option-${index}">
                ${city}
            </div>
        `).join('');
        
        elements.autocompleteDropdown.style.display = 'block';
        elements.autocompleteDropdown.setAttribute('aria-expanded', 'true');
        
        const items = elements.autocompleteDropdown.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            item.addEventListener('click', () => selectCity(item.dataset.city));
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectCity(item.dataset.city);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = items[index + 1] || items[0];
                    next.focus();
                    next.setAttribute('aria-selected', 'true');
                    item.setAttribute('aria-selected', 'false');
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = items[index - 1] || items[items.length - 1];
                    prev.focus();
                    prev.setAttribute('aria-selected', 'true');
                    item.setAttribute('aria-selected', 'false');
                }
            });
            item.addEventListener('mouseenter', () => {
                items.forEach(i => i.setAttribute('aria-selected', 'false'));
                item.setAttribute('aria-selected', 'true');
            });
        });
    } else {
        elements.autocompleteDropdown.style.display = 'none';
        elements.autocompleteDropdown.setAttribute('aria-expanded', 'false');
    }
}

function handleCityInputKeydown(e) {
    if (e.key === 'ArrowDown' && elements.autocompleteDropdown.style.display === 'block') {
        e.preventDefault();
        const firstItem = elements.autocompleteDropdown.querySelector('.autocomplete-item');
        if (firstItem) {
            firstItem.focus();
            firstItem.setAttribute('aria-selected', 'true');
        }
    } else if (e.key === 'Escape') {
        elements.autocompleteDropdown.style.display = 'none';
        elements.autocompleteDropdown.setAttribute('aria-expanded', 'false');
    }
}

function selectCity(cityName) {
    elements.cityInput.value = cityName;
    elements.autocompleteDropdown.style.display = 'none';
    elements.autocompleteDropdown.setAttribute('aria-expanded', 'false');
    hideCityError();
}

async function handleRefresh() {
    elements.refreshBtn.classList.add('spinning');
    elements.refreshBtn.disabled = true;
    
    try {
        if (appState.currentLocation) {
            await loadCurrentLocationWeather();
        }
        
        if (appState.additionalCities.length > 0) {
            await loadAdditionalCitiesWeather();
        }
    } finally {
        setTimeout(() => {
            elements.refreshBtn.classList.remove('spinning');
            elements.refreshBtn.disabled = false;
        }, 1000);
    }
}

function saveState() {
    try {
        localStorage.setItem('weatherAppState', JSON.stringify(appState));
    } catch (error) {
        console.error('Ошибка сохранения состояния:', error);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('weatherAppState');
        if (saved) {
            const parsed = JSON.parse(saved);
            appState.currentLocation = parsed.currentLocation || null;
            appState.additionalCities = parsed.additionalCities || [];
        }
    } catch (error) {
        console.error('Ошибка при загрузке состояния:', error);
        localStorage.removeItem('weatherAppState');
    }
}

function showLoading() {
    elements.loadingMessage.style.display = 'block';
    appState.isLoading = true;
}

function hideLoading() {
    elements.loadingMessage.style.display = 'none';
    appState.isLoading = false;
}

function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.style.display = 'block';
}

function hideError() {
    elements.errorMessage.style.display = 'none';
    elements.errorText.textContent = '';
}

function showCityError(message) {
    elements.cityError.textContent = message;
    elements.cityInput.setAttribute('aria-invalid', 'true');
}

function hideCityError() {
    elements.cityError.textContent = '';
    elements.cityInput.setAttribute('aria-invalid', 'false');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

