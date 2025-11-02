App.Mesapra2.com
├── CONTRIBUTING.md
├── Nginx.conf
├── components.json
├── docs
│   ├── Authcontext mudanças.md
│   ├── DecodePara_IOSeAndroid.md
│   ├── EventDetails.md
│   ├── Fluxo Login Social.md
│   ├── FluxoConclusãoEventos.md
│   ├── FluxoRegistroPartner.md
│   ├── MonitoramentoEmProdução.md
│   ├── README.md
│   ├── SKILL.md
│   ├── SKILL.zip
│   ├── SocialLoginStructions.md
│   ├── VERCEL.COM.md
│   ├── correções do chat.md
│   ├── estrutura.txt
│   ├── legal
│   │   └── ICLA.md
│   ├── metatags.md
│   ├── mudanças no app.md
│   └── parnerprofilemudança.md
├── estrutura.md
├── favicon.ico
├── index.html
├── jsconfig.json
├── logo.svg
├── mesapra2-skill
│   ├── SKILL.md
│   └── SKILL.zip
├── package-lock.json
├── package.json
├── politicas.html
├── postcss.config.js
├── src
│   ├── App.jsx
│   ├── Main.jsx
│   ├── ProtectedRoutes.jsx
│   ├── assets
│   │   ├── logo.png
│   │   ├── logo_social.png
│   │   ├── logovelha.png
│   │   ├── rest21.jpg
│   │   ├── rest22.jpg
│   │   └── rest23.jpg
│   ├── components
│   │   ├── Layout.jsx
│   │   ├── NotificationBell.jsx
│   │   ├── NotificationDropdown.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── ui
│   │       └── dropdown-menu.tsx
│   ├── config
│   │   ├── hashtagsConfig.js
│   │   ├── premiumFeatures.js
│   │   └── userTypes.js
│   ├── contexts
│   │   ├── AuthContext.jsx
│   │   └── PremiumContext.jsx
│   ├── features
│   │   ├── partner
│   │   │   ├── components
│   │   │   │   ├── EventPasswordCard.jsx
│   │   │   │   ├── EventSuggestions.jsx
│   │   │   │   └── LatestAnnouncements.jsx
│   │   │   └── pages
│   │   │       ├── CreateEventPartner.jsx
│   │   │       ├── EditEventPagePartner.jsx
│   │   │       ├── EventManagementPartner.jsx
│   │   │       ├── FeedPartnerEvent.jsx
│   │   │       ├── PartnerDashboard.jsx
│   │   │       ├── PartnerRegisterPage.jsx
│   │   │       └── PartnerSettings.jsx
│   │   ├── shared
│   │   │   ├── components
│   │   │   │   ├── FeaturesGAte.jsx
│   │   │   │   ├── HeroImage.jsx
│   │   │   │   ├── LimitWarning.jsx
│   │   │   │   ├── PremiumBAdge.jsx
│   │   │   │   ├── auth
│   │   │   │   │   ├── PhoneVerification.jsx
│   │   │   │   │   └── SocialLoginButtons.jsx
│   │   │   │   ├── callToAction.jsx
│   │   │   │   ├── events
│   │   │   │   │   ├── EventApply.jsx
│   │   │   │   │   ├── EventConclusion.jsx
│   │   │   │   │   ├── EventEvaluationSection.jsx
│   │   │   │   │   ├── EventHashtagSelector.jsx
│   │   │   │   │   ├── EventPhotoUpload.jsx
│   │   │   │   │   ├── EventRating.jsx
│   │   │   │   │   ├── EventStatusBadge.jsx
│   │   │   │   │   ├── HashtagSelector.jsx
│   │   │   │   │   ├── ParticipantsManager.jsx
│   │   │   │   │   ├── RatingModal.jsx
│   │   │   │   │   └── RestaurantRating.jsx
│   │   │   │   ├── profile
│   │   │   │   │   ├── Avatar.jsx
│   │   │   │   │   └── HashtagInterestSelector.jsx
│   │   │   │   └── ui
│   │   │   │       ├── EventEntryForm.jsx
│   │   │   │       ├── GoogleBusinessBadge.jsx
│   │   │   │       ├── Navbar.jsx
│   │   │   │       ├── PrivacySettings.jsx
│   │   │   │       ├── RestaurantSelector.jsx
│   │   │   │       ├── SidebarContent.jsx
│   │   │   │       ├── SimpleDropdown.jsx
│   │   │   │       ├── UserMenu.jsx
│   │   │   │       ├── WelcomeMessage.jsx
│   │   │   │       ├── button.jsx
│   │   │   │       ├── checkbox.jsx
│   │   │   │       ├── dialog.jsx
│   │   │   │       ├── dropdown-menu.jsx
│   │   │   │       ├── input.jsx
│   │   │   │       ├── label.jsx
│   │   │   │       ├── select.jsx
│   │   │   │       ├── switch.jsx
│   │   │   │       ├── textarea.jsx
│   │   │   │       ├── toast.jsx
│   │   │   │       ├── toaster.jsx
│   │   │   │       └── use-toast.js
│   │   │   ├── hooks
│   │   │   │   └── useSharedFeatures.js
│   │   │   ├── pages
│   │   │   │   ├── AuthCallbackPage.jsx
│   │   │   │   ├── Chat.jsx
│   │   │   │   ├── ChatHistoryPage.jsx
│   │   │   │   ├── EventChatPage.jsx
│   │   │   │   ├── EventDetails.jsx
│   │   │   │   ├── EventsPage.jsx
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── MyEventsPage.jsx
│   │   │   │   ├── MyParticipation.jsx
│   │   │   │   ├── NotificationsPage.jsx
│   │   │   │   ├── ParticipantHistoryPage.jsx
│   │   │   │   ├── PartnerProfilePage.jsx
│   │   │   │   ├── PeoplePage.jsx
│   │   │   │   ├── Peoplepage.temp.jsx
│   │   │   │   ├── PhoneVerificationPage.jsx
│   │   │   │   ├── ProfilePage.jsx
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   ├── RestaurantDetailsPage.jsx
│   │   │   │   ├── RestaurantsPage.jsx
│   │   │   │   └── signup.jsx
│   │   │   └── services
│   │   │       └── AutoCancelEventService.js
│   │   └── user
│   │       ├── components
│   │       │   └── common
│   │       │       └── Settings.jsx
│   │       ├── pages
│   │       │   ├── CreateEvent.jsx
│   │       │   ├── CreateEventCrusher.jsx
│   │       │   ├── CreateEventParticular.jsx
│   │       │   ├── Dashboard.jsx
│   │       │   ├── EditEventPage.jsx
│   │       │   ├── EventManagement.jsx
│   │       │   ├── UserSettings.jsx
│   │       │   └── premium.jsx
│   │       └── services
│   │           └── userEventService.ts
│   ├── hooks
│   │   ├── useEventStatus.js
│   │   ├── useFeaturesAccess.js
│   │   ├── useParticipation.js
│   │   ├── usePremiumFeatures.js
│   │   └── userNotification.js
│   ├── index.css
│   ├── lib
│   │   ├── supabaseClient.ts
│   │   └── utils.ts
│   ├── services
│   │   ├── ChatCleanupService.ts
│   │   ├── DEVMix.code-workspace
│   │   ├── EventPhotosService.ts
│   │   ├── EventSecurityService.ts
│   │   ├── EventStatusService.ts
│   │   ├── NotificationService.ts
│   │   ├── ParticipationService.ts
│   │   ├── PartnerEventService.ts
│   │   ├── PushNotificationService.ts
│   │   ├── RatingService.ts
│   │   ├── TrustScoreService.ts
│   │   ├── WaitingListService.ts
│   │   ├── authService.ts
│   │   └── twilioService.js
│   └── utils
│       ├── abi
│       ├── avatarHelper.js
│       ├── chatAvailability.js
│       ├── featureGates.js
│       ├── index.js
│       ├── supabaseClient.js
│       ├── utils.js
│       └── validateCNPJ.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
├── vite.config.js
└── vite.svg
