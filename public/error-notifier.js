const ErrorNotifier = {
    show: function(message, solution = '', type = 'error', duration = 7000) {
        // Hapus notifikasi lama jika sudah ada untuk mencegah tumpukan
        const oldToast = document.getElementById('toast-notification');
        if (oldToast) {
            oldToast.remove();
        }

        // Buat elemen toast yang baru
        const toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = `toast toast-${type}`;

        let content = `
            <div class="toast-content">
                <p class="toast-message">${message}</p>
        `;
        if (solution) {
            content += `<p class="toast-solution">${solution}</p>`;
        }
        content += `</div><div class="toast-close-btn">&times;</div>`;
        
        toast.innerHTML = content;
        document.body.appendChild(toast);

        // Tambahkan class 'show' untuk memicu animasi CSS
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Fungsi untuk menghilangkan dan menghapus toast
        const dismiss = () => {
            toast.classList.remove('show');
            // Tunggu animasi keluar selesai sebelum benar-benar menghapus elemen dari DOM
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 500);
        };

        // Atur timer untuk menghilangkan toast secara otomatis
        const timer = setTimeout(dismiss, duration);

        // Tambahkan event listener untuk tombol close
        toast.querySelector('.toast-close-btn').addEventListener('click', () => {
            clearTimeout(timer); // Batalkan timer otomatis jika ditutup manual
            dismiss();
        });
    }
};
