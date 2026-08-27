// ============================================================
// Yoldaş — app.js
// كل التفاعل: التنقل، الجلسة المجهولة، Supabase، الماء، الوجبات،
// التمارين، الخطط، المحادثة، إعادة المحاولة، وحالات الخطأ.
// ============================================================

(function () {
  "use strict";

  const CONFIG = window.YOLDAS_CONFIG || {};
  let supabase = null;
  let currentUser = null;
  let lastChatMessage = null; // لإعادة محاولة آخر رسالة فقط دون تكرارها
  let planState = { type: "food", step: 0, answers: {} };
  let currentLocale = ["ar", "tr", "en"].includes(localStorage.getItem("yoldas_locale")) ? localStorage.getItem("yoldas_locale") : "ar";
  let accountMode = "signup";
  let referenceRecipes = [];
  let selectedRecipeId = null;
  let foodFilter = "all";
  let planTranslationInFlight = false;
  let gymSets = [];
  let miriStyle = "supportive";

  const UI_TEXT = {
    ar: {
      dailyCompanion: "رفيقك اليومي", startGuest: "ابدأ كتجربة ←", accountButton: "دخول أو إنشاء حساب", discoverHow: "اكتشف كيف يعمل Yoldaş",
      privacyFirst: "الخصوصية أولًا.", guestPrivacy: "يمكنك التجربة بدون حساب، أو حفظ رحلتك باسم مستخدم وكلمة مرور.",
      accountEyebrow: "احفظ رحلتك", createAccount: "إنشاء حساب", login: "تسجيل الدخول", close: "إغلاق", username: "اسم المستخدم", password: "كلمة المرور",
      usernameHint: "من 3 إلى 24 حرفًا إنجليزيًا صغيرًا أو رقمًا، مع . أو _ أو - فقط.", passwordHint: "استخدم كلمة سر من 8 أحرف أو أكثر.", recoveryEmail: "بريد الاسترجاع", recoveryEmailPlaceholder: "name@example.com", recoveryEmailHint: "خاص ولا يظهر للناس. يستخدم فقط عند نسيان كلمة السر.", saveRecoveryEmail: "حفظ بريد الاسترجاع", forgotPassword: "نسيت كلمة السر؟", resetPasswordHint: "إذا كان للحساب بريد استرجاع، سنرسل له رابط تغيير كلمة السر.", sendResetLink: "أرسل رابط الاسترجاع", backToLogin: "العودة للدخول", resetLinkSent: "إذا كان للحساب بريد استرجاع، تم إرسال الرابط إليه.", recoveryEmailSaved: "تم حفظ بريد الاسترجاع.", resetCompleteTitle: "اختَر كلمة سر جديدة", resetCompleteHint: "اكتب كلمة سر جديدة من 8 أحرف أو أكثر لحسابك.", newPassword: "كلمة السر الجديدة", confirmPassword: "تأكيد كلمة السر", saveNewPassword: "حفظ كلمة السر الجديدة", passwordMismatch: "كلمتا السر غير متطابقتين.", passwordChanged: "تم تغيير كلمة السر. يمكنك الدخول الآن بكلمة السر الجديدة.",
      usernamePlaceholder: "مثال: ahmed.fit", passwordPlaceholder: "8 أحرف أو أكثر",
      signupTitle: "إنشاء حساب", loginTitle: "تسجيل الدخول", signupDescription: "أنشئ اسم مستخدم وكلمة مرور وبريد استرجاع خاص.", loginDescription: "ادخل باسم المستخدم وكلمة المرور المحفوظين لديك.",
      signupSubmit: "إنشاء حسابي", loginSubmit: "دخول", startOver: "بدء من جديد", assistantGreeting: "أهلًا، أنا ميري. اكتب لي ما أكلته أو تمرينك اليوم، ونأخذ خطوة مفيدة معًا.",
      chatPlaceholder: "اكتب وجبتك أو سؤالك...", thinking: "ميري بتحضّر لك ردًا مفيدًا...", retryError: "تعذر التواصل مع ميري الآن. حاول مرة أخرى.", aiDailyLimit: "استخدمت حد ميري اليوم. تقدر تسجّل وجبتك يدويًا من دليل الأكل، أو ترجع بكرة.", aiUsageSetup: "ميزة حدود ميري تحتاج تشغيل ملف SQL الجديد مرة واحدة داخل Supabase.", reactionFire: "جامد", reactionClap: "كمل", reactionHeart: "فخور بيك",
      planCreated: "تم إنشاء خطتك بنجاح.", planError: "تعذر إنشاء الخطة الآن. حاول مرة أخرى.", newPlan: "إنشاء خطة جديدة", planTranslating: "جاري ترجمة خطتك...", planTranslateError: "تعذر ترجمة الخطة الآن. ستظل النسخة الأصلية ظاهرة.",
      planFood: "خطة أكل", planWorkout: "خطة تمرين", question: "السؤال", of: "من", next: "التالي", createPlan: "إنشاء الخطة",
      heroEyebrow: "رحلتك تبدأ بخطوة مفهومة", heroTitleLead: "غيّر جسمك. ثبّت عاداتك.", heroTitleTail: "خطوتك الجاية تبدأ هنا.", heroDescription: "نحوّل هدفك إلى أكل وحركة ومتابعة يومية من غير تعقيد أو حرمان.", adSlotLabel: "مساحة إعلانية", adSlotHint: "مهيّأة لإعلان Google لاحقًا",
      heroStepFood: "أكل أذكى", heroStepMove: "حركة ثابتة", heroStepTrack: "متابعة هادية", introEyebrow: "برنامجك الصحي الشخصي", introTitle: "كل ما تحتاجه لتبدأ صح — في مكان واحد.", introDescription: "خطة أكل وتمارين تناسب هدفك، ومتابعة للماء والوجبات والحركة، مع مساعدة تفهم كلامك الطبيعي.",
      featureFood: "خطة أكل شخصية", featureFoodSub: "حسب هدفك وتفضيلاتك", featureWorkout: "خطة تمرين قابلة للتعديل", featureWorkoutSub: "حسب وقتك ومستواك", featureTrack: "متابعة بسيطة لليوم", featureTrackSub: "ماء ووجبات وتمرين", featureAssistant: "مساعدة ميري", featureAssistantSub: "اسأل وسجّل من كلامك الطبيعي",
      howEyebrow: "رحلة بسيطة", howTitle: "كيف يعمل Yoldaş؟", navToday: "اليوم", navPlans: "الخطط", navAssistant: "المساعد", navProgress: "التقدم", navCommunity: "المجتمع", navSettings: "الإعدادات",
      todayTitle: "مهمتي اليوم", todayDescription: "خطوات صغيرة وواضحة تساعدك تكمّل من غير ضغط.", remainingCalories: "السعرات المتبقية", water: "الماء", cupsToday: "كوب اليوم", meals: "الوجبات", mealsToday: "وجبات اليوم", movement: "الحركة", minutesToday: "دقيقة اليوم", streak: "الستريك", streakStart: "سجّل خطوة اليوم لتبدأ", streakDayOne: "يوم متواصل", streakDays: "أيام متواصلة",
      personalPlan: "خطة شخصية", planTitle: "خطة أكل أو تمرين", planDescription: "جاوب على أربع أسئلة قصيرة وميري تجهّز لك بداية مناسبة.", healthAssistant: "Miri، مساعدتك الصحية", askYoldas: "اسأل ميري", assistantDescription: "اكتب عن وجبتك أو تمرينك أو هدفك بكلامك الطبيعي؛ ميري معك بخطوة عملية وتشجيع مناسب.", assistantName: "Miri", assistantStatus: "معك خطوة بخطوة", promptWalk: "مشيت 20 دقيقة", promptBreakfast: "فطار صحي سريع", promptOrganize: "رتّب يومي", send: "إرسال",
      promptWalkValue: "مشيت 20 دقيقة النهارده", promptBreakfastValue: "اقترح لي فطار صحي سريع", promptOrganizeValue: "كيف أرتب وجباتي اليوم؟",
      howStep1Title: "جاوب على أسئلة بسيطة", howStep1Desc: "عن هدفك ووضعك الحالي.", howStep2Title: "خد خطتك الشخصية", howStep2Desc: "أكل وتمارين يناسبوك.", howStep3Title: "سجّل يومك", howStep3Desc: "ماء ووجبات وتمرين.", howStep4Title: "عدّل مع الوقت", howStep4Desc: "حسب احتياجك وتطورك.",
      howDetail1Title: "ابدأ من هدفك الحقيقي", howDetail1Desc: "تختار هدفك، مستوى نشاطك، وقتك المتاح، وتفضيلاتك. لا نستخدم نموذجًا واحدًا للجميع.", howDetail2Title: "خطة بداية قابلة للتنفيذ", howDetail2Desc: "Yoldaş يجهّز بداية عملية للأكل أو التمرين، ثم يمكنك إنشاء خطة جديدة عندما يتغير وقتك أو هدفك.", howDetail3Title: "متابعة يومية بدون ضغط", howDetail3Desc: "سجّل كوب ماء أو وجبة أو تمرين. ستظهر لك خطوات اليوم من بياناتك الفعلية فقط، من غير أرقام أو إنجازات وهمية.", howDetail4Title: "ميري، مساعدة داعمة", howDetail4Desc: "اكتب ما أكلته أو اسأل ميري عن تنظيم يومك بلغة طبيعية. الإرشادات عامة ولا تستبدل الطبيب أو المختص عند وجود حالة صحية خاصة.",
      faqEyebrow: "أسئلة سريعة", faqTitle: "أسئلة شائعة عن Yoldaş", faqIntro: "إجابات مباشرة عن التخطيط والمتابعة وميري.", faqQuestion1: "ما هو Yoldaş؟", faqAnswer1: "Yoldaş منصة تساعدك على تنظيم الأكل والحركة بخطة شخصية ومتابعة يومية بسيطة.", faqQuestion2: "هل يقدم Yoldaş خطة أكل وتمارين شخصية؟", faqAnswer2: "نعم. تجيب على أسئلة عن هدفك ووقتك ومستواك، ثم تنشئ ميري بداية عملية لخطة أكل أو تمرين قابلة للتعديل.", faqQuestion3: "كيف أسجل وجباتي وحركتي في Yoldaş؟", faqAnswer3: "يمكنك تسجيل الماء والوجبات والتمرين من المتابعة اليومية، أو اختيار وصفة من دليل الأكل المرجعي.", faqQuestion4: "هل أحتاج إلى حساب لاستخدام Yoldaş؟", faqAnswer4: "لا. يمكنك البدء كتجربة، لكن إنشاء حساب يساعدك على حفظ خططك وسجل متابعتك.", faqQuestion5: "هل ميري بديل للطبيب أو أخصائي التغذية؟", faqAnswer5: "لا. ميري تقدم إرشادات عامة داعمة، وليست تشخيصًا أو بديلًا للطبيب أو المختص عند وجود حالة صحية خاصة.",
      unexpectedError: "حدث خطأ غير متوقع. حاول مرة أخرى.", notConfigured: "لم يتم إعداد الاتصال بعد. راجع README_AR.md لوضع رابط Supabase والمفتاح العام.", journeyPreparing: "جاري تجهيز رحلتك...", journeyError: "تعذر بدء رحلتك الآن. تأكد من إعداد Supabase وحاول مرة أخرى.",
      missionMeal: "سجّل وجبة", missionWater: "اشرب ماء", missionMovement: "سجّل حركة", missionPlan: "أنشئ أو راجع خطتك", done: "تم", pending: "بانتظارك", calorieOf: "من أصل {goal} سعرة", mealStart: "سجّل وجبة لبدء المتابعة", todayLoadError: "تعذر تحميل بيانات اليوم. حاول مرة أخرى.", saving: "جاري الحفظ...", saveError: "تعذر حفظ التحديث. بياناتك لم تُحسب مرتين. حاول مرة أخرى.", assistantFallback: "تم.",
      currentPlan: "خطتك الحالية", planDisclaimer: "هذه إرشادات عامة وليست تشخيصًا طبيًا.", planCreating: "جاري إنشاء الخطة...", progressMeals: "وجبات مسجّلة خلال ٧ أيام", progressMinutes: "دقائق حركة خلال ٧ أيام", progressWeight: "آخر وزن مسجّل", kilogram: "كجم", communityAlias: "رفيق", communityEmpty: "لا توجد رسائل بعد. كن أول من يشارك خطوة صغيرة أو سؤالًا داعمًا.", communityLoadError: "تعذر تحميل المجتمع الآن. حاول مرة أخرى.", communityPostError: "تعذر نشر مشاركتك الآن. حاول مرة أخرى.", settingsSaveError: "تعذر حفظ التحديث. بياناتك لم تُحسب مرتين. حاول مرة أخرى.", exportError: "تعذر تصدير بياناتك الآن. حاول مرة أخرى.", deleteConfirm: "سيتم حذف كل بياناتك المسجّلة نهائيًا. هل أنت متأكد؟", deleteSuccess: "تم حذف بياناتك بنجاح.", deleteError: "تعذر حذف بياناتك الآن. حاول مرة أخرى.",
      dailyTracking: "المتابعة اليومية", yourSteps: "خطواتك", addWater: "+ كوباية ميه", activePlanSummary: "الخطة النشطة", activePlanNone: "مفيش خطة حالية", activePlanActive: "محفوظة في حسابك", activePlanBoth: "أكل + تمرين", emptyTodayTitle: "بياناتك تظهر هنا", emptyTodayDescription: "لن نعرض أرقامًا أو مستخدمين وهميين. ابدأ بتسجيل أي خطوة في يومك.", retry: "حاول مرة أخرى", yourJourney: "مسيرتك", progressDescription: "صورة أوضح لخطواتك كل ما سجّلت بياناتك الحقيقية.", progressEmptyTitle: "لسه مفيش بيانات هنا", progressEmptyDescription: "ابدأ بتسجيل أول وجبة أو تمرين، وسنحوّل خطواتك الصغيرة إلى صورة أوضح لتقدمك.",
      leaveJourneyConfirm: "هل تريد الخروج من رحلتك الحالية على هذا المتصفح؟",
      referenceRecipes: "وصفات مرجعية محلية", foodCatalogTitle: "دليل أكل Yoldaş", foodCatalogDescription: "وصفات مصرية وتركية ووجبات يومية بحصص متوسطة وأوزان واضحة. القيمة مرجعية وتختلف مع الزيت والإضافات والحجم الفعلي.", foodSearchPlaceholder: "ابحث عن كشري أو دونر أو بيض وخبز...", allRecipes: "الكل", egyptRecipes: "مصرية", turkeyRecipes: "تركية", dailyRecipes: "وجبات يومية", referenceServing: "الحصة المرجعية", portionSmall: "أقل من المتوسط", portionMedium: "متوسط", portionLarge: "أكبر من المتوسط", saveReferenceMeal: "سجّل هذه الوجبة", catalogLoading: "جاري تحميل الوصفات...", catalogEmpty: "لا توجد وصفة مطابقة. جرّب اسمًا آخر.", catalogSaveSuccess: "تم تسجيل وجبتك من دليل Yoldaş المرجعي.", catalogSaveError: "تعذر تسجيل الوجبة الآن. حاول مرة أخرى.", referenceMealNote: "قيمة مرجعية محسوبة لوصفة Yoldaş وحصة تقريبية؛ عدّل الحجم إذا كانت حصتك مختلفة.", recipeSource: "مصدر حساب المكوّنات", recipeIngredients: "مكونات الحصة المرجعية", protein: "بروتين", carbs: "كربوهيدرات", fat: "دهون", grams: "غرام", kcal: "سعرة",
      supportSpace: "مساحة داعمة", communityDescription: "شارك خطوة صغيرة أو سؤالًا، باسم مستعار غير شخصي.", communityPlaceholder: "شارك خطوة صغيرة أو سؤالًا...", publish: "نشر", communityNoteBefore: "ستظهر مشاركتك باسمك المستعار", communityNoteAfter: "فقط. يمكنك تغييره من الإعدادات.", fullControl: "تحكّم كامل", settingsDescription: "عدّل هدفك وتفضيلاتك، أو تعرّف على خصوصية جلستك.", aliasTitle: "الاسم المستعار في المجتمع", aliasPlaceholder: "مثال: رفيق_هادي", save: "حفظ", goalTitle: "الهدف الأساسي", goalPlaceholder: "مثال: خسارة وزن بهدوء", reminderTitle: "تفضيلات التذكير", reminderToggle: "ذكّرني بتسجيل يومي (اختياري)", reminderHint: "لن نطلب إذن الإشعارات إلا بعد أن ترى فائدة واضحة، ولن نفعّله دون موافقتك.", privacyTitle: "بياناتك وخصوصيتك", privacyHint: "في وضع التجربة، بياناتك مرتبطة بهذا المتصفح فقط. الحساب باسم المستخدم يحفظ رحلتك بشكل منفصل.", exportData: "تصدير بياناتي", deleteData: "حذف بياناتي", openGymMode: "وضع الجيم", gymEyebrow: "تدريبك الحقيقي", gymTitle: "وضع الجيم", gymDescription: "سجّل كل مجموعة بوزنها وعداتها. تقدمك يعتمد على أرقامك التي تدخلها أنت فقط.", gymExercise: "التمرين", gymExercisePlaceholder: "مثال: بنش برس", gymSetNumber: "المجموعة", gymReps: "العدات", gymWeight: "الوزن (كجم)", gymSaveSet: "سجّل المجموعة", gymRecentSets: "آخر المجموعات", gymPersonalBest: "أفضل أرقامك المسجلة", gymNoSets: "لم تسجّل أي مجموعة بعد.", gymNoBests: "ستظهر أفضل أرقامك بعد أول مجموعة.", gymSaved: "تم تسجيل المجموعة.", gymNewBest: "أحسنت! هذا أعلى وزن مسجل لك في {exercise} حتى الآن.", gymSetupRequired: "شغّل ملف gym-mode-setup.sql في Supabase مرة واحدة لتفعيل وضع الجيم.", gymSaveError: "تعذر حفظ مجموعة الجيم الآن. حاول مرة أخرى.", gymSetExists: "رقم هذه المجموعة موجود لهذا التمرين اليوم. غيّر رقم المجموعة أو التمرين.", gymSetsToday: "مجموعة جيم اليوم", gymWeekSets: "{count} مجموعة خلال 7 أيام", progressGymSets: "مجموعات جيم مسجلة خلال 7 أيام", miriStyleTitle: "أسلوب ميري", miriStyleDescription: "اختَر نبرة الحديث التي تناسبك. حدود الإرشاد الصحي لا تتغير.", miriStyleSupportive: "داعم ودافئ", miriStyleSupportiveHint: "تشجيع متزن وخطوة بسيطة.", miriStyleCalm: "هادئ ومباشر", miriStyleCalmHint: "إجابة قصيرة بلا زحمة كلام.", miriStyleEnergetic: "حماسي", miriStyleEnergeticHint: "طاقة وتشجيع من غير ضغط.", saveMiriStyle: "حفظ أسلوب ميري",
    },
    tr: {
      dailyCompanion: "Günlük yol arkadaşın", startGuest: "Misafir olarak başla ←", accountButton: "Giriş yap veya hesap oluştur", discoverHow: "Yoldaş nasıl çalışır?",
      privacyFirst: "Gizlilik önce gelir.", guestPrivacy: "Hesapsız deneyebilir veya yolculuğunu kullanıcı adı ve şifreyle kaydedebilirsin.",
      accountEyebrow: "Yolculuğunu kaydet", createAccount: "Hesap oluştur", login: "Giriş yap", close: "Kapat", username: "Kullanıcı adı", password: "Şifre",
      usernameHint: "3–24 küçük İngilizce harf, sayı, nokta, alt çizgi veya tire kullan.", passwordHint: "En az 8 karakterlik bir şifre kullan.", recoveryEmail: "Kurtarma e-postası", recoveryEmailPlaceholder: "name@example.com", recoveryEmailHint: "Özeldir, kimseye görünmez. Yalnızca şifreni unutursan kullanılır.", saveRecoveryEmail: "Kurtarma e-postasını kaydet", forgotPassword: "Şifreni mi unuttun?", resetPasswordHint: "Hesapta bir kurtarma e-postası varsa, şifre değiştirme bağlantısı göndeririz.", sendResetLink: "Kurtarma bağlantısını gönder", backToLogin: "Girişe dön", resetLinkSent: "Hesapta kurtarma e-postası varsa bağlantı gönderildi.", recoveryEmailSaved: "Kurtarma e-postası kaydedildi.", resetCompleteTitle: "Yeni şifre seç", resetCompleteHint: "Hesabın için en az 8 karakterlik yeni bir şifre yaz.", newPassword: "Yeni şifre", confirmPassword: "Şifreyi doğrula", saveNewPassword: "Yeni şifreyi kaydet", passwordMismatch: "Şifreler eşleşmiyor.", passwordChanged: "Şifre değiştirildi. Artık yeni şifrenle giriş yapabilirsin.",
      usernamePlaceholder: "Örnek: ahmed.fit", passwordPlaceholder: "En az 8 karakter",
      signupTitle: "Hesap oluştur", loginTitle: "Giriş yap", signupDescription: "Kullanıcı adı, şifre ve özel kurtarma e-postası oluştur.", loginDescription: "Kaydettiğin kullanıcı adı ve şifreyle giriş yap.",
      signupSubmit: "Hesabımı oluştur", loginSubmit: "Giriş yap", startOver: "Baştan başla", assistantGreeting: "Merhaba, ben Miri. Bugün ne yediğini ya da antrenmanını yaz; birlikte yararlı bir sonraki adımı bulalım.",
      chatPlaceholder: "Yemeğini veya sorunu yaz...", thinking: "Miri yanıtını hazırlıyor...", retryError: "Miri’ye şu anda ulaşılamıyor. Lütfen tekrar dene.", aiDailyLimit: "Bugün Miri sınırına ulaştın. Öğününü yemek rehberinden elle kaydedebilir veya yarın tekrar deneyebilirsin.", aiUsageSetup: "Miri sınırı için yeni SQL dosyasını Supabase içinde bir kez çalıştırman gerekiyor.", reactionFire: "Harika", reactionClap: "Devam et", reactionHeart: "Seninle gurur duyuyorum",
      planCreated: "Planın hazır.", planError: "Plan şu anda oluşturulamadı. Lütfen tekrar dene.", newPlan: "Yeni plan oluştur", planTranslating: "Planın çevriliyor...", planTranslateError: "Plan şu anda çevrilemedi. Özgün sürüm görünmeye devam edecek.",
      planFood: "Beslenme planı", planWorkout: "Antrenman planı", question: "Soru", of: "/", next: "İleri", createPlan: "Planı oluştur",
      heroEyebrow: "Yolculuğun anlaşılır bir adımla başlar", heroTitleLead: "Vücudunu geliştir. Alışkanlıklarını güçlendir.", heroTitleTail: "Sonraki adımın burada başlar.", heroDescription: "Hedefini karmaşa ve yasaklar olmadan beslenme, hareket ve günlük takibe dönüştürüyoruz.", adSlotLabel: "Reklam alanı", adSlotHint: "Google reklamı için hazır",
      heroStepFood: "Daha akıllı beslenme", heroStepMove: "Düzenli hareket", heroStepTrack: "Sakin takip", introEyebrow: "Kişisel sağlık programın", introTitle: "Doğru başlamak için ihtiyacın olan her şey tek yerde.", introDescription: "Hedefine uygun beslenme ve antrenman planları, su, öğün ve hareket takibi ile doğal dilini anlayan bir yardımcı.",
      featureFood: "Kişisel beslenme planı", featureFoodSub: "Hedefine ve tercihine göre", featureWorkout: "Düzenlenebilir antrenman planı", featureWorkoutSub: "Zamanına ve seviyene göre", featureTrack: "Basit günlük takip", featureTrackSub: "Su, öğün ve egzersiz", featureAssistant: "Miri ile destek", featureAssistantSub: "Doğal dilinle sor ve kaydet",
      howEyebrow: "Basit bir yolculuk", howTitle: "Yoldaş nasıl çalışır?", navToday: "Bugün", navPlans: "Planlar", navAssistant: "Yardımcı", navProgress: "İlerleme", navCommunity: "Topluluk", navSettings: "Ayarlar",
      todayTitle: "Bugünkü görevim", todayDescription: "Baskı olmadan devam etmene yardım eden küçük ve açık adımlar.", remainingCalories: "Kalan kalori", water: "Su", cupsToday: "Bugünün bardağı", meals: "Öğünler", mealsToday: "Bugünün öğünleri", movement: "Hareket", minutesToday: "Bugünün dakikası", streak: "Seri", streakStart: "Başlamak için bugün bir adım kaydet", streakDayOne: "ardışık gün", streakDays: "ardışık gün",
      personalPlan: "Kişisel plan", planTitle: "Beslenme veya antrenman planı", planDescription: "Dört kısa soruyu yanıtla; Miri sana uygun bir başlangıç hazırlasın.", healthAssistant: "Miri, sağlık yardımcın", askYoldas: "Miri’ye sor", assistantDescription: "Öğünün, antrenmanın veya hedefin hakkında doğal dilinle yaz; Miri sana uygulanabilir ve motive edici bir sonraki adımı versin.", assistantName: "Miri", assistantStatus: "Her adımda yanında", promptWalk: "20 dakika yürüdüm", promptBreakfast: "Hızlı sağlıklı kahvaltı", promptOrganize: "Günümü düzenle", send: "Gönder",
      promptWalkValue: "Bugün 20 dakika yürüdüm", promptBreakfastValue: "Bana hızlı ve sağlıklı bir kahvaltı öner", promptOrganizeValue: "Bugünkü öğünlerimi nasıl düzenleyebilirim?",
      howStep1Title: "Kısa soruları yanıtla", howStep1Desc: "Hedefin ve mevcut durumun hakkında.", howStep2Title: "Kişisel planını al", howStep2Desc: "Sana uygun beslenme ve antrenman.", howStep3Title: "Gününü kaydet", howStep3Desc: "Su, öğün ve egzersiz.", howStep4Title: "Zamanla düzenle", howStep4Desc: "İhtiyacına ve gelişimine göre.",
      howDetail1Title: "Gerçek hedefinle başla", howDetail1Desc: "Hedefini, hareket düzeyini, uygun zamanını ve tercihlerini seçersin. Herkese aynı planı kullanmıyoruz.", howDetail2Title: "Uygulanabilir bir başlangıç planı", howDetail2Desc: "Yoldaş beslenme veya antrenman için pratik bir başlangıç hazırlar. Zamanın veya hedefin değiştiğinde yeni plan oluşturabilirsin.", howDetail3Title: "Baskısız günlük takip", howDetail3Desc: "Bir bardak su, öğün veya egzersiz kaydet. Günün adımları yalnızca gerçek verilerinden görünür; sahte sayı veya başarı yoktur.", howDetail4Title: "Miri ile destek", howDetail4Desc: "Ne yediğini yaz veya Miri’ye gününü düzenlemeyi sor. Bu genel yönlendirmedir; özel bir sağlık durumunda doktorun veya uzmanın yerini tutmaz.",
      faqEyebrow: "Kısa sorular", faqTitle: "Yoldaş hakkında sık sorulanlar", faqIntro: "Planlama, takip ve Miri hakkında doğrudan yanıtlar.", faqQuestion1: "Yoldaş nedir?", faqAnswer1: "Yoldaş, kişisel bir plan ve basit günlük takiple beslenmeni ve hareketini düzenlemene yardımcı olan bir platformdur.", faqQuestion2: "Yoldaş kişisel beslenme ve antrenman planı sunar mı?", faqAnswer2: "Evet. Hedefin, zamanın ve seviyen hakkında soruları yanıtlarsın; Miri düzenlenebilir bir beslenme veya antrenman başlangıcı hazırlar.", faqQuestion3: "Yoldaş’ta öğünlerimi ve hareketimi nasıl kaydederim?", faqAnswer3: "Günlük takipten su, öğün ve egzersiz kaydedebilir veya yemek rehberinden bir tarif seçebilirsin.", faqQuestion4: "Yoldaş’ı kullanmak için hesap gerekli mi?", faqAnswer4: "Hayır. Misafir olarak başlayabilirsin; ancak hesap oluşturmak planlarını ve takip geçmişini kaydetmene yardımcı olur.", faqQuestion5: "Miri doktorun veya diyetisyenin yerine geçer mi?", faqAnswer5: "Hayır. Miri genel destekleyici yönlendirme sunar; özel bir sağlık durumunda doktorun veya uzmanın yerini tutmaz.",
      unexpectedError: "Beklenmeyen bir hata oluştu. Lütfen tekrar dene.", notConfigured: "Bağlantı henüz ayarlanmadı. Supabase adresi ve genel anahtar için README_AR.md dosyasını kontrol et.", journeyPreparing: "Yolculuğun hazırlanıyor...", journeyError: "Yolculuğun başlatılamadı. Supabase ayarlarını kontrol edip tekrar dene.",
      missionMeal: "Öğün kaydet", missionWater: "Su iç", missionMovement: "Hareket kaydet", missionPlan: "Planını oluştur veya incele", done: "Tamam", pending: "Seni bekliyor", calorieOf: "{goal} kaloriden", mealStart: "Takibi başlatmak için bir öğün kaydet", todayLoadError: "Bugünün verileri yüklenemedi. Lütfen tekrar dene.", saving: "Kaydediliyor...", saveError: "Güncelleme kaydedilemedi. Verilerin iki kez sayılmadı; tekrar dene.", assistantFallback: "Tamam.",
      currentPlan: "Mevcut planın", planDisclaimer: "Bu genel yönlendirmedir; tıbbi teşhis değildir.", planCreating: "Plan hazırlanıyor...", progressMeals: "Son 7 gündeki kayıtlı öğünler", progressMinutes: "Son 7 gündeki hareket dakikaları", progressWeight: "Son kayıtlı kilo", kilogram: "kg", communityAlias: "Yoldaş", communityEmpty: "Henüz mesaj yok. Küçük bir adımını veya destekleyici bir sorunu ilk sen paylaş.", communityLoadError: "Topluluk şu anda yüklenemedi. Lütfen tekrar dene.", communityPostError: "Paylaşımın yayınlanamadı. Lütfen tekrar dene.", settingsSaveError: "Güncelleme kaydedilemedi. Verilerin iki kez sayılmadı; tekrar dene.", exportError: "Verilerin dışa aktarılamadı. Lütfen tekrar dene.", deleteConfirm: "Kayıtlı tüm verilerin kalıcı olarak silinecek. Emin misin?", deleteSuccess: "Verilerin başarıyla silindi.", deleteError: "Verilerin silinemedi. Lütfen tekrar dene.",
      dailyTracking: "Günlük takip", yourSteps: "Adımların", addWater: "+ Bir bardak su", activePlanSummary: "Etkin plan", activePlanNone: "Etkin plan yok", activePlanActive: "Hesabında kayıtlı", activePlanBoth: "Beslenme + antrenman", emptyTodayTitle: "Verilerin burada görünür", emptyTodayDescription: "Sahte sayı veya kullanıcı göstermiyoruz. Gününden herhangi bir adımı kaydederek başla.", retry: "Tekrar dene", yourJourney: "Yolculuğun", progressDescription: "Gerçek verilerini kaydettikçe adımlarının daha net bir görünümü.", progressEmptyTitle: "Henüz veri yok", progressEmptyDescription: "İlk öğününü veya egzersizini kaydet; küçük adımlarını ilerlemenin daha net bir resmine dönüştürelim.",
      leaveJourneyConfirm: "Bu tarayıcıdaki mevcut yolculuğundan çıkmak istiyor musun?",
      referenceRecipes: "Yerel referans tarifler", foodCatalogTitle: "Yoldaş yemek rehberi", foodCatalogDescription: "Açık porsiyon ve ağırlıklarla Mısır, Türkiye ve günlük yemek tarifleri. Değer referanstır; yağ, ek malzeme ve gerçek boyutla değişir.", foodSearchPlaceholder: "Koshari, döner veya yumurta-ekmek ara...", allRecipes: "Tümü", egyptRecipes: "Mısır", turkeyRecipes: "Türkiye", dailyRecipes: "Günlük yemekler", referenceServing: "Referans porsiyon", portionSmall: "Ortadan küçük", portionMedium: "Orta", portionLarge: "Ortadan büyük", saveReferenceMeal: "Bu öğünü kaydet", catalogLoading: "Tarifler yükleniyor...", catalogEmpty: "Eşleşen tarif yok. Başka bir ad dene.", catalogSaveSuccess: "Öğünün Yoldaş referans rehberinden kaydedildi.", catalogSaveError: "Öğün şu anda kaydedilemedi. Lütfen tekrar dene.", referenceMealNote: "Yoldaş tarifine ve yaklaşık porsiyona göre hesaplanmış referans değerdir; porsiyonun farklıysa boyutu değiştir.", recipeSource: "İçerik hesaplama kaynağı", recipeIngredients: "Referans porsiyonun malzemeleri", protein: "Protein", carbs: "Karbonhidrat", fat: "Yağ", grams: "g", kcal: "kcal",
      supportSpace: "Destekleyici alan", communityDescription: "Kişisel olmayan bir rumuzla küçük bir adımını veya sorunu paylaş.", communityPlaceholder: "Küçük bir adımını veya sorunu paylaş...", publish: "Yayınla", communityNoteBefore: "Paylaşımın yalnızca şu rumuzla görünür:", communityNoteAfter: "Bunu ayarlardan değiştirebilirsin.", fullControl: "Tam kontrol", settingsDescription: "Hedefini ve tercihlerini düzenle; oturumunun gizliliğini öğren.", aliasTitle: "Topluluktaki rumuzun", aliasPlaceholder: "Örnek: sakin_yoldas", save: "Kaydet", goalTitle: "Ana hedef", goalPlaceholder: "Örnek: Sakin şekilde kilo vermek", reminderTitle: "Hatırlatıcı tercihleri", reminderToggle: "Günlük kayıt hatırlat (isteğe bağlı)", reminderHint: "Yararlı olduğunu görmeden bildirim izni istemeyiz ve onayın olmadan etkinleştirmeyiz.", privacyTitle: "Verilerin ve gizliliğin", privacyHint: "Misafir modunda verilerin yalnızca bu tarayıcıya bağlıdır. Kullanıcı adlı hesap yolculuğunu ayrı olarak saklar.", exportData: "Verilerimi dışa aktar", deleteData: "Verilerimi sil", openGymMode: "Spor modu", gymEyebrow: "Gerçek antrenmanın", gymTitle: "Spor modu", gymDescription: "Her seti ağırlığı ve tekrarıyla kaydet. İlerlemen yalnızca girdiğin sayılara dayanır.", gymExercise: "Egzersiz", gymExercisePlaceholder: "Örnek: Bench press", gymSetNumber: "Set", gymReps: "Tekrar", gymWeight: "Ağırlık (kg)", gymSaveSet: "Seti kaydet", gymRecentSets: "Son setler", gymPersonalBest: "Kayıtlı en iyi sayıların", gymNoSets: "Henüz bir set kaydetmedin.", gymNoBests: "İlk setinden sonra en iyi sayıların görünür.", gymSaved: "Set kaydedildi.", gymNewBest: "Harika! Bu, {exercise} için şu ana kadarki en yüksek kayıtlı ağırlığın.", gymSetupRequired: "Spor modunu etkinleştirmek için Supabase’de gym-mode-setup.sql dosyasını bir kez çalıştır.", gymSaveError: "Spor seti şu anda kaydedilemedi. Lütfen tekrar dene.", gymSetExists: "Bu egzersiz için bu set numarası bugün zaten var. Set numarasını veya egzersizi değiştir.", gymSetsToday: "bugünkü spor seti", gymWeekSets: "Son 7 günde {count} set", progressGymSets: "Son 7 günde kayıtlı spor setleri", miriStyleTitle: "Miri’nin tarzı", miriStyleDescription: "Sana uygun konuşma tonunu seç. Sağlık yönlendirme sınırları değişmez.", miriStyleSupportive: "Destekleyici ve sıcak", miriStyleSupportiveHint: "Dengeli destek ve küçük bir adım.", miriStyleCalm: "Sakin ve doğrudan", miriStyleCalmHint: "Az sözle net cevap.", miriStyleEnergetic: "Enerjik", miriStyleEnergeticHint: "Baskı olmadan enerji ve destek.", saveMiriStyle: "Miri tarzını kaydet",
    },
  };

  UI_TEXT.en = {
    dailyCompanion: "Your daily companion", startGuest: "Start as a guest", accountButton: "Sign in or create an account", discoverHow: "See how Yoldaş works", privacyFirst: "Privacy first.", guestPrivacy: "Try without an account, or save your journey with a username and password.",
    accountEyebrow: "Save your journey", createAccount: "Create account", login: "Sign in", close: "Close", username: "Username", password: "Password", usernameHint: "Use 3–24 lowercase English letters, numbers, dots, underscores, or hyphens.", passwordHint: "Use at least 8 characters.", recoveryEmail: "Recovery email", recoveryEmailPlaceholder: "name@example.com", recoveryEmailHint: "Private and never shown to others. Used only if you forget your password.", saveRecoveryEmail: "Save recovery email", forgotPassword: "Forgot password?", resetPasswordHint: "If the account has a recovery email, we will send a password-reset link.", sendResetLink: "Send recovery link", backToLogin: "Back to sign in", resetLinkSent: "If this account has a recovery email, a link was sent.", recoveryEmailSaved: "Recovery email saved.", resetCompleteTitle: "Choose a new password", resetCompleteHint: "Use at least 8 characters for your new password.", newPassword: "New password", confirmPassword: "Confirm password", saveNewPassword: "Save new password", passwordMismatch: "The passwords do not match.", passwordChanged: "Your password was changed. You can now sign in with it.", usernamePlaceholder: "Example: ahmed.fit", passwordPlaceholder: "At least 8 characters", signupTitle: "Create account", loginTitle: "Sign in", signupDescription: "Create a username, password, and private recovery email.", loginDescription: "Sign in with your saved username and password.", signupSubmit: "Create my account", loginSubmit: "Sign in", startOver: "Start over",
    assistantGreeting: "Hi, I’m Miri. Tell me what you ate or how you trained today, and we’ll find one useful next step.", chatPlaceholder: "Write your meal or question...", thinking: "Miri is preparing a helpful reply...", retryError: "Miri is unavailable right now. Please try again.", aiDailyLimit: "You reached today’s Miri limit. You can log a meal manually from the food guide or return tomorrow.", aiUsageSetup: "Run the new SQL file once in Supabase to enable Miri limits.", reactionFire: "Nice!", reactionClap: "Keep going", reactionHeart: "Proud of you",
    planCreated: "Your plan is ready.", planError: "Your plan could not be created right now. Please try again.", newPlan: "Create a new plan", planTranslating: "Translating your plan...", planTranslateError: "Your plan could not be translated now. The original remains available.", planFood: "Food plan", planWorkout: "Workout plan", question: "Question", of: "of", next: "Next", createPlan: "Create plan",
    heroEyebrow: "Your journey starts with a clear step", heroTitleLead: "Change your body. Build your habits.", heroTitleTail: "Your next step starts here.", heroDescription: "We turn your goal into food, movement, and simple daily follow-up—without confusion or restriction.", adSlotLabel: "Ad space", adSlotHint: "Ready for a future Google ad", heroStepFood: "Smarter food", heroStepMove: "Steady movement", heroStepTrack: "Calm follow-up", introEyebrow: "Your personal health program", introTitle: "Everything you need to start well—in one place.", introDescription: "Food and workout plans for your goal, daily water, meals and movement tracking, plus a natural-language assistant.", featureFood: "Personal food plan", featureFoodSub: "Built around your goal and preferences", featureWorkout: "Editable workout plan", featureWorkoutSub: "Built around your time and level", featureTrack: "Simple daily tracking", featureTrackSub: "Water, meals, and movement", featureAssistant: "Clear support", featureAssistantSub: "Ask and log in natural language",
    howEyebrow: "A simple journey", howTitle: "How does Yoldaş work?", navToday: "Today", navPlans: "Plans", navAssistant: "Assistant", navProgress: "Progress", navCommunity: "Community", navSettings: "Settings", todayTitle: "My task today", todayDescription: "Small, clear steps that help you continue without pressure.", remainingCalories: "Calories left", water: "Water", cupsToday: "cups today", meals: "Meals", mealsToday: "meals today", movement: "Movement", minutesToday: "minutes today", streak: "Streak", streakStart: "Log one step today to begin", streakDayOne: "day in a row", streakDays: "days in a row", personalPlan: "Personal plan", planTitle: "Food or workout plan", planDescription: "Answer four short questions and Miri will prepare a suitable start.", healthAssistant: "Miri, your health companion", askYoldas: "Ask Miri", assistantDescription: "Write about your meal, workout, or goal in natural language; Miri gives you a practical next step.", assistantName: "Miri", assistantStatus: "With you step by step", promptWalk: "I walked for 20 minutes", promptBreakfast: "Quick healthy breakfast", promptOrganize: "Organize my day", promptWalkValue: "I walked for 20 minutes today", promptBreakfastValue: "Suggest a quick healthy breakfast", promptOrganizeValue: "How should I organize today’s meals?",
    howStep1Title: "Answer simple questions", howStep1Desc: "About your goal and current situation.", howStep2Title: "Get your personal plan", howStep2Desc: "Food and workouts that suit you.", howStep3Title: "Log your day", howStep3Desc: "Water, meals, and exercise.", howStep4Title: "Adjust over time", howStep4Desc: "Based on your needs and progress.", howDetail1Title: "Start with your real goal", howDetail1Desc: "Choose your goal, activity level, available time, and preferences. We do not use one plan for everyone.", howDetail2Title: "A practical starting plan", howDetail2Desc: "Yoldaş prepares a practical food or workout start that you can update when your time or goal changes.", howDetail3Title: "Daily tracking without pressure", howDetail3Desc: "Log a cup of water, a meal, or a workout. You see only your real data—never fake numbers or achievements.", howDetail4Title: "Support from Miri", howDetail4Desc: "Write what you ate or ask Miri to organize your day. This is general guidance and does not replace a clinician for special health needs.",
    faqEyebrow: "Quick questions", faqTitle: "Frequently asked questions about Yoldaş", faqIntro: "Direct answers about plans, tracking, and Miri.", faqQuestion1: "What is Yoldaş?", faqAnswer1: "Yoldaş is a platform that helps you organize food and movement with a personal plan and simple daily tracking.", faqQuestion2: "Does Yoldaş provide personal food and workout plans?", faqAnswer2: "Yes. You answer questions about your goal, time, and level, then Miri creates a practical, editable food or workout starting plan.", faqQuestion3: "How do I log meals and movement in Yoldaş?", faqAnswer3: "You can log water, meals, and exercise from daily tracking, or choose a recipe from the reference food guide.", faqQuestion4: "Do I need an account to use Yoldaş?", faqAnswer4: "No. You can begin as a guest, but an account helps you save your plans and tracking history.", faqQuestion5: "Is Miri a replacement for a doctor or dietitian?", faqAnswer5: "No. Miri provides supportive general guidance and is not a diagnosis or a replacement for a clinician or specialist for a health condition.",
    unexpectedError: "An unexpected error occurred. Please try again.", notConfigured: "The connection is not set up yet. Check README_AR.md for the Supabase URL and public key.", journeyPreparing: "Preparing your journey...", journeyError: "Your journey could not be started. Check Supabase and try again.", missionMeal: "Log a meal", missionWater: "Drink water", missionMovement: "Log movement", missionPlan: "Create or review your plan", done: "Done", pending: "Waiting for you", calorieOf: "of {goal} calories", mealStart: "Log a meal to start tracking", todayLoadError: "Today’s data could not be loaded. Please try again.", saving: "Saving...", saveError: "The update could not be saved. Your data was not counted twice. Try again.", assistantFallback: "Done.", currentPlan: "Your current plan", planDisclaimer: "This is general guidance, not medical diagnosis.", planCreating: "Creating your plan...", progressMeals: "Meals logged in the last 7 days", progressMinutes: "Movement minutes in the last 7 days", progressWeight: "Latest logged weight", kilogram: "kg", communityAlias: "Companion", communityEmpty: "No messages yet. Be the first to share a small step or supportive question.", communityLoadError: "Community could not be loaded right now.", communityPostError: "Your post could not be published.", settingsSaveError: "The update could not be saved.", exportError: "Your data could not be exported.", deleteConfirm: "All your saved data will be permanently deleted. Are you sure?", deleteSuccess: "Your data was deleted.", deleteError: "Your data could not be deleted.",
    dailyTracking: "Daily tracking", yourSteps: "Your steps", addWater: "+ Water cup", activePlanSummary: "Active plan", activePlanNone: "No active plan", activePlanActive: "Saved in your account", activePlanBoth: "Food + workout", emptyTodayTitle: "Your data appears here", emptyTodayDescription: "We never show fake numbers or users. Start by logging any step from your day.", retry: "Try again", yourJourney: "Your journey", progressDescription: "A clearer view of your steps as you log real data.", progressEmptyTitle: "No data yet", progressEmptyDescription: "Log your first meal or workout and we will turn your small steps into a clearer view of progress.", leaveJourneyConfirm: "Leave your current journey on this browser?",
    referenceRecipes: "Local reference recipes", foodCatalogTitle: "Yoldaş food guide", foodCatalogDescription: "Egyptian, Turkish, and everyday recipes with clear portions and weights. Values are references and vary with oil, extras, and actual size.", foodSearchPlaceholder: "Search for koshari, döner, or eggs and bread...", allRecipes: "All", egyptRecipes: "Egyptian", turkeyRecipes: "Turkish", dailyRecipes: "Everyday meals", referenceServing: "Reference serving", portionSmall: "Smaller than average", portionMedium: "Average", portionLarge: "Larger than average", saveReferenceMeal: "Log this meal", catalogLoading: "Loading recipes...", catalogEmpty: "No matching recipe. Try another name.", catalogSaveSuccess: "Your meal was logged from the Yoldaş reference guide.", catalogSaveError: "The meal could not be logged now. Try again.", referenceMealNote: "A reference value calculated for a Yoldaş recipe and approximate serving; adjust the size if your serving differs.", recipeSource: "Ingredient calculation source", recipeIngredients: "Reference-serving ingredients", protein: "Protein", carbs: "Carbs", fat: "Fat", grams: "g", kcal: "kcal",
    supportSpace: "Support space", communityDescription: "Share a small step or question with a non-personal alias.", communityPlaceholder: "Share a small step or question...", publish: "Publish", communityNoteBefore: "Your post appears only as", communityNoteAfter: ". You can change this in settings.", fullControl: "Full control", settingsDescription: "Adjust your goal and preferences, or learn about session privacy.", aliasTitle: "Community alias", aliasPlaceholder: "Example: calm_companion", save: "Save", goalTitle: "Main goal", goalPlaceholder: "Example: Lose weight calmly", reminderTitle: "Reminder preferences", reminderToggle: "Remind me to log daily (optional)", reminderHint: "We do not request notification permission before it is useful, and never enable it without your consent.", privacyTitle: "Your data and privacy", privacyHint: "In guest mode, data is linked only to this browser. A username account saves your journey separately.", exportData: "Export my data", deleteData: "Delete my data", openGymMode: "Gym mode", gymEyebrow: "Your real training", gymTitle: "Gym mode", gymDescription: "Log each set with weight and reps. Your progress depends only on numbers you enter.", gymExercise: "Exercise", gymExercisePlaceholder: "Example: Bench press", gymSetNumber: "Set", gymReps: "Reps", gymWeight: "Weight (kg)", gymSaveSet: "Log set", gymRecentSets: "Recent sets", gymPersonalBest: "Your best logged lifts", gymNoSets: "You have not logged a set yet.", gymNoBests: "Your best lifts appear after your first set.", gymSaved: "Set logged.", gymNewBest: "Great! This is your highest logged weight for {exercise} so far.", gymSetupRequired: "Run gym-mode-setup.sql once in Supabase to enable Gym mode.", gymSaveError: "The gym set could not be saved now. Try again.", gymSetExists: "This set number already exists for this exercise today. Change the set number or exercise.", gymSetsToday: "gym sets today", gymWeekSets: "{count} sets in the last 7 days", progressGymSets: "Gym sets logged in the last 7 days", miriStyleTitle: "Miri style", miriStyleDescription: "Choose a speaking tone that suits you. Health guidance limits never change.", miriStyleSupportive: "Warm and supportive", miriStyleSupportiveHint: "Balanced encouragement and one small step.", miriStyleCalm: "Calm and direct", miriStyleCalmHint: "A clear reply without extra wording.", miriStyleEnergetic: "Energetic", miriStyleEnergeticHint: "Energy and encouragement without pressure.", saveMiriStyle: "Save Miri style"
  };

  const EXTRA_UI_TEXT = {
    ar: {
      motivationEyebrow: "دعم اختياري", motivationTitle: "خُد دفعة حماس حقيقية", motivationDescription: "رسالة كتبها مستخدم واختار مشاركتها بدون اسم. لا يوجد ترتيب ولا حسابات وهمية.", motivationGet: "اعرض رسالة داعمة", motivationEmpty: "لا توجد رسالة مشاركة الآن. يمكنك العودة لاحقًا أو كتابة رسالة حقيقية خاصة بك.", motivationLoadError: "تعذر تحميل رسالة الدعم الآن.", motivationSettingsTitle: "رسالة حماس اختيارية", motivationSettingsHint: "اكتب رسالة قصيرة حقيقية لو تحب تساعد شخصًا آخر. لن يظهر اسمك ولا يمكن للموقع اختراع رسائل أو نسبتها لك.", motivationPlaceholder: "مثال: البداية الصغيرة أحسن من انتظار اليوم المثالي.", motivationOptIn: "أوافق على مشاركة هذه الرسالة بدون اسمي داخل مساحة الدعم.", motivationSave: "احفظ تفضيل الرسالة", motivationSaved: "تم حفظ تفضيل الرسالة. يمكنك إيقاف المشاركة في أي وقت.", motivationSaveError: "تعذر حفظ تفضيل الرسالة الآن.", motivationSetupRequired: "دعم الحافز لم يتم تفعيله بعد: شغّل ملف motivation-support-setup.sql مرة واحدة داخل Supabase SQL Editor، ثم أعد تحميل الموقع.", motivationMinLength: "اكتب رسالة من 12 حرفًا على الأقل قبل المشاركة.",
      friendsEyebrow: "أصحابك المختارين", friendsDescription: "ابحث باسم مستخدم دقيق، أضف أصحابك بموافقتهم، وشارك ستريك صغير خاص.", findFriend: "ابحث عن صاحب", friendSearchPlaceholder: "اكتب اسم المستخدم بالضبط", search: "بحث", addFriend: "أرسل طلب صداقة", requestSent: "تم إرسال طلب الصداقة.", friendRequests: "طلبات الصداقة", myFriends: "أصحابي", accept: "قبول", decline: "رفض", removeFriend: "إزالة", block: "حظر", report: "إبلاغ", noRequests: "لا توجد طلبات صداقة الآن.", noFriends: "لسه ما أضفتش أصحاب.", noSearchResult: "لم نجد حسابًا مطابقًا أو لا يسمح بالبحث عنه.", friendStreakDays: "يوم ستريك", friendStreakStart: "ابدأ الستريك", streakSetupRequired: "لتشغيل عداد الستريك، شغّل ملف friend-streak-counter-setup.sql مرة واحدة داخل Supabase SQL Editor.", snapEyebrow: "ستريك خاص", snapTitle: "صورة ستريك لصاحب", snapPrivacy: "صورة واحدة يوميًا لكل صديق، تظهر 24 ساعة فقط. لا ترسل صورًا حساسة أو شخصية.", snapFriend: "الصاحب", snapPhoto: "الصورة", snapCaption: "كلمة قصيرة (اختياري)", snapCaptionPlaceholder: "مثال: مشي اليوم", sendSnap: "أرسل الستريك", snapNoFriends: "أضف صديقًا مقبولًا أولًا لإرسال ستريك.", snapSaved: "تم إرسال الستريك، وينتهي خلال 24 ساعة.", snapEmpty: "لا توجد صور ستريك نشطة الآن.", snapTooLarge: "حجم الصورة يجب ألا يتجاوز 2 ميجابايت.", snapUnsupported: "اختر صورة JPG أو WebP فقط.", snapLimit: "أرسلت ستريك لهذا الصديق اليوم بالفعل.", friendLimit: "وصل أحدكما إلى حد 20 صديقًا حاليًا.", communitySetupRequired: "شغّل ملف friends-recovery-setup.sql ثم انشر social-service لتفعيل الأصدقاء والستريك.", reportPrompt: "اكتب سببًا قصيرًا للإبلاغ", actionFailed: "تعذر تنفيذ هذا الإجراء الآن. حاول لاحقًا.",
    },
    tr: {
      motivationEyebrow: "İsteğe bağlı destek", motivationTitle: "Gerçek bir motivasyon mesajı al", motivationDescription: "Bir kullanıcının adı gösterilmeden paylaşmayı seçtiği gerçek bir mesajdır. Sıralama veya sahte hesap yoktur.", motivationGet: "Destek mesajı göster", motivationEmpty: "Şu anda paylaşılmış bir mesaj yok. Sonra tekrar deneyebilir veya kendi gerçek mesajını yazabilirsin.", motivationLoadError: "Destek mesajı şu anda yüklenemedi.", motivationSettingsTitle: "İsteğe bağlı motivasyon mesajı", motivationSettingsHint: "Başka birine yardımcı olmak istersen kısa ve gerçek bir mesaj yaz. Adın görünmez; uygulama sahte mesaj üretmez veya sana aitmiş gibi göstermez.", motivationPlaceholder: "Örnek: Küçük bir başlangıç, mükemmel günü beklemekten iyidir.", motivationOptIn: "Bu mesajın destek alanında adım olmadan paylaşılmasına izin veriyorum.", motivationSave: "Mesaj tercihini kaydet", motivationSaved: "Mesaj tercihin kaydedildi. Paylaşımı istediğin zaman kapatabilirsin.", motivationSaveError: "Mesaj tercihi şu anda kaydedilemedi.", motivationSetupRequired: "İsteğe bağlı destek henüz etkin değil: Supabase SQL Editor’da motivation-support-setup.sql dosyasını bir kez çalıştır, sonra siteyi yenile.", motivationMinLength: "Paylaşmadan önce en az 12 karakterlik bir mesaj yaz.",
      friendsEyebrow: "Seçtiğin arkadaşların", friendsDescription: "Tam kullanıcı adıyla ara, onayla arkadaş ekle ve özel küçük bir seri paylaş.", findFriend: "Arkadaş ara", friendSearchPlaceholder: "Kullanıcı adını tam yaz", search: "Ara", addFriend: "Arkadaşlık isteği gönder", requestSent: "Arkadaşlık isteği gönderildi.", friendRequests: "Arkadaşlık istekleri", myFriends: "Arkadaşlarım", accept: "Kabul et", decline: "Reddet", removeFriend: "Kaldır", block: "Engelle", report: "Bildir", noRequests: "Şu anda arkadaşlık isteği yok.", noFriends: "Henüz arkadaş eklemedin.", noSearchResult: "Eşleşen bir hesap bulunamadı veya aramaya izin vermiyor.", friendStreakDays: "günlük seri", friendStreakStart: "Seriye başla", streakSetupRequired: "Seri sayacını etkinleştirmek için friend-streak-counter-setup.sql dosyasını Supabase SQL Editor’da bir kez çalıştır.", snapEyebrow: "Özel seri", snapTitle: "Bir arkadaşa seri fotoğrafı", snapPrivacy: "Her arkadaş için günde bir fotoğraf; yalnızca 24 saat görünür. Hassas veya kişisel fotoğraf gönderme.", snapFriend: "Arkadaş", snapPhoto: "Fotoğraf", snapCaption: "Kısa not (isteğe bağlı)", snapCaptionPlaceholder: "Örnek: Bugünkü yürüyüş", sendSnap: "Seriyi gönder", snapNoFriends: "Seri göndermek için önce kabul edilmiş bir arkadaş ekle.", snapSaved: "Seri gönderildi; 24 saat içinde sona erer.", snapEmpty: "Şu anda etkin seri fotoğrafı yok.", snapTooLarge: "Fotoğraf boyutu 2 MB’ı aşmamalı.", snapUnsupported: "Yalnızca JPG veya WebP seç.", snapLimit: "Bugün bu arkadaşa zaten seri gönderdin.", friendLimit: "Biriniz 20 arkadaş sınırına ulaştı.", communitySetupRequired: "Arkadaşları ve serileri etkinleştirmek için friends-recovery-setup.sql dosyasını çalıştırıp social-service’i yayınla.", reportPrompt: "Bildirim için kısa bir neden yaz", actionFailed: "Bu işlem şu anda tamamlanamadı. Sonra tekrar dene.",
    },
    en: {
      motivationEyebrow: "Optional support", motivationTitle: "Get a real boost", motivationDescription: "A real message a user chose to share without their name. There are no rankings or fake accounts.", motivationGet: "Show a supportive message", motivationEmpty: "No shared message is available right now. You can return later or write your own real message.", motivationLoadError: "Support message could not be loaded now.", motivationSettingsTitle: "Optional motivation message", motivationSettingsHint: "Write a real short message if you want to help someone else. Your name is never shown and the app never invents messages.", motivationPlaceholder: "Example: A small start is better than waiting for the perfect day.", motivationOptIn: "I agree that this message may be shared without my name in the support space.", motivationSave: "Save message preference", motivationSaved: "Your message preference was saved. You can stop sharing at any time.", motivationSaveError: "Message preference could not be saved now.", motivationSetupRequired: "Optional support is not enabled yet: run motivation-support-setup.sql once in Supabase SQL Editor, then reload the site.", motivationMinLength: "Write at least 12 characters before sharing.",
      friendsEyebrow: "Friends you choose", friendsDescription: "Search by an exact username, add friends with mutual consent, and share a small private streak.", findFriend: "Find a friend", friendSearchPlaceholder: "Type the exact username", search: "Search", addFriend: "Send friend request", requestSent: "Friend request sent.", friendRequests: "Friend requests", myFriends: "My friends", accept: "Accept", decline: "Decline", removeFriend: "Remove", block: "Block", report: "Report", noRequests: "No friend requests right now.", noFriends: "You have not added friends yet.", noSearchResult: "No matching account was found, or it does not allow discovery.", friendStreakDays: "day streak", friendStreakStart: "Start a streak", streakSetupRequired: "Run friend-streak-counter-setup.sql once in Supabase SQL Editor to enable the streak counter.", snapEyebrow: "Private streak", snapTitle: "Streak photo for a friend", snapPrivacy: "One photo per friend per day, visible for 24 hours only. Do not send sensitive or personal images.", snapFriend: "Friend", snapPhoto: "Photo", snapCaption: "Short note (optional)", snapCaptionPlaceholder: "Example: Today’s walk", sendSnap: "Send streak", snapNoFriends: "Add an accepted friend before sending a streak.", snapSaved: "Streak sent. It expires within 24 hours.", snapEmpty: "No active streak photos right now.", snapTooLarge: "Photo size must not exceed 2 MB.", snapUnsupported: "Choose JPG or WebP only.", snapLimit: "You already sent this friend a streak today.", friendLimit: "One of you has reached the current 20-friend limit.", communitySetupRequired: "Run friends-recovery-setup.sql and deploy social-service to enable friends and streaks.", reportPrompt: "Write a short reason for the report", actionFailed: "This action could not be completed. Try again later."
    },
  };

  Object.assign(EXTRA_UI_TEXT.ar, {
    communityPrivateLabel: "خاص بين الأصدقاء", communityPromise: "لا يوجد ترتيب عام أو حسابات وهمية. أنت وحدك تختار أصدقاءك، وصور الستريك لا يراها إلا طرفا الصداقة.", communityFriendsStat: "أصحاب مقبولين", communityStreaksStat: "ستريك نشط", communitySnapsStat: "صور نشطة", communityFindHint: "ابحث باسم المستخدم الدقيق فقط، ثم أرسل طلب صداقة.", communityRequestsHint: "لا تتم إضافة أي شخص إلا بعد قبوله.", communityFriendsHint: "هنا يظهر عداد الستريك المشترك لكل صديق.", snapFromYou: "أنت"
  });
  Object.assign(EXTRA_UI_TEXT.tr, {
    communityPrivateLabel: "Arkadaşlar arasında özel", communityPromise: "Herkese açık sıralama veya sahte hesap yok. Arkadaşlarını yalnızca sen seçersin; seri fotoğraflarını sadece iki taraf görür.", communityFriendsStat: "Kabul edilen arkadaş", communityStreaksStat: "Etkin seri", communitySnapsStat: "Etkin fotoğraf", communityFindHint: "Yalnızca tam kullanıcı adıyla ara, sonra istek gönder.", communityRequestsHint: "Kimse kabulün olmadan eklenmez.", communityFriendsHint: "Her arkadaşınla ortak seri sayacını burada görürsün.", snapFromYou: "Sen"
  });
  Object.assign(EXTRA_UI_TEXT.en, {
    communityPrivateLabel: "Private between friends", communityPromise: "There are no public rankings or fake accounts. You choose your friends, and only the two friends can see streak photos.", communityFriendsStat: "Accepted friends", communityStreaksStat: "Active streaks", communitySnapsStat: "Active photos", communityFindHint: "Search by the exact username, then send a friend request.", communityRequestsHint: "No one is added unless they accept.", communityFriendsHint: "Your mutual streak counter appears beside each friend.", snapFromYou: "You"
  });
  Object.assign(EXTRA_UI_TEXT.ar, { planInputInvalid: "اكتب قيمة مناسبة قبل المتابعة.", planPersonalNote: "بياناتك دي خاصة بخطتك فقط، وميري تقدم إرشادًا عامًا لا تشخيصًا طبيًا." });
  Object.assign(EXTRA_UI_TEXT.tr, { planInputInvalid: "Devam etmeden önce uygun bir değer gir.", planPersonalNote: "Bu bilgiler yalnızca planın içindir; Miri tıbbi tanı değil, genel rehberlik sunar." });
  Object.assign(EXTRA_UI_TEXT.en, { planInputInvalid: "Enter a suitable value before continuing.", planPersonalNote: "These details are used only for your plan. Miri provides general guidance, not a medical diagnosis." });
  Object.assign(EXTRA_UI_TEXT.ar, { planEdit: "عدّل مع ميري", planEditTitle: "إيه اللي تحب نعدله؟", planEditPlaceholder: "مثال: بدّلي الغداء بحاجة بدون لبن، أو خففي ضغط اليوم الأول", planEditHint: "ميري هتعمل نسخة جديدة من خطتك وتحافظ على اللي مناسب منها.", planEditSend: "اطلبي التعديل", planEditEmpty: "اكتب التعديل اللي محتاجه الأول.", planEditTooLong: "اكتب التعديل في 600 حرف أو أقل.", planEditing: "ميري بتعدّل خطتك…", planEditError: "تعذر تعديل الخطة الآن. حاول مرة أخرى." });
  Object.assign(EXTRA_UI_TEXT.tr, { planEdit: "Miri ile düzenle", planEditTitle: "Neyi değiştirmek istersin?", planEditPlaceholder: "Örnek: Öğle yemeğini sütsüz bir seçenekle değiştir veya ilk gün şınavı azalt", planEditHint: "Miri planının yeni bir sürümünü hazırlar ve uygun olan kısımları korur.", planEditSend: "Düzenleme iste", planEditEmpty: "Önce istediğin değişikliği yaz.", planEditTooLong: "Değişikliği 600 karakter veya daha kısa yaz.", planEditing: "Miri planını düzenliyor…", planEditError: "Plan şu anda düzenlenemedi. Lütfen tekrar dene." });
  Object.assign(EXTRA_UI_TEXT.en, { planEdit: "Edit with Miri", planEditTitle: "What would you like to change?", planEditPlaceholder: "Example: Swap lunch for a dairy-free option, or reduce day-one push-ups", planEditHint: "Miri will create a new version of your plan while preserving what still fits.", planEditSend: "Request edit", planEditEmpty: "Write the change you need first.", planEditTooLong: "Keep your request to 600 characters or fewer.", planEditing: "Miri is updating your plan…", planEditError: "The plan could not be updated right now. Try again." });
  Object.assign(UI_TEXT.ar, { planDescription: "هدفك ومستواك وبياناتك الأساسية تساعد ميري تجهّز بداية عملية ومتدرجة." });
  Object.assign(UI_TEXT.tr, { planDescription: "Hedefin, seviyen ve temel bilgilerin Miri'nin sana uygun, aşamalı bir başlangıç hazırlamasına yardımcı olur." });
  Object.assign(UI_TEXT.en, { planDescription: "Your goal, level, and basic details help Miri prepare a practical, progressive starting plan." });
  Object.assign(UI_TEXT.ar, { homeConfirm: "هل تريد الرجوع إلى الصفحة الرئيسية؟ ستظل مسجّل الدخول وبياناتك محفوظة." });
  Object.assign(UI_TEXT.tr, { homeConfirm: "Ana sayfaya dönmek istiyor musun? Oturumun açık kalacak ve verilerin kaydedilecek." });
  Object.assign(UI_TEXT.en, { homeConfirm: "Return to the home page? You will stay signed in and your data will remain saved." });

  Object.assign(UI_TEXT.ar, {
    faqQuestion6: "هل قيم دليل الأكل دقيقة لكل وجبة؟", faqAnswer6: "دليل الأكل يقدم حصصًا مرجعية وأوزانًا تقريبية، وقد تختلف القيمة حسب الزيت والإضافات وحجم الوجبة الفعلي.",
    faqQuestion7: "هل يمكنني تعديل الخطة التي أنشأتها ميري؟", faqAnswer7: "نعم. يمكنك طلب تعديل محدد من ميري، مثل تغيير وجبة أو تخفيف تمرين، ثم تحفظ نسخة جديدة من خطتك.",
    faqQuestion8: "ما اللغات المتاحة في Yoldaş؟", faqAnswer8: "واجهة Yoldaş متاحة بالعربية والتركية والإنجليزية، ويمكن تغيير اللغة من أعلى الصفحة.",
    faqQuestion9: "ماذا يحدث عندما أصل إلى الحد اليومي لميري؟", faqAnswer9: "تتوقف طلبات ميري مؤقتًا حتى اليوم التالي، ويمكنك في هذه الأثناء تسجيل وجبتك يدويًا من دليل الأكل.",
    faqQuestion10: "كيف تعمل الصداقة وصور الستريك؟", faqAnswer10: "تبحث عن صديق باسم المستخدم الدقيق وتحتاج الموافقة. صور الستريك خاصة بين الصديقين وتنتهي خلال 24 ساعة."
  });
  Object.assign(UI_TEXT.tr, {
    faqQuestion6: "Yemek rehberi değerleri her öğün için kesin mi?", faqAnswer6: "Yemek rehberi referans porsiyonlar ve yaklaşık ağırlıklar sunar; değer yağ, ek malzeme ve gerçek porsiyon boyutuna göre değişebilir.",
    faqQuestion7: "Miri'nin oluşturduğu planı düzenleyebilir miyim?", faqAnswer7: "Evet. Miri'den bir öğünü değiştirmek veya bir egzersizi hafifletmek gibi belirli bir düzenleme isteyebilir, sonra planının yeni sürümünü kaydedebilirsin.",
    faqQuestion8: "Yoldaş'ta hangi diller var?", faqAnswer8: "Yoldaş arayüzü Arapça, Türkçe ve İngilizce olarak kullanılabilir. Dili sayfanın üstünden değiştirebilirsin.",
    faqQuestion9: "Miri'nin günlük sınırına ulaşırsam ne olur?", faqAnswer9: "Miri istekleri ertesi güne kadar geçici olarak durur. Bu sırada yemek rehberinden öğününü elle kaydedebilirsin.",
    faqQuestion10: "Arkadaşlık ve seri fotoğrafları nasıl çalışır?", faqAnswer10: "Bir arkadaşı tam kullanıcı adıyla bulur ve onay alırsın. Seri fotoğrafları iki arkadaş arasında özeldir ve 24 saat içinde sona erer."
  });
  Object.assign(UI_TEXT.en, {
    faqQuestion6: "Are food-guide values exact for every meal?", faqAnswer6: "The food guide provides reference portions and approximate weights. Values can vary with oil, extras, and the actual serving size.",
    faqQuestion7: "Can I edit the plan Miri created?", faqAnswer7: "Yes. You can ask Miri for a specific change, such as swapping a meal or easing an exercise, then save a new version of your plan.",
    faqQuestion8: "Which languages are available in Yoldaş?", faqAnswer8: "The Yoldaş interface is available in Arabic, Turkish, and English. You can change the language from the top of the page.",
    faqQuestion9: "What happens when I reach Miri's daily limit?", faqAnswer9: "Miri requests pause until the next day. You can still log your meal manually from the food guide in the meantime.",
    faqQuestion10: "How do friendships and streak photos work?", faqAnswer10: "You find a friend by their exact username and need their approval. Streak photos are private between the two friends and expire within 24 hours."
  });

  const PLAN_QUESTIONS_TR = {
    food: [
      { key: "goal", label: "Ana hedefin nedir?", placeholder: "Örnek: Sakin şekilde kilo vermek" },
      { key: "activity", label: "Günlük hareket düzeyin nasıl?", placeholder: "Örnek: Az hareket ediyorum, çoğunlukla oturuyorum" },
      { key: "schedule", label: "Günde kaç öğün sana uygun?", placeholder: "Örnek: 3 öğün ve bir ara öğün" },
      { key: "preferences", label: "Sevdiğin veya kaçındığın yiyecekler neler?", placeholder: "Örnek: Tavuk severim, balık sevmem" },
    ],
    workout: [
      { key: "goal", label: "Ana hedefin nedir?", placeholder: "Örnek: Genel kondisyon kazanmak" },
      { key: "activity", label: "Mevcut seviyen nedir?", placeholder: "Örnek: Tamamen başlangıç seviyesindeyim" },
      { key: "schedule", label: "Haftada ne kadar zaman ayırabilirsin?", placeholder: "Örnek: 3 gün, 30 dakika" },
      { key: "preferences", label: "Dikkate alınması gereken ekipman veya sakatlığın var mı?", placeholder: "Örnek: Ekipman yok, sakatlık yok" },
    ],
  };

  const PLAN_QUESTIONS_EN = {
    food: [
      { key: "goal", label: "What is your main goal?", placeholder: "Example: Lose weight calmly" },
      { key: "activity", label: "What is your daily activity level?", placeholder: "Example: I sit for most of the day" },
      { key: "schedule", label: "How many meals fit your day?", placeholder: "Example: 3 meals and one snack" },
      { key: "preferences", label: "Which foods do you enjoy or avoid?", placeholder: "Example: I like chicken and avoid fish" },
    ],
    workout: [
      { key: "goal", label: "What is your main goal?", placeholder: "Example: Build general fitness" },
      { key: "activity", label: "What is your current level?", placeholder: "Example: I am a complete beginner" },
      { key: "schedule", label: "How much time can you give each week?", placeholder: "Example: 3 days, 30 minutes" },
      { key: "preferences", label: "Any equipment or injury to consider?", placeholder: "Example: No equipment and no injuries" },
    ],
  };

  const PLAN_QUESTIONS = {
    food: [
      { key: "goal", label: "ما هدفك الأساسي؟", placeholder: "مثال: خسارة وزن بهدوء" },
      { key: "activity", label: "كيف هو نشاطك اليومي؟", placeholder: "مثال: قليل الحركة، أجلس أغلب اليوم" },
      { key: "schedule", label: "كم وجبة تناسب يومك؟", placeholder: "مثال: 3 وجبات ووجبة خفيفة" },
      { key: "preferences", label: "ما الأكلات التي تحبها أو تتجنبها؟", placeholder: "مثال: بحب الفراخ، ما بحبش السمك" },
    ],
    workout: [
      { key: "goal", label: "ما هدفك الأساسي؟", placeholder: "مثال: بناء لياقة عامة" },
      { key: "activity", label: "ما مستواك الحالي؟", placeholder: "مثال: مبتدئ تمامًا" },
      { key: "schedule", label: "كم وقتًا تستطيع تخصيصه أسبوعيًا؟", placeholder: "مثال: 3 أيام، 30 دقيقة" },
      { key: "preferences", label: "هل لديك معدات أو إصابة يجب مراعاتها؟", placeholder: "مثال: بدون معدات، مافيش إصابات" },
    ],
  };

  const PLAN_PERSONALIZATION = {
    ar: {
      food: [
        { key: "age", label: "عندك كام سنة؟", placeholder: "مثال: 26", hint: "اكتب رقمًا فقط.", type: "number", min: 13, max: 100 },
        { key: "height_cm", label: "طولك كام سم؟", placeholder: "مثال: 175", hint: "اكتب الطول بالسنتيمتر.", type: "number", min: 120, max: 230 },
        { key: "weight_kg", label: "وزنك الحالي كام كجم؟", placeholder: "مثال: 82", hint: "اكتب وزنك التقريبي الحالي.", type: "number", min: 30, max: 300, step: "0.1" },
      ],
      health: { key: "health_context", label: "هل في حالة صحية أو أكل لازم نراعيه؟", placeholder: "مثال: أقلل اللاكتوز؛ أو اكتب مافيش", hint: "لو في أعراض، دواء، أو حالة خاصة استشر مختص.", optional: true },
      ability: [
        { key: "pushups", label: "بتعرف تعمل كام ضغطة كاملة براحة؟", placeholder: "مثال: 0 أو 5 أو 20", hint: "لو مش بتعرف تعمل ضغطة اكتب 0، وميري هتديك بديل أسهل.", type: "number", min: 0, max: 200 },
        { key: "squat_ability", label: "بتعرف تعمل سكوات بوزن جسمك براحة؟", placeholder: "مثال: مرتاح / صعب / بيعمل ألم / مش بعرف" },
      ],
    },
    tr: {
      food: [
        { key: "age", label: "Kaç yaşındasın?", placeholder: "Örnek: 26", hint: "Sayı olarak yaz.", type: "number", min: 13, max: 100 },
        { key: "height_cm", label: "Boyun kaç cm?", placeholder: "Örnek: 175", hint: "Santimetre olarak yaz.", type: "number", min: 120, max: 230 },
        { key: "weight_kg", label: "Güncel kilon kaç kg?", placeholder: "Örnek: 82", hint: "Yaklaşık güncel kilonu yaz.", type: "number", min: 30, max: 300, step: "0.1" },
      ],
      health: { key: "health_context", label: "Dikkate alınacak bir sağlık durumu veya besin tercihi var mı?", placeholder: "Örnek: Laktozu azaltıyorum; yoksa yok yaz", hint: "Belirti, ilaç veya özel durum varsa bir uzmana danış.", optional: true },
      ability: [
        { key: "pushups", label: "Rahat formda kaç şınav yapabiliyorsun?", placeholder: "Örnek: 0, 5 veya 20", hint: "Yapamıyorsan 0 yaz; Miri daha kolay bir seçenek verir.", type: "number", min: 0, max: 200 },
        { key: "squat_ability", label: "Vücut ağırlığıyla squat yapabiliyor musun?", placeholder: "Örnek: Rahat / zor / ağrı oluyor / yapamıyorum" },
      ],
    },
    en: {
      food: [
        { key: "age", label: "How old are you?", placeholder: "Example: 26", hint: "Enter a number.", type: "number", min: 13, max: 100 },
        { key: "height_cm", label: "What is your height in cm?", placeholder: "Example: 175", hint: "Enter centimetres.", type: "number", min: 120, max: 230 },
        { key: "weight_kg", label: "What is your current weight in kg?", placeholder: "Example: 82", hint: "Enter your approximate current weight.", type: "number", min: 30, max: 300, step: "0.1" },
      ],
      health: { key: "health_context", label: "Any health context or food need to consider?", placeholder: "Example: I reduce lactose; write none if not applicable", hint: "For symptoms, medication, or a special health condition, consult a qualified professional.", optional: true },
      ability: [
        { key: "pushups", label: "How many comfortable full push-ups can you do?", placeholder: "Example: 0, 5, or 20", hint: "Enter 0 if you cannot do one; Miri will give an easier option.", type: "number", min: 0, max: 200 },
        { key: "squat_ability", label: "Can you do a bodyweight squat comfortably?", placeholder: "Example: Comfortable / difficult / painful / cannot do it" },
      ],
    },
  };

  const t = (key, fallback = key) => UI_TEXT[currentLocale]?.[key] || EXTRA_UI_TEXT[currentLocale]?.[key] || fallback;
  const activePlanQuestions = () => {
    const base = currentLocale === "tr" ? PLAN_QUESTIONS_TR : currentLocale === "en" ? PLAN_QUESTIONS_EN : PLAN_QUESTIONS;
    const detail = PLAN_PERSONALIZATION[currentLocale] || PLAN_PERSONALIZATION.ar;
    return {
      food: [...detail.food, ...base.food, detail.health],
      workout: [base.workout[0], base.workout[1], ...detail.ability, ...base.workout.slice(2)],
    };
  };
  const validMiriStyles = new Set(["supportive", "calm", "energetic"]);
  const normalizeMiriStyle = (value) => validMiriStyles.has(value) ? value : "supportive";

  function renderMiriStyleOptions() {
    document.querySelectorAll(".miri-style-option").forEach((button) => {
      const active = button.dataset.miriStyle === miriStyle;
      button.classList.toggle("active", active);
      button.setAttribute("aria-checked", String(active));
    });
  }

  function applyLocale() {
    document.documentElement.lang = currentLocale;
    document.documentElement.dir = currentLocale === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("locale-tr", currentLocale === "tr");
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (UI_TEXT[currentLocale]?.[key] || EXTRA_UI_TEXT[currentLocale]?.[key]) el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (UI_TEXT[currentLocale]?.[key] || EXTRA_UI_TEXT[currentLocale]?.[key]) el.placeholder = t(key);
    });
    document.querySelectorAll("[data-i18n-prompt]").forEach((el) => {
      const key = el.dataset.i18nPrompt;
      if (UI_TEXT[currentLocale]?.[key]) el.dataset.prompt = UI_TEXT[currentLocale][key];
    });
    document.querySelectorAll(".language-button").forEach((button) => button.classList.toggle("active", button.dataset.locale === currentLocale));
    const chatInput = $("chat-input");
    if (chatInput) chatInput.placeholder = t("chatPlaceholder");
    const greeting = $("chat-messages")?.querySelector(".chat.bot");
    if (greeting && $("chat-messages").children.length === 1) greeting.textContent = t("assistantGreeting");
    updateAccountPanel();
    if (!$("plan-wizard")?.hidden) renderPlanQuestion();
    renderFoodCatalog();
    if (selectedRecipeId) showRecipeDetail(selectedRecipeId);
    renderGymProgress();
    renderMiriStyleOptions();

    if (currentUser) {
      if (!$("today-screen")?.hidden) loadTodaySummary();
      if (!$("plans-screen")?.hidden) loadActivePlan();
      if (!$("progress-screen")?.hidden) loadProgress();
      if (!$("community-screen")?.hidden) loadCommunity();
    }
  }

  function setLocale(locale) {
    currentLocale = ["ar", "tr", "en"].includes(locale) ? locale : "ar";
    localStorage.setItem("yoldas_locale", currentLocale);
    applyLocale();
  }

  // ============== أدوات مساعدة عامة ==============

  const $ = (id) => document.getElementById(id);
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function normalizeFoodSearch(value = "") {
    return String(value)
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  function setConnectionMessage(message) {
    const box = $("connection-status");
    if (!box) return;
    if (!message) { hide(box); box.innerHTML = ""; return; }
    box.innerHTML = `<span>${escapeHtml(message)}</span>`;
    show(box);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  function friendlyErrorMessage(fallback) {
    // لا نعرض رسائل تقنية أبدًا للمستخدم — التفاصيل التقنية تبقى في console فقط.
    return fallback || t("unexpectedError");
  }

  // ============== إعداد Supabase ==============

  function isConfigured() {
    return Boolean(CONFIG.supabaseUrl && CONFIG.supabasePublishableKey);
  }

  function initSupabase() {
    if (!isConfigured()) return null;
    try {
      return window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
    } catch (e) {
      console.error("Supabase init failed", e);
      return null;
    }
  }

  // ============== التنقل بين الواجهتين (ترحيب / لوحة) ==============

  function showWelcome() {
    show($("welcome-view"));
    hide($("dashboard-view"));
    hide($("mobile-nav"));
  }

  function showDashboard() {
    hide($("welcome-view"));
    show($("dashboard-view"));
    if (window.matchMedia("(max-width: 720px)").matches) show($("mobile-nav"));
  }

  function switchScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => hide(s));
    show($(`${name}-screen`));

    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.screen === name));
    document.querySelectorAll(".mobile-tab").forEach((t) => t.classList.toggle("active", t.dataset.screen === name));

    if (name === "today") { loadTodaySummary(); loadGymProgress(); }
    if (name === "progress") loadProgress();
    if (name === "community") loadCommunity();
    if (name === "settings") loadSettings();
    if (name === "plans") loadActivePlan();
  }

  function bindNavigation() {
    document.querySelectorAll("[data-home-link]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const isDashboardOpen = !$('dashboard-view').hidden;
        if (isDashboardOpen && !window.confirm(t("homeConfirm"))) return;
        showWelcome();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    document.querySelectorAll(".tab, .mobile-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchScreen(btn.dataset.screen));
    });

    document.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => {
        switchScreen(btn.dataset.go);
        if (btn.dataset.go === "assistant" && btn.dataset.prompt) {
          $("chat-input").value = btn.dataset.prompt;
          $("chat-input").focus();
        }
      });
    });

    $("reset-journey")?.addEventListener("click", async () => {
      if (!confirm(t("leaveJourneyConfirm"))) return;
      if (supabase) await supabase.auth.signOut();
      currentUser = null;
      showWelcome();
    });

    document.querySelectorAll(".language-button").forEach((button) => {
      button.addEventListener("click", () => setLocale(button.dataset.locale));
    });
  }

  // ============== الحسابات باسم المستخدم وكلمة المرور ==============

  function normalizedUsername(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidUsername(username) {
    return /^[a-z0-9][a-z0-9._-]{2,23}$/.test(username);
  }

  function setAccountError(message = "") {
    const box = $("account-error");
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
  }

  function updateAccountPanel() {
    const isSignup = accountMode === "signup";
    const panel = $("account-panel");
    if (!panel) return;
    $("account-title").textContent = isSignup ? t("signupTitle") : t("loginTitle");
    $("account-description").textContent = isSignup ? t("signupDescription") : t("loginDescription");
    $("account-submit").textContent = isSignup ? t("signupSubmit") : t("loginSubmit");
    $("account-password").autocomplete = isSignup ? "new-password" : "current-password";
    $("recovery-email-field").hidden = !isSignup;
    $("forgot-password").hidden = isSignup;
    document.querySelectorAll(".account-mode").forEach((button) => {
      button.classList.toggle("active", button.dataset.accountMode === accountMode);
    });
  }

  function openAccountPanel(mode = "signup") {
    accountMode = mode;
    setAccountError("");
    updateAccountPanel();
    show($("account-panel"));
    $("account-username")?.focus();
  }

  function closeAccountPanel() {
    hide($("account-panel"));
    setAccountError("");
    const form = $("account-form");
    if (form) form.reset();
  }

  function showResetCompletion() {
    show($("account-panel"));
    hide($("account-form"));
    hide($("reset-request-form"));
    show($("reset-complete-form"));
    $("reset-new-password")?.focus();
  }

  async function completeAccountSession(user, username) {
    currentUser = user;
    await ensureProfile(user.id, username);
    await retireOwnProgressPhotos();
    closeAccountPanel();
    showDashboard();
    switchScreen("today");
  }

  async function retireOwnProgressPhotos() {
    if (!currentUser || !supabase) return;
    const key = `yoldas_progress_photo_retired_${currentUser.id}`;
    if (localStorage.getItem(key) === "1") return;
    try {
      const { data, error } = await supabase.from("progress_photos").select("id, storage_path").eq("user_id", currentUser.id).limit(200);
      if (error) throw error;
      const paths = (data || []).map((photo) => photo.storage_path).filter(Boolean);
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from("yoldas-progress-photos").remove(paths);
        if (storageError) throw storageError;
        const { error: rowError } = await supabase.from("progress_photos").delete().eq("user_id", currentUser.id);
        if (rowError) throw rowError;
      }
      localStorage.setItem(key, "1");
    } catch (error) {
      console.info("progress photo retirement pending", error);
    }
  }

  async function submitAccount(event) {
    event.preventDefault();
    if (!supabase) return;

    const username = normalizedUsername($("account-username")?.value);
    const password = String($("account-password")?.value || "");
    const recoveryEmail = String($("account-recovery-email")?.value || "").trim().toLowerCase();
    const submitButton = $("account-submit");
    setAccountError("");

    if (!isValidUsername(username)) {
      setAccountError(currentLocale === "tr" ? "Geçerli bir kullanıcı adı yaz." : "اكتب اسم مستخدم صالحًا بالشكل الموضح.");
      return;
    }
    if (password.length < 8) {
      setAccountError(currentLocale === "tr" ? "Şifre en az 8 karakter olmalı." : "كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }
    if (accountMode === "signup" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      setAccountError(currentLocale === "tr" ? "Geçerli bir kurtarma e-postası yaz." : "اكتب بريد استرجاع صحيح.");
      return;
    }

    submitButton.disabled = true;
    const originalLabel = submitButton.textContent;
    submitButton.textContent = currentLocale === "tr" ? "Bekleyin..." : "لحظة واحدة...";

    try {
      if (accountMode === "signup") {
        const { data, error } = await supabase.functions.invoke(CONFIG.accountFunction || "account-auth", {
          body: { mode: "signup", username, password, recoveryEmail },
        });
        if (error || !data?.ok) throw new Error(data?.code || "signup_failed");
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (sessionError || !sessionData.user) throw sessionError || new Error("session_failed");
        await completeAccountSession(sessionData.user, username);
      } else {
        const { data, error } = await supabase.functions.invoke(CONFIG.accountFunction || "account-auth", {
          body: { mode: "login", username, password },
        });
        if (error || !data?.ok) throw new Error(data?.code || "invalid_login");
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (sessionError || !sessionData.user) throw sessionError || new Error("session_failed");
        await completeAccountSession(sessionData.user, username);
      }
    } catch (error) {
      console.error("account authentication failed", error);
      const reason = String(error?.message || "");
      if (reason.includes("PROFILE_SETUP_FAILED")) {
        setAccountError(currentLocale === "tr" ? "Hesap ayarı tamamlanamadı. Önce Supabase SQL dosyasını çalıştır." : "تعذر تجهيز الحساب. شغّل ملف SQL الخاص بالحسابات في Supabase أولًا.");
      } else if (accountMode === "signup") {
        setAccountError(currentLocale === "tr" ? "Bu kullanıcı adı kullanılamıyor. Başka bir ad dene." : "اسم المستخدم غير متاح. جرّب اسمًا آخر.");
      } else {
        setAccountError(currentLocale === "tr" ? "Kullanıcı adı veya şifre doğru değil." : "اسم المستخدم أو كلمة المرور غير صحيحين.");
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }

  function bindAccounts() {
    $("account-button")?.addEventListener("click", () => openAccountPanel());
    $("account-close")?.addEventListener("click", closeAccountPanel);
    document.querySelectorAll(".account-mode").forEach((button) => {
      button.addEventListener("click", () => {
        accountMode = button.dataset.accountMode === "login" ? "login" : "signup";
        setAccountError("");
        updateAccountPanel();
      });
    });
    $("account-form")?.addEventListener("submit", submitAccount);
    $("forgot-password")?.addEventListener("click", () => {
      hide($("account-form"));
      show($("reset-request-form"));
      setAccountError("");
      $("reset-username")?.focus();
    });
    $("back-to-login")?.addEventListener("click", () => {
      hide($("reset-request-form"));
      show($("account-form"));
      openAccountPanel("login");
    });
    $("reset-request-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const username = normalizedUsername($("reset-username")?.value);
      if (!isValidUsername(username)) return;
      const message = $("reset-request-message");
      try {
        const { error } = await supabase.functions.invoke(CONFIG.accountFunction || "account-auth", {
          body: { mode: "request_reset", username, redirectTo: `${window.location.origin}${window.location.pathname}` },
        });
        if (error) throw error;
        if (message) { message.textContent = t("resetLinkSent"); message.hidden = false; }
      } catch (error) {
        console.error("password reset request failed", error);
        if (message) { message.textContent = t("unexpectedError"); message.hidden = false; }
      }
    });
    $("reset-complete-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = String($("reset-new-password")?.value || "");
      const confirmation = String($("reset-confirm-password")?.value || "");
      const message = $("reset-complete-message");
      if (password.length < 8) {
        if (message) { message.textContent = t("passwordHint"); message.hidden = false; }
        return;
      }
      if (password !== confirmation) {
        if (message) { message.textContent = t("passwordMismatch"); message.hidden = false; }
        return;
      }
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        if (message) { message.textContent = t("passwordChanged"); message.hidden = false; }
        await supabase.auth.signOut();
        hide($("reset-complete-form"));
        show($("account-form"));
        openAccountPanel("login");
      } catch (error) {
        console.error("password reset completion failed", error);
        if (message) { message.textContent = t("unexpectedError"); message.hidden = false; }
      }
    });
  }

  // ============== بدء الرحلة (تسجيل دخول مجهول) ==============

  async function ensureSession() {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("getSession error", error);
      return null;
    }
    return data.session ?? null;
  }

  async function ensureProfile(userId, username = "") {
    const { data: existing, error: selectError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (selectError) { console.error("profile lookup failed", selectError); return; }
    if (!existing) {
      const profile = { id: userId };
      if (username) {
        profile.username = username;
        profile.alias = username;
      }
      const { error: insertError } = await supabase.from("profiles").insert(profile);
      if (insertError) console.error("profile creation failed", insertError);
    } else if (username) {
      const { error: updateError } = await supabase.from("profiles").update({ username, updated_at: new Date().toISOString() }).eq("id", userId);
      if (updateError) console.error("profile username update failed", updateError);
    }
  }

  async function startJourney() {
    const button = $("start-button");
    const errorBox = $("welcome-error");
    hide(errorBox);

    if (!isConfigured()) {
      errorBox.textContent = t("notConfigured");
      show(errorBox);
      return;
    }

    button.disabled = true;
    button.textContent = t("journeyPreparing");

    try {
      const existingSession = await ensureSession();
      let user = existingSession?.user ?? null;

      if (!user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        user = data.user;
      }

      currentUser = user;
      await ensureProfile(user.id);

      showDashboard();
      switchScreen("today");
    } catch (e) {
      console.error("startJourney failed", e);
      errorBox.textContent = friendlyErrorMessage(t("journeyError"));
      show(errorBox);
    } finally {
      button.disabled = false;
      button.textContent = t("startGuest");
    }
  }

  // ============== شاشة اليوم ==============

  async function fetchTodaySummary() {
    const log_date = todayISO();
    const [{ data: dailyLog }, { data: meals }, { data: exercises }, { data: plans }, { data: gymSessions, error: gymError }] = await Promise.all([
      supabase.from("daily_logs").select("water_cups, calorie_goal").eq("user_id", currentUser.id).eq("log_date", log_date).maybeSingle(),
      supabase.from("meals").select("calories_estimate").eq("user_id", currentUser.id).eq("log_date", log_date),
      supabase.from("exercises").select("minutes").eq("user_id", currentUser.id).eq("log_date", log_date),
      supabase.from("plans").select("id, plan_type").eq("user_id", currentUser.id).eq("is_active", true),
      supabase.from("gym_sessions").select("id").eq("user_id", currentUser.id).eq("session_date", log_date),
    ]);

    const calorieGoal = dailyLog?.calorie_goal ?? 0;
    const consumed = (meals ?? []).reduce((sum, m) => sum + (m.calories_estimate ?? 0), 0);
    const exerciseMinutes = (exercises ?? []).reduce((sum, e) => sum + (e.minutes ?? 0), 0);

    return {
      water_cups: dailyLog?.water_cups ?? 0,
      meal_count: (meals ?? []).length,
      exercise_count: (exercises ?? []).length + (gymError ? 0 : (gymSessions ?? []).length),
      exercise_minutes: exerciseMinutes,
      gym_session_count: gymError ? 0 : (gymSessions ?? []).length,
      calories_consumed: consumed,
      calorie_goal: calorieGoal,
      has_plan: (plans ?? []).length > 0,
      active_plan_types: (plans ?? []).map((plan) => plan.plan_type).filter((type) => type === "food" || type === "workout"),
    };
  }

  function previousISODate(isoDate) {
    const date = new Date(`${isoDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  async function fetchActivityStreak() {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 365);
    const sinceISO = start.toISOString().slice(0, 10);
    const [{ data: logs, error: logsError }, { data: meals, error: mealsError }, { data: exercises, error: exercisesError }, { data: gymSessions, error: gymError }] = await Promise.all([
      supabase.from("daily_logs").select("log_date, water_cups").eq("user_id", currentUser.id).gte("log_date", sinceISO),
      supabase.from("meals").select("log_date").eq("user_id", currentUser.id).gte("log_date", sinceISO),
      supabase.from("exercises").select("log_date").eq("user_id", currentUser.id).gte("log_date", sinceISO),
      supabase.from("gym_sessions").select("session_date").eq("user_id", currentUser.id).gte("session_date", sinceISO),
    ]);
    if (logsError || mealsError || exercisesError) throw logsError || mealsError || exercisesError;

    const activeDates = new Set([
      ...(logs || []).filter((log) => Number(log.water_cups) > 0).map((log) => log.log_date),
      ...(meals || []).map((meal) => meal.log_date),
      ...(exercises || []).map((exercise) => exercise.log_date),
      ...(gymError ? [] : (gymSessions || []).map((session) => session.session_date)),
    ]);
    let cursor = todayISO();
    let streak = 0;
    while (activeDates.has(cursor)) {
      streak += 1;
      cursor = previousISODate(cursor);
    }
    return streak;
  }

  function renderMissionList(summary) {
    const missions = [
      { label: t("missionMeal"), done: summary.meal_count > 0 },
      { label: t("missionWater"), done: summary.water_cups > 0 },
      { label: t("missionMovement"), done: summary.exercise_count > 0 },
      { label: t("missionPlan"), done: summary.has_plan },
    ];
    const doneCount = missions.filter((m) => m.done).length;
    $("mission-count").textContent = `${doneCount} / ${missions.length}`;

    $("mission-list").innerHTML = missions
      .map(
        (m) => `
        <div class="mission-item ${m.done ? "done" : ""}">
          <span>${escapeHtml(m.label)}</span>
          <span class="mission-status">${m.done ? t("done") : t("pending")}</span>
        </div>`
      )
      .join("");
  }

  function renderSummaryGrid(summary) {
    const hasAnyData = summary.meal_count > 0 || summary.water_cups > 0 || summary.exercise_count > 0;

    const activeTypes = new Set(summary.active_plan_types || []);
    const activePlanValue = $("active-plan-value");
    const activePlanCaption = $("active-plan-caption");
    if (activePlanValue && activePlanCaption) {
      activePlanValue.textContent = activeTypes.size === 2 ? t("activePlanBoth") : activeTypes.has("food") ? t("planFood") : activeTypes.has("workout") ? t("planWorkout") : "—";
      activePlanCaption.textContent = activeTypes.size ? t("activePlanActive") : t("activePlanNone");
    }

    $("water-value").textContent = summary.water_cups > 0 ? String(summary.water_cups) : "—";
    $("meal-value").textContent = summary.meal_count > 0 ? String(summary.meal_count) : "—";
    $("exercise-value").textContent = summary.exercise_minutes > 0 ? String(summary.exercise_minutes) : (summary.gym_session_count > 0 ? String(summary.gym_session_count) : "—");
    $("movement-caption").textContent = summary.exercise_minutes > 0 ? t("minutesToday") : (summary.gym_session_count > 0 ? t("gymSetsToday") : t("minutesToday"));
    const streak = Number(summary.streak || 0);
    $("streak-value").textContent = streak > 0 ? String(streak) : "—";
    $("streak-caption").textContent = streak === 0 ? t("streakStart") : (streak === 1 ? t("streakDayOne") : t("streakDays"));

    const emptyCard = $("today-empty-card");
    if (emptyCard) emptyCard.style.display = hasAnyData ? "none" : "flex";
  }

  async function loadTodaySummary() {
    if (!currentUser) return;
    try {
      const [summary, streak] = await Promise.all([fetchTodaySummary(), fetchActivityStreak()]);
      summary.streak = streak;
      renderMissionList(summary);
      renderSummaryGrid(summary);
      setConnectionMessage("");
    } catch (e) {
      console.error("loadTodaySummary failed", e);
      setConnectionMessage(t("todayLoadError"));
    }
  }

  async function addWaterCup() {
    if (!currentUser) return;
    const button = $("water-button");
    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = t("saving");

    try {
      const log_date = todayISO();
      const { data: existing } = await supabase
        .from("daily_logs")
        .select("id, water_cups")
        .eq("user_id", currentUser.id)
        .eq("log_date", log_date)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("daily_logs")
          .update({ water_cups: existing.water_cups + 1, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_logs").insert({ user_id: currentUser.id, log_date, water_cups: 1 });
        if (error) throw error;
      }

      await loadTodaySummary();
    } catch (e) {
      console.error("addWaterCup failed", e);
      setConnectionMessage(t("saveError"));
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  // ============== دليل الأكل المرجعي ==============

  const localRecipeName = (recipe) => currentLocale === "ar" ? recipe.name_ar : recipe.name_tr;
  const localRecipeServing = (recipe) => currentLocale === "ar" ? recipe.serving_ar : recipe.serving_tr;
  const INGREDIENT_LABELS = {
    cooked_white_rice: { ar: "أرز أبيض مطبوخ", tr: "pişmiş beyaz pirinç" }, cooked_lentils: { ar: "عدس مطبوخ", tr: "pişmiş mercimek" }, cooked_chickpeas: { ar: "حمص مطبوخ", tr: "pişmiş nohut" }, cooked_pasta: { ar: "مكرونة مطبوخة", tr: "pişmiş makarna" }, cooked_fava_beans: { ar: "فول مطبوخ", tr: "pişmiş bakla" }, home_prepared_falafel: { ar: "فلافل منزلية", tr: "ev yapımı falafel" }, white_pita: { ar: "خبز أبيض", tr: "pide ekmeği" }, lean_ground_beef: { ar: "لحم بقري قليل الدهن", tr: "az yağlı kıyma" }, roasted_chicken_breast: { ar: "صدر دجاج مشوي", tr: "kavrulmuş tavuk göğsü" }, cooked_egg: { ar: "بيض مطهو", tr: "pişmiş yumurta" }, plain_yogurt: { ar: "زبادي سادة", tr: "sade yoğurt" }, whole_milk: { ar: "لبن كامل", tr: "tam yağlı süt" }, cooked_potato: { ar: "بطاطس مطبوخة", tr: "pişmiş patates" }, cooked_bulgur: { ar: "برغل مطبوخ", tr: "pişmiş bulgur" }, raw_onion: { ar: "بصل", tr: "soğan" }, raw_tomato: { ar: "طماطم", tr: "domates" }, raw_cucumber: { ar: "خيار", tr: "salatalık" }, olive_oil: { ar: "زيت زيتون", tr: "zeytinyağı" }, all_purpose_flour: { ar: "دقيق أبيض", tr: "beyaz un" }, cooked_eggplant: { ar: "باذنجان مطبوخ", tr: "pişmiş patlıcan" }, cooked_jute_leaves: { ar: "ملوخية مطبوخة", tr: "pişmiş molohiya" }, cooked_okra: { ar: "بامية مطبوخة", tr: "pişmiş bamya" }, cooked_zucchini: { ar: "كوسة مطبوخة", tr: "pişmiş kabak" }, feta_cheese: { ar: "جبنة فيتا", tr: "beyaz peynir" }, walnuts: { ar: "عين جمل", tr: "ceviz" }, granulated_sugar: { ar: "سكر", tr: "toz şeker" }, butter_salted: { ar: "زبدة مملحة", tr: "tuzlu tereyağı" }, phyllo_dough: { ar: "عجينة فيلو", tr: "yufka hamuru" }, sesame_seeds: { ar: "سمسم", tr: "susam" }
  };
  const localIngredientName = (source) => INGREDIENT_LABELS[source.key]?.[currentLocale] || source.usda_description;

  async function loadReferenceRecipes() {
    if (referenceRecipes.length) return referenceRecipes;
    const resultBox = $("food-catalog-results");
    if (resultBox) resultBox.textContent = t("catalogLoading");
    try {
      const response = await fetch("data/reference_recipes.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`catalog fetch failed: ${response.status}`);
      referenceRecipes = await response.json();
      const count = $("food-catalog-count");
      if (count) count.textContent = String(referenceRecipes.length);
      return referenceRecipes;
    } catch (error) {
      console.error("loadReferenceRecipes failed", error);
      if (resultBox) resultBox.textContent = t("catalogEmpty");
      return [];
    }
  }

  function renderFoodCatalog() {
    const resultBox = $("food-catalog-results");
    if (!resultBox || !referenceRecipes.length) return;
    const query = normalizeFoodSearch($("food-catalog-search")?.value || "");
    const recipes = referenceRecipes.filter((recipe) => {
      const countryMatches = foodFilter === "all" || recipe.country === foodFilter;
      const aliases = [recipe.name_ar, recipe.name_tr, ...(recipe.search_terms || [])].map(normalizeFoodSearch);
      const searchable = aliases.join(" ");
      const queryWords = query.split(" ").filter((word) => word.length > 1);
      const matchesWords = queryWords.length && queryWords.every((word) => searchable.includes(word));
      return countryMatches && (!query || searchable.includes(query) || matchesWords);
    });
    document.querySelectorAll(".food-filter").forEach((button) => button.classList.toggle("active", button.dataset.foodFilter === foodFilter));
    if (!recipes.length) {
      resultBox.innerHTML = `<p class="food-catalog-empty">${escapeHtml(t("catalogEmpty"))}</p>`;
      hide($("food-catalog-detail"));
      return;
    }
    resultBox.innerHTML = recipes.map((recipe) => `
      <button type="button" class="food-recipe-option ${recipe.id === selectedRecipeId ? "selected" : ""}" data-recipe-id="${escapeHtml(recipe.id)}">
        <span class="recipe-country">${recipe.country === "EG" ? "EG" : (recipe.country === "TR" ? "TR" : "DAY")}</span>
        <span><b>${escapeHtml(localRecipeName(recipe))}</b><small>${escapeHtml(localRecipeServing(recipe))}</small></span>
        <strong>${Math.round(recipe.nutrition.kcal)} ${escapeHtml(t("kcal"))}</strong>
      </button>`).join("");
    resultBox.querySelectorAll("[data-recipe-id]").forEach((button) => button.addEventListener("click", () => showRecipeDetail(button.dataset.recipeId)));
  }

  function setFoodCatalogMessage(message = "", isError = false) {
    const box = $("food-catalog-message");
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
    box.classList.toggle("error", Boolean(message && isError));
  }

  function showRecipeDetail(recipeId) {
    selectedRecipeId = recipeId;
    const recipe = referenceRecipes.find((item) => item.id === recipeId);
    const detail = $("food-catalog-detail");
    if (!recipe || !detail) return;
    const renderPortion = (factor) => {
      const kcal = Math.round(recipe.nutrition.kcal * factor);
      const grams = Math.round(recipe.serving_weight_g * factor);
      detail.innerHTML = `
        <div class="food-detail-heading"><div><p class="eyebrow">${escapeHtml(t("referenceServing"))}</p><h3>${escapeHtml(localRecipeName(recipe))}</h3><p>${escapeHtml(localRecipeServing(recipe))}</p></div><strong>${kcal}<small>${escapeHtml(t("kcal"))}</small></strong></div>
        <div class="portion-choice">
          <button type="button" data-portion="0.75" class="${factor === 0.75 ? "active" : ""}">${escapeHtml(t("portionSmall"))}</button>
          <button type="button" data-portion="1" class="${factor === 1 ? "active" : ""}">${escapeHtml(t("portionMedium"))}</button>
          <button type="button" data-portion="1.25" class="${factor === 1.25 ? "active" : ""}">${escapeHtml(t("portionLarge"))}</button>
        </div>
        <div class="recipe-nutrients"><span>${kcal} ${escapeHtml(t("kcal"))}</span><span>${Math.round(recipe.nutrition.protein * factor)} ${escapeHtml(t("grams"))} ${escapeHtml(t("protein"))}</span><span>${Math.round(recipe.nutrition.carbs * factor)} ${escapeHtml(t("grams"))} ${escapeHtml(t("carbs"))}</span><span>${Math.round(recipe.nutrition.fat * factor)} ${escapeHtml(t("grams"))} ${escapeHtml(t("fat"))}</span></div>
        <div class="recipe-ingredients"><h4>${escapeHtml(t("recipeIngredients"))}</h4><ul>${recipe.calculation.ingredient_sources.map((source) => `<li><span>${escapeHtml(localIngredientName(source))}</span><b>${Math.round(source.grams * factor)} ${escapeHtml(t("grams"))}</b></li>`).join("")}</ul></div>
        <p class="reference-note">${escapeHtml(t("referenceMealNote"))}</p>
        <p class="reference-meta">${grams} ${escapeHtml(t("grams"))}</p>
        <p class="reference-source"><span>${escapeHtml(t("recipeSource"))}:</span> <a href="${escapeHtml(recipe.calculation.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(recipe.calculation.source)}</a></p>
        <button id="save-reference-recipe" class="primary-button" type="button">${escapeHtml(t("saveReferenceMeal"))}</button>`;
      detail.querySelectorAll("[data-portion]").forEach((button) => button.addEventListener("click", () => renderPortion(Number(button.dataset.portion))));
      $("save-reference-recipe")?.addEventListener("click", () => saveReferenceRecipe(recipe, factor));
    };
    show(detail);
    renderPortion(1);
    renderFoodCatalog();
  }

  async function saveReferenceRecipe(recipe, factor) {
    if (!currentUser || !supabase) {
      setFoodCatalogMessage(t("journeyError"), true);
      return;
    }
    const button = $("save-reference-recipe");
    if (button) { button.disabled = true; button.textContent = t("saving"); }
    setFoodCatalogMessage("");
    try {
      const portionWeight = Math.round(recipe.serving_weight_g * factor);
      const calories = Math.round(recipe.nutrition.kcal * factor);
      const baseMeal = {
        user_id: currentUser.id,
        log_date: todayISO(),
        name: localRecipeName(recipe),
        calories_estimate: calories,
      };
      const referenceDetails = {
        ...baseMeal,
        meal_type: "reference_recipe",
        notes: JSON.stringify({ reference_recipe_id: recipe.id, serving_weight_g: portionWeight, factor, source: recipe.calculation.source, source_url: recipe.calculation.source_url, review_date: recipe.calculation.review_date }),
      };
      const legacyBase = { ...baseMeal, calories, eaten_at: new Date().toISOString() };
      const legacyReferenceDetails = { ...referenceDetails, calories, eaten_at: legacyBase.eaten_at };
      const compatiblePayloads = [legacyReferenceDetails, referenceDetails, legacyBase, baseMeal];
      let error = null;
      for (const payload of compatiblePayloads) {
        ({ error } = await supabase.from("meals").insert(payload));
        if (!error) break;
        const canTryNextPayload = error.code === "PGRST204" || error.code === "23502" || /column|null value|calories|eaten_at|meal_type|notes/i.test(String(error.message || ""));
        if (!canTryNextPayload) break;
      }
      if (error) throw error;
      await Promise.all([loadTodaySummary(), loadProgress()]);
      setFoodCatalogMessage(t("catalogSaveSuccess"));
      setConnectionMessage(t("catalogSaveSuccess"));
    } catch (error) {
      console.error("saveReferenceRecipe failed", {
        code: error?.code || "unknown",
        message: error?.message || String(error),
        details: error?.details || "",
        hint: error?.hint || "",
      });
      setFoodCatalogMessage(t("catalogSaveError"), true);
      setConnectionMessage(t("catalogSaveError"));
    } finally {
      if (button) { button.disabled = false; button.textContent = t("saveReferenceMeal"); }
    }
  }

  function bindFoodCatalog() {
    $("food-catalog-search")?.addEventListener("input", renderFoodCatalog);
    document.querySelectorAll(".food-filter").forEach((button) => button.addEventListener("click", () => { foodFilter = button.dataset.foodFilter || "all"; renderFoodCatalog(); }));
    $("open-food-catalog")?.addEventListener("click", () => $("food-library")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  // ============== وضع الجيم ==============

  function normalizedGymExercise(value = "") {
    return String(value).trim().replace(/\s+/g, " ");
  }

  function setGymMessage(message = "", isError = false) {
    const box = $("gym-message");
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
    box.classList.toggle("error", Boolean(message && isError));
  }

  function renderGymProgress() {
    const recent = $("gym-recent-sets");
    const bests = $("gym-personal-bests");
    const weekVolume = $("gym-week-volume");
    if (!recent || !bests) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sinceISO = sevenDaysAgo.toISOString().slice(0, 10);
    const weekCount = gymSets.filter((set) => String(set.session_date || "").slice(0, 10) >= sinceISO).length;
    if (weekVolume) weekVolume.textContent = t("gymWeekSets").replace("{count}", String(weekCount));
    const recentSets = gymSets.slice(0, 6);
    recent.innerHTML = recentSets.length ? recentSets.map((set) => `<div class="gym-set-row"><span><b>${escapeHtml(set.exercise_name)}</b><small>#${set.set_number} · ${set.session_date}</small></span><strong>${Number(set.weight_kg)} ${escapeHtml(t("kilogram"))} × ${set.reps}</strong></div>`).join("") : `<p class="gym-empty">${escapeHtml(t("gymNoSets"))}</p>`;
    const byExercise = new Map();
    gymSets.forEach((set) => {
      const key = normalizedGymExercise(set.exercise_name).toLocaleLowerCase();
      const known = byExercise.get(key);
      if (!known || Number(set.weight_kg) > Number(known.weight_kg)) byExercise.set(key, set);
    });
    const bestSets = Array.from(byExercise.values()).sort((a, b) => Number(b.weight_kg) - Number(a.weight_kg)).slice(0, 6);
    bests.innerHTML = bestSets.length ? bestSets.map((set) => `<div class="gym-set-row"><span><b>${escapeHtml(set.exercise_name)}</b><small>${set.reps} ${escapeHtml(t("gymReps"))}</small></span><strong>${Number(set.weight_kg)} ${escapeHtml(t("kilogram"))}</strong></div>`).join("") : `<p class="gym-empty">${escapeHtml(t("gymNoBests"))}</p>`;
  }

  async function loadGymProgress() {
    if (!currentUser || !supabase) return;
    try {
      const { data, error } = await supabase.from("gym_sets").select("id, exercise_name, set_number, reps, weight_kg, created_at, gym_sessions!inner(session_date)").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(120);
      gymSets = error ? [] : (data || []).map((set) => ({ ...set, session_date: set.gym_sessions?.session_date || "" }));
      if (error) console.warn("gym mode unavailable", error);
    } catch (error) {
      console.warn("loadGymProgress failed", error);
      gymSets = [];
    }
    renderGymProgress();
  }

  async function saveGymSet(event) {
    event.preventDefault();
    if (!currentUser || !supabase) return;
    const exerciseName = normalizedGymExercise($("gym-exercise")?.value);
    const setNumber = Number($("gym-set-number")?.value);
    const reps = Number($("gym-reps")?.value);
    const weightKg = Number($("gym-weight")?.value);
    if (!exerciseName || !Number.isInteger(setNumber) || !Number.isInteger(reps) || !Number.isFinite(weightKg) || setNumber < 1 || reps < 1 || weightKg < 0) return;
    const submit = $("gym-set-form")?.querySelector("button[type='submit']");
    const originalLabel = submit?.textContent;
    if (submit) { submit.disabled = true; submit.textContent = t("saving"); }
    setGymMessage("");
    try {
      const sessionDate = todayISO();
      const { data: existingSession, error: sessionLookupError } = await supabase.from("gym_sessions").select("id").eq("user_id", currentUser.id).eq("session_date", sessionDate).limit(1).maybeSingle();
      if (sessionLookupError) throw sessionLookupError;
      let sessionId = existingSession?.id;
      if (!sessionId) {
        const { data: createdSession, error: createSessionError } = await supabase.from("gym_sessions").insert({ user_id: currentUser.id, session_date: sessionDate, title: currentLocale === "tr" ? "Spor" : "جيم" }).select("id").single();
        if (createSessionError) throw createSessionError;
        sessionId = createdSession.id;
      }
      const previousBest = gymSets.filter((set) => normalizedGymExercise(set.exercise_name).toLocaleLowerCase() === exerciseName.toLocaleLowerCase()).reduce((best, set) => Math.max(best, Number(set.weight_kg) || 0), -1);
      const { error: setError } = await supabase.from("gym_sets").insert({ user_id: currentUser.id, session_id: sessionId, exercise_name: exerciseName, set_number: setNumber, reps, weight_kg: weightKg });
      if (setError) throw setError;
      setGymMessage(weightKg > previousBest ? t("gymNewBest").replace("{exercise}", exerciseName) : t("gymSaved"));
      $("gym-set-number").value = String(Math.min(setNumber + 1, 50));
      await Promise.all([loadGymProgress(), loadTodaySummary()]);
    } catch (error) {
      console.error("saveGymSet failed", error);
      const code = String(error?.code || "");
      const detail = String(error?.message || "");
      setGymMessage(code === "23505" ? t("gymSetExists") : (detail.includes("gym_") || detail.includes("relation") ? t("gymSetupRequired") : t("gymSaveError")), true);
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = originalLabel || t("gymSaveSet"); }
    }
  }

  function bindGymMode() {
    $("open-gym-mode")?.addEventListener("click", () => $("gym-mode")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    $("gym-set-form")?.addEventListener("submit", saveGymSet);
  }

  function getReferenceRecipeHints(message) {
    const normalizedMessage = normalizeFoodSearch(message);
    return referenceRecipes
      .map((recipe) => {
        const aliases = [recipe.name_ar, recipe.name_tr, ...(recipe.search_terms || [])].map(normalizeFoodSearch);
        const matchedAlias = aliases.filter((alias) => alias.length > 2 && normalizedMessage.includes(alias)).sort((a, b) => b.length - a.length)[0];
        return matchedAlias ? recipe : null;
      })
      .filter(Boolean)
      .slice(0, 2)
      .map((recipe) => ({ id: recipe.id, name_ar: recipe.name_ar, name_tr: recipe.name_tr }));
  }

  // ============== المساعد (المحادثة) ==============

  function appendChatMessage(role, text) {
    const wrapper = document.createElement("div");
    wrapper.className = `chat ${role}`;
    wrapper.textContent = text;
    $("chat-messages").appendChild(wrapper);
    $("chat-messages").scrollTop = $("chat-messages").scrollHeight;
    return wrapper;
  }

  function clearAssistantError() {
    const errorBox = $("assistant-error");
    if (!errorBox) return;
    const message = errorBox.querySelector("span");
    if (message) message.textContent = "";
    hide(errorBox);
  }

  async function sendChatMessage(message, { isRetry = false } = {}) {
    if (!currentUser) return;
    clearAssistantError();

    if (!isRetry) {
      appendChatMessage("user", message);
    }
    lastChatMessage = message;

    const thinking = appendChatMessage("bot thinking", t("thinking"));
    const submitButton = $("chat-form").querySelector("button");
    submitButton.disabled = true;

    try {
      const { data, error } = await supabase.functions.invoke(CONFIG.assistantFunction || "health-assistant", {
        body: { mode: "chat", message, locale: currentLocale, referenceRecipeHints: getReferenceRecipeHints(message) },
      });
      if (error) throw error;
      if (!data?.ok) {
        if (data?.error === "AI_DAILY_LIMIT") throw new Error("AI_DAILY_LIMIT");
        throw new Error(data?.error || "assistant_error");
      }

      thinking.remove();
      clearAssistantError();
      lastChatMessage = null;
      appendChatMessage("bot", data.reply || t("assistantFallback"));
      if (data.summary) {
        renderMissionList(data.summary);
        renderSummaryGrid(data.summary);
      }
    } catch (e) {
      console.error("sendChatMessage failed", e);
      thinking.remove();
      const errorBox = $("assistant-error");
      errorBox.querySelector("span").textContent = String(e?.message || "").includes("AI_DAILY_LIMIT") ? t("aiDailyLimit") : t("retryError");
      show(errorBox);
    } finally {
      submitButton.disabled = false;
    }
  }

  function bindAssistant() {
    $("chat-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("chat-input");
      const message = input.value.trim();
      if (!message) return;
      input.value = "";
      sendChatMessage(message);
    });

    document.querySelectorAll(".prompt-row button").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.prompt) sendChatMessage(btn.dataset.prompt);
      });
    });

    $("assistant-retry")?.addEventListener("click", () => {
      if (lastChatMessage) sendChatMessage(lastChatMessage, { isRetry: true });
    });
  }

  // ============== الخطط الشخصية ==============

  function renderPlanQuestion() {
    const questions = activePlanQuestions()[planState.type];
    const q = questions[planState.step];

    $("plan-step-label").textContent = `${t("question")} ${planState.step + 1} ${t("of")} ${questions.length}`;
    $("plan-kind-label").textContent = planState.type === "food" ? t("planFood") : t("planWorkout");
    $("plan-progress").style.width = `${((planState.step + 1) / questions.length) * 100}%`;
    $("plan-question").textContent = q.label;
    const answerInput = $("plan-answer");
    answerInput.type = q.type || "text";
    answerInput.inputMode = q.type === "number" ? "decimal" : "text";
    answerInput.min = q.min ?? "";
    answerInput.max = q.max ?? "";
    answerInput.step = q.step ?? "any";
    answerInput.placeholder = q.placeholder;
    answerInput.value = planState.answers[q.key] || "";
    answerInput.setAttribute("aria-describedby", "plan-answer-hint");
    const hint = $("plan-answer-hint");
    if (hint) { hint.textContent = q.hint || t("planPersonalNote"); hint.hidden = false; }

    $("plan-back").hidden = planState.step === 0;
    $("plan-next").textContent = planState.step === questions.length - 1 ? t("createPlan") : t("next");

    hide($("plan-result"));
  }

  function resetPlanWizard(type) {
    planState = { type, step: 0, answers: {} };
    document.querySelectorAll(".plan-type").forEach((b) => b.classList.toggle("active", b.dataset.plan === type));
    show($("plan-wizard"));
    hide($("active-plan-card"));
    renderPlanQuestion();
  }

  function renderActivePlan(plan) {
    const card = $("active-plan-card");
    if (!plan) { hide(card); card.innerHTML = ""; return; }

    const storedPlan = plan.plan_json || {};
    const planJson = storedPlan.translations?.[currentLocale] || storedPlan;
    const days = Array.isArray(planJson.days) ? planJson.days : [];
    const dailyTargets = Array.isArray(planJson.dailyTargets) ? planJson.dailyTargets : [];
    const progression = Array.isArray(planJson.progression) ? planJson.progression : [];
    const targets = dailyTargets.length ? dailyTargets : progression;

    card.innerHTML = `
      <h3>${escapeHtml(planJson.title || t("currentPlan"))}</h3>
      <p class="plan-summary">${escapeHtml(planJson.summary || "")}</p>
      ${targets.length ? `<ul class="plan-targets">${targets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      ${days
        .map(
          (d) => `
        <div class="plan-day">
          <h4>${escapeHtml(d.day || "")}</h4>
          <ul>
            ${(d.meals || []).map((m) => `<li>🥗 ${escapeHtml(m)}</li>`).join("")}
            ${(d.workout || []).map((w) => `<li>🏋️ ${escapeHtml(w)}</li>`).join("")}
          </ul>
        </div>`
        )
        .join("")}
      <p class="plan-disclaimer">${escapeHtml(planJson.disclaimer || t("planDisclaimer"))}</p>
      <div class="plan-card-actions">
        <button id="edit-plan-button" class="primary-button" type="button">${escapeHtml(t("planEdit"))}</button>
        <button id="new-plan-button" class="secondary-button" type="button">${escapeHtml(t("newPlan"))}</button>
      </div>
      <section id="plan-edit-panel" class="plan-edit-panel" hidden>
        <label for="plan-edit-request">${escapeHtml(t("planEditTitle"))}</label>
        <textarea id="plan-edit-request" maxlength="600" rows="3" placeholder="${escapeHtml(t("planEditPlaceholder"))}"></textarea>
        <p>${escapeHtml(t("planEditHint"))}</p>
        <div><button id="plan-edit-submit" class="primary-button" type="button">${escapeHtml(t("planEditSend"))}</button><span id="plan-edit-status" class="plan-edit-status" hidden></span></div>
      </section>
    `;
    show(card);
    $("new-plan-button")?.addEventListener("click", () => resetPlanWizard(planState.type));
    $("edit-plan-button")?.addEventListener("click", () => {
      const panel = $("plan-edit-panel");
      if (!panel) return;
      panel.hidden = !panel.hidden;
      if (!panel.hidden) $("plan-edit-request")?.focus();
    });
    $("plan-edit-submit")?.addEventListener("click", () => reviseActivePlan(plan));
  }

  function setPlanEditStatus(message = "", isError = false) {
    const status = $("plan-edit-status");
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("error", Boolean(message && isError));
  }

  async function reviseActivePlan(plan) {
    const request = $("plan-edit-request")?.value.trim() || "";
    if (!request) { setPlanEditStatus(t("planEditEmpty"), true); return; }
    if (request.length > 600) { setPlanEditStatus(t("planEditTooLong"), true); return; }
    const button = $("plan-edit-submit");
    if (!button || !plan?.id) return;
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = t("planEditing");
    setPlanEditStatus("");
    try {
      const { data, error } = await supabase.functions.invoke(CONFIG.assistantFunction, {
        body: { mode: "revise_plan", planId: plan.id, request, locale: currentLocale },
      });
      if (error) throw error;
      if (!data?.ok || !data?.data?.plan) throw new Error(data?.error || "plan_revision_error");
      renderActivePlan(data.data.plan);
      if (data.summary) { renderMissionList(data.summary); renderSummaryGrid(data.summary); }
    } catch (error) {
      console.error("reviseActivePlan failed", error);
      setPlanEditStatus(t("planEditError"), true);
    } finally {
      if (document.body.contains(button)) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  }

  function originalPlanLocale(planJson) {
    if (planJson?.source_locale === "ar" || planJson?.source_locale === "tr" || planJson?.source_locale === "en") return planJson.source_locale;
    return /[\u0600-\u06FF]/.test(JSON.stringify(planJson || {})) ? "ar" : "tr";
  }

  function planNeedsTranslation(plan) {
    const storedPlan = plan?.plan_json || {};
    return originalPlanLocale(storedPlan) !== currentLocale && !storedPlan.translations?.[currentLocale];
  }

  async function translateActivePlan(plan) {
    if (planTranslationInFlight || !plan?.id) return plan;
    planTranslationInFlight = true;
    const card = $("active-plan-card");
    card.innerHTML = `<p class="plan-translation-status">${escapeHtml(t("planTranslating"))}</p>`;
    show(card);
    try {
      const { data, error } = await supabase.functions.invoke(CONFIG.assistantFunction, {
        body: { mode: "translate_plan", planId: plan.id, locale: currentLocale },
      });
      if (error) throw error;
      if (!data?.ok || !data?.data?.plan) throw new Error("plan_translation_error");
      return data.data.plan;
    } catch (error) {
      console.error("translateActivePlan failed", error);
      setConnectionMessage(t("planTranslateError"));
      return plan;
    } finally {
      planTranslationInFlight = false;
    }
  }

  async function loadActivePlan() {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("plan_type", planState.type)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      const localizedPlan = planNeedsTranslation(data) ? await translateActivePlan(data) : data;
      renderActivePlan(localizedPlan);
    } catch (e) {
      console.error("loadActivePlan failed", e);
    }
  }

  async function submitPlan() {
    const nextButton = $("plan-next");
    nextButton.disabled = true;
    const originalLabel = nextButton.textContent;
    nextButton.textContent = t("planCreating");

    const resultBox = $("plan-result");
    resultBox.classList.remove("error");

    try {
      const { data, error } = await supabase.functions.invoke(CONFIG.assistantFunction, {
        body: { mode: "create_plan", planType: planState.type, answers: planState.answers, locale: currentLocale },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "plan_error");

      resultBox.textContent = "";
      hide(resultBox);
      hide($("plan-wizard"));
      renderActivePlan(data.data?.plan);
      if (data.summary) { renderMissionList(data.summary); renderSummaryGrid(data.summary); }
    } catch (e) {
      console.error("submitPlan failed", e);
      resultBox.textContent = t("planError");
      resultBox.classList.add("error");
      show(resultBox);
    } finally {
      nextButton.disabled = false;
      nextButton.textContent = originalLabel;
    }
  }

  function bindPlans() {
    document.querySelectorAll(".plan-type").forEach((btn) => {
      btn.addEventListener("click", () => resetPlanWizard(btn.dataset.plan));
    });

    $("plan-back")?.addEventListener("click", () => {
      const answerInput = $("plan-answer");
      const q = activePlanQuestions()[planState.type][planState.step];
      planState.answers[q.key] = answerInput.value.trim();
      planState.step = Math.max(planState.step - 1, 0);
      renderPlanQuestion();
    });

    $("plan-next")?.addEventListener("click", () => {
      const answerInput = $("plan-answer");
      const value = answerInput.value.trim();
      const questions = activePlanQuestions()[planState.type];
      const q = questions[planState.step];
      const numericValue = Number(value);
      const invalidNumber = q.type === "number" && (!Number.isFinite(numericValue) || numericValue < q.min || numericValue > q.max);
      if ((!value && !q.optional) || invalidNumber) {
        const resultBox = $("plan-result");
        resultBox.textContent = t("planInputInvalid");
        resultBox.classList.add("error");
        show(resultBox);
        answerInput.focus();
        return;
      }
      planState.answers[q.key] = value;

      if (planState.step < questions.length - 1) {
        planState.step += 1;
        renderPlanQuestion();
      } else {
        submitPlan();
      }
    });

    resetPlanWizard("food");
  }

  // ============== التقدم ==============

  async function loadProgress() {
    if (!currentUser) return;
    try {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const sinceISO = since.toISOString().slice(0, 10);

      const [{ data: meals }, { data: exercises }, { data: weights }] = await Promise.all([
        supabase.from("meals").select("log_date").eq("user_id", currentUser.id).gte("log_date", sinceISO),
        supabase.from("exercises").select("log_date, minutes").eq("user_id", currentUser.id).gte("log_date", sinceISO),
        supabase.from("weight_logs").select("log_date, weight_kg").eq("user_id", currentUser.id).order("log_date", { ascending: false }).limit(1),
      ]);

      const hasData = (meals && meals.length) || (exercises && exercises.length) || (weights && weights.length);

      if (!hasData) {
        show($("progress-empty"));
        hide($("progress-content"));
        return;
      }

      hide($("progress-empty"));
      const content = $("progress-content");
      const totalMinutes = (exercises ?? []).reduce((s, e) => s + (e.minutes ?? 0), 0);
      const latestWeight = weights?.[0]?.weight_kg;

      content.innerHTML = `
        <div class="progress-row"><span>${escapeHtml(t("progressMeals"))}</span><strong>${(meals ?? []).length}</strong></div>
        <div class="progress-row"><span>${escapeHtml(t("progressMinutes"))}</span><strong>${totalMinutes}</strong></div>
        ${latestWeight ? `<div class="progress-row"><span>${escapeHtml(t("progressWeight"))}</span><strong>${latestWeight} ${escapeHtml(t("kilogram"))}</strong></div>` : ""}
      `;
      show(content);
    } catch (e) {
      console.error("loadProgress failed", e);
    }
  }

  // ============== المجتمع ==============

  function ensureAliasLocally() {
    // اسم مستعار غير شخصي محلي احتياطي إن لم يكن محفوظًا بعد في profiles.
    let alias = localStorage.getItem("yoldas_alias_fallback");
    if (!alias) {
      alias = `${t("communityAlias")}_${Math.random().toString(36).slice(2, 6)}`;
      localStorage.setItem("yoldas_alias_fallback", alias);
    }
    return alias;
  }

  async function getAlias() {
    try {
      const { data } = await supabase.from("profiles").select("alias").eq("id", currentUser.id).maybeSingle();
      return data?.alias || ensureAliasLocally();
    } catch {
      return ensureAliasLocally();
    }
  }

  function setFriendsStatus(message = "", isError = false, target = "friends-status") {
    const box = $(target);
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
    box.classList.toggle("error", Boolean(message && isError));
  }

  async function socialCall(mode, payload = {}) {
    const { data, error } = await supabase.functions.invoke(CONFIG.socialFunction || "social-service", { body: { mode, ...payload } });
    if (error || !data?.ok) throw new Error(data?.code || error?.message || "social_failed");
    return data.data || {};
  }

  function socialErrorText(error) {
    const code = String(error?.message || "");
    if (code.includes("FRIEND_LIMIT")) return t("friendLimit");
    if (code.includes("SNAP_DAILY_LIMIT")) return t("snapLimit");
    if (/relation|bucket|function|social-service|friendships|streak_snaps/i.test(code)) return t("communitySetupRequired");
    return t("actionFailed");
  }

  function renderFriendLists(friends = []) {
    const requests = friends.filter((friend) => friend.status === "pending" && friend.direction === "received");
    const accepted = friends.filter((friend) => friend.status === "accepted");
    const requestBox = $("friend-requests");
    const list = $("friends-list");
    if (requestBox) requestBox.innerHTML = requests.length ? requests.map((friend) => `<div class="friend-row"><b>@${escapeHtml(friend.username)}</b><span>${escapeHtml(friend.alias)}</span><div><button data-friend-accept="${escapeHtml(friend.id)}">${escapeHtml(t("accept"))}</button><button data-friend-decline="${escapeHtml(friend.id)}">${escapeHtml(t("decline"))}</button></div></div>`).join("") : `<p class="community-empty">${escapeHtml(t("noRequests"))}</p>`;
    if (list) list.innerHTML = accepted.length ? accepted.map((friend) => {
      const count = Number(friend.streakCount || 0);
      const streakLabel = count ? `${count} ${t("friendStreakDays")}` : t("friendStreakStart");
      return `<div class="friend-row friend-row-accepted"><div class="friend-identity"><b>@${escapeHtml(friend.username)}</b><span>${escapeHtml(friend.alias)}</span></div><span class="friend-streak ${count ? "" : "is-empty"}" aria-label="${escapeHtml(streakLabel)}">🔥 <strong>${count || "—"}</strong> <small>${escapeHtml(count ? t("friendStreakDays") : t("friendStreakStart"))}</small></span><div><button data-friend-remove="${escapeHtml(friend.userId)}">${escapeHtml(t("removeFriend"))}</button><button data-friend-block="${escapeHtml(friend.userId)}">${escapeHtml(t("block"))}</button><button data-friend-report="${escapeHtml(friend.userId)}">${escapeHtml(t("report"))}</button></div></div>`;
    }).join("") : `<p class="community-empty">${escapeHtml(t("noFriends"))}</p>`;
    const select = $("snap-recipient");
    if (select) {
      select.innerHTML = accepted.length ? `<option value="">${escapeHtml(t("snapFriend"))}</option>${accepted.map((friend) => `<option value="${escapeHtml(friend.userId)}">@${escapeHtml(friend.username)}</option>`).join("")}` : `<option value="">${escapeHtml(t("snapNoFriends"))}</option>`;
      select.disabled = !accepted.length;
    }
  }

  function renderSnaps(snaps = []) {
    const list = $("snap-list");
    if (!list) return;
    const reactions = [{ key: "fire", icon: "🔥", label: t("reactionFire") }, { key: "clap", icon: "👏", label: t("reactionClap") }, { key: "heart", icon: "🧡", label: t("reactionHeart") }];
    list.innerHTML = snaps.length ? snaps.map((snap) => {
      const current = Array.isArray(snap.reactions) ? snap.reactions : [];
      const reactionSummary = current.length ? `<div class="snap-reaction-summary">${current.map((reaction) => reactions.find((item) => item.key === reaction)?.icon || "").join("")}</div>` : "";
      const reactionButtons = snap.canReact ? `<div class="snap-reactions">${reactions.map((reaction) => `<button type="button" class="${snap.myReaction === reaction.key ? "active" : ""}" data-snap-reaction="${reaction.key}" aria-label="${escapeHtml(reaction.label)}" title="${escapeHtml(reaction.label)}">${reaction.icon}</button>`).join("")}</div>` : "";
      const dateLocale = currentLocale === "tr" ? "tr-TR" : currentLocale === "en" ? "en-US" : "ar-EG";
      return `<article class="snap-item" data-snap-id="${escapeHtml(snap.id)}"><img src="${escapeHtml(snap.url)}" alt="${escapeHtml(t("snapTitle"))}" loading="lazy" /><footer><b>${snap.fromMe ? escapeHtml(t("snapFromYou")) : `@${escapeHtml(snap.username)}`}</b>${snap.caption ? `<p>${escapeHtml(snap.caption)}</p>` : ""}<small>${new Date(snap.expiresAt).toLocaleString(dateLocale)}</small>${reactionSummary}${reactionButtons}</footer></article>`;
    }).join("") : `<p class="community-empty">${escapeHtml(t("snapEmpty"))}</p>`;
  }

  function renderCommunitySummary(friends = [], snaps = []) {
    const accepted = friends.filter((friend) => friend.status === "accepted");
    const activeStreaks = accepted.filter((friend) => Number(friend.streakCount || 0) > 0);
    const values = {
      "community-friend-count": accepted.length,
      "community-streak-count": activeStreaks.length,
      "community-snap-count": snaps.length,
    };
    Object.entries(values).forEach(([id, value]) => {
      const target = $(id);
      if (target) target.textContent = String(value);
    });
  }

  async function loadCommunity() {
    if (!currentUser || !supabase) return;
    await refreshMotivationSetupState();
    try {
      const [friendsData, snapsData] = await Promise.all([socialCall("list_friends"), socialCall("list_snaps")]);
      renderFriendLists(friendsData.friends || []);
      renderSnaps(snapsData.snaps || []);
      renderCommunitySummary(friendsData.friends || [], snapsData.snaps || []);
      setFriendsStatus(friendsData.streakSetupRequired ? t("streakSetupRequired") : "", Boolean(friendsData.streakSetupRequired));
    } catch (error) {
      console.error("loadFriends failed", error);
      renderFriendLists([]);
      renderSnaps([]);
      renderCommunitySummary([], []);
      setFriendsStatus(socialErrorText(error), true);
    }
  }

  // ============== دعم الحافز الاختياري ==============

  function setMotivationStatus(message = "", isError = false, target = "motivation-status") {
    const box = $(target);
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
    box.classList.toggle("error", Boolean(message && isError));
  }

  function motivationSetupMessage(error, fallbackKey) {
    const detail = String(error?.message || "").toLocaleLowerCase();
    return detail.includes("motivation_notes") || detail.includes("relation") ? t("motivationSetupRequired") : t(fallbackKey);
  }

  async function refreshMotivationSetupState() {
    if (!currentUser || !supabase) return;
    const button = $("get-motivation");
    try {
      const { error } = await supabase.from("motivation_notes").select("id").limit(1);
      if (error) throw error;
      if (button) button.disabled = false;
      const status = $("motivation-status");
      if (status?.dataset.setupMessage === "true") {
        setMotivationStatus("");
        delete status.dataset.setupMessage;
      }
    } catch (error) {
      if (button) button.disabled = true;
      setMotivationStatus(motivationSetupMessage(error, "motivationLoadError"), true);
      const status = $("motivation-status");
      if (status) status.dataset.setupMessage = "true";
    }
  }

  async function showMotivationNote() {
    if (!currentUser || !supabase) return;
    const messageBox = $("motivation-message");
    if (messageBox) messageBox.hidden = true;
    setMotivationStatus("");
    try {
      const { data, error } = await supabase.from("motivation_notes").select("id, message").eq("is_opted_in", true).neq("user_id", currentUser.id).limit(30);
      if (error) throw error;
      if (!data?.length) return setMotivationStatus(t("motivationEmpty"));
      const note = data[Math.floor(Math.random() * data.length)];
      if (messageBox) { messageBox.textContent = `“${note.message}”`; messageBox.hidden = false; }
    } catch (error) {
      console.error("showMotivationNote failed", error);
      setMotivationStatus(motivationSetupMessage(error, "motivationLoadError"), true);
    }
  }

  async function loadMotivationSettings() {
    if (!currentUser || !supabase) return;
    try {
      const { data, error } = await supabase.from("motivation_notes").select("message, is_opted_in").eq("user_id", currentUser.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if ($("motivation-note-input")) $("motivation-note-input").value = data?.message || "";
      if ($("motivation-opt-in")) $("motivation-opt-in").checked = Boolean(data?.is_opted_in);
    } catch (error) {
      console.warn("loadMotivationSettings failed", error);
    }
  }

  async function saveMotivationSettings() {
    if (!currentUser || !supabase) return;
    const message = $("motivation-note-input")?.value.trim() || "";
    const isOptedIn = Boolean($("motivation-opt-in")?.checked);
    if (isOptedIn && message.length < 12) return setMotivationStatus(t("motivationMinLength"), true, "motivation-settings-message");
    try {
      const { data: existing, error: readError } = await supabase.from("motivation_notes").select("id").eq("user_id", currentUser.id).limit(1).maybeSingle();
      if (readError) throw readError;
      const payload = { message: message || "لنشر رسالة، اكتبها أولًا.", is_opted_in: isOptedIn, updated_at: new Date().toISOString() };
      const { error } = existing
        ? await supabase.from("motivation_notes").update(payload).eq("id", existing.id).eq("user_id", currentUser.id)
        : await supabase.from("motivation_notes").insert({ ...payload, user_id: currentUser.id });
      if (error) throw error;
      setMotivationStatus(t("motivationSaved"), false, "motivation-settings-message");
    } catch (error) {
      console.error("saveMotivationSettings failed", error);
      setMotivationStatus(motivationSetupMessage(error, "motivationSaveError"), true, "motivation-settings-message");
    }
  }

  function bindCommunity() {
    $("get-motivation")?.addEventListener("click", showMotivationNote);
    $("friend-search-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = normalizedUsername($("friend-search-input")?.value);
      const output = $("friend-search-result");
      if (!isValidUsername(username)) return setFriendsStatus(t("noSearchResult"), true);
      try {
        const { user } = await socialCall("search_user", { username });
        if (!user) {
          if (output) { output.hidden = false; output.innerHTML = `<p>${escapeHtml(t("noSearchResult"))}</p>`; }
          return;
        }
        const actions = user.relation === "none" ? `<button data-send-request="${escapeHtml(user.id)}">${escapeHtml(t("addFriend"))}</button>`
          : user.relation === "pending" && user.direction === "received" ? `<button data-friend-accept="${escapeHtml(user.friendshipId || "")}">${escapeHtml(t("accept"))}</button>`
          : `<small>${escapeHtml(user.relation === "accepted" ? t("myFriends") : t("requestSent"))}</small>`;
        if (output) { output.hidden = false; output.innerHTML = `<div class="friend-row"><b>@${escapeHtml(user.username)}</b><span>${escapeHtml(user.alias)}</span>${actions}</div>`; }
      } catch (error) {
        setFriendsStatus(socialErrorText(error), true);
      }
    });

    $("community-screen")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      try {
        if (button.dataset.sendRequest) {
          await socialCall("send_request", { userId: button.dataset.sendRequest });
          setFriendsStatus(t("requestSent"));
        } else if (button.dataset.friendAccept) {
          const value = button.dataset.friendAccept;
          const friendshipId = value.includes("-") && value.length > 30 ? value : "";
          if (!friendshipId) return;
          await socialCall("respond_request", { friendshipId, accept: true });
        } else if (button.dataset.friendDecline) {
          await socialCall("respond_request", { friendshipId: button.dataset.friendDecline, accept: false });
        } else if (button.dataset.friendRemove) {
          await socialCall("remove_friend", { userId: button.dataset.friendRemove });
        } else if (button.dataset.friendBlock) {
          if (!confirm(t("block"))) return;
          await socialCall("block_user", { userId: button.dataset.friendBlock });
        } else if (button.dataset.friendReport) {
          const reason = prompt(t("reportPrompt"));
          if (!reason?.trim()) return;
          await socialCall("report_user", { userId: button.dataset.friendReport, reason: reason.trim() });
        } else return;
        await loadCommunity();
      } catch (error) {
        console.error("friend action failed", error);
        setFriendsStatus(socialErrorText(error), true);
      }
    });

    $("snap-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const recipientId = $("snap-recipient")?.value;
      const file = $("snap-file")?.files?.[0];
      const caption = $("snap-caption")?.value.trim() || "";
      if (!recipientId || !file) return;
      if (!["image/jpeg", "image/webp"].includes(file.type)) return setFriendsStatus(t("snapUnsupported"), true, "snap-status");
      if (file.size > 2 * 1024 * 1024) return setFriendsStatus(t("snapTooLarge"), true, "snap-status");
      const ext = file.type === "image/webp" ? "webp" : "jpg";
      const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`;
      try {
        const { error: uploadError } = await supabase.storage.from("yoldas-streak-snaps").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        try {
          await socialCall("register_snap", { userId: recipientId, storagePath: path, caption });
        } catch (error) {
          await supabase.storage.from("yoldas-streak-snaps").remove([path]);
          throw error;
        }
        $("snap-form").reset();
        setFriendsStatus(t("snapSaved"), false, "snap-status");
        await loadCommunity();
      } catch (error) {
        console.error("send snap failed", error);
        setFriendsStatus(socialErrorText(error), true, "snap-status");
      }
    });

    $("snap-list")?.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-snap-id]");
      if (!card) return;
      const reaction = event.target.closest("[data-snap-reaction]")?.dataset.snapReaction;
      try {
        if (reaction) await socialCall("set_snap_reaction", { snapId: card.dataset.snapId, reaction });
        else await socialCall("mark_snap_opened", { snapId: card.dataset.snapId });
        await loadCommunity();
      } catch (error) { setFriendsStatus(socialErrorText(error), true); }
    });
  }

  // ============== الإعدادات ==============

  async function loadSettings() {
    if (!currentUser) return;
    try {
      const { data } = await supabase.from("profiles").select("alias, goal, preferences, recovery_email").eq("id", currentUser.id).maybeSingle();
      $("alias-input").value = data?.alias || "";
      $("goal-input").value = data?.goal || "";
      miriStyle = normalizeMiriStyle(data?.preferences?.miri_style);
      renderMiriStyleOptions();
      if ($("recovery-email-input")) $("recovery-email-input").value = data?.recovery_email || "";

      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("daily_reminder_enabled")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      $("reminder-toggle").checked = Boolean(prefs?.daily_reminder_enabled);
      await loadMotivationSettings();
    } catch (e) {
      console.error("loadSettings failed", e);
    }
  }

  function bindSettings() {
    $("recovery-email-save")?.addEventListener("click", async () => {
      const email = String($("recovery-email-input")?.value || "").trim().toLowerCase();
      const message = $("recovery-email-message");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (message) { message.textContent = currentLocale === "tr" ? "Geçerli bir e-posta yaz." : "اكتب بريدًا صحيحًا."; message.hidden = false; }
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke(CONFIG.accountFunction || "account-auth", { body: { mode: "update_recovery", recoveryEmail: email } });
        if (error || !data?.ok) throw new Error(data?.code || "recovery_save_failed");
        if (message) { message.textContent = t("recoveryEmailSaved"); message.hidden = false; }
      } catch (error) {
        console.error("recovery email save failed", error);
        if (message) { message.textContent = t("settingsSaveError"); message.hidden = false; }
      }
    });
    document.querySelectorAll(".miri-style-option").forEach((button) => {
      button.addEventListener("click", () => {
        miriStyle = normalizeMiriStyle(button.dataset.miriStyle);
        renderMiriStyleOptions();
      });
    });

    $("miri-style-save")?.addEventListener("click", async () => {
      try {
        const { data, error: readError } = await supabase.from("profiles").select("preferences").eq("id", currentUser.id).maybeSingle();
        if (readError) throw readError;
        const preferences = data?.preferences && typeof data.preferences === "object" ? data.preferences : {};
        const { error } = await supabase.from("profiles").update({ preferences: { ...preferences, miri_style: miriStyle }, updated_at: new Date().toISOString() }).eq("id", currentUser.id);
        if (error) throw error;
      } catch (e) {
        console.error("Miri style save failed", e);
        setConnectionMessage(t("settingsSaveError"));
      }
    });

    $("motivation-save")?.addEventListener("click", saveMotivationSettings);

    $("alias-save")?.addEventListener("click", async () => {
      const alias = $("alias-input").value.trim();
      if (!alias) return;
      try {
        const { error } = await supabase.from("profiles").update({ alias, updated_at: new Date().toISOString() }).eq("id", currentUser.id);
        if (error) throw error;
      } catch (e) {
        console.error("alias save failed", e);
        setConnectionMessage(t("settingsSaveError"));
      }
    });

    $("goal-save")?.addEventListener("click", async () => {
      const goal = $("goal-input").value.trim();
      try {
        const { error } = await supabase.from("profiles").update({ goal, updated_at: new Date().toISOString() }).eq("id", currentUser.id);
        if (error) throw error;
      } catch (e) {
        console.error("goal save failed", e);
        setConnectionMessage(t("settingsSaveError"));
      }
    });

    $("reminder-toggle")?.addEventListener("change", async (e) => {
      const enabled = e.target.checked;
      try {
        const { error } = await supabase
          .from("notification_preferences")
          .upsert({ user_id: currentUser.id, daily_reminder_enabled: enabled, updated_at: new Date().toISOString() });
        if (error) throw error;
        // ملاحظة: هذا يحفظ التفضيل فقط. لا يوجد Push حقيقي بدون Service Worker وbackend مخصص لذلك.
      } catch (e) {
        console.error("reminder toggle failed", e);
        e.target.checked = !enabled;
      }
    });

    $("export-data")?.addEventListener("click", async () => {
      try {
        const [{ data: meals }, { data: exercises }, { data: logs }, { data: plans }] = await Promise.all([
          supabase.from("meals").select("*").eq("user_id", currentUser.id),
          supabase.from("exercises").select("*").eq("user_id", currentUser.id),
          supabase.from("daily_logs").select("*").eq("user_id", currentUser.id),
          supabase.from("plans").select("*").eq("user_id", currentUser.id),
        ]);
        const blob = new Blob([JSON.stringify({ meals, exercises, logs, plans }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "yoldas-data.json";
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("export failed", e);
        setConnectionMessage(t("exportError"));
      }
    });

    $("delete-data")?.addEventListener("click", async () => {
      if (!confirm(t("deleteConfirm"))) return;
      try {
        await Promise.all([
          supabase.from("meals").delete().eq("user_id", currentUser.id),
          supabase.from("exercises").delete().eq("user_id", currentUser.id),
          supabase.from("daily_logs").delete().eq("user_id", currentUser.id),
          supabase.from("plans").delete().eq("user_id", currentUser.id),
          supabase.from("weight_logs").delete().eq("user_id", currentUser.id),
        ]);
        await loadTodaySummary();
        alert(t("deleteSuccess"));
      } catch (e) {
        console.error("delete data failed", e);
        setConnectionMessage(t("deleteError"));
      }
    });
  }

  // ============== بدء التشغيل ==============

  async function init() {
    supabase = initSupabase();
    supabase?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") showResetCompletion();
    });
    bindNavigation();
    bindAccounts();
    bindAssistant();
    bindPlans();
    bindFoodCatalog();
    bindGymMode();
    bindCommunity();
    bindSettings();

    $("start-button")?.addEventListener("click", startJourney);
    $("water-button")?.addEventListener("click", addWaterCup);

    loadReferenceRecipes().then(renderFoodCatalog);

    applyLocale();

    if (!isConfigured()) {
      showWelcome();
      return;
    }

    try {
      const session = await ensureSession();
      if (session?.user) {
        currentUser = session.user;
        await ensureProfile(currentUser.id);
        await retireOwnProgressPhotos();
        showDashboard();
        switchScreen("today");
      } else {
        showWelcome();
      }
    } catch (e) {
      console.error("init session check failed", e);
      showWelcome();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
