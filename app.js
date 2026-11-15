// app.js - Lógica Principal de VitalDonaciones Colombia

// Estado de la Aplicación
let allItemsCache = [];
let currentSelectedItem = null;
let currentStatusItem = null;
let currentTypeFilter = 'all'; // 'all' | 'donacion' | 'solicitud'

// Elementos DOM
const donationsGrid = document.getElementById('donationsGrid');
const searchInput = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');
const categoryFilter = document.getElementById('categoryFilter');
const cityFilter = document.getElementById('cityFilter');
const statusFilter = document.getElementById('statusFilter');
const btnResetFilters = document.getElementById('btnResetFilters');
const resultsCount = document.getElementById('resultsCount');

// Modales
const publishModal = document.getElementById('publishModal');
const requestModal = document.getElementById('requestModal');
const statusModal = document.getElementById('statusModal');
const supabaseModal = document.getElementById('supabaseModal');

// Formulario de publicación
const publicationForm = document.getElementById('publicationForm');
const itemExpiry = document.getElementById('itemExpiry');
const expiryHelpText = document.getElementById('expiryHelpText');
const radioDonacion = document.getElementById('radioDonacion');
const radioSolicitud = document.getElementById('radioSolicitud');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  populateCityFilter();
  setupEventListeners();
  updateSupabaseStatusUI();
  await loadData();
});

// --------------------------------------------------------------------------
// Funciones de Datos y Estadísticas
// --------------------------------------------------------------------------
async function loadData() {
  resultsCount.textContent = 'Cargando datos...';
  allItemsCache = await fetchDonations();
  updateStatsAndTabs();
  renderDonations();
}

function updateStatsAndTabs() {
  const donations = allItemsCache.filter(i => i.type === 'donacion' && i.status === 'disponible');
  const requests = allItemsCache.filter(i => i.type === 'solicitud' && i.status === 'disponible');
  
  // Ciudades únicas
  const cities = new Set(allItemsCache.map(i => (i.city || '').trim().toLowerCase()).filter(Boolean));

  // Actualizar métricas del hero
  const statDonations = document.getElementById('statDonationsCount');
  const statRequests = document.getElementById('statRequestsCount');
  const statCities = document.getElementById('statCitiesCount');

  if (statDonations) statDonations.textContent = donations.length;
  if (statRequests) statRequests.textContent = requests.length;
  if (statCities) statCities.textContent = cities.size;

  // Actualizar contadores de pestañas
  const tabAllCount = document.getElementById('countTabAll');
  const tabDonationsCount = document.getElementById('countTabDonations');
  const tabRequestsCount = document.getElementById('countTabRequests');

  if (tabAllCount) tabAllCount.textContent = allItemsCache.length;
  if (tabDonationsCount) tabDonationsCount.textContent = allItemsCache.filter(i => i.type === 'donacion').length;
  if (tabRequestsCount) tabRequestsCount.textContent = allItemsCache.filter(i => i.type === 'solicitud').length;
}

