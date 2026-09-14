/* ═══════════════════════════════════════════════════════════════════════
   Rabith (رابط) — web app logic. Vanilla JS, no build step.
   Sections: i18n · utils · algorithms (offline parity) · data layer (API / offline) ·
             pages (home, discover, brands, campaigns, outreach, agents, social, legal, pricing) ·
             drawer/modal/toast · router · init
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
"use strict";

/* ══════════════════════════ 1. I18N ══════════════════════════ */
const T = {
ar: {
  n_home:"الرئيسية",n_disc:"اكتشف",n_brands:"العلامات",n_camp:"الحملات",n_out:"التواصل",n_agents:"الوكلاء",n_social:"السوشيال",n_legal:"العقود",n_price:"الأسعار",
  mode_checking:"جارٍ الاتصال…",mode_online:"متصل · Claude",mode_online_off:"متصل · وضع القواعد",mode_offline:"وضع تجريبي · Offline",
  hero_eye:"منصة التسويق عبر المؤثرين · إندونيسيا",hero_h1:"ربط العلامات التجارية بصنّاع المحتوى — بفريق من 21 وكيل ذكاء اصطناعي",hero_sub:"اكتشاف المؤثرين، كشف الاحتيال، مطابقة الحملات، رسائل التواصل، والعقود — كلها في مكان واحد ومؤتمتة عبر n8n.",hero_cta1:"اكتشف المؤثرين ←",hero_cta2:"جرّب وحدة الوكلاء",
  c_creators:"مؤثر موثّق",c_brands:"علامة تجارية",c_campaigns:"حملة",c_er:"متوسط التفاعل",team_eye:"كيف يعمل فريق الذكاء الاصطناعي",team_h:"منسّق واحد يقود 20 وكيلاً متخصصاً في 5 مجموعات",feat_eye:"ماذا تفعل المنصة",
  f1t:"اكتشاف المؤثرين",f1d:"بحث وفلترة 120+ مؤثر بالمنصة والنيش والفئة والمدينة مع درجة احتيال لكل حساب",f2t:"كشف الاحتيال",f2d:"تحليل نسبة المتابَعين، قفزات النمو، التعليقات العامة وأنماط التفاعل المشتراة قبل الدفع",f3t:"مطابقة الحملات",f3d:"خوارزمية موزونة: النيش، المنصة، الفئة، التفاعل، الثقة والمدينة — مع خطة محسّنة للميزانية",f4t:"رسائل التواصل",f4d:"قوالب بثلاث لغات، تعبئة تلقائية، تخصيص بالذكاء الاصطناعي، وإرسال عبر n8n مع متابعات",f5t:"وحدة الوكلاء",f5d:"تحدّث مع المنسّق، شاهد الخطة وخطوات التفويض لكل وكيل متخصص في خط زمني",f6t:"إدارة السوشيال",f6d:"توليد منشورات لصفحة رابط، جدولتها ونشرها على IG / TikTok / LinkedIn / X",
  integ_eye:"متكامل مع",foot_desc:"منصة تنسيق المؤثرين والعلامات بالذكاء الاصطناعي — إندونيسيا",foot_rights:"جميع الحقوق محفوظة.",
  orch_name:"المنسّق الرئيسي",orch_sub:"العقل المركزي · Plan / Act / Reflect",orch_1:"تحليل الطلب",orch_2:"اختيار الوكلاء",orch_3:"تفويض بالتوازي",orch_4:"جمع النتائج",orch_5:"إجابة موحّدة",
  d_eye:"اكتشاف المؤثرين — Xingtu 星图",d_h:"اكتشف المؤثرين الموثّقين",d_sub:"فلترة بالمنصة، النيش، الفئة، المدينة، درجة الاحتيال والتفاعل",d_reset:"إعادة ضبط",d_search:"ابحث بالاسم أو الحساب أو النيش...",f_platform_all:"كل المنصات",f_niche_all:"كل النيشات",f_tier_all:"كل الفئات",f_city_all:"كل المدن",f_maxfraud:"أقصى احتيال",f_mineng:"أدنى تفاعل",sort_score:"ترتيب: الأفضل",sort_followers:"ترتيب: المتابعون",sort_engagement:"ترتيب: التفاعل",sort_fraud:"ترتيب: الأقل احتيالاً",d_more:"عرض المزيد ↓",d_count:"{n} مؤثر · يظهر {m}",
  followers:"متابع",engagement:"تفاعل",views:"مشاهدات",fraud:"احتيال",price_post:"سعر المنشور",verified:"موثّق",risk_low:"آمن",risk_medium:"مراجعة",risk_high:"خطر",
  audit:"فحص الاحتيال",add_to_camp:"أضف إلى حملة",invite_wa:"دعوة واتساب",audience:"الجمهور",female:"إناث",age:"العمر",top_cities:"أهم المدن",langs:"اللغات",growth:"نمو 30 يوم",generic_comments:"تعليقات عامة",signals:"الإشارات",explanation:"التفسير",rates:"بطاقة الأسعار",post:"منشور",story:"ستوري",video:"فيديو",live:"بث",bio:"نبذة",contact:"التواصل",no_flags:"لا توجد إشارات مريبة",
  b_eye:"إدارة العلاقات — CRM",b_h:"مسار العلامات التجارية",b_sub:"اسحب البطاقات بين المراحل أو استخدم الأسهم · lead → contacted → replied → pilot → active",b_search:"بحث...",b_new:"+ علامة جديدة",
  p_lead:"عميل محتمل",p_contacted:"تم التواصل",p_replied:"ردّ",p_pilot:"تجريبي",p_active:"نشط",p_churned:"مغادر",
  name:"الاسم",type:"النوع",industry:"القطاع",size:"الحجم",country:"الدولة",website:"الموقع",budget:"الميزانية",products:"المنتجات",target_aud:"الجمهور المستهدف",notes:"ملاحظات",contacts:"جهات الاتصال",contact_name:"اسم جهة الاتصال",role:"المنصب",email:"البريد",pipeline:"المرحلة",save:"حفظ",cancel:"إلغاء",edit:"تعديل",gen_outreach:"توليد رسالة تواصل",new_campaign_for:"حملة لهذه العلامة",ask_agent:"اسأل المنسّق",moved_to:"نُقل إلى",brand_saved:"تم حفظ العلامة",
  cp_eye:"الحملات والمطابقة الذكية",cp_h:"الحملات",cp_sub:"أنشئ حملة، شغّل المطابقة بالذكاء الاصطناعي، واحصل على خطة محسّنة للميزانية",cp_new:"+ حملة جديدة",cp_none:"لا توجد حملات بعد — أنشئ أول حملة",cp_campaign:"الحملة",cp_brand:"العلامة",cp_name:"اسم الحملة",objective:"الهدف",obj_awareness:"وعي",obj_sales:"مبيعات",obj_launch:"إطلاق",obj_ugc:"UGC",kpi_type:"نوع KPI",kpi_target:"هدف KPI",platforms:"المنصات",niches:"النيشات",tiers:"الفئات",cities:"المدن",start:"البداية",end:"النهاية",create:"إنشاء",run_match:"▶ تشغيل المطابقة الذكية",rerun_match:"↻ إعادة المطابقة",matches:"النتائج",plan:"الخطة المقترحة",selected:"مختار",total_cost:"التكلفة الإجمالية",exp_reach:"الوصول المتوقع",utilisation:"استخدام الميزانية",avg_cpm:"متوسط CPM",export_csv:"تصدير CSV",score:"الدرجة",cost:"التكلفة",reach:"الوصول",breakdown:"التفصيل",no_matches:"شغّل المطابقة لعرض النتائج",st_draft:"مسودة",st_matching:"مطابقة",st_outreach:"تواصل",st_live:"جارية",st_reporting:"تقارير",st_done:"منتهية",creators_n:"مؤثر",campaign_created:"تم إنشاء الحملة",matching_done:"اكتملت المطابقة",invite_selected:"دعوة المختارين عبر واتساب",
  o_eye:"التواصل مع العلامات — Outreach",o_h:"مولّد رسائل التواصل",o_sub:"اختر علامة وجهة اتصال وقالباً، عبّئ المتغيرات، خصّص بالذكاء الاصطناعي، ثم أرسل عبر n8n",ot_gen:"المولّد",ot_tpl:"القوالب",ot_seq:"التسلسل",ot_rules:"القواعد الذهبية",o_brand:"العلامة",o_contact:"جهة الاتصال",o_template:"القالب",o_auto:"تلقائي (حسب اللغة والقطاع)",o_vars:"المتغيرات",o_personalize:"تخصيص بالذكاء الاصطناعي (السطر الأول + الحملة الأخيرة)",o_generate:"توليد المعاينة",o_save:"حفظ كمسودة",o_send:"إرسال عبر n8n",o_preview:"المعاينة",o_preview_empty:"اختر علامة وقالباً ثم اضغط «توليد المعاينة»",copy:"نسخ",copied:"تم النسخ",all_langs:"كل اللغات",all_channels:"كل القنوات",all_status:"كل الحالات",words:"كلمة",personalized:"مخصّص بالذكاء الاصطناعي",use_tpl:"استخدم",best_for:"الأفضل لـ",draft_saved:"تم حفظ المسودة",sent_n8n:"أُرسل إلى n8n",scheduled_local:"مجدول (n8n غير متصل)",send_failed:"فشل الإرسال",gen_first:"ولّد المعاينة أولاً",step:"خطوة",no_outreach:"لا توجد رسائل بعد",view:"عرض",send:"إرسال",
  a_eye:"وحدة الوكلاء — Agent Console",a_h:"تحدّث مع المنسّق",a_sub:"المنسّق 总 يحلّل الطلب، يختار الوكلاء، يفوّض المهام ويجمع النتائج",chat_clear:"مسح",chat_ph:"اكتب طلبك للمنسّق...",a_runs:"سجل التشغيلات",a_mode_claude:"العقل: Claude",a_mode_offline:"العقل: قواعد (بلا اتصال)",a_welcome:"مرحباً! أنا المنسّق 总. اطلب مني البحث عن مؤثرين، فحص الاحتيال، تحضير رسائل التواصل، تخطيط الحملات أو إدارة صفحات السوشيال.",thinking:"يعمل الفريق…",tools_used:"أداة",delegated:"مفوَّض",talk_to:"تحدّث مع",chat_with_agent:"تتحدث الآن مباشرة مع",no_runs:"لا توجد تشغيلات بعد",
  q1:"ابحث عن 20 مؤثر نانو للتجميل في جاكرتا",q2:"حضّر رسالة تواصل لـ Somethinc",q3:"افحص الاحتيال لأعلى 10 مؤثرين",q4:"خطة محتوى أسبوعية لصفحة رابط",q5:"تقرير المنصة هذا الأسبوع",q6:"استراتيجية دخول Al Haramain للسوق الإندونيسي",
  s_eye:"إدارة صفحات رابط",s_h:"السوشيال ميديا",s_sub:"ولّد منشورات بالذكاء الاصطناعي، جدولها، وانشرها عبر n8n",s_composer:"المحرّر",platform:"المنصة",language:"اللغة",tone:"النبرة",tone_friendly:"ودّي",tone_expert:"خبير",tone_bold:"جريء",topic:"الموضوع",topic_ph:"مثال: لماذا الـ Nano creators أفضل للـ UMKM",caption:"الكابشن",hashtags:"الهاشتاقات",schedule_at:"موعد النشر",best_time:"أفضل وقت مقترح",s_generate:"✨ توليد بالذكاء الاصطناعي",s_save_draft:"حفظ مسودة",s_schedule:"جدولة",s_list:"القائمة",s_calendar:"التقويم",publish:"نشر عبر n8n",delete:"حذف",no_posts:"لا توجد منشورات",topic_required:"اكتب الموضوع أولاً",caption_required:"الكابشن فارغ",post_saved:"تم حفظ المنشور",post_scheduled:"تمت الجدولة",when_required:"اختر موعد النشر",
  lg_eye:"العقود القانونية",lg_h:"مولّد عقود KUHPerdata",lg_sub:"KUHPerdata · UU ITE · PP No.71/2019 — يُملأ من بيانات الحملة والمؤثر",creator:"المؤثر",deliverable:"المخرجات",fee_idr:"الأجر (IDR)",cps_idr:"CPS / وحدة (IDR)",lg_generate:"توليد العقد",lg_print:"طباعة / PDF",c_sign:"✍️ إرسال للتوقيع PrivyID",lg_empty:"اختر حملة ومؤثراً ثم ولّد العقد",lg_steps:"خطوات العملية",s1t:"مطابقة AI",s1d:"اختيار المؤثر بالذكاء الاصطناعي",s2t:"كشف الاحتيال",s2d:"تحليل المتابعين والتفاعل",s3t:"صياغة العقد",s3d:"متوافق مع KUHPerdata وUU ITE",s4t:"توقيع PrivyID",s4d:"توقيع إلكتروني موثّق قانونياً",s5t:"Escrow محمي",s5d:"المدفوعات محفوظة حتى إكمال الحملة",s6t:"الدفع والتقرير",s6d:"إطلاق الدفع + تقرير الأداء",lg_history:"العقود المحفوظة",contract_saved:"تم حفظ العقد",sign_sent:"تم إرسال العقد للتوقيع (n8n)",no_contracts:"لا توجد عقود محفوظة",need_camp_creator:"اختر حملة ومؤثراً",
  pr_eye:"خطط الاشتراك",pr_h:"اختر خطتك",pr_sub:"لا عقود سنوية — ترقية أو تخفيض في أي وقت",pr_brand:"للشركات",pr_creator:"لصنّاع المحتوى",pl_free:"مجاني",per_mo:"/شهر",pp1a:"5 عمليات بحث عن مؤثرين",pp1b:"حملة نشطة واحدة",pp1c:"عقد أساسي",pp1d:"وحدة الوكلاء",btn_free:"ابدأ مجاناً",pl_growth:"نمو",pp2a:"بحث غير محدود",pp2b:"10 حملات نشطة",pp2c:"مطابقة AI كاملة",pp2d:"كشف الاحتيال",pp2e:"مولّد التواصل + n8n",btn_start:"ابدأ الآن",pl_ent:"مؤسسة",pp3a:"كل مزايا خطة النمو",pp3b:"حملات غير محدودة",pp3c:"21 وكيل ذكاء اصطناعي",pp3d:"مدير حساب مخصص",pp3e:"تقارير White-Label",btn_contact:"تواصل معنا",pc1a:"ملف شخصي أساسي",pc1b:"3 حملات/شهر",pc1c:"عقد أساسي",btn_join:"انضم مجاناً",pl_pro:"محترف",pc2a:"حملات غير محدودة",pc2b:"تحليل حسابك الشخصي",pc2c:"🛡️ BPJS Ketenagakerjaan",pc2d:"أولوية في المطابقة",btn_upgrade:"ترقية الآن",pc3a:"للمؤثرين 1K–10K متابع",pc3b:"وصول لحملات UMKM",pc3c:"🛡️ BPJS Ketenagakerjaan",btn_nano:"انضم كـ Nano",most_popular:"الأكثر شيوعاً",
  api_error:"خطأ في الخادم",close:"إغلاق",yes:"نعم",required:"حقل مطلوب",
},
en: {
  n_home:"Home",n_disc:"Discover",n_brands:"Brands",n_camp:"Campaigns",n_out:"Outreach",n_agents:"Agents",n_social:"Social",n_legal:"Contracts",n_price:"Pricing",
  mode_checking:"Connecting…",mode_online:"Online · Claude",mode_online_off:"Online · rule mode",mode_offline:"Demo · Offline",
  hero_eye:"Influencer marketing platform · Indonesia",hero_h1:"Connecting brands with creators — run by a team of 21 AI agents",hero_sub:"Creator discovery, fraud detection, campaign matching, outreach and contracts — in one place, automated with n8n.",hero_cta1:"Discover creators →",hero_cta2:"Try the Agent Console",
  c_creators:"verified creators",c_brands:"brands",c_campaigns:"campaigns",c_er:"avg engagement",team_eye:"How the AI team works",team_h:"One orchestrator leads 20 specialists in 5 groups",feat_eye:"What the platform does",
  f1t:"Creator discovery",f1d:"Search and filter 120+ creators by platform, niche, tier and city with a fraud score per account",f2t:"Fraud detection",f2d:"Follow ratio, growth spikes, generic comments and bought-engagement patterns analysed before you pay",f3t:"Campaign matching",f3d:"Weighted algorithm: niche, platform, tier, engagement, trust and city — with a budget-optimised plan",f4t:"Outreach messages",f4d:"Templates in three languages, auto-fill, AI personalisation and sending via n8n with follow-ups",f5t:"Agent console",f5d:"Talk to the orchestrator, watch the plan and every delegation step on a timeline",f6t:"Social management",f6d:"Generate posts for Rabith's page, schedule and publish on IG / TikTok / LinkedIn / X",
  integ_eye:"Integrates with",foot_desc:"AI-orchestrated influencer × brand platform — Indonesia",foot_rights:"All rights reserved.",
  orch_name:"Master Orchestrator",orch_sub:"Central brain · Plan / Act / Reflect",orch_1:"Analyse request",orch_2:"Pick agents",orch_3:"Delegate in parallel",orch_4:"Reconcile outputs",orch_5:"Unified answer",
  d_eye:"Creator discovery — Xingtu 星图",d_h:"Discover verified creators",d_sub:"Filter by platform, niche, tier, city, fraud score and engagement",d_reset:"Reset",d_search:"Search by name, handle or niche...",f_platform_all:"All platforms",f_niche_all:"All niches",f_tier_all:"All tiers",f_city_all:"All cities",f_maxfraud:"Max fraud",f_mineng:"Min engagement",sort_score:"Sort: best",sort_followers:"Sort: followers",sort_engagement:"Sort: engagement",sort_fraud:"Sort: safest",d_more:"Show more ↓",d_count:"{n} creators · showing {m}",
  followers:"followers",engagement:"engagement",views:"views",fraud:"fraud",price_post:"per post",verified:"verified",risk_low:"safe",risk_medium:"review",risk_high:"risk",
  audit:"Fraud audit",add_to_camp:"Add to campaign",invite_wa:"WhatsApp invite",audience:"Audience",female:"female",age:"age",top_cities:"Top cities",langs:"Languages",growth:"30d growth",generic_comments:"generic comments",signals:"Signals",explanation:"Explanation",rates:"Rate card",post:"post",story:"story",video:"video",live:"live",bio:"Bio",contact:"Contact",no_flags:"No suspicious signals",
  b_eye:"Relationship management — CRM",b_h:"Brand pipeline",b_sub:"Drag cards between stages or use the arrows · lead → contacted → replied → pilot → active",b_search:"Search...",b_new:"+ New brand",
  p_lead:"Lead",p_contacted:"Contacted",p_replied:"Replied",p_pilot:"Pilot",p_active:"Active",p_churned:"Churned",
  name:"Name",type:"Type",industry:"Industry",size:"Size",country:"Country",website:"Website",budget:"Budget",products:"Products",target_aud:"Target audience",notes:"Notes",contacts:"Contacts",contact_name:"Contact name",role:"Role",email:"Email",pipeline:"Stage",save:"Save",cancel:"Cancel",edit:"Edit",gen_outreach:"Generate outreach",new_campaign_for:"New campaign for this brand",ask_agent:"Ask the orchestrator",moved_to:"Moved to",brand_saved:"Brand saved",
  cp_eye:"Campaigns & AI matching",cp_h:"Campaigns",cp_sub:"Create a campaign, run AI matching, get a budget-optimised plan",cp_new:"+ New campaign",cp_none:"No campaigns yet — create the first one",cp_campaign:"Campaign",cp_brand:"Brand",cp_name:"Campaign name",objective:"Objective",obj_awareness:"Awareness",obj_sales:"Sales",obj_launch:"Launch",obj_ugc:"UGC",kpi_type:"KPI type",kpi_target:"KPI target",platforms:"Platforms",niches:"Niches",tiers:"Tiers",cities:"Cities",start:"Start",end:"End",create:"Create",run_match:"▶ Run AI matching",rerun_match:"↻ Re-run matching",matches:"Matches",plan:"Suggested plan",selected:"selected",total_cost:"Total cost",exp_reach:"Expected reach",utilisation:"Budget used",avg_cpm:"Avg CPM",export_csv:"Export CSV",score:"Score",cost:"Cost",reach:"Reach",breakdown:"Breakdown",no_matches:"Run matching to see results",st_draft:"draft",st_matching:"matching",st_outreach:"outreach",st_live:"live",st_reporting:"reporting",st_done:"done",creators_n:"creators",campaign_created:"Campaign created",matching_done:"Matching complete",invite_selected:"Invite selected via WhatsApp",
  o_eye:"Brand outreach",o_h:"Outreach generator",o_sub:"Pick a brand, contact and template, fill the variables, personalise with AI, then send via n8n",ot_gen:"Generator",ot_tpl:"Templates",ot_seq:"Sequence",ot_rules:"Golden rules",o_brand:"Brand",o_contact:"Contact",o_template:"Template",o_auto:"Auto (by language & industry)",o_vars:"Variables",o_personalize:"Personalise with AI (first line + their latest campaign)",o_generate:"Generate preview",o_save:"Save as draft",o_send:"Send via n8n",o_preview:"Preview",o_preview_empty:"Pick a brand and template, then press “Generate preview”",copy:"Copy",copied:"Copied",all_langs:"All languages",all_channels:"All channels",all_status:"All statuses",words:"words",personalized:"AI-personalised",use_tpl:"Use",best_for:"Best for",draft_saved:"Draft saved",sent_n8n:"Sent to n8n",scheduled_local:"Scheduled (n8n not connected)",send_failed:"Send failed",gen_first:"Generate the preview first",step:"step",no_outreach:"No outreach yet",view:"View",send:"Send",
  a_eye:"Agent Console",a_h:"Talk to the orchestrator",a_sub:"The orchestrator 总 analyses the request, picks agents, delegates and reconciles",chat_clear:"Clear",chat_ph:"Ask the orchestrator...",a_runs:"Run history",a_mode_claude:"Brain: Claude",a_mode_offline:"Brain: rules (offline)",a_welcome:"Hi! I'm the orchestrator 总. Ask me to find creators, audit fraud, draft outreach, plan campaigns or manage social pages.",thinking:"The team is working…",tools_used:"tools",delegated:"delegated",talk_to:"Talk to",chat_with_agent:"You are now talking directly to",no_runs:"No runs yet",
  q1:"Find 20 nano beauty creators in Jakarta",q2:"Draft outreach for Somethinc",q3:"Fraud-check the top 10 creators",q4:"Weekly content plan for Rabith's page",q5:"Platform report for this week",q6:"Indonesia market-entry strategy for Al Haramain",
  s_eye:"Rabith page management",s_h:"Social media",s_sub:"Generate posts with AI, schedule them, publish via n8n",s_composer:"Composer",platform:"Platform",language:"Language",tone:"Tone",tone_friendly:"Friendly",tone_expert:"Expert",tone_bold:"Bold",topic:"Topic",topic_ph:"e.g. Why nano creators beat macro for UMKM",caption:"Caption",hashtags:"Hashtags",schedule_at:"Publish at",best_time:"Suggested best time",s_generate:"✨ Generate with AI",s_save_draft:"Save draft",s_schedule:"Schedule",s_list:"List",s_calendar:"Calendar",publish:"Publish via n8n",delete:"Delete",no_posts:"No posts",topic_required:"Write a topic first",caption_required:"Caption is empty",post_saved:"Post saved",post_scheduled:"Scheduled",when_required:"Pick a publish time",
  lg_eye:"Legal contracts",lg_h:"KUHPerdata contract generator",lg_sub:"KUHPerdata · UU ITE · PP No.71/2019 — filled from campaign and creator data",creator:"Creator",deliverable:"Deliverables",fee_idr:"Fee (IDR)",cps_idr:"CPS / unit (IDR)",lg_generate:"Generate contract",lg_print:"Print / PDF",c_sign:"✍️ Send for PrivyID signature",lg_empty:"Pick a campaign and creator, then generate",lg_steps:"Process",s1t:"AI matching",s1d:"Creator chosen by AI",s2t:"Fraud check",s2d:"Followers & engagement analysed",s3t:"Contract drafting",s3d:"KUHPerdata & UU ITE compliant",s4t:"PrivyID signature",s4d:"Legally binding e-signature",s5t:"Escrow",s5d:"Funds held until the campaign completes",s6t:"Payout & report",s6d:"Release payment + performance report",lg_history:"Saved contracts",contract_saved:"Contract saved",sign_sent:"Contract sent for signature (n8n)",no_contracts:"No saved contracts",need_camp_creator:"Pick a campaign and a creator",
  pr_eye:"Plans",pr_h:"Choose your plan",pr_sub:"No annual contracts — upgrade or downgrade anytime",pr_brand:"For brands",pr_creator:"For creators",pl_free:"Free",per_mo:"/month",pp1a:"5 creator searches",pp1b:"1 active campaign",pp1c:"Basic contract",pp1d:"Agent console",btn_free:"Start free",pl_growth:"Growth",pp2a:"Unlimited search",pp2b:"10 active campaigns",pp2c:"Full AI matching",pp2d:"Fraud detection",pp2e:"Outreach generator + n8n",btn_start:"Start now",pl_ent:"Enterprise",pp3a:"Everything in Growth",pp3b:"Unlimited campaigns",pp3c:"21 AI agents",pp3d:"Dedicated account manager",pp3e:"White-label reports",btn_contact:"Contact us",pc1a:"Basic profile",pc1b:"3 campaigns/month",pc1c:"Basic contract",btn_join:"Join free",pl_pro:"Pro",pc2a:"Unlimited campaigns",pc2b:"Your account analytics",pc2c:"🛡️ BPJS Ketenagakerjaan",pc2d:"Matching priority",btn_upgrade:"Upgrade",pc3a:"For 1K–10K creators",pc3b:"Access to UMKM campaigns",pc3c:"🛡️ BPJS Ketenagakerjaan",btn_nano:"Join as Nano",most_popular:"Most popular",
  api_error:"Server error",close:"Close",yes:"Yes",required:"Required",
},
id: {
  n_home:"Beranda",n_disc:"Temukan",n_brands:"Brand",n_camp:"Kampanye",n_out:"Outreach",n_agents:"Agen",n_social:"Sosial",n_legal:"Kontrak",n_price:"Harga",
  mode_checking:"Menghubungkan…",mode_online:"Online · Claude",mode_online_off:"Online · mode aturan",mode_offline:"Demo · Offline",
  hero_eye:"Platform influencer marketing · Indonesia",hero_h1:"Menghubungkan brand dengan kreator — dijalankan tim 21 agen AI",hero_sub:"Penemuan kreator, deteksi fraud, pencocokan kampanye, outreach, dan kontrak — di satu tempat, otomatis dengan n8n.",hero_cta1:"Temukan kreator →",hero_cta2:"Coba Konsol Agen",
  c_creators:"kreator terverifikasi",c_brands:"brand",c_campaigns:"kampanye",c_er:"rata-rata engagement",team_eye:"Cara kerja tim AI",team_h:"Satu orkestrator memimpin 20 spesialis dalam 5 grup",feat_eye:"Apa yang dilakukan platform",
  f1t:"Penemuan kreator",f1d:"Cari & filter 120+ kreator berdasarkan platform, niche, tier, kota dengan skor fraud per akun",f2t:"Deteksi fraud",f2d:"Rasio follow, lonjakan growth, komentar generik, dan pola engagement palsu dianalisis sebelum bayar",f3t:"Pencocokan kampanye",f3d:"Algoritma berbobot: niche, platform, tier, engagement, trust, kota — dengan rencana anggaran optimal",f4t:"Pesan outreach",f4d:"Template 3 bahasa, isi otomatis, personalisasi AI, kirim via n8n dengan follow-up",f5t:"Konsol agen",f5d:"Bicara dengan orkestrator, lihat rencana dan setiap delegasi di timeline",f6t:"Manajemen sosial",f6d:"Buat postingan untuk halaman Rabith, jadwalkan, publikasikan ke IG / TikTok / LinkedIn / X",
  integ_eye:"Terintegrasi dengan",foot_desc:"Platform influencer × brand berbasis AI — Indonesia",foot_rights:"Hak cipta dilindungi.",
  orch_name:"Orkestrator Utama",orch_sub:"Otak pusat · Plan / Act / Reflect",orch_1:"Analisis permintaan",orch_2:"Pilih agen",orch_3:"Delegasi paralel",orch_4:"Satukan hasil",orch_5:"Jawaban terpadu",
  d_eye:"Penemuan kreator — Xingtu 星图",d_h:"Temukan kreator terverifikasi",d_sub:"Filter berdasarkan platform, niche, tier, kota, skor fraud, dan engagement",d_reset:"Reset",d_search:"Cari nama, handle, atau niche...",f_platform_all:"Semua platform",f_niche_all:"Semua niche",f_tier_all:"Semua tier",f_city_all:"Semua kota",f_maxfraud:"Fraud maks",f_mineng:"Engagement min",sort_score:"Urut: terbaik",sort_followers:"Urut: followers",sort_engagement:"Urut: engagement",sort_fraud:"Urut: teraman",d_more:"Tampilkan lagi ↓",d_count:"{n} kreator · tampil {m}",
  followers:"followers",engagement:"engagement",views:"views",fraud:"fraud",price_post:"per post",verified:"terverifikasi",risk_low:"aman",risk_medium:"tinjau",risk_high:"risiko",
  audit:"Audit fraud",add_to_camp:"Tambah ke kampanye",invite_wa:"Undang via WhatsApp",audience:"Audiens",female:"perempuan",age:"usia",top_cities:"Kota utama",langs:"Bahasa",growth:"growth 30 hari",generic_comments:"komentar generik",signals:"Sinyal",explanation:"Penjelasan",rates:"Rate card",post:"post",story:"story",video:"video",live:"live",bio:"Bio",contact:"Kontak",no_flags:"Tidak ada sinyal mencurigakan",
  b_eye:"Manajemen relasi — CRM",b_h:"Pipeline brand",b_sub:"Seret kartu antar tahap atau gunakan panah · lead → contacted → replied → pilot → active",b_search:"Cari...",b_new:"+ Brand baru",
  p_lead:"Lead",p_contacted:"Dihubungi",p_replied:"Membalas",p_pilot:"Pilot",p_active:"Aktif",p_churned:"Churn",
  name:"Nama",type:"Tipe",industry:"Industri",size:"Ukuran",country:"Negara",website:"Website",budget:"Anggaran",products:"Produk",target_aud:"Target audiens",notes:"Catatan",contacts:"Kontak",contact_name:"Nama kontak",role:"Jabatan",email:"Email",pipeline:"Tahap",save:"Simpan",cancel:"Batal",edit:"Edit",gen_outreach:"Buat outreach",new_campaign_for:"Kampanye baru untuk brand ini",ask_agent:"Tanya orkestrator",moved_to:"Dipindah ke",brand_saved:"Brand disimpan",
  cp_eye:"Kampanye & pencocokan AI",cp_h:"Kampanye",cp_sub:"Buat kampanye, jalankan pencocokan AI, dapatkan rencana anggaran optimal",cp_new:"+ Kampanye baru",cp_none:"Belum ada kampanye — buat yang pertama",cp_campaign:"Kampanye",cp_brand:"Brand",cp_name:"Nama kampanye",objective:"Tujuan",obj_awareness:"Awareness",obj_sales:"Penjualan",obj_launch:"Peluncuran",obj_ugc:"UGC",kpi_type:"Jenis KPI",kpi_target:"Target KPI",platforms:"Platform",niches:"Niche",tiers:"Tier",cities:"Kota",start:"Mulai",end:"Selesai",create:"Buat",run_match:"▶ Jalankan pencocokan AI",rerun_match:"↻ Ulangi pencocokan",matches:"Hasil",plan:"Rencana yang disarankan",selected:"dipilih",total_cost:"Total biaya",exp_reach:"Jangkauan",utilisation:"Anggaran terpakai",avg_cpm:"Rata-rata CPM",export_csv:"Ekspor CSV",score:"Skor",cost:"Biaya",reach:"Jangkauan",breakdown:"Rincian",no_matches:"Jalankan pencocokan untuk melihat hasil",st_draft:"draf",st_matching:"pencocokan",st_outreach:"outreach",st_live:"berjalan",st_reporting:"laporan",st_done:"selesai",creators_n:"kreator",campaign_created:"Kampanye dibuat",matching_done:"Pencocokan selesai",invite_selected:"Undang yang dipilih via WhatsApp",
  o_eye:"Outreach ke brand",o_h:"Generator pesan outreach",o_sub:"Pilih brand, kontak, dan template, isi variabel, personalisasi dengan AI, lalu kirim via n8n",ot_gen:"Generator",ot_tpl:"Template",ot_seq:"Urutan",ot_rules:"Aturan emas",o_brand:"Brand",o_contact:"Kontak",o_template:"Template",o_auto:"Otomatis (bahasa & industri)",o_vars:"Variabel",o_personalize:"Personalisasi dengan AI (baris pertama + kampanye terbaru mereka)",o_generate:"Buat pratinjau",o_save:"Simpan sebagai draf",o_send:"Kirim via n8n",o_preview:"Pratinjau",o_preview_empty:"Pilih brand & template lalu tekan “Buat pratinjau”",copy:"Salin",copied:"Disalin",all_langs:"Semua bahasa",all_channels:"Semua kanal",all_status:"Semua status",words:"kata",personalized:"Dipersonalisasi AI",use_tpl:"Pakai",best_for:"Terbaik untuk",draft_saved:"Draf disimpan",sent_n8n:"Dikirim ke n8n",scheduled_local:"Dijadwalkan (n8n belum terhubung)",send_failed:"Gagal kirim",gen_first:"Buat pratinjau dulu",step:"langkah",no_outreach:"Belum ada outreach",view:"Lihat",send:"Kirim",
  a_eye:"Konsol Agen",a_h:"Bicara dengan orkestrator",a_sub:"Orkestrator 总 menganalisis permintaan, memilih agen, mendelegasikan, dan menyatukan hasil",chat_clear:"Bersihkan",chat_ph:"Tulis permintaan untuk orkestrator...",a_runs:"Riwayat eksekusi",a_mode_claude:"Otak: Claude",a_mode_offline:"Otak: aturan (offline)",a_welcome:"Halo! Saya orkestrator 总. Minta saya mencari kreator, audit fraud, membuat outreach, merencanakan kampanye, atau mengelola halaman sosial.",thinking:"Tim sedang bekerja…",tools_used:"alat",delegated:"didelegasikan",talk_to:"Bicara dengan",chat_with_agent:"Anda sekarang bicara langsung dengan",no_runs:"Belum ada eksekusi",
  q1:"Cari 20 kreator nano kecantikan di Jakarta",q2:"Buat pesan outreach untuk Somethinc",q3:"Audit fraud 10 kreator teratas",q4:"Rencana konten mingguan halaman Rabith",q5:"Laporan platform minggu ini",q6:"Strategi masuk pasar Indonesia untuk Al Haramain",
  s_eye:"Pengelolaan halaman Rabith",s_h:"Media sosial",s_sub:"Buat postingan dengan AI, jadwalkan, publikasikan via n8n",s_composer:"Komposer",platform:"Platform",language:"Bahasa",tone:"Nada",tone_friendly:"Ramah",tone_expert:"Ahli",tone_bold:"Berani",topic:"Topik",topic_ph:"contoh: Kenapa nano creator lebih cocok untuk UMKM",caption:"Caption",hashtags:"Hashtag",schedule_at:"Waktu tayang",best_time:"Waktu terbaik",s_generate:"✨ Buat dengan AI",s_save_draft:"Simpan draf",s_schedule:"Jadwalkan",s_list:"Daftar",s_calendar:"Kalender",publish:"Publikasikan via n8n",delete:"Hapus",no_posts:"Belum ada postingan",topic_required:"Tulis topik dulu",caption_required:"Caption kosong",post_saved:"Postingan disimpan",post_scheduled:"Dijadwalkan",when_required:"Pilih waktu tayang",
  lg_eye:"Kontrak hukum",lg_h:"Generator kontrak KUHPerdata",lg_sub:"KUHPerdata · UU ITE · PP No.71/2019 — diisi dari data kampanye & kreator",creator:"Kreator",deliverable:"Deliverable",fee_idr:"Fee (IDR)",cps_idr:"CPS / unit (IDR)",lg_generate:"Buat kontrak",lg_print:"Cetak / PDF",c_sign:"✍️ Kirim tanda tangan PrivyID",lg_empty:"Pilih kampanye & kreator lalu buat kontrak",lg_steps:"Proses",s1t:"Pencocokan AI",s1d:"Kreator dipilih oleh AI",s2t:"Deteksi fraud",s2d:"Analisis followers & engagement",s3t:"Penyusunan kontrak",s3d:"Sesuai KUHPerdata & UU ITE",s4t:"Tanda tangan PrivyID",s4d:"Tanda tangan elektronik sah",s5t:"Escrow",s5d:"Dana ditahan sampai kampanye selesai",s6t:"Pembayaran & laporan",s6d:"Pencairan + laporan performa",lg_history:"Kontrak tersimpan",contract_saved:"Kontrak disimpan",sign_sent:"Kontrak dikirim untuk tanda tangan (n8n)",no_contracts:"Belum ada kontrak",need_camp_creator:"Pilih kampanye dan kreator",
  pr_eye:"Paket",pr_h:"Pilih paket Anda",pr_sub:"Tanpa kontrak tahunan — upgrade atau downgrade kapan saja",pr_brand:"Untuk brand",pr_creator:"Untuk kreator",pl_free:"Gratis",per_mo:"/bulan",pp1a:"5 pencarian kreator",pp1b:"1 kampanye aktif",pp1c:"Kontrak dasar",pp1d:"Konsol agen",btn_free:"Mulai gratis",pl_growth:"Growth",pp2a:"Pencarian tanpa batas",pp2b:"10 kampanye aktif",pp2c:"Pencocokan AI penuh",pp2d:"Deteksi fraud",pp2e:"Generator outreach + n8n",btn_start:"Mulai sekarang",pl_ent:"Enterprise",pp3a:"Semua fitur Growth",pp3b:"Kampanye tanpa batas",pp3c:"21 agen AI",pp3d:"Account manager khusus",pp3e:"Laporan white-label",btn_contact:"Hubungi kami",pc1a:"Profil dasar",pc1b:"3 kampanye/bulan",pc1c:"Kontrak dasar",btn_join:"Gabung gratis",pl_pro:"Pro",pc2a:"Kampanye tanpa batas",pc2b:"Analitik akun Anda",pc2c:"🛡️ BPJS Ketenagakerjaan",pc2d:"Prioritas pencocokan",btn_upgrade:"Upgrade",pc3a:"Untuk kreator 1K–10K",pc3b:"Akses kampanye UMKM",pc3c:"🛡️ BPJS Ketenagakerjaan",btn_nano:"Gabung sebagai Nano",most_popular:"Paling populer",
  api_error:"Kesalahan server",close:"Tutup",yes:"Ya",required:"Wajib diisi",
}};
let LANG = "ar";
const t = (k, vars) => { let s = (T[LANG] && T[LANG][k]) ?? T.en[k] ?? k; if (vars) for (const v in vars) s = s.replace(`{${v}}`, vars[v]); return s; };
const L3 = (obj) => (obj && (obj[LANG] || obj.en)) || "";

