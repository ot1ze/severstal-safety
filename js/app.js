// Основная логика веб-приложения (простой и понятный JS без лишних библиотек)

document.addEventListener("DOMContentLoaded", () => {
  const data = window.SAFETY_DATA;

  // Элементы экранов
  const homeScreen = document.getElementById("homeScreen");
  const professionScreen = document.getElementById("professionScreen");
  const professionsGrid = document.getElementById("professionsGrid");

  // Элементы экрана профессии
  const backToHomeBtn = document.getElementById("backToHomeBtn");
  const profBadge = document.getElementById("profBadge");
  const profTitle = document.getElementById("profTitle");
  const profDesc = document.getElementById("profDesc");
  const briefingButtons = document.getElementById("briefingButtons");
  const briefingTitle = document.getElementById("briefingTitle");
  const briefingSummary = document.getElementById("briefingSummary");

  // Элементы вкладок
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = {
    video: document.getElementById("tabPanelVideo"),
    infographic: document.getElementById("tabPanelInfographic"),
    checklist: document.getElementById("tabPanelChecklist"),
    quiz: document.getElementById("tabPanelQuiz")
  };
  const videoPlaceholderText = document.getElementById("videoPlaceholderText");
  const infoPlaceholderText = document.getElementById("infoPlaceholderText");
  const checklistItems = document.getElementById("checklistItems");
  const quizContainer = document.getElementById("quizContainer");

  // Глоссарий (нативный <dialog>)
  const glossaryDialog = document.getElementById("glossaryDialog");
  const openGlossaryBtn = document.getElementById("openGlossaryBtn");
  const closeGlossaryBtn = document.getElementById("closeGlossaryBtn");
  const glossaryList = document.getElementById("glossaryList");

  let currentProfession = null;
  let currentBriefing = data.briefingTypes[0];

  // 1. Отрисовка карточек профессий на главном экране
  function renderProfessions() {
    professionsGrid.innerHTML = "";
    data.professions.forEach((prof) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "prof-card";
      card.innerHTML = `
        <span class="prof-card-dept">${prof.department}</span>
        <span class="prof-card-title">${prof.title}</span>
        <span class="prof-card-desc">${prof.description}</span>
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
    profTitle.textContent = prof.title;
    profDesc.textContent = prof.description;

    homeScreen.hidden = true;
    professionScreen.hidden = false;

    renderBriefingButtons();
    renderBriefingContent();
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
    briefingTitle.textContent = `${currentBriefing.name} инструктаж`;
    briefingSummary.textContent = `${currentBriefing.desc} Профессия: ${currentProfession.title}.`;

    videoPlaceholderText.textContent = `Видео для: "${currentProfession.title}" (${currentBriefing.name} инструктаж).`;
    infoPlaceholderText.textContent = `Инфографика для: "${currentProfession.title}" (${currentBriefing.name} инструктаж).`;

    // Риски, СИЗ, запреты, ЧС
    document.getElementById("risksList").innerHTML = currentProfession.risks.map((r) => `<li>${r}</li>`).join("");
    document.getElementById("ppeList").innerHTML = currentProfession.ppe.map((p) => `<li>${p}</li>`).join("");
    document.getElementById("forbiddenList").innerHTML = currentProfession.forbidden.map((f) => `<li>${f}</li>`).join("");
    document.getElementById("emergencyList").innerHTML = currentProfession.emergency.map((e) => `<li>${e}</li>`).join("");

    // Чек-лист
    checklistItems.innerHTML = "";
    currentProfession.checklist.forEach((item, idx) => {
      const li = document.createElement("li");
      const id = `chk-${currentProfession.id}-${idx}`;
      li.innerHTML = `
        <input type="checkbox" id="${id}">
        <label for="${id}">${item}</label>
      `;
      checklistItems.appendChild(li);
    });

    // Мини-тест (3 вопроса)
    renderQuiz(currentProfession.quiz);
  }

  // 5. Отрисовка мини-теста из нескольких вопросов
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
            scoreBox.textContent = `Результат: ${score} из ${questions.length} правильных ответов`;
          }
        });
        box.appendChild(btn);
      });

      quizContainer.appendChild(box);
    });

    quizContainer.appendChild(scoreBox);
  }

  // 6. Переключение вкладок (Видео / Инфографика / Памятка / Тест)
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabButtons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      Object.keys(tabPanels).forEach((key) => {
        tabPanels[key].hidden = key !== target;
      });
    });
  });

  // Кнопка "Назад"
  backToHomeBtn.addEventListener("click", () => {
    professionScreen.hidden = true;
    homeScreen.hidden = false;
  });

  // 7. Глоссарий (модальное окно <dialog>)
  glossaryList.innerHTML = data.glossary
    .map(
      (g) => `
      <div class="glossary-item">
        <strong>${g.term}</strong><br>
        <span class="muted">${g.desc}</span>
      </div>
    `
    )
    .join("");

  openGlossaryBtn.addEventListener("click", () => glossaryDialog.showModal());
  closeGlossaryBtn.addEventListener("click", () => glossaryDialog.close());
  // Закрытие по клику на тёмный фон вокруг окна
  glossaryDialog.addEventListener("click", (e) => {
    if (e.target === glossaryDialog) {
      glossaryDialog.close();
    }
  });

  // Старт приложения
  renderProfessions();
});
