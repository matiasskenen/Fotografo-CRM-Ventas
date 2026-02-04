// DATOS MOCK LOCALES
const MOCK_DATA = {
  albums: [
    { id: 1, name: 'Graduación 2025 - 5to Año', school: 'Escuela San Martín', photos: 142, sales: 38500, status: 'active', created_at: '2025-01-15' },
    { id: 2, name: 'Primaria 3er Grado', school: 'Colegio Belgrano', photos: 89, sales: 22400, status: 'active', created_at: '2025-02-01' },
    { id: 3, name: 'Jardín Sala de 5', school: 'Jardín Los Sauces', photos: 67, sales: 18900, status: 'active', created_at: '2025-01-28' },
    { id: 4, name: 'Secundaria 2do Año', school: 'Instituto San José', photos: 112, sales: 31200, status: 'active', created_at: '2025-01-20' },
    { id: 5, name: 'Egresados Primaria 6to', school: 'Escuela N°12', photos: 95, sales: 27800, status: 'active', created_at: '2025-02-03' },
  ],
  
  orders: [
    { id: 1001, customer: 'María González', album: 'Graduación 2025', amount: 1500, status: 'completed', date: '2025-02-04', items: 3 },
    { id: 1002, customer: 'Juan Pérez', album: 'Primaria 3er Grado', amount: 800, status: 'completed', date: '2025-02-04', items: 2 },
    { id: 1003, customer: 'Ana Martínez', album: 'Jardín Sala de 5', amount: 1200, status: 'pending', date: '2025-02-03', items: 4 },
    { id: 1004, customer: 'Carlos López', album: 'Secundaria 2do Año', amount: 2100, status: 'completed', date: '2025-02-03', items: 5 },
    { id: 1005, customer: 'Laura Rodríguez', album: 'Graduación 2025', amount: 950, status: 'completed', date: '2025-02-02', items: 2 },
    { id: 1006, customer: 'Pedro Sánchez', album: 'Egresados Primaria 6to', amount: 1700, status: 'completed', date: '2025-02-02', items: 4 },
    { id: 1007, customer: 'Sofía Fernández', album: 'Primaria 3er Grado', amount: 600, status: 'processing', date: '2025-02-01', items: 1 },
    { id: 1008, customer: 'Diego Morales', album: 'Graduación 2025', amount: 3200, status: 'completed', date: '2025-02-01', items: 8 },
  ],

  monthlySales: [
    { month: 'Ene', sales: 42300 },
    { month: 'Feb', sales: 38850 },
    { month: 'Mar', sales: 51200 },
    { month: 'Abr', sales: 45600 },
    { month: 'May', sales: 58900 },
    { month: 'Jun', sales: 62400 },
    { month: 'Jul', sales: 38200 },
    { month: 'Ago', sales: 71500 },
    { month: 'Sep', sales: 68300 },
    { month: 'Oct', sales: 74800 },
    { month: 'Nov', sales: 82100 },
    { month: 'Dic', sales: 95600 },
  ],

  weeklySales: [
    { day: 'Lun', sales: 4200 },
    { day: 'Mar', sales: 5800 },
    { day: 'Mié', sales: 6300 },
    { day: 'Jue', sales: 5100 },
    { day: 'Vie', sales: 7800 },
    { day: 'Sab', sales: 9200 },
    { day: 'Dom', sales: 3400 },
  ]
};

// Inicializar cuando se carga la sección
export function init() {
  console.log('📊 Inicializando panel de analítica...');
  
  // Cargar Chart.js si no está disponible
  if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => {
      console.log('✅ Chart.js cargado');
      initializeAnalytics();
    };
    document.head.appendChild(script);
  } else {
    initializeAnalytics();
  }
}

function initializeAnalytics() {
  updateKPIs();
  createSalesChart();
  createOrdersChart();
  createAlbumsChart();
  createWeeklyChart();
  populateOrdersTable();
}

// Actualizar KPIs
function updateKPIs() {
  const totalSales = MOCK_DATA.orders.reduce((sum, order) => sum + order.amount, 0);
  const completedOrders = MOCK_DATA.orders.filter(o => o.status === 'completed').length;
  const activeAlbums = MOCK_DATA.albums.filter(a => a.status === 'active').length;
  const avgTicket = totalSales / MOCK_DATA.orders.length;

  document.getElementById('totalSales').textContent = `$${totalSales.toLocaleString()}`;
  document.getElementById('completedOrders').textContent = completedOrders;
  document.getElementById('activeAlbums').textContent = activeAlbums;
  document.getElementById('avgTicket').textContent = `$${Math.round(avgTicket).toLocaleString()}`;
}

// Gráfico de ventas mensuales
function createSalesChart() {
  const ctx = document.getElementById('salesChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: MOCK_DATA.monthlySales.map(d => d.month),
      datasets: [{
        label: 'Ventas ($)',
        data: MOCK_DATA.monthlySales.map(d => d.sales),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'Ventas: $' + context.parsed.y.toLocaleString();
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

// Gráfico de estado de pedidos
function createOrdersChart() {
  const statusCount = {
    completed: MOCK_DATA.orders.filter(o => o.status === 'completed').length,
    pending: MOCK_DATA.orders.filter(o => o.status === 'pending').length,
    processing: MOCK_DATA.orders.filter(o => o.status === 'processing').length,
  };

  const ctx = document.getElementById('ordersChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completados', 'Pendientes', 'Procesando'],
      datasets: [{
        data: [statusCount.completed, statusCount.pending, statusCount.processing],
        backgroundColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        }
      }
    }
  });
}

// Gráfico de top álbumes
function createAlbumsChart() {
  const topAlbums = MOCK_DATA.albums
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  const ctx = document.getElementById('albumsChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topAlbums.map(a => a.name.substring(0, 20) + '...'),
      datasets: [{
        label: 'Ventas ($)',
        data: topAlbums.map(a => a.sales),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

// Gráfico de ventas semanales
function createWeeklyChart() {
  const ctx = document.getElementById('weeklyChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MOCK_DATA.weeklySales.map(d => d.day),
      datasets: [{
        label: 'Ventas del día',
        data: MOCK_DATA.weeklySales.map(d => d.sales),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

// Poblar tabla de pedidos
function populateOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  const recentOrders = MOCK_DATA.orders.slice(0, 8);

  tbody.innerHTML = recentOrders.map(order => {
    const statusColors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
    };

    const statusText = {
      completed: 'Completado',
      pending: 'Pendiente',
      processing: 'Procesando',
    };

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${order.id}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.customer}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.album}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">$${order.amount.toLocaleString()}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status]}">
            ${statusText[order.status]}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.date}</td>
      </tr>
    `;
  }).join('');
}