/* ══════════════════════════ 2. UTILS ══════════════════════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtK = (n = 0) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : String(Math.round(n));
const fmtIDR = (n = 0) => "Rp" + Math.round(n || 0).toLocaleString("en-US");
const fmtDate = (s) => s ? new Date(s).toLocaleDateString(LANG === "ar" ? "ar-EG" : LANG === "id" ? "id-ID" : "en-GB", { day: "2-digit", month: "short" }) : "—";
const fmtDT = (s) => s ? new Date(s).toLocaleString(LANG === "ar" ? "ar-EG" : LANG === "id" ? "id-ID" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const uid = (p) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const riskOf = (f) => f < 20 ? "low" : f < 50 ? "medium" : "high";
const riskBadge = (f) => { const r = riskOf(f ?? 0); return `<span class="badge ${r === "low" ? "b-green" : r === "medium" ? "b-amber" : "b-red"}" title="${t("fraud")}">${r === "low" ? "🛡️" : r === "medium" ? "⚠️" : "⛔"} ${f ?? 0} · ${t("risk_" + r)}</span>`; };
const platIcon = (p) => ({ tiktok: "🎵", instagram: "📸", youtube: "▶️", linkedin: "💼", x: "𝕏" }[p] || "🌐");
const GROUP_COLORS = { core: "#10D4A8", ops: "#F59E0B", intel: "#3B82F6", spec: "#F43F5E", dev: "#84CC16" };
const PIPE = ["lead", "contacted", "replied", "pilot", "active", "churned"];
const PIPE_COLOR = { lead: "#8B909E", contacted: "#3B82F6", replied: "#A87BFF", pilot: "#F59E0B", active: "#10D4A8", churned: "#F43F5E" };
let toastTimer;
function toast(msg, kind = "") { const el = $("#toast"); el.textContent = msg; el.className = "show " + kind; clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.className = ""), 3200); }
const debounce = (fn, ms = 250) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };
function download(name, content, type = "text/csv") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }
async function copyText(s) { try { await navigator.clipboard.writeText(s); toast(t("copied"), "ok"); } catch { const ta = document.createElement("textarea"); ta.value = s; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); toast(t("copied"), "ok"); } }

/* ══════════════════════════ 3. ALGORITHMS (offline parity with apps/api) ══════════════════════════ */
const EXPECTED_ER = { nano: 7.5, micro: 4.8, mid: 3.1, macro: 2.0, mega: 1.4 };
const VIEW_NORM = { tiktok: 0.6, instagram: 0.25, youtube: 0.35 };
const FW = { erAnomaly: 0.28, followRatio: 0.12, growthSpike: 0.22, genericComments: 0.2, viewsRatio: 0.1, commentLikeRatio: 0.08 };
const c01 = (x) => Math.max(0, Math.min(1, x));
function tierOf(f) { return f < 1e4 ? "nano" : f < 1e5 ? "micro" : f < 5e5 ? "mid" : f < 2e6 ? "macro" : "mega"; }
function computeFraud(c) {
  const tier = c.tier || tierOf(c.followers || 0), exp = EXPECTED_ER[tier];
  const er = Number(c.engagementRate ?? 0), ratio = exp ? er / exp : 1;
  const s = {}, flags = [];
  s.erAnomaly = c01((Math.abs(Math.log(Math.max(ratio, 0.01))) - 0.35) / 1.1);
  if (ratio > 2.2) flags.push("engagement_pod_suspected"); if (ratio < 0.35) flags.push("bought_followers_suspected");
  const fr = c.followers ? (c.following || 0) / c.followers : 0;
  s.followRatio = tier === "nano" || tier === "micro" ? c01((fr - 0.35) / 0.9) : 0; if (s.followRatio > 0.5) flags.push("follow_for_follow");
  const g = Number(c.growth30d || 0); s.growthSpike = g > 40 ? c01((g - 40) / 80 + (ratio < 0.8 ? 0.35 : 0)) : 0; if (s.growthSpike > 0.4) flags.push("follower_spike");
  const gc = Number(c.genericCommentRatio ?? 0.12); s.genericComments = c01((gc - 0.3) / 0.5); if (gc > 0.5) flags.push("generic_comments");
  const vn = VIEW_NORM[c.platform] || 0.3, vr = c.followers ? (c.avgViews || 0) / c.followers : vn; s.viewsRatio = c01((vn * 0.3 - vr) / (vn * 0.3)); if (s.viewsRatio > 0.6) flags.push("low_reach_vs_followers");
  const clr = c.avgLikes ? (c.avgComments || 0) / c.avgLikes : 0.04; s.commentLikeRatio = clr > 0.25 ? c01((clr - 0.25) / 0.5) : clr < 0.005 ? 0.5 : 0;
  let score = 0; for (const k in FW) score += FW[k] * (s[k] || 0);
  score = Math.max(score * 1.6, Math.max(...Object.values(s)) * 0.55) + (flags.length >= 2 ? 0.12 : 0) + (flags.length >= 3 ? 0.1 : 0);
  const fraudScore = Math.round(c01(score) * 100);
  const sig = {}; for (const k in s) sig[k] = Math.round(s[k] * 100) / 100;
  return { fraudScore, fraudFlags: flags, fraudRisk: riskOf(fraudScore), signals: sig, tier };
}
const FLAG_TXT = { engagement_pod_suspected: { ar: "تفاعل أعلى بكثير من المعتاد لهذه الفئة — نمط مجموعات التفاعل أو الإعجابات المشتراة.", en: "Engagement far above the norm for this tier — typical of pods or bought likes.", id: "Engagement jauh di atas normal tier ini — pola pod atau likes palsu." }, bought_followers_suspected: { ar: "تفاعل أقل بكثير من المعتاد — جمهور متضخم بمتابعين خاملين أو مشترين.", en: "Engagement far below the norm — audience likely inflated with inactive/purchased followers.", id: "Engagement jauh di bawah normal — audiens kemungkinan diisi followers pasif/palsu." }, follower_spike: { ar: "قفزة نمو في 30 يوماً بلا تفاعل مقابل.", en: "Follower spike in 30 days without matching engagement.", id: "Lonjakan followers 30 hari tanpa engagement sepadan." }, generic_comments: { ar: "نسبة عالية من التعليقات العامة/الإيموجي فقط.", en: "High share of generic/emoji-only comments.", id: "Banyak komentar generik/emoji saja." }, follow_for_follow: { ar: "نسبة المتابَعين/المتابعين توحي بنمو follow-for-follow.", en: "Following/followers ratio suggests follow-for-follow growth.", id: "Rasio following/followers menunjukkan follow-for-follow." }, low_reach_vs_followers: { ar: "متوسط المشاهدات منخفض جداً مقارنة بالمتابعين.", en: "Average views unusually low relative to followers.", id: "Rata-rata views sangat rendah dibanding followers." } };
const MW = { niche: 0.25, audience: 0.12, engagement: 0.15, budget: 0.10, trust: 0.18, platform: 0.10, location: 0.06, language: 0.04 };
const DELIV = { awareness: "video", sales: "video", launch: "video", ugc: "post" }, REACH_MULT = { post: 0.35, story: 0.15, video: 1, live: 0.8 };
function jaccard(a = [], b = []) { const A = new Set(a.map((x) => String(x).toLowerCase())), B = new Set(b.map((x) => String(x).toLowerCase())); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); }
const cl = (x) => Math.max(0, Math.min(100, x));
function scoreCreator(c, cp, brand) {
  const b = {}; const j = jaccard(c.niche, cp.niches); const hit = (cp.niches || []).some((n) => (c.niche || []).includes(n));
  b.niche = cl(Math.round((j * 70 + (hit ? 30 : 0)) * 1.2));
  const ta = String(brand?.targetAudience || "").toLowerCase(); const fem = c.audience?.femalePct ?? 50; let aud = 60;
  if (/women|female|hijab|beauty|perempuan|نساء/.test(ta)) aud = fem; else if (/men|male|pria|رجال/.test(ta)) aud = 100 - fem;
  if (/gen z|18|student|mahasiswa|شباب/.test(ta)) aud = (aud + (c.audience?.age18_24 ?? 35) * 1.6) / 2; if (/25|profession|karyawan|families|keluarga|عائل/.test(ta)) aud = (aud + (c.audience?.age25_34 ?? 35) * 1.6) / 2;
  b.audience = cl(Math.round(aud));
  const exp = EXPECTED_ER[c.tier] || 4, r = (c.engagementRate || 0) / exp; b.engagement = cl(Math.round(r >= 1 ? 80 + Math.min(20, (r - 1) * 25) : r * 80));
  const d = DELIV[cp.objective] || "post", price = c.priceIDR?.[d] || c.priceIDR?.post || 0, estReach = Math.round((c.avgViews || c.followers * 0.3) * (REACH_MULT[d] || 0.5)), cpm = estReach ? (price / estReach) * 1000 : 1e9;
  const afford = cp.budgetIDR ? price <= cp.budgetIDR : true; b.budget = cl(!afford ? 5 : cpm < 2e4 ? 100 : cpm < 5e4 ? 85 : cpm < 1e5 ? 65 : cpm < 2e5 ? 45 : 25);
  b.trust = cl(100 - (c.fraudScore ?? 30) + (c.verified ? 5 : 0));
  b.platform = (cp.platforms || []).length ? (cp.platforms.includes(c.platform) ? 100 : 15) : 80;
  b.location = (cp.cities || []).length ? (cp.cities.includes(c.city) ? 100 : (c.audience?.topCities || []).some((x) => cp.cities.includes(x)) ? 70 : 30) : 80;
  b.language = (cp.languages || []).length ? (cp.languages.some((l) => (c.languages || []).includes(l)) ? 100 : 30) : 90;
  let score = 0; for (const k in MW) score += MW[k] * b[k];
  if ((cp.tiers || []).length && !cp.tiers.includes(c.tier)) score *= 0.55; if ((c.fraudScore ?? 0) >= 50) score *= 0.5;
  return { creatorId: c.id, score: Math.round(score * 10) / 10, breakdown: b, deliverable: d, estCostIDR: price, estReach, cpmIDR: Math.round(cpm) };
}
function buildPlan(matches, budget) {
  if (!budget) { const s = matches.slice(0, 5); return { selected: s.map((m) => m.creatorId), totalCostIDR: s.reduce((a, m) => a + m.estCostIDR, 0), expectedReach: s.reduce((a, m) => a + m.estReach, 0) }; }
  const ranked = matches.filter((m) => m.score >= 40 && m.estCostIDR > 0).map((m) => ({ ...m, d: (m.estReach * (m.score / 100)) / m.estCostIDR })).sort((a, b) => b.d - a.d);
  const sel = []; let cost = 0, reach = 0; for (const m of ranked) if (cost + m.estCostIDR <= budget) { sel.push(m.creatorId); cost += m.estCostIDR; reach += m.estReach; }
  return { selected: sel, totalCostIDR: cost, expectedReach: reach, budgetIDR: budget, utilisationPct: Math.round((cost / budget) * 100), avgCpmIDR: reach ? Math.round((cost / reach) * 1000) : null };
}
const fillTpl = (s = "", v = {}) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => v[k] ?? `[${k}]`);
function pickTemplate(brand, contact) { const lang = contact?.lang || (["SA", "AE", "QA", "KW", "BH", "OM"].includes(brand?.country) ? "ar" : brand?.country === "ID" ? "id" : "en"); const g = (id) => S.templates.find((x) => x.id === id); if (brand?.type === "agency") return g("agency_en"); if (lang === "ar") return g("gulf_ar"); if (lang === "id") return g("local_id"); if (brand?.industry === "fmcg") return g("fmcg_en"); return g("beauty_en"); }
function deriveVars(brand, contact, extra = {}) { return { brandName: brand?.name || "", agencyName: brand?.name || "", firstName: (contact?.name || "").split(" ")[0] || "there", product: brand?.products?.[0] || brand?.name || "", yourName: "Zied", phone: "+62 8xx-xxxx-xxxx", ...extra }; }

