// admin.js — powers the Norza admin dashboard

// --- Guard: must be logged in AND an admin ---
if (!NorzaAuth.isLoggedIn()) {
  window.location.href = "login.html?redirect=admin.html";
} else if (NorzaAuth.getUser().role !== "admin") {
  alert("This page is for admins only.");
  window.location.href = "Shop.html";
}

document.getElementById("adminName").textContent = NorzaAuth.getUser()
  ? `Logged in as ${NorzaAuth.getUser().name}`
  : "";
document.getElementById("logoutLink").addEventListener("click", (e) => {
  e.preventDefault();
  NorzaAuth.logout();
});

// --- Instructions shown per tab ---
const INSTRUCTIONS = {
  dashboard: `
    <h5>📊 Dashboard</h5>
    <ul>
      <li>This page shows a quick snapshot of your store: total customers, products, orders, and revenue from paid orders.</li>
      <li>The <strong>Low Stock</strong> table lists any product with 5 or fewer left — restock these soon by editing them in the Products tab.</li>
      <li>Numbers update every time you reload this page.</li>
    </ul>
  `,
  products: `
    <h5>🛍️ Products</h5>
    <ul>
      <li>Click <strong>+ Add Product</strong> to create a new item. Fill in name, price, category, an image link, and stock — all required except description.</li>
      <li>For the image, paste a direct link to an image (e.g. one already on your site under <code>images/...</code>, or any public image URL).</li>
      <li>Click <strong>Edit</strong> next to any product to change its price, stock, or details.</li>
      <li>Click <strong>Delete</strong> to remove a product from the shop. This doesn't erase it permanently — it just hides it from customers.</li>
      <li>Stock automatically goes down when a customer orders, so keep an eye on the Dashboard's low-stock list.</li>
    </ul>
  `,
  orders: `
    <h5>📦 Orders</h5>
    <ul>
      <li>This lists every order placed on the site, newest first.</li>
      <li><strong>Paid</strong> shows whether Stripe has confirmed payment.</li>
      <li>Use the <strong>Status</strong> dropdown on each order to move it forward: Processing → Shipped → Delivered. Change this as you actually pack and ship items.</li>
      <li>Selecting <strong>Cancelled</strong> stops the order — use this only if you can't fulfill it.</li>
    </ul>
  `,
  users: `
    <h5>👤 Users</h5>
    <ul>
      <li>This lists every customer account, plus admins.</li>
      <li>Click <strong>Make Admin</strong> to give someone dashboard access like yours. Only do this for people you trust.</li>
      <li>Click <strong>Deactivate</strong> to block a user from logging in (e.g. for abuse). Click <strong>Activate</strong> to restore them.</li>
    </ul>
  `,
  messages: `
    <h5>✉️ Contact Messages</h5>
    <ul>
      <li>These are messages submitted through the site's Contact Us form.</li>
      <li>Click <strong>Mark Read</strong> once you've replied or handled it (you'll need to email them back yourself — this dashboard doesn't send emails).</li>
    </ul>
  `,
};

function setInstructions(tab) {
  document.getElementById("instructionsBox").innerHTML = INSTRUCTIONS[tab] || "";
}

// --- Tab switching ---
document.querySelectorAll(".admin-nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-nav button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-content").forEach((el) => (el.style.display = "none"));
    document.getElementById(`tab-${tab}`).style.display = "block";
    setInstructions(tab);

    if (tab === "dashboard") loadDashboard();
    if (tab === "products") loadProducts();
    if (tab === "orders") loadOrders();
    if (tab === "users") loadUsers();
    if (tab === "messages") loadMessages();
  });
});

// --- Dashboard ---
async function loadDashboard() {
  try {
    const data = await norzaApiFetch("/admin/dashboard");
    const s = data.stats;
    document.getElementById("statCards").innerHTML = `
      <div class="stat-card"><div class="label">Customers</div><div class="value">${s.userCount}</div></div>
      <div class="stat-card"><div class="label">Products</div><div class="value">${s.productCount}</div></div>
      <div class="stat-card"><div class="label">Orders</div><div class="value">${s.orderCount}</div></div>
      <div class="stat-card"><div class="label">Revenue</div><div class="value">$${s.totalRevenue.toFixed(2)}</div></div>
    `;
    const tbody = document.querySelector("#lowStockTable tbody");
    tbody.innerHTML = s.lowStockProducts.length
      ? s.lowStockProducts.map((p) => `<tr><td>${p.name}</td><td class="low-stock">${p.stock}</td></tr>`).join("")
      : `<tr><td colspan="2">Nothing low on stock right now.</td></tr>`;
  } catch (err) {
    alert("Failed to load dashboard: " + err.message);
  }
}

