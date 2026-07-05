const API_URL = "https://script.google.com/macros/s/AKfycbwrOpxsEGrXyZurYDrOrVJZyBKR9ib74wXq62CvDygCKb2tbYL8_0LSlVfuwGlmnjWO/exec";

const userLocale = Intl.DateTimeFormat().resolvedOptions().locale || "en-US";

let PRODUCTS = [];
let COMPATIBILITY = [];
let MODELS = [];

async function loadDatabase() {
  const response = await fetch(API_URL);
  const data = await response.json();

  PRODUCTS = data.products || [];
  COMPATIBILITY = data.compatibility || [];

  MODELS = COMPATIBILITY.map(row => ({
    Country: row.Country || "",
    Brand: row.Brand || "",
    Model: row.Model || ""
  }));
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/generation/g, "gen")
    .replace(/^i(?=10)/, "l")
    .replace(/^1(?=10)/, "l")
    .replace(/[^a-z0-9]/g, "");
}

function getModelSearchText(model) {
  return normalizeText(`${model.Country || ""} ${model.Brand || ""} ${model.Model || ""}`);
}

function findModel(input) {
  const inputKey = normalizeText(input);
  if (!inputKey) return null;

  return MODELS.find(model => {
    const modelKey = normalizeText(model.Model);
    const brandKey = normalizeText(model.Brand);
    const searchText = getModelSearchText(model);

    return (
      modelKey === inputKey ||
      searchText.includes(inputKey) ||
      inputKey.includes(modelKey) ||
      inputKey.replace(brandKey, "") === modelKey
    );
  }) || null;
}