/* ══════════════════════════ 4. STATE + DATA LAYER ══════════════════════════ */
const API = (window.RABITH_API_BASE || (location.protocol === "file:" ? "http://localhost:8787/api" : "/api")).replace(/\/$/, "");
const S = { mode: "checking", brain: "offline", agents: [], groups: {}, creators: [], brands: [], campaigns: [], outreach: [], posts: [], runs: [], templates: [], rules: [], contracts: [], chat: [], chatAgent: "orchestrator", ctx: {}, disc: { page: 0 }, selCampaign: null, outreachDraft: null };
const OFFLINE_AGENTS = [
  ["orchestrator", "总", "core", { ar: "المنسّق الرئيسي", en: "Master Orchestrator", id: "Orkestrator Utama" }, { ar: "العقل المركزي: يحلّل، يفوّض، يجمع ويقدّم إجابة موحّدة.", en: "Central brain: analyses, delegates, reconciles, answers.", id: "Otak pusat: analisis, delegasi, satukan, jawab." }],
  ["discovery", "配", "core", { ar: "الاكتشاف والمطابقة", en: "Discovery & Matching", id: "Penemuan & Pencocokan" }, { ar: "يبحث عن المؤثرين ويطابقهم مع الحملات.", en: "Finds creators and matches them to campaigns.", id: "Mencari & mencocokkan kreator." }],
  ["content", "创", "core", { ar: "استوديو المحتوى", en: "Content Studio", id: "Studio Konten" }, { ar: "بريفات وسكريبتات وكابشن بثلاث لغات.", en: "Briefs, scripts, captions in 3 languages.", id: "Brief, skrip, caption 3 bahasa." }],
  ["legal", "约", "core", { ar: "العقود القانونية", en: "Legal & Contracts", id: "Legal & Kontrak" }, { ar: "عقود KUHPerdata و UU ITE.", en: "KUHPerdata / UU ITE contracts.", id: "Kontrak KUHPerdata / UU ITE." }],
  ["campaign", "智", "core", { ar: "مدير الحملات", en: "Campaign Manager", id: "Manajer Kampanye" }, { ar: "تخطيط، ميزانية، جدول، KPI.", en: "Plan, budget, timeline, KPIs.", id: "Rencana, anggaran, timeline, KPI." }],
  ["support", "服", "core", { ar: "الدعم", en: "Support", id: "Dukungan" }, { ar: "يجيب عن أسئلة المؤثرين والشركات.", en: "Answers creators and brands.", id: "Menjawab kreator & brand." }],
  ["marketing", "宣", "core", { ar: "التسويق وإدارة الصفحات", en: "Marketing & Social Pages", id: "Pemasaran & Halaman Sosial" }, { ar: "تقويم محتوى، نشر، ردود.", en: "Calendars, publishing, replies.", id: "Kalender, publikasi, balasan." }],
  ["finance", "财", "ops", { ar: "المالية والمدفوعات", en: "Finance & Payments", id: "Keuangan" }, { ar: "تكاليف، PPh، ضمان.", en: "Costs, PPh, escrow.", id: "Biaya, PPh, escrow." }],
  ["quality", "质", "ops", { ar: "مراقبة الجودة", en: "Quality Control", id: "Kontrol Kualitas" }, { ar: "مراجعة المحتوى قبل النشر.", en: "Content review before publishing.", id: "Tinjau konten sebelum tayang." }],
  ["fraud", "防", "ops", { ar: "مراقبة الاحتيال", en: "Fraud Surveillance", id: "Anti-Fraud" }, { ar: "كشف المتابعين الوهميين.", en: "Detects fake followers & pods.", id: "Deteksi followers palsu." }],
  ["analytics", "析", "intel", { ar: "تحليل الأعمال", en: "Business Analytics", id: "Analitik Bisnis" }, { ar: "تقارير، ROI، مقارنات.", en: "Reports, ROI, benchmarks.", id: "Laporan, ROI, benchmark." }],
  ["sales", "销", "intel", { ar: "المبيعات والنمو", en: "Sales & Growth", id: "Penjualan" }, { ar: "تأهيل العملاء والتواصل البارد.", en: "Lead qualification and cold outreach.", id: "Kualifikasi lead & outreach." }],
  ["retention", "留", "intel", { ar: "الاحتفاظ والترقية", en: "Retention & Upsell", id: "Retensi" }, { ar: "تجديد وترقية العملاء.", en: "Renewals and upsells.", id: "Perpanjangan & upsell." }],
  ["live", "播", "spec", { ar: "البث المباشر", en: "Live Commerce", id: "Live Commerce" }, { ar: "بثوث TikTok/Shopee Live.", en: "TikTok / Shopee Live runs.", id: "Sesi live TikTok/Shopee." }],
  ["negotiation", "谈", "spec", { ar: "التفاوض", en: "Negotiation", id: "Negosiasi" }, { ar: "أسعار وشروط عادلة.", en: "Fair rates and terms.", id: "Tarif & syarat adil." }],
  ["crisis", "危", "spec", { ar: "إدارة الأزمات", en: "Crisis Management", id: "Manajemen Krisis" }, { ar: "خطط 24 ساعة وبيانات.", en: "24h playbooks and statements.", id: "Playbook 24 jam." }],
  ["onboarding", "迎", "spec", { ar: "الاستقبال والتأهيل", en: "Onboarding", id: "Onboarding" }, { ar: "ترحيب وإكمال الملفات.", en: "Welcome and profile completion.", id: "Sambutan & kelengkapan profil." }],
  ["trend", "势", "dev", { ar: "رصد الترندات", en: "Trend Intelligence", id: "Intel Tren" }, { ar: "ترندات إندونيسية وفرص.", en: "Indonesian trends and moments.", id: "Tren & momen Indonesia." }],
  ["creatordev", "育", "dev", { ar: "تطوير المؤثرين", en: "Creator Development", id: "Pengembangan Kreator" }, { ar: "تدريب مؤثري النانو.", en: "Coaching nano creators.", id: "Melatih kreator nano." }],
  ["strategy", "策", "dev", { ar: "استراتيجية العلامة", en: "Brand Strategy", id: "Strategi Brand" }, { ar: "دخول السوق الإندونيسي.", en: "Indonesia go-to-market.", id: "Strategi masuk Indonesia." }],
  ["community", "群", "dev", { ar: "المجتمع", en: "Community", id: "Komunitas" }, { ar: "مجتمع المؤثرين الخاص.", en: "Private creator community.", id: "Komunitas kreator privat." }],
].map(([id, glyph, group, name, description]) => ({ id, glyph, group, name, description, color: GROUP_COLORS[group] }));
const GROUP_NAMES = { core: { ar: "الأساسيون", en: "Core", id: "Inti" }, ops: { ar: "العمليات", en: "Operations", id: "Operasional" }, intel: { ar: "الذكاء", en: "Intelligence", id: "Intelijen" }, spec: { ar: "التخصص", en: "Specialized", id: "Spesialis" }, dev: { ar: "التطوير", en: "Development", id: "Pengembangan" } };

