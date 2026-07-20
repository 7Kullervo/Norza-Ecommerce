// cart.js — loads the real cart from the backend, wires quantity/remove/checkout

async function loadCart() {
  const tbody = document.getElementById("cartBody");
  const emptyMsg = document.getElementById("emptyCartMsg");
  const cartTable = document.getElementById("cartTableWrapper");

  if (!NorzaAuth.isLoggedIn()) {
    cartTable.style.display = "none";
    emptyMsg.style.display = "block";
    emptyMsg.innerHTML = `Please <a href="login.html?redirect=cart.html">log in</a> to view your cart.`;
    document.getElementById("cartBottom").style.display = "none";
    return;
  }

  try {
    const data = await norzaApiFetch("/cart");
    const items = data.cart.items;

    if (!items.length) {
      cartTable.style.display = "none";
      emptyMsg.style.display = "block";
      emptyMsg.innerHTML = `Your cart is empty. <a href="Shop.html">Go shopping</a>.`;
      document.getElementById("cartBottom").style.display = "none";
      return;
    }

    cartTable.style.display = "block";
    emptyMsg.style.display = "none";
    document.getElementById("cartBottom").style.display = "flex";

    tbody.innerHTML = items
      .map(
        (item) => `
      <tr data-product-id="${item.product}">
        <td><img src="${encodeURI(item.image)}" alt="${item.name}" class="cart-img"></td>
        <td class="product-name">${item.name}</td>
        <td class="d-none d-md-table-cell">$${item.price.toFixed(2)}</td>
        <td>
          <div class="quantity-control">
            <input type="number" value="${item.quantity}" min="1" class="qty-input" data-product-id="${item.product}">
          </div>
        </td>
        <td class="d-none d-md-table-cell">
          <i class="far fa-trash-alt remove-item" data-product-id="${item.product}" style="cursor:pointer;"></i>
        </td>
        <td class="line-total">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    updateTotals(data.cart.subtotal);
    attachRowEvents();
  } catch (err) {
    cartTable.style.display = "none";
    emptyMsg.style.display = "block";
    emptyMsg.textContent = `Couldn't load your cart: ${err.message}`;
  }
}

function updateTotals(subtotal) {
  const shipping = subtotal > 100 ? 0 : 10;
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = +(subtotal + shipping + tax).toFixed(2);

  document.getElementById("subtotalCell").textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById("shippingCell").textContent = `$${shipping.toFixed(2)}`;
  document.getElementById("taxCell").textContent = `$${tax.toFixed(2)}`;
  document.getElementById("totalCell").textContent = `$${total.toFixed(2)}`;
}

function attachRowEvents() {
  document.querySelectorAll(".qty-input").forEach((input) => {
    input.addEventListener("change", async () => {
      const productId = input.dataset.productId;
      const quantity = Math.max(1, Number(input.value));
      input.value = quantity;

      try {
        const data = await norzaApiFetch(`/cart/items/${productId}`, {
          method: "PUT",
          body: JSON.stringify({ quantity }),
        });
        const row = input.closest("tr");
        const item = data.cart.items.find((i) => i.product === productId);
        if (item) {
          row.querySelector(".line-total").textContent = `$${(item.price * item.quantity).toFixed(2)}`;
        }
        updateTotals(data.cart.subtotal);
      } catch (err) {
        alert(err.message);
      }
    });
  });

  document.querySelectorAll(".remove-item").forEach((icon) => {
    icon.addEventListener("click", async () => {
      const productId = icon.dataset.productId;
      try {
        await norzaApiFetch(`/cart/items/${productId}`, { method: "DELETE" });
        loadCart();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

// --- Checkout flow ---
function setupCheckout() {
  const checkoutBtn = document.getElementById("checkoutBtn");
  const form = document.getElementById("shippingForm");

  checkoutBtn.addEventListener("click", () => {
    if (!NorzaAuth.isLoggedIn()) {
      window.location.href = "login.html?redirect=cart.html";
      return;
    }
    const modal = new bootstrap.Modal(document.getElementById("shippingModal"));
    modal.show();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("placeOrderBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Placing order...";

    const shippingAddress = {
      fullName: document.getElementById("shipFullName").value.trim(),
      line1: document.getElementById("shipLine1").value.trim(),
      city: document.getElementById("shipCity").value.trim(),
      postalCode: document.getElementById("shipPostal").value.trim(),
      country: document.getElementById("shipCountry").value.trim(),
      phone: document.getElementById("shipPhone").value.trim(),
    };

    try {
      const orderData = await norzaApiFetch("/orders", {
        method: "POST",
        body: JSON.stringify({ shippingAddress, paymentMethod: "stripe" }),
      });

      const sessionData = await norzaApiFetch("/payments/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ orderId: orderData.order._id }),
      });

      window.location.href = sessionData.url;
    } catch (err) {
      alert(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Place Order & Pay";
    }
  });
}

function setupAccountLink() {
  const accountLi = document.getElementById("accountNavItem");
  if (!accountLi) return;

  if (NorzaAuth.isLoggedIn()) {
    const user = NorzaAuth.getUser();
    const adminLink = user.role === "admin" ? `<a class="nav-link" href="admin.html">Admin</a>` : "";
    accountLi.innerHTML = `${adminLink}<a class="nav-link" href="#" id="logoutLink">Hi, ${user.name.split(" ")[0]} (Logout)</a>`;
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
  setupCheckout();
  loadCart();
});
