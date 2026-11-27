// Основная логика веб-приложения ПАО «Северсталь» (v12)

document.addEventListener("DOMContentLoaded", () => {
  const data = window.SAFETY_DATA;
  const STORAGE_KEY = "severstal_safety_progress_v1";
  const JOURNAL_KEY = "severstal_demo_journal_v1";
  const FEEDBACK_KEY = "severstal_demo_feedback_v1";
  const DOCS_UNLOCK_KEY = "severstal_docs_unlocked_v1";
  // Пароль для просмотра/скачивания PDF (141otz141) — проверяется по SHA-256
  const SHARED_PASS_HASH = "ec95e177f99cec044567e838340bae7a4c89371963d7c72bb9b3a48b3bf0ac04";

  let progress = loadProgress();

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { checks: {}, passedQuizzes: {} };
    } catch {
      return { checks: {}, passedQuizzes: {} };
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {}
  }

  async function sha256(str) {
    if (window.crypto && window.crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    return str === "141otz141" ? SHARED_PASS_HASH : "";
  }

  // Элементы экранов, дашборда и поиска
  const homeScreen = document.getElementById("homeScreen");
  const professionScreen = document.getElementById("professionScreen");
  const professionsGrid = document.getElementById("professionsGrid");
  const profSearchInput = document.getElementById("profSearchInput");
  const riskFilterBar = document.getElementById("riskFilterBar");

  const dashReadyBadge = document.getElementById("dashReadyBadge");
  const dashProgressFill = document.getElementById("dashProgressFill");
  const dashTestsCount = document.getElementById("dashTestsCount");
  const dashChecksCount = document.getElementById("dashChecksCount");
  const dashJournalCount = document.getElementById("dashJournalCount");

  const heroQuickVideoBtn = document.getElementById("heroQuickVideoBtn");
  const heroQuickSosBtn = document.getElementById("heroQuickSosBtn");
  const quickVideoDialog = document.getElementById("quickVideoDialog");
  const quickVideoPlayer = document.getElementById("quickVideoPlayer");
  const closeQuickVideoBtn = document.getElementById("closeQuickVideoBtn");

  // Элементы экрана профессии
  const backToHomeBtn = document.getElementById("backToHomeBtn");
  const profBadge = document.getElementById("profBadge");
  const profIotBadge = document.getElementById("profIotBadge");
  const profHeaderImg = document.getElementById("profHeaderImg");
  const profTitle = document.getElementById("profTitle");
  const profDesc = document.getElementById("profDesc");
  const briefingButtons = document.getElementById("briefingButtons");
  const metaPeriod = document.getElementById("metaPeriod");
  const metaInstructor = document.getElementById("metaInstructor");
  const briefingTitle = document.getElementById("briefingTitle");
  const briefingStatusPill = document.getElementById("briefingStatusPill");
  const briefingSummary = document.getElementById("briefingSummary");
  const briefingFocusBox = document.getElementById("briefingFocusBox");

  // Левое боковое меню, мобильный Drawer (☰) и панели разделов
  const sideButtons = document.querySelectorAll(".side-btn");
  const sidebarNav = document.getElementById("sidebarNav");
  const openDrawerBtn = document.getElementById("openDrawerBtn");
  const headerDrawerBtn = document.getElementById("headerDrawerBtn");
  const closeDrawerBtn = document.getElementById("closeDrawerBtn");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const mobileCurrentSectionLabel = document.getElementById("mobileCurrentSectionLabel");
  const sectionPanels = {
    video: document.getElementById("secPanelVideo"),
    ppe: document.getElementById("secPanelPpe"),
    risks: document.getElementById("secPanelRisks"),
    mistakes: document.getElementById("secPanelMistakes"),
    emergency: document.getElementById("secPanelEmergency"),
    checklist: document.getElementById("secPanelChecklist"),
    poster: document.getElementById("secPanelPoster"),
    quiz: document.getElementById("secPanelQuiz"),
    docs: document.getElementById("secPanelDocs")
  };

  const videoPlayerWrap = document.getElementById("videoPlayerWrap");
  const videoPlaceholderWrap = document.getElementById("videoPlaceholderWrap");
  const briefingVideo = document.getElementById("briefingVideo");
  const videoPlaceholderText = document.getElementById("videoPlaceholderText");
  const videoTranscriptBox = document.getElementById("videoTranscriptBox");
  const videoTranscriptBody = document.getElementById("videoTranscriptBody");
  const posterContainer = document.getElementById("posterContainer");
  const printPosterBtn = document.getElementById("printPosterBtn");
  const ppeTabCards = document.getElementById("ppeTabCards");
  const emergencyCasesList = document.getElementById("emergencyCasesList");
  const checklistItems = document.getElementById("checklistItems");
  const checklistProgress = document.getElementById("checklistProgress");
  const sidebarCheckBadge = document.getElementById("sidebarCheckBadge");
  const quizContainer = document.getElementById("quizContainer");
  const resetQuizBtn = document.getElementById("resetQuizBtn");
  const docsDownloadList = document.getElementById("docsDownloadList");

  // Элементы замка и просмотрщика PDF
  const docsLockBox = document.getElementById("docsLockBox");
  const docsUnlockedBox = document.getElementById("docsUnlockedBox");
  const docsPassInput = document.getElementById("docsPassInput");
  const docsUnlockBtn = document.getElementById("docsUnlockBtn");
  const docsPassError = document.getElementById("docsPassError");
  const docsLockAgainBtn = document.getElementById("docsLockAgainBtn");
  const pdfViewerDialog = document.getElementById("pdfViewerDialog");
  const pdfViewerTitle = document.getElementById("pdfViewerTitle");
  const pdfViewerFrame = document.getElementById("pdfViewerFrame");
  const pdfOpenTabLink = document.getElementById("pdfOpenTabLink");
  const pdfDownloadLink = document.getElementById("pdfDownloadLink");
  const closePdfViewerBtn = document.getElementById("closePdfViewerBtn");

  // Модальные окна
  const glossaryDialog = document.getElementById("glossaryDialog");
  const openGlossaryBtn = document.getElementById("openGlossaryBtn");
  const closeGlossaryBtn = document.getElementById("closeGlossaryBtn");
  const glossarySearch = document.getElementById("glossarySearch");
  const glossaryList = document.getElementById("glossaryList");

  const masterDialog = document.getElementById("masterDialog");
  const openMasterBtn = document.getElementById("openMasterBtn");
  const closeMasterBtn = document.getElementById("closeMasterBtn");
  const masterGuideList = document.getElementById("masterGuideList");

  const sosDialog = document.getElementById("sosDialog");
  const openSosBtn = document.getElementById("openSosBtn");
  const openSosFromTabBtn = document.getElementById("openSosFromTabBtn");
  const closeSosBtn = document.getElementById("closeSosBtn");
  const sosBody = document.getElementById("sosBody");

  const imageZoomDialog = document.getElementById("imageZoomDialog");
  const zoomImage = document.getElementById("zoomImage");
  const zoomCaption = document.getElementById("zoomCaption");
  const closeZoomBtn = document.getElementById("closeZoomBtn");

  const journalAllDialog = document.getElementById("journalAllDialog");
  const openJournalAllBtn = document.getElementById("openJournalAllBtn");
  const closeJournalAllBtn = document.getElementById("closeJournalAllBtn");
  const journalAllBody = document.getElementById("journalAllBody");
  const clearJournalBtn = document.getElementById("clearJournalBtn");

  let currentProfession = null;
  let currentBriefing = data.briefingTypes[0];
  let currentSection = "video";
  let currentRiskFilter = "all";

  // Обновление живого дашборда прогресса в Split-Hero
  function updateHomeDashboard() {
    const totalProfs = data.professions.length;
    const passedCount = data.professions.filter((p) => Boolean(progress.passedQuizzes[p.id])).length;
    const totalChecks = data.professions.reduce((s, p) => s + p.checklist.length, 0);
    const doneChecks = data.professions.reduce(
      (s, p) => s + p.checklist.filter((_, idx) => Boolean(progress.checks[`${p.id}_${idx}`])).length,
      0
    );
    const journalCount = getJournalHistory().length;
    const pct = Math.round(((passedCount + (doneChecks / Math.max(1, totalChecks)) * totalProfs) / (totalProfs * 2)) * 100);

    dashReadyBadge.textContent = `${pct}%`;
    dashProgressFill.style.width = `${pct}%`;
    dashTestsCount.textContent = `${passedCount} / ${totalProfs}`;
    dashChecksCount.textContent = `${doneChecks} / ${totalChecks}`;
    dashJournalCount.textContent = String(journalCount);
  }

  // Полоса фильтров TOP-10 рисков
  function renderRiskFilters() {
    riskFilterBar.innerHTML = data.riskFilters
      .map(
        (f) =>
          `<button type="button" class="risk-chip${f.id === currentRiskFilter ? " active" : ""}" data-risk="${f.id}">${f.label}</button>`
      )
      .join("");

    riskFilterBar.querySelectorAll(".risk-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentRiskFilter = btn.dataset.risk;
        renderRiskFilters();
        renderProfessions(profSearchInput.value);
      });
    });
  }

  // Быстрый просмотр вводного ролика прямо с главной
  heroQuickVideoBtn.addEventListener("click", () => {
    quickVideoDialog.showModal();
  });
  closeQuickVideoBtn.addEventListener("click", () => {
    quickVideoPlayer.pause();
    quickVideoDialog.close();
  });
  quickVideoDialog.addEventListener("click", (e) => {
    if (e.target === quickVideoDialog) {
      quickVideoPlayer.pause();
      quickVideoDialog.close();
    }
  });
  heroQuickSosBtn.addEventListener("click", openSosModal);

  // 1. Отрисовка информативных карточек профессий (поиск + фильтр рисков)
  function renderProfessions(filter = "") {
    const q = filter.trim().toLowerCase();
    const list = data.professions.filter((p) => {
      const matchesText =
        p.title.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.iotNumber.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchesRisk = currentRiskFilter === "all" || (p.riskTags && p.riskTags.includes(currentRiskFilter));
      return matchesText && matchesRisk;
    });

    professionsGrid.innerHTML = "";
    if (!list.length) {
      professionsGrid.innerHTML = '<p class="muted">По выбранному фильтру профессия не найдена.</p>';
      return;
    }

    list.forEach((prof) => {
      const isPassed = Boolean(progress.passedQuizzes[prof.id]);
      const chkDone = prof.checklist.filter((_, idx) => Boolean(progress.checks[`${prof.id}_${idx}`])).length;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "prof-card";
      card.innerHTML = `
        <img class="prof-card-img" src="media/professions/${prof.id}.webp" alt="${prof.title}">
        <div class="prof-card-top">
          <span class="prof-card-dept">${prof.department}</span>
          ${isPassed ? '<span class="prof-card-done">&#10003; Сдано</span>' : ""}
        </div>
        <span class="prof-card-title">${prof.title}</span>
        <span class="prof-card-desc">${prof.description}</span>
        <div class="prof-card-meta-row">
          <span class="prof-card-iot">${prof.iotNumber}</span>
          <span>${prof.iotPages} стр. • Чек: ${chkDone}/${prof.checklist.length}</span>
        </div>
        <span class="prof-card-cta">Открыть инструктаж &rarr;</span>
      `;
      card.addEventListener("click", () => openProfession(prof, "video", true));
      professionsGrid.appendChild(card);
    });
    updateHomeDashboard();
  }

  profSearchInput.addEventListener("input", (e) => renderProfessions(e.target.value));

  // 2. Открытие профессии (с поддержкой кнопки «Назад» через History API)
  function openProfession(prof, section = "video", pushHistory = true) {
    currentProfession = prof;
    currentBriefing = data.briefingTypes[0];

    profBadge.textContent = prof.department;
    profIotBadge.textContent = `На базе ${prof.iotNumber} (${prof.iotPages} стр. оригинала)`;
    profHeaderImg.src = `media/professions_square/${prof.id}.webp`;
    profHeaderImg.alt = prof.title;
    profTitle.textContent = prof.title;
    profDesc.textContent = prof.description;

    homeScreen.hidden = true;
    professionScreen.hidden = false;
    headerDrawerBtn.hidden = false;

    switchSection(section, false);
    renderBriefingButtons();
    renderBriefingContent();
    renderPoster();
    renderPpeTab();
    renderEmergencyCases();
    renderDocsState();

    if (pushHistory) {
      try {
        history.pushState({ screen: "prof", profId: prof.id, section }, "", `?prof=${prof.id}`);
      } catch {}
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Возврат на главную (визуально)
  function showHomeScreen() {
    briefingVideo.pause();
    professionScreen.hidden = true;
    homeScreen.hidden = false;
    headerDrawerBtn.hidden = true;
    closeDrawer();
    currentProfession = null;
    renderProfessions(profSearchInput.value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Кнопка "Все профессии" и логотип
  function goHome(pushHistory = true) {
    if (pushHistory && !professionScreen.hidden) {
      try {
        history.pushState({ screen: "home" }, "", window.location.pathname);
      } catch {}
    }
    showHomeScreen();
  }

  backToHomeBtn.addEventListener("click", () => goHome(true));
  document.getElementById("brandHomeBtn").addEventListener("click", () => goHome(true));

  // Обработка системной кнопки «Назад» в браузере / на телефоне
  window.addEventListener("popstate", (e) => {
    const state = e.state;
    const params = new URLSearchParams(window.location.search);
    const profId = (state && state.profId) || params.get("prof");

    if (profId) {
      const found = data.professions.find((p) => p.id === profId);
      if (found) {
        if (!currentProfession || currentProfession.id !== found.id) {
          openProfession(found, (state && state.section) || "video", false);
        } else if (state && state.section) {
          switchSection(state.section, false);
        }
        return;
      }
    }
    showHomeScreen();
  });

  // 3. Переключение разделов левого бокового меню + мобильный Drawer (☰)
  function openDrawer() {
    sidebarNav.classList.add("open");
    drawerBackdrop.hidden = false;
    document.body.classList.add("drawer-open");
    openDrawerBtn.setAttribute("aria-expanded", "true");
  }

  function closeDrawer() {
    sidebarNav.classList.remove("open");
    drawerBackdrop.hidden = true;
    document.body.classList.remove("drawer-open");
    openDrawerBtn.setAttribute("aria-expanded", "false");
  }

  openDrawerBtn.addEventListener("click", openDrawer);
  headerDrawerBtn.addEventListener("click", openDrawer);
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);

  function switchSection(target, pushHistory = true) {
    currentSection = target;
    if (target !== "video") {
      briefingVideo.pause();
    }
    sideButtons.forEach((b) => {
      const isActive = b.dataset.section === target;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", String(isActive));
      if (isActive && mobileCurrentSectionLabel) {
        const labelSpan = b.querySelector("span:nth-child(2)");
        if (labelSpan) mobileCurrentSectionLabel.textContent = labelSpan.textContent;
      }
    });
    Object.keys(sectionPanels).forEach((key) => {
      const active = key === target;
      sectionPanels[key].hidden = !active;
      sectionPanels[key].classList.toggle("active", active);
    });
    closeDrawer();

    if (pushHistory && currentProfession) {
      try {
        history.pushState(
          { screen: "prof", profId: currentProfession.id, section: target },
          "",
          `?prof=${currentProfession.id}&sec=${target}`
        );
      } catch {}
    }
  }

  sideButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchSection(btn.dataset.section, true));
  });

  // 4. 5 кнопок видов инструктажей
  function renderBriefingButtons() {
    briefingButtons.innerHTML = "";
    data.briefingTypes.forEach((bType) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "briefing-btn" + (bType.id === currentBriefing.id ? " active" : "");
      btn.textContent = bType.name;
      btn.addEventListener("click", () => {
        currentBriefing = bType;
        renderBriefingButtons();
        renderBriefingContent();
      });
      briefingButtons.appendChild(btn);
    });
  }

  // 5. Заполнение контента выбранного инструктажа
  function renderBriefingContent() {
    metaPeriod.textContent = currentBriefing.period;
    metaInstructor.textContent = currentBriefing.instructor;

    briefingTitle.textContent = `${currentBriefing.name} инструктаж`;
    briefingSummary.textContent = `${currentBriefing.desc}`;
    const focusText = currentProfession.briefingFocus[currentBriefing.id] || "";
    briefingFocusBox.innerHTML = `<strong>Главный акцент этого инструктажа:</strong> ${focusText}`;

    if (currentBriefing.id === "vvodny") {
      briefingStatusPill.textContent = "Видеоролик доступен";
      const videoSrc = "media/videos/vvodny.mp4";
      if (briefingVideo.getAttribute("src") !== videoSrc) {
        briefingVideo.setAttribute("src", videoSrc);
        briefingVideo.load();
      }
      videoPlayerWrap.hidden = false;
      videoPlaceholderWrap.hidden = true;
      videoTranscriptBox.hidden = false;
      videoTranscriptBody.innerHTML = data.vvodnyTranscript.map((line) => `<p>${line}</p>`).join("");
    } else {
      briefingStatusPill.textContent = "Памятка, ЧС и тест готовы • видео в разработке";
      briefingVideo.pause();
      videoPlayerWrap.hidden = true;
      videoPlaceholderWrap.hidden = false;
      videoTranscriptBox.hidden = true;
      videoPlaceholderText.textContent = `Видео для: "${currentProfession.title}" (${currentBriefing.name} инструктаж).`;
    }

    document.getElementById("risksList").innerHTML = currentProfession.risks.map((r) => `<li>${r}</li>`).join("");
    document.getElementById("forbiddenList").innerHTML = currentProfession.forbidden.map((f) => `<li>${f}</li>`).join("");
    document.getElementById("emergencyList").innerHTML = currentProfession.emergency.map((e) => `<li>${e}</li>`).join("");

    document.getElementById("mistakesList").innerHTML = currentProfession.mistakes
      .map(
        (m) => `
      <div class="consequence-card">
        <div class="consequence-action">&#10060; Ошибка: ${m.action}</div>
        <div class="consequence-result">&rarr; <strong>Последствие:</strong> ${m.consequence}</div>
      </div>
    `
      )
      .join("");

    renderChecklist();
    renderQuiz(currentProfession.quiz);
  }

  // Вкладка СИЗ с зумом
  function renderPpeTab() {
    ppeTabCards.innerHTML = currentProfession.ppe
      .map((item, idx) => {
        const conseq = currentProfession.ppeConsequences[idx];
        const imgPath = `media/ppe/${currentProfession.id}_${idx + 1}.webp`;
        return `
        <div class="ppe-card">
          <div class="ppe-card-photo">
            <img src="${imgPath}" alt="${item}" data-zoom-title="${item}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <span style="display:none;">Место для фото СИЗ<br>(<code>${imgPath}</code>)</span>
          </div>
          <div class="ppe-card-title">${item}</div>
          ${conseq ? `<div class="ppe-card-conseq"><strong>Если не надеть:</strong> ${conseq.consequence}</div>` : ""}
        </div>
      `;
      })
      .join("");

    ppeTabCards.querySelectorAll("img").forEach((img) => {
      img.addEventListener("click", () => {
        zoomImage.src = img.src;
        zoomImage.alt = img.alt;
        zoomCaption.textContent = img.dataset.zoomTitle || "Просмотр СИЗ";
        imageZoomDialog.showModal();
      });
    });
  }

  closeZoomBtn.addEventListener("click", () => imageZoomDialog.close());
  imageZoomDialog.addEventListener("click", (e) => {
    if (e.target === imageZoomDialog) imageZoomDialog.close();
  });

  // Аварии / ЧС (6 подробных кейсов)
  function renderEmergencyCases() {
    const cases = currentProfession.emergencies || [];
    emergencyCasesList.innerHTML = cases
      .map(
        (c) => `
      <div class="emerg-case-card">
        <div class="emerg-case-title">${c.title}</div>
        <div class="emerg-case-cause"><strong>Причина:</strong> ${c.cause}</div>
        <ol>${c.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      </div>
    `
      )
      .join("");
  }

  function renderChecklist() {
    checklistItems.innerHTML = "";
    const total = currentProfession.checklist.length;
    let checkedCount = 0;

    currentProfession.checklist.forEach((item, idx) => {
      const key = `${currentProfession.id}_${idx}`;
      const isChecked = Boolean(progress.checks[key]);
      if (isChecked) checkedCount++;

      const li = document.createElement("li");
      const id = `chk-${key}`;
      li.innerHTML = `
        <input type="checkbox" id="${id}" ${isChecked ? "checked" : ""}>
        <label for="${id}">${item}</label>
      `;
      const checkbox = li.querySelector("input");
      checkbox.addEventListener("change", () => {
        progress.checks[key] = checkbox.checked;
        saveProgress();
        updateChecklistCounter();
      });
      checklistItems.appendChild(li);
    });

    checklistProgress.textContent = `${checkedCount} / ${total}`;
    sidebarCheckBadge.textContent = `${checkedCount}/${total}`;
  }

  function updateChecklistCounter() {
    const total = currentProfession.checklist.length;
    let checkedCount = 0;
    currentProfession.checklist.forEach((_, idx) => {
      if (progress.checks[`${currentProfession.id}_${idx}`]) checkedCount++;
    });
    checklistProgress.textContent = `${checkedCount} / ${total}`;
    sidebarCheckBadge.textContent = `${checkedCount}/${total}`;
  }

  // Плакат А4 с QR-кодом
  function renderPoster() {
    posterContainer.innerHTML = `
      <div class="poster-head poster-head-light">
        <div class="poster-head-left">
          <img src="media/brand/logo_color.png" alt="Северсталь" class="poster-logo">
          <div>
            <div class="poster-iot-label">ПАМЯТКА ПО ОХРАНЕ ТРУДА • ${currentProfession.iotNumber}</div>
            <h4 class="poster-title">${currentProfession.title}</h4>
          </div>
        </div>
        <div class="poster-head-right">
          <img src="media/professions_square/${currentProfession.id}.webp" alt="" class="poster-prof-img">
          <span class="poster-risk-badge">TOP-10 РИСКОВ</span>
        </div>
      </div>
      <div class="poster-grid">
        <div class="poster-box poster-box-risk">
          <h5>&#9888; Главные опасности</h5>
          <ul>${currentProfession.risks.map((r) => `<li>${r}</li>`).join("")}</ul>
        </div>
        <div class="poster-box poster-box-ppe">
          <h5>&#129466; Обязательные СИЗ</h5>
          <ul>${currentProfession.ppe.map((p) => `<li>${p}</li>`).join("")}</ul>
        </div>
        <div class="poster-box poster-box-forbidden">
          <h5>&#128683; Запрещено (ИОТ)</h5>
          <ul>${currentProfession.forbidden.map((f) => `<li>${f}</li>`).join("")}</ul>
        </div>
        <div class="poster-box poster-box-emergency">
          <h5>&#128680; Действия при ЧС</h5>
          <ol>${currentProfession.emergency.map((e) => `<li>${e}</li>`).join("")}</ol>
        </div>
      </div>
      <div class="poster-footer-qr">
        <div>
          <strong>Чек-лист перед сменой:</strong> ${currentProfession.checklist.join(" • ")}
        </div>
        <div class="poster-qr-box">
          <img src="media/qr/${currentProfession.id}.png" alt="QR-код инструктажа" class="poster-qr-img">
          <div style="font-size: 0.74rem; color: var(--muted); max-width: 120px;">
            Сканируйте для видео и теста с телефона
          </div>
        </div>
      </div>
    `;
  }

  printPosterBtn.addEventListener("click", () => window.print());

  // Раздел PDF с защитой паролем и встроенным просмотром без скачивания
  function isDocsUnlocked() {
    try {
      return sessionStorage.getItem(DOCS_UNLOCK_KEY) === "1";
    } catch {
      return false;
    }
  }

  function renderDocsState() {
    const unlocked = isDocsUnlocked();
    docsLockBox.hidden = unlocked;
    docsUnlockedBox.hidden = !unlocked;
    docsPassError.hidden = true;
    if (unlocked) {
      renderDocsList();
    }
  }

  function renderDocsList() {
    const docs = currentProfession.docs || [];
    docsDownloadList.innerHTML = docs
      .map(
        (d, idx) => `
      <div class="doc-card-row">
        <div class="doc-card-top">
          <span>&#128196; ${d.title}</span>
          <span class="doc-size-tag">${d.size}</span>
        </div>
        <div class="doc-card-actions">
          <button type="button" class="btn btn-primary-sm doc-view-btn" data-doc-idx="${idx}">
            &#128065; Открыть на сайте
          </button>
          <a class="btn btn-secondary btn-sm" href="${d.file}" download style="text-decoration:none;">
            &#128229; Скачать PDF
          </a>
        </div>
      </div>
    `
      )
      .join("");

    docsDownloadList.querySelectorAll(".doc-view-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const doc = docs[Number(btn.dataset.docIdx)];
        if (!doc) return;
        pdfViewerTitle.textContent = doc.title;
        pdfViewerFrame.src = doc.file;
        pdfOpenTabLink.href = doc.file;
        pdfDownloadLink.href = doc.file;
        pdfViewerDialog.showModal();
      });
    });
  }

  docsUnlockBtn.addEventListener("click", async () => {
    const hash = await sha256(docsPassInput.value);
    if (hash === SHARED_PASS_HASH) {
      try {
        sessionStorage.setItem(DOCS_UNLOCK_KEY, "1");
      } catch {}
      docsPassInput.value = "";
      renderDocsState();
    } else {
      docsPassError.hidden = false;
    }
  });

  docsPassInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") docsUnlockBtn.click();
  });

  docsLockAgainBtn.addEventListener("click", () => {
    try {
      sessionStorage.removeItem(DOCS_UNLOCK_KEY);
    } catch {}
    renderDocsState();
  });

  closePdfViewerBtn.addEventListener("click", () => {
    pdfViewerFrame.src = "";
    pdfViewerDialog.close();
  });
  pdfViewerDialog.addEventListener("click", (e) => {
    if (e.target === pdfViewerDialog) {
      pdfViewerFrame.src = "";
      pdfViewerDialog.close();
    }
  });

  // Тест (15 вопросов)
  function renderQuiz(questions) {
    quizContainer.innerHTML = "";
    let answered = 0;
    let score = 0;

    const scoreBox = document.createElement("div");
    scoreBox.className = "quiz-score";
    scoreBox.hidden = true;

    questions.forEach((q, qIdx) => {
      const box = document.createElement("div");
      box.className = "quiz-question-box";
      box.innerHTML = `<p><strong>${qIdx + 1}. ${q.question}</strong></p>`;

      q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-option";
        btn.textContent = opt;
        btn.addEventListener("click", () => {
          const allBtns = box.querySelectorAll(".quiz-option");
          allBtns.forEach((b) => (b.disabled = true));
          answered++;
          if (idx === q.correctIndex) {
            btn.classList.add("correct");
            score++;
          } else {
            btn.classList.add("wrong");
            allBtns[q.correctIndex].classList.add("correct");
          }
          if (answered === questions.length) {
            scoreBox.hidden = false;
            const passThreshold = Math.ceil(questions.length * 0.8);
            const passed = score >= passThreshold;
            scoreBox.textContent = `Результат: ${score} из ${questions.length} (${Math.round((score / questions.length) * 100)}%). ${
              passed ? "Отлично! Инструктаж усвоен." : `Для зачёта нужно минимум ${passThreshold} правильных ответа. Попробуйте ещё раз.`
            }`;
            if (passed) {
              progress.passedQuizzes[currentProfession.id] = true;
              saveProgress();
            }
          }
        });
        box.appendChild(btn);
      });

      quizContainer.appendChild(box);
    });

    quizContainer.appendChild(scoreBox);
  }

  resetQuizBtn.addEventListener("click", () => {
    if (currentProfession) renderQuiz(currentProfession.quiz);
  });

  // Глоссарий
  function renderGlossary(filter = "") {
    const q = filter.trim().toLowerCase();
    const items = data.glossary.filter(
      (g) => g.term.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q)
    );
    glossaryList.innerHTML = items.length
      ? items
          .map(
            (g) => `
          <div class="glossary-item">
            <strong>${g.term}</strong><br>
            <span class="muted">${g.desc}</span>
          </div>
        `
          )
          .join("")
      : '<p class="muted">Ничего не найдено.</p>';
  }

  glossarySearch.addEventListener("input", (e) => renderGlossary(e.target.value));
  openGlossaryBtn.addEventListener("click", () => {
    glossarySearch.value = "";
    renderGlossary();
    glossaryDialog.showModal();
  });
  closeGlossaryBtn.addEventListener("click", () => glossaryDialog.close());
  glossaryDialog.addEventListener("click", (e) => {
    if (e.target === glossaryDialog) glossaryDialog.close();
  });

  // Памятка мастеру
  masterGuideList.innerHTML = data.masterGuide
    .map(
      (m) => `
      <div class="glossary-item">
        <strong>${m.step}</strong><br>
        <span class="muted">${m.text}</span>
      </div>
    `
    )
    .join("");

  openMasterBtn.addEventListener("click", () => masterDialog.showModal());
  closeMasterBtn.addEventListener("click", () => masterDialog.close());
  masterDialog.addEventListener("click", (e) => {
    if (e.target === masterDialog) masterDialog.close();
  });

  // SOS-модалка
  function openSosModal() {
    const phonesHtml = data.sosGuide.phones
      .map(
        (p) => `
      <div class="sos-phone-card">
        <div style="font-size:0.78rem; color:var(--muted);">${p.name}</div>
        <div class="sos-phone-num">${p.number}</div>
      </div>
    `
      )
      .join("");

    const cardsHtml = data.sosGuide.cards
      .map(
        (c) => `
      <div class="emerg-case-card" style="margin-bottom:10px;">
        <div class="emerg-case-title">${c.title}</div>
        <ol>${c.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      </div>
    `
      )
      .join("");

    sosBody.innerHTML = `
      <h4 style="margin:0 0 8px; color:var(--accent);">Экстренные телефоны</h4>
      <div class="sos-phones-grid">${phonesHtml}</div>
      <h4 style="margin:10px 0 8px; color:var(--primary);">Первая помощь в первые 60 секунд</h4>
      ${cardsHtml}
    `;
    sosDialog.showModal();
  }

  openSosBtn.addEventListener("click", openSosModal);
  openSosFromTabBtn.addEventListener("click", openSosModal);
  closeSosBtn.addEventListener("click", () => sosDialog.close());
  sosDialog.addEventListener("click", (e) => {
    if (e.target === sosDialog) sosDialog.close();
  });

  // Сводный Электронный журнал
  function getJournalHistory() {
    try {
      return JSON.parse(localStorage.getItem(JOURNAL_KEY)) || [];
    } catch {
      return [];
    }
  }

  function renderAllJournal() {
    const items = getJournalHistory();
    if (!items.length) {
      journalAllBody.innerHTML =
        '<p class="muted">Записей пока нет. Откройте любую профессию &rarr; «Тест (15) и журнал» &rarr; «Сформировать протокол».</p>';
      return;
    }
    journalAllBody.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="journal-table">
          <thead>
            <tr>
              <th>№ записи</th>
              <th>Дата</th>
              <th>Работник</th>
              <th>Профессия</th>
              <th>Инструктаж</th>
              <th>Итог</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (it) => `
              <tr>
                <td><strong>${it.id}</strong></td>
                <td>${it.date}</td>
                <td>${it.worker}</td>
                <td>${it.prof}</td>
                <td>${it.briefing}</td>
                <td>${it.result}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  openJournalAllBtn.addEventListener("click", () => {
    renderAllJournal();
    journalAllDialog.showModal();
  });
  closeJournalAllBtn.addEventListener("click", () => journalAllDialog.close());
  journalAllDialog.addEventListener("click", (e) => {
    if (e.target === journalAllDialog) journalAllDialog.close();
  });
  clearJournalBtn.addEventListener("click", () => {
    localStorage.removeItem(JOURNAL_KEY);
    renderAllJournal();
    updateHomeDashboard();
  });

  // Демо-протокол из раздела Тест
  (function initProtocolDialog() {
    const openBtn = document.getElementById("openProtocolBtn");
    const closeBtn = document.getElementById("closeProtocolBtn");
    const genBtn = document.getElementById("generateProtocolBtn");
    const printBtn = document.getElementById("printProtocolBtn");
    const dialog = document.getElementById("protocolDialog");
    const preview = document.getElementById("protocolPreview");
    const actions = document.getElementById("protocolActions");
    const histWrap = document.getElementById("journalHistoryWrap");
    const histList = document.getElementById("journalHistoryList");

    function renderHistory() {
      const items = getJournalHistory();
      if (!items.length) {
        histWrap.hidden = true;
        return;
      }
      histWrap.hidden = false;
      histList.innerHTML = items
        .map((it) => `<li><strong>${it.id}</strong> • ${it.date} — ${it.worker} (${it.prof}) — ${it.result}</li>`)
        .join("");
    }

    function buildProtocol(saveToJournal) {
      const worker = document.getElementById("protoWorkerName").value.trim() || "Иванов Иван Иванович";
      const tabNum = document.getElementById("protoTabNum").value.trim() || "48291";
      const master = document.getElementById("protoMasterName").value.trim() || "Петров А.С.";
      const profTitleText = profTitle.textContent;
      const dept = profBadge.textContent;
      const iot = profIotBadge.textContent;
      const briefing = briefingTitle.textContent;
      const chk = checklistProgress.textContent;
      const quizScoreText = document.querySelector(".quiz-score:not([hidden])")?.textContent;

      const now = new Date();
      const dateStr = now.toLocaleDateString("ru-RU") + " " + now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      const recordId = "SEV-" + now.getFullYear() + "-" + String(Math.floor(1000 + Math.random() * 9000));
      const resultLabel = quizScoreText ? quizScoreText.split(".")[0] : "Демо-режим (тест не завершён)";
      const isOk = quizScoreText && !quizScoreText.includes("минимум");

      preview.innerHTML = `
        <div class="protocol-sheet-head">
          <img src="media/brand/logo_color.png" alt="Северсталь" style="height: 36px;">
          <span class="protocol-demo-stamp">ДЕМО-ПРОТОКОЛ (ПРИМЕР)</span>
        </div>
        <div style="font-weight: 700; color: var(--primary); margin-bottom: 6px;">
          ПРОТОКОЛ № ${recordId} ПРОХОЖДЕНИЯ ИНСТРУКТАЖА ПО ОХРАНЕ ТРУДА
        </div>
        <table class="protocol-table">
          <tr><td>Дата и время</td><td><strong>${dateStr}</strong></td></tr>
          <tr><td>Работник</td><td><strong>${worker}</strong> (таб. № ${tabNum})</td></tr>
          <tr><td>Подразделение</td><td>${dept}</td></tr>
          <tr><td>Профессия</td><td>${profTitleText}</td></tr>
          <tr><td>Вид инструктажа</td><td><strong>${briefing}</strong></td></tr>
          <tr><td>Основание</td><td>${iot}</td></tr>
          <tr><td>Чек-лист СИЗ</td><td>Отмечено пунктов: <strong>${chk}</strong></td></tr>
          <tr><td>Проверка знаний</td><td><span class="${isOk ? "protocol-status-ok" : "protocol-status-pending"}">${resultLabel}</span></td></tr>
          <tr><td>Инструктирующий</td><td>${master} (подтверждено в системе)</td></tr>
        </table>
        <div style="font-size: 0.76rem; color: var(--muted); margin-top: 8px;">
          * Учебный демонстрационный образец для защиты проекта ЧГУ.
        </div>
      `;
      actions.hidden = false;

      if (saveToJournal) {
        const history = getJournalHistory();
        history.unshift({ id: recordId, date: dateStr, worker, prof: profTitleText, briefing, result: resultLabel });
        try {
          localStorage.setItem(JOURNAL_KEY, JSON.stringify(history.slice(0, 20)));
        } catch {}
        renderHistory();
      }
    }

    openBtn.addEventListener("click", () => {
      buildProtocol(false);
      renderHistory();
      dialog.showModal();
    });
    genBtn.addEventListener("click", () => buildProtocol(true));
    printBtn.addEventListener("click", () => window.print());
    closeBtn.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  })();

  // Обратная связь + Панель разработчика (ot1ze)
  (function initFeedback() {
    const GOOGLE_SCRIPT_URL = "";
    const AUTH_USER = "ot1ze";

    const dialog = document.getElementById("feedbackDialog");
    const openBtns = [document.getElementById("openFeedbackBtn"), document.getElementById("footerFeedbackBtn")];
    const closeBtn = document.getElementById("closeFeedbackBtn");
    const userPane = document.getElementById("feedbackUserPane");
    const adminPane = document.getElementById("feedbackAdminPane");

    const starBtns = document.querySelectorAll(".star-btn");
    const formWrap = document.getElementById("feedbackFormWrap");
    const commentInput = document.getElementById("feedbackComment");
    const authorInput = document.getElementById("feedbackAuthor");
    const sendBtn = document.getElementById("sendFeedbackBtn");
    const statusBox = document.getElementById("feedbackStatus");

    const toggleDevBtn = document.getElementById("toggleDevLoginBtn");
    const devLoginBox = document.getElementById("devLoginBox");
    const devLoginInput = document.getElementById("devLoginInput");
    const devPassInput = document.getElementById("devPassInput");
    const devLoginBtn = document.getElementById("devLoginBtn");
    const devLoginError = document.getElementById("devLoginError");

    const refreshReviewsBtn = document.getElementById("refreshReviewsBtn");
    const exportReviewsCsvBtn = document.getElementById("exportReviewsCsvBtn");
    const devLogoutBtn = document.getElementById("devLogoutBtn");
    const adminKpiCards = document.getElementById("adminKpiCards");
    const adminReviewsList = document.getElementById("adminReviewsList");

    let selectedRating = 0;
    let cachedReviews = [];

    function getLocalReviews() {
      try {
        return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
      } catch {
        return [];
      }
    }

    async function loadAllReviews() {
      let list = getLocalReviews();
      if (GOOGLE_SCRIPT_URL) {
        try {
          const res = await fetch(GOOGLE_SCRIPT_URL);
          const remote = await res.json();
          if (Array.isArray(remote)) list = remote;
        } catch {}
      }
      cachedReviews = list;
      renderAdminReviews(list);
    }

    function renderAdminReviews(list) {
      const total = list.length;
      const avg = total ? (list.reduce((s, r) => s + Number(r.rating || 0), 0) / total).toFixed(1) : "—";
      const positive = total ? Math.round((list.filter((r) => Number(r.rating) >= 4).length / total) * 100) : 0;

      adminKpiCards.innerHTML = `
        <div class="admin-kpi-card">
          <div class="admin-kpi-val">${total}</div>
          <div class="admin-kpi-lbl">Всего отзывов</div>
        </div>
        <div class="admin-kpi-card">
          <div class="admin-kpi-val">${avg} &#9733;</div>
          <div class="admin-kpi-lbl">Средняя оценка</div>
        </div>
        <div class="admin-kpi-card">
          <div class="admin-kpi-val">${total ? positive + "%" : "—"}</div>
          <div class="admin-kpi-lbl">Положительных (KPI &ge; 80%)</div>
        </div>
      `;

      if (!total) {
        adminReviewsList.innerHTML = '<p class="muted">Отзывов пока нет.</p>';
        return;
      }

      adminReviewsList.innerHTML = `
        <table class="journal-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Оценка</th>
              <th>Автор</th>
              <th>Комментарий</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (r) => `
              <tr>
                <td>${r.date || ""}</td>
                <td><strong>${r.rating} &#9733;</strong></td>
                <td>${r.author || "Аноним"}</td>
                <td>${r.comment || ""}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    }

    openBtns.forEach((b) => {
      if (b) {
        b.addEventListener("click", () => {
          statusBox.hidden = true;
          devLoginError.hidden = true;
          dialog.showModal();
        });
      }
    });
    closeBtn.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });

    starBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedRating = Number(btn.dataset.val);
        starBtns.forEach((s) => s.classList.toggle("selected", Number(s.dataset.val) === selectedRating));
        formWrap.hidden = false;
        statusBox.hidden = true;
      });
    });

    sendBtn.addEventListener("click", async () => {
      if (!selectedRating) return;
      const comment = commentInput.value.trim() || "Без комментария";
      const author = authorInput.value.trim() || "Анонимный участник";
      const entry = { rating: selectedRating, comment, author, date: new Date().toLocaleString("ru-RU") };

      sendBtn.disabled = true;
      sendBtn.textContent = "Сохранение...";

      try {
        const list = getLocalReviews();
        list.unshift(entry);
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list));
      } catch {}

      if (GOOGLE_SCRIPT_URL) {
        try {
          await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry)
          });
        } catch {}
      }

      statusBox.textContent = `Спасибо! Ваша оценка (${selectedRating} ★) сохранена.`;
      statusBox.hidden = false;
      sendBtn.disabled = false;
      sendBtn.textContent = "Отправить отзыв";
      commentInput.value = "";
    });

    toggleDevBtn.addEventListener("click", () => {
      devLoginBox.hidden = !devLoginBox.hidden;
    });

    devLoginBtn.addEventListener("click", async () => {
      const login = devLoginInput.value.trim();
      const passHash = await sha256(devPassInput.value);
      if (login === AUTH_USER && passHash === SHARED_PASS_HASH) {
        devLoginError.hidden = true;
        userPane.hidden = true;
        adminPane.hidden = false;
        loadAllReviews();
      } else {
        devLoginError.hidden = false;
      }
    });

    devLogoutBtn.addEventListener("click", () => {
      adminPane.hidden = true;
      userPane.hidden = false;
      devPassInput.value = "";
    });

    refreshReviewsBtn.addEventListener("click", loadAllReviews);

    exportReviewsCsvBtn.addEventListener("click", () => {
      if (!cachedReviews.length) return;
      const rows = [["Дата", "Оценка", "Автор", "Комментарий"], ...cachedReviews.map((r) => [r.date, r.rating, r.author, r.comment])];
      const csv = "\uFEFF" + rows.map((row) => row.map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(";")).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      a.download = "reviews_severstal.csv";
      a.click();
    });
  })();

  // Старт приложения + инициализация фильтров, дашборда и QR-ссылок (?prof=...&sec=...)
  renderRiskFilters();
  renderProfessions();
  const params = new URLSearchParams(window.location.search);
  const startProfId = params.get("prof");
  const startSec = params.get("sec") || "video";
  if (startProfId) {
    const found = data.professions.find((p) => p.id === startProfId);
    if (found) {
      try {
        history.replaceState({ screen: "home" }, "", window.location.pathname);
        history.pushState({ screen: "prof", profId: found.id, section: startSec }, "", `?prof=${found.id}`);
      } catch {}
      openProfession(found, startSec, false);
    }
  } else {
    try {
      history.replaceState({ screen: "home" }, "", window.location.pathname);
    } catch {}
  }
});
