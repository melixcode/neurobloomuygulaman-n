/**
 * NeuroBloom - Core Application Architecture (State-Driven Web App)
 */

// 1. KÜRESEL UYGULAMA DURUMU (STATE MANAGEMENT)
const AppState = {
    user: {
        role: null,
        name: "Alp",
        language: "tr",
        neuroCoins: 120,
        xp: 450,
        level: 12,
        streak: 5,
        neuroBotStage: "Filiz"
    },
    activeModule: null,
    activeTargetWord: "BALIK",
    isRecording: false
};

// Dil Paketi (Uluslararasılaştırma Altyapısı)
const i18n = {
    tr: { welcome: "Hoş Geldiniz", complete: "Tamamla", robotGreeting: "Merhaba! Bugün konuşma egzersizleri yapmaya hazır mısın?" },
    en: { welcome: "Welcome", complete: "Complete", robotGreeting: "Hello! Ready for your speech exercises today?" }
};

// 2. INITIALIZATION / UYGULAMA BAŞLANGICI
document.addEventListener("DOMContentLoaded", () => {
    initRouting();
    initSplash();
    initHardwarePermissions();
    initDragAndDrop();
    initSpeechRecognition();
    setupShop();
    loadLocalFallbackData();
});

// Splash Ekran Zamanlayıcısı
function initSplash() {
    setTimeout(() => {
        navigateTo("welcome-screen");
    }, 2500); // 2.5 Saniye simüle edilmiş yükleme hızı
}

// 3. SINGLE PAGE APP (SPA) YÖNLENDİRME MOTORU
function navigateTo(viewId) {
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add("active");
    }
}

function initRouting() {
    // Rol Seçim Butonları
    document.querySelectorAll(".role-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            AppState.user.role = e.currentTarget.getAttribute("data-role");
            navigateTo("onboarding-screen");
        });
    });

    // Kurulum Tamamlama
    document.getElementById("btn-complete-setup").addEventListener("click", () => {
        const inputName = document.getElementById("username").value;
        if(inputName) AppState.user.name = inputName;
        AppState.user.language = document.getElementById("lang-select").value;
        
        // Role göre yönlendirme paneli seçimi
        if (AppState.user.role === "child") navigateTo("child-dashboard");
        else if (AppState.user.role === "parent") navigateTo("parent-dashboard");
        else if (AppState.user.role === "therapist") navigateTo("therapist-dashboard");
    });

    // Alt Navigasyon Geçişleri
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", (e) => {
            document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
            e.currentTarget.classList.add("active");
            navigateTo(e.currentTarget.getAttribute("data-target"));
        });
    });

    // Modül Seçim Tetikleyicileri (Terapi Modülleri)
    document.querySelectorAll(".module-card.unlocked").forEach(card => {
        card.addEventListener("click", () => {
            AppState.activeModule = card.getAttribute("data-module");
            startTherapyGame(AppState.activeModule);
        });
    });

    // Genel Çıkış ve Geri Dönüş Fonksiyonları
    document.querySelectorAll(".btn-logout, .safety-exit, .back-to-dash").forEach(btn => {
        btn.addEventListener("click", () => {
            navigateTo("welcome-screen");
        });
    });
}

// 4. DONANIM API ENTEGRASYONLARI (KAMERA, MİKROFON, BİLDİRİM)
function initHardwarePermissions() {
    // Kamera İzni ve Canlı Akış Başlatma
    document.getElementById("btn-perm-cam").addEventListener("click", async (e) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            document.getElementById("webcam-preview").srcObject = stream;
            e.target.textContent = "✅ İzin Verildi";
            e.target.className = "btn btn-sm btn-success";
        } catch (err) {
            alert("Kamera erişimi reddedildi veya bulunamadı.");
        }
    });

    // Mikrofon İzni Hatırlatıcı Kontrolü
    document.getElementById("btn-perm-mic").addEventListener("click", async (e) => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            e.target.textContent = "✅ İzin Verildi";
            e.target.className = "btn btn-sm btn-success";
        } catch (err) {
            alert("Mikrofon erişimi reddedildi.");
        }
    });

    // Tarayıcı Bildirim API
    document.getElementById("btn-perm-notif").addEventListener("click", (e) => {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                e.target.textContent = "✅ İzin Verildi";
                e.target.className = "btn btn-sm btn-success";
                showBrowserNotification("NeuroBloom'a Hoş Geldin!", "NeuroBot seni bekliyor!");
            }
        });
    });
}

function showBrowserNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { body: body, icon: "🌸" });
    }
}

// 5. WEB SPEECH API (KONUŞMA TANIMA VE SESLENDİRME)
let recognition;
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'tr-TR';
        recognition.interimResults = false;

        recognition.onstart = () => {
            AppState.isRecording = true;
            document.getElementById("btn-trigger-mic").classList.add("recording");
            document.getElementById("mic-status-text").textContent = "Dinleniyor... Konuşun!";
        };

        recognition.onresult = (event) => {
            const resultText = event.results[0][0].transcript.toUpperCase();
            evaluateSpeechInput(resultText);
        };

        recognition.onerror = () => {
            resetMicStatus();
        };

        recognition.onend = () => {
            resetMicStatus();
        };

        document.getElementById("btn-trigger-mic").addEventListener("click", () => {
            if (!AppState.isRecording) {
                recognition.start();
            }
        });
    } else {
        document.getElementById("mic-status-text").textContent = "Tarayıcınız Konuşma Tanımayı Desteklemiyor.";
    }

    // Hedef Kelimeyi Seslendirme (TTS)
    document.getElementById("btn-listen-target").addEventListener("click", () => {
        const utterance = new SpeechSynthesisUtterance(AppState.activeTargetWord);
        utterance.lang = 'tr-TR';
        window.speechSynthesis.speak(utterance);
    });
}

