const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxzHN0sOhIZSqP4LxU4Uk9YkddhOMZ36cSf0OK7BliT8yKFI5l6-SLvmxE7-jthL3i1vg/exec"; 

// Batas waktu pendaftaran: Jumat, 11 September 2026 pukul 23:59:59 WIB (+07:00)
const REGISTRATION_DEADLINE = new Date("2026-09-11T23:59:59+07:00");

let currentCounts = { total: 0, L: 0, P: 0 };
let totalChart;

// Cek apakah waktu saat ini sudah melewati batas penutupan
function isRegistrationClosed() {
    return new Date() > REGISTRATION_DEADLINE;
}

// Kunci formulir dan tampilkan banner jika waktu pendaftaran sudah lewat
function checkDeadline() {
    if (isRegistrationClosed()) {
        const banner = document.getElementById('closedBanner');
        if (banner) banner.classList.remove('hidden');

        const btn = document.getElementById('submitBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Pendaftaran Sudah Ditutup";
        }

        const formElements = document.querySelectorAll('#attendanceForm input, #attendanceForm select');
        formElements.forEach(el => el.disabled = true);
        return true;
    }
    return false;
}

// Inisialisasi Donut Chart
function initCharts() {
    const ctx = document.getElementById('totalChart').getContext('2d');
    totalChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Belum Ada Peserta'],
            datasets: [{
                data: [1],
                backgroundColor: ['#e2e8f0'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { 
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (currentCounts.total === 0) return ' Belum ada pendaftar';
                            return ` ${context.label}: ${context.raw} orang`;
                        }
                    }
                }, 
                legend: { display: false } 
            }
        }
    });
}

// Ambil data statistik dari Google Apps Script (doGet)
async function fetchCurrentCounts() {
    if (!SCRIPT_URL || SCRIPT_URL.includes("URL_GOOGLE_APPS_SCRIPT_ANDA")) return;
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getCounts`);
        const data = await response.json();
        
        if (data.counts) {
            currentCounts.L = data.counts.L || 0;
            currentCounts.P = data.counts.P || 0;
            currentCounts.total = (data.total !== undefined) ? data.total : (currentCounts.L + currentCounts.P);
        } else {
            currentCounts.L = data.L || 0;
            currentCounts.P = data.P || 0;
            currentCounts.total = (data.total !== undefined) ? data.total : (currentCounts.L + currentCounts.P);
        }
        
        updateDisplay();
    } catch (error) {
        console.error("Gagal mengambil data peserta:", error);
    }
}

// Update angka label dan donut chart
function updateDisplay() {
    document.getElementById('totalLabel').innerText = currentCounts.total;
    document.getElementById('maleLabel').innerText = currentCounts.L;
    document.getElementById('femaleLabel').innerText = currentCounts.P;

    if (currentCounts.total === 0) {
        totalChart.data.labels = ['Belum Ada Peserta'];
        totalChart.data.datasets[0].data = [1];
        totalChart.data.datasets[0].backgroundColor = ['#e2e8f0'];
    } else {
        totalChart.data.labels = ['Laki-Laki', 'Perempuan'];
        totalChart.data.datasets[0].data = [currentCounts.L, currentCounts.P];
        totalChart.data.datasets[0].backgroundColor = ['#059669', '#db2777'];
    }
    
    totalChart.update();
}

// Fungsi reset form dan pulihkan tombol submit
function resetFormState() {
    const form = document.getElementById('attendanceForm');
    form.reset();
    
    // Pastikan nilai default armada tetap terpilih
    const armadaSelect = document.getElementById('armada');
    if (armadaSelect) armadaSelect.value = "Bersepeda Motor";

    const btn = document.getElementById('submitBtn');
    if (!checkDeadline()) {
        btn.disabled = false;
        btn.innerText = "Simpan Hasil Presensi";
    }
}

// Event Submit Formulir
document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validasi penutupan sebelum pengiriman data
    if (checkDeadline()) {
        alert("Maaf, waktu pendaftaran telah berakhir.");
        return;
    }
    
    const btn = document.getElementById('submitBtn');
    const data = {
        name: document.getElementById('name').value.trim(),
        desa: document.getElementById('desa').value.trim(),
        kelompok: document.getElementById('kelompok').value.trim(),
        gender: document.getElementById('gender').value,
        armada: document.getElementById('armada').value
    };

    btn.disabled = true;
    btn.innerText = "Menyimpan Data...";

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.status === "success") {
            // Perbarui data lokal
            currentCounts.L = result.counts.L;
            currentCounts.P = result.counts.P;
            currentCounts.total = result.total || (result.counts.L + result.counts.P);
            updateDisplay();
            
            // Tampilkan rincian data ke dalam modal
            document.getElementById('popupTitle').innerText = result.isUpdate ? "Sukses Diperbarui" : "Sukses Disimpan";
            document.getElementById('resName').innerText = data.name;
            document.getElementById('resDesa').innerText = data.desa;
            document.getElementById('resKelompok').innerText = data.kelompok;
            document.getElementById('resGender').innerText = data.gender === 'L' ? 'Laki-Laki' : 'Perempuan';
            document.getElementById('resArmada').innerText = data.armada;

            // Buka modal sukses
            const popup = document.getElementById('successPopup');
            popup.classList.add('active');
            
            // Reset isian form tanpa langsung menutup popup agar user sempat klik link grup WhatsApp
            resetFormState();

        } else {
            alert(`Gagal: ${result.message}`);
            if (!checkDeadline()) {
                btn.disabled = false;
                btn.innerText = "Simpan Hasil Presensi";
            }
        }

    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan koneksi ke server. Silakan coba kembali.");
        if (!checkDeadline()) {
            btn.disabled = false;
            btn.innerText = "Simpan Hasil Presensi";
        }
    }
});

// Tutup popup saat latar belakang (backdrop) modal diklik
document.getElementById('successPopup').addEventListener('click', (e) => {
    if (e.target.id === 'successPopup') {
        e.currentTarget.classList.remove('active');
    }
});

// Jalankan fungsi saat browser selesai memuat halaman
window.onload = () => {
    initCharts();
    updateDisplay();
    fetchCurrentCounts();
    checkDeadline();
};
