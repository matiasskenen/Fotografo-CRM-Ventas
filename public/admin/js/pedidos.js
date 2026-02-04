// DATOS MOCK de pedidos
const MOCK_ORDERS = [
  { 
    id: 1001, 
    customer_email: 'maria.gonzalez@email.com',
    customer_name: 'María González',
    created_at: '2025-02-04T10:30:00',
    status: 'completed',
    total_amount: 1500,
    album_name: 'Graduación 2025 - 5to Año'
  },
  { 
    id: 1002, 
    customer_email: 'juan.perez@email.com',
    customer_name: 'Juan Pérez',
    created_at: '2025-02-04T11:45:00',
    status: 'completed',
    total_amount: 800,
    album_name: 'Primaria 3er Grado'
  },
  { 
    id: 1003, 
    customer_email: 'ana.martinez@email.com',
    customer_name: 'Ana Martínez',
    created_at: '2025-02-03T09:15:00',
    status: 'pending',
    total_amount: 1200,
    album_name: 'Jardín Sala de 5'
  },
  { 
    id: 1004, 
    customer_email: 'carlos.lopez@email.com',
    customer_name: 'Carlos López',
    created_at: '2025-02-03T14:20:00',
    status: 'completed',
    total_amount: 2100,
    album_name: 'Secundaria 2do Año'
  },
  { 
    id: 1005, 
    customer_email: 'laura.rodriguez@email.com',
    customer_name: 'Laura Rodríguez',
    created_at: '2025-02-02T16:30:00',
    status: 'completed',
    total_amount: 950,
    album_name: 'Graduación 2025 - 5to Año'
  },
  { 
    id: 1006, 
    customer_email: 'pedro.sanchez@email.com',
    customer_name: 'Pedro Sánchez',
    created_at: '2025-02-02T11:00:00',
    status: 'completed',
    total_amount: 1700,
    album_name: 'Egresados Primaria 6to'
  },
  { 
    id: 1007, 
    customer_email: 'sofia.fernandez@email.com',
    customer_name: 'Sofía Fernández',
    created_at: '2025-02-01T13:45:00',
    status: 'processing',
    total_amount: 600,
    album_name: 'Primaria 3er Grado'
  },
  { 
    id: 1008, 
    customer_email: 'diego.morales@email.com',
    customer_name: 'Diego Morales',
    created_at: '2025-02-01T10:20:00',
    status: 'completed',
    total_amount: 3200,
    album_name: 'Graduación 2025 - 5to Año'
  },
];

export function init() {
  console.log("📦 Historial de pedidos cargado con datos locales");

  const ordersTableBody = document.getElementById("ordersTableBody");
  const filterOrderDate = document.getElementById("filterOrderDate");
  const clearDateFilter = document.getElementById("clearDateFilter");
  const deleteAllOrders = document.getElementById("deleteAllOrders");

  let allOrdersData = MOCK_ORDERS;

  const renderOrders = (orders) => {
    if (orders.length === 0) {
      ordersTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay pedidos que coincidan con el filtro.</td></tr>`;
      return;
    }

    ordersTableBody.innerHTML = "";
    orders.forEach(order => {
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-gray-50";
      
      const statusColors = {
        completed: 'bg-green-100 text-green-600',
        pending: 'bg-yellow-100 text-yellow-600',
        processing: 'bg-blue-100 text-blue-600',
        cancelled: 'bg-red-100 text-red-600'
      };
      
      const statusText = {
        completed: 'Completado',
        pending: 'Pendiente',
        processing: 'Procesando',
        cancelled: 'Cancelado'
      };
      
      tr.innerHTML = `
        <td class="py-3 px-4 font-mono">#${order.id}</td>
        <td class="py-3 px-4">
          <div class="font-medium">${order.customer_name || order.customer_email}</div>
          <div class="text-xs text-gray-500">${order.album_name || 'N/A'}</div>
        </td>
        <td class="py-3 px-4">${new Date(order.created_at).toLocaleDateString('es-AR')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}">
            ${statusText[order.status] || order.status}
          </span>
        </td>
        <td class="py-3 px-4 text-right font-bold">$${order.total_amount?.toFixed(2) || "0.00"}</td>
        <td class="py-3 px-4 text-center">
          <button 
            class="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow delete-order mx-auto"
            data-order-id="${order.id}"
            title="Eliminar pedido"
          >
            <i class="fas fa-trash-alt text-sm"></i>
          </button>
        </td>
      `;
      ordersTableBody.appendChild(tr);
    });

    // Listeners para eliminar pedidos individuales
    document.querySelectorAll(".delete-order").forEach(btn => {
      btn.addEventListener("click", () => {
        const orderId = parseInt(btn.dataset.orderId);
        if (confirm(`¿Seguro que quieres eliminar el pedido #${orderId}?`)) {
          const index = allOrdersData.findIndex(o => o.id === orderId);
          if (index > -1) {
            allOrdersData.splice(index, 1);
            renderOrders(allOrdersData);
          }
        }
      });
    });
  };

  const filterOrders = () => {
    const filterDate = filterOrderDate.value;

    if (!filterDate) {
      renderOrders(allOrdersData);
      return;
    }

    const filtered = allOrdersData.filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      return orderDate === filterDate;
    });

    renderOrders(filtered);
  };

  const deleteOrder = async (orderId) => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/orders/${orderId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        alert("Pedido eliminado exitosamente.");
        await fetchOrders();
      } else {
        const data = await res.json();
        alert(`Error al eliminar pedido: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al eliminar pedido.");
    }
  };

  const deleteAllOrdersFunc = async () => {
    if (!confirm("⚠️ ¿Estás SEGURO que quieres eliminar TODOS los pedidos? Esta acción no se puede deshacer.")) {
      return;
    }

    if (!confirm("⚠️ ÚLTIMA CONFIRMACIÓN: Se eliminarán todos los pedidos permanentemente.")) {
      return;
    }

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/orders/all`, {
        method: "DELETE"
      });

      if (res.ok) {
        alert("Todos los pedidos han sido eliminados.");
        await fetchOrders();
      } else {
        const data = await res.json();
        alert(`Error al eliminar pedidos: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al eliminar pedidos.");
    }
  };

  // Event Listeners
  if (filterOrderDate) {
    filterOrderDate.addEventListener("change", filterOrders);
  }
  
  if (clearDateFilter) {
    clearDateFilter.addEventListener("click", () => {
      filterOrderDate.value = "";
      renderOrders(allOrdersData);
    });
  }

  if (deleteAllOrders) {
    deleteAllOrders.addEventListener("click", () => {
      if (!confirm("⚠️ ¿Estás SEGURO que quieres eliminar TODOS los pedidos?")) return;
      allOrdersData.length = 0;
      renderOrders(allOrdersData);
      alert("Todos los pedidos han sido eliminados.");
    });
  }

  // Cargar pedidos iniciales
  renderOrders(allOrdersData);
}
