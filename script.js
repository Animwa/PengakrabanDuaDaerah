const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwipWX6VUysOyPDVozzyXTcvmdg1f-98uCJzeYd-Te7-Ar2RRYiFjpnGtEwjYZOMro0yA/exec"; 

let currentCounts = { total: 0, L: 0, P: 0 };
let totalChart;

function initCharts() {
    const ctx = document.getElementById('totalChart').getContext('2d');
    totalChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Laki-Laki', 'Perempuan'],
            datasets: [{
                // Default warna abu-abu [1] jika data masih 0
                data: [0, 0],
                backgroundColor: ['#059669', '#db2777'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
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
        console.error("Gagal mengambil data peserta awal:", error);
    }
}

function updateDisplay() {
    document.getElementById('totalLabel').innerText = currentCounts.total;
    document.getElementById('maleLabel').innerText = currentCounts.L;
    document.getElementById('femaleLabel').innerText = currentCounts.P;

    // Jika belum ada peserta sama sekali, tampilkan chart kosong berwarna netral
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
            mode: 'cors',
            redirect: 'follow',
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
                btn.disabled = false;
                btn.innerText = "Simpan Hasil Presensi";
            }, 2000);

        } else {
            alert(`Gagal: ${result.message}`);
            btn.disabled = false;
            btn.innerText = "Simpan Hasil Presensi";
        }

    } catch (error) {
        alert("Terjadi kesalahan koneksi ke server.");
        btn.disabled = false;
        btn.innerText = "Simpan Hasil Presensi";
    }
});

window.onload = () => {
    initCharts();
    updateDisplay();
    fetchCurrentCounts();
};
