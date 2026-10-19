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
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');

// AI Panel Elements
const aiPanel = document.getElementById('ai-panel');
const mobileAiFab = document.getElementById('mobile-ai-fab');
const closeAiBtn = document.getElementById('close-ai-btn');
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
}

// 2. Fetch & Render Chapters
async function fetchChapters() {
    try {
        const res = await fetch(`${API_BASE}/chapters`);
        const chapters = await res.json();
        
        chapterListEl.innerHTML = '';
        chapters.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'chapter-btn';
            btn.innerHTML = `<strong>Ch ${ch.chapter_number}</strong>: ${ch.chapter_name_translation}`;
            btn.onclick = () => {
                loadChapter(ch.chapter_number, btn);
                closeDrawers(); // Close mobile menu after selection
            };
            chapterListEl.appendChild(btn);
        });
    } catch (err) {
        chapterListEl.innerHTML = '<p class="loading">Failed to load chapters.</p>';
    }
}

// 3. Load Specific Chapter
async function loadChapter(chapterNum, btnElement) {
    document.querySelectorAll('.chapter-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    try {
        const res = await fetch(`${API_BASE}/chapters/${chapterNum}/verses`);
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

        loadVerse(0); // Load first verse of chapter
    } catch (err) {
        console.error(err);
    }
}

// 4. Load & Display Specific Verse
function loadVerse(index) {
    if (index < 0 || index >= currentVerseList.length) return;
    
    currentVerseIndex = index;
    const verse = currentVerseList[index];
    
    // Update UI Controls
    verseSelectEl.value = index;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === currentVerseList.length - 1;

    // Populate Reader
    readerEmptyState.classList.add('hidden');
    verseContentEl.classList.remove('hidden');
    
    document.getElementById('verse-id-display').innerText = `Chapter ${verse.chapter}, Verse ${verse.verse}`;
    document.getElementById('sanskrit-text').innerText = verse.sanskrit.replace(/\|\|.*\|\|/g, '').replace(/\|/g, '');
    document.getElementById('transliteration-text').innerText = verse.transliteration;
    
    document.getElementById('translation-panel').innerText = verse.translation;
    document.getElementById('explanation-panel').innerText = verse.explanation || "No explanation available for this verse.";
    document.getElementById('word-meanings-panel').innerText = verse.wordMeanings || "No word meanings available.";

    // Automatically Pin Context for AI
    pinVerseToAI(verse.id);
}

// 5. Mobile Drawer Controls
function openSidebar() {
    closeDrawers();
    chapterSidebar.classList.add('open');
    backdrop.classList.remove('hidden');
}

function openAIPanel() {
    closeDrawers();
    aiPanel.classList.add('open');
    backdrop.classList.remove('hidden');
}

function closeDrawers() {
    chapterSidebar.classList.remove('open');
    aiPanel.classList.remove('open');
    backdrop.classList.add('hidden');
}

// 6. AI Context Management
function pinVerseToAI(verseId) {
    pinnedVerseId = verseId;
    pinnedLabel.innerText = verseId.replace('-', '.');
    pinnedChip.classList.remove('hidden');
    aiInput.placeholder = `Ask about Verse ${verseId.replace('-', '.')}...`;
}

function clearAIPin() {
    pinnedVerseId = null;
    pinnedChip.classList.add('hidden');
    aiInput.placeholder = "Ask the Gita anything...";
}

// 7. Handle AI Request
async function askAI() {
    const question = aiInput.value.trim();
    if (!question) return;

    // Append User Message
    appendChatMessage(question, 'user-message');
    aiInput.value = '';
    
    // Show loading state
    const loadingId = appendChatMessage('Thinking...', 'ai-message');
    askBtn.disabled = true;

    try {
        const payload = {
            question: question,
            language: document.getElementById('language-select').value,
            current_verse_id: pinnedVerseId // Null if cleared by user
        };

        const res = await fetch(`${API_BASE}/ai/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        // Replace loading message with actual answer and citations
        let finalHtml = `<p>${data.answer.replace(/\n/g, '<br>')}</p>`;
        if (data.references && data.references.length > 0) {
            finalHtml += `<div class="citation-box">Sources: `;
            finalHtml += data.references.map(ref => `[Ch ${ref.chapter}, V ${ref.verse}]`).join(', ');
            finalHtml += `</div>`;
        }

        document.getElementById(loadingId).innerHTML = finalHtml;

    } catch (err) {
        document.getElementById(loadingId).innerText = "Error connecting to AI guide.";
    } finally {
        askBtn.disabled = false;
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

function appendChatMessage(text, className) {
    const div = document.createElement('div');
    div.className = `chat-message ${className}`;
    div.id = 'msg-' + Date.now();
    div.innerText = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return div.id;
}

// 8. Event Listeners
function setupEventListeners() {
    // Verse Navigation
    verseSelectEl.addEventListener('change', (e) => loadVerse(parseInt(e.target.value)));
    prevBtn.addEventListener('click', () => loadVerse(currentVerseIndex - 1));
    nextBtn.addEventListener('click', () => loadVerse(currentVerseIndex + 1));

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
            
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.remove('hidden');
        });
    });

    // Mobile Drawer Triggers
    mobileMenuToggle.addEventListener('click', openSidebar);
    closeSidebarBtn.addEventListener('click', closeDrawers);
    mobileAiFab.addEventListener('click', openAIPanel);
    closeAiBtn.addEventListener('click', closeDrawers);
    backdrop.addEventListener('click', closeDrawers);

    // AI Controls
    clearPinBtn.addEventListener('click', clearAIPin);
    askBtn.addEventListener('click', askAI);
    aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            askAI();
        }
    });
}

// Boot
init();