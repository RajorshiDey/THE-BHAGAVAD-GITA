const API_BASE = "http://localhost:8000/api/v1";

// State
let currentChapter = null;
let currentVerseList = [];
let currentVerseIndex = 0;
let pinnedVerseId = null;

// DOM Elements
const chapterListEl = document.getElementById('chapter-list');
const verseSelectEl = document.getElementById('verse-select');
const prevBtn = document.getElementById('prev-verse');
const nextBtn = document.getElementById('next-verse');
const readerEmptyState = document.getElementById('reader-empty-state');
const verseContentEl = document.getElementById('verse-content');

// Mobile Navigation Elements
const backdrop = document.getElementById('backdrop');
const chapterSidebar = document.getElementById('chapter-sidebar');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle') || document.getElementById('menu-toggle-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');

// AI Panel Elements
const aiPanel = document.getElementById('ai-panel');
const mobileAiFab = document.getElementById('mobile-ai-fab') || document.getElementById('ai-fab');
const closeAiBtn = document.getElementById('close-ai-btn') || document.getElementById('minimize-ai-btn');
const pinnedChip = document.getElementById('pinned-verse-chip');
const pinnedLabel = document.getElementById('pinned-verse-label');
const clearPinBtn = document.getElementById('clear-pin-btn');
const aiInput = document.getElementById('ai-input');
const askBtn = document.getElementById('ask-btn');
const chatHistory = document.getElementById('chat-history');

// 1. Initialization
async function init() {
    await fetchChapters();
    setupEventListeners();
    restoreReadingPosition();
    if (mobileAiFab) makeDraggable(mobileAiFab);
}

// 2. Fetch & Render Chapters
async function fetchChapters() {
    try {
        const res = await fetch(`${API_BASE}/chapters`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const chapters = await res.json();
        
        chapterListEl.innerHTML = '';
        chapters.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'chapter-btn';
            btn.setAttribute('data-chapter', ch.chapter_number);
            btn.innerHTML = `<strong>Ch ${ch.chapter_number}</strong>: ${ch.chapter_name_translation}`;
            btn.onclick = () => {
                loadChapter(ch.chapter_number, btn);
                closeDrawers();
            };
            chapterListEl.appendChild(btn);
        });
    } catch (err) {
        if (chapterListEl) chapterListEl.innerHTML = '<p class="loading">Failed to load chapters.</p>';
    }
}

