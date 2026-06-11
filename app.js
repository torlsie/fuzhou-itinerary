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
const flightTool = Array.from(document.querySelectorAll(".tool")).find((tool) => {
  return tool.querySelector("h2")?.textContent.trim() === "航班與集合";
});

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
      // Try the next public endpoint, then fall back to the editable default rate.
    }
  }

  rateStatus.textContent = "可手動調整匯率";
  updateConversion();
}

[rmbInput, rateInput].forEach((input) => {
  input.addEventListener("input", updateConversion);
});

updateConversion();
loadRate();

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

const wttrLabels = new Map([
  ["sunny", "晴朗"],
  ["clear", "晴朗"],
  ["partly cloudy", "局部多雲"],
  ["cloudy", "多雲"],
  ["overcast", "陰天"],
  ["mist", "薄霧"],
  ["fog", "有霧"],
  ["patchy rain nearby", "局部短暫雨"],
  ["light rain", "小雨"],
  ["moderate rain", "雨"],
  ["heavy rain", "大雨"],
  ["thundery outbreaks possible", "可能雷雨"]
]);

async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

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

function renderWttrWeather(data) {
  weatherGrid.innerHTML = data.weather.slice(0, 3).map((day) => {
    const noon = day.hourly.find((item) => item.time === "1200") || day.hourly[4] || day.hourly[0];
    const rawDesc = noon.weatherDesc?.[0]?.value?.trim() || "Weather";
    const desc = wttrLabels.get(rawDesc.toLowerCase()) || rawDesc;
    const rain = noon.chanceofrain ?? "--";

    return `
      <article class="weather-card">
        <span class="weather-card__date">${formatWeatherDate(day.date)}</span>
        <strong class="weather-card__main">${day.mintempC}-${day.maxtempC}°C</strong>
        <span class="weather-card__desc">${desc}</span>
        <span class="weather-card__rain">降雨機率 ${rain}%</span>
      </article>
    `;
  }).join("");
}

async function loadWeather() {
  const endpoints = [
    {
      url: "https://wttr.in/Fuzhou?format=j1",
      render: renderWttrWeather,
      label: "即時更新"
    },
    {
      url: "https://api.open-meteo.com/v1/forecast?latitude=26.0614&longitude=119.3061&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FShanghai&forecast_days=3",
      render: renderWeather,
      label: "即時更新"
    }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(endpoint.url);
      if (!response.ok) continue;

      const data = await response.json();
      endpoint.render(data);
      weatherStatus.textContent = endpoint.label;
      return;
    } catch {
      // Try the next weather source before showing the manual forecast link.
    }
  }

  weatherStatus.textContent = "可查看完整預報";
  weatherGrid.innerHTML = `
    <a class="weather-card weather-card--loading" href="https://m.nmc.cn/publish/forecast/AFJ/fuzhou.html" target="_blank" rel="noopener">
      天氣暫時無法載入，點此查看中央氣象台福州預報
    </a>
  `;
}

loadWeather();

function setupGatheringCountdown() {
  if (!flightTool) return;

  const style = document.createElement("style");
  style.textContent = `
    .countdown {
      display: grid;
      gap: 4px;
      margin-top: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: #fff8e8;
    }

    .countdown__label,
    .countdown__target {
      color: var(--muted);
      font-size: 0.86rem;
    }

    .countdown__time {
      color: var(--gold);
      font-size: 1.55rem;
      line-height: 1.2;
    }
  `;
  document.head.append(style);

  const countdown = document.createElement("div");
  countdown.className = "countdown";
  countdown.innerHTML = `
    <span class="countdown__label">集合倒數</span>
    <strong class="countdown__time" id="gatheringCountdown">計算中</strong>
    <span class="countdown__target">06/26 08:30 桃園機場第二航廈</span>
  `;
  flightTool.append(countdown);

  const output = countdown.querySelector("#gatheringCountdown");
  const target = new Date("2026-06-26T08:30:00+08:00").getTime();

  function renderCountdown() {
    const diff = target - Date.now();

    if (diff <= 0) {
      output.textContent = "已到集合時間";
      return;
    }

    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    output.textContent = `${days}天 ${hours}小時 ${minutes}分`;
  }

  renderCountdown();
  setInterval(renderCountdown, 30000);
}

setupGatheringCountdown();