async function api(path, opt = {}) {
  const res = await fetch(API + path, { method: opt.method || "GET", headers: { "content-type": "application/json" }, body: opt.body ? JSON.stringify(opt.body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error?.message || `${t("api_error")} ${res.status}`);
  return j;
}
const online = () => S.mode === "online";
/* offline persistence */
const LS = "rabith.db";
function lsLoad() { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } }
function lsSave() { if (online()) return; try { localStorage.setItem(LS, JSON.stringify({ brands: S.brands, campaigns: S.campaigns, outreach: S.outreach, posts: S.posts, runs: S.runs, contracts: S.contracts, creatorsExtra: S.creators.filter((c) => c.source === "manual") })); } catch { /* quota */ } }
function loadSeedOffline() {
  const seed = window.__SEED || { creators: [], brands: [] }, tp = window.__TEMPLATES || { items: [], rules: [] };
  const saved = lsLoad();
  S.creators = seed.creators.map((c) => ({ ...c, ...computeFraud(c) })).concat((saved.creatorsExtra || []).map((c) => ({ ...c, ...computeFraud(c) })));
  S.brands = saved.brands || seed.brands.map((b) => ({ ...b }));
  S.campaigns = saved.campaigns || []; S.outreach = saved.outreach || []; S.posts = saved.posts || []; S.runs = saved.runs || []; S.contracts = saved.contracts || [];
  S.templates = tp.items; S.rules = tp.rules; S.agents = OFFLINE_AGENTS;
}
/* unified data access */
const D = {
  async health() { return api("/health"); },
  async stats() { if (online()) return api("/stats"); const p = {}; S.brands.forEach((b) => (p[b.pipeline] = (p[b.pipeline] || 0) + 1)); return { creators: S.creators.length, brands: S.brands.length, campaigns: S.campaigns.length, outreach: S.outreach.length, runs: S.runs.length, pipeline: p, avgEngagement: Math.round((S.creators.reduce((s, c) => s + c.engagementRate, 0) / (S.creators.length || 1)) * 100) / 100 }; },
  async creators(q) {
    if (online()) { const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== "" && v != null)).toString(); return api("/creators?" + qs); }
    let items = S.creators; const s = (q.q || "").toLowerCase();
    if (s) items = items.filter((c) => [c.name, c.handle, c.bio, c.city, ...(c.niche || [])].join(" ").toLowerCase().includes(s));
    if (q.platform) items = items.filter((c) => c.platform === q.platform); if (q.niche) items = items.filter((c) => (c.niche || []).includes(q.niche)); if (q.tier) items = items.filter((c) => c.tier === q.tier); if (q.city) items = items.filter((c) => c.city === q.city);
    if (q.maxFraud !== "" && q.maxFraud != null) items = items.filter((c) => c.fraudScore <= Number(q.maxFraud)); if (q.minEngagement) items = items.filter((c) => c.engagementRate >= Number(q.minEngagement));
    const key = { followers: (c) => c.followers, engagement: (c) => c.engagementRate, trust: (c) => -c.fraudScore, fraud: (c) => c.fraudScore, score: (c) => (100 - c.fraudScore) * 0.5 + Math.min(c.engagementRate, 12) * 4 + (c.verified ? 5 : 0) }[q.sort || "score"];
    items = [...items].sort((a, b) => key(b) - key(a)); const off = Number(q.offset || 0), lim = Number(q.limit || 24);
    return { items: items.slice(off, off + lim), total: items.length };
  },
  async creator(id) { return online() ? api("/creators/" + id) : S.creators.find((c) => c.id === id); },
  async audit(id) { if (online()) return api(`/creators/${id}/audit`, { method: "POST" }); const c = S.creators.find((x) => x.id === id); const f = computeFraud(c); Object.assign(c, f); return { creatorId: id, ...f, explanation: f.fraudFlags.length ? f.fraudFlags.map((k) => L3(FLAG_TXT[k])) : [t("no_flags")] }; },
  async brands(q = {}) { if (online()) return api("/brands?" + new URLSearchParams(q)); let items = S.brands; if (q.q) items = items.filter((b) => (b.name + b.industry).toLowerCase().includes(q.q.toLowerCase())); return { items, total: items.length }; },
  async saveBrand(b) { if (online()) return b.id ? api("/brands/" + b.id, { method: "PATCH", body: b }) : api("/brands", { method: "POST", body: b }); if (b.id) { const i = S.brands.findIndex((x) => x.id === b.id); S.brands[i] = { ...S.brands[i], ...b }; lsSave(); return S.brands[i]; } const n = { type: "brand", pipeline: "lead", contacts: [], products: [], budgetIDR: 0, source: "manual", ...b, id: uid("br"), createdAt: new Date().toISOString() }; n.contacts = n.contacts.map((c) => ({ id: uid("ct"), lang: c.lang || (n.country === "ID" ? "id" : "en"), ...c })); S.brands.push(n); lsSave(); return n; },
  async patchBrand(id, patch) { return D.saveBrand({ id, ...patch }); },
  async campaigns() { if (online()) return api("/campaigns"); return { items: S.campaigns }; },
  async createCampaign(c) { if (online()) return api("/campaigns", { method: "POST", body: c }); const n = { status: "draft", matches: [], plan: null, ...c, id: uid("cp"), createdAt: new Date().toISOString() }; S.campaigns.push(n); lsSave(); return n; },
  async patchCampaign(id, patch) { if (online()) return api("/campaigns/" + id, { method: "PATCH", body: patch }); const c = S.campaigns.find((x) => x.id === id); Object.assign(c, patch); lsSave(); return c; },
  async match(id, limit = 20) { if (online()) return api(`/campaigns/${id}/match`, { method: "POST", body: { limit } }); const cp = S.campaigns.find((x) => x.id === id); const brand = S.brands.find((b) => b.id === cp.brandId); const matches = S.creators.map((c) => scoreCreator(c, cp, brand)).sort((a, b) => b.score - a.score).slice(0, limit); cp.matches = matches; cp.plan = buildPlan(matches, cp.budgetIDR || 0); if (cp.status === "draft") cp.status = "matching"; lsSave(); return cp; },
  async templates() { if (online()) { const r = await api("/templates"); S.templates = r.items; S.rules = r.rules; } return { items: S.templates, rules: S.rules }; },
  async generateOutreach(p) { if (online()) return api("/outreach/generate", { method: "POST", body: p }); const brand = S.brands.find((b) => b.id === p.brandId); const contact = brand.contacts.find((c) => c.id === p.contactId) || brand.contacts[0] || null; const tpl = (p.templateId && S.templates.find((x) => x.id === p.templateId)) || pickTemplate(brand, contact); const v = deriveVars(brand, contact, p.vars); const body = fillTpl(tpl.body, v); return { brandId: brand.id, contactId: contact?.id || null, templateId: tpl.id, lang: tpl.lang, channel: tpl.channel, vars: v, subject: fillTpl(tpl.subject, v), body, personalized: false, wordCount: body.trim().split(/\s+/).length }; },
  async saveOutreach(o) { if (online()) return api("/outreach", { method: "POST", body: o }); const n = { status: "draft", sequenceStep: 0, ...o, id: uid("or"), createdAt: new Date().toISOString() }; S.outreach.unshift(n); lsSave(); return n; },
  async sendOutreach(id) { if (online()) return api(`/outreach/${id}/send`, { method: "POST", body: {} }); const o = S.outreach.find((x) => x.id === id); o.status = "scheduled"; o.n8n = { skipped: true }; const b = S.brands.find((x) => x.id === o.brandId); if (b && b.pipeline === "lead") { b.pipeline = "contacted"; b.lastOutreachAt = new Date().toISOString(); } lsSave(); return o; },
  async outreach() { if (online()) { const r = await api("/outreach"); S.outreach = r.items; } return { items: S.outreach }; },
  async agents() { if (online()) { const r = await api("/agents"); S.agents = r.items; S.brain = r.mode; } return { items: S.agents }; },
  async runAgent(agent, message, context) {
    if (online()) return api("/agent/run", { method: "POST", body: { agent, message, context } });
    return offlineAgent(agent, message, context);
  },
  async runs() { if (online()) { const r = await api("/agent/runs?limit=20"); S.runs = r.items; } return { items: S.runs.slice(0, 20) }; },
  async posts() { if (online()) { const r = await api("/social/posts"); S.posts = r.items; } return { items: S.posts }; },
  async savePost(p) { if (online()) return api("/social/posts", { method: "POST", body: p }); const n = { account: "@rabith.id", status: p.scheduledAt ? "scheduled" : "draft", hashtags: [], agent: "human", ...p, id: uid("sp"), createdAt: new Date().toISOString() }; S.posts.push(n); lsSave(); return n; },
  async patchPost(id, patch) { if (online()) return api("/social/posts/" + id, { method: "PATCH", body: patch }); const p = S.posts.find((x) => x.id === id); Object.assign(p, patch); lsSave(); return p; },
  async publishPost(id) { if (online()) return api(`/social/posts/${id}/publish`, { method: "POST" }); const p = S.posts.find((x) => x.id === id); p.status = "scheduled"; p.n8n = { skipped: true }; lsSave(); return p; },
  async generatePost(p) { if (online()) return api("/social/generate", { method: "POST", body: p }); const best = { instagram: "19:00 WIB", tiktok: "20:00 WIB", linkedin: "08:30 WIB", x: "12:00 WIB" }[p.platform]; const cap = p.lang === "ar" ? `${p.topic} ✨\n\nفي رابط نربط العلامات بمؤثرين موثّقين ونتائج قابلة للقياس. تواصل معنا اليوم.` : p.lang === "en" ? `${p.topic} ✨\n\nAt Rabith we connect brands with verified creators and measurable results. DM us today.` : `${p.topic} ✨\n\nDi Rabith kami menghubungkan brand dengan kreator terverifikasi dan hasil terukur. DM kami hari ini.`; return { caption: cap, hashtags: ["#Rabith", "#InfluencerMarketingIndonesia", p.platform === "tiktok" ? "#fyp" : "#KOL", "#UMKM"], bestTime: best, mode: "offline" }; },
};
/* offline rule-based orchestrator (mirrors the API's planner at a smaller scale) */
async function offlineAgent(agent, message, context = {}) {
  const run = { id: uid("run"), agent, input: message, status: "running", plan: [], steps: [], output: "", mode: "offline", createdAt: new Date().toISOString() };
  const step = (ag, tool, input, output) => run.steps.push({ agent: ag, tool, input, output, ms: Math.round(20 + Math.random() * 80) });
  const m = message.toLowerCase(); const sections = [];
  const A = (id) => S.agents.find((a) => a.id === id);
  const brand = context.brandId ? S.brands.find((b) => b.id === context.brandId) : S.brands.find((b) => m.includes(b.name.toLowerCase()) || m.includes(b.name.split(/\s|—/)[0].toLowerCase()));
  const niches = ["beauty", "skincare", "fashion", "food", "tech", "lifestyle", "fitness", "finance"].filter((n) => m.includes(n)); if (/تجميل|جمال|kecantikan/.test(m)) niches.push("beauty"); if (/طعام|makanan/.test(m)) niches.push("food");
  const cities = ["Jakarta", "Bandung", "Surabaya", "Bali", "Yogyakarta", "Medan"].filter((c) => m.includes(c.toLowerCase())); if (/جاكرتا/.test(m)) cities.push("Jakarta"); if (/باندونغ/.test(m)) cities.push("Bandung");
  const tiers = ["nano", "micro", "mid", "macro"].filter((x) => m.includes(x)); if (/نانو/.test(m)) tiers.push("nano");
  const n = Number((m.match(/\b(\d{1,3})\b/) || [])[1] || 10);
  const want = { discovery: /find|search|match|creator|influencer|kol|nano|مؤثر|ابحث|cari|kreator/.test(m), fraud: /fraud|fake|audit|احتيال|وهمي|فحص|palsu/.test(m), sales: /outreach|email|pitch|lead|رسالة|تواصل|عميل|penawaran|prospek/.test(m), marketing: /\bpost|caption|calendar|social|\bpage|منشور|صفحة|تقويم|محتوى|konten|jadwal/.test(m), finance: /cost|budget|tax|pph|escrow|تكلفة|ميزانية|ضريب|biaya|anggaran/.test(m), analytics: /report|analytics|stats|تقرير|إحصاء|laporan/.test(m), strategy: /strateg|gtm|market entry|استراتيج|دخول السوق/.test(m), legal: /contract|legal|عقد|kontrak/.test(m) };
  const only = agent !== "orchestrator" ? agent : null;
  if ((only ? only === "discovery" : want.discovery) || (only === "discovery")) {
    run.plan.push(`配 ${L3(A("discovery").name)}`); const cp = { objective: "awareness", budgetIDR: brand?.budgetIDR || 0, niches, cities, tiers, platforms: [] };
    const matches = S.creators.map((c) => scoreCreator(c, cp, brand)).sort((a, b) => b.score - a.score).slice(0, Math.min(n, 30)); step("discovery", "match_campaign", { brief: cp, limit: n }, { matches: matches.length });
    sections.push(`**${t("matches")}** (${niches.join(", ") || "all"}${cities.length ? " · " + cities.join(", ") : ""})\n` + matches.map((x, i) => { const c = S.creators.find((y) => y.id === x.creatorId); return `${i + 1}. ${c.handle} · ${c.platform} · ${fmtK(c.followers)} · ER ${c.engagementRate}% · ${t("fraud")} ${c.fraudScore} · ${fmtIDR(x.estCostIDR)} · ${t("score")} ${x.score}`; }).join("\n"));
  }
  if (only ? only === "fraud" : want.fraud) {
    run.plan.push(`防 ${L3(A("fraud").name)}`); const ids = context.creatorId ? [context.creatorId] : [...S.creators].sort((a, b) => b.followers - a.followers).slice(0, Math.min(n, 15)).map((c) => c.id);
    const res = ids.map((id) => { const c = S.creators.find((x) => x.id === id); return `• ${c.handle} → ${c.fraudScore} (${c.fraudScore < 20 ? "SAFE" : c.fraudScore < 50 ? "REVIEW" : "BLOCK"})${c.fraudFlags.length ? " — " + c.fraudFlags.join(", ") : ""}`; }); step("fraud", "fraud_audit", { creatorIds: ids }, { results: ids.length });
    sections.push(`**${t("audit")}**\n${res.join("\n")}`);
  }
  if (only ? only === "sales" : want.sales || (brand && !Object.values(want).some(Boolean))) {
    run.plan.push(`销 ${L3(A("sales").name)}`);
    if (brand) { const o = await D.generateOutreach({ brandId: brand.id }); const saved = await D.saveOutreach({ brandId: brand.id, contactId: o.contactId, templateId: o.templateId, lang: o.lang, channel: o.channel, subject: o.subject, body: o.body }); step("sales", "generate_outreach", { brandId: brand.id }, { templateId: o.templateId }); step("sales", "save_outreach", { id: saved.id }, { status: "draft" }); sections.push(`**${t("draft_saved")}** (${saved.id} · ${o.templateId})\n${o.subject}\n\n${o.body}`); }
    else { const leads = S.brands.filter((b) => b.pipeline === "lead").slice(0, 8); step("sales", "list_brands", { pipeline: "lead" }, { total: leads.length }); sections.push(`**Leads**\n${leads.map((b) => `• ${b.name} (${b.industry}, ${b.country}) — ${b.contacts[0]?.name || "?"}`).join("\n")}`); }
  }
  if (only ? only === "marketing" : want.marketing) {
    run.plan.push(`宣 ${L3(A("marketing").name)}`); const topics = [["instagram", "Nano creator × UMKM success story"], ["tiktok", "3 signs of fake followers"], ["linkedin", "Why brands buy measurable outcomes in 2026"], ["instagram", "How escrow protects both sides"], ["tiktok", "Trend of the week"]];
    const made = []; for (let i = 0; i < topics.length; i++) { const d = new Date(); d.setDate(d.getDate() + i + 1); d.setHours(19, 0, 0, 0); made.push(await D.savePost({ platform: topics[i][0], caption: topics[i][1] + " ✨", hashtags: ["#Rabith", "#InfluencerMarketing"], lang: LANG, scheduledAt: d.toISOString(), agent: "marketing" })); }
    step("marketing", "generate_social_post", { count: 5 }, { ids: made.map((p) => p.id) }); sections.push(`**${t("s_calendar")}**\n${made.map((p) => `• ${p.scheduledAt.slice(0, 10)} 19:00 WIB · ${p.platform} · ${p.caption}`).join("\n")}`);
  }
  if (only ? only === "finance" : want.finance) { run.plan.push(`财 ${L3(A("finance").name)}`); const base = brand?.budgetIDR || 50e6; step("finance", "platform_stats", {}, {}); sections.push(`**Finance**\n• Creator fees: ${fmtIDR(base)}\n• Platform fee 15%: ${fmtIDR(base * 0.15)}\n• PPN 11%: ${fmtIDR(base * 0.15 * 0.11)}\n• PPh 21 (2.5%): ${fmtIDR(base * 0.025)}\n• Escrow: 50% on contract / 50% on approval`); }
  if (only ? only === "analytics" : want.analytics) { run.plan.push(`析 ${L3(A("analytics").name)}`); const st = await D.stats(); step("analytics", "platform_stats", {}, st); sections.push(`**Report**\n• ${t("c_creators")}: ${st.creators} · ${t("c_er")} ${st.avgEngagement}%\n• ${t("c_brands")}: ${st.brands} · ${Object.entries(st.pipeline).map(([k, v]) => k + " " + v).join(", ")}\n• ${t("c_campaigns")}: ${st.campaigns} · outreach ${st.outreach}`); }
  if (only ? only === "strategy" : want.strategy) { run.plan.push(`策 ${L3(A("strategy").name)}`); sections.push(`**90-day GTM${brand ? " — " + brand.name : ""}**\n1. M1: positioning + 20-nano pilot + TikTok Shop\n2. M2: scale to 100 nano + 5 micro + weekly live\n3. M3: always-on + ambassadors + CPA tracking\nRisks: halal/cultural fit, logistics, pricing.`); }
  if (only ? only === "legal" : want.legal) { run.plan.push(`约 ${L3(A("legal").name)}`); sections.push(`**KUHPerdata / UU ITE**\n1. Parties, scope, deliverables\n2. Usage rights & duration\n3. Exclusivity\n4. Escrow + PPh\n5. Disclosure #iklan\n6. Termination & disputes (mediation/BANI)\n7. e-Signature (PrivyID)`); }
  if (!sections.length) { const ag = A(only || "support"); run.plan.push(`${ag.glyph} ${L3(ag.name)}`); sections.push(L3(ag.description) + "\n\n" + t("a_welcome")); }
  run.output = `🧠 ${t("a_mode_offline")}\n${run.plan.map((p) => "• " + p).join("\n")}\n\n${sections.join("\n\n")}`; run.status = "done"; run.ms = 120;
  S.runs.unshift(run); lsSave(); return run;
}