// --- Products ---
async function loadProducts() {
  const tbody = document.getElementById("productsTableBody");
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  try {
    const data = await norzaApiFetch("/products?limit=100");
    tbody.innerHTML = data.products
      .map(
        (p) => `
      <tr>
        <td><img src="${encodeURI(p.image)}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;"></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>${p.stock}</td>
        <td>
          <button class="btn btn-sm btn-outline-dark edit-product" data-id="${p._id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-product" data-id="${p._id}">Delete</button>
        </td>
      </tr>`
      )
      .join("");

    document.querySelectorAll(".edit-product").forEach((btn) =>
      btn.addEventListener("click", () => openProductModal(btn.dataset.id, data.products))
    );
    document.querySelectorAll(".delete-product").forEach((btn) =>
      btn.addEventListener("click", () => deleteProduct(btn.dataset.id))
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Failed to load: ${err.message}</td></tr>`;
  }
}

function openProductModal(id, products) {
  document.getElementById("productModalTitle").textContent = id ? "Edit Product" : "Add Product";
  document.getElementById("productId").value = id || "";

  if (id) {
    const p = products.find((x) => x._id === id);
    document.getElementById("pName").value = p.name;
    document.getElementById("pPrice").value = p.price;
    document.getElementById("pCategory").value = p.category;
    document.getElementById("pImage").value = p.image;
    document.getElementById("pStock").value = p.stock;
    document.getElementById("pDescription").value = p.description || "";
  } else {
    document.getElementById("productForm").reset();
  }

  new bootstrap.Modal(document.getElementById("productModal")).show();
}

document.getElementById("addProductBtn").addEventListener("click", () => openProductModal(null, []));

document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("productId").value;
  const saveBtn = document.getElementById("productSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const payload = {
    name: document.getElementById("pName").value.trim(),
    price: Number(document.getElementById("pPrice").value),
    category: document.getElementById("pCategory").value,
    image: document.getElementById("pImage").value.trim(),
    stock: Number(document.getElementById("pStock").value),
    description: document.getElementById("pDescription").value.trim(),
  };

  try {
    if (id) {
      await norzaApiFetch(`/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await norzaApiFetch("/products", { method: "POST", body: JSON.stringify(payload) });
    }
    bootstrap.Modal.getInstance(document.getElementById("productModal")).hide();
    loadProducts();
  } catch (err) {
    alert(err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
});

async function deleteProduct(id) {
  if (!confirm("Remove this product from the shop?")) return;
  try {
    await norzaApiFetch(`/products/${id}`, { method: "DELETE" });
    loadProducts();
  } catch (err) {
    alert(err.message);
  }
}

// --- Orders ---
async function loadOrders() {
  const tbody = document.getElementById("ordersTableBody");
  tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
  try {
    const data = await norzaApiFetch("/admin/orders?limit=50");
    tbody.innerHTML = data.orders
      .map(
        (o) => `
      <tr>
        <td>${o.orderNumber}</td>
        <td>${o.user ? o.user.name : "—"}</td>
        <td>$${o.totalPrice.toFixed(2)}</td>
        <td>${o.isPaid ? "✅" : "❌"}</td>
        <td>
          <select class="form-select form-select-sm status-select" data-id="${o._id}">
            ${["pending_payment", "processing", "shipped", "delivered", "cancelled"]
              .map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s.replace("_", " ")}</option>`)
              .join("")}
          </select>
        </td>
      </tr>`
      )
      .join("");

    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", async () => {
        try {
          await norzaApiFetch(`/admin/orders/${select.dataset.id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status: select.value }),
          });
        } catch (err) {
          alert(err.message);
          loadOrders();
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Failed to load: ${err.message}</td></tr>`;
  }
}

// --- Users ---
async function loadUsers() {
  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
  try {
    const data = await norzaApiFetch("/admin/users");
    tbody.innerHTML = data.users
      .map(
        (u) => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>${u.isActive ? "Active" : "Deactivated"}</td>
        <td>
          ${
            u.role === "admin"
              ? ""
              : `<button class="btn btn-sm btn-outline-dark make-admin" data-id="${u._id}">Make Admin</button>`
          }
          <button class="btn btn-sm ${u.isActive ? "btn-outline-danger" : "btn-outline-success"} toggle-active" data-id="${u._id}" data-active="${u.isActive}">
            ${u.isActive ? "Deactivate" : "Activate"}
          </button>
        </td>
      </tr>`
      )
      .join("");

    document.querySelectorAll(".make-admin").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm("Give this user admin access?")) return;
        await norzaApiFetch(`/admin/users/${btn.dataset.id}`, {
          method: "PUT",
          body: JSON.stringify({ role: "admin" }),
        });
        loadUsers();
      })
    );

    document.querySelectorAll(".toggle-active").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const isActive = btn.dataset.active === "true";
        await norzaApiFetch(`/admin/users/${btn.dataset.id}`, {
          method: "PUT",
          body: JSON.stringify({ isActive: !isActive }),
        });
        loadUsers();
      })
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Failed to load: ${err.message}</td></tr>`;
  }
}

// --- Messages ---
async function loadMessages() {
  const tbody = document.getElementById("messagesTableBody");
  tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
  try {
    const data = await norzaApiFetch("/contact");
    tbody.innerHTML = data.messages.length
      ? data.messages
          .map(
            (m) => `
      <tr>
        <td>${m.name}<br><small>${m.email}</small></td>
        <td>${m.subject || "—"}</td>
        <td style="max-width:280px;">${m.message}</td>
        <td>${m.isRead ? "✅" : "❌"}</td>
        <td>${m.isRead ? "" : `<button class="btn btn-sm btn-outline-dark mark-read" data-id="${m._id}">Mark Read</button>`}</td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="5">No messages yet.</td></tr>`;

    document.querySelectorAll(".mark-read").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await norzaApiFetch(`/contact/${btn.dataset.id}/read`, { method: "PUT" });
        loadMessages();
      })
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Failed to load: ${err.message}</td></tr>`;
  }
}

// --- Init ---
setInstructions("dashboard");
loadDashboard();
