const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwbNwY4FKgSV9_-UF54sb7RlWfeGXHUEvEMeLmO8HHDMNEh0jPXAwYGrKGLLeqPO-2rag/exec"; 
const MAX_TOTAL_QUOTA = 80;

let currentCounts = { total: 0, L: 0, P: 0 };
let totalChart;

function initCharts() {
    const ctx = document.getElementById('totalChart').getContext('2d');
    totalChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Laki-Laki', 'Perempuan', 'Sisa Kuota'],
            datasets: [{
                data: [0, 0, MAX_TOTAL_QUOTA],
                backgroundColor: ['#059669', '#db2777', '#f1f5f9'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: { 
                tooltip: { enabled: true }, 
                legend: { display: false } 
            }
        }
    });
}

async function fetchCurrentCounts() {
    if (!SCRIPT_URL || SCRIPT_URL === "URL_GOOGLE_APPS_SCRIPT_ANDA") return;
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getCounts`);
        const data = await response.json();
        currentCounts.L = data.L || 0;
        currentCounts.P = data.P || 0;
        currentCounts.total = (data.total !== undefined) ? data.total : (currentCounts.L + currentCounts.P);
        updateDisplay();
    } catch (error) {
        console.error("Gagal mengambil data kuota awal:", error);
    }
}

function updateDisplay() {
    const sisa = Math.max(0, MAX_TOTAL_QUOTA - currentCounts.total);
    
    document.getElementById('totalLabel').innerText = currentCounts.total;
    document.getElementById('maleLabel').innerText = currentCounts.L;
    document.getElementById('femaleLabel').innerText = currentCounts.P;

    totalChart.data.datasets[0].data = [currentCounts.L, currentCounts.P, sisa];
    totalChart.update();
    checkQuota();
}

function checkQuota() {
    const btn = document.getElementById('submitBtn');
    if (currentCounts.total >= MAX_TOTAL_QUOTA) {
        btn.disabled = true;
        btn.innerText = "Kuota Sudah Penuh (80 Peserta)";
    } else {
        btn.disabled = false;
        btn.innerText = "Simpan Hasil Presensi";
    }
}

document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('submitBtn');
    const data = {
        name: document.getElementById('name').value,
        desa: document.getElementById('desa').value,
        kelompok: document.getElementById('kelompok').value,
        gender: document.getElementById('gender').value,
        armada: document.getElementById('armada').value
    };

    btn.disabled = true;
    btn.innerText = "Mengirim...";

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.status === "success") {
            currentCounts.L = result.counts.L;
            currentCounts.P = result.counts.P;
            currentCounts.total = result.total || (result.counts.L + result.counts.P);
            updateDisplay();
            
            document.getElementById('popupTitle').innerText = result.isUpdate ? "Sukses Diperbarui" : "Sukses Disimpan";
            document.getElementById('resName').innerText = data.name;
            document.getElementById('resDesa').innerText = data.desa;
            document.getElementById('resKelompok').innerText = data.kelompok;
            document.getElementById('resGender').innerText = data.gender === 'L' ? 'Laki-Laki' : 'Perempuan';
            document.getElementById('resArmada').innerText = data.armada;

            const popup = document.getElementById('successPopup');
            popup.classList.add('active');
            
            setTimeout(() => {
                popup.classList.remove('active');
                document.getElementById('attendanceForm').reset();
                checkQuota();
            }, 2000);

        } else {
            alert(`Gagal: ${result.message}`);
            checkQuota();
        }

    } catch (error) {
        alert("Terjadi kesalahan koneksi ke server.");
        checkQuota();
    }
});

window.onload = () => {
    initCharts();
    updateDisplay();
    fetchCurrentCounts();
};