/* ══════════════════════════ 5. UI PRIMITIVES ══════════════════════════ */
function openDrawer(title, body, footer = "") { $("#drawer-title").textContent = title; $("#drawer-body").innerHTML = body; $("#drawer-ft").innerHTML = footer; $("#drawer").classList.add("show"); $("#backdrop").classList.add("show"); $("#drawer .x-btn").focus(); }
function closeDrawer() { $("#drawer").classList.remove("show"); if (!$("#modal").classList.contains("show")) $("#backdrop").classList.remove("show"); }
function openModal(title, body, footer = "") { $("#modal-title").textContent = title; $("#modal-body").innerHTML = body; $("#modal-ft").innerHTML = footer; $("#modal").classList.add("show"); $("#backdrop").classList.add("show"); const f = $("#modal-body input,#modal-body select,#modal-body textarea"); if (f) f.focus(); }
function closeModal() { $("#modal").classList.remove("show"); if (!$("#drawer").classList.contains("show")) $("#backdrop").classList.remove("show"); }
const field = (label, inner) => `<div class="fg"><label>${esc(label)}</label>${inner}</div>`;
const sel = (id, opts, val) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}"${v === val ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const bar = (label, v, cls = "") => `<div class="bar-row"><div class="bar-hd"><span>${esc(label)}</span><b>${v}</b></div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.max(0, Math.min(100, v))}%"></div></div></div>`;

/* ══════════════════════════ 6. HOME ══════════════════════════ */
async function renderHome() {
  const st = await D.stats().catch(() => null);
  const nums = $$("#home-stats .counter-num");
  const vals = st ? [st.creators, st.brands, st.campaigns, st.avgEngagement] : [S.creators.length, S.brands.length, S.campaigns.length, 0];
  nums.forEach((el, i) => animateNum(el, vals[i]));
  const groups = ["core", "ops", "intel", "spec", "dev"];
  $("#team-strip").innerHTML = `<div class="orch-box"><div><span class="cn">总</span><div class="on">${esc(t("orch_name"))}</div><div class="os">${esc(t("orch_sub"))}</div></div><ol><li>${esc(t("orch_1"))}</li><li>${esc(t("orch_2"))}</li><li>${esc(t("orch_3"))}</li><li>${esc(t("orch_4"))}</li><li>${esc(t("orch_5"))}</li></ol></div>
  <div class="groups-grid">${groups.map((g) => { const ags = S.agents.filter((a) => a.group === g && a.id !== "orchestrator"); return `<div class="group-card" style="--gc:${GROUP_COLORS[g]}"><div class="gh">${esc(L3(GROUP_NAMES[g]))}<span class="gcount">${ags.length}</span></div><div class="chips">${ags.map((a) => `<span><span class="cn">${a.glyph}</span>${esc(L3(a.name))}</span>`).join("")}</div></div>`; }).join("")}</div>`;
}
function animateNum(el, target) { const isF = !Number.isInteger(target); let cur = 0; const inc = target / 40; const tm = setInterval(() => { cur = Math.min(cur + inc, target); el.textContent = isF ? cur.toFixed(1) : Math.floor(cur).toLocaleString(); if (cur >= target) clearInterval(tm); }, 18); }

/* ══════════════════════════ 7. DISCOVER ══════════════════════════ */
const PAGE_SIZE = 24;
function discQuery() { return { q: $("#f-q").value.trim(), platform: $("#f-platform").value, niche: $("#f-niche").value, tier: $("#f-tier").value, city: $("#f-city").value, maxFraud: $("#f-maxfraud").value, minEngagement: $("#f-mineng").value, sort: $("#f-sort").value === "fraud" ? "trust" : $("#f-sort").value }; }
function fillDiscFilters() {
  const niches = [...new Set(S.creators.flatMap((c) => c.niche || []))].sort(), cities = [...new Set(S.creators.map((c) => c.city))].sort();
  const keep = (id, list) => { const s = $(id); const v = s.value; s.innerHTML = s.options[0].outerHTML + list.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join(""); s.value = v; };
  keep("#f-niche", niches); keep("#f-city", cities);
}
async function renderDiscover(reset = true) {
  if (reset) S.disc.page = 0;
  const q = discQuery(); const r = await D.creators({ ...q, limit: PAGE_SIZE, offset: S.disc.page * PAGE_SIZE }).catch((e) => (toast(e.message, "err"), { items: [], total: 0 }));
  const grid = $("#disc-grid"); const html = r.items.map(creatorCard).join("");
  if (reset) grid.innerHTML = html || `<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div>0</div>`; else grid.insertAdjacentHTML("beforeend", html);
  const shown = Math.min((S.disc.page + 1) * PAGE_SIZE, r.total); $("#disc-count").innerHTML = t("d_count", { n: `<b>${r.total}</b>`, m: `<b>${shown}</b>` }); $("#disc-more").hidden = shown >= r.total;
}
function creatorCard(c) {
  return `<button class="creator-card" data-creator="${c.id}"><span class="cc-plat" title="${c.platform}">${platIcon(c.platform)}</span><div class="cc-badges">${riskBadge(c.fraudScore)}${c.verified ? `<span class="badge b-purple">✓ ${esc(t("verified"))}</span>` : ""}</div>
  <div class="cc-avi"><img src="${esc(c.avatar)}" alt="" loading="lazy" onerror="this.remove()"></div><div class="cc-name">${esc(c.name)}</div><div class="cc-handle">${esc(c.handle)}</div><div class="cc-niche">${esc((c.niche || []).join(" · "))} · ${esc(c.city)}</div>
  <div class="cc-stats"><div class="cc-stat"><b>${fmtK(c.followers)}</b><span>${esc(t("followers"))}</span></div><div class="cc-stat"><b>${c.engagementRate}%</b><span>${esc(t("engagement"))}</span></div><div class="cc-stat"><b>${fmtK(c.avgViews)}</b><span>${esc(t("views"))}</span></div></div>
  <div class="cc-price">${esc(t("price_post"))}: <b>${fmtIDR(c.priceIDR?.post)}</b> · <span class="badge b-gray">${c.tier}</span></div></button>`;
}
async function openCreator(id) {
  const c = await D.creator(id); if (!c) return;
  const body = `<div class="profile-hd"><div class="av"><img src="${esc(c.avatar)}" alt="" onerror="this.remove()"></div><div><h4>${esc(c.name)}</h4><span class="hd">${esc(c.handle)}</span> · ${platIcon(c.platform)} ${c.platform} · <span class="badge b-gray">${c.tier}</span><div class="mt-s">${riskBadge(c.fraudScore)} ${c.verified ? `<span class="badge b-purple">✓ ${t("verified")}</span>` : ""}</div></div></div>
  <div class="kv"><div><b>${fmtK(c.followers)}</b><span>${t("followers")}</span></div><div><b>${c.engagementRate}%</b><span>${t("engagement")}</span></div><div><b>${fmtK(c.avgViews)}</b><span>${t("views")}</span></div><div><b>${c.growth30d > 0 ? "+" : ""}${c.growth30d}%</b><span>${t("growth")}</span></div></div>
  <div class="sub-h"><span class="cn">众</span>${t("audience")}</div>${bar(t("female"), c.audience?.femalePct ?? 0, "alt")}${bar("18–24", c.audience?.age18_24 ?? 0)}${bar("25–34", c.audience?.age25_34 ?? 0)}
  <div class="dl"><div><span>${t("top_cities")}</span><span>${esc((c.audience?.topCities || []).join(", "))}</span></div><div><span>${t("langs")}</span><span>${esc((c.languages || []).join(", "))}</span></div><div><span>${t("generic_comments")}</span><span>${Math.round((c.genericCommentRatio || 0) * 100)}%</span></div><div><span>${t("bio")}</span><span>${esc(c.bio)}</span></div><div><span>${t("contact")}</span><span dir="ltr">${esc(c.contact?.whatsapp || "")}</span></div></div>
  <div class="sub-h"><span class="cn">价</span>${t("rates")}</div><div class="kv"><div><b>${fmtIDR(c.priceIDR?.post)}</b><span>${t("post")}</span></div><div><b>${fmtIDR(c.priceIDR?.story)}</b><span>${t("story")}</span></div><div><b>${fmtIDR(c.priceIDR?.video)}</b><span>${t("video")}</span></div><div><b>${fmtIDR(c.priceIDR?.live)}</b><span>${t("live")}</span></div></div>
  <div class="sub-h"><span class="cn">防</span>${t("signals")}</div><div class="flags">${(c.fraudFlags || []).length ? c.fraudFlags.map((f) => `<span class="badge b-red">${esc(f)}</span>`).join("") : `<span class="badge b-green">${t("no_flags")}</span>`}</div><div id="audit-out" class="mt-s"></div>`;
  const ft = `<button class="btn btn-ghost btn-sm" data-action="creator-audit" data-id="${c.id}">🛡️ ${t("audit")}</button><button class="btn btn-primary btn-sm" data-action="creator-add" data-id="${c.id}">＋ ${t("add_to_camp")}</button><button class="btn btn-teal btn-sm" data-action="creator-invite" data-id="${c.id}">💬 ${t("invite_wa")}</button>`;
  openDrawer(c.name, body, ft);
}
async function auditCreator(id) {
  const out = $("#audit-out"); out.innerHTML = `<div class="skel" style="min-height:60px"></div>`;
  try { const r = await D.audit(id); out.innerHTML = `<div class="card card-p" style="padding:12px">${Object.entries(r.signals || {}).map(([k, v]) => bar(k, Math.round(v * 100), v > 0.5 ? "bad" : v > 0.25 ? "warn" : "alt")).join("")}<div class="sub-h">${t("explanation")}</div><ul style="padding-inline-start:18px;font-size:12px;color:var(--muted)">${(r.explanation || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`; const card = $(`[data-creator="${id}"] .cc-badges`); if (card) card.innerHTML = riskBadge(r.fraudScore) + (card.innerHTML.includes("b-purple") ? `<span class="badge b-purple">✓ ${t("verified")}</span>` : ""); }
  catch (e) { out.innerHTML = ""; toast(e.message, "err"); }
}
function inviteCreator(id) {
  const c = S.creators.find((x) => x.id === id) || {}; const tpl = S.templates.find((x) => x.id === "creator_invite_id"); const brand = S.brands.find((b) => b.id === S.selCampaign?.brandId) || S.brands[0];
  const msg = fillTpl(tpl?.body || "", { creatorName: c.name?.split(" ")[0], brandName: brand?.name || "Rabith", feeIDR: (c.priceIDR?.video || 0).toLocaleString("en-US"), deliverable: "1 video TikTok + 1 story" });
  openModal(t("invite_wa"), `<div class="preview" data-lang="id"><div class="body">${esc(msg)}</div></div>`, `<button class="btn btn-ghost btn-sm" data-action="copy-text" data-text="${esc(msg)}">${t("copy")}</button><a class="btn btn-teal btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc((c.contact?.whatsapp || "").replace(/\D/g, ""))}?text=${encodeURIComponent(msg)}">💬 WhatsApp</a>`);
}
function addCreatorToCampaign(id) {
  if (!S.campaigns.length) { toast(t("cp_none"), "warn"); goPage("campaigns"); return; }
  openModal(t("add_to_camp"), field(t("cp_campaign"), sel("m-camp", S.campaigns.map((c) => [c.id, c.name]), S.selCampaign?.id)), `<button class="btn btn-primary btn-sm" data-action="creator-add-confirm" data-id="${id}">${t("save")}</button>`);
}

/* ══════════════════════════ 8. BRANDS (CRM) ══════════════════════════ */
async function renderBrands() {
  const q = $("#b-q").value.trim().toLowerCase(); const r = await D.brands().catch((e) => (toast(e.message, "err"), { items: [] })); S.brands = r.items;
  const items = q ? S.brands.filter((b) => (b.name + " " + b.industry + " " + b.country).toLowerCase().includes(q)) : S.brands;
  $("#kanban").innerHTML = PIPE.map((p) => { const col = items.filter((b) => (b.pipeline || "lead") === p); return `<div class="kcol" data-col="${p}" style="--kc:${PIPE_COLOR[p]}"><div class="kcol-h"><span class="dot"></span>${esc(t("p_" + p))}<span class="n">${col.length}</span></div><div class="kcol-body">${col.map(kcard).join("")}</div></div>`; }).join("");
}
function kcard(b) { const i = PIPE.indexOf(b.pipeline || "lead"); return `<div class="kcard" draggable="true" data-brand="${b.id}"><div class="kn"><img src="${esc(b.logo || "")}" alt="" onerror="this.remove()">${esc(b.name)}</div><div class="km"><span>${esc(b.industry)}</span><span>${esc(b.country)}</span><span class="badge b-gray">${esc(b.type)}</span>${b.budgetIDR ? `<span>${fmtIDR(b.budgetIDR)}</span>` : ""}</div><div class="ka"><span class="tiny muted">${esc(b.contacts?.[0]?.name || "")}</span><span class="mv"><button class="btn btn-ghost btn-xs" data-action="brand-move" data-id="${b.id}" data-dir="-1" ${i <= 0 ? "disabled" : ""}>◀</button><button class="btn btn-ghost btn-xs" data-action="brand-move" data-id="${b.id}" data-dir="1" ${i >= PIPE.length - 1 ? "disabled" : ""}>▶</button></span></div></div>`; }
async function moveBrand(id, to) { try { await D.patchBrand(id, { pipeline: to }); const b = S.brands.find((x) => x.id === id); if (b) b.pipeline = to; toast(`${t("moved_to")}: ${t("p_" + to)}`, "ok"); renderBrands(); } catch (e) { toast(e.message, "err"); } }
function openBrand(id) {
  const b = S.brands.find((x) => x.id === id); if (!b) return;
  const body = `<div class="profile-hd"><div class="av"><img src="${esc(b.logo || "")}" alt="" onerror="this.remove()"></div><div><h4>${esc(b.name)}</h4><span class="badge b-gray">${esc(b.type)}</span> <span class="badge b-purple">${esc(b.industry)}</span> <span class="badge b-blue">${esc(b.country)}</span> <span class="badge" style="color:${PIPE_COLOR[b.pipeline]};border:1px solid ${PIPE_COLOR[b.pipeline]}55">${t("p_" + (b.pipeline || "lead"))}</span></div></div>
  <div class="kv"><div><b>${fmtIDR(b.budgetIDR)}</b><span>${t("budget")}</span></div><div><b>${esc(b.size)}</b><span>${t("size")}</span></div></div>
  <div class="dl"><div><span>${t("website")}</span><span dir="ltr">${b.website ? `<a href="${esc(b.website)}" target="_blank" rel="noopener">${esc(b.website.replace(/^https?:\/\//, ""))}</a>` : "—"}</span></div><div><span>${t("products")}</span><span>${esc((b.products || []).join(", ") || "—")}</span></div><div><span>${t("target_aud")}</span><span>${esc(b.targetAudience || "—")}</span></div><div><span>${t("notes")}</span><span style="white-space:pre-wrap">${esc(b.notes || "—")}</span></div></div>
  <div class="sub-h"><span class="cn">人</span>${t("contacts")}</div>${(b.contacts || []).map((c) => `<div class="card card-p" style="padding:10px;margin-bottom:6px"><b>${esc(c.name)}</b> · <span class="muted">${esc(c.role || "")}</span><div class="tiny" dir="ltr">${esc(c.email || "")} ${c.linkedin ? `· <a href="${esc(c.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ""} · ${esc(c.lang || "")}</div></div>`).join("") || `<span class="muted">—</span>`}
  <div class="sub-h"><span class="cn">邮</span>Outreach</div>${S.outreach.filter((o) => o.brandId === b.id).map((o) => `<div class="tiny">• ${fmtDate(o.createdAt)} · ${esc(o.templateId || "")} · <span class="badge b-gray">${esc(o.status)}</span></div>`).join("") || `<span class="muted tiny">${t("no_outreach")}</span>`}`;
  const ft = `<button class="btn btn-ghost btn-sm" data-action="brand-edit" data-id="${b.id}">✏️ ${t("edit")}</button><button class="btn btn-primary btn-sm" data-action="brand-outreach" data-id="${b.id}">✉️ ${t("gen_outreach")}</button><button class="btn btn-ghost btn-sm" data-action="brand-campaign" data-id="${b.id}">🎯 ${t("new_campaign_for")}</button><button class="btn btn-teal btn-sm" data-action="brand-ask" data-id="${b.id}">总 ${t("ask_agent")}</button>`;
  openDrawer(b.name, body, ft);
}
function brandForm(b = {}) {
  const c = b.contacts?.[0] || {};
  return `<div class="fg2">${field(t("name"), `<input id="bf-name" value="${esc(b.name || "")}" required>`)}${field(t("type"), sel("bf-type", [["brand", "brand"], ["company", "company"], ["agency", "agency"]], b.type || "brand"))}${field(t("industry"), `<input id="bf-industry" value="${esc(b.industry || "")}" placeholder="beauty / fmcg / fashion">`)}${field(t("country"), `<input id="bf-country" value="${esc(b.country || "ID")}" maxlength="2">`)}${field(t("website"), `<input id="bf-web" value="${esc(b.website || "")}" dir="ltr">`)}${field(t("budget") + " (IDR)", `<input id="bf-budget" type="number" step="1000000" value="${b.budgetIDR || ""}">`)}${field(t("pipeline"), sel("bf-pipe", PIPE.map((p) => [p, t("p_" + p)]), b.pipeline || "lead"))}${field(t("products"), `<input id="bf-products" value="${esc((b.products || []).join(", "))}">`)}</div>
  ${field(t("target_aud"), `<input id="bf-aud" value="${esc(b.targetAudience || "")}">`)}${field(t("notes"), `<textarea id="bf-notes" rows="2">${esc(b.notes || "")}</textarea>`)}
  <div class="sub-h">${t("contacts")}</div><div class="fg3">${field(t("contact_name"), `<input id="bf-cname" value="${esc(c.name || "")}">`)}${field(t("role"), `<input id="bf-crole" value="${esc(c.role || "")}">`)}${field(t("email"), `<input id="bf-cemail" value="${esc(c.email || "")}" dir="ltr">`)}</div>`;
}
async function saveBrandForm(id) {
  const name = $("#bf-name").value.trim(); if (!name) { toast(t("required"), "err"); return; }
  const existing = id ? S.brands.find((x) => x.id === id) : null; const c0 = existing?.contacts?.[0] || {};
  const doc = { id, name, type: $("#bf-type").value, industry: $("#bf-industry").value.trim(), country: $("#bf-country").value.trim().toUpperCase(), website: $("#bf-web").value.trim(), budgetIDR: Number($("#bf-budget").value || 0), pipeline: $("#bf-pipe").value, products: $("#bf-products").value.split(",").map((x) => x.trim()).filter(Boolean), targetAudience: $("#bf-aud").value.trim(), notes: $("#bf-notes").value.trim(),
    contacts: $("#bf-cname").value.trim() ? [{ ...c0, name: $("#bf-cname").value.trim(), role: $("#bf-crole").value.trim(), email: $("#bf-cemail").value.trim(), lang: c0.lang || ($("#bf-country").value.trim().toUpperCase() === "ID" ? "id" : ["SA", "AE", "QA", "KW"].includes($("#bf-country").value.trim().toUpperCase()) ? "ar" : "en") }] : existing?.contacts || [] };
  if (!id) delete doc.id;
  try { const saved = await D.saveBrand(doc); if (existing) Object.assign(existing, saved); else if (!S.brands.some((x) => x.id === saved.id)) S.brands.push(saved); closeModal(); closeDrawer(); toast(t("brand_saved"), "ok"); renderBrands(); } catch (e) { toast(e.message, "err"); }
}

/* ══════════════════════════ 9. CAMPAIGNS ══════════════════════════ */
async function renderCampaigns() {
  const r = await D.campaigns().catch((e) => (toast(e.message, "err"), { items: [] })); S.campaigns = r.items;
  $("#camp-list").innerHTML = S.campaigns.length ? S.campaigns.map((c) => { const b = S.brands.find((x) => x.id === c.brandId); const prog = { draft: 10, matching: 35, outreach: 55, live: 75, reporting: 90, done: 100 }[c.status] || 10; return `<button class="camp-card${S.selCampaign?.id === c.id ? " sel" : ""}" data-camp="${c.id}"><div class="row between"><b>${esc(c.name)}</b><span class="badge b-purple">${esc(t("st_" + c.status) || c.status)}</span></div><div class="tiny muted mt-s">${esc(b?.name || "—")} · ${esc(t("obj_" + c.objective) || c.objective)} · ${fmtIDR(c.budgetIDR)}</div><div class="tiny muted">${(c.platforms || []).map(platIcon).join(" ")} ${esc((c.niches || []).join(", "))} · ${(c.matches || []).length} ${t("matches").toLowerCase()}</div><div class="progress"><div class="progress-fill" style="width:${prog}%"></div></div></button>`; }).join("") : `<div class="empty" style="grid-column:1/-1"><div class="big">🎯</div>${t("cp_none")}</div>`;
  if (S.selCampaign) { S.selCampaign = S.campaigns.find((c) => c.id === S.selCampaign.id) || null; }
  renderCampaignDetail();
}
function renderCampaignDetail() {
  const c = S.selCampaign; const el = $("#camp-detail"); if (!c) { el.innerHTML = ""; return; }
  const b = S.brands.find((x) => x.id === c.brandId); const p = c.plan; const selSet = new Set(p?.selected || []);
  const rows = (c.matches || []).map((m, i) => { const cr = S.creators.find((x) => x.id === m.creatorId) || m.creator || {}; return `<tr><td><input type="checkbox" data-sel="${m.creatorId}" ${selSet.has(m.creatorId) ? "checked" : ""}></td><td>${i + 1}</td><td><div class="who"><span class="av"><img src="${esc(cr.avatar || "")}" alt="" onerror="this.remove()"></span><div><b>${esc(cr.name || m.creatorId)}</b><span>${esc(cr.handle || "")} · ${platIcon(cr.platform)} ${cr.tier || ""}</span></div></div></td><td><div class="score-ring" style="--p:${m.score}"><span>${Math.round(m.score)}</span></div></td><td><div class="breakdown">${Object.entries(m.breakdown || {}).map(([k, v]) => `<div><span>${k}</span><div class="bar-track"><div class="bar-fill ${v < 40 ? "bad" : v < 70 ? "warn" : ""}" style="width:${v}%"></div></div><i>${v}</i></div>`).join("")}</div></td><td>${riskBadge(cr.fraudScore ?? 0)}</td><td>${fmtIDR(m.estCostIDR)}<div class="tiny muted">${m.deliverable}</div></td><td>${fmtK(m.estReach)}<div class="tiny muted">CPM ${fmtIDR(m.cpmIDR)}</div></td></tr>`; }).join("");
  el.innerHTML = `<div class="card card-p"><div class="row between"><div><h3 style="font-size:18px;font-weight:800">${esc(c.name)}</h3><div class="tiny muted">${esc(b?.name || "")} · ${esc(t("obj_" + c.objective) || c.objective)} · KPI ${esc(c.kpi?.type || "")} ${c.kpi?.target || ""} · ${c.startDate || ""} → ${c.endDate || ""}</div><div class="row mt-s">${(c.platforms || []).map((x) => `<span class="badge b-gray">${platIcon(x)} ${x}</span>`).join("")}${(c.niches || []).map((x) => `<span class="badge b-purple">${esc(x)}</span>`).join("")}${(c.tiers || []).map((x) => `<span class="badge b-teal">${x}</span>`).join("")}${(c.cities || []).map((x) => `<span class="badge b-blue">${esc(x)}</span>`).join("")}</div></div>
  <div class="row"><button class="btn btn-primary btn-sm" data-action="camp-match" data-id="${c.id}">${(c.matches || []).length ? t("rerun_match") : t("run_match")}</button>${(c.matches || []).length ? `<button class="btn btn-ghost btn-sm" data-action="camp-csv" data-id="${c.id}">⬇ ${t("export_csv")}</button><button class="btn btn-teal btn-sm" data-action="camp-invite" data-id="${c.id}">💬 ${t("invite_selected")}</button>` : ""}<button class="btn btn-ghost btn-sm" data-action="camp-ask" data-id="${c.id}">总 ${t("ask_agent")}</button></div></div>
  ${p ? `<div class="plan-box mt"><div><div class="pv">${p.selected.length}</div><div class="pl">${t("selected")} ${t("creators_n")}</div></div><div><div class="pv">${fmtIDR(p.totalCostIDR)}</div><div class="pl">${t("total_cost")}</div></div><div><div class="pv">${fmtK(p.expectedReach)}</div><div class="pl">${t("exp_reach")}</div></div><div><div class="pv">${p.utilisationPct != null ? p.utilisationPct + "%" : "—"}</div><div class="pl">${t("utilisation")} · ${t("avg_cpm")} ${p.avgCpmIDR ? fmtIDR(p.avgCpmIDR) : "—"}</div></div></div>` : ""}
  <div class="sub-h"><span class="cn">配</span>${t("matches")} (${(c.matches || []).length})</div>${rows ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>#</th><th>${t("creator")}</th><th>${t("score")}</th><th>${t("breakdown")}</th><th>${t("fraud")}</th><th>${t("cost")}</th><th>${t("reach")}</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty">${t("no_matches")}</div>`}</div>`;
}
function campaignWizard(brandId) {
  const chips = (name, opts, selv = []) => `<div class="fg"><label>${esc(name)}</label><div class="row" data-chips="${name}">${opts.map((o) => `<span class="topt${selv.includes(o) ? " on" : ""}" data-v="${esc(o)}">${esc(o)}</span>`).join("")}</div></div>`;
  const niches = [...new Set(S.creators.flatMap((c) => c.niche))].sort(), cities = [...new Set(S.creators.map((c) => c.city))].sort();
  const today = new Date().toISOString().slice(0, 10), end = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  openModal(t("cp_new"), `<div class="fg2">${field(t("cp_brand"), sel("cw-brand", S.brands.map((b) => [b.id, b.name]), brandId))}${field(t("cp_name"), `<input id="cw-name" placeholder="Nano beauty pilot Q4">`)}${field(t("objective"), sel("cw-obj", ["awareness", "sales", "launch", "ugc"].map((o) => [o, t("obj_" + o)]), "sales"))}${field(t("budget") + " (IDR)", `<input id="cw-budget" type="number" step="1000000" value="15000000">`)}${field(t("kpi_type"), sel("cw-kpi", [["reach", "reach"], ["clicks", "clicks"], ["sales", "sales"], ["cpa", "CPA"]], "reach"))}${field(t("kpi_target"), `<input id="cw-kpit" type="number" value="500000">`)}${field(t("start"), `<input id="cw-start" type="date" value="${today}">`)}${field(t("end"), `<input id="cw-end" type="date" value="${end}">`)}</div>
  ${chips("platforms", ["tiktok", "instagram", "youtube"], ["tiktok"])}${chips("niches", niches, ["beauty"])}${chips("tiers", ["nano", "micro", "mid", "macro", "mega"], ["nano", "micro"])}${chips("cities", cities, ["Jakarta"])}`, `<button class="btn btn-primary btn-sm" data-action="camp-create">${t("create")}</button>`);
  const nm = $("#cw-name"); const b = S.brands.find((x) => x.id === $("#cw-brand").value); if (b && !nm.value) nm.value = `${b.name.split(/\s|—/)[0]} ${t("obj_sales")} ${new Date().getFullYear()}`;
}
async function createCampaignFromWizard() {
  const pick = (name) => $$(`[data-chips="${name}"] .topt.on`).map((x) => x.dataset.v);
  const name = $("#cw-name").value.trim(); if (!name) { toast(t("required"), "err"); return; }
  const doc = { brandId: $("#cw-brand").value, name, objective: $("#cw-obj").value, budgetIDR: Number($("#cw-budget").value || 0), kpi: { type: $("#cw-kpi").value, target: Number($("#cw-kpit").value || 0) }, platforms: pick("platforms"), niches: pick("niches"), tiers: pick("tiers"), cities: pick("cities"), startDate: $("#cw-start").value, endDate: $("#cw-end").value };
  try { const c = await D.createCampaign(doc); S.campaigns.push(c); S.selCampaign = c; closeModal(); toast(t("campaign_created"), "ok"); goPage("campaigns"); await runMatch(c.id); } catch (e) { toast(e.message, "err"); }
}
async function runMatch(id) {
  const btn = $(`[data-action="camp-match"][data-id="${id}"]`); if (btn) { btn.disabled = true; btn.innerHTML = `<span class="typing"><i></i><i></i><i></i></span>`; }
  try { const c = await D.match(id, 25); const i = S.campaigns.findIndex((x) => x.id === id); if (i >= 0) S.campaigns[i] = c; S.selCampaign = c; toast(t("matching_done"), "ok"); renderCampaigns(); } catch (e) { toast(e.message, "err"); renderCampaigns(); }
}
function exportCsv(id) { const c = S.campaigns.find((x) => x.id === id); const head = "rank,handle,platform,tier,followers,er,fraud,score,cost_idr,reach,deliverable"; const rows = (c.matches || []).map((m, i) => { const cr = S.creators.find((x) => x.id === m.creatorId) || m.creator || {}; return [i + 1, cr.handle, cr.platform, cr.tier, cr.followers, cr.engagementRate, cr.fraudScore, m.score, m.estCostIDR, m.estReach, m.deliverable].join(","); }); download(`${c.name.replace(/\W+/g, "_")}_matches.csv`, [head, ...rows].join("\n")); }

/* ══════════════════════════ 10. OUTREACH ══════════════════════════ */
function fillOutreachSelects(brandId) {
  const bs = $("#o-brand"); bs.innerHTML = S.brands.map((b) => `<option value="${b.id}">${esc(b.name)} (${esc(b.country)})</option>`).join(""); if (brandId) bs.value = brandId;
  fillContactSelect(); $("#o-template").innerHTML = `<option value="">${esc(t("o_auto"))}</option>` + S.templates.filter((x) => !x.sequenceStep).map((x) => `<option value="${x.id}">${esc(x.name)} · ${x.lang} · ${x.channel}</option>`).join(""); fillVars();
}
function fillContactSelect() { const b = S.brands.find((x) => x.id === $("#o-brand").value); $("#o-contact").innerHTML = (b?.contacts || []).map((c) => `<option value="${c.id}">${esc(c.name)} — ${esc(c.role || "")}</option>`).join("") || `<option value="">—</option>`; }
function fillVars() {
  const b = S.brands.find((x) => x.id === $("#o-brand").value); const c = b?.contacts?.find((x) => x.id === $("#o-contact").value) || b?.contacts?.[0]; const tpl = S.templates.find((x) => x.id === $("#o-template").value) || pickTemplate(b, c); const v = deriveVars(b, c);
  $("#o-vars").innerHTML = (tpl?.vars || []).map((k) => field(k, `<input data-var="${k}" value="${esc(v[k] ?? "")}">`)).join("");
}
async function generateOutreach() {
  const brandId = $("#o-brand").value; if (!brandId) return; const vars = {}; $$("#o-vars [data-var]").forEach((i) => (vars[i.dataset.var] = i.value));
  const pv = $("#o-preview"); pv.innerHTML = `<div class="skel" style="min-height:120px"></div>`;
  try { const r = await D.generateOutreach({ brandId, contactId: $("#o-contact").value || undefined, templateId: $("#o-template").value || undefined, vars, personalize: $("#o-personalize").checked }); S.outreachDraft = r; pv.dataset.lang = r.lang; pv.innerHTML = `<div class="subj">${esc(r.subject)}</div><div class="body">${esc(r.body)}</div>`; $("#o-meta").innerHTML = `${r.templateId} · ${r.lang} · ${r.channel} · ${r.wordCount || r.body.split(/\s+/).length} ${t("words")}${r.personalized ? ` · <span class="badge b-teal">✨ ${t("personalized")}</span>` : ""}`; }
  catch (e) { pv.innerHTML = ""; toast(e.message, "err"); }
}
async function saveOutreachDraft(send) {
  const d = S.outreachDraft; if (!d) { toast(t("gen_first"), "warn"); return null; }
  try { const o = await D.saveOutreach({ brandId: d.brandId, contactId: d.contactId, templateId: d.templateId, lang: d.lang, channel: d.channel, subject: d.subject, body: d.body }); if (!S.outreach.find((x) => x.id === o.id)) S.outreach.unshift(o); if (!send) { toast(t("draft_saved"), "ok"); renderSequence(); return o; } return sendOutreach(o.id); } catch (e) { toast(e.message, "err"); return null; }
}
async function sendOutreach(id) { try { const o = await D.sendOutreach(id); const i = S.outreach.findIndex((x) => x.id === id); if (i >= 0) S.outreach[i] = o; else S.outreach.unshift(o); toast(o.status === "sent" ? t("sent_n8n") : o.status === "failed" ? t("send_failed") : t("scheduled_local"), o.status === "failed" ? "err" : "ok"); renderSequence(); return o; } catch (e) { toast(e.message, "err"); } }
function renderTemplates() { const lg = $("#t-lang").value, ch = $("#t-channel").value; $("#tpl-grid").innerHTML = S.templates.filter((x) => (!lg || x.lang === lg) && (!ch || x.channel === ch)).map((x) => `<div class="tpl-card"><div class="row between"><span class="tn">${esc(x.name)}</span><span><span class="badge b-gray">${x.lang}</span> <span class="badge b-purple">${x.channel}</span></span></div>${x.bestFor ? `<div class="tiny muted"><b>${t("best_for")}:</b> ${esc(x.bestFor)}</div>` : ""}<div class="tb" dir="${x.lang === "ar" ? "rtl" : "ltr"}">${esc(x.body)}</div><div class="tf"><span class="tiny muted">${x.sequenceStep ? `${t("step")} ${x.sequenceStep} · +${x.delayDays}d` : (x.vars || []).map((v) => "{{" + v + "}}").join(" ")}</span>${!x.sequenceStep && x.id !== "creator_invite_id" ? `<button class="btn btn-ghost btn-xs" data-action="tpl-use" data-id="${x.id}">${t("use_tpl")}</button>` : ""}</div></div>`).join(""); }
async function renderSequence() { const r = await D.outreach().catch(() => ({ items: S.outreach })); S.outreach = r.items; const st = $("#s-status").value; const items = S.outreach.filter((o) => !st || o.status === st); $("#seq-list").innerHTML = items.length ? items.map((o) => { const b = S.brands.find((x) => x.id === o.brandId); const cls = { draft: "b-gray", scheduled: "b-amber", sent: "b-blue", replied: "b-green", failed: "b-red", bounced: "b-red" }[o.status] || "b-gray"; return `<div class="seq-item"><div><div class="ss">${esc(b?.name || o.brandId)} — ${esc(o.subject || "")}</div><div class="sm">${fmtDT(o.createdAt)} · ${esc(o.templateId || "")} · ${o.lang} · ${o.channel} · ${t("step")} ${o.sequenceStep || 0} <span class="badge ${cls}">${esc(o.status)}</span>${o.n8n?.skipped ? ` <span class="tiny muted">(n8n off)</span>` : ""}</div></div><div class="sa"><button class="btn btn-ghost btn-xs" data-action="seq-view" data-id="${o.id}">${t("view")}</button>${o.status === "draft" ? `<button class="btn btn-teal btn-xs" data-action="seq-send" data-id="${o.id}">${t("send")} → n8n</button>` : ""}</div></div>`; }).join("") : `<div class="empty">${t("no_outreach")}</div>`; }
function renderRules() { $("#rules-list").innerHTML = S.rules.map((r) => `<div>${esc(r)}</div>`).join(""); }

/* ══════════════════════════ 11. AGENTS CONSOLE ══════════════════════════ */
function renderTeam() {
  const groups = ["core", "ops", "intel", "spec", "dev"]; const orch = S.agents.find((a) => a.id === "orchestrator");
  $("#team").innerHTML = (orch ? `<div class="team-group" style="--gc:#7C5CF8"><div class="tga"><button class="agent-tile orch${S.chatAgent === "orchestrator" ? " on" : ""}" data-agent="orchestrator"><span class="cn">总</span><div><div class="an">${esc(L3(orch.name))}</div><div class="ad">${esc(L3(orch.description))}</div></div></button></div></div>` : "") +
    groups.map((g) => { const ags = S.agents.filter((a) => a.group === g && a.id !== "orchestrator"); return `<div class="team-group" style="--gc:${GROUP_COLORS[g]}"><div class="tgh">${esc(L3(GROUP_NAMES[g]))}<span class="n">${ags.length}</span></div><div class="tga">${ags.map((a) => `<button class="agent-tile${S.chatAgent === a.id ? " on" : ""}" data-agent="${a.id}" title="${esc(L3(a.description))}"><span class="cn">${a.glyph}</span><div><div class="an">${esc(L3(a.name))}</div><div class="ad">${esc(L3(a.description))}</div></div></button>`).join("")}</div></div>`; }).join("");
  $("#a-mode").textContent = S.brain === "claude" ? t("a_mode_claude") : t("a_mode_offline");
  $("#quick-chips").innerHTML = ["q1", "q2", "q3", "q4", "q5", "q6"].map((k) => `<button class="chip" data-quick="${k}">${esc(t(k))}</button>`).join("");
  const a = S.agents.find((x) => x.id === S.chatAgent) || orch; $("#chat-glyph").textContent = a?.glyph || "总"; $("#chat-who").textContent = L3(a?.name); $("#chat-ctx").textContent = Object.keys(S.ctx).length ? Object.entries(S.ctx).map(([k, v]) => `${k}: ${v}`).join(" · ") : "";
}
function renderChat() {
  const log = $("#chat-log"); if (!S.chat.length) S.chat.push({ role: "bot", text: t("a_welcome") });
  log.innerHTML = S.chat.map((m) => m.role === "user" ? `<div class="msg user">${esc(m.text)}</div>` : m.pending ? `<div class="msg bot"><span class="typing"><i></i><i></i><i></i></span> <span class="tiny muted">${t("thinking")}</span></div>` : botMsg(m)).join("");
  log.scrollTop = log.scrollHeight;
}
function md(s = "") { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|\s)_([^_\n]+?)_(?=\s|$)/gm, "$1<i>$2</i>"); }
function botMsg(m) {
  const r = m.run; if (!r) return `<div class="msg bot"><div class="out">${md(m.text)}</div></div>`;
  const ag = (id) => S.agents.find((a) => a.id === id) || { glyph: "•", name: { en: id }, color: "#7C5CF8" };
  const steps = (r.steps || []).map((s) => { const a = ag(s.agent); const out = s.output && typeof s.output === "object" ? summarizeOut(s.tool, s.output) : String(s.output || ""); return `<div class="step" style="--sc:${a.color || GROUP_COLORS[a.group] || "#7C5CF8"}"><div class="sh"><span class="ag"><span class="cn">${a.glyph}</span>${esc(L3(a.name))}</span><span class="tool">${esc(s.tool)}</span>${s.tool === "delegate" ? `<span class="badge b-purple">${t("delegated")}: ${esc(s.input?.agent || "")}</span>` : ""}<span class="ms">${s.ms || 0}ms</span></div>${out ? `<div class="so">${esc(out)}</div>` : ""}</div>`; }).join("");
  return `<div class="msg bot">${r.plan?.length ? `<ol class="plan">${r.plan.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>` : ""}${steps ? `<div class="timeline">${steps}</div>` : ""}<div class="out">${md(r.output)}</div><div class="meta"><span class="badge ${r.mode === "claude" ? "b-teal" : "b-amber"}">${r.mode === "claude" ? "Claude" + (r.model ? " · " + r.model : "") : "offline"}</span><span>${(r.steps || []).length} ${t("tools_used")}</span>${r.usage?.input_tokens ? `<span>${r.usage.input_tokens + r.usage.output_tokens} tokens</span>` : ""}<span>${r.ms || 0}ms</span><span class="mono">${r.id}</span></div></div>`;
}
function summarizeOut(tool, o) {
  if (o.error) return "⚠ " + o.error;
  if (tool === "search_creators") return `${o.total} ${t("creators_n")}: ${(o.items || []).slice(0, 6).map((c) => c.handle).join(", ")}`;
  if (tool === "match_campaign") return `${(o.matches || []).length} ${t("matches").toLowerCase()} · ${t("plan")}: ${o.plan?.selected?.length || 0} · ${fmtIDR(o.plan?.totalCostIDR)} · ${fmtK(o.plan?.expectedReach)}`;
  if (tool === "fraud_audit") return (o.results || []).map((r) => `${r.handle || r.creatorId}: ${r.fraudScore}`).join(" · ");
  if (tool === "delegate") return String(o.answer || "").slice(0, 300);
  if (tool === "generate_outreach") return `${o.templateId} · ${o.lang} → ${o.subject}`;
  if (tool === "save_outreach" || tool === "generate_social_post") return `${o.id} · ${o.status}`;
  if (tool === "list_brands") return `${o.total}: ${(o.items || []).slice(0, 6).map((b) => b.name).join(", ")}`;
  if (tool === "trigger_n8n") return o.skipped ? "n8n off · " + (o.error || "") : `n8n ${o.ok ? "ok" : "failed"} ${o.status || ""}`;
  return JSON.stringify(o).slice(0, 200);
}
async function sendChat(text) {
  text = (text || "").trim(); if (!text) return;
  S.chat.push({ role: "user", text }); S.chat.push({ role: "bot", pending: true }); renderChat(); $("#chat-send").disabled = true;
  try { const run = await D.runAgent(S.chatAgent, text, { ...S.ctx, lang: LANG }); S.chat.pop(); S.chat.push({ role: "bot", text: run.output, run }); if (online()) await D.runs(); }
  catch (e) { S.chat.pop(); S.chat.push({ role: "bot", text: "⚠️ " + e.message }); toast(e.message, "err"); }
  $("#chat-send").disabled = false; renderChat(); renderRuns(); if (online()) { D.outreach().catch(() => {}); D.posts().catch(() => {}); }
}
async function renderRuns() { const r = await D.runs().catch(() => ({ items: S.runs })); const items = r.items; $("#runs").innerHTML = items.length ? items.map((x) => { const a = S.agents.find((y) => y.id === x.agent) || { glyph: "•" }; return `<button class="run-item" data-run="${x.id}"><span class="cn" style="color:var(--purple)">${a.glyph}</span><span class="ri">${esc(x.input)}</span><span class="badge ${x.status === "done" ? "b-green" : x.status === "error" ? "b-red" : "b-amber"}">${x.status}</span><span class="rt">${fmtDT(x.createdAt)}</span></button>`; }).join("") : `<div class="empty">${t("no_runs")}</div>`; }
function openRun(id) { const r = S.runs.find((x) => x.id === id); if (!r) return; S.chat.push({ role: "user", text: r.input }); S.chat.push({ role: "bot", text: r.output, run: r }); renderChat(); }
function askAgent(message, ctx = {}) { S.ctx = ctx; S.chatAgent = "orchestrator"; goPage("agents"); renderTeam(); if (message) sendChat(message); }

/* ══════════════════════════ 12. SOCIAL ══════════════════════════ */
async function renderSocial() {
  const r = await D.posts().catch((e) => (toast(e.message, "err"), { items: S.posts })); S.posts = r.items; const st = $("#sp-filter").value; const items = S.posts.filter((p) => !st || p.status === st).sort((a, b) => (a.scheduledAt || a.createdAt || "") < (b.scheduledAt || b.createdAt || "") ? 1 : -1);
  const cls = { draft: "b-gray", scheduled: "b-amber", publishing: "b-blue", published: "b-green", failed: "b-red" };
  $("#post-list").innerHTML = items.length ? items.map((p) => `<div class="post-card"><div class="row between"><span>${platIcon(p.platform)} <b>${p.platform}</b> · <span class="tiny muted">${esc(p.account || "")}</span></span><span class="badge ${cls[p.status] || "b-gray"}">${esc(p.status)}</span></div><div class="pc">${esc(p.caption)}</div><div class="ph">${(p.hashtags || []).map((h) => `<span>${esc(h)}</span>`).join("")}</div><div class="pf"><span>🕒 ${fmtDT(p.scheduledAt)} · ${esc(p.lang || "")} · ${esc(p.agent || "")}${p.url ? ` · <a href="${esc(p.url)}" target="_blank" rel="noopener">link</a>` : ""}</span><span class="row">${p.status !== "published" ? `<button class="btn btn-teal btn-xs" data-action="post-publish" data-id="${p.id}">${t("publish")}</button>` : ""}<button class="btn btn-ghost btn-xs" data-action="post-edit" data-id="${p.id}">${t("edit")}</button></span></div></div>`).join("") : `<div class="empty">${t("no_posts")}</div>`;
  renderCalendar();
}
function renderCalendar() {
  const days = []; const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - start.getDay());
  for (let i = 0; i < 28; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const key = d.toISOString().slice(0, 10); const ev = S.posts.filter((p) => (p.scheduledAt || "").slice(0, 10) === key); days.push(`<div class="day${key === new Date().toISOString().slice(0, 10) ? " today" : ""}"><div class="dn">${d.getDate()}/${d.getMonth() + 1}</div>${ev.map((p) => `<div class="ev" title="${esc(p.caption)}">${platIcon(p.platform)} ${esc(p.caption.slice(0, 22))}</div>`).join("")}</div>`); }
  $("#post-cal").innerHTML = days.join("");
}
async function generatePost() {
  const topic = $("#sp-topic").value.trim(); if (!topic) { toast(t("topic_required"), "warn"); return; }
  const btn = $('[data-action="sp-generate"]'); btn.disabled = true;
  try { const r = await D.generatePost({ topic, platform: $("#sp-platform").value, lang: $("#sp-lang").value, tone: $("#sp-tone").value }); $("#sp-caption").value = r.caption; $("#sp-hashtags").value = (r.hashtags || []).join(" "); $("#sp-best").value = r.bestTime || ""; } catch (e) { toast(e.message, "err"); }
  btn.disabled = false;
}
async function savePost(schedule) {
  const caption = $("#sp-caption").value.trim(); if (!caption) { toast(t("caption_required"), "warn"); return; }
  const when = $("#sp-when").value; if (schedule && !when) { toast(t("when_required"), "warn"); return; }
  try { const p = await D.savePost({ platform: $("#sp-platform").value, lang: $("#sp-lang").value, caption, hashtags: $("#sp-hashtags").value.split(/\s+/).filter(Boolean), scheduledAt: when ? new Date(when).toISOString() : null, agent: "human" }); if (!S.posts.find((x) => x.id === p.id)) S.posts.push(p); toast(schedule ? t("post_scheduled") : t("post_saved"), "ok"); $("#sp-caption").value = ""; $("#sp-topic").value = ""; renderSocial(); } catch (e) { toast(e.message, "err"); }
}
function editPost(id) { const p = S.posts.find((x) => x.id === id); if (!p) return; $("#sp-platform").value = p.platform; $("#sp-lang").value = p.lang || "id"; $("#sp-caption").value = p.caption; $("#sp-hashtags").value = (p.hashtags || []).join(" "); if (p.scheduledAt) $("#sp-when").value = new Date(p.scheduledAt).toISOString().slice(0, 16); window.scrollTo({ top: 0, behavior: "smooth" }); }

/* ══════════════════════════ 13. LEGAL ══════════════════════════ */
function fillLegalSelects() {
  $("#lg-campaign").innerHTML = S.campaigns.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("") || `<option value="">—</option>`;
  const cp = S.campaigns.find((c) => c.id === $("#lg-campaign").value); const pool = cp?.matches?.length ? cp.matches.map((m) => S.creators.find((x) => x.id === m.creatorId) || m.creator).filter(Boolean) : S.creators.slice(0, 40);
  $("#lg-creator").innerHTML = pool.map((c) => `<option value="${c.id}">${esc(c.handle)} · ${fmtK(c.followers)}</option>`).join(""); const c0 = pool[0]; if (c0 && !$("#lg-fee").value) $("#lg-fee").value = c0.priceIDR?.video || 0;
  renderContractList();
}
function generateContract(save = true) {
  const cp = S.campaigns.find((c) => c.id === $("#lg-campaign").value); const cr = S.creators.find((c) => c.id === $("#lg-creator").value); if (!cp || !cr) { toast(t("need_camp_creator"), "warn"); return null; }
  const brand = S.brands.find((b) => b.id === cp.brandId) || {}; const fee = Number($("#lg-fee").value || cr.priceIDR?.video || 0), cps = Number($("#lg-cps").value || 0), deliv = $("#lg-deliv").value; const platformFee = fee * 0.15, ppn = platformFee * 0.11, pph = fee * 0.025; const no = "RB-" + new Date().getFullYear() + "-" + String(S.contracts.length + 1).padStart(4, "0");
  const html = `<div class="contract-hd"><div style="font-size:20px;font-weight:900">رابط<span style="color:var(--purple)">●</span> Rabith</div><div style="font-weight:800;margin-top:6px">PERJANJIAN KERJA SAMA KONTEN KREATOR · Influencer Agreement</div><div class="tiny muted">No. ${no} · ${new Date().toLocaleDateString("id-ID")} · KUHPerdata Pasal 1320 & 1338 · UU ITE No.11/2008 jo. UU 19/2016 · PP 71/2019 · UU PDP 27/2022</div></div>
  <div class="c-row"><span>Pihak Pertama (Brand)</span><b>${esc(brand.name || "—")} · ${esc(brand.contacts?.[0]?.name || "")}</b></div><div class="c-row"><span>Pihak Kedua (Kreator)</span><b>${esc(cr.name)} (${esc(cr.handle)}) · ${cr.platform}</b></div><div class="c-row"><span>Kampanye</span><b>${esc(cp.name)} · ${cp.startDate || ""} → ${cp.endDate || ""}</b></div><div class="c-row"><span>Deliverables</span><b>${esc(deliv)}</b></div>
  <div class="c-row"><span>Fee kreator</span><b>${fmtIDR(fee)}</b></div><div class="c-row"><span>Bonus performa (CPS per unit)</span><b>${fmtIDR(cps)}</b></div><div class="c-row"><span>Platform fee 15% (ditanggung brand)</span><b>${fmtIDR(platformFee)}</b></div><div class="c-row"><span>PPN 11% atas platform fee</span><b>${fmtIDR(ppn)}</b></div><div class="c-row"><span>PPh 21 (2,5%, NPWP) dipotong dari fee</span><b>− ${fmtIDR(pph)}</b></div><div class="c-row total"><span>Diterima kreator (net)</span><b>${fmtIDR(fee - pph)}</b></div><div class="c-row total"><span>Total dibayar brand ke escrow</span><b>${fmtIDR(fee + platformFee + ppn)}</b></div>
  <div class="clause"><b>1. Ruang lingkup.</b> Kreator memproduksi dan menayangkan ${esc(deliv)} sesuai brief kampanye, dengan pencantuman #iklan / #ad sesuai pedoman etika periklanan.<br><b>2. Hak pakai.</b> Brand memperoleh lisensi non-eksklusif 90 hari untuk penggunaan ulang konten di kanal resmi; perpanjangan disepakati tertulis.<br><b>3. Eksklusivitas.</b> Kreator tidak mempromosikan produk kompetitor langsung dalam kategori yang sama selama masa kampanye + 14 hari.<br><b>4. Pembayaran &amp; escrow.</b> Brand menyetor total ke escrow Rabith saat penandatanganan; 50% dicairkan saat kontrak aktif, 50% setelah konten disetujui QC. PPh dipotong dan disetorkan oleh Rabith.<br><b>5. Revisi &amp; QC.</b> Maksimal 2 revisi minor; QC Rabith memeriksa kesesuaian brief, brand safety, dan disclosure.<br><b>6. Data pribadi.</b> Para pihak mematuhi UU PDP 27/2022; data hanya digunakan untuk pelaksanaan perjanjian.<br><b>7. Pengakhiran &amp; sengketa.</b> Wanprestasi diselesaikan melalui musyawarah, mediasi, lalu BANI. Hukum Republik Indonesia berlaku.<br><b>8. Tanda tangan elektronik.</b> Perjanjian ditandatangani melalui PrivyID (tersertifikasi Kominfo) dan berkekuatan hukum sesuai UU ITE.<br><i>Dokumen ini dibuat oleh agen Legal 约 Rabith dan bukan pengganti nasihat pengacara berlisensi.</i></div>
  <div class="c-row" style="margin-top:14px;border:none"><span>Pihak Pertama<br><br>________________</span><span>Rabith (Escrow &amp; Platform)<br><br>________________</span><span>Pihak Kedua<br><br>________________</span></div>`;
  $("#contract-out").innerHTML = html;
  if (save) { S.contracts.unshift({ id: uid("ct"), no, campaignId: cp.id, creatorId: cr.id, brand: brand.name, creator: cr.handle, fee, deliv, createdAt: new Date().toISOString(), status: "draft" }); lsSaveContracts(); renderContractList(); toast(t("contract_saved"), "ok"); }
  return { no, html };
}
function lsSaveContracts() { try { const d = lsLoad(); d.contracts = S.contracts; localStorage.setItem(LS, JSON.stringify(d)); } catch { /* ignore */ } }
function renderContractList() { $("#contract-list").innerHTML = S.contracts.length ? S.contracts.map((c) => `<div class="seq-item"><div><div class="ss">${esc(c.no)} — ${esc(c.brand)} × ${esc(c.creator)}</div><div class="sm">${fmtDT(c.createdAt)} · ${esc(c.deliv)} · ${fmtIDR(c.fee)} <span class="badge ${c.status === "sent" ? "b-blue" : "b-gray"}">${esc(c.status)}</span></div></div></div>`).join("") : `<div class="empty">${t("no_contracts")}</div>`; }

/* ══════════════════════════ 14. ROUTER / LANG / MODE ══════════════════════════ */
const PAGES = { home: renderHome, discover: () => renderDiscover(true), brands: renderBrands, campaigns: renderCampaigns, outreach: () => { fillOutreachSelects(); renderTemplates(); renderSequence(); renderRules(); }, agents: () => { renderTeam(); renderChat(); renderRuns(); }, social: renderSocial, legal: fillLegalSelects, pricing: () => {} };
function goPage(id) {
  $$(".page").forEach((p) => p.classList.toggle("active", p.id === "page-" + id)); $$(".nav-tab").forEach((b) => b.classList.toggle("active", b.dataset.page === id));
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id); window.scrollTo({ top: 0 }); (PAGES[id] || (() => {}))();
}
function setLang(l) {
  LANG = l; const doc = document.documentElement; doc.lang = l; doc.dir = l === "ar" ? "rtl" : "ltr";
  $$(".lang-btn").forEach((b) => b.classList.toggle("active", b.dataset.lang === l));
  $$("[data-k]").forEach((el) => { const k = el.dataset.k; if (T[l][k] !== undefined) el.textContent = T[l][k]; });
  $$("[data-ph-k]").forEach((el) => { const k = el.dataset.phK; if (T[l][k]) el.placeholder = T[l][k]; });
  $$(".price-card.featured").forEach((c) => c.setAttribute("data-label", t("most_popular")));
  try { localStorage.setItem("rabith.lang", l); } catch { /* ignore */ }
  setModeChip(); const cur = (location.hash || "#home").slice(1); if (PAGES[cur]) PAGES[cur]();
}
function setModeChip() { const el = $("#mode-chip"); el.className = "mode-chip " + (S.mode === "checking" ? "checking" : S.mode === "online" ? "online" : "offline"); el.querySelector(".lbl").textContent = S.mode === "checking" ? t("mode_checking") : S.mode === "online" ? (S.brain === "claude" ? t("mode_online") : t("mode_online_off")) : t("mode_offline"); el.title = S.mode === "online" ? API : "localStorage"; }
async function boot() {
  try { const h = await Promise.race([D.health(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 2500))]); if (!h.ok) throw new Error("bad health"); S.mode = "online"; S.brain = h.mode; }
  catch { S.mode = "offline"; S.brain = "offline"; }
  if (online()) {
    try { const [cr, br, ag, tp, cp] = await Promise.all([api("/creators?limit=200"), D.brands(), D.agents(), D.templates(), D.campaigns()]); S.creators = cr.items; S.brands = br.items; S.campaigns = cp.items; await Promise.all([D.outreach(), D.posts(), D.runs()]).catch(() => {}); const saved = lsLoad(); S.contracts = saved.contracts || []; }
    catch (e) { toast(e.message, "err"); S.mode = "offline"; loadSeedOffline(); }
  } else loadSeedOffline();
  setModeChip(); fillDiscFilters();
  const hash = (location.hash || "#home").slice(1); goPage(PAGES[hash] ? hash : "home");
}

