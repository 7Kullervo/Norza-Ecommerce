// index.js — makes the homepage's Buy Now buttons and search bar fully functional
// by matching the hardcoded product cards to real products from the backend.

async function wireUpBuyButtons() {
  let products;
  try {
    const data = await norzaApiFetch("/products?limit=100");
    products = data.products;
  } catch (err) {
    console.error("Could not load products to wire up Buy Now buttons:", err.message);
    return;
  }

  // Build a lookup by exact product name (case-insensitive, trimmed).
  const byName = {};
  products.forEach((p) => {
    byName[p.name.trim().toLowerCase()] = p;
  });

  document.querySelectorAll(".product").forEach((card) => {
    const nameEl = card.querySelector(".p-name");
    const btn = card.querySelector(".buy-btn");
    if (!nameEl || !btn) return;

    const name = nameEl.textContent.trim().toLowerCase();
    const product = byName[name];

    if (!product) {
      // No matching product found in the database — leave the button as-is,
      // but note it in the console so it's easy to spot during testing.
      console.warn(`No matching product found for "${nameEl.textContent.trim()}"`);
      return;
    }

    btn.dataset.id = product._id;
    btn.addEventListener("click", () => {
      window.location.href = `singprod.html?id=${product._id}`;
    });
  });
}

// --- Live search (replaces the old hardcoded 7-item search script) ---
let searchTimeout;
function setupLiveSearch() {
  const input = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  if (!input || !resultsBox) return;

  input.addEventListener("keyup", () => {
    clearTimeout(searchTimeout);
    const value = input.value.trim();

    if (!value) {
      resultsBox.innerHTML = "";
      resultsBox.style.display = "none";
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const data = await norzaApiFetch(
          `/products?keyword=${encodeURIComponent(value)}&limit=6`
        );

        if (!data.products.length) {
          resultsBox.innerHTML = `<div style="padding:10px;">No products found</div>`;
        } else {
          resultsBox.innerHTML = data.products
            .map(
              (p) => `
              <a href="Shop.html?keyword=${encodeURIComponent(p.name)}" class="search-item">
                <img src="${encodeURI(p.image)}" alt="${p.name}">
                <span>${p.name} — $${p.finalPrice.toFixed(2)}</span>
              </a>`
            )
            .join("");
        }
        resultsBox.style.display = "block";
      } catch (err) {
        resultsBox.innerHTML = `<div style="padding:10px;">Search failed</div>`;
        resultsBox.style.display = "block";
      }
    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      resultsBox.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireUpBuyButtons();
  setupLiveSearch();
});
