// Lógica de Supabase y Fallback local
const MOCK_DONATIONS = [
  {
    id: '1',
    title: 'Losartán 50mg',
    category: 'Medicamentos',
    quantity: '2 Cajas (60 Pastillas)',
    expiry_date: '2027-11-30',
    city: 'Pereira',
    phone: '3001234567',
    description: 'Blísteres sellados en perfecto estado. Sobrante de tratamiento cambiado por el médico.',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Silla de Ruedas Plegable',
    category: 'Insumos Médicos',
    quantity: '1 Unidad',
    expiry_date: null,
    city: 'Bogotá',
    phone: '3109876543',
    description: 'Silla de ruedas en excelente estado. Ideal para personas con movilidad reducida.',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Insulina Glargina 100 UI/ml',
    category: 'Medicamentos',
    quantity: '1 Lapicero Prellenado SoloStar',
    expiry_date: '2027-02-15',
    city: 'Medellín',
    phone: '3155554433',
    description: 'Mantenida continuamente en cadena de frío. Se entrega con empaque original.',
    created_at: new Date().toISOString()
  }
];

let supabaseInstance = null;

function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const url = localStorage.getItem('VITAL_SUPABASE_URL');
  const key = localStorage.getItem('VITAL_SUPABASE_KEY');

  if (url && key && window.supabase) {
    try {
      supabaseInstance = window.supabase.createClient(url, key);
      return supabaseInstance;
    } catch (e) {
      console.error('Error al inicializar Supabase:', e);
    }
  }
  return null;
}

async function fetchDonations() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('donaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Fallback a LocalStorage por error en Supabase:', err);
    }
  }

  const localData = localStorage.getItem('VITAL_DONATIONS_CACHE');
  return localData ? JSON.parse(localData) : MOCK_DONATIONS;
}

async function saveDonation(newItem) {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('donaciones').insert([newItem]);
    } catch (err) {
      console.error('Error insertando en Supabase:', err);
    }
  }

  const current = await fetchDonations();
  current.unshift({ id: Date.now().toString(), ...newItem });
  localStorage.setItem('VITAL_DONATIONS_CACHE', JSON.stringify(current));
}