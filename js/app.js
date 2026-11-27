// Основная логика веб-приложения ПАО «Северсталь» (v16)

document.addEventListener("DOMContentLoaded", () => {
  const data = window.SAFETY_DATA;
  const JOURNAL_KEY = "severstal_demo_journal_v1";
  const FEEDBACK_KEY = "severstal_demo_feedback_v1";
  const DOCS_UNLOCK_KEY = "severstal_docs_unlocked_v1";
  const DOCS_BYPASS_KEY = "severstal_admin_docs_bypass_v1";
  const ACCOUNTS_KEY = "severstal_worker_accounts_v1";
  const ACTIVE_ACC_KEY = "severstal_active_account_id_v1";
  const ACC_PROGRESS_KEY = "severstal_account_progress_v1";
  // Пароль администратора ot1ze (141otz141) и пароль к файлам ИОТ (CHSUtest) — SHA-256
  const ADMIN_PASS_HASH = "ec95e177f99cec044567e838340bae7a4c89371963d7c72bb9b3a48b3bf0ac04";
  const DOCS_PASS_HASH = "25e41fe823700e204bedef5118c42054bf7606d2f3a94df0458042bda8755644";

  // Облачная БД Supabase (общая синхронизация аккаунтов, прогресса, прав на PDF и отзывов)
  const SUPABASE_URL = "https://tciamdbjtowgszhtpmxv.supabase.co";
  const SUPABASE_KEY = "sb_publishable_9OXj_DBXXLC39lzJeG5C5A_dYPITKHG";

  async function sbFetch(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.message) msg = parsed.message;
      } catch {}
      throw new Error(msg);
    }
    return text ? JSON.parse(text) : null;
  }

  function mapRowToAccount(row) {
    return {
      id: row.id,
      fullName: row.full_name,
      tabNum: row.tab_num || "",
      profId: row.prof_id,
      passHash: row.pass_hash,
      canAccessDocs: Boolean(row.can_access_docs),
      createdAt: row.created_at
    };
  }

  async function syncAccountsFromCloud() {
    try {
      const rows = await sbFetch("worker_accounts?select=*&order=created_at.asc");
      if (!Array.isArray(rows)) return false;
      const accounts = rows.map(mapRowToAccount);
      const progMap = {};
      rows.forEach((r) => {
        progMap[r.id] = r.progress && typeof r.progress === "object" ? r.progress : { checks: {}, passedQuizzes: {} };
      });
      saveAccounts(accounts);
      localStorage.setItem(ACC_PROGRESS_KEY, JSON.stringify(progMap));
      return true;
    } catch {
      return false;
    }
  }

  async function cloudInsertAccount(acc, accProg) {
    try {
      await sbFetch("worker_accounts", {
        method: "POST",
        body: JSON.stringify({
          id: acc.id,
          full_name: acc.fullName,
          tab_num: acc.tabNum || "",
          prof_id: acc.profId,
          pass_hash: acc.passHash,
          can_access_docs: Boolean(acc.canAccessDocs),
          progress: accProg || { checks: {}, passedQuizzes: {} }
        })
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : "Ошибка сети" };
    }
  }

  async function cloudUpsertAccount(acc, accProg) {
    try {
      await sbFetch("worker_accounts?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          id: acc.id,
          full_name: acc.fullName,
          tab_num: acc.tabNum || "",
          prof_id: acc.profId,
          pass_hash: acc.passHash,
          can_access_docs: Boolean(acc.canAccessDocs),
          progress: accProg || { checks: {}, passedQuizzes: {} }
        })
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : "Ошибка сети" };
    }
  }

  async function cloudDeleteAccount(accId) {
    try {
      await sbFetch(`worker_accounts?id=eq.${encodeURIComponent(accId)}`, { method: "DELETE" });
    } catch {}
  }

  const guestProgress = { checks: {}, passedQuizzes: {} };

  function loadAccounts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveAccounts(list) {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
    } catch {}
  }

  function getActiveAccount() {
    try {
      const id = localStorage.getItem(ACTIVE_ACC_KEY);
      if (!id) return null;
      return loadAccounts().find((a) => a.id === id) || null;
    } catch {
      return null;
    }
  }

  function setActiveAccountId(id) {
    try {
      if (id) localStorage.setItem(ACTIVE_ACC_KEY, id);
      else localStorage.removeItem(ACTIVE_ACC_KEY);
    } catch {}
  }

  function loadAllAccProgress() {
    try {
      return JSON.parse(localStorage.getItem(ACC_PROGRESS_KEY)) || {};
    } catch {
      return {};
    }
  }

  function getAccountProgress(accId) {
    const map = loadAllAccProgress();
    return map[accId] || { checks: {}, passedQuizzes: {} };
  }

  function loadProgress() {
    const acc = getActiveAccount();
    return acc ? getAccountProgress(acc.id) : guestProgress;
  }

  let progress = loadProgress();

  function saveProgress() {
    const acc = getActiveAccount();
    if (!acc) return;
    try {
      const map = loadAllAccProgress();
      map[acc.id] = progress;
      localStorage.setItem(ACC_PROGRESS_KEY, JSON.stringify(map));
    } catch {}
    sbFetch(`worker_accounts?id=eq.${encodeURIComponent(acc.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ progress })
    }).catch(() => {});
  }

  async function sha256(str) {
    if (window.crypto && window.crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    if (str === "141otz141") return ADMIN_PASS_HASH;
    if (str === "CHSUtest") return DOCS_PASS_HASH;
    return "";
  }

  async function hashWorkerPass(str) {
    if (window.crypto && window.crypto.subtle) {
      return "s:" + (await sha256(str));
    }
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "f:" + (h >>> 0).toString(16);
  }

  // Элементы экранов, дашборда и поиска
  const homeScreen = document.getElementById("homeScreen");
  const professionScreen = document.getElementById("professionScreen");
  const professionsGrid = document.getElementById("professionsGrid");
  const profSearchInput = document.getElementById("profSearchInput");
  const riskFilterBar = document.getElementById("riskFilterBar");

  const openAccountBtn = document.getElementById("openAccountBtn");
  const headerAccountLabel = document.getElementById("headerAccountLabel");
  const heroGuestBox = document.getElementById("heroGuestBox");
  const heroDashboard = document.getElementById("heroDashboard");
  const heroCreateAccBtn = document.getElementById("heroCreateAccBtn");
  const heroLoginAccBtn = document.getElementById("heroLoginAccBtn");

  const dashProfTitle = document.getElementById("dashProfTitle");
  const dashProfThumb = document.getElementById("dashProfThumb");
  const dashWorkerMeta = document.getElementById("dashWorkerMeta");
  const dashReadyBadge = document.getElementById("dashReadyBadge");
  const dashProgressFill = document.getElementById("dashProgressFill");
  const dashTestStatus = document.getElementById("dashTestStatus");
  const dashChecksCount = document.getElementById("dashChecksCount");
  const dashJournalCount = document.getElementById("dashJournalCount");
  const dashIotCode = document.getElementById("dashIotCode");
  const dashIotPages = document.getElementById("dashIotPages");
  const dashOpenMyProfBtn = document.getElementById("dashOpenMyProfBtn");
  const dashManageAccBtn = document.getElementById("dashManageAccBtn");

  const checklistSubtitle = document.getElementById("checklistSubtitle");
  const checklistGuestHint = document.getElementById("checklistGuestHint");
  const quizGuestHint = document.getElementById("quizGuestHint");

  // Элементы интерактивного обучения (онбординга)
  const onboardingTopSlot = document.getElementById("onboardingTopSlot");
  const onboardingArchiveSlot = document.getElementById("onboardingArchiveSlot");
  const onbStepPill = document.getElementById("onbStepPill");
  const onbTitle = document.getElementById("onbTitle");
  const onbDesc = document.getElementById("onbDesc");
  const onbHintLine = document.getElementById("onbHintLine");
  const onbPrevBtn = document.getElementById("onbPrevBtn");
  const onbNextBtn = document.getElementById("onbNextBtn");
  const onbSkipBtn = document.getElementById("onbSkipBtn");
  const restartOnboardingBtn = document.getElementById("restartOnboardingBtn");

  const heroQuickVideoBtn = document.getElementById("heroQuickVideoBtn");
  const heroQuickSosBtn = document.getElementById("heroQuickSosBtn");
  const quickVideoDialog = document.getElementById("quickVideoDialog");
  const quickVideoPlayer = document.getElementById("quickVideoPlayer");
  const closeQuickVideoBtn = document.getElementById("closeQuickVideoBtn");

  // Элементы экрана профессии
  const backToHomeBtn = document.getElementById("backToHomeBtn");
  const profBadge = document.getElementById("profBadge");
  const profIotBadge = document.getElementById("profIotBadge");
  const profHeaderEmblem = document.getElementById("profHeaderEmblem");
  const profHeaderSceneBtn = document.getElementById("profHeaderSceneBtn");
  const profHeaderSceneImg = document.getElementById("profHeaderSceneImg");
  const ppeShowcaseBox = document.getElementById("ppeShowcaseBox");
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
  const docsAccessSourceLabel = document.getElementById("docsAccessSourceLabel");
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

  // Расчёт персонального статуса обучения для конкретной специальности работника
  function computeAccountStatus(acc) {
    const prof = data.professions.find((p) => p.id === acc.profId) || data.professions[0];
    const accProg = getAccountProgress(acc.id);
    const totalChecks = prof.checklist.length;
    const doneChecks = prof.checklist.filter((_, idx) => Boolean(accProg.checks[`${prof.id}_${idx}`])).length;
    const testPassed = Boolean(accProg.passedQuizzes[prof.id]);
    const pct = Math.round((doneChecks / Math.max(1, totalChecks)) * 50 + (testPassed ? 50 : 0));
    const myProtocols = getJournalHistory().filter((it) =>
      it.accountId ? it.accountId === acc.id && it.profId === prof.id : it.prof === prof.title
    ).length;
    return { prof, totalChecks, doneChecks, testPassed, pct, myProtocols };
  }

  function formatShortWorkerName(fullName) {
    const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "Профиль";
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  }

  function updateAccountUI() {
    const acc = getActiveAccount();
    progress = loadProgress();
    if (acc) {
      headerAccountLabel.textContent = formatShortWorkerName(acc.fullName);
      openAccountBtn.classList.add("signed-in");
      checklistGuestHint.hidden = true;
      quizGuestHint.hidden = true;
      checklistSubtitle.textContent = "Отметки сохраняются в вашем личном профиле";
    } else {
      headerAccountLabel.textContent = "Аккаунт";
      openAccountBtn.classList.remove("signed-in");
      checklistGuestHint.hidden = false;
      quizGuestHint.hidden = false;
      checklistSubtitle.textContent = "Гостевой режим (для сохранения статуса войдите в аккаунт)";
    }
    updateHomeDashboard();
    renderOnboardingState();
  }

  // Интерактивное краткое обучение по сайту (с подсветкой и стрелками)
  const ONBOARDING_STEPS = [
    {
      targetSelector: ".header-actions",
      pointerText: "↑ Главное меню и SOS",
      title: "Верхнее меню: экстренная помощь, журнал и профиль",
      desc: "Здесь всегда под рукой кнопка SOS (быстрый звонок с телефона), электронный журнал протоколов, методичка мастеру, глоссарий и ваш личный кабинет.",
      hint: "Подсвечено верхнее меню ↑"
    },
    {
      targetSelector: "#heroDashboard",
      pointerText: "↓ Ваш статус обучения",
      title: "Личный статус по вашей профессии",
      desc: "Здесь видно готовность по вашей специальности (чек-лист + тест). Кнопка «Открыть мою профессию» сразу откроет ваши инструкции.",
      hint: "Подсвечен блок вашего статуса ↓"
    },
    {
      targetSelector: "#riskFilterBar",
      pointerText: "↓ Фильтры рисков",
      title: "Быстрый отбор по смертельным рискам TOP-10",
      desc: "Нажимайте на нужный риск (расплав, газ CO, электроток, высота) или вводите название цеха/ИОТ в поиск справа.",
      hint: "Подсвечена панель фильтров ↓"
    },
    {
      targetSelector: "#professionsGrid",
      pointerText: "↓ Откройте профессию",
      title: "Карточки профессий и разделы внутри",
      desc: "Внутри специальности слева открывается меню: видеоролик, обязательные СИЗ, риски, ошибки, ЧС, чек-лист смены, плакат А4, тест (15 вопросов) и официальные PDF.",
      hint: "Подсвечен каталог профессий ↓"
    }
  ];

  let onbStepIndex = 0;
  let onbHighlightedEl = null;
  const onbPointerEl = document.createElement("div");
  onbPointerEl.className = "onb-pointer";
  onbPointerEl.hidden = true;
  document.body.appendChild(onbPointerEl);

  function positionOnboardingPointer() {
    if (!onbHighlightedEl || onboardingTopSlot.hidden || homeScreen.hidden) {
      onbPointerEl.hidden = true;
      return;
    }
    const rect = onbHighlightedEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      onbPointerEl.hidden = true;
      return;
    }
    onbPointerEl.hidden = false;
    const step = ONBOARDING_STEPS[onbStepIndex];
    onbPointerEl.textContent = step.pointerText;
    const pointerWidth = onbPointerEl.offsetWidth || 160;
    const left = Math.min(Math.max(10, rect.left + rect.width / 2 - pointerWidth / 2), window.innerWidth - pointerWidth - 10);
    const placeBelow = rect.top < 75;
    const top = placeBelow ? Math.min(rect.bottom + 8, window.innerHeight - 40) : Math.max(8, rect.top - 34);
    onbPointerEl.style.left = `${left}px`;
    onbPointerEl.style.top = `${top}px`;
  }

  function clearOnboardingHighlight() {
    if (onbHighlightedEl) {
      onbHighlightedEl.classList.remove("onb-highlight");
      onbHighlightedEl = null;
    }
    onbPointerEl.hidden = true;
  }

  function renderOnboardingState(shouldScroll = false) {
    const acc = getActiveAccount();
    clearOnboardingHighlight();

    if (!acc || homeScreen.hidden) {
      onboardingTopSlot.hidden = true;
      onboardingArchiveSlot.hidden = true;
      return;
    }

    if (progress.onboardingDone) {
      onboardingTopSlot.hidden = true;
      onboardingArchiveSlot.hidden = false;
      return;
    }

    onboardingArchiveSlot.hidden = true;
    onboardingTopSlot.hidden = false;

    const total = ONBOARDING_STEPS.length;
    if (onbStepIndex < 0) onbStepIndex = 0;
    if (onbStepIndex >= total) onbStepIndex = total - 1;
    const step = ONBOARDING_STEPS[onbStepIndex];

    onbStepPill.textContent = `Шаг ${onbStepIndex + 1} из ${total}`;
    onbTitle.textContent = step.title;
    onbDesc.textContent = step.desc;
    onbHintLine.textContent = step.hint;
    onbPrevBtn.hidden = onbStepIndex === 0;
    onbNextBtn.textContent = onbStepIndex === total - 1 ? "Всё понятно, завершить ✓" : "Далее →";

    const targetEl = document.querySelector(step.targetSelector);
    if (targetEl && !targetEl.hidden) {
      onbHighlightedEl = targetEl;
      targetEl.classList.add("onb-highlight");
      if (shouldScroll) {
        if (onbStepIndex === 0) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const headerEl = document.querySelector(".header");
          const topOffset = (headerEl ? headerEl.offsetHeight : 76) + onboardingTopSlot.offsetHeight + 48;
          const targetTop = targetEl.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: Math.max(0, targetTop - topOffset), behavior: "smooth" });
        }
      }
      positionOnboardingPointer();
    }
  }

  function finishOnboarding() {
    const acc = getActiveAccount();
    if (acc) {
      progress.onboardingDone = true;
      saveProgress();
    }
    clearOnboardingHighlight();
    renderOnboardingState(false);
  }

  onbPrevBtn.addEventListener("click", () => {
    if (onbStepIndex > 0) {
      onbStepIndex--;
      renderOnboardingState(true);
    }
  });

  onbNextBtn.addEventListener("click", () => {
    if (onbStepIndex < ONBOARDING_STEPS.length - 1) {
      onbStepIndex++;
      renderOnboardingState(true);
    } else {
      finishOnboarding();
    }
  });

  onbSkipBtn.addEventListener("click", finishOnboarding);

  restartOnboardingBtn.addEventListener("click", () => {
    const acc = getActiveAccount();
    if (!acc) return;
    progress.onboardingDone = false;
    saveProgress();
    onbStepIndex = 0;
    renderOnboardingState(true);
  });

  window.addEventListener("scroll", positionOnboardingPointer, { passive: true });
  window.addEventListener("resize", positionOnboardingPointer);

  function refreshAllAfterAccountChange() {
    updateAccountUI();
    renderProfessions(profSearchInput.value);
    if (currentProfession) {
      renderChecklist();
      renderQuiz(currentProfession.quiz);
      renderDocsState();
    }
  }

  // Живой дашборд статуса обучения: скрыт для гостя, персонализирован под специальность после входа
  function updateHomeDashboard() {
    const acc = getActiveAccount();
    if (!acc) {
      heroGuestBox.hidden = false;
      heroDashboard.hidden = true;
      return;
    }

    heroGuestBox.hidden = true;
    heroDashboard.hidden = false;

    const status = computeAccountStatus(acc);
    dashProfTitle.textContent = status.prof.title;
    dashProfThumb.src = `media/professions_square/${status.prof.id}.webp`;
    dashProfThumb.alt = status.prof.title;
    dashProfThumb.hidden = false;
    dashWorkerMeta.textContent = acc.tabNum ? `${acc.fullName} • Таб. №${acc.tabNum}` : acc.fullName;
    dashReadyBadge.textContent = `${status.pct}%`;
    dashProgressFill.style.width = `${status.pct}%`;
    dashTestStatus.textContent = status.testPassed ? "Сдан" : "Не сдан";
    dashChecksCount.textContent = `${status.doneChecks} / ${status.totalChecks}`;
    dashJournalCount.textContent = String(status.myProtocols);
    dashIotCode.textContent = status.prof.iotNumber;
    dashIotPages.textContent = `${status.prof.iotPages} стр. ИОТ`;
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

  // Минималистичные SVG-эмблемы и акценты для каждой профессии (чтобы карточки сразу различались)
  const PROFESSION_VISUALS = {
    steelmaker: {
      tag: "Расплав 1600 °C",
      sub: "Конвертер и ковш",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 7h10l-1.5 7.5a3 3 0 0 1-3 2.5H8.5a3 3 0 0 1-3-2.5L4 7z"/>
        <path d="M15 8h2.5a2 2 0 0 1 0 4H14.2"/>
        <path d="M9.5 17v3"/>
        <path d="M18.5 14c1.3 1.5 2 2.7 2 3.8a2 2 0 1 1-4 0c0-1.1.7-2.3 2-3.8z"/>
        <path d="M8 3.5c0 .9.8 1.2.8 2M11 3c0 .9.8 1.2.8 2"/>
      </svg>`
    },
    roller: {
      tag: "Прокатный стан",
      sub: "Валки и стальная полоса",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="7" r="3.5"/>
        <circle cx="12" cy="17" r="3.5"/>
        <line x1="2.5" y1="12" x2="21.5" y2="12"/>
        <polyline points="18.5 9.5 21.5 12 18.5 14.5"/>
      </svg>`
    },
    mechanic: {
      tag: "Механизмы и ГПМ",
      sub: "Монтаж и LOTO",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>`
    },
    blast_furnace: {
      tag: "Доменная печь • CO",
      sub: "Выпуск чугуна и шлака",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 3h6l2 8 1.5 9h-13L7 11l2-8z"/>
        <line x1="7" y1="11" x2="17" y2="11"/>
        <path d="M12 14.5c1.2 1.2 1.8 2.2 1.8 3.2a1.8 1.8 0 1 1-3.6 0c0-1 .6-2 1.8-3.2z"/>
        <path d="M7.5 5.5H4.5V9"/>
      </svg>`
    },
    electrician: {
      tag: "Электроустановки",
      sub: "До и свыше 1000 В",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polygon points="13 7 8.5 13 12 13 11 17 15.5 11 12 11 13 7"/>
      </svg>`
    },
    belaz: {
      tag: "Карьерный самосвал",
      sub: "БелАЗ 130+ т",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7h11l2 5h4.5a1.5 1.5 0 0 1 1.5 1.5V16h-2"/>
        <path d="M3 7l1.2 9h3.3"/>
        <path d="M11.5 16h5"/>
        <path d="M15 9.5h3.5l1.5 2.5"/>
        <circle cx="7.5" cy="17.5" r="2.5"/>
        <circle cx="17.5" cy="17.5" r="2.5"/>
      </svg>`
    }
  };

  function getProfVisual(profId) {
    return PROFESSION_VISUALS[profId] || PROFESSION_VISUALS.mechanic;
  }

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

    const acc = getActiveAccount();

    list.forEach((prof) => {
      const isMine = Boolean(acc && acc.profId === prof.id);
      const isPassed = Boolean(acc && progress.passedQuizzes[prof.id]);
      const chkDone = acc ? prof.checklist.filter((_, idx) => Boolean(progress.checks[`${prof.id}_${idx}`])).length : 0;
      const statusBadges = acc
        ? `${isMine ? '<span class="prof-card-my-badge">Моя специальность</span>' : ""}${
            isPassed ? '<span class="prof-card-done">&#10003; Сдано</span>' : ""
          }`
        : "";
      const rightMeta = isMine
        ? `Чек: ${chkDone}/${prof.checklist.length}`
        : `${prof.iotPages} стр. оригинала`;
      const visual = getProfVisual(prof.id);

      const card = document.createElement("button");
      card.type = "button";
      card.className = `prof-card${isMine ? " prof-card-mine" : ""}`;
      card.innerHTML = `
        <div class="prof-card-cover prof-theme-${prof.id}" aria-hidden="true">
          <div class="prof-emblem-box">${visual.svg}</div>
          <div class="prof-cover-meta">
            <span class="prof-cover-tag">${visual.tag}</span>
            <span class="prof-cover-sub">${visual.sub}</span>
          </div>
        </div>
        <div class="prof-card-top">
          <span class="prof-card-dept">${prof.department}</span>
          ${statusBadges ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">${statusBadges}</div>` : ""}
        </div>
        <span class="prof-card-title">${prof.title}</span>
        <span class="prof-card-desc">${prof.description}</span>
        <div class="prof-card-meta-row">
          <span class="prof-card-iot">${prof.iotNumber}</span>
          <span>${rightMeta}</span>
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
    profHeaderEmblem.className = `prof-header-emblem prof-theme-${prof.id}`;
    profHeaderEmblem.innerHTML = getProfVisual(prof.id).svg;
    profHeaderSceneImg.src = `media/professions/${prof.id}.webp`;
    profHeaderSceneImg.alt = `${prof.title} — схема рабочего места`;
    profTitle.textContent = prof.title;
    profDesc.textContent = prof.description;

    homeScreen.hidden = true;
    professionScreen.hidden = false;
    headerDrawerBtn.hidden = false;
    clearOnboardingHighlight();

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
    renderOnboardingState();
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

  // Вкладка СИЗ с зумом (включая обзорную иллюстрацию рабочего в экипировке)
  function renderPpeTab() {
    const sqPath = `media/professions_square/${currentProfession.id}.webp`;
    ppeShowcaseBox.innerHTML = `
      <img src="${sqPath}" alt="${currentProfession.title} — экипировка" class="ppe-showcase-img">
      <div class="ppe-showcase-text">
        <h4>Экипировка и рабочая зона: ${currentProfession.title}</h4>
        <p>Полный комплект СИЗ по ${currentProfession.iotNumber} (${currentProfession.ppe.length} обязательные позиции). Нажмите на иллюстрацию, чтобы приблизить детали.</p>
      </div>
    `;
    const showcaseImg = ppeShowcaseBox.querySelector("img");
    if (showcaseImg) {
      showcaseImg.addEventListener("click", () => {
        zoomImage.src = showcaseImg.src;
        zoomImage.alt = showcaseImg.alt;
        zoomCaption.textContent = `${currentProfession.title} — экипировка`;
        imageZoomDialog.showModal();
      });
    }

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

  profHeaderSceneBtn.addEventListener("click", () => {
    if (!currentProfession || !profHeaderSceneImg.getAttribute("src")) return;
    zoomImage.src = profHeaderSceneImg.src;
    zoomImage.alt = profHeaderSceneImg.alt;
    zoomCaption.textContent = `${currentProfession.title} — схема рабочего места`;
    imageZoomDialog.showModal();
  });

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
        updateHomeDashboard();
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

  // Раздел PDF с защитой паролем (CHSUtest) и правами от администратора
  function getDocsAccessReason() {
    try {
      if (localStorage.getItem(DOCS_BYPASS_KEY) === "1") return "admin_global";
    } catch {}
    const acc = getActiveAccount();
    if (acc && acc.canAccessDocs) return "account";
    try {
      if (sessionStorage.getItem(DOCS_UNLOCK_KEY) === "1") return "password";
    } catch {}
    return null;
  }

  function isDocsUnlocked() {
    return Boolean(getDocsAccessReason());
  }

  function renderDocsState() {
    const reason = getDocsAccessReason();
    const unlocked = Boolean(reason);
    docsLockBox.hidden = unlocked;
    docsUnlockedBox.hidden = !unlocked;
    docsPassError.hidden = true;
    if (unlocked) {
      if (reason === "admin_global") {
        docsAccessSourceLabel.textContent = "Доступ открыт администратором для всех на устройстве";
        docsLockAgainBtn.hidden = true;
      } else if (reason === "account") {
        docsAccessSourceLabel.textContent = "Доступ без пароля открыт администратором для вашего профиля";
        docsLockAgainBtn.hidden = true;
      } else {
        docsAccessSourceLabel.textContent = "Доступ открыт по паролю";
        docsLockAgainBtn.hidden = false;
      }
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
    if (hash === DOCS_PASS_HASH) {
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
              updateHomeDashboard();
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

  // SOS-модалка (с кликабельными tel:-ссылками для звонка в 1 нажатие)
  function openSosModal() {
    const phonesHtml = data.sosGuide.phones
      .map((p) => {
        const cleanTel = p.tel || String(p.number || "").replace(/[^+\d]/g, "");
        return `
      <a href="tel:${cleanTel}" class="sos-phone-card sos-phone-link" title="Позвонить: ${p.number}">
        <div style="font-size:0.78rem; color:var(--muted);">${p.name}</div>
        <div class="sos-phone-call-row">
          <span class="sos-phone-num mono">${p.number}</span>
          <span class="sos-call-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Вызов
          </span>
        </div>
      </a>
    `;
      })
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
      <div class="sos-hint-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        <span><strong>На телефоне можно позвонить сразу:</strong> просто нажмите на нужный номер ниже — откроется набор вызова.</span>
      </div>
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
        const acc = getActiveAccount();
        const history = getJournalHistory();
        history.unshift({
          id: recordId,
          date: dateStr,
          worker,
          prof: profTitleText,
          profId: currentProfession ? currentProfession.id : null,
          accountId: acc ? acc.id : null,
          briefing,
          result: resultLabel
        });
        try {
          localStorage.setItem(JOURNAL_KEY, JSON.stringify(history.slice(0, 20)));
        } catch {}
        renderHistory();
        updateHomeDashboard();
      }
    }

    openBtn.addEventListener("click", () => {
      const acc = getActiveAccount();
      if (acc) {
        document.getElementById("protoWorkerName").value = acc.fullName;
        if (acc.tabNum) document.getElementById("protoTabNum").value = acc.tabNum;
      }
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
    const accAdminEntryBtn = document.getElementById("accAdminEntryBtn");
    const accountDialogEl = document.getElementById("accountDialog");

    const adminTabAccountsBtn = document.getElementById("adminTabAccountsBtn");
    const adminTabReviewsBtn = document.getElementById("adminTabReviewsBtn");
    const adminAccountsSection = document.getElementById("adminAccountsSection");
    const adminReviewsSection = document.getElementById("adminReviewsSection");

    const adminGlobalDocsBypass = document.getElementById("adminGlobalDocsBypass");
    const adminAccountsCount = document.getElementById("adminAccountsCount");
    const adminOpenCreateAccBtn = document.getElementById("adminOpenCreateAccBtn");
    const adminAccForm = document.getElementById("adminAccForm");
    const adminAccFormTitle = document.getElementById("adminAccFormTitle");
    const adminAccName = document.getElementById("adminAccName");
    const adminAccTab = document.getElementById("adminAccTab");
    const adminAccProf = document.getElementById("adminAccProf");
    const adminAccPassLabel = document.getElementById("adminAccPassLabel");
    const adminAccPass = document.getElementById("adminAccPass");
    const adminAccDocsAccess = document.getElementById("adminAccDocsAccess");
    const adminAccFormError = document.getElementById("adminAccFormError");
    const adminAccCancelBtn = document.getElementById("adminAccCancelBtn");
    const adminAccountsList = document.getElementById("adminAccountsList");

    const refreshReviewsBtn = document.getElementById("refreshReviewsBtn");
    const exportReviewsCsvBtn = document.getElementById("exportReviewsCsvBtn");
    const devLogoutBtn = document.getElementById("devLogoutBtn");
    const adminKpiCards = document.getElementById("adminKpiCards");
    const adminReviewsList = document.getElementById("adminReviewsList");

    let selectedRating = 0;
    let cachedReviews = [];
    let editingAccountId = null;

    adminAccProf.innerHTML = data.professions
      .map((p) => `<option value="${p.id}">${p.title} (${p.department})</option>`)
      .join("");

    function switchAdminTab(tab) {
      const isAcc = tab === "accounts";
      adminTabAccountsBtn.classList.toggle("active", isAcc);
      adminTabAccountsBtn.setAttribute("aria-selected", String(isAcc));
      adminTabReviewsBtn.classList.toggle("active", !isAcc);
      adminTabReviewsBtn.setAttribute("aria-selected", String(!isAcc));
      adminAccountsSection.hidden = !isAcc;
      adminReviewsSection.hidden = isAcc;
      if (isAcc) {
        renderAdminAccounts();
        syncAccountsFromCloud().then((ok) => {
          if (ok) {
            renderAdminAccounts();
            refreshAllAfterAccountChange();
          }
        });
      } else {
        loadAllReviews();
      }
    }

    function openAdminAccForm(acc = null) {
      editingAccountId = acc ? acc.id : null;
      adminAccForm.hidden = false;
      adminAccFormError.hidden = true;
      if (acc) {
        adminAccFormTitle.textContent = "Изменить аккаунт работника";
        adminAccName.value = acc.fullName || "";
        adminAccTab.value = acc.tabNum || "";
        adminAccProf.value = acc.profId || data.professions[0].id;
        adminAccPassLabel.textContent = "Новый пароль (оставьте пустым, чтобы не менять)";
        adminAccPass.value = "";
        adminAccDocsAccess.checked = Boolean(acc.canAccessDocs);
      } else {
        adminAccFormTitle.textContent = "Создать аккаунт работника";
        adminAccName.value = "";
        adminAccTab.value = "";
        adminAccProf.value = data.professions[0].id;
        adminAccPassLabel.textContent = "Пароль / PIN (от 4 симв.) *";
        adminAccPass.value = "";
        adminAccDocsAccess.checked = false;
      }
      adminAccName.focus();
    }

    function renderAdminAccounts() {
      const list = loadAccounts();
      const activeAcc = getActiveAccount();
      adminAccountsCount.textContent = String(list.length);
      try {
        adminGlobalDocsBypass.checked = localStorage.getItem(DOCS_BYPASS_KEY) === "1";
      } catch {
        adminGlobalDocsBypass.checked = false;
      }

      if (!list.length) {
        adminAccountsList.innerHTML =
          '<p class="muted" style="font-size:0.86rem;">Созданных аккаунтов пока нет. Нажмите «+ Создать аккаунт».</p>';
        return;
      }

      adminAccountsList.innerHTML = "";
      list.forEach((acc) => {
        const status = computeAccountStatus(acc);
        const isActive = Boolean(activeAcc && activeAcc.id === acc.id);
        const card = document.createElement("div");
        card.className = `admin-acc-card${isActive ? " active-session" : ""}`;
        card.innerHTML = `
          <div class="admin-acc-head">
            <div>
              <strong>${acc.fullName}</strong>
              ${acc.tabNum ? `<span class="muted mono" style="font-size:0.78rem;"> • Таб. №${acc.tabNum}</span>` : ""}
              <div class="muted" style="font-size:0.8rem; margin-top:2px;">
                ${status.prof.title} (${status.prof.department}) • Статус: <strong>${status.pct}%</strong> (тест: ${status.testPassed ? "сдан" : "нет"}, чек: ${status.doneChecks}/${status.totalChecks})
              </div>
            </div>
            <div class="admin-acc-badges">
              ${isActive ? '<span class="admin-badge" style="background:#dbeafe; color:#002f6c;">Активен сейчас</span>' : ""}
              <span class="admin-badge ${acc.canAccessDocs ? "pdf-ok" : "pdf-lock"}">
                ${acc.canAccessDocs ? "PDF: без пароля" : "PDF: по паролю"}
              </span>
            </div>
          </div>
          <div class="admin-acc-actions">
            <button type="button" class="btn btn-secondary btn-sm adm-toggle-pdf">${
              acc.canAccessDocs ? "Закрыть PDF без пароля" : "Выдать право на PDF"
            }</button>
            <button type="button" class="btn btn-secondary btn-sm adm-edit">Изменить</button>
            <button type="button" class="btn btn-secondary btn-sm adm-switch">Войти</button>
            <button type="button" class="btn btn-secondary btn-sm adm-del" style="color:var(--accent);">Удалить</button>
          </div>
        `;

        card.querySelector(".adm-toggle-pdf").addEventListener("click", () => {
          const accounts = loadAccounts();
          const target = accounts.find((x) => x.id === acc.id);
          if (!target) return;
          target.canAccessDocs = !target.canAccessDocs;
          saveAccounts(accounts);
          cloudUpsertAccount(target, getAccountProgress(target.id));
          renderAdminAccounts();
          refreshAllAfterAccountChange();
        });

        card.querySelector(".adm-edit").addEventListener("click", () => {
          openAdminAccForm(acc);
        });

        card.querySelector(".adm-switch").addEventListener("click", () => {
          setActiveAccountId(acc.id);
          renderAdminAccounts();
          refreshAllAfterAccountChange();
        });

        card.querySelector(".adm-del").addEventListener("click", () => {
          if (!confirm(`Удалить аккаунт «${acc.fullName}»?`)) return;
          const remaining = loadAccounts().filter((x) => x.id !== acc.id);
          saveAccounts(remaining);
          cloudDeleteAccount(acc.id);
          try {
            const map = loadAllAccProgress();
            delete map[acc.id];
            localStorage.setItem(ACC_PROGRESS_KEY, JSON.stringify(map));
          } catch {}
          if (activeAcc && activeAcc.id === acc.id) {
            setActiveAccountId(null);
          }
          if (editingAccountId === acc.id) {
            adminAccForm.hidden = true;
            editingAccountId = null;
          }
          renderAdminAccounts();
          refreshAllAfterAccountChange();
        });

        adminAccountsList.appendChild(card);
      });
    }

    adminTabAccountsBtn.addEventListener("click", () => switchAdminTab("accounts"));
    adminTabReviewsBtn.addEventListener("click", () => switchAdminTab("reviews"));

    adminGlobalDocsBypass.addEventListener("change", () => {
      try {
        if (adminGlobalDocsBypass.checked) localStorage.setItem(DOCS_BYPASS_KEY, "1");
        else localStorage.removeItem(DOCS_BYPASS_KEY);
      } catch {}
      if (currentProfession) renderDocsState();
    });

    adminOpenCreateAccBtn.addEventListener("click", () => openAdminAccForm(null));
    adminAccCancelBtn.addEventListener("click", () => {
      adminAccForm.hidden = true;
      editingAccountId = null;
    });

    adminAccForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = adminAccName.value.trim();
      const tabNum = adminAccTab.value.trim();
      const profId = adminAccProf.value;
      const pass = adminAccPass.value;
      const canAccessDocs = adminAccDocsAccess.checked;

      if (fullName.length < 2) {
        adminAccFormError.textContent = "Введите ФИО работника.";
        adminAccFormError.hidden = false;
        return;
      }
      if (!tabNum) {
        adminAccFormError.textContent = "Укажите табельный номер — он должен быть уникальным для каждого работника.";
        adminAccFormError.hidden = false;
        return;
      }
      if (!editingAccountId && pass.length < 4) {
        adminAccFormError.textContent = "Для нового аккаунта задайте пароль от 4 символов.";
        adminAccFormError.hidden = false;
        return;
      }
      if (editingAccountId && pass && pass.length < 4) {
        adminAccFormError.textContent = "Новый пароль должен быть не короче 4 символов.";
        adminAccFormError.hidden = false;
        return;
      }

      const synced = await syncAccountsFromCloud();
      if (!synced) {
        adminAccFormError.textContent = "Не удалось проверить базу данных. Проверьте интернет и попробуйте снова.";
        adminAccFormError.hidden = false;
        return;
      }

      const accounts = loadAccounts();
      const tabTaken = accounts.find(
        (x) => x.id !== editingAccountId && x.tabNum && x.tabNum.trim().toLowerCase() === tabNum.toLowerCase()
      );
      if (tabTaken) {
        adminAccFormError.textContent = `Аккаунт с табельным № «${tabNum}» уже существует (${tabTaken.fullName}). Измените табельный номер.`;
        adminAccFormError.hidden = false;
        return;
      }

      let savedAcc = null;
      let cloudRes = { ok: true };
      if (editingAccountId) {
        const target = accounts.find((x) => x.id === editingAccountId);
        if (target) {
          target.fullName = fullName;
          target.tabNum = tabNum;
          target.profId = profId;
          target.canAccessDocs = canAccessDocs;
          if (pass) target.passHash = await hashWorkerPass(pass);
          savedAcc = target;
          cloudRes = await cloudUpsertAccount(savedAcc, getAccountProgress(savedAcc.id));
        }
      } else {
        savedAcc = {
          id: "acc_" + Date.now() + "_" + Math.floor(100 + Math.random() * 900),
          fullName,
          tabNum,
          profId,
          canAccessDocs,
          passHash: await hashWorkerPass(pass),
          createdAt: new Date().toISOString()
        };
        cloudRes = await cloudInsertAccount(savedAcc, { checks: {}, passedQuizzes: {} });
        if (cloudRes.ok) accounts.push(savedAcc);
      }

      if (!cloudRes.ok) {
        adminAccFormError.textContent = `Ошибка базы данных: ${cloudRes.error}`;
        adminAccFormError.hidden = false;
        return;
      }
      saveAccounts(accounts);
      adminAccForm.hidden = true;
      editingAccountId = null;
      renderAdminAccounts();
      refreshAllAfterAccountChange();
    });

    if (accAdminEntryBtn) {
      accAdminEntryBtn.addEventListener("click", () => {
        if (accountDialogEl && accountDialogEl.open) accountDialogEl.close();
        statusBox.hidden = true;
        devLoginError.hidden = true;
        devLoginBox.hidden = false;
        dialog.showModal();
        devLoginInput.focus();
      });
    }

    function getLocalReviews() {
      try {
        return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
      } catch {
        return [];
      }
    }

    async function loadAllReviews() {
      let list = getLocalReviews();
      try {
        const remote = await sbFetch("safety_reviews?select=*&order=id.desc");
        if (Array.isArray(remote)) list = remote;
      } catch {}
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

      try {
        await sbFetch("safety_reviews", {
          method: "POST",
          body: JSON.stringify(entry)
        });
      } catch {}

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
      if (login === AUTH_USER && passHash === ADMIN_PASS_HASH) {
        devLoginError.hidden = true;
        userPane.hidden = true;
        adminPane.hidden = false;
        switchAdminTab("accounts");
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

  // Личный кабинет работника (регистрация со специальностью, вход, смена профессии)
  (function initAccountSystem() {
    const dialog = document.getElementById("accountDialog");
    const dialogTitle = document.getElementById("accountDialogTitle");
    const closeBtn = document.getElementById("closeAccountBtn");
    const authPane = document.getElementById("accountAuthPane");
    const profilePane = document.getElementById("accountProfilePane");

    const tabCreateBtn = document.getElementById("accTabCreateBtn");
    const tabLoginBtn = document.getElementById("accTabLoginBtn");
    const createForm = document.getElementById("accCreateForm");
    const loginForm = document.getElementById("accLoginForm");

    const regName = document.getElementById("accRegName");
    const regTabNum = document.getElementById("accRegTabNum");
    const regProf = document.getElementById("accRegProf");
    const regPass = document.getElementById("accRegPass");
    const regError = document.getElementById("accRegError");

    const loginId = document.getElementById("accLoginId");
    const loginPass = document.getElementById("accLoginPass");
    const loginError = document.getElementById("accLoginError");

    const profFullName = document.getElementById("accProfFullName");
    const profTabMeta = document.getElementById("accProfTabMeta");
    const profStatusBadge = document.getElementById("accProfStatusBadge");
    const profSpecName = document.getElementById("accProfSpecName");
    const profSummaryStats = document.getElementById("accProfSummaryStats");
    const changeProfSelect = document.getElementById("accChangeProfSelect");
    const saveProfBtn = document.getElementById("accSaveProfBtn");
    const saveProfMsg = document.getElementById("accSaveProfMsg");
    const goMyProfBtn = document.getElementById("accGoMyProfBtn");
    const logoutBtn = document.getElementById("accLogoutBtn");
    const deleteBtn = document.getElementById("accDeleteBtn");

    function fillProfessionSelects() {
      const optionsHtml = data.professions
        .map((p) => `<option value="${p.id}">${p.title} (${p.department})</option>`)
        .join("");
      regProf.innerHTML = optionsHtml;
      changeProfSelect.innerHTML = optionsHtml;
    }
    fillProfessionSelects();

    function switchAuthTab(mode) {
      const isCreate = mode === "create";
      tabCreateBtn.classList.toggle("active", isCreate);
      tabCreateBtn.setAttribute("aria-selected", String(isCreate));
      tabLoginBtn.classList.toggle("active", !isCreate);
      tabLoginBtn.setAttribute("aria-selected", String(!isCreate));
      createForm.hidden = !isCreate;
      loginForm.hidden = isCreate;
      regError.hidden = true;
      loginError.hidden = true;
    }

    function renderProfileView(acc) {
      const status = computeAccountStatus(acc);
      profFullName.textContent = acc.fullName;
      profTabMeta.textContent = acc.tabNum ? `Табельный № ${acc.tabNum}` : "Табельный № не указан";
      profStatusBadge.textContent = `${status.pct}%`;
      profSpecName.textContent = `Специальность: ${status.prof.title} (${status.prof.department})`;
      profSummaryStats.innerHTML = `
        Тест по специальности: <strong>${status.testPassed ? "Сдан" : "Не сдан"}</strong><br>
        Чек-лист смены: <strong>${status.doneChecks} из ${status.totalChecks}</strong> • Протоколов: <strong>${status.myProtocols}</strong><br>
        Доступ к PDF (ИОТ): <strong>${acc.canAccessDocs ? "Без пароля (выдан администратором)" : "По паролю"}</strong>
      `;
      changeProfSelect.value = status.prof.id;
      saveProfMsg.hidden = true;
    }

    function openAccountModal(preferredMode = "create") {
      const acc = getActiveAccount();
      if (acc) {
        dialogTitle.textContent = "Профиль работника";
        authPane.hidden = true;
        profilePane.hidden = false;
        renderProfileView(acc);
      } else {
        dialogTitle.textContent = "Личный кабинет работника";
        authPane.hidden = false;
        profilePane.hidden = true;
        switchAuthTab(preferredMode);
      }
      dialog.showModal();
    }

    tabCreateBtn.addEventListener("click", () => switchAuthTab("create"));
    tabLoginBtn.addEventListener("click", () => switchAuthTab("login"));

    openAccountBtn.addEventListener("click", () => openAccountModal(loadAccounts().length ? "login" : "create"));
    heroCreateAccBtn.addEventListener("click", () => openAccountModal("create"));
    heroLoginAccBtn.addEventListener("click", () => openAccountModal("login"));
    dashManageAccBtn.addEventListener("click", () => openAccountModal("profile"));
    document.querySelectorAll(".guest-open-acc-btn").forEach((btn) => {
      btn.addEventListener("click", () => openAccountModal("create"));
    });

    dashOpenMyProfBtn.addEventListener("click", () => {
      const acc = getActiveAccount();
      if (!acc) return;
      const myProf = data.professions.find((p) => p.id === acc.profId);
      if (myProf) openProfession(myProf, "video", true);
    });

    goMyProfBtn.addEventListener("click", () => {
      const acc = getActiveAccount();
      if (!acc) return;
      const myProf = data.professions.find((p) => p.id === acc.profId);
      dialog.close();
      if (myProf) openProfession(myProf, "video", true);
    });

    [regName, regTabNum, regPass].forEach((inp) => {
      inp.addEventListener("input", () => {
        regError.hidden = true;
      });
    });
    [loginId, loginPass].forEach((inp) => {
      inp.addEventListener("input", () => {
        loginError.hidden = true;
      });
    });

    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = regName.value.trim();
      const tabNum = regTabNum.value.trim();
      const profId = regProf.value;
      const pass = regPass.value;

      if (fullName.length < 2) {
        regError.textContent = "Укажите ФИО работника (минимум 2 символа).";
        regError.hidden = false;
        return;
      }
      if (!tabNum) {
        regError.textContent = "Укажите табельный номер — он нужен для входа и должен быть уникальным.";
        regError.hidden = false;
        return;
      }
      if (pass.length < 4) {
        regError.textContent = "Пароль должен содержать минимум 4 символа.";
        regError.hidden = false;
        return;
      }

      const submitBtn = createForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Проверка и создание...";
      }

      try {
        const synced = await syncAccountsFromCloud();
        if (!synced) {
          regError.textContent = "Не удалось проверить базу данных. Проверьте интернет и попробуйте ещё раз.";
          regError.hidden = false;
          return;
        }
        const accounts = loadAccounts();
        const duplicate = accounts.find(
          (a) => a.tabNum && a.tabNum.trim().toLowerCase() === tabNum.toLowerCase()
        );
        if (duplicate) {
          regError.textContent = `Аккаунт с табельным № «${tabNum}» уже зарегистрирован! Повторная регистрация запрещена — перейдите во вкладку «Войти в аккаунт».`;
          regError.hidden = false;
          return;
        }

        const newAcc = {
          id: "acc_" + Date.now() + "_" + Math.floor(100 + Math.random() * 900),
          fullName,
          tabNum,
          profId,
          canAccessDocs: false,
          passHash: await hashWorkerPass(pass),
          createdAt: new Date().toISOString()
        };
        const cloudRes = await cloudInsertAccount(newAcc, { checks: {}, passedQuizzes: {} });
        if (!cloudRes.ok) {
          const msg = String(cloudRes.error || "");
          regError.textContent = msg.includes("duplicate") || msg.includes("unique")
            ? `Аккаунт с табельным № «${tabNum}» уже существует! Перейдите во вкладку «Войти в аккаунт».`
            : `Не удалось создать аккаунт в базе: ${msg}`;
          regError.hidden = false;
          return;
        }
        accounts.push(newAcc);
        saveAccounts(accounts);
        setActiveAccountId(newAcc.id);

        createForm.reset();
        regError.hidden = true;
        refreshAllAfterAccountChange();
        dialog.close();
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Создать аккаунт и открыть статус";
        }
      }
    });

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rawQuery = loginId.value.trim();
      const query = rawQuery.toLowerCase();
      const pass = loginPass.value;

      if (!query) {
        loginError.textContent = "Введите ваш табельный номер.";
        loginError.hidden = false;
        return;
      }
      if (!pass) {
        loginError.textContent = "Введите пароль или PIN-код.";
        loginError.hidden = false;
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Проверка данных...";
      }

      try {
        const synced = await syncAccountsFromCloud();
        const accounts = loadAccounts();
        if (!synced && !accounts.length) {
          loginError.textContent = "Нет связи с базой данных. Проверьте интернет и попробуйте снова.";
          loginError.hidden = false;
          return;
        }
        const found = accounts.find(
          (a) => a.tabNum && a.tabNum.trim().toLowerCase() === query
        );
        if (!found) {
          loginError.textContent = `Аккаунт с табельным № «${rawQuery}» не найден. Проверьте номер или создайте профиль во вкладке «Создать аккаунт».`;
          loginError.hidden = false;
          return;
        }
        const hash = await hashWorkerPass(pass);
        if (hash !== found.passHash) {
          loginError.textContent = `Неверный пароль для табельного № «${found.tabNum}». Проверьте раскладку или Caps Lock и попробуйте ещё раз.`;
          loginError.hidden = false;
          return;
        }
        setActiveAccountId(found.id);
        loginForm.reset();
        loginError.hidden = true;
        refreshAllAfterAccountChange();
        dialog.close();
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Войти в личный кабинет";
        }
      }
    });

    saveProfBtn.addEventListener("click", () => {
      const acc = getActiveAccount();
      if (!acc) return;
      const accounts = loadAccounts();
      const target = accounts.find((a) => a.id === acc.id);
      if (!target) return;
      target.profId = changeProfSelect.value;
      saveAccounts(accounts);
      cloudUpsertAccount(target, getAccountProgress(target.id));
      renderProfileView(target);
      saveProfMsg.hidden = false;
      refreshAllAfterAccountChange();
    });

    logoutBtn.addEventListener("click", () => {
      setActiveAccountId(null);
      refreshAllAfterAccountChange();
      dialog.close();
    });

    deleteBtn.addEventListener("click", () => {
      const acc = getActiveAccount();
      if (!acc) return;
      if (!confirm(`Удалить аккаунт «${acc.fullName}» и его статус обучения с этого устройства?`)) return;
      const remaining = loadAccounts().filter((a) => a.id !== acc.id);
      saveAccounts(remaining);
      cloudDeleteAccount(acc.id);
      try {
        const map = loadAllAccProgress();
        delete map[acc.id];
        localStorage.setItem(ACC_PROGRESS_KEY, JSON.stringify(map));
      } catch {}
      setActiveAccountId(null);
      refreshAllAfterAccountChange();
      dialog.close();
    });

    closeBtn.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  })();

  // Старт приложения + инициализация аккаунта, фильтров, дашборда и QR-ссылок (?prof=...&sec=...)
  updateAccountUI();
  renderRiskFilters();
  renderProfessions();
  syncAccountsFromCloud().then((ok) => {
    if (ok) refreshAllAfterAccountChange();
  });
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