// --------------------------------------------------------------------------
// Renderizado y Filtros
// --------------------------------------------------------------------------
function renderDonations() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedCat = categoryFilter.value;
  const selectedCity = cityFilter.value.toLowerCase();
  const selectedStatus = statusFilter.value;

  const filtered = allItemsCache.filter(item => {
    // Filtro por tipo de pestaña
    if (currentTypeFilter !== 'all' && item.type !== currentTypeFilter) {
      return false;
    }

    // Filtro por estado (disponible vs todos)
    if (selectedStatus === 'disponible' && item.status !== 'disponible') {
      return false;
    }

    // Filtro por categoría
    if (selectedCat !== 'all' && item.category !== selectedCat) {
      return false;
    }

    // Filtro por ciudad
    if (selectedCity !== 'all' && !item.city.toLowerCase().includes(selectedCity)) {
      return false;
    }

    // Búsqueda en texto (título, descripción, ciudad o categoría)
    if (searchTerm) {
      const matchTitle = item.title && item.title.toLowerCase().includes(searchTerm);
      const matchDesc = item.description && item.description.toLowerCase().includes(searchTerm);
      const matchCity = item.city && item.city.toLowerCase().includes(searchTerm);
      const matchCat = item.category && item.category.toLowerCase().includes(searchTerm);
      return matchTitle || matchDesc || matchCity || matchCat;
    }

    return true;
  });

  // Mostrar u ocultar botón de limpiar búsqueda
  if (btnClearSearch) {
    btnClearSearch.classList.toggle('hidden', !searchTerm);
  }

  // Actualizar etiqueta de resultados
  const plural = filtered.length === 1 ? 'publicación' : 'publicaciones';
  resultsCount.textContent = `Mostrando ${filtered.length} ${plural}`;

  if (filtered.length === 0) {
    donationsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-box-open"></i>
        <p>No se encontraron publicaciones con los filtros seleccionados.</p>
        <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.35rem;">
          Prueba cambiando la ciudad, categoría o limpiando los filtros.
        </p>
        <button id="btnEmptyReset" class="btn-primary" style="margin-top: 1rem;">
          <i class="fa-solid fa-rotate-left"></i> Restablecer Filtros
        </button>
      </div>
    `;
    const btnEmptyReset = document.getElementById('btnEmptyReset');
    if (btnEmptyReset) {
      btnEmptyReset.onclick = resetAllFilters;
    }
    return;
  }

  donationsGrid.innerHTML = filtered.map(item => {
    const isDonacion = item.type === 'donacion';
    const isDisponible = item.status === 'disponible';
    const expiryInfo = getExpiryInfo(item.expiry_date);

    return `
      <div class="donation-card ${!isDisponible ? 'item-completed' : ''}">
        <div class="card-body">
          <div class="card-header-top">
            <div class="badges-group">
              <span class="badge-type type-${escapeHTML(item.type)}">
                <i class="fa-solid ${isDonacion ? 'fa-hand-holding-heart' : 'fa-bullhorn'}"></i>
                ${isDonacion ? 'Donación' : 'Solicitud Urgente'}
              </span>
              <span class="category-tag">${escapeHTML(item.category)}</span>
            </div>
            <span class="location-text">
              <i class="fa-solid fa-location-dot"></i> ${escapeHTML(item.city)}
            </span>
          </div>

          <div class="card-title-area">
            <h3>${escapeHTML(item.title)}</h3>
            <p>Cantidad: <span class="quantity-highlight">${escapeHTML(item.quantity)}</span></p>
          </div>

          ${expiryInfo ? `
            <div class="expiry-badge ${expiryInfo.class}" title="${escapeHTML(expiryInfo.tooltip)}">
              <i class="fa-solid ${expiryInfo.icon}"></i> ${escapeHTML(expiryInfo.text)}
            </div>
          ` : ''}

          <p class="card-desc">${escapeHTML(item.description || 'Sin descripción adicional.')}</p>
        </div>

        <div class="card-footer">
          <div class="status-indicator ${item.status}">
            <i class="fa-solid ${isDisponible ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
            ${isDisponible ? 'Disponible' : 'Entregado / Cerrado'}
          </div>

          <div class="card-actions-group">
            ${isDisponible ? `
              <button data-id="${escapeHTML(item.id)}" class="btn-primary btn-contact-item">
                <i class="fa-brands fa-whatsapp"></i> ${isDonacion ? 'Solicitar' : 'Ofrecer Ayuda'}
              </button>
              <button data-id="${escapeHTML(item.id)}" class="btn-status-toggle" title="Marcar como entregado / cerrado">
                <i class="fa-solid fa-check"></i>
              </button>
            ` : `
              <button class="btn-secondary btn-disabled" disabled>
                <i class="fa-solid fa-lock"></i> Finalizado
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Event Listeners para botones de acción en tarjetas
  document.querySelectorAll('.btn-contact-item').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      currentSelectedItem = allItemsCache.find(i => i.id.toString() === id.toString());
      if (currentSelectedItem) openRequestModal(currentSelectedItem);
    };
  });

  document.querySelectorAll('.btn-status-toggle').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      currentStatusItem = allItemsCache.find(i => i.id.toString() === id.toString());
      if (currentStatusItem) openStatusModal(currentStatusItem);
    };
  });
}

// --------------------------------------------------------------------------
// Cálculo y Semáforo de Vencimiento
// --------------------------------------------------------------------------
function getExpiryInfo(dateStr) {
  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(dateStr);
  if (isNaN(expiry.getTime())) return null;

  // Diferencia en días
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      class: 'expiry-expired',
      icon: 'fa-triangle-exclamation',
      text: `Venció el ${dateStr}`,
      tooltip: 'Medicamento caducado. No apto para consumo humano.',
      canDonate: false
    };
  } else if (diffDays <= 90) {
    return {
      status: 'warning',
      class: 'expiry-warning',
      icon: 'fa-clock',
      text: `Vence en ${diffDays} días (${dateStr})`,
      tooltip: 'Próximo a vencer. Requiere prioridad de entrega.',
      canDonate: true
    };
  } else {
    return {
      status: 'valid',
      class: 'expiry-valid',
      icon: 'fa-calendar-check',
      text: `Vigente hasta ${dateStr}`,
      tooltip: 'Fecha de caducidad en regla.',
      canDonate: true
    };
  }
}

// --------------------------------------------------------------------------
// Modales y Flujos Interactivos
// --------------------------------------------------------------------------
function openRequestModal(item) {
  document.getElementById('reqItemTitle').textContent = item.title;
  
  const chk1 = document.getElementById('chkPrescription');
  const chk2 = document.getElementById('chkNoCommercial');
  chk1.checked = false;
  chk2.checked = false;

  const modalTitle = document.getElementById('modalReqHeaderTitle');
  if (item.type === 'solicitud') {
    modalTitle.textContent = 'Apoyar a Paciente / Solicitante';
  } else {
    modalTitle.textContent = 'Verificación Ética de Recepción';
  }

  const btnConfirm = document.getElementById('btnConfirmWhatsApp');
  btnConfirm.disabled = true;
  btnConfirm.className = 'btn-disabled';

  requestModal.classList.remove('hidden');
}

function openStatusModal(item) {
  document.getElementById('statusItemTitle').textContent = item.title;
  statusModal.classList.remove('hidden');
}

function resetAllFilters() {
  searchInput.value = '';
  categoryFilter.value = 'all';
  cityFilter.value = 'all';
  statusFilter.value = 'disponible';
  currentTypeFilter = 'all';

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const tabAll = document.getElementById('tabAll');
  if (tabAll) tabAll.classList.add('active');

  renderDonations();
  showToast('Filtros restablecidos.', 'info');
}

// --------------------------------------------------------------------------
// Configuración de Event Listeners
// --------------------------------------------------------------------------
function setupEventListeners() {
  // Filtros reactivos
  searchInput.addEventListener('input', renderDonations);
  categoryFilter.addEventListener('change', renderDonations);
  cityFilter.addEventListener('change', renderDonations);
  statusFilter.addEventListener('change', renderDonations);

  if (btnClearSearch) {
    btnClearSearch.onclick = () => {
      searchInput.value = '';
      renderDonations();
    };
  }

  if (btnResetFilters) {
    btnResetFilters.onclick = resetAllFilters;
  }

  // Pestañas de tipo (Todos, Donaciones, Solicitudes)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTypeFilter = btn.getAttribute('data-type');
      renderDonations();
    };
  });

  // Modal de Publicación
  const btnOpenPublish = document.getElementById('btnOpenPublishModal');
  const btnClosePublish = document.getElementById('btnClosePublishModal');
  const btnCancelPublish = document.getElementById('btnCancelPublish');

  if (radioDonacion && radioSolicitud) {
    const updateTypeFormUI = () => {
      const isDonation = radioDonacion.checked;
      const expiryTag = document.getElementById('expiryRequiredTag');
      if (expiryTag) {
        expiryTag.textContent = isDonation ? '(Recomendado para fármacos)' : '(Opcional / No aplica)';
      }
    };
    radioDonacion.addEventListener('change', updateTypeFormUI);
    radioSolicitud.addEventListener('change', updateTypeFormUI);
  }

  if (btnOpenPublish) {
    btnOpenPublish.onclick = () => {
      publicationForm.reset();
      expiryHelpText.textContent = '';
      publishModal.classList.remove('hidden');
    };
  }

  const closePublishModal = () => publishModal.classList.add('hidden');
  if (btnClosePublish) btnClosePublish.onclick = closePublishModal;
  if (btnCancelPublish) btnCancelPublish.onclick = closePublishModal;

  // Validación dinámica de fecha de vencimiento en el formulario
  itemExpiry.addEventListener('change', () => {
    if (!itemExpiry.value) {
      expiryHelpText.textContent = '';
      return;
    }
    const info = getExpiryInfo(itemExpiry.value);
    if (info && info.status === 'expired') {
      expiryHelpText.style.color = '#e11d48';
      expiryHelpText.textContent = '⚠️ Advertencia: No es seguro donar medicamentos caducados.';
    } else if (info && info.status === 'warning') {
      expiryHelpText.style.color = '#d97706';
      expiryHelpText.textContent = 'ℹ️ Aviso: Este producto vencerá en los próximos 90 días.';
    } else {
      expiryHelpText.style.color = '#059669';
      expiryHelpText.textContent = '✓ Fecha de vencimiento válida.';
    }
  });

  // Envío del Formulario de Publicación
  publicationForm.onsubmit = async (e) => {
    e.preventDefault();

    const selectedType = document.querySelector('input[name="pubType"]:checked')?.value || 'donacion';
    const expiryDate = itemExpiry.value || null;

    // Control sanitario: Bloquear si es donación y está vencido
    if (selectedType === 'donacion' && expiryDate) {
      const expInfo = getExpiryInfo(expiryDate);
      if (expInfo && !expInfo.canDonate) {
        showToast('No se pueden publicar medicamentos con fecha de vencimiento pasada.', 'error');
        return;
      }
    }

    // Validar teléfono celular de Colombia (10 dígitos)
    const rawPhone = document.getElementById('itemPhone').value.replace(/\D/g, '');
    if (rawPhone.length < 10) {
      showToast('Por favor ingresa un número de celular de 10 dígitos (ej: 3001234567).', 'warning');
      return;
    }

    const newItem = {
      type: selectedType,
      title: document.getElementById('itemTitle').value.trim(),
      category: document.getElementById('itemCategory').value,
      quantity: document.getElementById('itemQuantity').value.trim(),
      expiry_date: expiryDate,
      city: document.getElementById('itemCity').value.trim(),
      phone: rawPhone,
      description: document.getElementById('itemDescription').value.trim(),
      status: 'disponible'
    };

    const submitBtn = document.getElementById('btnSubmitPublish');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando...';

    try {
      await saveDonation(newItem);
      allItemsCache = await fetchDonations();
      updateStatsAndTabs();
      renderDonations();
      publishModal.classList.add('hidden');
      publicationForm.reset();
      showToast('¡Tu publicación ha sido registrada con éxito!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Ocurrió un error al guardar. Inténtalo de nuevo.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar Ahora';
    }
  };

  // Modal de Verificación Ética (Fórmula)
  const chk1 = document.getElementById('chkPrescription');
  const chk2 = document.getElementById('chkNoCommercial');
  const btnConfirmWA = document.getElementById('btnConfirmWhatsApp');
  const btnCancelRequest = document.getElementById('btnCancelRequest');

  const checkValidation = () => {
    if (chk1.checked && chk2.checked) {
      btnConfirmWA.disabled = false;
      btnConfirmWA.className = 'btn-success';
    } else {
      btnConfirmWA.disabled = true;
      btnConfirmWA.className = 'btn-disabled';
    }
  };

  chk1.onchange = checkValidation;
  chk2.onchange = checkValidation;

  if (btnCancelRequest) {
    btnCancelRequest.onclick = () => requestModal.classList.add('hidden');
  }

  btnConfirmWA.onclick = () => {
    if (!currentSelectedItem) return;

    const isDonacion = currentSelectedItem.type === 'donacion';
    let message = '';

    if (isDonacion) {
      message = `Hola, vi tu publicación en VitalDonaciones de *${currentSelectedItem.title}* (${currentSelectedItem.quantity}) en ${currentSelectedItem.city}. Cuento con fórmula médica vigente y me gustaría coordinar la recepción solidaria.`;
    } else {
      message = `Hola, vi tu solicitud urgente en VitalDonaciones para *${currentSelectedItem.title}* en ${currentSelectedItem.city}. Me gustaría ayudarte con la donación.`;
    }

    const waUrl = formatWhatsAppLink(currentSelectedItem.phone, message);
    window.open(waUrl, '_blank');
    requestModal.classList.add('hidden');
    showToast('Abriendo WhatsApp para coordinar la entrega...', 'info');
  };

  // Modal de Estado (Marcar como Entregado)
  const btnCancelStatus = document.getElementById('btnCancelStatusChange');
  const btnConfirmStatus = document.getElementById('btnConfirmStatusChange');

  if (btnCancelStatus) {
    btnCancelStatus.onclick = () => statusModal.classList.add('hidden');
  }

  if (btnConfirmStatus) {
    btnConfirmStatus.onclick = async () => {
      if (!currentStatusItem) return;
      btnConfirmStatus.disabled = true;
      btnConfirmStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';

      try {
        await updateDonationStatus(currentStatusItem.id, 'entregado');
        allItemsCache = await fetchDonations();
        updateStatsAndTabs();
        renderDonations();
        statusModal.classList.add('hidden');
        showToast('Publicación marcada como entregada / cerrada.', 'success');
      } catch (err) {
        showToast('Error al actualizar estado.', 'error');
      } finally {
        btnConfirmStatus.disabled = false;
        btnConfirmStatus.innerHTML = '<i class="fa-solid fa-check"></i> Sí, marcar completado';
      }
    };
  }

  // Modal de Supabase y Asistente SQL
  const btnOpenSupabase = document.getElementById('btnOpenSupabaseModal');
  const btnCloseSupabase = document.getElementById('btnCloseSupabaseModal');
  const btnSaveSupabase = document.getElementById('btnSaveSupabaseConfig');
  const btnDisconnectSupabase = document.getElementById('btnDisconnectSupabase');
  const btnCopySql = document.getElementById('btnCopySqlSchema');
  const sqlSchemaCode = document.getElementById('sqlSchemaCode');

  if (sqlSchemaCode && window.SUPABASE_SQL_SCHEMA) {
    sqlSchemaCode.textContent = window.SUPABASE_SQL_SCHEMA;
  }

  if (btnOpenSupabase) {
    btnOpenSupabase.onclick = () => {
      document.getElementById('supabaseUrlInput').value = localStorage.getItem('VITAL_SUPABASE_URL') || '';
      document.getElementById('supabaseKeyInput').value = localStorage.getItem('VITAL_SUPABASE_KEY') || '';
      updateSupabaseStatusUI();
      supabaseModal.classList.remove('hidden');
    };
  }

  if (btnCloseSupabase) {
    btnCloseSupabase.onclick = () => supabaseModal.classList.add('hidden');
  }

  if (btnCopySql) {
    btnCopySql.onclick = () => {
      navigator.clipboard.writeText(window.SUPABASE_SQL_SCHEMA || '').then(() => {
        showToast('¡Script SQL copiado al portapapeles!', 'success');
      }).catch(() => {
        showToast('No se pudo copiar automáticamente. Puedes seleccionarlo manualmente.', 'info');
      });
    };
  }

  if (btnSaveSupabase) {
    btnSaveSupabase.onclick = async () => {
      const url = document.getElementById('supabaseUrlInput').value.trim();
      const key = document.getElementById('supabaseKeyInput').value.trim();

      if (!url || !key) {
        showToast('Por favor completa tanto la URL como la Anon Key de Supabase.', 'warning');
        return;
      }

      localStorage.setItem('VITAL_SUPABASE_URL', url);
      localStorage.setItem('VITAL_SUPABASE_KEY', key);

      supabaseModal.classList.add('hidden');
      showToast('Configuración de Supabase guardada. Reconectando...', 'success');
      setTimeout(() => location.reload(), 1000);
    };
  }

  if (btnDisconnectSupabase) {
    btnDisconnectSupabase.onclick = () => {
      localStorage.removeItem('VITAL_SUPABASE_URL');
      localStorage.removeItem('VITAL_SUPABASE_KEY');
      supabaseModal.classList.add('hidden');
      showToast('Se usará el almacenamiento local (LocalStorage).', 'info');
      setTimeout(() => location.reload(), 800);
    };
  }
}

// --------------------------------------------------------------------------
// Utilidades: WhatsApp, XSS y Toasts
// --------------------------------------------------------------------------
function formatWhatsAppLink(phone, message) {
  let cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.startsWith('57') && cleanPhone.length === 12) {
    // Ya incluye el código 57
  } else if (cleanPhone.length === 10) {
    // Celular nacional de 10 dígitos (ej. 3001234567) -> agregar 57
    cleanPhone = '57' + cleanPhone;
  } else if (cleanPhone.startsWith('057') && cleanPhone.length === 13) {
    cleanPhone = cleanPhone.substring(1);
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info'
  };

  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || 'fa-circle-info'}"></i>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

function updateSupabaseStatusUI() {
  const isConfigured = window.isSupabaseConfigured ? window.isSupabaseConfigured() : false;
  const statusText = document.getElementById('supabaseStatusText');
  const bannerMsg = document.getElementById('supabaseStatusMessage');

  if (isConfigured) {
    if (statusText) statusText.innerHTML = '<span style="color: #6ee7b7;">●</span> Supabase Conectado';
    if (bannerMsg) bannerMsg.innerHTML = '<strong>Estado:</strong> Credenciales configuradas. La aplicación sincroniza con tu base de datos en Supabase.';
  } else {
    if (statusText) statusText.innerHTML = '<span style="color: #fde68a;">●</span> Modo Local';
    if (bannerMsg) bannerMsg.innerHTML = '<strong>Modo Local Activo:</strong> Los datos se guardan en el navegador. Conecta Supabase para almacenamiento en la nube permanente.';
  }
}

function populateCityFilter() {
  const colombianCities = [
    'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga',
    'Pereira', 'Manizales', 'Armenia', 'Cúcuta', 'Ibagué', 'Santa Marta',
    'Pasto', 'Neiva', 'Villavicencio', 'Valledupar', 'Montería', 'Sincelejo',
    'Popayán', 'Tunja', 'Riohacha', 'Florencia', 'Quibdó', 'Yopal', 'San Andrés',
    'Palmira', 'Buenaventura', 'Soacha', 'Bello', 'Itagüí', 'Envigado', 'Dosquebradas'
  ];

  colombianCities.sort();

  if (cityFilter) {
    cityFilter.innerHTML = '<option value="all">Todas las Ciudades (Colombia)</option>' +
      colombianCities.map(city => `<option value="${city}">${city}</option>`).join('');
  }
}