/* ══════════════════════════ 15. EVENTS ══════════════════════════ */
document.addEventListener("click", async (e) => {
  const pg = e.target.closest("[data-page]"); if (pg) { goPage(pg.dataset.page); return; }
  const lb = e.target.closest(".lang-btn"); if (lb) { setLang(lb.dataset.lang); return; }
  const pl = e.target.closest("[data-plan]"); if (pl) { $("#plans-brand").hidden = pl.dataset.plan !== "brand"; $("#plans-creator").hidden = pl.dataset.plan !== "creator"; $$("[data-plan]").forEach((b) => { b.className = "btn btn-sm " + (b === pl ? "btn-primary" : "btn-ghost"); }); return; }
  const it = e.target.closest("[data-itab]"); if (it) { const wrap = it.closest(".itabs"); $$(".itab", wrap).forEach((x) => x.classList.toggle("on", x === it)); let sib = wrap.nextElementSibling; while (sib && sib.classList.contains("ipanel")) { sib.classList.toggle("on", sib.id === it.dataset.itab); sib = sib.nextElementSibling; } return; }
  const topt = e.target.closest(".topt"); if (topt) { topt.classList.toggle("on"); return; }
  const cc = e.target.closest("[data-creator]"); if (cc) { openCreator(cc.dataset.creator); return; }
  const kc = e.target.closest(".kcard"); if (kc && !e.target.closest("button")) { openBrand(kc.dataset.brand); return; }
  const cp = e.target.closest("[data-camp]"); if (cp) { S.selCampaign = S.campaigns.find((c) => c.id === cp.dataset.camp); renderCampaigns(); return; }
  const ag = e.target.closest("[data-agent]"); if (ag) { S.chatAgent = ag.dataset.agent; renderTeam(); if (S.chatAgent !== "orchestrator") { const a = S.agents.find((x) => x.id === S.chatAgent); S.chat.push({ role: "bot", text: `${t("chat_with_agent")} ${a.glyph} ${L3(a.name)} — ${L3(a.description)}` }); renderChat(); } return; }
  const qc = e.target.closest("[data-quick]"); if (qc) { sendChat(t(qc.dataset.quick)); return; }
  const rn = e.target.closest("[data-run]"); if (rn) { openRun(rn.dataset.run); return; }
  const bd = e.target.closest("#backdrop"); if (bd) { closeDrawer(); closeModal(); return; }
  const a = e.target.closest("[data-action]"); if (!a) return; const act = a.dataset.action, id = a.dataset.id;
  switch (act) {
    case "drawer-close": closeDrawer(); break; case "modal-close": closeModal(); break;
    case "copy-text": copyText(a.dataset.text); break;
    case "disc-reset": ["#f-q", "#f-platform", "#f-niche", "#f-tier", "#f-city", "#f-sort"].forEach((s) => ($(s).value = s === "#f-sort" ? "score" : "")); $("#f-maxfraud").value = 100; $("#f-maxfraud-v").textContent = 100; $("#f-mineng").value = 0; $("#f-mineng-v").textContent = 0; renderDiscover(true); break;
    case "disc-more": S.disc.page++; renderDiscover(false); break;
    case "creator-audit": auditCreator(id); break; case "creator-invite": inviteCreator(id); break; case "creator-add": addCreatorToCampaign(id); break;
    case "creator-add-confirm": { const c = S.campaigns.find((x) => x.id === $("#m-camp").value); if (c) { const cr = S.creators.find((x) => x.id === id); const m = scoreCreator(cr, c, S.brands.find((b) => b.id === c.brandId)); c.matches = [...(c.matches || []).filter((x) => x.creatorId !== id), m].sort((x, y) => y.score - x.score); c.plan = c.plan || { selected: [], totalCostIDR: 0, expectedReach: 0 }; if (!c.plan.selected.includes(id)) { c.plan.selected.push(id); c.plan.totalCostIDR += m.estCostIDR; c.plan.expectedReach += m.estReach; } await D.patchCampaign(c.id, { matches: c.matches, plan: c.plan }).catch((e) => toast(e.message, "err")); S.selCampaign = c; closeModal(); closeDrawer(); toast("✓ " + t("add_to_camp"), "ok"); goPage("campaigns"); } break; }
    case "brand-new": openModal(t("b_new"), brandForm(), `<button class="btn btn-primary btn-sm" data-action="brand-save">${t("save")}</button>`); break;
    case "brand-edit": openModal(t("edit"), brandForm(S.brands.find((x) => x.id === id)), `<button class="btn btn-primary btn-sm" data-action="brand-save" data-id="${id}">${t("save")}</button>`); break;
    case "brand-save": saveBrandForm(id); break;
    case "brand-move": { const b = S.brands.find((x) => x.id === id); const i = PIPE.indexOf(b.pipeline || "lead") + Number(a.dataset.dir); if (PIPE[i]) moveBrand(id, PIPE[i]); break; }
    case "brand-outreach": closeDrawer(); goPage("outreach"); fillOutreachSelects(id); generateOutreach(); break;
    case "brand-campaign": closeDrawer(); campaignWizard(id); break;
    case "brand-ask": { const b = S.brands.find((x) => x.id === id); closeDrawer(); askAgent(LANG === "ar" ? `أهّل ${b.name} كعميل وحضّر أول رسالة تواصل` : LANG === "id" ? `Kualifikasi ${b.name} sebagai lead dan buat pesan outreach pertama` : `Qualify ${b.name} as a lead and draft the first outreach`, { brandId: id }); break; }
    case "camp-new": campaignWizard(); break; case "camp-create": createCampaignFromWizard(); break; case "camp-match": runMatch(id); break; case "camp-csv": exportCsv(id); break;
    case "camp-invite": { const c = S.campaigns.find((x) => x.id === id); const first = (c.plan?.selected || [])[0]; if (first) inviteCreator(first); else toast(t("no_matches"), "warn"); break; }
    case "camp-ask": { const c = S.campaigns.find((x) => x.id === id); askAgent(LANG === "ar" ? `خطّط حملة «${c.name}» وقسّم الميزانية واقترح أفضل المؤثرين` : LANG === "id" ? `Rencanakan kampanye "${c.name}", bagi anggaran, sarankan kreator terbaik` : `Plan the campaign "${c.name}", split the budget and suggest the best creators`, { campaignId: id, brandId: c.brandId }); break; }
    case "o-generate": generateOutreach(); break; case "o-save": saveOutreachDraft(false); break; case "o-send": saveOutreachDraft(true); break;
    case "o-copy": if (S.outreachDraft) copyText(S.outreachDraft.subject + "\n\n" + S.outreachDraft.body); break;
    case "tpl-use": $("#o-template").value = id; fillVars(); $$(".itab")[0].click(); generateOutreach(); break;
    case "seq-view": { const o = S.outreach.find((x) => x.id === id); openModal(o.subject || o.id, `<div class="preview" data-lang="${o.lang}"><div class="subj">${esc(o.subject)}</div><div class="body">${esc(o.body)}</div></div>`, `<button class="btn btn-ghost btn-sm" data-action="copy-text" data-text="${esc(o.subject + "\n\n" + o.body)}">${t("copy")}</button>${o.status === "draft" ? `<button class="btn btn-teal btn-sm" data-action="seq-send" data-id="${o.id}">${t("send")} → n8n</button>` : ""}`); break; }
    case "seq-send": await sendOutreach(id); closeModal(); break;
    case "chat-clear": S.chat = []; S.ctx = {}; renderTeam(); renderChat(); break;
    case "sp-generate": generatePost(); break; case "sp-save": savePost(false); break; case "sp-schedule": savePost(true); break;
    case "post-publish": try { const p = await D.publishPost(id); const i = S.posts.findIndex((x) => x.id === id); if (i >= 0) S.posts[i] = p; toast(p.status === "publishing" ? t("sent_n8n") : p.status === "failed" ? t("send_failed") : t("scheduled_local"), p.status === "failed" ? "err" : "ok"); renderSocial(); } catch (err) { toast(err.message, "err"); } break;
    case "post-edit": editPost(id); break;
    case "lg-generate": generateContract(true); break;
    case "lg-copy": copyText($("#contract-out").innerText); break;
    case "lg-print": { const w = window.open("", "_blank"); w.document.write(`<html dir="ltr"><head><title>Rabith Contract</title><style>body{font-family:Inter,Arial,sans-serif;padding:32px;color:#111}.c-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}.clause{font-size:12px;line-height:1.7;margin-top:12px}.contract-hd{text-align:center;margin-bottom:16px}.tiny{font-size:11px;color:#666}</style></head><body>${$("#contract-out").innerHTML}</body></html>`); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); break; }
    case "lg-sign": { const c = S.contracts[0]; if (!c) { toast(t("need_camp_creator"), "warn"); break; } c.status = "sent"; lsSaveContracts(); renderContractList(); if (online()) api("/agent/run", { method: "POST", body: { agent: "legal", message: `Contract ${c.no} sent to PrivyID for signature (brand ${c.brand}, creator ${c.creator}).`, context: { campaignId: c.campaignId, lang: LANG } } }).catch(() => {}); toast(t("sign_sent"), "ok"); break; }
  }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeDrawer(); closeModal(); } });
