let currentFilePath = null;

// Dosya açıldığında
window.electronAPI.onFileOpened((filePath) => {
  currentFilePath = filePath;
  const fileName = filePath.split('\\').pop();
  document.getElementById('fileInfo').textContent = `📄 ${fileName}`;
  loadFile(filePath);
});

// Dosya yükleme
async function loadFile(filePath) {
  const preview = document.getElementById('preview');
  preview.innerHTML = '<div class="loading-spinner">İşleniyor...</div>';
  
  try {
    const result = await window.electronAPI.processFile(filePath);
    
    if (result.type === 'image') {
      preview.innerHTML = `
        <div style="text-align: center;">
          <img src="${result.content}" alt="Resim" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        </div>
      `;
    } else {
      preview.textContent = result.content || result.preview || 'İçerik yüklenemedi';
    }
  } catch (error) {
    preview.innerHTML = `<p style="color: #E57373;">⚠️ Dosya yüklenemedi: ${error.message}</p>`;
  }
}

// Soru sorma
document.getElementById('askBtn').addEventListener('click', async () => {
  const question = document.getElementById('questionInput').value.trim();
  if (!question) {
    alert('Lütfen bir soru yazın!');
    return;
  }
  
  const resultDiv = document.getElementById('aiResult');
  resultDiv.classList.remove('hidden');
  resultDiv.textContent = '🤔 Düşünüyor...';
  
  try {
    const answer = await window.electronAPI.askQuestion(question);
    resultDiv.textContent = answer;
  } catch (error) {
    resultDiv.innerHTML = `<p style="color: #E57373;">⚠️ Hata: ${error.message}</p>`;
  }
});

// Enter tuşu ile soru gönder
document.getElementById('questionInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('askBtn').click();
  }
});

// Özetleme (otomatik yükleme sonrası)
async function autoSummarize() {
  if (!currentFilePath) return;
  
  const resultDiv = document.getElementById('aiResult');
  resultDiv.classList.remove('hidden');
  resultDiv.textContent = '📝 Özet hazırlanıyor...';
  
  try {
    const summary = await window.electronAPI.summarize();
    resultDiv.textContent = summary;
  } catch (error) {
    resultDiv.classList.add('hidden');
  }
}

// Sayfa yüklendiğinde
window.addEventListener('DOMContentLoaded', () => {
  console.log('Minimal arayüz hazır!');
});



