// Основная логика веб-приложения ПАО «Северсталь»

document.addEventListener("DOMContentLoaded", () => {
  const data = window.SAFETY_DATA;
  const STORAGE_KEY = "severstal_safety_progress_v1";

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
    } catch {
      // Игнорируем, если localStorage недоступен
    }
  }

  // Элементы экранов
  const homeScreen = document.getElementById("homeScreen");
  const professionScreen = document.getElementById("professionScreen");
  const professionsGrid = document.getElementById("professionsGrid");

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

  // Элементы вкладок
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = {
    video: document.getElementById("tabPanelVideo"),
    infographic: document.getElementById("tabPanelInfographic"),
    ppe: document.getElementById("tabPanelPpe"),
    quiz: document.getElementById("tabPanelQuiz")
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
  const checklistItems = document.getElementById("checklistItems");
  const checklistProgress = document.getElementById("checklistProgress");
  const quizContainer = document.getElementById("quizContainer");
  const resetQuizBtn = document.getElementById("resetQuizBtn");
  const docsDownloadList = document.getElementById("docsDownloadList");

  // Модальные окна: Глоссарий и Памятка мастеру
  const glossaryDialog = document.getElementById("glossaryDialog");
  const openGlossaryBtn = document.getElementById("openGlossaryBtn");
  const closeGlossaryBtn = document.getElementById("closeGlossaryBtn");
  const glossarySearch = document.getElementById("glossarySearch");
  const glossaryList = document.getElementById("glossaryList");

  const masterDialog = document.getElementById("masterDialog");
  const openMasterBtn = document.getElementById("openMasterBtn");
  const closeMasterBtn = document.getElementById("closeMasterBtn");
  const masterGuideList = document.getElementById("masterGuideList");

  const imageZoomDialog = document.getElementById("imageZoomDialog");
  const zoomImage = document.getElementById("zoomImage");
  const zoomCaption = document.getElementById("zoomCaption");
  const closeZoomBtn = document.getElementById("closeZoomBtn");

  let currentProfession = null;
  let currentBriefing = data.briefingTypes[0];

  // 1. Отрисовка карточек профессий (лёгкие .webp)
  function renderProfessions() {
    professionsGrid.innerHTML = "";
    data.professions.forEach((prof) => {
      const isPassed = Boolean(progress.passedQuizzes[prof.id]);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "prof-card";
      card.innerHTML = `
        <img class="prof-card-img" src="media/professions/${prof.id}.webp" alt="${prof.title}">
        <div class="prof-card-top">
          <span class="prof-card-dept">${prof.department}</span>
          ${isPassed ? '<span class="prof-card-done">&#10003; Тест пройден</span>' : ""}
        </div>
        <span class="prof-card-title">${prof.title}</span>
        <span class="prof-card-desc">${prof.description}</span>
        <span class="prof-card-cta">Открыть инструктаж &rarr;</span>
      `;
      card.addEventListener("click", () => openProfession(prof));
      professionsGrid.appendChild(card);
    });
  }

  // 2. Открытие экрана конкретной профессии
  function openProfession(prof) {
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

    // Сбрасываем активную вкладку на "Видео" при входе в профессию
    switchTab("video");

    renderBriefingButtons();
    renderBriefingContent();
    renderPoster();
    renderPpeTab();
    renderDocs();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 3. Отрисовка 5 кнопок видов инструктажей
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

  // 4. Заполнение контента выбранного инструктажа
  function renderBriefingContent() {
    metaPeriod.textContent = currentBriefing.period;
    metaInstructor.textContent = currentBriefing.instructor;

    briefingTitle.textContent = `${currentBriefing.name} инструктаж`;
    briefingSummary.textContent = `${currentBriefing.desc}`;
    const focusText = currentProfession.briefingFocus[currentBriefing.id] || "";
    briefingFocusBox.innerHTML = `<strong>Главный акцент этого инструктажа:</strong> ${focusText}`;

    // Видео и текстовая расшифровка
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
      briefingStatusPill.textContent = "Памятка и тест готовы • видео в разработке";
      briefingVideo.pause();
      videoPlayerWrap.hidden = true;
      videoPlaceholderWrap.hidden = false;
      videoTranscriptBox.hidden = true;
      videoPlaceholderText.textContent = `Видео для: "${currentProfession.title}" (${currentBriefing.name} инструктаж).`;
    }

    // Риски, СИЗ, запреты, ЧС
    document.getElementById("risksList").innerHTML = currentProfession.risks.map((r) => `<li>${r}</li>`).join("");
    document.getElementById("ppeList").innerHTML = currentProfession.ppe.map((p) => `<li>${p}</li>`).join("");
    document.getElementById("forbiddenList").innerHTML = currentProfession.forbidden.map((f) => `<li>${f}</li>`).join("");
    document.getElementById("emergencyList").innerHTML = currentProfession.emergency.map((e) => `<li>${e}</li>`).join("");

    // Популярные ошибки и последствия СИЗ
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

    document.getElementById("ppeConsequencesList").innerHTML = currentProfession.ppeConsequences
      .map(
        (c) => `
      <div class="consequence-card">
        <div class="consequence-action">&#9888; ${c.item}</div>
        <div class="consequence-result">&rarr; <strong>Последствие:</strong> ${c.consequence}</div>
      </div>
    `
      )
      .join("");

    renderChecklist();
    renderQuiz(currentProfession.quiz);
  }

  // Вкладка СИЗ (показывает крупное фото СИЗ с увеличением по клику)
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
  }

  function updateChecklistCounter() {
    const total = currentProfession.checklist.length;
    let checkedCount = 0;
    currentProfession.checklist.forEach((_, idx) => {
      if (progress.checks[`${currentProfession.id}_${idx}`]) checkedCount++;
    });
    checklistProgress.textContent = `${checkedCount} / ${total}`;
  }

  // Генератор плаката А4
  function renderPoster() {
    posterContainer.innerHTML = `
      <div class="poster-head">
        <div>
          <img src="media/brand/logo_white.png" alt="Северсталь" style="height: 36px; margin-bottom: 4px; display: block;">
          <div style="font-size: 0.78rem; opacity: 0.85;">ПАМЯТКА ПО ОХРАНЕ ТРУДА • ${currentProfession.iotNumber}</div>
          <h4>${currentProfession.title}</h4>
        </div>
        <span style="background:#e30613; padding:4px 10px; border-radius:6px; font-weight:700; font-size:0.8rem;">TOP-10 РИСКОВ</span>
      </div>
      <div class="poster-grid">
        <div class="poster-box">
          <h5>&#9888; Главные опасности</h5>
          <ul>${currentProfession.risks.map((r) => `<li>${r}</li>`).join("")}</ul>
        </div>
        <div class="poster-box">
          <h5>&#129466; Обязательные СИЗ</h5>
          <ul>${currentProfession.ppe.map((p) => `<li>${p}</li>`).join("")}</ul>
        </div>
        <div class="poster-box">
          <h5>&#128683; Запрещено (ИОТ)</h5>
          <ul>${currentProfession.forbidden.map((f) => `<li>${f}</li>`).join("")}</ul>
        </div>
        <div class="poster-box">
          <h5>&#128680; Действия при ЧС</h5>
          <ol>${currentProfession.emergency.map((e) => `<li>${e}</li>`).join("")}</ol>
        </div>
      </div>
    `;
  }

  printPosterBtn.addEventListener("click", () => window.print());

  // Кнопки скачивания официальных PDF-инструкций
  function renderDocs() {
    const docs = currentProfession.docs || [];
    docsDownloadList.innerHTML = docs
      .map(
        (d) => `
      <a class="doc-download-btn" href="${d.file}" download target="_blank" rel="noopener">
        <span>&#128229; ${d.title}</span>
        <span class="doc-size-tag">${d.size}</span>
      </a>
    `
      )
      .join("");
  }

  // 5. Тест (10 вопросов, зачёт от 80%)
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
    if (currentProfession) {
      renderQuiz(currentProfession.quiz);
    }
  });

  // 6. Переключение вкладок
  function switchTab(target) {
    tabButtons.forEach((b) => {
      const isActive = b.dataset.tab === target;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", String(isActive));
    });
    Object.keys(tabPanels).forEach((key) => {
      tabPanels[key].hidden = key !== target;
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Возврат на главную
  function goHome() {
    briefingVideo.pause();
    professionScreen.hidden = true;
    homeScreen.hidden = false;
    renderProfessions();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  backToHomeBtn.addEventListener("click", goHome);
  document.getElementById("brandHomeBtn").addEventListener("click", goHome);

  // 7. Глоссарий с поиском
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

  // 8. Памятка мастеру / руководителю цеха
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

  renderProfessions();
});