$("#chat-form").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#chat-input").value; $("#chat-input").value = ""; sendChat(v); });
$("#chat-input").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#chat-form").requestSubmit(); } });
const rerun = debounce(() => renderDiscover(true), 220);
["#f-q"].forEach((s) => $(s).addEventListener("input", rerun)); ["#f-platform", "#f-niche", "#f-tier", "#f-city", "#f-sort"].forEach((s) => $(s).addEventListener("change", () => renderDiscover(true)));
$("#f-maxfraud").addEventListener("input", (e) => { $("#f-maxfraud-v").textContent = e.target.value; rerun(); }); $("#f-mineng").addEventListener("input", (e) => { $("#f-mineng-v").textContent = e.target.value; rerun(); });
$("#b-q").addEventListener("input", debounce(renderBrands, 200));
$("#o-brand").addEventListener("change", () => { fillContactSelect(); fillVars(); }); $("#o-contact").addEventListener("change", fillVars); $("#o-template").addEventListener("change", fillVars);
$("#t-lang").addEventListener("change", renderTemplates); $("#t-channel").addEventListener("change", renderTemplates); $("#s-status").addEventListener("change", renderSequence); $("#sp-filter").addEventListener("change", renderSocial);
$("#lg-campaign").addEventListener("change", fillLegalSelects); $("#lg-creator").addEventListener("change", () => { const c = S.creators.find((x) => x.id === $("#lg-creator").value); if (c) $("#lg-fee").value = c.priceIDR?.video || 0; });
$("#sp-platform").addEventListener("change", () => { $("#sp-best").value = { instagram: "19:00 WIB", tiktok: "20:00 WIB", linkedin: "08:30 WIB", x: "12:00 WIB" }[$("#sp-platform").value]; });
/* kanban drag & drop */
document.addEventListener("dragstart", (e) => { const k = e.target.closest?.(".kcard"); if (k) { e.dataTransfer.setData("text/plain", k.dataset.brand); k.classList.add("dragging"); } });
document.addEventListener("dragend", (e) => e.target.closest?.(".kcard")?.classList.remove("dragging"));
document.addEventListener("dragover", (e) => { const col = e.target.closest?.(".kcol"); if (col) { e.preventDefault(); col.classList.add("over"); } });
document.addEventListener("dragleave", (e) => e.target.closest?.(".kcol")?.classList.remove("over"));
document.addEventListener("drop", (e) => { const col = e.target.closest?.(".kcol"); if (!col) return; e.preventDefault(); col.classList.remove("over"); const id = e.dataTransfer.getData("text/plain"); if (id) moveBrand(id, col.dataset.col); });
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (PAGES[h] && !$("#page-" + h).classList.contains("active")) goPage(h); });

/* ══════════════════════════ 16. INIT ══════════════════════════ */
let savedLang = "ar"; try { savedLang = localStorage.getItem("rabith.lang") || "ar"; } catch { /* ignore */ }
setLang(savedLang);
boot();
window.Rabith = { S, D, goPage, setLang, askAgent, computeFraud, scoreCreator };
})();