function resetMicStatus() {
    AppState.isRecording = false;
    document.getElementById("btn-trigger-mic").classList.remove("recording");
    document.getElementById("mic-status-text").textContent = "Konuşmak için mikrofona dokun";
}

// Çocukların Konuşma Başarısını Değerlendiren Algoritma
function evaluateSpeechInput(spokenText) {
    const target = AppState.activeTargetWord.toUpperCase();
    if (spokenText.includes(target) || target.includes(spokenText)) {
        // BAŞARILI DURUM: XP ve Coin Ödülü Ver
        AppState.user.xp += 20;
        AppState.user.neuroCoins += 10;
        updateUIElements();
        
        document.getElementById("game-feedback-animation").innerHTML = "🎉 Harika! Doğru Telaffuz (+10 Coin)";
        document.getElementById("neurobot-speech-bubble").textContent = `Mükemmel! ${target} kelimesini başarıyla söyledin!`;
        
        setTimeout(() => {
            navigateTo("child-dashboard");
            document.getElementById("game-feedback-animation").innerHTML = "";
        }, 2000);
    } else {
        // BAŞARISIZ TEKRAR DURUMU
        document.getElementById("game-feedback-animation").innerHTML = "🌸 Yaklaştın! Tekrar Deneyelim mi?";
    }
}

// 6. TERAPİ OYUN MOTORU TETİKLEYİCİSİ
function startTherapyGame(moduleType) {
    navigateTo("game-view");
    const words = { letter: "A", syllable: "BABA", word: "BALIK" };
    AppState.activeTargetWord = words[moduleType] || "KEDİ";
    document.getElementById("target-speech-text").textContent = AppState.activeTargetWord;
    document.getElementById("game-title").textContent = `${moduleType.toUpperCase()} Aktivitesi`;
}

// 7. MAĞAZA VE ENVANTER SİSTEMİ
function setupShop() {
    document.querySelectorAll(".buy-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const shopItem = e.target.closest(".shop-item");
            const cost = parseInt(shopItem.getAttribute("data-cost"));
            const itemId = shopItem.getAttribute("data-id");

            if (AppState.user.neuroCoins >= cost) {
                AppState.user.neuroCoins -= cost;
                updateUIElements();
                alert("Öğe başarıyla satın alındı ve NeuroBot Odasına eklendi!");
                e.target.textContent = "Kuşanıldı";
                e.target.disabled = true;
                
                // Odaya etkisi
                if (itemId === "room_wallpaper") {
                    document.getElementById("room-canvas").style.background = "linear-gradient(to bottom, #0f2027, #203a43, #2c5364)";
                }
            } else {
                alert("Yetersiz NeuroCoin! Daha fazla aktivite tamamlamalısın.");
            }
        });
    });
}

// 8. ETKİLEŞİMLİ ODASI - DRAG & DROP MANTIĞI
function initDragAndDrop() {
    const canvas = document.getElementById("room-canvas");
    let activeItem = null;

    document.querySelectorAll(".draggable-item").forEach(item => {
        item.addEventListener("dragstart", (e) => {
            activeItem = e.target;
        });
    });

    canvas.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    canvas.addEventListener("drop", (e) => {
        e.preventDefault();
        if (activeItem) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - 20;
            const y = e.clientY - rect.top - 20;
            activeItem.style.left = `${x}px`;
            activeItem.style.top = `${y}px`;
        }
    });

    // NeuroBot Evrim Gelişim Tıklama Etkileşimi
    document.getElementById("room-bot-character").addEventListener("click", () => {
        AppState.user.xp += 5;
        updateUIElements();
        alert("NeuroBot'u sevdin! Kalp kazandı. ❤️");
    });
}

// 9. REAKSİYONEL ARAYÜZ GÜNCELLEMELERİ (UI SYNC)
function updateUIElements() {
    // Çocuk Arayüzü Güncellemeleri
    document.getElementById("child-coins").textContent = AppState.user.neuroCoins;
    document.getElementById("child-xp").textContent = AppState.user.xp;
    document.getElementById("child-level").textContent = AppState.user.level;
    document.getElementById("shop-coin-count").textContent = AppState.user.neuroCoins;

    // Evrim Seviyesi Hesaplama Kontrolü
    if (AppState.user.xp >= 500) {
        AppState.user.neuroBotStage = "Çiçek";
        document.getElementById("neurobot-avatar-display").textContent = "🌸";
        document.getElementById("room-bot-character").textContent = "🌸";
        document.getElementById("bot-stage-name").textContent = "Çiçek (Seviye 20+)";
    }

    // Yerel Veritabanı Sync
    saveToLocalStorage();
}

// 10. ÇEVRİMDIŞI MOD - LOCAL STORAGE / INDEXEDDB KATMANI
function saveToLocalStorage() {
    localStorage.setItem("neurobloom_user_state", JSON.stringify(AppState.user));
}

function loadLocalFallbackData() {
    const saved = localStorage.getItem("neurobloom_user_state");
    if (saved) {
        AppState.user = JSON.parse(saved);
        updateUIElements();
    }
}

// Terapist Paneli Demo Kontrol Yönetimi
document.querySelectorAll(".btn-unlock-level").forEach(btn => {
    btn.addEventListener("click", (e) => {
        alert("Cümle Seviyesi modül kilidi Alp Yılmaz isimli danışan için başarıyla açıldı.");
        e.target.textContent = "Kilit Açıldı";
        e.target.className = "btn btn-sm btn-secondary";
    });
});
