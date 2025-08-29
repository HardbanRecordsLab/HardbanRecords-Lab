import React, { useState, FC, ReactNode, useMemo, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { create } from 'zustand';

// --- Gemini API Initialization ---
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Helper & Type Definitions ---
type LoadingState = {
  // Music AI
  metadata: boolean;
  releaseDate: boolean;
  forecast: boolean;
  syncMatch: boolean;
  coverArt: boolean;
  aandrScout: boolean;
  funding: boolean;
  collabFinder: boolean;
  listenerAnalytics: boolean;
  splitAgreement: boolean;
  // Digital Publishing AI
  proofread: boolean;
  plotAnalysis: boolean;
  enrichment: boolean;
  illustration: boolean;
  blurb: boolean;
  keywords: boolean;
  salesForecast: boolean;
  marketTrends: boolean;
  marketingAssets: boolean;
  audiobook: boolean;
  worldConsistency: boolean;
  rightsMatch: boolean;
  bookCover: boolean;
};

type View = 'DASHBOARD' | 'MUSIC' | 'PUBLISHING';

interface Task {
  id: number;
  text: string;
  dueDate: string;
  completed: boolean;
}

interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error';
}

// --- Music Publishing Types ---
interface ReleaseCollaborator {
  name: string;
  share: string;
}

interface Release {
    id: number;
    title: string;
    artist: string;
    status: 'Live' | 'In Review' | 'Submitted' | 'Processing';
    genre?: string;
    releaseDate?: string;
    splits: ReleaseCollaborator[];
}

// --- Digital Publishing Types ---
interface Collaborator {
  name: string;
  share: string; // Keep as string for input control
}

interface BookRights {
  territorial: boolean;
  translation: boolean;
  adaptation: boolean;
  audio: boolean;
  drm: boolean;
}

interface BookChapter {
    title: string;
    content: string;
}
interface BookIllustration {
    url: string;
    prompt: string;
}

interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  status: 'Published' | 'Processing' | 'Draft';
  rights: BookRights;
  splits: Collaborator[];
  chapters: BookChapter[];
  blurb: string;
  keywords: string;
  illustrations: BookIllustration[];
  coverImageUrl: string;
}

// --- Onboarding Types ---
interface TourStep {
    title: string;
    content: string;
    style: React.CSSProperties;
    arrowDirection: 'top' | 'bottom' | 'left' | 'right';
    view: View;
    targetTab?: string;
}

// --- Zustand Store Definition ---
interface AppState {
    isInitialized: boolean;
    view: View;
    loading: LoadingState;
    toasts: ToastMessage[];
    onboarding: {
        tourStepIndex: number;
        onboardingComplete: boolean;
        activeTabOverride?: string;
    };
    music: {
        releases: Release[];
        tasks: Task[];
    };
    publishing: {
        books: Book[];
        tasks: Task[];
    }
}

interface AppActions {
    initializeApp: () => Promise<void>;
    _saveState: () => Promise<void>;
    forceSave: () => Promise<void>;
    // View
    setView: (view: View) => void;
    // Loading
    setLoading: (key: keyof LoadingState, value: boolean) => void;
    // Toasts
    addToast: (message: string, type?: 'success' | 'error') => void;
    dismissToast: (id: number) => void;
    // Onboarding
    startTour: () => void;
    nextTourStep: () => void;
    skipTour: () => Promise<void>;
    // Music Data
    addRelease: (release: Omit<Release, 'id' | 'status'>) => Promise<void>;
    updateMusicSplits: (releaseId: number, splits: ReleaseCollaborator[]) => Promise<void>;
    addMusicTask: (text: string, dueDate: string) => Promise<void>;
    toggleMusicTask: (id: number) => Promise<void>;
    // Publishing Data
    addBook: (book: Omit<Book, 'id'>) => Promise<string>; // Returns new book ID
    updateBook: (bookId: number, data: Partial<Book>) => Promise<void>;
    updateChapterContent: (bookId: number, chapterIndex: number, content: string) => void;
    addPublishingTask: (text: string, dueDate: string) => Promise<void>;
    togglePublishingTask: (id: number) => Promise<void>;
}

type AppStore = AppState & AppActions;


// --- Backend API Configuration ---
const API_BASE_URL = 'http://localhost:3001/api';

const api = {
    async fetchData() {
        console.log("Fetching data from backend API...");
        const response = await fetch(`${API_BASE_URL}/data`);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Failed to fetch data from backend:", response.status, errorBody);
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        return response.json();
    },
    async saveData(fullState: { music: AppState['music']; publishing: AppState['publishing']; onboardingComplete: boolean }) {
        console.warn("Save functionality is not fully implemented on the backend yet. Simulating save.", fullState);
        // The backend README indicates that granular save endpoints are planned but not yet implemented.
        // This function simulates a successful save without making a network request.
        await new Promise(res => setTimeout(res, 250));
        return true;
    }
};


const useAppStore = create<AppStore>((set, get) => ({
    // Initial State
    isInitialized: false,
    view: 'DASHBOARD',
    loading: {
      metadata: false, releaseDate: false, forecast: false, syncMatch: false, coverArt: false, aandrScout: false, funding: false, collabFinder: false, listenerAnalytics: false, splitAgreement: false,
      proofread: false, plotAnalysis: false, enrichment: false, illustration: false, blurb: false, keywords: false, salesForecast: false, marketTrends: false, marketingAssets: false, audiobook: false, worldConsistency: false, rightsMatch: false, bookCover: false
    },
    toasts: [],
    onboarding: {
        tourStepIndex: -1,
        onboardingComplete: false, // Will be loaded from API
        activeTabOverride: undefined,
    },
    music: {
        releases: [],
        tasks: [],
    },
    publishing: {
        books: [],
        tasks: [],
    },

    // --- Actions ---
    
    // App Initialization
    initializeApp: async () => {
        set({ isInitialized: false });
        try {
            const data = await api.fetchData();
            set({
                music: data.music,
                publishing: data.publishing,
                onboarding: { ...get().onboarding, onboardingComplete: data.onboardingComplete },
                isInitialized: true,
            });
        } catch (error) {
            console.error("Failed to initialize app state from server:", error);
            get().addToast("Could not load data from the server. Please ensure the backend is running.", "error");
            // Initialize with empty state from the store definition, UI will not be blocked.
            set({ isInitialized: true });
        }
    },

    // A helper to save the relevant parts of the state
    _saveState: async () => {
        const { music, publishing, onboarding } = get();
        await api.saveData({ music, publishing, onboardingComplete: onboarding.onboardingComplete });
    },

    forceSave: async () => {
        await get()._saveState();
    },

    setView: (view) => set({ view }),
    setLoading: (key, value) => set(state => ({ loading: { ...state.loading, [key]: value } })),
    addToast: (message, type = 'success') => set(state => ({ toasts: [...state.toasts, { id: Date.now(), message, type }] })),
    dismissToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
    
    startTour: () => {
        if (!get().onboarding.onboardingComplete) {
            const firstStep = TOUR_STEPS[0];
            set(state => ({
                view: firstStep.view,
                onboarding: { ...state.onboarding, tourStepIndex: 0, activeTabOverride: firstStep.targetTab }
            }));
        }
    },
    nextTourStep: () => {
        const currentStepIndex = get().onboarding.tourStepIndex;
        if (currentStepIndex < TOUR_STEPS.length - 1) {
            const nextStepIndex = currentStepIndex + 1;
            const nextStep = TOUR_STEPS[nextStepIndex];
            set(state => ({
                view: nextStep.view,
                onboarding: { ...state.onboarding, tourStepIndex: nextStepIndex, activeTabOverride: nextStep.targetTab }
            }));
        } else {
            get().skipTour();
        }
    },
    skipTour: async () => {
        set({
            view: 'DASHBOARD',
            onboarding: { tourStepIndex: -1, onboardingComplete: true, activeTabOverride: undefined }
        });
        await get()._saveState();
        get().addToast("You're all set! Feel free to explore.", "success");
    },

    addRelease: async (releaseData) => {
        const newRelease: Release = { ...releaseData, id: Date.now(), status: 'Submitted' };
        set(state => ({ music: { ...state.music, releases: [...state.music.releases, newRelease] } }));
        await get()._saveState();
    },
    updateMusicSplits: async (releaseId, splits) => {
        set(state => ({
            music: { ...state.music, releases: state.music.releases.map(r => r.id === releaseId ? { ...r, splits } : r) }
        }));
        await get()._saveState();
    },
    addMusicTask: async (text, dueDate) => {
        set(state => ({
            music: { ...state.music, tasks: [...state.music.tasks, { id: Date.now(), text, dueDate, completed: false }] }
        }));
        await get()._saveState();
    },
    toggleMusicTask: async (id) => {
        set(state => ({
            music: { ...state.music, tasks: state.music.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) }
        }));
        await get()._saveState();
    },

    addBook: async (bookData) => {
        const newBook: Book = { ...bookData, id: Date.now() };
        set(state => ({
            publishing: { ...state.publishing, books: [...state.publishing.books, newBook] }
        }));
        await get()._saveState();
        return newBook.id.toString();
    },
    updateBook: async (bookId, data) => {
        set(state => ({
            publishing: { ...state.publishing, books: state.publishing.books.map(b => b.id === bookId ? { ...b, ...data } : b) }
        }));
        await get()._saveState();
    },
    updateChapterContent: (bookId, chapterIndex, content) => {
        set(state => ({
            publishing: {
                ...state.publishing,
                books: state.publishing.books.map(book => {
                    if (book.id === bookId) {
                        const updatedChapters = [...book.chapters];
                        updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], content };
                        return { ...book, chapters: updatedChapters };
                    }
                    return book;
                })
            }
        }));
        // Debounce saving for performance on frequent updates
        // In a real app, this would be a more robust autosave mechanism.
        setTimeout(() => get()._saveState(), 500);
    },
    addPublishingTask: async (text, dueDate) => {
        set(state => ({
            publishing: { ...state.publishing, tasks: [...state.publishing.tasks, { id: Date.now(), text, dueDate, completed: false }] }
        }));
        await get()._saveState();
    },
    togglePublishingTask: async (id) => {
        set(state => ({
            publishing: { ...state.publishing, tasks: state.publishing.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) }
        }));
        await get()._saveState();
    },
}));


