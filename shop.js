// shop.js — loads real products from the Norza backend into Shop.html

let currentPage = 1;
let currentKeyword = "";
const LIMIT = 12;

function starsHtml() {
  return Array(5)
    .fill('<i data-lucide="star" fill="gold" stroke-width="0"></i>')
    .join("");
}

function productCardHtml(p) {
  const img = encodeURI(p.image);
  return `
    <div class="col-lg-3 col-md-6 col-12">
      <div class="product text-center">
        <img class="img-fluid mb-3" src="${img}" alt="${p.name}">
        <div class="star">${starsHtml()}</div>
        <h5 class="p-name">${p.name}</h5>
        <h4 class="p-price">$${p.finalPrice.toFixed(2)}</h4>
        <button class="buy-btn" data-id="${p._id}">Buy Now</button>
      </div>
    </div>
  `;
}

async function loadProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = `<p class="text-center w-100">Loading products...</p>`;

  try {
    const params = new URLSearchParams({ page: currentPage, limit: LIMIT });
    if (currentKeyword) params.set("keyword", currentKeyword);

    const data = await norzaApiFetch(`/products?${params.toString()}`);

    if (!data.products.length) {
      grid.innerHTML = `<p class="text-center w-100">No products found.</p>`;
      renderPagination(0);
      return;
    }

    grid.innerHTML = data.products.map(productCardHtml).join("");
    renderPagination(data.pages);

    if (window.lucide) lucide.createIcons();
    attachBuyButtons();
  } catch (err) {
    grid.innerHTML = `<p class="text-center w-100">Couldn't load products: ${err.message}</p>`;
  }
}

function renderPagination(pages) {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  if (pages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let html = `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <a href="#" class="page-link" data-page="${currentPage - 1}">Previous</a>
    </li>`;

  for (let i = 1; i <= pages; i++) {
    html += `<li class="page-item ${i === currentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>`;
  }

  html += `<li class="page-item ${currentPage === pages ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
    </li>`;

  pagination.innerHTML = html;

  pagination.querySelectorAll("[data-page]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = Number(link.dataset.page);
      if (page < 1 || page > pages) return;
      currentPage = page;
      loadProducts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function attachBuyButtons() {
  document.querySelectorAll(".buy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!NorzaAuth.isLoggedIn()) {
        window.location.href = "login.html?redirect=Shop.html";
        return;
      }

      const productId = btn.dataset.id;
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Adding...";

      try {
        await norzaApiFetch("/cart/items", {
          method: "POST",
          body: JSON.stringify({ productId, quantity: 1 }),
        });
        btn.textContent = "Added ✓";
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 1200);
      } catch (err) {
        alert(err.message);
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  });
}

// --- Search dropdown ---
let searchTimeout;
function setupSearch() {
  const input = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  if (!input || !resultsBox) return;

  input.addEventListener("input", () => {
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
          resultsBox.innerHTML = `<div class="p-2">No matches</div>`;
        } else {
          resultsBox.innerHTML = data.products
            .map(
              (p) =>
                `<div class="p-2 search-result-item" data-id="${p._id}" style="cursor:pointer;">${p.name} — $${p.finalPrice.toFixed(2)}</div>`
            )
            .join("");
        }
        resultsBox.style.display = "block";

        resultsBox.querySelectorAll(".search-result-item").forEach((el) => {
          el.addEventListener("click", () => {
            currentKeyword = value;
            currentPage = 1;
            resultsBox.style.display = "none";
            loadProducts();
          });
        });
      } catch (err) {
        resultsBox.innerHTML = `<div class="p-2">Search failed</div>`;
        resultsBox.style.display = "block";
      }
    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!resultsBox.contains(e.target) && e.target !== input) {
      resultsBox.style.display = "none";
    }
  });
}

// --- Account link in nav ---
function setupAccountLink() {
  const accountLi = document.getElementById("accountNavItem");
  if (!accountLi) return;

  if (NorzaAuth.isLoggedIn()) {
    const user = NorzaAuth.getUser();
    const adminLink = user.role === "admin" ? `<a class="nav-link" href="admin.html">Admin</a>` : "";
    accountLi.innerHTML = `
      ${adminLink}
      <a class="nav-link" href="#" id="logoutLink">Hi, ${user.name.split(" ")[0]} (Logout)</a>
    `;
    document.getElementById("logoutLink").addEventListener("click", (e) => {
      e.preventDefault();
      NorzaAuth.logout();
    });
  } else {
    accountLi.innerHTML = `<a class="nav-link" href="login.html">Login</a>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupAccountLink();
  setupSearch();
  loadProducts();
});
