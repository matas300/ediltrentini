// ---- Navbar scroll effect ----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ---- Mobile menu toggle ----
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  navToggle.classList.toggle('active');
});

// Close menu on link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
    navToggle.classList.remove('active');
  });
});

// ---- Load projects ----
let allProjects = [];
let activeFilter = 'all';
let carouselInterval = null;

async function loadProjects() {
  const track = document.getElementById('projectsGrid');
  const empty = document.getElementById('projectsEmpty');
  const container = document.getElementById('carouselContainer');

  try {
    const res = await fetch('/api/projects');
    allProjects = await res.json();

    if (allProjects.length === 0) {
      container.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    container.style.display = '';
    empty.style.display = 'none';

    buildFilters(allProjects);
    renderProjects(allProjects);
    initCarousel();
  } catch (err) {
    console.error('Errore caricamento progetti:', err);
    container.style.display = 'none';
    empty.style.display = 'block';
  }
}

function buildFilters(projects) {
  const filtersContainer = document.getElementById('projectsFilters');
  const categories = [...new Set(projects.map(p => p.category).filter(Boolean))];

  if (categories.length === 0) {
    filtersContainer.style.display = 'none';
    return;
  }

  filtersContainer.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'Tutti';
  allBtn.addEventListener('click', () => filterProjects('all'));
  filtersContainer.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = cat;
    btn.addEventListener('click', () => filterProjects(cat));
    filtersContainer.appendChild(btn);
  });
}

function filterProjects(category) {
  activeFilter = category;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active',
      (category === 'all' && btn.textContent === 'Tutti') || btn.textContent === category
    );
  });

  const filtered = category === 'all'
    ? allProjects
    : allProjects.filter(p => p.category === category);

  renderProjects(filtered);

  const track = document.getElementById('projectsGrid');
  track.scrollLeft = 0;

  const empty = document.getElementById('projectsEmpty');
  const container = document.getElementById('carouselContainer');
  if (filtered.length === 0) {
    container.style.display = 'none';
    empty.style.display = 'block';
  } else {
    container.style.display = '';
    empty.style.display = 'none';
  }
}

function renderProjects(projects) {
  const track = document.getElementById('projectsGrid');
  track.innerHTML = '';

  projects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.onclick = () => openProjectModal(project);

    const coverImage = project.images.find(img => img.is_cover) || project.images[0];

    card.innerHTML = `
      ${coverImage
        ? `<img class="project-image" src="/uploads/${coverImage.filename}" alt="${project.title}" loading="lazy">`
        : `<div class="project-image-placeholder">
            <svg viewBox="0 0 48 48" fill="none"><rect x="4" y="8" width="40" height="32" rx="3" stroke="#999" stroke-width="2"/><circle cx="16" cy="20" r="4" stroke="#999" stroke-width="2"/><path d="M4,36 L16,26 L24,32 L36,20 L44,28" stroke="#999" stroke-width="2"/></svg>
          </div>`
      }
      <div class="project-body">
        ${project.category ? `<span class="project-category">${project.category}</span>` : ''}
        <h3>${project.title}</h3>
        <p>${project.description || ''}</p>
      </div>
    `;

    track.appendChild(card);
  });

  // Re-observe new cards for scroll animations
  document.querySelectorAll('.project-card').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

function initCarousel() {
  const track = document.getElementById('projectsGrid');
  const leftBtn = document.getElementById('carouselLeft');
  const rightBtn = document.getElementById('carouselRight');
  const scrollAmount = 374; // card width + gap

  leftBtn.addEventListener('click', () => {
    if (track.scrollLeft <= 0) {
      track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  });

  rightBtn.addEventListener('click', () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft >= maxScroll - 5) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  });

  // Auto-scroll
  function startAutoScroll() {
    stopAutoScroll();
    carouselInterval = setInterval(() => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 0) return;
      if (track.scrollLeft >= maxScroll - 5) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 5000);
  }

  function stopAutoScroll() {
    if (carouselInterval) {
      clearInterval(carouselInterval);
      carouselInterval = null;
    }
  }

  // Pause on hover
  const container = document.getElementById('carouselContainer');
  container.addEventListener('mouseenter', stopAutoScroll);
  container.addEventListener('mouseleave', startAutoScroll);

  // Touch support
  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoScroll();
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        rightBtn.click();
      } else {
        leftBtn.click();
      }
    }
    startAutoScroll();
  }, { passive: true });

  startAutoScroll();
}

// ---- Project modal ----
function openProjectModal(project) {
  const modal = document.getElementById('projectModal');
  const gallery = document.getElementById('modalGallery');
  const title = document.getElementById('modalTitle');
  const desc = document.getElementById('modalDescription');
  const cat = document.getElementById('modalCategory');

  title.textContent = project.title;
  desc.textContent = project.description || '';
  cat.textContent = project.category || '';
  cat.style.display = project.category ? '' : 'none';

  gallery.innerHTML = '';
  if (project.images && project.images.length > 0) {
    project.images.forEach(img => {
      const imgEl = document.createElement('img');
      imgEl.src = '/uploads/' + img.filename;
      imgEl.alt = project.title;
      gallery.appendChild(imgEl);
    });
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('projectModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

function closeModal() {
  document.getElementById('projectModal').classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ---- Contact form ----
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Invio in corso...';

  const body = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone?.value || '',
    service: form.service?.value || '',
    message: form.message.value,
  };

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();
    form.style.display = 'none';
    document.getElementById('formSuccess').style.display = 'block';
  } catch {
    btn.disabled = false;
    btn.textContent = 'Invia Richiesta';
    alert('Errore durante l\'invio. Riprova o contattaci direttamente per email.');
  }
});

// ---- Scroll animations ----
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.service-card, .contact-card').forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});

// ---- Init ----
loadProjects();