// --- React Components ---

// --- Tooltip Component ---
interface TooltipProps {
  text: string;
  children: ReactNode;
  inline?: boolean;
}

const Tooltip: FC<TooltipProps> = ({ text, children, inline = false }) => {
    return (
        <div className={`tooltip-container ${inline ? 'tooltip-container--inline' : ''}`}>
            {children}
            <span className="tooltip-text" role="tooltip">{text}</span>
        </div>
    );
};


const Header = () => (
  <header className="header">
    <div className="logo">HardbanRecords<span>Lab</span></div>
  </header>
);

interface DashboardCardProps {
  icon: string;
  title: string;
  description: string;
  onClick?: () => void;
}

const DashboardCard: FC<DashboardCardProps> = ({ icon, title, description, onClick }) => (
    <button className="card" onClick={onClick} aria-label={title}>
        <div className="card-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
    </button>
);


interface AIToolCardProps {
  title: string;
  children: ReactNode;
  onGenerate?: () => void;
  isLoading?: boolean;
  buttonText?: string;
  tooltipText?: string;
}

const AIToolCard: FC<AIToolCardProps> = ({ title, children, onGenerate, isLoading, buttonText, tooltipText }) => {
  const button = (
    <button onClick={onGenerate} disabled={isLoading} className="card-button">
      {isLoading ? 'Generating...' : buttonText}
    </button>
  );

  return (
    <div className="ai-card">
      <h4>{title}</h4>
      {children}
      {onGenerate && buttonText && (
        tooltipText ? <Tooltip text={tooltipText}>{button}</Tooltip> : button
      )}
    </div>
  );
};

const ModuleView: FC<{ title: string; children: ReactNode, onBack: () => void }> = ({ title, children, onBack }) => {
    return (
    <div className="module-view">
        <div className="module-header">
            <button onClick={onBack} className="back-button" aria-label="Back to Dashboard">
                &larr; Back to Dashboard
            </button>
            <h1>{title}</h1>
        </div>
        {children}
    </div>
    );
};

