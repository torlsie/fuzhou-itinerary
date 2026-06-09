const tabs = document.querySelectorAll(".tab");
const days = document.querySelectorAll(".day");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.day;

    tabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });

    days.forEach((day) => {
      const selected = day.id === target;
      day.classList.toggle("is-active", selected);
      day.hidden = !selected;
    });
  });
});

const rmbInput = document.querySelector("#rmbInput");
const rateInput = document.querySelector("#rateInput");
const twdResult = document.querySelector("#twdResult");
const rateStatus = document.querySelector("#rateStatus");
const weatherGrid = document.querySelector("#weatherGrid");
const weatherStatus = document.querySelector("#weatherStatus");

function formatTwd(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function updateConversion() {
  const rmb = Number(rmbInput.value);
  const rate = Number(rateInput.value);
  twdResult.textContent = formatTwd(rmb * rate);
}

async function loadRate() {
  const endpoints = [
    "https://latest.currency-api.pages.dev/v1/currencies/cny.json",
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json"
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;

      const data = await response.json();
      const rate = Number(data?.cny?.twd);
      if (!rate) continue;

      rateInput.value = rate.toFixed(4);
      rateStatus.textContent = `即時匯率 ${data.date || ""}`;
      updateConversion();
      return;
    } catch {
    }
  }

  rateStatus.textContent = "可手動調整匯率";
  updateConversion();
}

const weatherLabels = new Map([
  [0, "晴朗"],
  [1, "大致晴朗"],
  [2, "局部多雲"],
  [3, "多雲"],
  [45, "有霧"],
  [48, "霧凇"],
  [51, "小毛雨"],
  [53, "毛雨"],
  [55, "大毛雨"],
  [61, "小雨"],
  [63, "雨"],
  [65, "大雨"],
  [80, "短暫陣雨"],
  [81, "陣雨"],
  [82, "強陣雨"],
  [95, "雷雨"],
  [96, "雷雨伴冰雹"],
  [99, "強雷雨伴冰雹"]
]);

function formatWeatherDate(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function renderWeather(data) {
  const daily = data.daily;
  weatherGrid.innerHTML = daily.time.map((date, index) => {
    const max = Math.round(daily.temperature_2m_max[index]);
    const min = Math.round(daily.temperature_2m_min[index]);
    const code = daily.weather_code[index];
    const rain = daily.precipitation_probability_max[index];
    const desc = weatherLabels.get(code) || "天氣變化";

    return `
      <article class="weather-card">
        <span class="weather-card__date">${formatWeatherDate(date)}</span>
        <strong class="weather-card__main">${min}-${max}°C</strong>
        <span class="weather-card__desc">${desc}</span>
        <span class="weather-card__rain">降雨機率 ${rain ?? "--"}%</span>
      </article>
    `;
  }).join("");
}

async function loadWeather() {
  const endpoint = "https://api.open-meteo.com/v1/forecast?latitude=26.0614&longitude=119.3061&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FShanghai&forecast_days=3";

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("weather unavailable");

    const data = await response.json();
    renderWeather(data);
    weatherStatus.textContent = "即時更新";
  } catch {
    weatherStatus.textContent = "可查看完整預報";
    weatherGrid.innerHTML = `
      <a class="weather-card weather-card--loading" href="https://m.nmc.cn/publish/forecast/AFJ/fuzhou.html" target="_blank" rel="noopener">
        天氣暫時無法載入，點此查看中央氣象台福州預報
      </a>
    `;
  }
}

[rmbInput, rateInput].forEach((input) => {
  input.addEventListener("input", updateConversion);
});

updateConversion();
loadRate();
loadWeather();