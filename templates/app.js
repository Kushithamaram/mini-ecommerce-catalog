const API = "/api/products";

const els = {
  addForm: document.getElementById("addForm"),
  name: document.getElementById("name"),
  category: document.getElementById("category"),
  price: document.getElementById("price"),
  stock: document.getElementById("stock"),
  description: document.getElementById("description"),
  addMsg: document.getElementById("addMsg"),

  search: document.getElementById("search"),
  filterCategory: document.getElementById("filterCategory"),
  sort: document.getElementById("sort"),
  btnRefresh: document.getElementById("btnRefresh"),

  tbody: document.getElementById("tbody"),
  emptyState: document.getElementById("emptyState"),

  editDialog: document.getElementById("editDialog"),
  editForm: document.getElementById("editForm"),
  editId: document.getElementById("editId"),
  editName: document.getElementById("editName"),
  editCategory: document.getElementById("editCategory"),
  editPrice: document.getElementById("editPrice"),
  editStock: document.getElementById("editStock"),
  editDescription: document.getElementById("editDescription"),
  editMsg: document.getElementById("editMsg"),
  btnSaveEdit: document.getElementById("btnSaveEdit"),
};

async function fetchProducts() {
  const q = encodeURIComponent(els.search.value.trim());
  const cat = encodeURIComponent(els.filterCategory.value.trim());
  const sort = encodeURIComponent(els.sort.value);
  const url = `${API}?q=${q}&category=${cat}&sort=${sort}`;
  const res = await fetch(url);
  const data = await res.json();
  renderTable(data);
}

function renderTable(items) {
  els.tbody.innerHTML = "";
  if (!items.length) {
    els.emptyState.style.display = "block";
    return;
  }
  els.emptyState.style.display = "none";

  items.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="category">${escapeHtml(p.category || "—")}</div>
      </td>
      <td>${escapeHtml(p.description || "")}</td>
      <td class="right">${Number(p.price).toLocaleString()}</td>
      <td class="right">${p.stock_quantity}</td>
      <td class="center actions">
        <button class="btn small" data-edit="${p.id}">Edit</button>
        <button class="btn danger small" data-del="${p.id}">Delete</button>
      </td>
    `;
    els.tbody.appendChild(tr);
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// --- Add Product ---
els.addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.addMsg.textContent = "";

  const payload = {
    name: els.name.value.trim(),
    category: els.category.value.trim(),
    price: els.price.value,
    stock_quantity: els.stock.value,
    description: els.description.value.trim(),
  };

  if (!payload.name) return (els.addMsg.textContent = "Name is required");
  if (Number(payload.price) <= 0) return (els.addMsg.textContent = "Price must be > 0");
  if (Number(payload.stock_quantity) < 0) return (els.addMsg.textContent = "Stock must be ≥ 0");

  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    els.addMsg.textContent = data.error || "Failed to add product";
    return;
  }
  els.addForm.reset();
  els.addMsg.textContent = `Added "${data.name}" (ID ${data.id})`;
  fetchProducts();
});

// --- Table actions (Edit/Delete) ---
els.tbody.addEventListener("click", async (e) => {
  const editId = e.target.getAttribute("data-edit");
  const delId = e.target.getAttribute("data-del");

  if (editId) {
    // load and open dialog
    const res = await fetch(`${API}/${editId}`);
    if (!res.ok) return;
    const p = await res.json();
    openEditDialog(p);
  }

  if (delId) {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`${API}/${delId}`, { method: "DELETE" });
    if (res.ok) fetchProducts();
  }
});

function openEditDialog(p) {
  els.editId.value = p.id;
  els.editName.value = p.name;
  els.editCategory.value = p.category || "";
  els.editPrice.value = p.price;
  els.editStock.value = p.stock_quantity;
  els.editDescription.value = p.description || "";
  els.editMsg.textContent = "";
  if (typeof els.editDialog.showModal === "function") {
    els.editDialog.showModal();
  } else {
    // fallback for older browsers
    els.editDialog.setAttribute("open", "open");
  }
}

els.btnSaveEdit.addEventListener("click", async (e) => {
  e.preventDefault();
  const id = els.editId.value;
  const payload = {
    name: els.editName.value.trim(),
    category: els.editCategory.value.trim(),
    price: els.editPrice.value,
    stock_quantity: els.editStock.value,
    description: els.editDescription.value.trim(),
  };

  if (!payload.name) return (els.editMsg.textContent = "Name is required");
  if (Number(payload.price) <= 0) return (els.editMsg.textContent = "Price must be > 0");
  if (Number(payload.stock_quantity) < 0) return (els.editMsg.textContent = "Stock must be ≥ 0");

  const res = await fetch(`${API}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    els.editMsg.textContent = data.error || "Update failed";
    return;
  }
  closeEditDialog();
  fetchProducts();
});

function closeEditDialog() {
  if (typeof els.editDialog.close === "function") els.editDialog.close();
  else els.editDialog.removeAttribute("open");
}

// --- Search/filter/refresh ---
[els.search, els.filterCategory, els.sort].forEach((el) =>
  el.addEventListener("input", debounce(fetchProducts, 250))
);
els.btnRefresh.addEventListener("click", fetchProducts);

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

// initial load
fetchProducts();
console.log("app.js is loaded ✅");

els.addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = els.addForm.name.value;
  const description = els.addForm.description.value;
  const price = parseFloat(els.addForm.price.value);
  const stock = parseInt(els.addForm.stock.value);

  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, price, stock_quantity: stock }),
  });

  if (res.ok) {
    console.log("✅ Product added");
    els.addForm.reset();
    loadProducts();   
  } else {
    console.error("❌ Failed to add product");
  }
});
