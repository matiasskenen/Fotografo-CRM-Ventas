// DATOS MOCK para el dashboard
const MOCK_STATS = {
  totalAlbums: 5,
  totalPhotos: 505,
  totalOrders: 8
};

export function init() {
    console.log("📊 Dashboard cargado con datos locales");

    const totalAlbumsEl = document.getElementById("totalAlbums");
    const totalPhotosEl = document.getElementById("totalPhotos");
    const totalOrdersEl = document.getElementById("totalOrders");

    // Usar datos mock locales
    if (totalAlbumsEl) totalAlbumsEl.textContent = MOCK_STATS.totalAlbums;
    if (totalPhotosEl) totalPhotosEl.textContent = MOCK_STATS.totalPhotos;
    if (totalOrdersEl) totalOrdersEl.textContent = MOCK_STATS.totalOrders;
}