// 3. Load Specific Chapter
async function loadChapter(chapterNum, btnElement = null, targetVerseIndex = 0) {
    document.querySelectorAll('.chapter-btn').forEach(b => b.classList.remove('active'));
    
    if (!btnElement) {
        btnElement = document.querySelector(`.chapter-btn[data-chapter="${chapterNum}"]`);
    }
    if (btnElement) btnElement.classList.add('active');

    try {
        const res = await fetch(`${API_BASE}/chapters/${chapterNum}/verses`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        currentVerseList = await res.json();
        currentChapter = chapterNum;
        
        verseSelectEl.innerHTML = '';
        verseSelectEl.disabled = false;
        
        currentVerseList.forEach((v, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = `Verse ${v.chapter}.${v.verse}`;
            verseSelectEl.appendChild(opt);
        });

        const safeIndex = (targetVerseIndex >= 0 && targetVerseIndex < currentVerseList.length) ? targetVerseIndex : 0;
        loadVerse(safeIndex);
    } catch (err) {
        console.error("Error loading chapter:", err);
    }
}

// 4. Load & Display Specific Verse
function loadVerse(index) {
    if (index < 0 || index >= currentVerseList.length) return;
    
    currentVerseIndex = index;
    const verse = currentVerseList[index];
    
    verseSelectEl.value = index;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === currentVerseList.length - 1;

    readerEmptyState?.classList.add('hidden');
    verseContentEl?.classList.remove('hidden');
    
    document.getElementById('verse-id-display').innerText = `Chapter ${verse.chapter}, Verse ${verse.verse}`;
    document.getElementById('sanskrit-text').innerText = verse.sanskrit.replace(/\|\|.*\|\|/g, '').replace(/\|/g, '');
    document.getElementById('transliteration-text').innerText = verse.transliteration;
    
    document.getElementById('translation-panel').innerText = verse.translation;
    document.getElementById('explanation-panel').innerText = verse.explanation || "No explanation available for this verse.";
    document.getElementById('word-meanings-panel').innerText = verse.wordMeanings || "No word meanings available.";

    pinVerseToAI(verse.id);
    saveReadingPosition(currentChapter, index);
}

// 5. Reading Position Persistence
function saveReadingPosition(chapterNum, verseIndex) {
    if (!chapterNum) return;
    const positionData = { chapter: chapterNum, verseIndex: verseIndex };
    localStorage.setItem('gita_last_position', JSON.stringify(positionData));
}

function restoreReadingPosition() {
    const saved = localStorage.getItem('gita_last_position');
    if (saved) {
        try {
            const { chapter, verseIndex } = JSON.parse(saved);
            if (chapter && verseIndex !== undefined) {
                loadChapter(chapter, null, verseIndex);
                return;
            }
        } catch (err) {
            console.error("Failed to parse reading position:", err);
        }
    }
    loadChapter(1, null, 0);
}

// 6. Mobile Drawer Controls
function openSidebar() {
    closeDrawers();
    chapterSidebar?.classList.add('open');
    backdrop?.classList.remove('hidden');
}

function openAIPanel() {
    closeDrawers();
    aiPanel?.classList.add('open');
    backdrop?.classList.remove('hidden');
}

function closeDrawers() {
    chapterSidebar?.classList.remove('open');
    aiPanel?.classList.remove('open');
    backdrop?.classList.add('hidden');
}

// 7. Draggable Feature Logic (Touch + Mouse)
function makeDraggable(elmnt) {
    if (!elmnt) return;

    let posX = 0, posY = 0, initialX = 0, initialY = 0;
    let isDragging = false;

    elmnt.addEventListener('mousedown', startDrag);
    elmnt.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
        isDragging = false;
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        initialX = clientX;
        initialY = clientY;

        if (e.type === 'touchstart') {
            document.addEventListener('touchmove', moveDrag, { passive: false });
            document.addEventListener('touchend', stopDrag);
        } else {
            document.addEventListener('mousemove', moveDrag);
            document.addEventListener('mouseup', stopDrag);
        }
    }

    function moveDrag(e) {
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        posX = clientX - initialX;
        posY = clientY - initialY;

        if (Math.abs(posX) > 5 || Math.abs(posY) > 5) {
            isDragging = true;
        }

        if (isDragging) {
            if (e.cancelable) e.preventDefault();

            let newTop = elmnt.offsetTop + posY;
            let newLeft = elmnt.offsetLeft + posX;

            const maxTop = window.innerHeight - elmnt.offsetHeight;
            const maxLeft = window.innerWidth - elmnt.offsetWidth;

            newTop = Math.max(10, Math.min(newTop, maxTop - 10));
            newLeft = Math.max(10, Math.min(newLeft, maxLeft - 10));

            elmnt.style.top = `${newTop}px`;
            elmnt.style.left = `${newLeft}px`;
            elmnt.style.bottom = 'auto';
            elmnt.style.right = 'auto';

            initialX = clientX;
            initialY = clientY;
        }
    }

    function stopDrag() {
        document.removeEventListener('mousemove', moveDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', moveDrag);
        document.removeEventListener('touchend', stopDrag);
    }

    elmnt.addEventListener('click', (e) => {
        if (isDragging) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);
}

// 8. AI Context Management
function pinVerseToAI(verseId) {
    pinnedVerseId = verseId;
    if (pinnedLabel) pinnedLabel.innerText = verseId.replace('-', '.');
    pinnedChip?.classList.remove('hidden');
    if (aiInput) aiInput.placeholder = `Ask about Verse ${verseId.replace('-', '.')}...`;
}

function clearAIPin() {
    pinnedVerseId = null;
    pinnedChip?.classList.add('hidden');
    if (aiInput) aiInput.placeholder = "Ask the Gita anything...";
}

// 9. Handle AI Request
async function askAI() {
    const question = aiInput.value.trim();
    if (!question) return;

    // 1. Append User Message
    appendChatMessage(question, 'user-message');
    aiInput.value = '';
    
    // 2. Append Loading Message and hold reference
    const loadingEl = appendChatMessage('Thinking...', 'ai-message');
    askBtn.disabled = true;

    try {
        const payload = {
            question: question,
            language: document.getElementById('language-select')?.value || 'en',
            current_verse_id: pinnedVerseId
        };

        const res = await fetch(`${API_BASE}/ai/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.answer) {
            const errorMsg = data.detail || "Server error occurred while generating answer.";
            loadingEl.innerText = `Error: ${errorMsg}`;
            return;
        }
        
        // Parse Markdown
        let parsedAnswer = (typeof marked !== 'undefined') 
            ? marked.parse(data.answer) 
            : `<p>${data.answer.replace(/\n/g, '<br>')}</p>`;

        let finalHtml = `<div class="markdown-body">${parsedAnswer}</div>`;
        if (data.references && data.references.length > 0) {
            finalHtml += `<div class="citation-box">Sources: `;
            finalHtml += data.references.map(ref => `[Ch ${ref.chapter}, V ${ref.verse}]`).join(', ');
            finalHtml += `</div>`;
        }

        // Replace content directly on the AI message node
        loadingEl.innerHTML = finalHtml;

    } catch (err) {
        console.error("AI Request Failed:", err);
        loadingEl.innerText = "Error connecting to AI guide server.";
    } finally {
        askBtn.disabled = false;
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

function appendChatMessage(text, className) {
    const div = document.createElement('div');
    div.className = `chat-message ${className}`;
    div.innerText = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return div; // Return the DOM node directly
}

// 10. Event Listeners
function setupEventListeners() {
    verseSelectEl?.addEventListener('change', (e) => loadVerse(parseInt(e.target.value)));
    prevBtn?.addEventListener('click', () => loadVerse(currentVerseIndex - 1));
    nextBtn?.addEventListener('click', () => loadVerse(currentVerseIndex + 1));

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
            
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target)?.classList.remove('hidden');
        });
    });

    mobileMenuToggle?.addEventListener('click', openSidebar);
    closeSidebarBtn?.addEventListener('click', closeDrawers);
    mobileAiFab?.addEventListener('click', openAIPanel);
    closeAiBtn?.addEventListener('click', closeDrawers);
    backdrop?.addEventListener('click', closeDrawers);

    clearPinBtn?.addEventListener('click', clearAIPin);
    askBtn?.addEventListener('click', askAI);
    aiInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            askAI();
        }
    });
}

// Boot
init();