// singprod.js — powers singprod.html for ANY product automatically.
// The page reads ?id=<productId> from the URL and fetches that product's
// real data from the backend, so no page needs to be created manually —
// this one template works for every product that exists now or gets added later.

function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function starsHtml(rating) {
  const rounded = Math.round(rating || 0);
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<i data-lucide="star" fill="${i <= rounded ? "gold" : "none"}" stroke="gold" stroke-width="1"></i>`;
  }
  return html;
}

let currentProduct = null;

async function loadProduct() {
  const id = getProductId();

  if (!id) {
    document.getElementById("productContent").innerHTML =
      `<div class="container py-5 text-center"><h4>No product specified.</h4><a href="Shop.html">Back to Shop</a></div>`;
    return;
  }

  try {
    const data = await norzaApiFetch(`/products/${id}`);
    currentProduct = data.product;
    renderProduct(currentProduct);
    loadReviews(id);
    loadRelated(currentProduct);
  } catch (err) {
    document.getElementById("productContent").innerHTML =
      `<div class="container py-5 text-center"><h4>Product not found.</h4><p>${err.message}</p><a href="Shop.html">Back to Shop</a></div>`;
  }
}

function renderProduct(p) {
  document.title = `${p.name} | Norza`;

  document.getElementById("MainImg").src = encodeURI(p.image);
  document.getElementById("prodCategory").textContent =
    p.category.charAt(0).toUpperCase() + p.category.slice(1);
  document.getElementById("prodName").textContent = p.name;
  document.getElementById("prodPrice").textContent = `$${p.finalPrice.toFixed(2)}`;
  document.getElementById("prodDescription").textContent =
    p.description || "No description available for this product yet.";
  document.getElementById("ratingStars").innerHTML = starsHtml(p.rating);
  document.getElementById("reviewCountText").textContent =
    p.numReviews > 0 ? `${p.rating.toFixed(1)} out of 5 (${p.numReviews} review${p.numReviews === 1 ? "" : "s"})` : "No reviews yet";

  const stockText = document.getElementById("stockText");
  const addBtn = document.getElementById("addToCartBtn");
  if (p.stock > 0) {
    stockText.textContent = p.stock <= 5 ? `Only ${p.stock} left in stock` : "In stock";
    addBtn.disabled = false;
    addBtn.textContent = "Add to Cart";
  } else {
    stockText.textContent = "Out of stock";
    addBtn.disabled = true;
    addBtn.textContent = "Out of Stock";
  }

  // --- Image gallery: only show thumbnails/arrows when there's more than one image ---
  const images = (p.images && p.images.length ? p.images : [p.image]).slice(0, 4);
  let currentIndex = 0;

  const mainImg = document.getElementById("MainImg");
  const thumbGroup = document.getElementById("thumbnailGroup");
  const prevBtn = document.getElementById("prevImgBtn");
  const nextBtn = document.getElementById("nextImgBtn");

  function showImage(index) {
    currentIndex = (index + images.length) % images.length;
    mainImg.src = encodeURI(images[currentIndex]);
    thumbGroup.querySelectorAll(".small-img").forEach((t, i) => {
      t.classList.toggle("active-thumb", i === currentIndex);
    });
  }

  if (images.length > 1) {
    thumbGroup.style.display = "flex";
    thumbGroup.innerHTML = images
      .map((img, i) => `
        <div class="small-img-col">
          <img class="small-img img-fluid" src="${encodeURI(img)}" alt="${p.name}">
        </div>`)
      .join("");

    thumbGroup.querySelectorAll(".small-img").forEach((thumb, i) => {
      thumb.addEventListener("click", () => showImage(i));
    });

    prevBtn.style.display = "flex";
    nextBtn.style.display = "flex";
    prevBtn.onclick = () => showImage(currentIndex - 1);
    nextBtn.onclick = () => showImage(currentIndex + 1);
  } else {
    thumbGroup.style.display = "none";
    thumbGroup.innerHTML = "";
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
  }

  showImage(0);
  if (window.lucide) lucide.createIcons();

  addBtn.addEventListener("click", async () => {
    if (!NorzaAuth.isLoggedIn()) {
      window.location.href = `login.html?redirect=singprod.html?id=${p._id}`;
      return;
    }

    const quantity = Math.max(1, Number(document.getElementById("qtyInput").value) || 1);
    const originalText = addBtn.textContent;
    addBtn.disabled = true;
    addBtn.textContent = "Adding...";

    try {
      await norzaApiFetch("/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: p._id, quantity }),
      });
      addBtn.textContent = "Added ✓";
      setTimeout(() => {
        addBtn.textContent = originalText;
        addBtn.disabled = false;
      }, 1200);
    } catch (err) {
      alert(err.message);
      addBtn.textContent = originalText;
      addBtn.disabled = false;
    }
  });
}

async function loadReviews(productId) {
  const list = document.getElementById("reviewsList");
  try {
    const data = await norzaApiFetch(`/products/${productId}/reviews`);
    list.innerHTML = data.reviews.length
      ? data.reviews
          .map(
            (r) => `
        <div class="review-item">
          <div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
          <strong>${r.name}</strong>
          <p class="mb-0">${r.comment}</p>
        </div>`
          )
          .join("")
      : `<p class="text-muted">No reviews yet — be the first to review this product.</p>`;
  } catch (err) {
    list.innerHTML = `<p class="text-muted">Couldn't load reviews.</p>`;
  }

  const formWrapper = document.getElementById("reviewFormWrapper");
  const loginPrompt = document.getElementById("reviewLoginPrompt");
  if (NorzaAuth.isLoggedIn()) {
    formWrapper.style.display = "block";
    loginPrompt.style.display = "none";
  } else {
    formWrapper.style.display = "none";
    loginPrompt.style.display = "block";
  }
}

document.getElementById("reviewForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("reviewSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const rating = Number(document.getElementById("reviewRating").value);
  const comment = document.getElementById("reviewComment").value.trim();
  const id = getProductId();

  try {
    await norzaApiFetch(`/products/${id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    });
    document.getElementById("reviewComment").value = "";
    loadReviews(id);
    loadProduct(); // refresh star rating average
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Review";
  }
});

async function loadRelated(product) {
  const grid = document.getElementById("relatedGrid");
  try {
    const data = await norzaApiFetch(`/products?category=${product.category}&limit=5`);
    const related = data.products.filter((p) => p._id !== product._id).slice(0, 4);

    grid.innerHTML = related.length
      ? related
          .map(
            (p) => `
        <div class="col-lg-3 col-md-6 col-12">
          <div class="product text-center" style="cursor:pointer;" onclick="window.location.href='singprod.html?id=${p._id}';">
            <img class="img-fluid mb-3" src="${encodeURI(p.image)}" alt="${p.name}">
            <div class="star">${starsHtml(p.rating)}</div>
            <h5 class="p-name">${p.name}</h5>
            <h4 class="p-price">$${p.finalPrice.toFixed(2)}</h4>
            <button class="buy-btn" data-id="${p._id}">Buy Now</button>
          </div>
        </div>`
          )
          .join("")
      : `<p class="text-center w-100">No related products found.</p>`;

    if (window.lucide) lucide.createIcons();

    grid.querySelectorAll(".buy-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = `singprod.html?id=${btn.dataset.id}`;
      });
    });
  } catch (err) {
    grid.innerHTML = `<p class="text-center w-100">Couldn't load related products.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadProduct);
