let currentSelectedItem = null;
let allItemsCache = [];

const donationsGrid = document.getElementById('donationsGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const cityFilter = document.getElementById('cityFilter');

const donateModal = document.getElementById('donateModal');
const requestModal = document.getElementById('requestModal');
const supabaseModal = document.getElementById('supabaseModal');

document.addEventListener('DOMContentLoaded', async () => {
  allItemsCache = await fetchDonations();
  renderDonations();
  setupEventListeners();
});

function renderDonations() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedCat = categoryFilter.value;
  const selectedCity = cityFilter.value;

  const filtered = allItemsCache.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm) || 
                          (item.description && item.description.toLowerCase().includes(searchTerm));
    const matchesCat = selectedCat === 'all' || item.category === selectedCat;
    const matchesCity = selectedCity === 'all' || item.city.toLowerCase().includes(selectedCity.toLowerCase());
    return matchesSearch && matchesCat && matchesCity;
  });

  if (filtered.length === 0) {
    donationsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-box-open"></i>
        <p style="color: #475569; font-weight: 600;">No se encontraron donaciones con los filtros seleccionados.</p>
      </div>
    `;
    return;
  }

  donationsGrid.innerHTML = filtered.map(item => `
    <div class="donation-card">
      <div class="card-body">
        <div class="card-header-top">
          <span class="category-tag">${item.category}</span>
          <span class="location-text"><i class="fa-solid fa-location-dot"></i> ${item.city}</span>
        </div>

        <div class="card-title-area">
          <h3>${item.title}</h3>
          <p>Cantidad: <span>${item.quantity}</span></p>
        </div>

        ${item.expiry_date ? `
          <div class="expiry-badge">
            <i class="fa-solid fa-calendar-day"></i> Vence: ${item.expiry_date}
          </div>
        ` : ''}

        <p class="card-desc">${item.description || 'Sin descripción adicional.'}</p>
      </div>

      <div class="card-footer">
        <span>Disponible</span>
        <button data-id="${item.id}" class="btn-primary btn-request-item">
          <i class="fa-solid fa-hand-holding-heart"></i> Solicitar / Contactar
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.btn-request-item').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      currentSelectedItem = allItemsCache.find(i => i.id.toString() === id.toString());
      if (currentSelectedItem) openRequestModal(currentSelectedItem);
    };
  });
}

function openRequestModal(item) {
  document.getElementById('reqItemTitle').innerText = item.title;
  document.getElementById('chkPrescription').checked = false;
  document.getElementById('chkNoCommercial').checked = false;
  
  const btnConfirm = document.getElementById('btnConfirmWhatsApp');
  btnConfirm.disabled = true;
  btnConfirm.className = "btn-disabled";

  requestModal.classList.remove('hidden');
}

function setupEventListeners() {
  searchInput.addEventListener('input', renderDonations);
  categoryFilter.addEventListener('change', renderDonations);
  cityFilter.addEventListener('change', renderDonations);

  document.getElementById('btnOpenDonateModal').onclick = () => donateModal.classList.remove('hidden');
  document.getElementById('btnCloseDonateModal').onclick = () => donateModal.classList.add('hidden');
  document.getElementById('btnCancelDonate').onclick = () => donateModal.classList.add('hidden');

  document.getElementById('btnCancelRequest').onclick = () => requestModal.classList.add('hidden');

  document.getElementById('btnOpenSupabaseModal').onclick = () => supabaseModal.classList.remove('hidden');
  document.getElementById('btnCloseSupabaseModal').onclick = () => supabaseModal.classList.add('hidden');

  const chk1 = document.getElementById('chkPrescription');
  const chk2 = document.getElementById('chkNoCommercial');
  const btnConfirm = document.getElementById('btnConfirmWhatsApp');

  const validateChecks = () => {
    if (chk1.checked && chk2.checked) {
      btnConfirm.disabled = false;
      btnConfirm.className = "btn-success";
      btnConfirm.style.width = "100%";
      btnConfirm.style.padding = "0.75rem";
    } else {
      btnConfirm.disabled = true;
      btnConfirm.className = "btn-disabled";
    }
  };

  chk1.onchange = validateChecks;
  chk2.onchange = validateChecks;

  btnConfirm.onclick = () => {
    if (!currentSelectedItem) return;
    const phone = currentSelectedItem.phone.replace(/\D/g, '');
    const message = `Hola, vi tu publicación en VitalDonaciones de *${currentSelectedItem.title}* (${currentSelectedItem.quantity}) en ${currentSelectedItem.city}. Cuento con fórmula médica vigente y me gustaría coordinar la recepción de la donación.`;
    
    window.open(`https://wa.me/57${phone}?text=${encodeURIComponent(message)}`, '_blank');
    requestModal.classList.add('hidden');
  };

  document.getElementById('donationForm').onsubmit = async (e) => {
    e.preventDefault();
    
    const newItem = {
      title: document.getElementById('itemTitle').value,
      category: document.getElementById('itemCategory').value,
      quantity: document.getElementById('itemQuantity').value,
      expiry_date: document.getElementById('itemExpiry').value || null,
      city: document.getElementById('itemCity').value,
      phone: document.getElementById('itemPhone').value,
      description: document.getElementById('itemDescription').value,
      created_at: new Date().toISOString()
    };

    await saveDonation(newItem);
    allItemsCache = await fetchDonations();

    donateModal.classList.add('hidden');
    document.getElementById('donationForm').reset();
    renderDonations();
  };

  document.getElementById('btnSaveSupabaseConfig').onclick = () => {
    const url = document.getElementById('supabaseUrlInput').value.trim();
    const key = document.getElementById('supabaseKeyInput').value.trim();
    
    if (url && key) {
      localStorage.setItem('VITAL_SUPABASE_URL', url);
      localStorage.setItem('VITAL_SUPABASE_KEY', key);
      supabaseModal.classList.add('hidden');
      location.reload();
    }
  };
}