const TaskManager: FC<{ module: 'music' | 'publishing' }> = ({ module }) => {
    const { music, publishing, addMusicTask, toggleMusicTask, addPublishingTask, togglePublishingTask } = useAppStore(state => ({
        music: state.music,
        publishing: state.publishing,
        addMusicTask: state.addMusicTask,
        toggleMusicTask: state.toggleMusicTask,
        addPublishingTask: state.addPublishingTask,
        togglePublishingTask: state.togglePublishingTask,
    }));
    
    const [newTask, setNewTask] = useState('');
    const [newDueDate, setNewDueDate] = useState('');

    const tasks = module === 'music' ? music.tasks : publishing.tasks;
    const addTask = module === 'music' ? addMusicTask : addPublishingTask;
    const toggleTask = module === 'music' ? toggleMusicTask : togglePublishingTask;
    
    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        addTask(newTask.trim(), newDueDate);
        setNewTask('');
        setNewDueDate('');
    };
    
    return (
         <div className="module-tool-card large-span">
            <h3>Task Management</h3>
             <div className="task-manager">
                <form onSubmit={handleAddTask} className="add-task-form">
                    <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a new task..." aria-label="New task" />
                    <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} aria-label="Due date" />
                    <button type="submit" aria-label="Add task">+</button>
                </form>
                <ul className="task-list">
                    {[...tasks]
                        .sort((a, b) => a.completed === b.completed ? 0 : a.completed ? 1 : -1)
                        .map(task => (
                        <li key={task.id} className={`task-item ${task.completed ? 'task-item--completed' : ''}`}>
                            <div className="task-content">
                                <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} id={`task-${task.id}`} aria-labelledby={`task-label-${task.id}`} />
                                <label htmlFor={`task-${task.id}`} className="task-checkbox-label" aria-hidden="true"></label>
                                <span id={`task-label-${task.id}`}>{task.text}</span>
                            </div>
                            {task.dueDate && <span className="due-date">{new Date(task.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// --- Toast Notification Components ---
const Toast: FC<{ message: ToastMessage; onDismiss: (id: number) => void }> = ({ message, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(message.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [message.id, onDismiss]);
    
    return (
        <div className={`toast toast--${message.type}`} role="alert">
            <p className="toast-message">{message.message}</p>
            <button onClick={() => onDismiss(message.id)} className="toast-close-btn" aria-label="Dismiss">
                &times;
            </button>
        </div>
    );
};

const ToastContainer: FC = () => {
    const { toasts, dismissToast } = useAppStore(state => ({ toasts: state.toasts, dismissToast: state.dismissToast }));
    return (
        <div className="toast-container" aria-live="assertive" aria-atomic="true">
            {toasts.map(toast => (
                <Toast key={toast.id} message={toast} onDismiss={dismissToast} />
            ))}
        </div>
    );
};

// --- Generic Modal Component ---
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{title}</h2>
                <div className="modal-body">
                    {children}
                </div>
                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                    <button type="button" className="card-button" onClick={onClose} style={{ minWidth: '120px' }}>Close</button>
                </div>
            </div>
        </div>
    );
};

// --- Generic Confirmation Modal Component ---
interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    onSave: () => void;
    onDiscard: () => void;
    children: ReactNode;
}

const ConfirmationModal: FC<ConfirmationModalProps> = ({ isOpen, onClose, title, children, onSave, onDiscard }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>{title}</h2>
                <div className="modal-body" style={{backgroundColor: 'transparent', border: 'none', padding: 0}}>
                    {children}
                </div>
                <div className="modal-actions">
                    <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
                    <button type="button" className="button-secondary" style={{ background: 'none', border: '1px solid var(--electric-coral)', color: 'var(--electric-coral)' }} onClick={onDiscard}>Discard Changes</button>
                    <button type="button" className="card-button" onClick={onSave}>Save & Continue</button>
                </div>
            </div>
        </div>
    );
};


// --- Onboarding Tour ---
const TOUR_STEPS: TourStep[] = [
    {
        title: "Welcome to Your Creative Universe!",
        content: "This is your dashboard. From here, you can access powerful toolkits for music and book publishing. Let's start with music.",
        style: { top: '55%', left: '25%', transform: 'translate(-50%, -50%)' },
        arrowDirection: 'right',
        view: 'DASHBOARD'
    },
    {
        title: "The Music Publishing Hub",
        content: "This is where you manage your music. Use the tabs to navigate between creating new releases, viewing analytics, managing rights, and more.",
        style: { top: '30%', left: '50%', transform: 'translateX(-50%)' },
        arrowDirection: 'top',
        view: 'MUSIC'
    },
    {
        title: "AI-Powered Studio",
        content: "In the 'Studio' tab, you can create new releases. Powerful AI tools are integrated to help you generate metadata and even create cover art instantly.",
        style: { top: '55%', right: '2rem' },
        arrowDirection: 'left',
        view: 'MUSIC',
        targetTab: 'studio',
    },
    {
        title: "Digital Publishing for Authors",
        content: "Now let's look at the hub for authors. This module is designed to assist you from the first draft to the final book.",
        style: { top: '55%', right: '25%', transform: 'translate(50%, -50%)' },
        arrowDirection: 'left',
        view: 'DASHBOARD'
    },
    {
        title: "The Digital Publishing Hub",
        content: "Similar to the music hub, this module is organized by tabs for every stage of publishing: writing, distribution, marketing, and rights.",
        style: { top: '30%', left: '50%', transform: 'translateX(-50%)' },
        arrowDirection: 'top',
        view: 'PUBLISHING'
    },
    {
        title: "Your AI Writing Partner",
        content: "The 'Studio' is your creative space. Here you'll find an AI Writing Assistant to proofread, analyze your plot, and enrich your prose.",
        style: { top: '50%', left: 'calc(50% - 175px)', transform: 'translate(-100%, -50%)' },
        arrowDirection: 'right',
        view: 'PUBLISHING',
        targetTab: 'studio',
    },
    {
        title: "You're Ready to Go!",
        content: "That's a quick overview of the platform. Feel free to explore and start creating. Enjoy your journey!",
        style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        arrowDirection: 'top',
        view: 'DASHBOARD'
    }
];


const OnboardingTour: FC<{ stepConfig: TourStep; onNext: () => void; onSkip: () => void; isLastStep: boolean; }> = ({ stepConfig, onNext, onSkip, isLastStep }) => (
    <div className="onboarding-overlay">
        <div className="onboarding-modal" style={stepConfig.style}>
            <div className={`arrow arrow-${stepConfig.arrowDirection}`} />
            <h4>{stepConfig.title}</h4>
            <p>{stepConfig.content}</p>
            <div className="onboarding-footer">
                <button onClick={onSkip} className="onboarding-skip">Skip Tour</button>
                <button onClick={onNext} className="card-button">
                    {isLastStep ? "Finish" : "Next"}
                </button>
            </div>
        </div>
    </div>
);

// --- Help Section Components ---
interface HelpTopic {
    title: string;
    description: string;
}

const HelpCard: FC<{ topic: HelpTopic }> = ({ topic }) => (
    <div className="help-card">
        <h4>{topic.title}</h4>
        <p>{topic.description}</p>
    </div>
);

const HelpView: FC<{ title: string; topics: HelpTopic[] }> = ({ title, topics }) => (
    <div className="module-tool-card large-span">
        <h3>{title}</h3>
        <div className="help-grid">
            {topics.map(topic => <HelpCard key={topic.title} topic={topic} />)}
        </div>
    </div>
);

// --- Module Implementations ---

const MUSIC_AI_HELP_TOPICS: HelpTopic[] = [
    { title: "Generate Metadata with AI", description: "Analyzes your track's title, artist, and genre to automatically generate a suitable 'mood' and a list of relevant 'tags'. This helps with discoverability on streaming platforms." },
    { title: "Suggest Release Date", description: "Uses AI to analyze current market trends for your specified genre and recommends an optimal release date within the next three months to maximize visibility." },
    { title: "AI Cover Art Generator", description: "Creates a unique, professional-quality album cover based on your track's information. It uses the imagen-4.0-generate-001 model to generate striking visuals tailored to your music's identity." },
    { title: "AI Revenue Forecast", description: "Provides a speculative earnings forecast for your release. It considers factors like genre popularity, streaming potential, and sync opportunities to give you a projection of potential revenue." },
    { title: "Advanced Listener Analytics", description: "Generates a detailed demographic profile of your likely audience based on your genre. This includes age range, interests, and listening habits, helping you target your marketing efforts." },
    { title: "AI Sync Matcher", description: "Compares your track against open briefs for TV, film, and game placements. It provides a match confidence score and justification, helping you quickly identify sync licensing opportunities." },
    { title: "AI Legal Assistant", description: "Drafts a simple, clear split sheet agreement based on the collaborators and royalty shares you've entered. This helps formalize your partnerships." },
    { title: "AI A&R Scout", description: "Acts as your personal A&R advisor, providing concrete, actionable career steps based on your artist profile and genre to help you grow your presence in the industry." },
    { title: "AI Funding Assistant", description: "Scans for and suggests relevant grants, stipends, and other funding opportunities available to independent artists in your genre." },
    { title: "AI Collaborator Finder", description: "Recommends potential collaborators, such as producers, vocalists, or songwriters, whose style and skills would complement your music." }
];


const MusicPublishingView: FC = () => {
    type Tab = 'studio' | 'releases' | 'analytics' | 'splits' | 'sync' | 'career' | 'tasks' | 'help';
    const [activeTab, setActiveTab] = useState<Tab>('studio');

    const { loading, setLoading, addToast, activeTabOverride, setView } = useAppStore(state => ({
        loading: state.loading,
        setLoading: state.setLoading,
        addToast: state.addToast,
        activeTabOverride: state.onboarding.activeTabOverride,
        setView: state.setView
    }));
    const { releases, updateMusicSplits, addRelease } = useAppStore(state => ({
        releases: state.music.releases,
        updateMusicSplits: state.updateMusicSplits,
        addRelease: state.addRelease
    }));

    // Navigation confirmation state
    const [isNavModalOpen, setNavModalOpen] = useState(false);
    const [nextNavigationAction, setNextNavigationAction] = useState<(() => void) | null>(null);

    // Studio Tab State (ephemeral UI state)
    const [artist, setArtist] = useState('Synth Rider');
    const [title, setTitle] = useState('Neon Pulse');
    const [genre, setGenre] = useState('Synthwave');
    const [mood, setMood] = useState('');
    const [tags, setTags] = useState('');
    const [suggestedDate, setSuggestedDate] = useState('');
    const [generatedCoverArt, setGeneratedCoverArt] = useState('');
    const [forecastResult, setForecastResult] = useState('');

    // Splits Tab State
    const [selectedReleaseId, setSelectedReleaseId] = useState<string>('');
    const [collaborators, setCollaborators] = useState<ReleaseCollaborator[]>([]);
    const [splitAgreement, setSplitAgreement] = useState('');
    const selectedRelease = useMemo(() => releases.find(r => r.id === parseInt(selectedReleaseId, 10)), [releases, selectedReleaseId]);

    // Sync Tab State
    const [selectedBriefId, setSelectedBriefId] = useState<string>('');
    const [syncMatchResult, setSyncMatchResult] = useState('');

    // Career Tab State
    const [aandrResult, setAandrResult] = useState('');
    const [fundingResult, setFundingResult] = useState('');
    const [collabFinderResult, setCollabFinderResult] = useState('');
    
    // Analytics Tab State
    const [listenerAnalytics, setListenerAnalytics] = useState('');
    
    const syncBriefs = useMemo(() => [
        { id: 'brief1', title: 'Upbeat Indie Pop for a Summer Ad Campaign', description: 'Looking for a catchy, optimistic indie pop or synth-pop track. Must have a strong hook and positive vibes. Female vocals preferred but not required.'},
        { id: 'brief2', 'title': 'Dark, Atmospheric Theme for a Sci-Fi Thriller', description: 'Need a tense, atmospheric electronic track. Minimalist, with a sense of dread and suspense. Think Blade Runner meets Stranger Things.'},
    ], []);

    const isDirty = useMemo(() => {
        if (!selectedRelease || activeTab !== 'splits') return false;
        // Filter out any new, completely empty collaborator rows before comparing.
        const cleanedCurrentSplits = collaborators.filter(c => c.name.trim() !== '' || c.share.trim() !== '');

        // Deep compare the cleaned current state with the original state.
        // Using JSON.stringify is simple and sufficient here because the UI prevents reordering.
        return JSON.stringify(cleanedCurrentSplits) !== JSON.stringify(selectedRelease.splits);
    }, [collaborators, selectedRelease, activeTab]);

    const handleNavigate = useCallback((action: () => void) => {
        if (isDirty) {
            setNextNavigationAction(() => action);
            setNavModalOpen(true);
        } else {
            action();
        }
    }, [isDirty]);

    useEffect(() => {
        if (activeTabOverride) {
            setActiveTab(activeTabOverride as Tab);
        }
    }, [activeTabOverride]);
    
     useEffect(() => {
        if (releases.length > 0 && !selectedReleaseId) {
            setSelectedReleaseId(releases[0].id.toString());
        }
    }, [releases, selectedReleaseId]);

    useEffect(() => {
        if (activeTab === 'splits' && selectedRelease) {
            setCollaborators([...selectedRelease.splits]);
        }
    }, [selectedRelease, activeTab]);

    const handleGenerateMetadata = async () => {
        if (!artist || !title || !genre) return;
        setLoading('metadata', true);
        try {
            const prompt = `Generate music metadata for a track.
            Artist: "${artist}"
            Title: "${title}"
            Genre: "${genre}"
            
            Provide a response in JSON format with the following keys: "mood" (a short, descriptive phrase), and "tags" (a comma-separated list of 3-5 relevant tags).`;
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            mood: { type: Type.STRING },
                            tags: { type: Type.STRING },
                        },
                    },
                }
            });
    
            const data = JSON.parse(response.text);
            setMood(data.mood || '');
            setTags(data.tags || '');
            addToast('Metadata generated successfully.', 'success');
        } catch (error) {
            console.error("Error generating metadata:", error);
            addToast("Failed to generate metadata. Please try again.", 'error');
        } finally {
            setLoading('metadata', false);
        }
    };
    
    const handleSuggestDate = async () => {
        if (!genre) return;
        setLoading('releaseDate', true);
        setSuggestedDate('');
        try {
            const prompt = `Based on the music genre "${genre}", suggest an optimal release date within the next 3 months. Provide a single date and a brief one-sentence justification.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setSuggestedDate(response.text);
        } catch (error) {
            console.error("Error suggesting release date:", error);
            addToast("Failed to suggest a date. Please try again later.", 'error');
        } finally {
            setLoading('releaseDate', false);
        }
    };

    const handleForecast = async () => {
        if (!genre) return;
        setLoading('forecast', true);
        setForecastResult('');
        try {
            const prompt = `Provide a speculative, short-paragraph earnings forecast for a new release in the "${genre}" music genre. Consider factors like streaming potential, sync licensing opportunities, and niche audience engagement. This is for a fictional scenario, not financial advice.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setForecastResult(response.text);
        } catch (error) {
            console.error("Error forecasting revenue:", error);
            addToast("Failed to generate a forecast. The model may be busy.", 'error');
        } finally {
            setLoading('forecast', false);
        }
    };
    
    const handleFindSyncMatch = async () => {
        if (releases.length === 0) {
            addToast("You don't have any releases to check for a sync match.", 'error');
            return;
        }
        const brief = syncBriefs.find(b => b.id === selectedBriefId);
        const release = releases[0]; // Using first release for demo purposes
        if (!brief) {
            addToast("Please select a brief to find a match.", 'error');
            return;
        }
        setLoading('syncMatch', true);
        setSyncMatchResult('');
        try {
            const prompt = `Analyze if the music track "${release.title}" by "${release.artist}", a "${release.genre}" song, is a good match for the following sync brief: "${brief.title} - ${brief.description}". Provide a "Match Confidence" score (e.g., High, Medium, Low) and a brief justification.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setSyncMatchResult(response.text);
        } catch (error) {
            console.error("Error finding sync match:", error);
            addToast("Failed to find a sync match. Please try again later.", 'error');
        } finally {
            setLoading('syncMatch', false);
        }
    };

    const handleAddCollaborator = () => setCollaborators(prev => [...prev, { name: '', share: '' }]);
    const handleCollaboratorChange = (index: number, field: 'name' | 'share', value: string) => {
        const newCollaborators = [...collaborators];
        if (field === 'share') {
            // Only allow numeric values (including a single decimal point) up to 100.
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                if (parseFloat(value) > 100) {
                     newCollaborators[index][field] = '100';
                } else {
                     newCollaborators[index][field] = value;
                }
                setCollaborators(newCollaborators);
            }
        } else {
            newCollaborators[index][field] = value;
            setCollaborators(newCollaborators);
        }
    };
    const handleSaveSplits = () => {
        if(!selectedRelease) return;
        // Filter out empty rows before saving
        const cleanedCollaborators = collaborators.filter(c => c.name.trim() !== '' || c.share.trim() !== '');
        updateMusicSplits(selectedRelease.id, cleanedCollaborators);
        // Also update local state to reflect the cleaned version
        setCollaborators(cleanedCollaborators);
        addToast(`Splits for "${selectedRelease.title}" have been updated.`, 'success');
    };
    const totalSplit = useMemo(() => collaborators.reduce((sum, collab) => sum + (parseFloat(collab.share) || 0), 0), [collaborators]);

    const handleGenerateCoverArt = async () => {
        if (!title || !artist) return;
        setLoading('coverArt', true);
        setGeneratedCoverArt('');
        try {
            const prompt = `An abstract, minimalist album cover for a music artist named "${artist}". The release is called "${title}". The genre is ${genre}. Use neon colors on a dark background.`;
            const response = await ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt: prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' } });
            setGeneratedCoverArt(`data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`);
            addToast('Cover art generated successfully!', 'success');
        } catch (error) { 
            console.error("Error generating cover art:", error);
            addToast("Failed to generate cover art. The model may be unavailable.", 'error');
        } 
        finally { setLoading('coverArt', false); }
    };
    
    const handleSubmitRelease = () => {
        if (!title || !artist || !genre) {
            addToast("Please fill in Artist, Title, and Genre.", 'error');
            return;
        }
        const newReleaseData: Omit<Release, 'id' | 'status'> = {
            title,
            artist,
            genre,
            splits: [{ name: artist, share: '100'}]
        };
        addRelease(newReleaseData);
        addToast(`"${title}" has been submitted for distribution!`, 'success');
        setTitle('');
        setArtist('');
        setGenre('');
        setMood('');
        setTags('');
        setGeneratedCoverArt('');
        setActiveTab('releases');
    };

    const handleAandrScout = async () => {
        if (!artist || !genre) return;
        setLoading('aandrScout', true); setAandrResult('');
        try {
            const prompt = `As an AI A&R Scout, analyze artist "${artist}" in genre "${genre}" and suggest three concrete next career steps.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setAandrResult(response.text);
        } catch (e) { console.error(e); addToast("Failed to get career advice from AI Scout.", 'error'); } finally { setLoading('aandrScout', false);}
    };
    
    const handleFindFunding = async () => {
        if (!genre) return;
        setLoading('funding', true); setFundingResult('');
        try {
            const prompt = `As an AI Funding Assistant for musicians, find 3 potential grants or stipends for an independent artist in the "${genre}" genre. Provide names and a brief description for each.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setFundingResult(response.text);
        } catch (e) { console.error(e); addToast("Failed to find funding opportunities.", 'error'); } finally { setLoading('funding', false);}
    };
    
    const handleFindCollaborators = async () => {
        if (!genre) return;
        setLoading('collabFinder', true); setCollabFinderResult('');
        try {
            const prompt = `As an AI Collaborator Finder, suggest 3 types of collaborators (e.g., producer with specific skills, vocalist with a certain style) for a "${genre}" artist.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setCollabFinderResult(response.text);
        } catch (e) { console.error(e); addToast("Failed to find collaborators.", 'error'); } finally { setLoading('collabFinder', false);}
    };
    
    const handleGetListenerAnalytics = async () => {
        if (!genre) return;
        setLoading('listenerAnalytics', true); setListenerAnalytics('');
        try {
            const prompt = `Generate a plausible listener demographic profile for an artist in the "${genre}" genre. Include age range, common interests, and primary listening platforms. Format as a short paragraph.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setListenerAnalytics(response.text);
        } catch (e) { console.error(e); addToast("Failed to generate listener analytics.", 'error'); } finally { setLoading('listenerAnalytics', false);}
    };
    
    const handleGenerateSplitAgreement = async () => {
        if (!selectedRelease) return;
        setLoading('splitAgreement', true); setSplitAgreement('');
        try {
            const collabList = collaborators.map(c => `${c.name}: ${c.share}%`).join(', ');
            const prompt = `Generate a simple, legally-inspired split sheet agreement text for the track "${selectedRelease.title}" by ${selectedRelease.artist}. The collaborators and their shares are: ${collabList}. The text should be a simple paragraph outlining the agreement.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setSplitAgreement(response.text);
        } catch (e) { console.error(e); addToast("Failed to generate split agreement text.", 'error'); } finally { setLoading('splitAgreement', false);}
    };

    // --- Navigation Modal Handlers ---
    const handleCancelNavigation = () => {
        setNavModalOpen(false);
        setNextNavigationAction(null);
    };

    const handleDiscardAndNavigate = () => {
        if (selectedRelease) {
            setCollaborators([...selectedRelease.splits]);
        }
        if (nextNavigationAction) {
            nextNavigationAction();
        }
        handleCancelNavigation();
    };

    const handleSaveAndNavigate = () => {
        handleSaveSplits();
        if (nextNavigationAction) {
            nextNavigationAction();
        }
        handleCancelNavigation();
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'studio':
                return (
                    <div className="module-content-grid large-span">
                        <div className="module-tool-card">
                            <h3>Create New Release</h3>
                            <div className="detailed-form">
                                <div className="form-section">
                                    <label htmlFor="artist">Artist</label>
                                    <input id="artist" type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="e.g., Synth Rider"/>
                                </div>
                                <div className="form-section">
                                    <label htmlFor="title">Title</label>
                                    <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Neon Pulse"/>
                                </div>
                                <div className="form-section">
                                    <label htmlFor="genre">Genre</label>
                                    <input id="genre" type="text" value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g., Synthwave"/>
                                </div>
                            </div>
                            <div className="ai-section">
                                <h4><span className="ai-badge">AI</span> Publishing Assistant</h4>
                                <div className="detailed-form">
                                    <div className="form-section">
                                        <label htmlFor="mood">Mood</label>
                                        <input id="mood" type="text" value={mood} onChange={e => setMood(e.target.value)} placeholder="AI will generate this..." />
                                    </div>
                                    <div className="form-section">
                                        <label htmlFor="tags">Tags (comma-separated)</label>
                                        <input id="tags" type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="AI will generate this..."/>
                                    </div>
                                    <Tooltip text="Uses AI to generate a mood and descriptive tags based on the artist, title, and genre.">
                                        <button onClick={handleGenerateMetadata} disabled={loading.metadata || !artist || !title || !genre} className="card-button">
                                            {loading.metadata ? 'Generating...' : 'Generate Metadata with AI'}
                                        </button>
                                    </Tooltip>
                                    <Tooltip text="Leverages AI to recommend an optimal release date based on genre trends and market analysis.">
                                        <button onClick={handleSuggestDate} disabled={loading.releaseDate || !genre} className="card-button">
                                            {loading.releaseDate ? 'Suggesting...' : 'Suggest Release Date'}
                                        </button>
                                    </Tooltip>
                                    {suggestedDate && <div className="result-area"><pre>{suggestedDate}</pre></div>}
                                </div>
                            </div>
                             <button className="card-button" onClick={handleSubmitRelease} style={{backgroundColor: 'var(--neon-mint)', color: 'var(--rich-black)', marginTop: '1rem'}}>
                                Submit for Distribution
                            </button>
                        </div>
                        <div className="module-tool-card">
                            <AIToolCard
                                title="AI Cover Art Generator"
                                onGenerate={handleGenerateCoverArt}
                                isLoading={loading.coverArt}
                                buttonText="Generate Art from Track Info"
                                tooltipText="Generates a unique, AI-powered album cover using the track's info (artist, title, genre).">
                                <p>Uses Title, Artist, and Genre to generate a unique cover.</p>
                                <div className="result-area">
                                    {loading.coverArt ? <div className="loader"></div> : (generatedCoverArt ? <img src={generatedCoverArt} alt="Generated cover art" /> : <p>Your generated cover art will appear here.</p>)}
                                </div>
                            </AIToolCard>
                             <div className="studio-tool-section">
                                <h4>Web DAW "Final Touch"</h4>
                                <p>A simple editor for final tweaks.</p>
                                <div className="web-daw-placeholder">
                                    <div className="daw-timeline"></div>
                                    <div className="daw-controls">
                                        <button>Trim Silence</button>
                                        <button>Fade In</button>
                                        <button>Fade Out</button>
                                    </div>
                                </div>
                            </div>
                            <div className="studio-tool-section">
                                <h4>Integrated NFT Minting</h4>
                                <p>Create digital collectibles from your music or artwork.</p>
                                <button className="card-button" onClick={() => addToast('Wallet connection is not available in this demo.', 'error')}>Mint as NFT</button>
                            </div>
                        </div>
                    </div>
                );
            case 'releases': return ( 
                <div className="module-list-card large-span">
                    <h3>Your Releases</h3>
                     <ul className="item-list">
                        {releases.map(release => (
                            <li key={release.id}>
                                <div>
                                    <span className="item-title">{release.title}</span>
                                    <span className="item-subtitle">{release.artist}</span>
                                </div>
                                <span className={`item-status status--${release.status.toLowerCase().replace(' ', '-')}`}>{release.status}</span>
                            </li>
                        ))}
                    </ul>
                </div> 
            );
            case 'analytics':
                 return (
                    <div className="large-span">
                         <div className="module-info-grid">
                            <div className="module-info-card">
                                <h4>Total Revenue</h4>
                                <div className="stat">$1,284</div>
                            </div>
                             <div className="module-info-card">
                                <h4>Total Streams</h4>
                                <div className="stat">321k</div>
                            </div>
                             <div className="module-info-card">
                                <h4>Top Platform</h4>
                                <div className="stat">Spotify</div>
                            </div>
                         </div>
                         <div className="module-content-grid">
                            <AIToolCard title="AI Revenue Forecast" onGenerate={handleForecast} isLoading={loading.forecast} buttonText="Forecast Earnings" tooltipText="AI provides a speculative earnings forecast, considering streaming potential and audience for the genre.">
                                <p>Get a speculative earnings forecast for your new release based on its genre.</p>
                                <div className="result-area">{loading.forecast ? <div className="loader"/> : <pre>{forecastResult || 'Forecast will appear here.'}</pre>}</div>
                            </AIToolCard>
                            <AIToolCard title="Advanced Listener Analytics" onGenerate={handleGetListenerAnalytics} isLoading={loading.listenerAnalytics} buttonText="Generate Listener Profile" tooltipText="Generates a plausible listener demographic profile based on the music genre.">
                                <p>Use AI to understand your audience demographics based on your genre.</p>
                                <div className="result-area">{loading.listenerAnalytics ? <div className="loader"/> : <pre>{listenerAnalytics || 'Insights will appear here.'}</pre>}</div>
                            </AIToolCard>
                        </div>
                    </div>
                 );
            case 'splits':
                 return (
                    <div className="module-tool-card large-span">
                        <h3>Manage Royalty Splits</h3>
                        <div className="form-section">
                            <label htmlFor="release-select">Select Release</label>
                             <select id="release-select" className="styled-select" value={selectedReleaseId} onChange={e => setSelectedReleaseId(e.target.value)}>
                                {releases.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                            </select>
                        </div>
                        {selectedRelease && (
                            <div className="split-sheet-editor">
                                {collaborators.map((collab, index) => (
                                    <div key={index} className="collaborator-row">
                                        <input type="text" placeholder="Collaborator Name" value={collab.name} onChange={e => handleCollaboratorChange(index, 'name', e.target.value)} />
                                        <input type="text" inputMode="decimal" placeholder="%" className="share-input" value={collab.share} onChange={e => handleCollaboratorChange(index, 'share', e.target.value)} />
                                    </div>
                                ))}
                                <button onClick={handleAddCollaborator} className="add-collaborator-btn">+ Add Collaborator</button>
                                <div className={`total-percentage ${totalSplit !== 100 ? 'total-percentage--invalid' : ''}`}>
                                    Total: {totalSplit}%
                                </div>
                                <button onClick={handleSaveSplits} className="card-button" disabled={totalSplit !== 100}>Save Splits</button>
                            </div>
                        )}
                        {selectedRelease && (
                            <AIToolCard title="AI Legal Assistant" onGenerate={handleGenerateSplitAgreement} isLoading={loading.splitAgreement} buttonText="Generate Split Sheet Agreement" tooltipText="The AI Legal Assistant drafts a simple split sheet agreement based on the defined collaborators and shares.">
                                <p>Generate a simple legal agreement based on the collaborators and shares you've defined above.</p>
                                <div className="result-area">{loading.splitAgreement ? <div className="loader"/> : <pre>{splitAgreement || 'Agreement text will appear here.'}</pre>}</div>
                            </AIToolCard>
                        )}
                    </div>
                );
            case 'sync': return ( 
                <div className="module-content-grid large-span">
                    <div className="module-list-card">
                        <h3>Available Sync Briefs</h3>
                        <ul className="item-list">
                            {syncBriefs.map(brief => (
                                <li key={brief.id} onClick={() => setSelectedBriefId(brief.id)} className={selectedBriefId === brief.id ? 'active' : ''}>
                                    <div>
                                        <span className="item-title">{brief.title}</span>
                                        <p className="item-description">{brief.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <AIToolCard 
                        title="AI Sync Matcher"
                        onGenerate={handleFindSyncMatch}
                        isLoading={loading.syncMatch}
                        buttonText="Find Match with AI"
                        tooltipText="AI analyzes your track against the selected brief to determine its suitability for sync licensing opportunities."
                    >
                        <p>
                            Select a brief, and AI will check compatibility with{' '}
                            {releases.length > 0
                                ? `your latest track ('${releases[0].title}').`
                                : 'one of your tracks (when available).'
                            }
                        </p>
                        <div className="result-area">
                            {loading.syncMatch ? <div className="loader" /> : <pre>{syncMatchResult || 'Match analysis will appear here.'}</pre>}
                        </div>
                    </AIToolCard>
                </div>
            );
            case 'career':
                return (
                    <div className="large-span module-content-grid">
                        <AIToolCard title="AI A&R Scout" onGenerate={handleAandrScout} isLoading={loading.aandrScout} buttonText="Get Career Advice" tooltipText="The AI A&R Scout suggests concrete career steps to help advance your artist journey.">
                            <p>Get personalized career steps based on your artist profile.</p>
                            <div className="result-area">{loading.aandrScout ? <div className="loader"/> : <pre>{aandrResult || 'Your career advice will appear here.'}</pre>}</div>
                        </AIToolCard>
                        <AIToolCard title="AI Funding Assistant" onGenerate={handleFindFunding} isLoading={loading.funding} buttonText="Find Grants & Stipends" tooltipText="Finds potential grants and funding opportunities relevant to your music genre.">
                            <p>Discover funding opportunities relevant to your genre.</p>
                            <div className="result-area">{loading.funding ? <div className="loader"/> : <pre>{fundingResult || 'Funding opportunities will appear here.'}</pre>}</div>
                        </AIToolCard>
                        <AIToolCard title="AI Collaborator Finder" onGenerate={handleFindCollaborators} isLoading={loading.collabFinder} buttonText="Find Collaborators" tooltipText="Get AI-powered suggestions for producers, vocalists, or other artists who would be a good creative match.">
                            <p>Get suggestions for producers, vocalists, and writers.</p>
                            <div className="result-area">{loading.collabFinder ? <div className="loader"/> : <pre>{collabFinderResult || 'Collaborator suggestions will appear here.'}</pre>}</div>
                        </AIToolCard>
                    </div>
                );
            case 'tasks':
                return <TaskManager module="music" />;
            case 'help':
                return <HelpView title="Music AI Tools Help" topics={MUSIC_AI_HELP_TOPICS} />;
            default: return null;
        }
    }

    return (
        <ModuleView title="Music Publishing AI" onBack={() => handleNavigate(() => setView('DASHBOARD'))}>
             <div className="tabs-container">
                <nav className="tab-nav">
                    {(['studio', 'releases', 'analytics', 'splits', 'sync', 'career', 'tasks', 'help'] as Tab[]).map(tab => (
                        <button key={tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => handleNavigate(() => setActiveTab(tab))}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </nav>
                <div className="tab-content">
                    {renderContent()}
                </div>
            </div>
            <ConfirmationModal
                isOpen={isNavModalOpen}
                onClose={handleCancelNavigation}
                title="Unsaved Changes"
                onSave={handleSaveAndNavigate}
                onDiscard={handleDiscardAndNavigate}
            >
                <p>You have unsaved changes. Would you like to save them before navigating away?</p>
            </ConfirmationModal>
        </ModuleView>
    );
};

const RIGHTS_DEFINITIONS: { key: keyof BookRights; label: string, description: string }[] = [
    { key: 'territorial', label: 'Worldwide Territorial Rights', description: 'Grants rights for distribution and sale worldwide.' },
    { key: 'translation', label: 'Translation Rights', description: 'Grants rights for translating the work into other languages.' },
    { key: 'adaptation', label: 'Film & TV Adaptation Rights', description: 'Grants rights for adapting the book into other media, like film, TV, or games.' },
    { key: 'audio', label: 'Audiobook Rights', description: 'Grants rights for creating and distributing an audiobook version.' },
    { key: 'drm', label: 'Digital Rights Management (DRM)', description: 'Encrypts the ebook to prevent unauthorized copying and sharing.' },
];

const PUBLISHING_AI_HELP_TOPICS: HelpTopic[] = [
    { title: "AI Writing Assistant - Proofread", description: "Scans your manuscript for grammatical errors, spelling mistakes, and typos, offering instant corrections to polish your writing." },
    { title: "AI Writing Assistant - Analyze Plot", description: "Reads your chapter and provides a high-level analysis of its plot, identifying potential pacing issues, inconsistencies, or plot holes." },
    { title: "AI Writing Assistant - Enrich Prose", description: "Rewrites your text to be more descriptive, evocative, and engaging, enhancing your narrative style while preserving the original meaning." },
    { title: "AI Illustration Assistant", description: "Generates high-quality, professional illustrations based on a text prompt you provide. It uses the imagen-4.0-generate-001 model to bring scenes from your book to life." },
    { title: "AI Book Cover Generator", description: "Designs a compelling and marketable book cover based on your title, author, and genre. It aims for a modern, eye-catching design suitable for online retailers." },
    { title: "AI Sales Forecast", description: "Generates a speculative sales forecast for your book, taking into account genre trends, market conditions, and potential audience size." },
    { title: "AI Blurb Generator", description: "Analyzes the beginning of your manuscript to craft a captivating book blurb designed to hook potential readers." },
    { title: "AI Keyword Generator", description: "Creates a list of effective SEO keywords tailored to your book's genre and themes, improving its discoverability on platforms like Amazon." },
    { title: "AI Social Media Assistant", description: "Drafts ready-to-use social media posts for announcing your book release, including relevant hashtags to maximize reach." },
    { title: "AI Consistency Checker", description: "Cross-references your current manuscript chapter against your 'World Bible' to ensure consistency in character names, locations, rules, and plot points." },
];


const DigitalPublishingAIView: FC = () => {
    type Tab = 'studio' | 'distribution' | 'analytics' | 'rights_splits' | 'marketing' | 'audiobook' | 'world_building' | 'tasks' | 'help';
    const [activeTab, setActiveTab] = useState<Tab>('studio');
    
    const { loading, setLoading, addToast, activeTabOverride, setView, forceSave } = useAppStore(state => ({
        loading: state.loading,
        setLoading: state.setLoading,
        addToast: state.addToast,
        activeTabOverride: state.onboarding.activeTabOverride,
        setView: state.setView,
        forceSave: state.forceSave,
    }));
    const { books, addBook, updateBook, updateChapterContent } = useAppStore(state => ({
        books: state.publishing.books,
        addBook: state.addBook,
        updateBook: state.updateBook,
        updateChapterContent: state.updateChapterContent
    }));

    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const selectedBook = useMemo(() => books.find(b => b.id === parseInt(selectedBookId, 10)), [books, selectedBookId]);

    // Navigation confirmation state
    const [isNavModalOpen, setNavModalOpen] = useState(false);
    const [nextNavigationAction, setNextNavigationAction] = useState<(() => void) | null>(null);
    const [isManuscriptDirty, setManuscriptDirty] = useState(false);

    // Create Book Modal State
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [newBookTitle, setNewBookTitle] = useState('');
    const [newBookAuthor, setNewBookAuthor] = useState('');
    const [newBookGenre, setNewBookGenre] = useState('Sci-Fi');
    
    // AI Analysis Modal State
    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');


    // Various state variables for all tabs
    const [manuscriptText, setManuscriptText] = useState('');
    const [lastManuscriptState, setLastManuscriptState] = useState<string | null>(null);
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);
    const [illustrationPrompt, setIllustrationPrompt] = useState('');
    const [generatedIllustration, setGeneratedIllustration] = useState<BookIllustration | null>(null);
    const [salesForecast, setSalesForecast] = useState('');
    const [marketTrends, setMarketTrends] = useState('');
    const [marketingAssets, setMarketingAssets] = useState('');

    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

    const [audiobookSampleUrl, setAudiobookSampleUrl] = useState('');
    const [worldBuildingEntry, setWorldBuildingEntry] = useState('Characters:\n- Detective Kaito: A grizzled veteran of the force.\n\nLocations:\n- Neo-Kyoto: A sprawling metropolis drenched in neon.');
    const [consistencyResult, setConsistencyResult] = useState('');
    const [rightsMatchResult, setRightsMatchResult] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const manuscriptEditorRef = useRef<HTMLTextAreaElement>(null);

    const areSplitsDirty = useMemo(() => {
        if (!selectedBook || activeTab !== 'rights_splits') return false;
        // Filter out any new, completely empty collaborator rows before comparing.
        const cleanedCurrentSplits = collaborators.filter(c => c.name.trim() !== '' || c.share.trim() !== '');

        // Deep compare the cleaned current state with the original state.
        return JSON.stringify(cleanedCurrentSplits) !== JSON.stringify(selectedBook.splits);
    }, [collaborators, selectedBook, activeTab]);

    const isDirty = useMemo(() => {
        if (activeTab === 'studio') return isManuscriptDirty;
        if (activeTab === 'rights_splits') return areSplitsDirty;
        return false;
    }, [activeTab, isManuscriptDirty, areSplitsDirty]);

    const handleNavigate = useCallback((action: () => void) => {
        if (isDirty) {
            setNextNavigationAction(() => action);
            setNavModalOpen(true);
        } else {
            action();
        }
    }, [isDirty]);

    // --- AI Writing Assistant Handlers ---
    const applyAiChange = useCallback((newText: string) => {
        if (selectedBook) {
            setLastManuscriptState(manuscriptText);
            setManuscriptText(newText);
            setManuscriptDirty(true);
            updateChapterContent(selectedBook.id, activeChapterIndex, newText);
        }
    }, [selectedBook, manuscriptText, activeChapterIndex, updateChapterContent]);
    
    const handleProofread = useCallback(async () => {
        if (!manuscriptText) return;
        setLoading('proofread', true);
        try {
            const prompt = `Proofread the following text for grammar and spelling errors. Only return the corrected text, without any introductory phrases:\n---\n${manuscriptText}`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            applyAiChange(response.text);
            addToast("Proofreading complete.", "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to proofread the text.", 'error');
        } finally {
            setLoading('proofread', false);
        }
    }, [manuscriptText, setLoading, applyAiChange, addToast]);
    
    const handlePlotAnalysis = useCallback(async () => {
        if (!manuscriptText) return;
        setLoading('plotAnalysis', true);
        setAnalysisResult('');
        try {
            const prompt = `Analyze the plot of the following text for potential issues like plot holes, pacing problems, or character inconsistencies. Provide a concise, bulleted list of your findings:\n---\n${manuscriptText}`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setAnalysisResult(response.text);
            setAnalysisModalOpen(true);
        } catch (e) {
            console.error(e);
            addToast("Failed to analyze the plot.", 'error');
        } finally {
            setLoading('plotAnalysis', false);
        }
    }, [manuscriptText, setLoading, addToast]);

    const handleEnrichProse = useCallback(async () => {
        if (!manuscriptText) return;
        setLoading('enrichment', true);
        try {
            const prompt = `Rewrite the following text to be more descriptive and engaging. Enhance the prose, but keep the original plot and meaning intact. Only return the rewritten text:\n---\n${manuscriptText}`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            applyAiChange(response.text);
            addToast("Prose has been enriched.", "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to enrich the prose.", 'error');
        } finally {
            setLoading('enrichment', false);
        }
    }, [manuscriptText, setLoading, applyAiChange, addToast]);
     
     useEffect(() => {
        if (activeTabOverride) {
            setActiveTab(activeTabOverride as Tab);
        }
    }, [activeTabOverride]);
    
    useEffect(() => {
        if (books.length > 0 && !selectedBookId) {
            setSelectedBookId(books[0].id.toString());
        }
    }, [books, selectedBookId]);
    
    // Effect for handling manuscript text changes
    useEffect(() => {
        setLastManuscriptState(null); // Reset undo state on navigation
        if (selectedBook) {
            setManuscriptText(selectedBook.chapters[activeChapterIndex]?.content || '');
            setManuscriptDirty(false);
        } else {
            setManuscriptText(''); // Clear manuscript if no book is selected
        }
    }, [selectedBook, activeChapterIndex]);

    // Effect for handling collaborator state changes
    useEffect(() => {
        if (selectedBook && activeTab === 'rights_splits') {
            setCollaborators([...selectedBook.splits]);
        }
    }, [selectedBook, activeTab]);

    useEffect(() => {
        const editor = manuscriptEditorRef.current;
        if (!editor) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const isCtrlOrCmd = event.ctrlKey || event.metaKey;

            if (isCtrlOrCmd && manuscriptText) {
                let handled = false;
                switch (event.key.toLowerCase()) {
                    case 'p':
                        handleProofread();
                        handled = true;
                        break;
                    case 'i':
                        handlePlotAnalysis();
                        handled = true;
                        break;
                    case 'e':
                        handleEnrichProse();
                        handled = true;
                        break;
                }
                if (handled) {
                    event.preventDefault();
                }
            }
        };

        editor.addEventListener('keydown', handleKeyDown);
        return () => {
            editor.removeEventListener('keydown', handleKeyDown);
        };
    }, [manuscriptText, handleProofread, handlePlotAnalysis, handleEnrichProse]);


    const handleManuscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setManuscriptText(newContent);
        setManuscriptDirty(true);
        if (selectedBook) {
            updateChapterContent(selectedBook.id, activeChapterIndex, newContent);
        }
    };
    
    const handleChapterChange = (index: number) => {
       handleNavigate(() => setActiveChapterIndex(index));
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && selectedBook) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target?.result as string;
                const updatedChapters = [{ title: "Chapter 1 (from TXT)", content: text }];
                await updateBook(selectedBook.id, { chapters: updatedChapters });
                setActiveChapterIndex(0);
                setManuscriptText(text);
                setLastManuscriptState(null); // Reset undo on new upload
                setManuscriptDirty(true);
                addToast("Manuscript uploaded successfully.", "success");
            };
            reader.readAsText(file);
        }
        // Reset file input value to allow re-uploading the same file
        if(event.target) {
            event.target.value = '';
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };
    
    const handleCreateNewChapter = async () => {
        if (!selectedBook) return;
        const action = async () => {
            const newChapter: BookChapter = { title: `Chapter ${selectedBook.chapters.length + 1}`, content: "" };
            const updatedChapters = [...selectedBook.chapters, newChapter];
            await updateBook(selectedBook.id, { chapters: updatedChapters });
            setActiveChapterIndex(updatedChapters.length - 1);
            addToast("New chapter added.", "success");
        };
        handleNavigate(action);
    };

    const handleUndo = () => {
        if (selectedBook && lastManuscriptState !== null) {
            setManuscriptText(lastManuscriptState);
            updateChapterContent(selectedBook.id, activeChapterIndex, lastManuscriptState);
            setManuscriptDirty(true);
            setLastManuscriptState(null); // Clear undo state after using it
            addToast("AI change has been reverted.", "success");
        }
    };
    
    const handleGenerateIllustration = async () => {
        if (!illustrationPrompt) return;
        setLoading('illustration', true);
        setGeneratedIllustration(null);
        try {
            const response = await ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt: illustrationPrompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '9:16' } });
            const newIllustration = { url: `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`, prompt: illustrationPrompt };
            setGeneratedIllustration(newIllustration);
        } catch (e) {
            console.error(e);
            addToast("Failed to generate illustration.", 'error');
        } finally {
            setLoading('illustration', false);
        }
    };

    const handleSaveIllustration = async () => {
        if (selectedBook && generatedIllustration) {
            const updatedIllustrations = [...selectedBook.illustrations, generatedIllustration];
            await updateBook(selectedBook.id, { illustrations: updatedIllustrations });
            setGeneratedIllustration(null);
            setIllustrationPrompt('');
            addToast("Illustration saved to gallery.", "success");
        }
    };
    
     const handleGenerateCover = async () => {
        if (!selectedBook) return;
        setLoading('bookCover', true);
        try {
            const prompt = `A professional and artistic book cover for a ${selectedBook.genre} book titled "${selectedBook.title}" by ${selectedBook.author}. The design should be modern and eye-catching.`;
            const response = await ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt: prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '2:3' } });
            const imageUrl = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
            await updateBook(selectedBook.id, { coverImageUrl: imageUrl });
            addToast("Book cover generated.", "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to generate book cover.", 'error');
        } finally {
            setLoading('bookCover', false);
        }
    };
    
    const handleCreateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBookTitle.trim() || !newBookAuthor.trim()) return;
        const newBookData: Omit<Book, 'id'> = {
            title: newBookTitle,
            author: newBookAuthor,
            genre: newBookGenre,
            status: 'Draft',
            rights: { territorial: true, translation: false, adaptation: false, audio: false, drm: true },
            splits: [{ name: newBookAuthor, share: '100' }],
            chapters: [{ title: 'Chapter 1', content: '' }],
            blurb: '',
            keywords: '',
            illustrations: [],
            coverImageUrl: '',
        };
        const newId = await addBook(newBookData);
        setSelectedBookId(newId);
        setCreateModalOpen(false);
        setNewBookTitle('');
        setNewBookAuthor('');
        setActiveTab('studio');
        addToast(`Book "${newBookData.title}" created!`, "success");
    };
    
    // --- Other Tab Handlers ---
     const handleToggleRight = async (rightKey: keyof BookRights) => {
        if (!selectedBook) return;
        const updatedRights = { ...selectedBook.rights, [rightKey]: !selectedBook.rights[rightKey] };
        await updateBook(selectedBook.id, { rights: updatedRights });
    };
    
    const handleAddCollaborator = () => setCollaborators(prev => [...prev, { name: '', share: '' }]);
    const handleCollaboratorChange = (index: number, field: 'name' | 'share', value: string) => {
        const newCollaborators = [...collaborators];
        if (field === 'share') {
            // Only allow numeric values (including a single decimal point) up to 100.
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                if (parseFloat(value) > 100) {
                     newCollaborators[index][field] = '100';
                } else {
                     newCollaborators[index][field] = value;
                }
                setCollaborators(newCollaborators);
            }
        } else {
            newCollaborators[index][field] = value;
            setCollaborators(newCollaborators);
        }
    };
    const handleSaveSplits = () => {
        if(!selectedBook) return;
        const cleanedCollaborators = collaborators.filter(c => c.name.trim() !== '' || c.share.trim() !== '');
        updateBook(selectedBook.id, { splits: cleanedCollaborators });
        setCollaborators(cleanedCollaborators);
        addToast(`Splits for "${selectedBook.title}" have been updated.`, 'success');
    };
    const totalSplit = useMemo(() => collaborators.reduce((sum, collab) => sum + (parseFloat(collab.share) || 0), 0), [collaborators]);

    const handleGenerateSalesForecast = async () => {
        if (!selectedBook) return;
        setLoading('salesForecast', true); setSalesForecast('');
        try {
            const prompt = `Provide a short, speculative sales forecast for a new book in the "${selectedBook.genre}" genre. Consider market trends and audience potential. This is for a fictional scenario.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setSalesForecast(response.text);
        } catch (e) { console.error(e); addToast("Failed to generate sales forecast.", 'error'); } finally { setLoading('salesForecast', false); }
    };
    
    const handleGenerateBlurb = async () => {
        if (!selectedBook || !manuscriptText) return;
        setLoading('blurb', true);
        try {
            const prompt = `Generate a compelling, one-paragraph book blurb for a ${selectedBook.genre} novel titled "${selectedBook.title}". Use the following manuscript excerpt as inspiration:\n---\n${manuscriptText.substring(0, 2000)}`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            await updateBook(selectedBook.id, { blurb: response.text });
            addToast("Blurb generated and saved.", 'success');
        } catch (e) { console.error(e); addToast("Failed to generate blurb.", 'error'); } finally { setLoading('blurb', false); }
    };

    const handleGenerateKeywords = async () => {
        if (!selectedBook) return;
        setLoading('keywords', true);
        try {
            const prompt = `Generate a comma-separated list of 10 effective SEO keywords for a ${selectedBook.genre} book titled "${selectedBook.title}".`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            await updateBook(selectedBook.id, { keywords: response.text });
            addToast("Keywords generated and saved.", 'success');
        } catch (e) { console.error(e); addToast("Failed to generate keywords.", 'error'); } finally { setLoading('keywords', false); }
    };

    const handleGenerateMarketingAssets = async () => {
        if (!selectedBook) return;
        setLoading('marketingAssets', true); setMarketingAssets('');
        try {
            const prompt = `Create a short, exciting social media post to announce the release of the book "${selectedBook.title}" by ${selectedBook.author}, a ${selectedBook.genre} novel. Include hashtags.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setMarketingAssets(response.text);
        } catch (e) { console.error(e); addToast("Failed to generate marketing assets.", 'error'); } finally { setLoading('marketingAssets', false); }
    };
    
     const handleCheckConsistency = async () => {
        if (!manuscriptText || !worldBuildingEntry) return;
        setLoading('worldConsistency', true); setConsistencyResult('');
        try {
            const prompt = `Compare the provided "World Bible" with the manuscript excerpt. Identify any major inconsistencies in character, location, or plot details. If none, state that it's consistent.
            
            WORLD BIBLE:
            ${worldBuildingEntry}
            
            MANUSCRIPT:
            ${manuscriptText.substring(0, 4000)}`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setConsistencyResult(response.text);
        } catch (e) { console.error(e); addToast("Failed to check world consistency.", 'error'); } finally { setLoading('worldConsistency', false); }
    };

    // --- Navigation Modal Handlers ---
    const handleCancelNavigation = () => {
        setNavModalOpen(false);
        setNextNavigationAction(null);
    };

    const handleDiscardAndNavigate = () => {
        if (activeTab === 'studio' && selectedBook) {
            setManuscriptText(selectedBook.chapters[activeChapterIndex]?.content || '');
            setManuscriptDirty(false);
        }
        if (activeTab === 'rights_splits' && selectedBook) {
            setCollaborators([...selectedBook.splits]);
        }

        if (nextNavigationAction) {
            nextNavigationAction();
        }
        handleCancelNavigation();
    };

    const handleSaveAndNavigate = async () => {
        if (activeTab === 'studio' && selectedBook) {
            await forceSave();
            setManuscriptDirty(false);
        }
        if (activeTab === 'rights_splits') {
            handleSaveSplits();
        }
        
        if (nextNavigationAction) {
            nextNavigationAction();
        }
        handleCancelNavigation();
    };

    const renderContent = () => {
        if (books.length === 0 && activeTab !== 'tasks' && activeTab !== 'help') {
             return (
                <div className="empty-state-card large-span">
                    <h3>Your Bookshelf is Empty</h3>
                    <p>Start your publishing journey by creating your first book.</p>
                    <button className="card-button" onClick={() => setCreateModalOpen(true)}>
                        Create New Book
                    </button>
                </div>
            );
        }
        
        switch (activeTab) {
            case 'studio': return (
                <div className="studio-layout large-span">
                    <div className="studio-editor">
                         {selectedBook ? (
                            <>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                    <h3>{selectedBook.title} - Editor</h3>
                                     <select className="styled-select" value={selectedBookId} onChange={e => handleNavigate(() => setSelectedBookId(e.target.value))} style={{maxWidth: '200px'}}>
                                        {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                    </select>
                                </div>
                                <textarea
                                    ref={manuscriptEditorRef}
                                    className="manuscript-editor"
                                    value={manuscriptText}
                                    onChange={handleManuscriptChange}
                                    placeholder="Start writing your masterpiece..."
                                    aria-label="Manuscript Editor"
                                />
                            </>
                         ) : <h3>Select a book to start editing</h3> }
                    </div>
                    <div className="studio-sidebar">
                        {selectedBook && (
                            <>
                                <div className="sidebar-section">
                                    <h4>Chapters</h4>
                                    <ul className="chapter-list">
                                        {selectedBook.chapters.map((chapter, index) => (
                                            <li key={index} className={index === activeChapterIndex ? 'active' : ''} onClick={() => handleChapterChange(index)}>
                                                {chapter.title}
                                            </li>
                                        ))}
                                    </ul>
                                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                                        <button className="button-secondary" onClick={handleCreateNewChapter} style={{flex: 1}}>New Chapter</button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt" style={{ display: 'none' }} />
                                        <button className="button-secondary" onClick={triggerFileUpload} style={{flex: 1}}>Upload .txt</button>
                                    </div>
                                </div>
                                <div className="sidebar-section">
                                    <h4>AI Writing Assistant</h4>
                                    <div className="ai-assistant-tools">
                                        <Tooltip text="Proofread for grammar and spelling errors. (Ctrl/Cmd + P)">
                                            <button onClick={handleProofread} disabled={loading.proofread || !manuscriptText}>
                                                {loading.proofread ? '...' : 'Proofread'}
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="Analyze the plot for pacing, consistency, and potential issues. (Ctrl/Cmd + I)">
                                            <button onClick={handlePlotAnalysis} disabled={loading.plotAnalysis || !manuscriptText}>
                                                {loading.plotAnalysis ? '...' : 'Analyze Plot'}
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="Enrich the prose to be more descriptive and engaging. (Ctrl/Cmd + E)">
                                            <button onClick={handleEnrichProse} disabled={loading.enrichment || !manuscriptText}>
                                                {loading.enrichment ? '...' : 'Enrich Prose'}
                                            </button>
                                        </Tooltip>
                                        {lastManuscriptState !== null && (
                                            <Tooltip text="Revert the last change made by the AI Assistant.">
                                                <button onClick={handleUndo} className="undo-button-specific">
                                                    Undo
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                                <div className="sidebar-section">
                                    <h4>AI Illustration Assistant</h4>
                                    <div className="form-section">
                                        <label htmlFor="illustration-prompt">Illustration Prompt</label>
                                        <textarea id="illustration-prompt" className="form-section textarea" rows={3} value={illustrationPrompt} onChange={e => setIllustrationPrompt(e.target.value)} placeholder="e.g., A neon-drenched city in the rain..." />
                                    </div>
                                    <button onClick={handleGenerateIllustration} disabled={loading.illustration || !illustrationPrompt} className="card-button">{loading.illustration ? 'Generating...' : 'Generate Illustration'}</button>
                                    <div className="result-area small" style={{marginTop: '1rem'}}>
                                        {loading.illustration ? <div className="loader" /> : (generatedIllustration ? <img src={generatedIllustration.url} alt={generatedIllustration.prompt} /> : <p>Illustration will appear here.</p>)}
                                    </div>
                                    {generatedIllustration && <button onClick={handleSaveIllustration} className="button-secondary" style={{width: '100%', marginTop: '0.5rem'}}>Save to Gallery</button>}
                                    {selectedBook.illustrations.length > 0 && (
                                        <div className="illustration-gallery">
                                            {selectedBook.illustrations.map((ill, idx) => <img key={idx} src={ill.url} alt={ill.prompt} />)}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                         {!selectedBook && books.length > 0 && (
                            <div className="sidebar-section">
                                <p>Select a book from the dropdown to begin.</p>
                                <select className="styled-select" value={selectedBookId} onChange={e => handleNavigate(() => setSelectedBookId(e.target.value))}>
                                    <option value="" disabled>Select a book</option>
                                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            );
            case 'distribution': return (
                <div className="module-list-card large-span">
                    <h3>Your Books</h3>
                     <ul className="item-list">
                        {books.map(book => (
                            <li key={book.id}>
                                <div>
                                    <span className="item-title">{book.title}</span>
                                    <span className="item-subtitle">{book.author}</span>
                                </div>
                                <span className={`item-status status--${book.status.toLowerCase().replace(' ', '-')}`}>{book.status}</span>
                            </li>
                        ))}
                    </ul>
                     <button className="card-button" style={{marginTop: '2rem', maxWidth: '200px'}} onClick={() => setCreateModalOpen(true)}>Create New Book</button>
                </div>
            );
             case 'analytics':
                 return (
                    <div className="large-span">
                         <div className="module-info-grid">
                            <div className="module-info-card">
                                <h4>Total Sales</h4>
                                <div className="stat">10,482</div>
                            </div>
                             <div className="module-info-card">
                                <h4>Total Revenue</h4>
                                <div className="stat">$41,392</div>
                            </div>
                             <div className="module-info-card">
                                <h4>Top Retailer</h4>
                                <div className="stat">Amazon</div>
                            </div>
                         </div>
                         <div className="module-content-grid">
                            <AIToolCard title="AI Sales Forecast" onGenerate={handleGenerateSalesForecast} isLoading={loading.salesForecast} buttonText="Forecast Sales" tooltipText="AI provides a speculative sales forecast, considering genre trends and audience potential.">
                                <p>Get a speculative sales forecast for your book based on its genre.</p>
                                <div className="result-area">{loading.salesForecast ? <div className="loader"/> : <pre>{salesForecast || 'Forecast will appear here.'}</pre>}</div>
                            </AIToolCard>
                        </div>
                    </div>
                 );
            case 'rights_splits': return (
                <div className="module-tool-card large-span">
                    <h3>Manage Rights & Splits</h3>
                    <div className="form-section">
                        <label htmlFor="book-select-rights">Select Book</label>
                        <select id="book-select-rights" className="styled-select" value={selectedBookId} onChange={e => handleNavigate(() => setSelectedBookId(e.target.value))}>
                           {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                        </select>
                    </div>
                    {selectedBook && (
                        <>
                            <h4>Publishing Rights</h4>
                            <div className="rights-grid">
                                {RIGHTS_DEFINITIONS.map(right => (
                                    <div key={right.key} className="right-item">
                                        <Tooltip text={right.description} inline>
                                            <label htmlFor={right.key}>{right.label}</label>
                                        </Tooltip>
                                        <label className="toggle-switch">
                                            <input type="checkbox" id={right.key} checked={selectedBook.rights[right.key]} onChange={() => handleToggleRight(right.key)} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div className="split-sheet-editor" style={{marginTop: '2rem'}}>
                                <h4>Royalty Splits</h4>
                                {collaborators.map((collab, index) => (
                                    <div key={index} className="collaborator-row">
                                        <input type="text" placeholder="Collaborator Name" value={collab.name} onChange={e => handleCollaboratorChange(index, 'name', e.target.value)} />
                                        <input type="text" inputMode="decimal" placeholder="%" className="share-input" value={collab.share} onChange={e => handleCollaboratorChange(index, 'share', e.target.value)} />
                                    </div>
                                ))}
                                <button onClick={handleAddCollaborator} className="add-collaborator-btn">+ Add Collaborator</button>
                                <div className={`total-percentage ${totalSplit !== 100 ? 'total-percentage--invalid' : ''}`}>Total: {totalSplit}%</div>
                                <button onClick={handleSaveSplits} className="card-button" disabled={totalSplit !== 100}>Save Splits</button>
                            </div>
                        </>
                    )}
                </div>
            );
            case 'marketing': return (
                 <div className="large-span module-content-grid">
                    <AIToolCard title="AI Book Cover Generator" onGenerate={handleGenerateCover} isLoading={loading.bookCover} buttonText="Generate Cover" tooltipText="AI generates a professional book cover based on your title, author, and genre.">
                        {selectedBook && (
                             <div className="cover-preview">
                                {selectedBook.coverImageUrl && <img src={selectedBook.coverImageUrl} alt="Generated book cover"/>}
                                <div className="cover-overlay">
                                    <h3 className="cover-title">{selectedBook.title}</h3>
                                    <p className="cover-author">{selectedBook.author}</p>
                                </div>
                            </div>
                        )}
                        <p>Generate a cover for "{selectedBook?.title || 'your selected book'}".</p>
                    </AIToolCard>
                    <div className="module-tool-card">
                         <h3>Marketing Content</h3>
                         <AIToolCard title="AI Blurb Generator" onGenerate={handleGenerateBlurb} isLoading={loading.blurb} buttonText="Generate Blurb from Manuscript" tooltipText="Analyzes the start of your manuscript to create a compelling book description.">
                            <p>Generate a book description from the current manuscript.</p>
                            <div className="result-area small"><pre>{selectedBook?.blurb || 'Blurb will appear here.'}</pre></div>
                        </AIToolCard>
                        <AIToolCard title="AI Keyword Generator" onGenerate={handleGenerateKeywords} isLoading={loading.keywords} buttonText="Generate SEO Keywords" tooltipText="Creates a list of relevant keywords to improve your book's online discoverability.">
                            <p>Generate SEO keywords based on your genre and title.</p>
                            <div className="result-area small"><pre>{selectedBook?.keywords || 'Keywords will appear here.'}</pre></div>
                        </AIToolCard>
                        <AIToolCard title="AI Social Media Assistant" onGenerate={handleGenerateMarketingAssets} isLoading={loading.marketingAssets} buttonText="Generate Social Post" tooltipText="Creates a ready-to-use social media post to announce your book.">
                            <p>Generate a social media announcement post.</p>
                            <div className="result-area small"><pre>{marketingAssets || 'Post will appear here.'}</pre></div>
                        </AIToolCard>
                    </div>
                </div>
            );
            case 'world_building': return (
                <div className="large-span module-content-grid">
                    <div className="module-tool-card">
                        <h3>World Bible Editor</h3>
                        <p>Keep track of your world's characters, locations, and rules here. The AI will use this as a reference to check for consistency.</p>
                        <textarea className="world-building-editor" rows={15} value={worldBuildingEntry} onChange={e => setWorldBuildingEntry(e.target.value)} />
                    </div>
                    <AIToolCard title="AI Consistency Checker" onGenerate={handleCheckConsistency} isLoading={loading.worldConsistency} buttonText="Check Against Manuscript" tooltipText="The AI compares your World Bible with your current manuscript chapter to find inconsistencies.">
                        <p>AI will analyze your current chapter against your World Bible.</p>
                        <div className="result-area"><pre>{consistencyResult || 'Consistency report will appear here.'}</pre>}</div>
                    </AIToolCard>
                </div>
            );
            case 'tasks':
                return <TaskManager module="publishing" />;
            case 'help':
                return <HelpView title="Digital Publishing AI Tools Help" topics={PUBLISHING_AI_HELP_TOPICS} />;
            default: return null;
        }
    }
    
    const formatTabName = (tab: Tab): string => {
        const name = tab.charAt(0).toUpperCase() + tab.slice(1);
        if (tab === 'rights_splits') return 'Rights & Splits';
        if (tab === 'world_building') return 'World Building';
        return name;
    }
    
    return (
        <ModuleView title="Digital Publishing AI" onBack={() => handleNavigate(() => setView('DASHBOARD'))}>
            <div className="tabs-container">
                <nav className="tab-nav">
                    {(['studio', 'distribution', 'analytics', 'rights_splits', 'marketing', 'world_building', 'tasks', 'help'] as Tab[]).map(tab => (
                        <button key={tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => handleNavigate(() => setActiveTab(tab))}>
                           {formatTabName(tab)}
                        </button>
                    ))}
                </nav>
                 <div className="tab-content">
                    {renderContent()}
                </div>
            </div>
            
            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Book">
                <form onSubmit={handleCreateBook}>
                    <div className="form-section">
                        <label htmlFor="new-book-title">Title</label>
                        <input id="new-book-title" type="text" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} required />
                    </div>
                    <div className="form-section">
                        <label htmlFor="new-book-author">Author</label>
                        <input id="new-book-author" type="text" value={newBookAuthor} onChange={e => setNewBookAuthor(e.target.value)} required />
                    </div>
                    <div className="form-section">
                        <label htmlFor="new-book-genre">Genre</label>
                        <select id="new-book-genre" className="styled-select" value={newBookGenre} onChange={e => setNewBookGenre(e.target.value)}>
                            <option>Sci-Fi</option>
                            <option>Fantasy</option>
                            <option>Thriller</option>
                            <option>Romance</option>
                            <option>Non-Fiction</option>
                        </select>
                    </div>
                     <div className="modal-actions" style={{justifyContent: 'flex-end'}}>
                        <button type="button" className="button-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                        <button type="submit" className="card-button">Create Book</button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isAnalysisModalOpen} onClose={() => setAnalysisModalOpen(false)} title="AI Plot Analysis">
                <pre>{analysisResult}</pre>
            </Modal>

            <ConfirmationModal
                isOpen={isNavModalOpen}
                onClose={handleCancelNavigation}
                title="Unsaved Changes"
                onSave={handleSaveAndNavigate}
                onDiscard={handleDiscardAndNavigate}
            >
                <p>You have unsaved changes. Would you like to save them before navigating away?</p>
            </ConfirmationModal>
            
        </ModuleView>
    );
};

const FullScreenLoader: FC = () => (
    <div className="fullscreen-loader">
        <div className="loader"></div>
        <p>Loading Your Creative Universe...</p>
    </div>
);


const App = () => {
    const { view, setView, isInitialized, initializeApp } = useAppStore(state => ({ 
        view: state.view, 
        setView: state.setView,
        isInitialized: state.isInitialized,
        initializeApp: state.initializeApp,
    }));
    const { tourStepIndex, startTour, nextTourStep, skipTour } = useAppStore(state => ({
        tourStepIndex: state.onboarding.tourStepIndex,
        startTour: state.startTour,
        nextTourStep: state.nextTourStep,
        skipTour: state.skipTour
    }));
    const currentTourStep = tourStepIndex >= 0 ? TOUR_STEPS[tourStepIndex] : null;

    useEffect(() => {
        initializeApp().then(() => {
            // Access the state after initialization is complete
            const onboardingComplete = useAppStore.getState().onboarding.onboardingComplete;
            if (!onboardingComplete) {
                startTour();
            }
        });
    }, [initializeApp, startTour]);

    if (!isInitialized) {
        return <FullScreenLoader />;
    }

    return (
        <>
            <Header />
            <main className="container">
                {view === 'DASHBOARD' && (
                    <>
                        <div className="main-heading">
                            <h1>Your Creative Universe</h1>
                            <p>One unified dashboard for your music and literature projects, supercharged by AI.</p>
                        </div>
                        <div className="dashboard-grid">
                            <DashboardCard
                                icon="🎵"
                                title="Music Publishing"
                                description="Manage your releases, from metadata generation and cover art to sync licensing and royalty splits."
                                onClick={() => setView('MUSIC')}
                            />
                            <DashboardCard
                                icon="📚"
                                title="Digital Publishing"
                                description="Tools for authors to write, edit, market, and distribute their books, with AI-powered assistance at every step."
                                onClick={() => setView('PUBLISHING')}
                            />
                        </div>
                    </>
                )}
                {view === 'MUSIC' && <MusicPublishingView />}
                {view === 'PUBLISHING' && <DigitalPublishingAIView />}
            </main>
            {currentTourStep && (
                <OnboardingTour
                    stepConfig={currentTourStep}
                    onNext={nextTourStep}
                    onSkip={skipTour}
                    isLastStep={tourStepIndex === TOUR_STEPS.length - 1}
                />
            )}
            <ToastContainer />
        </>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);