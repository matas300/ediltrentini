// ---- Auth check ----
async function checkAuth() {
  try {
    const res = await fetch('/admin/api/me');
    if (!res.ok) {
      window.location.href = '/admin/login.html';
      return false;
    }
    return true;
  } catch {
    window.location.href = '/admin/login.html';
    return false;
  }
}

// ---- Logout ----
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/admin/api/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
});

// ---- Form toggle ----
const formWrapper = document.getElementById('projectFormWrapper');
const addBtn = document.getElementById('addProjectBtn');
const cancelBtn = document.getElementById('cancelFormBtn');
const projectForm = document.getElementById('projectForm');

addBtn.addEventListener('click', () => {
  resetForm();
  formWrapper.style.display = 'block';
  addBtn.style.display = 'none';
  formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

cancelBtn.addEventListener('click', () => {
  formWrapper.style.display = 'none';
  addBtn.style.display = '';
});

function resetForm() {
  projectForm.reset();
  document.getElementById('projectId').value = '';
  document.getElementById('existingImages').innerHTML = '';
  document.getElementById('formSubmitBtn').textContent = 'Salva Lavoro';
}

// ---- Load projects ----
async function loadProjects() {
  const list = document.getElementById('projectsList');

  try {
    const res = await fetch('/admin/api/projects');
    if (!res.ok) throw new Error('Non autorizzato');
    const projects = await res.json();

    if (projects.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="16" width="48" height="36" rx="4" stroke="#ccc" stroke-width="2" stroke-dasharray="6 3"/>
            <path d="M24,52 L40,52" stroke="#ccc" stroke-width="2" stroke-linecap="round"/>
            <path d="M28,28 L36,28 M32,24 L32,32" stroke="#ccc" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>Nessun lavoro pubblicato.<br>Clicca "Nuovo Lavoro" per iniziare.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = projects.map(p => {
      const cover = p.images.find(i => i.is_cover) || p.images[0];
      return `
        <div class="project-item" data-id="${p.id}">
          ${cover
            ? `<img class="project-item-thumb" src="/uploads/${cover.filename}" alt="${p.title}">`
            : `<div class="project-item-thumb-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="#ccc" stroke-width="1.5"/><circle cx="8" cy="10" r="2" stroke="#ccc" stroke-width="1.5"/><path d="M2,18 L8,13 L12,16 L18,10 L22,14" stroke="#ccc" stroke-width="1.5"/></svg>
              </div>`
          }
          <div class="project-item-info">
            <h3>${p.title}</h3>
            <div class="meta">
              ${p.category ? `<span>${p.category}</span>` : ''}
              <span>${p.images.length} immagin${p.images.length === 1 ? 'e' : 'i'}</span>
              <span>${formatDate(p.created_at)}</span>
            </div>
          </div>
          <div class="project-item-actions">
            <button class="btn btn-ghost btn-sm" onclick="editProject(${p.id})">Modifica</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProject(${p.id}, '${p.title.replace(/'/g, "\\'")}')">Elimina</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = '<div class="loading">Errore nel caricamento dei progetti.</div>';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---- Create / Update project ----
projectForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('projectId').value;
  const formData = new FormData();
  formData.append('title', document.getElementById('projectTitle').value);
  formData.append('description', document.getElementById('projectDescription').value);
  formData.append('category', document.getElementById('projectCategory').value);

  const fileInput = document.getElementById('projectImages');
  if (fileInput.files.length > 0) {
    for (const file of fileInput.files) {
      formData.append('images', file);
    }
  }

  const url = id ? `/admin/api/projects/${id}` : '/admin/api/projects';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();

    if (res.ok && data.success) {
      formWrapper.style.display = 'none';
      addBtn.style.display = '';
      resetForm();
      loadProjects();
    } else {
      alert(data.error || 'Errore nel salvataggio');
    }
  } catch {
    alert('Errore di connessione al server');
  }
});

// ---- Edit project ----
async function editProject(id) {
  try {
    const res = await fetch('/admin/api/projects');
    const projects = await res.json();
    const project = projects.find(p => p.id === id);

    if (!project) return alert('Progetto non trovato');

    document.getElementById('projectId').value = project.id;
    document.getElementById('projectTitle').value = project.title;
    document.getElementById('projectDescription').value = project.description || '';
    document.getElementById('projectCategory').value = project.category || '';
    document.getElementById('formSubmitBtn').textContent = 'Aggiorna Lavoro';

    // Show existing images
    const container = document.getElementById('existingImages');
    container.innerHTML = project.images.map(img => `
      <div class="existing-image" data-image-id="${img.id}">
        <img src="/uploads/${img.filename}" alt="">
        <button class="remove-image" onclick="removeImage(${img.id}, this)" title="Rimuovi">&times;</button>
      </div>
    `).join('');

    formWrapper.style.display = 'block';
    addBtn.style.display = 'none';
    formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    alert('Errore nel caricamento del progetto');
  }
}

// ---- Delete project ----
async function deleteProject(id, title) {
  if (!confirm(`Sei sicuro di voler eliminare "${title}"?\nQuesta azione non è reversibile.`)) return;

  try {
    const res = await fetch(`/admin/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadProjects();
    } else {
      alert('Errore nella cancellazione');
    }
  } catch {
    alert('Errore di connessione');
  }
}

// ---- Remove single image ----
async function removeImage(imageId, btn) {
  if (!confirm('Rimuovere questa immagine?')) return;

  try {
    const res = await fetch(`/admin/api/images/${imageId}`, { method: 'DELETE' });
    if (res.ok) {
      btn.closest('.existing-image').remove();
    }
  } catch {
    alert('Errore nella rimozione immagine');
  }
}

// ---- File upload drag & drop visual feedback ----
const uploadArea = document.getElementById('fileUploadArea');
if (uploadArea) {
  ['dragenter', 'dragover'].forEach(evt => {
    uploadArea.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#E8751A';
      uploadArea.style.background = 'rgba(232,117,26,0.04)';
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    uploadArea.addEventListener(evt, () => {
      uploadArea.style.borderColor = '';
      uploadArea.style.background = '';
    });
  });
}

// ---- Init ----
checkAuth().then(ok => {
  if (ok) loadProjects();
});
