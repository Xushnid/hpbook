class BookReader {
    constructor() {
        this.currentBook = this.getCurrentBook();
        this.currentPage = this.getCurrentPage();
        this.fontSize = localStorage.getItem('fontSize') || 'text-medium';
        this.theme = localStorage.getItem('theme') || 'light-mode';
        this.alphabet = localStorage.getItem('alphabet') || 'lat';
        this.bookmarks = this.getBookmarks();
        
        // --- GLOBAL AUDIO UCHUN YANGILANGAN VA TO'G'RI YONDASHUV ---
        // Faqat birinchi marta (yoki yangi tab/oyna ochilganda) globalAudioPlayer yaratamiz
        if (!window.globalAudioPlayerInstance) { // globalAudioPlayerInstance nomidan foydalanamiz
            const currentPath = window.location.pathname;
            let audioPath = 'background_music.mp3'; // index.html (asosiy papka) uchun

            // Agar joriy sahifa `/book` papkasi ichida bo'lsa, yo'lni to'g'irlaymiz
            // Masalan, `/book1/1.html` dan `../background_music.mp3`
            if (currentPath.includes('/book')) {
                audioPath = '../background_music.mp3';
            }
            // `mundarija.html` ham `bookX` papkasida bo'lsa, yuqoridagi shart uni qamrab oladi.
            // Agar `mundarija.html` asosiy papkada bo'lsa, `background_music.mp3` o'zi yetarli.

            window.globalAudioPlayerInstance = new Audio(audioPath);
            window.globalAudioPlayerInstance.loop = true;
            window.globalAudioPlayerInstance.volume = 0.5; // Ovoz balandligi

            // Audio yuklanishini kutamiz va holatni tiklaymiz
            window.globalAudioPlayerInstance.addEventListener('loadedmetadata', () => {
                const savedTime = parseFloat(localStorage.getItem('globalAudioTime')) || 0;
                const savedPlaying = localStorage.getItem('globalAudioPlaying') === 'true';

                if (savedTime > 0) {
                    window.globalAudioPlayerInstance.currentTime = savedTime;
                }
                // Avtomatik ijro etishga harakat qilish
                if (savedPlaying) {
                    window.globalAudioPlayerInstance.play().catch(e => {
                        console.log("Musiqa avtomatik davom etmadi. Bu normal holat bo'lishi mumkin. Foydalanuvchi interaksiyasini kuting.");
                        // Avtomatik ijro etilmasa, tugma holatini to'g'rilash kerak
                        // updateGlobalPlayPauseButton() init() ichida chaqiriladi
                    });
                }
            });

            // Audio faylni topishda xatolik bo'lsa
            window.globalAudioPlayerInstance.addEventListener('error', (e) => {
                console.error("Global audio faylni yuklashda xatolik:", window.globalAudioPlayerInstance.error);
                console.error("Qidirilayotgan manzil:", window.globalAudioPlayerInstance.src);
            });
        }
        // Har bir BookReader instance'i global pleyerga murojaat qiladi
        this.audioPlayer = window.globalAudioPlayerInstance;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.applyTheme();
        this.applyFontSize();
        this.checkAlphabet(); // YANGI
        this.showBookmarkMessage();
        this.updateNavigation();
        this.saveScrollPosition();
        this.checkUrlScroll();
        this.handleOrientationChange();
    }

    getCurrentBook() {
        const path = window.location.pathname;
        const match = path.match(/book(\d+)/);
        return match ? `book${match[1]}` : null;
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('mundarija.html')) {
            return 'mundarija';
        }
        const match = path.match(/(\d+)\.html$/);
        return match ? parseInt(match[1]) : null;
    }

    setupEventListeners() {
		// === YANGI KOD: DYNAMIC HEADER UCHUN ===
        const headerContainer = document.getElementById('dynamicHeaderContainer');
        const toggleBtn = document.getElementById('headerToggleBtn');
        const closeBtn = document.getElementById('closeHeaderBtn');

        if (headerContainer && toggleBtn && closeBtn) {
            // Kichik tugma bosilganda paneni ochadi/yopadi
            toggleBtn.addEventListener('click', () => {
                headerContainer.classList.toggle('expanded');
            });

            // "X" tugmasi bosilganda paneni yopadi
            closeBtn.addEventListener('click', () => {
                headerContainer.classList.remove('expanded');
            });
        }
        // === YANGI KOD TUGADI ===
		
        // Navigatsiya tugmalari
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const homeBtn = document.getElementById('homeBtn');
        const tocBtn = document.getElementById('tocBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigatePrev());
            prevBtn.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateNext());
            nextBtn.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        }
        if (homeBtn) {
            homeBtn.addEventListener('click', () => this.goHome());
            homeBtn.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        }
        if (tocBtn) {
            tocBtn.addEventListener('click', () => this.goToTOC());
            tocBtn.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        }

        // Shrift o'lchami tugmalari
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
            zoomInBtn.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
            zoomOutBtn.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        }

        // YANGI - Alfavit tugmasi
        const alphabetBtn = document.getElementById('alphabetBtn');
        if (alphabetBtn) {
            alphabetBtn.addEventListener('click', () => this.changeAlphabet());
            alphabetBtn.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        }

        // Rejim tugmasi
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.cycleTheme());
            themeBtn.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        }

        // Bookmark tugmalari
        const bookmarkContinue = document.getElementById('bookmarkContinue');
        const bookmarkClose = document.getElementById('bookmarkClose');

        if (bookmarkContinue) {
            bookmarkContinue.addEventListener('click', () => this.continueReading());
            bookmarkContinue.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        }
        
        if (bookmarkClose) {
            bookmarkClose.addEventListener('click', () => this.closeBookmarkMessage());
            bookmarkClose.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        }


        // GLOBAL Audio tugmasi
        const globalAudioPlayPauseBtn = document.getElementById('globalAudioPlayPauseBtn');
        if (globalAudioPlayPauseBtn) {
            globalAudioPlayPauseBtn.addEventListener('click', () => this.toggleGlobalAudioPlayback());
            globalAudioPlayPauseBtn.addEventListener('touchstart', this.handleTouchStart, { passive: true });
            
            // Audio holati o'zgarganda tugmani va localStorage'ni yangilash
            this.audioPlayer.addEventListener('play', () => {
                localStorage.setItem('globalAudioPlaying', 'true');
                this.updateGlobalPlayPauseButton();
            });
            this.audioPlayer.addEventListener('pause', () => {
                localStorage.setItem('globalAudioPlaying', 'false');
                this.updateGlobalPlayPauseButton();
            });
            
            // Audio vaqtini doimiy saqlab borish
            this.audioPlayer.addEventListener('timeupdate', () => {
                // Faqat musiqa ijro etilayotganda vaqtni saqlaymiz
                if (!this.audioPlayer.paused) {
                    localStorage.setItem('globalAudioTime', this.audioPlayer.currentTime.toString());
                }
            });

            // Sahifa yuklanganda dastlabki tugma holatini o'rnatish
            this.updateGlobalPlayPauseButton();
        }

        // Scroll hodisasi
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.saveScrollPosition();
            }, 500);
        }, { passive: true });

        // Orientatsiya o'zgarishi
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });

        // Resize hodisasi
        window.addEventListener('resize', () => {
            this.handleOrientationChange();
        }, { passive: true });
    }

    handleTouchStart(e) {
        e.target.style.transform = 'scale(0.95)';
        setTimeout(() => {
            e.target.style.transform = '';
        }, 100);
    }

    handleOrientationChange() {
        // Orientatsiya o'zgarganida layoutni yangilash
        const viewport = document.querySelector('meta[name=viewport]');
        if (!viewport) {
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.getElementsByTagName('head')[0].appendChild(meta);
        }
    }

    /// GLOBAL Audio funksiyalari (YANGILANGAN)
    toggleGlobalAudioPlayback() {
        if (this.audioPlayer.paused) {
            this.audioPlayer.play().catch(e => console.log("Global audio ijro etilmadi:", e.message));
            // localStorage'ga yozish audioPlayer'ning 'play' hodisasida amalga oshiriladi
        } else {
            this.audioPlayer.pause();
            // localStorage'ga yozish audioPlayer'ning 'pause' hodisasida amalga oshiriladi
        }
        // updateGlobalPlayPauseButton() audioPlayer'ning 'play' va 'pause' hodisalarida avtomatik chaqiriladi
    }

    updateGlobalPlayPauseButton() {
        const globalPlayIcon = document.getElementById('globalPlayIcon');
        const globalPauseIcon = document.getElementById('globalPauseIcon');
        if (globalPlayIcon && globalPauseIcon) {
            // Pleyer holati va localStorage holatini tekshiramiz
            const isPlaying = !this.audioPlayer.paused && localStorage.getItem('globalAudioPlaying') === 'true';

            if (isPlaying) {
                globalPlayIcon.style.display = 'none';
                globalPauseIcon.style.display = 'block';
            } else {
                globalPlayIcon.style.display = 'block';
                globalPauseIcon.style.display = 'none';
            }
        }
    }

    navigatePrev() {
        if (this.currentPage === 'mundarija') {
            this.goHome();
        } else if (this.currentPage === 1) {
            this.goToTOC();
        } else if (this.currentPage > 1) {
            window.location.href = `${this.currentPage - 1}.html`;
        }
    }

    navigateNext() {
        if (this.currentPage === 'mundarija') {
            window.location.href = '1.html';
        } else {
            const totalChapters = this.getTotalChapters();
            if (this.currentPage < totalChapters) {
                window.location.href = `${this.currentPage + 1}.html`;
            }
        }
    }

    changeAlphabet() {
        if (this.alphabet === 'lat') {
            this.alphabet = 'cyr';
            localStorage.setItem('alphabet', 'cyr');
        } else {
            this.alphabet = 'lat';
            localStorage.setItem('alphabet', 'lat');
        }
        
        this.updateAlphabetButton();
        
        // Sahifani qayta yuklash
        setTimeout(() => {
            location.reload();
        }, 100);
    }

    checkAlphabet() {
        this.updateAlphabetButton();
        
        if (this.alphabet === 'cyr') {
            // Sahifa yuklangandan keyin kirill harflariga o'tkazish
            setTimeout(() => {
                this.convertToCyrillic();
            }, 500);
        }
    }

    updateAlphabetButton() {
        const alphabetText = document.getElementById('alphabetText');
        if (alphabetText) {
            if (this.alphabet === 'lat') {
                alphabetText.textContent = 'Кир'; // Kirillga o'tish uchun
            } else {
                alphabetText.textContent = 'Лот'; // Lotinga o'tish uchun
            }
        }
    }

    convertToCyrillic() {
        // Sizning transliteratsiya kodingiz
        this.addTransliterationCode();
        this.doTransliteration();
    }

    addTransliterationCode() {
        // Transliteratsiya massivlari
        this.l_ts = ["PRINSIP","prinsip","KSIYA","ksiya","KSION","ksion","NSIYA","nsiya","NSION","nsion","TSION","tsion","TSIST","tsist","TSIZM","tsizm","TSIT","tsit","DETSI","detsi","TSEVT","tsevt","TSEPT","tsept","TSER","tser","TSIAL","tsial","SIAL","sial","TSIKL","tsikl","SIKL","sikl","VITSE","vitse","TSIYA","tsiya"];
        this.c_ts = ["ПРИНЦИП","принцип","КЦИЯ","кция","КЦИОН","кцион","НЦИЯ","нция","НЦИОН","нцион","ЦИОН","цион","ЦИСТ","цист","ЦИЗМ","цизм","ЦИТ","цит","ДЕЦИ","деци","ЦЕВТ","цевт","ЦЕПТ","цепт","ЦЕР","цер","ЦИАЛ","циал","ЦИАЛ","циал","ЦИКЛ","цикл","ЦИКЛ","цикл","ВИЦЕ","вице","ЦИЯ","ция"];

        this.l_letters_l2c = ["YO'","Yo'","yo'","YO","Yo","yo","YA","Ya","ya","YE","Ye","ye","YU","Yu","yu","CH","Ch","ch","S'H","S'h","s'h","SH","Sh","sh","A","a","B","b","D","d","F","f","G","g","H","h","I","i","J","j","K","k","L","l","M","m","N","n","O","o","P","p","Q","q","R","r","S","s","T","t","U","u","V","v","X","x","Y","y","Z","z"];
        this.c_letters_l2c = ["ЙЎ","Йў","йў","Ё","Ё","ё","Я","Я","я","Е","Е","е","Ю","Ю","ю","Ч","Ч","ч","СҲ","Сҳ","сҳ","Ш","Ш","ш","А","а","Б","б","Д","д","Ф","ф","Г","г","Ҳ","ҳ","И","и","Ж","ж","К","к","Л","л","М","м","Н","н","О","о","П","п","Қ","қ","Р","р","С","с","Т","т","У","у","В","в","Х","х","Й","й","З","з"];
    }

    replaceArray(text, a1, a2) {
        for(var i = 0; i < a1.length; i++) {
            var pat = new RegExp(a1[i], "g");
            text = text.replace(pat, a2[i]);
        }
        return text;
    }

    translit(str) {
        var text = str;
        var text = text.replace(/G'|G'|G'/g,"Ғ"); 
        var text = text.replace(/g'|g'|g'/g,"ғ");
        var text = text.replace(/O'|O'|O'/g,"Ў"); 
        var text = text.replace(/o'|o'|o'/g,"ў");
        
        var text = text.replace(/'|'/g,"'");
        
        var text = text.replace(/"([^""]+)"/g, '«$1»');
        var text = text.replace(/"([^"]+)"/g, '«$1»');
        var text = text.replace(/-da\b/g, "dа");
        var text = text.replace(/-ku\b/g, "ku");
        var text = text.replace(/-chi\b/g, "chi");
        var text = text.replace(/-yu\b/g, "yu");
        var text = text.replace(/-u\b/g, "u");
        var text = text.replace(/(\b[0-9]+)-([^\s+])/g, "$1 $2");
        
        var text = this.replaceArray(text, this.l_ts, this.c_ts);

        var text = text.replace(/\'([A-Z])/g, "Ъ$1");
        var text = text.replace(/\'([a-z])/g, "ъ$1");			
        var text = this.replaceArray(text, this.l_letters_l2c, this.c_letters_l2c);
        
        var text = text.replace(/^E|([\w])E|([\s+])E|([АаОоУу])E/g, "$1$2Э");
        var text = text.replace(/^e|([\w])e|([\s+])e|([аоуe])e/g, "$1$2$3э");
        var text = text.replace(/e/g, "е");	
        var text = text.replace(/([аоу])эв/g, "$1ев");	
        var text = text.replace(/([АаОоУу])ЭВ/g, "$1ЕВ");	
        return text;
    }

    doTransliteration() {
        var allNodes = document.getElementsByTagName("*");
        for (var key in allNodes) {
            var el = allNodes[key];
            if (el.nodeName !== 'SCRIPT' && el.nodeName !== 'STYLE' && el.nodeName !== 'LAT'){
                var children = el.childNodes;
                if (children !== undefined){
                    var x = children.length;	
                    for (var i=0; i<x; i++){
                        if (children[i].nodeType == 3){
                            var text = children[i].nodeValue;
                            text = text.replace(/\b(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)[-A-Z0-9+&@#\/%=~_|$?!:,.]*[A-Z0-9+&@#\/%=~_|$]/ig,
                            function (match) {
                                return '〈' + match + '〉';
                            });
                            text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig,
                            function (match) {
                                return '〈' + match + '〉';
                            });
                            text = text.replace(/([^〈〉](?![^〈]*〉))+/g, (match) => {
                                return this.translit(match);
                            });
                            text = text.replace(/[〈〉]/g, "");
                        
                            children[i].nodeValue = text;
                        }
                    }
                }
                if (el.nodeType === 1 && el.hasAttribute('placeholder')) {
                    el.setAttribute("placeholder", this.translit(el.getAttribute("placeholder")));
                }
                if (el.nodeType === 1 && el.hasAttribute('title')) {
                    el.setAttribute("title", this.translit(el.getAttribute("title")));
                }
                if (el.nodeType === 1 && el.hasAttribute('alt')) {
                    el.setAttribute("alt", this.translit(el.getAttribute("alt")));
                }
                if (el.nodeType === 1 && el.hasAttribute('type') && el.hasAttribute('value')) {
                    if (el.getAttribute("type") == "submit") {
                        el.setAttribute("value", this.translit(el.getAttribute("value")));
                    }
                }
            }
        }
    }

    // YANGILANGAN getTotalChapters funksiyasi - 7 ta kitob uchun
    getTotalChapters() {
        // URL dan kitob nomini aniqlash
        const path = window.location.pathname;
        
        if (path.includes('/book1/')) {
            return 17; // Book1 dagi sahifalar soni
        } else if (path.includes('/book2/')) {
            return 15; // Book2 dagi sahifalar soni
        } else if (path.includes('/book3/')) {
            return 12; // Book3 dagi sahifalar soni
        } else if (path.includes('/book4/')) {
            return 18; // Book4 dagi sahifalar soni
        } else if (path.includes('/book5/')) {
            return 14; // Book5 dagi sahifalar soni
        } else if (path.includes('/book6/')) {
            return 20; // Book6 dagi sahifalar soni
        } else if (path.includes('/book7/')) {
            return 16; // Book7 dagi sahifalar soni
        }
        
        // Agar hech qaysi kitob topilmasa, default qiymat
        return 10;
    }

    goHome() {
        // Asosiy index.html ga qaytish uchun, qayerda bo'lishidan qat'iy nazar
        // Hozirgi joylashuvdan ildiz katalogga qaytish uchun.
        const currentPath = window.location.pathname;
        if (currentPath.includes('/book')) {
            window.location.href = '../index.html'; // Agar bookX/ folder ichida bo'lsa
        } else {
            window.location.href = 'index.html'; // Agar allaqachon rootda bo'lsa
        }
    }


    goToTOC() {
        // Mundarija sahifasiga o'tish
        // Joriy kitob papkasida mundarija.html bo'lsa
        window.location.href = 'mundarija.html';
    }

    zoomIn() {
        const sizes = ['text-xsmall', 'text-small', 'text-medium', 'text-large', 'text-xlarge', 'text-xxlarge'];
        const currentIndex = sizes.indexOf(this.fontSize);
        if (currentIndex < sizes.length - 1) {
            this.fontSize = sizes[currentIndex + 1];
            this.applyFontSize();
            localStorage.setItem('fontSize', this.fontSize);
        }
    }

    zoomOut() {
        const sizes = ['text-xsmall', 'text-small', 'text-medium', 'text-large', 'text-xlarge', 'text-xxlarge'];
        const currentIndex = sizes.indexOf(this.fontSize);
        if (currentIndex > 0) {
            this.fontSize = sizes[currentIndex - 1];
            this.applyFontSize();
            localStorage.setItem('fontSize', this.fontSize);
        }
    }

    applyFontSize() {
        const body = document.body;
        const sizes = ['text-xsmall', 'text-small', 'text-medium', 'text-large', 'text-xlarge', 'text-xxlarge'];
        sizes.forEach(size => body.classList.remove(size));
        body.classList.add(this.fontSize);
    }

    cycleTheme() {
        const themes = ['light-mode', 'dark-mode', 'book-mode'];
        const currentIndex = themes.indexOf(this.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.theme = themes[nextIndex];
        this.applyTheme();
        localStorage.setItem('theme', this.theme);
    }

    applyTheme() {
        const body = document.body;
        const themes = ['light-mode', 'dark-mode', 'book-mode'];
        themes.forEach(theme => body.classList.remove(theme));
        body.classList.add(this.theme);
    }

    getBookmarks() {
        const bookmarks = localStorage.getItem('bookmarks');
        return bookmarks ? JSON.parse(bookmarks) : {};
    }

    saveBookmarks() {
        localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
    }

    saveScrollPosition() {
        if (this.currentBook && this.currentPage !== 'mundarija') {
            const scrollPosition = window.pageYOffset;
            const bookmarkKey = `${this.currentBook}-${this.currentPage}`;
            
            this.bookmarks[this.currentBook] = {
                page: this.currentPage,
                position: scrollPosition,
                timestamp: Date.now()
            };
            
            this.saveBookmarks();
        }
    }

    showBookmarkMessage() {
        if (this.currentPage === 'mundarija' && this.currentBook) {
            const bookmark = this.bookmarks[this.currentBook];
            const messageDiv = document.getElementById('bookmarkMessage');
            
            if (bookmark && messageDiv) {
                messageDiv.classList.remove('hidden');
            }
        }
    }

    continueReading() {
        const bookmark = this.bookmarks[this.currentBook];
        if (bookmark) {
            window.location.href = `${bookmark.page}.html?scroll=${bookmark.position}`;
        }
    }

    checkUrlScroll() {
        const urlParams = new URLSearchParams(window.location.search);
        const scrollPosition = urlParams.get('scroll');
        if (scrollPosition) {
            setTimeout(() => {
                window.scrollTo({
                    top: parseInt(scrollPosition),
                    behavior: 'smooth'
                });
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }, 200);
        }
    }

    closeBookmarkMessage() {
        const messageDiv = document.getElementById('bookmarkMessage');
        if (messageDiv) {
            messageDiv.classList.add('hidden');
        }
        
        if (this.currentBook && this.bookmarks[this.currentBook]) {
            delete this.bookmarks[this.currentBook];
            this.saveBookmarks();
        }
    }

    updateNavigation() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (nextBtn) {
            const totalChapters = this.getTotalChapters();
            if (this.currentPage === totalChapters) {
                nextBtn.style.display = 'none';
            }
        }
    }
}

// Sahifa yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
    new BookReader();
});

// Touch qurilmalar uchun viewport meta tag qo'shish
if (!document.querySelector('meta[name=viewport]')) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(meta);
}