function getSuggestions(input, limit = 8) {
  const inputKey = normalizeText(input);
  if (!inputKey) return [];

  const seen = new Set();

  return MODELS
    .filter(model => getModelSearchText(model).includes(inputKey))
    .filter(model => {
      const key = `${model.Brand}-${model.Model}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function getProductId(product) {
  return product.SKU || "";
}

function getProductName(product) {
  return product["Product Name"] || "";
}

function getProductsForModel(modelName) {
  const matchedRows = COMPATIBILITY.filter(row => row.Model === modelName);
  let productIds = [];

  matchedRows.forEach(row => {
    Object.keys(row).forEach(key => {
      if (["Country", "Brand", "Model"].includes(key)) return;

      const value = String(row[key] || "").trim();

      if (
        value === "✅" ||
        value.toLowerCase() === "yes" ||
        value === "1" ||
        value.toLowerCase() === "true"
      ) {
        productIds.push(key);
      }
    });
  });

  productIds = [...new Set(productIds)];

  return PRODUCTS
    .filter(product => productIds.includes(getProductId(product)))
    .sort((a, b) => Number(a["Display Order"] || 999) - Number(b["Display Order"] || 999));
}

function getAmazonCountry() {
  const params = new URLSearchParams(window.location.search);
  const countryFromUrl = params.get("country");

  if (countryFromUrl) return countryFromUrl.toUpperCase();

  const localeCountry = (userLocale.split("-")[1] || "").toUpperCase();
  return localeCountry || "US";
}

function getAmazonLink(product) {
  const country = getAmazonCountry();
  const directColumn = `Amazon ${country}`;

  if (product[directColumn]) return product[directColumn];

  const europeFallbacks = ["DE", "FR", "IT", "ES", "NL", "PL", "UK"];
  const northAmericaFallbacks = ["US", "CA", "MX"];

  if (europeFallbacks.includes(country)) {
    for (const code of europeFallbacks) {
      const link = product[`Amazon ${code}`];
      if (link) return link;
    }
  }

  if (northAmericaFallbacks.includes(country)) {
    for (const code of northAmericaFallbacks) {
      const link = product[`Amazon ${code}`];
      if (link) return link;
    }
  }

  return product["Amazon US"] || product["Amazon DE"] || "#";
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width <= 767) return "Mobile";
  if (width <= 1024) return "Tablet";
  return "Desktop";
}

function renderIncludes(includes) {
  if (!includes) return "";

  const items = String(includes)
    .split(";")
    .map(item => item.trim())
    .filter(Boolean);

  if (!items.length) return "";

  return `
    <ul class="product-includes">
      ${items.map(item => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

function renderProductCard(product, model) {
  return `
    <div class="product-card fade-in">
      <img
        class="product-image"
        src="${product["Image URL"] || ""}"
        alt="${getProductName(product)}"
      >

      <div>
        <h3>${getProductName(product)}</h3>
        <div class="compatible-badge">✓ Compatibility Verified</div>
        ${renderIncludes(product.Includes)}
        <p>For ${model.Brand} ${model.Model}</p>
        <a href="${getAmazonLink(product)}" target="_blank" rel="noopener">Buy on Amazon →</a>
      </div>
    </div>
  `;
}

function renderCompatible(model) {
  const products = getProductsForModel(model.Model);

  return `
    <div class="model-confirm fade-in">
      <div class="model-confirm__badge">✓ Model Found</div>
      <h2>${model.Brand} ${model.Model}</h2>
      <p>${products.length} compatible products found</p>
    </div>

    <h2 class="results-title">Compatible Products</h2>

    ${products.map(product => renderProductCard(product, model)).join("")}
  `;
}

function renderNotSupported(input) {
  return `
    <div class="not-supported fade-in">
      Sorry, this model is currently not supported.<br>
      <span style="font-size:16px;font-weight:500;">Searched model: ${input}</span>
    </div>
  `;
}

function logSearch(searchTerm, matchedModel) {
  const productsFound = matchedModel
    ? getProductsForModel(matchedModel.Model).length
    : 0;

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      country: getAmazonCountry(),
      language: userLocale,
      device: getDeviceType(),
      searchTerm: searchTerm,
      matchedModel: matchedModel ? matchedModel.Model : "",
      status: matchedModel ? "Matched" : "Not Found",
      productsFound: productsFound
    })
  }).catch(error => {
    console.warn("Search log failed:", error);
  });
}

function runSearch(searchTerm, resultBox) {
  const matchedModel = findModel(searchTerm);

  resultBox.innerHTML = matchedModel
    ? renderCompatible(matchedModel)
    : renderNotSupported(searchTerm);

  logSearch(searchTerm, matchedModel);
}

function renderSuggestions(models, suggestionsBox, input, resultBox) {
  if (!models.length) {
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
    return;
  }

  suggestionsBox.innerHTML = models.map(model => `
    <button type="button" class="suggestion-item" data-model="${model.Model}">
      <span>${model.Model}</span>
      <small>${model.Brand}</small>
    </button>
  `).join("");

  suggestionsBox.style.display = "block";

  suggestionsBox.querySelectorAll(".suggestion-item").forEach(button => {
    button.addEventListener("click", function () {
      const modelName = this.dataset.model;
      input.value = modelName;
      suggestionsBox.innerHTML = "";
      suggestionsBox.style.display = "none";
      runSearch(modelName, resultBox);
    });
  });
}

async function init() {
  const form = document.querySelector(".search-form");
  const input = document.querySelector("#model-search");
  const resultBox = document.querySelector("#results");

  resultBox.innerHTML = "";

  await loadDatabase();

  const suggestionsBox = document.createElement("div");
  suggestionsBox.className = "suggestions-box";
  input.closest(".search-form").appendChild(suggestionsBox);

  input.addEventListener("input", function () {
    const suggestions = getSuggestions(input.value);
    renderSuggestions(suggestions, suggestionsBox, input, resultBox);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const userInput = input.value.trim();
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";

    if (!userInput) {
      resultBox.innerHTML = `<div class="not-supported fade-in">Please enter your robot vacuum model.</div>`;
      return;
    }

    runSearch(userInput, resultBox);
  });

  document.addEventListener("click", function (event) {
    if (!form.contains(event.target)) {
      suggestionsBox.innerHTML = "";
      suggestionsBox.style.display = "none";
    }
  });
}

init();