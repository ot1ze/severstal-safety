// Основная логика веб-приложения ПАО «Северсталь»

document.addEventListener("DOMContentLoaded", () => {
  const data = window.SAFETY_DATA;
  const STORAGE_KEY = "severstal_safety_progress_v1";
  const JOURNAL_KEY = "severstal_demo_journal_v1";
  const FEEDBACK_KEY = "severstal_demo_feedback_v1";

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

  // Элементы экранов и поиска
  const homeScreen = document.getElementById("homeScreen");
  const professionScreen = document.getElementById("professionScreen");
  const professionsGrid = document.getElementById("professionsGrid");
  const profSearchInput = document.getElementById("profSearchInput");

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
    emergency: document.getElementById("tabPanelEmergency"),
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
  const emergencyCasesList = document.getElementById("emergencyCasesList");
  const checklistItems = document.getElementById("checklistItems");
  const checklistProgress = document.getElementById("checklistProgress");
  const quizContainer = document.getElementById("quizContainer");
  const resetQuizBtn = document.getElementById("resetQuizBtn");
  const docsDownloadList = document.getElementById("docsDownloadList");

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

  // 1. Отрисовка карточек профессий с живым поиском
  function renderProfessions(filter = "") {
    const q = filter.trim().toLowerCase();
    const list = data.professions.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.iotNumber.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );

    professionsGrid.innerHTML = "";
    if (!list.length) {
      professionsGrid.innerHTML = '<p class="muted">По вашему запросу профессия не найдена.</p>';
      return;
    }

    list.forEach((prof) => {
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

  profSearchInput.addEventListener("input", (e) => renderProfessions(e.target.value));

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

    switchTab("video");

    renderBriefingButtons();
    renderBriefingContent();
    renderPoster();
    renderPpeTab();
    renderEmergencyCases();
    renderDocs();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 3. 5 кнопок видов инструктажей
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
    document.getElementById("ppeList").innerHTML = currentProfession.ppe.map((p) => `<li>${p}</li>`).join("");
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

  // Вкладка Аварии / ЧС (6 подробных кейсов)
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
  }

  function updateChecklistCounter() {
    const total = currentProfession.checklist.length;
    let checkedCount = 0;
    currentProfession.checklist.forEach((_, idx) => {
      if (progress.checks[`${currentProfession.id}_${idx}`]) checkedCount++;
    });
    checklistProgress.textContent = `${checkedCount} / ${total}`;
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

  // Кнопки скачивания PDF-инструкций
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

  // 5. Тест (15 вопросов, зачёт от 80%)
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
    renderProfessions(profSearchInput.value);
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

  // 8. Памятка мастеру
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

  // 9. Экстренная памятка SOS
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

  // 10. Сводный Электронный журнал из шапки
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
        '<p class="muted">Записей пока нет. Откройте любую профессию &rarr; вкладка «Тест (15)» &rarr; «Сформировать протокол».</p>';
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
  });

  // 11. Демо-протокол из вкладки Тест
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

  // 12. Обратная связь (1-5 звёзд + отправка на mevostriakov@chsu.ru)
  (function initFeedback() {
    const dialog = document.getElementById("feedbackDialog");
    const openBtns = [document.getElementById("openFeedbackBtn"), document.getElementById("footerFeedbackBtn")];
    const closeBtn = document.getElementById("closeFeedbackBtn");
    const starBtns = document.querySelectorAll(".star-btn");
    const formWrap = document.getElementById("feedbackFormWrap");
    const commentInput = document.getElementById("feedbackComment");
    const authorInput = document.getElementById("feedbackAuthor");
    const sendBtn = document.getElementById("sendFeedbackBtn");
    const statusBox = document.getElementById("feedbackStatus");

    let selectedRating = 0;

    openBtns.forEach((b) => {
      if (b) {
        b.addEventListener("click", () => {
          statusBox.hidden = true;
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

      sendBtn.disabled = true;
      sendBtn.textContent = "Отправка...";

      // Сохраняем локально
      try {
        const list = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
        list.unshift({ rating: selectedRating, comment, author, date: new Date().toLocaleString("ru-RU") });
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list));
      } catch {}

      // Отправляем через FormSubmit.co на mevostriakov@chsu.ru
      try {
        const res = await fetch("https://formsubmit.co/ajax/mevostriakov@chsu.ru", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: `Оценка проекта «Инструктажи Северсталь»: ${selectedRating}/5`,
            Оценка: `${selectedRating} из 5`,
            Комментарий: comment,
            Автор: author
          })
        });
        if (res.ok) {
          statusBox.textContent = `Спасибо! Оценка (${selectedRating}/5) отправлена на mevostriakov@chsu.ru.`;
        } else {
          throw new Error("FormSubmit error");
        }
      } catch {
        const subject = encodeURIComponent(`Оценка проекта Северсталь: ${selectedRating}/5`);
        const body = encodeURIComponent(`Оценка: ${selectedRating} из 5\nАвтор: ${author}\nКомментарий: ${comment}`);
        statusBox.innerHTML = `Отзыв сохранён на устройстве! <a href="mailto:mevostriakov@chsu.ru?subject=${subject}&body=${body}">Нажмите здесь, чтобы открыть почту и отправить письмо</a>.`;
      }

      statusBox.hidden = false;
      sendBtn.disabled = false;
      sendBtn.textContent = "Отправить отзыв на mevostriakov@chsu.ru";
      commentInput.value = "";
    });
  })();

  // Старт приложения + поддержка прямой ссылки по QR-коду (?prof=steelmaker)
  renderProfessions();
  const params = new URLSearchParams(window.location.search);
  const startProfId = params.get("prof");
  if (startProfId) {
    const found = data.professions.find((p) => p.id === startProfId);
    if (found) openProfession(found);
  }
});
