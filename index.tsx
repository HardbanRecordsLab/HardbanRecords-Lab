import React, { useState, FC, ReactNode, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

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


// --- React Components ---

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
}

const AIToolCard: FC<AIToolCardProps> = ({ title, children, onGenerate, isLoading, buttonText }) => (
  <div className="ai-card">
    <h4>{title}</h4>
    {children}
    {onGenerate && buttonText && (
      <button onClick={onGenerate} disabled={isLoading} className="card-button">
        {isLoading ? 'Generating...' : buttonText}
      </button>
    )}
  </div>
);

const ModuleView: FC<{ title: string; onBack: () => void; children: ReactNode }> = ({ title, onBack, children }) => (
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

const TaskManager: FC<{tasks: Task[]; onToggle: (id: number) => void; onAdd: (e: React.FormEvent, text: string, date: string) => void;}> = ({ tasks, onToggle, onAdd }) => {
    const [newTask, setNewTask] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    
    const handleAddTask = (e: React.FormEvent) => {
        onAdd(e, newTask, newDueDate);
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
                                <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} id={`task-${task.id}`} aria-labelledby={`task-label-${task.id}`} />
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
    return (
        <div className={`toast toast--${message.type}`} role="alert">
            <p className="toast-message">{message.message}</p>
            <button onClick={() => onDismiss(message.id)} className="toast-close-btn" aria-label="Dismiss">
                &times;
            </button>
        </div>
    );
};

const ToastContainer: FC<{ toasts: ToastMessage[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => {
    return (
        <div className="toast-container" aria-live="assertive" aria-atomic="true">
            {toasts.map(toast => (
                <Toast key={toast.id} message={toast} onDismiss={onDismiss} />
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


// --- Module Implementations ---

interface ModuleProps {
    onBack: () => void;
    loading: LoadingState;
    setLoading: React.Dispatch<React.SetStateAction<LoadingState>>;
    activeTabOverride?: string;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const MusicPublishingView: FC<ModuleProps> = ({ onBack, loading, setLoading, activeTabOverride, showToast }) => {
    type Tab = 'studio' | 'releases' | 'analytics' | 'splits' | 'sync' | 'career' | 'tasks';
    const [activeTab, setActiveTab] = useState<Tab>('studio');

    const [releases, setReleases] = useState<Release[]>([
        { id: 1, title: 'Midnight Drive', artist: 'Synth Rider', status: 'Live', genre: 'Synthwave', splits: [{name: 'Synth Rider', share: '100'}] },
        { id: 2, title: 'Digital Dreams', artist: 'Vectorhold', status: 'In Review', genre: 'Darksynth', splits: [{name: 'Vectorhold', share: '100'}] },
    ]);

    // Studio Tab State
    const [artist, setArtist] = useState('Synth Rider');
    const [title, setTitle] = useState('Neon Pulse');
    const [genre, setGenre] = useState('Synthwave');
    const [mood, setMood] = useState('');
    const [tags, setTags] = useState('');
    const [suggestedDate, setSuggestedDate] = useState('');
    const [generatedCoverArt, setGeneratedCoverArt] = useState('');
    const [forecastResult, setForecastResult] = useState('');

    // Splits Tab State
    const [selectedReleaseId, setSelectedReleaseId] = useState<string>('1');
    const [collaborators, setCollaborators] = useState<ReleaseCollaborator[]>([{ name: 'Synth Rider', share: '100' }]);
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

    // Task State
    const [tasks, setTasks] = useState<Task[]>([
        { id: 1, text: 'Finalize album artwork', dueDate: '2024-08-15', completed: false },
        { id: 2, text: 'Submit tracks for distribution', dueDate: '2024-08-20', completed: true },
    ]);
    
    const syncBriefs = useMemo(() => [
        { id: 'brief1', title: 'Upbeat Indie Pop for a Summer Ad Campaign', description: 'Looking for a catchy, optimistic indie pop or synth-pop track. Must have a strong hook and positive vibes. Female vocals preferred but not required.'},
        { id: 'brief2', 'title': 'Dark, Atmospheric Theme for a Sci-Fi Thriller', description: 'Need a tense, atmospheric electronic track. Minimalist, with a sense of dread and suspense. Think Blade Runner meets Stranger Things.'},
    ], []);

    useEffect(() => {
        if (activeTabOverride) {
            setActiveTab(activeTabOverride as Tab);
        }
    }, [activeTabOverride]);

    useEffect(() => {
        if (activeTab === 'splits' && selectedRelease) {
            setCollaborators(selectedRelease.splits.length > 0 ? selectedRelease.splits : [{ name: '', share: '' }]);
        }
    }, [selectedRelease, activeTab]);

    const handleGenerateMetadata = async () => {
        if (!artist || !title || !genre) return;
        setLoading(prev => ({ ...prev, metadata: true }));
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
            showToast('Metadata generated successfully.', 'success');
        } catch (error) {
            console.error("Error generating metadata:", error);
            showToast("Failed to generate metadata. Please try again.", 'error');
        } finally {
            setLoading(prev => ({ ...prev, metadata: false }));
        }
    };
    
    const handleSuggestDate = async () => {
        if (!genre) return;
        setLoading(prev => ({ ...prev, releaseDate: true }));
        setSuggestedDate('');
        try {
            const prompt = `Based on the music genre "${genre}", suggest an optimal release date within the next 3 months. Provide a single date and a brief one-sentence justification.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setSuggestedDate(response.text);
        } catch (error) {
            console.error("Error suggesting release date:", error);
            showToast("Failed to suggest a date. Please try again later.", 'error');
        } finally {
            setLoading(prev => ({ ...prev, releaseDate: false }));
        }
    };

    const handleForecast = async () => {
        if (!genre) return;
        setLoading(prev => ({ ...prev, forecast: true }));
        setForecastResult('');
        try {
            const prompt = `Provide a speculative, short-paragraph earnings forecast for a new release in the "${genre}" music genre. Consider factors like streaming potential, sync licensing opportunities, and niche audience engagement. This is for a fictional scenario, not financial advice.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setForecastResult(response.text);
        } catch (error) {
            console.error("Error forecasting revenue:", error);
            showToast("Failed to generate a forecast. The model may be busy.", 'error');
        } finally {
            setLoading(prev => ({ ...prev, forecast: false }));
        }
    };
    
    const handleFindSyncMatch = async () => {
        const brief = syncBriefs.find(b => b.id === selectedBriefId);
        const release = releases[0]; // Using first release for demo purposes
        if (!brief || !release) {
            showToast("Please select a brief to find a match.", 'error');
            return;
        }
        setLoading(prev => ({ ...prev, syncMatch: true }));
        setSyncMatchResult('');
        try {
            const prompt = `Analyze if the music track "${release.title}" by "${release.artist}", a "${release.genre}" song, is a good match for the following sync brief: "${brief.title} - ${brief.description}". Provide a "Match Confidence" score (e.g., High, Medium, Low) and a brief justification.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setSyncMatchResult(response.text);
        } catch (error) {
            console.error("Error finding sync match:", error);
            showToast("Failed to find a sync match. Please try again later.", 'error');
        } finally {
            setLoading(prev => ({ ...prev, syncMatch: false }));
        }
    };

    const handleAddCollaborator = () => setCollaborators([...collaborators, { name: '', share: '' }]);
    const handleCollaboratorChange = (index: number, field: 'name' | 'share', value: string) => {
        const newCollaborators = [...collaborators];
        newCollaborators[index][field] = value;
        setCollaborators(newCollaborators);
    };
    const handleSaveSplits = () => {
        if(!selectedRelease) return;
        setReleases(prev => prev.map(r => r.id === selectedRelease.id ? {...r, splits: collaborators} : r));
        showToast(`Splits for "${selectedRelease.title}" have been updated.`, 'success');
    };
    const totalSplit = useMemo(() => collaborators.reduce((sum, collab) => sum + (parseFloat(collab.share) || 0), 0), [collaborators]);

    const handleGenerateCoverArt = async () => {
        if (!title || !artist) return;
        setLoading(prev => ({ ...prev, coverArt: true }));
        setGeneratedCoverArt('');
        try {
            const prompt = `An abstract, minimalist album cover for a music artist named "${artist}". The release is called "${title}". The genre is ${genre}. Use neon colors on a dark background.`;
            const response = await ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt: prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' } });
            setGeneratedCoverArt(`data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`);
            showToast('Cover art generated successfully!', 'success');
        } catch (error) { 
            console.error("Error generating cover art:", error);
            showToast("Failed to generate cover art. The model may be unavailable.", 'error');
        } 
        finally { setLoading(prev => ({ ...prev, coverArt: false })); }
    };
    
    const handleSubmitRelease = () => {
        if (!title || !artist || !genre) {
            showToast("Please fill in Artist, Title, and Genre.", 'error');
            return;
        }
        const newRelease: Release = {
            id: Date.now(),
            title,
            artist,
            genre,
            status: 'Submitted',
            splits: [{ name: artist, share: '100'}]
        };
        setReleases(prev => [...prev, newRelease]);
        showToast(`"${title}" has been submitted for distribution!`, 'success');
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
        setLoading(p => ({...p, aandrScout: true})); setAandrResult('');
        try {
            const prompt = `As an AI A&R Scout, analyze artist "${artist}" in genre "${genre}" and suggest three concrete next career steps.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setAandrResult(response.text);
        } catch (e) { console.error(e); showToast("Failed to get career advice from AI Scout.", 'error'); } finally { setLoading(p => ({...p, aandrScout: false}));}
    };
    
    const handleFindFunding = async () => {
        if (!genre) return;
        setLoading(p => ({...p, funding: true})); setFundingResult('');
        try {
            const prompt = `As an AI Funding Assistant for musicians, find 3 potential grants or stipends for an independent artist in the "${genre}" genre. Provide names and a brief description for each.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setFundingResult(response.text);
        } catch (e) { console.error(e); showToast("Failed to find funding opportunities.", 'error'); } finally { setLoading(p => ({...p, funding: false}));}
    };
    
    const handleFindCollaborators = async () => {
        if (!genre) return;
        setLoading(p => ({...p, collabFinder: true})); setCollabFinderResult('');
        try {
            const prompt = `As an AI Collaborator Finder, suggest 3 types of collaborators (e.g., producer with specific skills, vocalist with a certain style) for a "${genre}" artist.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setCollabFinderResult(response.text);
        } catch (e) { console.error(e); showToast("Failed to find collaborators.", 'error'); } finally { setLoading(p => ({...p, collabFinder: false}));}
    };
    
    const handleGetListenerAnalytics = async () => {
        if (!genre) return;
        setLoading(p => ({...p, listenerAnalytics: true})); setListenerAnalytics('');
        try {
            const prompt = `Generate a plausible listener demographic profile for an artist in the "${genre}" genre. Include age range, common interests, and primary listening platforms. Format as a short paragraph.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setListenerAnalytics(response.text);
        } catch (e) { console.error(e); showToast("Failed to generate listener analytics.", 'error'); } finally { setLoading(p => ({...p, listenerAnalytics: false}));}
    };
    
    const handleGenerateSplitAgreement = async () => {
        if (!selectedRelease) return;
        setLoading(p => ({...p, splitAgreement: true})); setSplitAgreement('');
        try {
            const collabList = collaborators.map(c => `${c.name}: ${c.share}%`).join(', ');
            const prompt = `Generate a simple, legally-inspired split sheet agreement text for the track "${selectedRelease.title}" by ${selectedRelease.artist}. The collaborators and their shares are: ${collabList}. The text should be a simple paragraph outlining the agreement.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setSplitAgreement(response.text);
        } catch (e) { console.error(e); showToast("Failed to generate split agreement text.", 'error'); } finally { setLoading(p => ({...p, splitAgreement: false}));}
    };
    
    const handleAddTask = (e: React.FormEvent, text: string, date: string) => {
        e.preventDefault();
        if (!text.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: text.trim(), dueDate: date, completed: false }]);
    };
    
    const handleToggleTask = (id: number) => {
        setTasks(tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
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
                                    <button onClick={handleGenerateMetadata} disabled={loading.metadata || !artist || !title || !genre} className="card-button">
                                        {loading.metadata ? 'Generating...' : 'Generate Metadata with AI'}
                                    </button>
                                    <button onClick={handleSuggestDate} disabled={loading.releaseDate || !genre} className="card-button">
                                        {loading.releaseDate ? 'Suggesting...' : 'Suggest Release Date'}
                                    </button>
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
                                buttonText="Generate Art from Track Info">
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
                                <button className="card-button" onClick={() => showToast('Wallet connection is not available in this demo.', 'error')}>Mint as NFT</button>
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
                            <AIToolCard title="AI Revenue Forecast" onGenerate={handleForecast} isLoading={loading.forecast} buttonText="Forecast Earnings" >
                                <p>Get a speculative earnings forecast for your new release based on its genre.</p>
                                <div className="result-area">{loading.forecast ? <div className="loader"/> : <pre>{forecastResult || 'Forecast will appear here.'}</pre>}</div>
                            </AIToolCard>
                            <AIToolCard title="Advanced Listener Analytics" onGenerate={handleGetListenerAnalytics} isLoading={loading.listenerAnalytics} buttonText="Generate Listener Profile">
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
                                        <input type="number" placeholder="%" className="share-input" value={collab.share} onChange={e => handleCollaboratorChange(index, 'share', e.target.value)} />
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
                            <AIToolCard title="AI Legal Assistant" onGenerate={handleGenerateSplitAgreement} isLoading={loading.splitAgreement} buttonText="Generate Split Sheet Agreement" >
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
                    >
                        <p>Select a brief, and AI will check compatibility with your latest track ('{releases[0]?.title}').</p>
                        <div className="result-area">
                            {loading.syncMatch ? <div className="loader" /> : <pre>{syncMatchResult || 'Match analysis will appear here.'}</pre>}
                        </div>
                    </AIToolCard>
                </div>
            );
            case 'career':
                return (
                    <div className="large-span module-content-grid">
                        <AIToolCard title="AI A&R Scout" onGenerate={handleAandrScout} isLoading={loading.aandrScout} buttonText="Get Career Advice">
                            <p>Get personalized career steps based on your artist profile.</p>
                            <div className="result-area">{loading.aandrScout ? <div className="loader"/> : <pre>{aandrResult || 'Your career advice will appear here.'}</pre>}</div>
                        </AIToolCard>
                        <AIToolCard title="AI Funding Assistant" onGenerate={handleFindFunding} isLoading={loading.funding} buttonText="Find Grants & Stipends">
                            <p>Discover funding opportunities relevant to your genre.</p>
                            <div className="result-area">{loading.funding ? <div className="loader"/> : <pre>{fundingResult || 'Funding opportunities will appear here.'}</pre>}</div>
                        </AIToolCard>
                        <AIToolCard title="AI Collaborator Finder" onGenerate={handleFindCollaborators} isLoading={loading.collabFinder} buttonText="Find Collaborators">
                            <p>Get suggestions for producers, vocalists, and writers.</p>
                            <div className="result-area">{loading.collabFinder ? <div className="loader"/> : <pre>{collabFinderResult || 'Collaborator suggestions will appear here.'}</pre>}</div>
                        </AIToolCard>
                    </div>
                );
            case 'tasks':
                return <TaskManager tasks={tasks} onToggle={handleToggleTask} onAdd={handleAddTask} />;
            default: return null;
        }
    }

    return (
        <ModuleView title="Music Publishing AI" onBack={onBack}>
             <div className="tabs-container">
                <nav className="tab-nav">
                    {(['studio', 'releases', 'analytics', 'splits', 'sync', 'career', 'tasks'] as Tab[]).map(tab => (
                        <button key={tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </nav>
                <div className="tab-content">
                    {renderContent()}
                </div>
            </div>
        </ModuleView>
    );
};

const RIGHTS_DEFINITIONS: { key: keyof BookRights; label: string }[] = [
    { key: 'territorial', label: 'Worldwide Territorial Rights' },
    { key: 'translation', label: 'Translation Rights' },
    { key: 'adaptation', label: 'Film & TV Adaptation Rights' },
    { key: 'audio', label: 'Audiobook Rights' },
    { key: 'drm', label: 'Digital Rights Management (DRM)' },
];

const DigitalPublishingAIView: FC<ModuleProps> = ({ onBack, loading, setLoading, activeTabOverride, showToast }) => {
    type Tab = 'studio' | 'distribution' | 'analytics' | 'rights_splits' | 'marketing' | 'audiobook' | 'world_building' | 'tasks';
    const [activeTab, setActiveTab] = useState<Tab>('distribution');
    
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const selectedBook = useMemo(() => books.find(b => b.id === parseInt(selectedBookId, 10)), [books, selectedBookId]);

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

    const [tasks, setTasks] = useState<Task[]>([
        { id: 1, text: 'Complete first draft', dueDate: '2024-09-01', completed: true },
        { id: 2, text: 'Send to beta readers', dueDate: '2024-09-15', completed: false },
    ]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
     useEffect(() => {
        if (activeTabOverride) {
            setActiveTab(activeTabOverride as Tab);
        }
    }, [activeTabOverride]);
    
    useEffect(() => {
        if (selectedBook) {
            setManuscriptText(selectedBook.chapters[activeChapterIndex]?.content || '');
            if(activeTab === 'rights_splits') {
                setCollaborators(selectedBook.splits.length > 0 ? selectedBook.splits : [{ name: '', share: '' }]);
            }
        }
    }, [selectedBook, activeChapterIndex, activeTab]);

    const updateBook = (bookId: number, updatedData: Partial<Book>) => {
        setBooks(prevBooks => prevBooks.map(b => b.id === bookId ? { ...b, ...updatedData } : b));
    };
    
    const updateChapterContent = (bookId: number, chapterIndex: number, newContent: string) => {
        setBooks(prevBooks => prevBooks.map(book => {
            if (book.id === bookId) {
                const newChapters = [...book.chapters];
                newChapters[chapterIndex] = { ...newChapters[chapterIndex], content: newContent };
                return { ...book, chapters: newChapters };
            }
            return book;
        }));
    };
    
    const addChapter = (bookId: number) => {
        setBooks(prevBooks => prevBooks.map(book => {
            if (book.id === bookId) {
                const newChapter = { title: `Chapter ${book.chapters.length + 1}`, content: ''};
                return { ...book, chapters: [...book.chapters, newChapter] };
            }
            return book;
        }));
    };


    const handleAIAssistant = async (mode: 'proofread' | 'plot' | 'enrich') => {
        if (!manuscriptText || !selectedBook) return;
        setLoading(p => ({ ...p, [mode === 'proofread' ? 'proofread' : mode === 'plot' ? 'plotAnalysis' : 'enrichment']: true }));
        try {
            let prompt = '';
            switch (mode) {
                case 'proofread':
                    prompt = `You are a professional copy editor. Proofread the following text for grammar, spelling, and punctuation errors. Return only the corrected text, without any additional comments or explanations.\n\n---\n\n${manuscriptText}`;
                    break;
                case 'plot':
                    prompt = `You are a literary critic. Analyze the plot of the following text. Provide a brief, one-paragraph summary of potential plot holes or areas for improvement. Do not return the original text.\n\n---\n\n${manuscriptText}`;
                    break;
                case 'enrich':
                    prompt = `You are a creative writer. Enrich the following text by improving vocabulary and sentence structure for a more engaging read. Retain the original meaning and tone. Return only the enriched text.\n\n---\n\n${manuscriptText}`;
                    break;
            }
            
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            const resultText = response.text;

            if (mode === 'plot') {
                showToast(`Plot Analysis Complete`, 'success');
                setAnalysisResult(resultText);
                setAnalysisModalOpen(true);
            } else {
                setManuscriptText(resultText);
                updateChapterContent(selectedBook.id, activeChapterIndex, resultText);
                showToast(`Text ${mode} successful.`, 'success');
            }
        } catch (e) {
            console.error(e);
            showToast("AI Assistant failed. The request may have been too complex.", 'error');
        } finally {
            setLoading(p => ({ ...p, [mode === 'proofread' ? 'proofread' : mode === 'plot' ? 'plotAnalysis' : 'enrichment']: false }));
        }
    };
    
    const handleGenerateIllustration = async () => {
        if (!illustrationPrompt || !selectedBook) return;
        setLoading(p => ({...p, illustration: true}));
        setGeneratedIllustration(null);
        try {
            const prompt = `A book illustration for a ${selectedBook.genre} novel. The scene is: ${illustrationPrompt}. Style: digital painting, atmospheric.`;
            const response = await ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt: prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '3:4' } });
            const newIllustration = { url: `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`, prompt: illustrationPrompt };
            updateBook(selectedBook.id, { illustrations: [...selectedBook.illustrations, newIllustration] });
            setGeneratedIllustration(newIllustration);
            showToast('Illustration generated.', 'success');
        } catch (e) { console.error("Error generating illustration:", e); showToast("Failed to generate illustration. Please try again.", 'error'); } finally { setLoading(p => ({...p, illustration: false}));}
    };

    const handleGenerateCover = async () => {
        if (!selectedBook) return;
        setLoading(p => ({...p, bookCover: true}));
        try {
            const prompt = `A professional book cover for a ${selectedBook.genre} novel titled "${selectedBook.title}" by ${selectedBook.author}. The design should be modern and eye-catching.`;
            const response = await ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt: prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '2:3' } });
            const newCoverUrl = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
            updateBook(selectedBook.id, { coverImageUrl: newCoverUrl });
            showToast('Book cover generated successfully.', 'success');
        } catch (e) { console.error("Error generating book cover:", e); showToast("Failed to generate book cover. Please try again.", 'error'); } finally { setLoading(p => ({...p, bookCover: false}));}
    };


    const handleGenerateMetadata = async (type: 'blurb' | 'keywords') => {
        if (!selectedBook) return;
        const manuscriptSample = selectedBook.chapters.map(c => c.content).join('\n').substring(0, 4000);
        if (!manuscriptSample) {
            showToast("Please write some content in a chapter first.", 'error');
            return;
        }
        setLoading(p => ({ ...p, [type]: true }));
        try {
            const prompt = type === 'blurb'
                ? `Write a compelling, one-paragraph book blurb for a ${selectedBook.genre} novel titled "${selectedBook.title}" by ${selectedBook.author}. Here is a sample of the manuscript to understand the tone and plot:\n\n${manuscriptSample}`
                : `Generate a comma-separated list of 10-15 effective SEO keywords for a ${selectedBook.genre} novel titled "${selectedBook.title}". Here is a sample of the manuscript:\n\n${manuscriptSample}`;
                
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            const resultText = response.text;

            if (type === 'blurb') {
                updateBook(selectedBook.id, { blurb: resultText });
            } else {
                updateBook(selectedBook.id, { keywords: resultText });
            }
             showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} generated successfully.`, 'success');
        } catch (e) {
            console.error(e);
            showToast("Failed to generate metadata. Please try again.", 'error');
        } finally {
            setLoading(p => ({ ...p, [type]: false }));
        }
    };

    const handleForecastSales = async () => {
        if (!selectedBook || !selectedBook.genre) return;
        setLoading(p => ({ ...p, salesForecast: true }));
        setSalesForecast('');
        try {
            const prompt = `Provide a short, speculative sales forecast for a new book in the "${selectedBook.genre}" genre. The title is "${selectedBook.title}". Consider market trends for this genre. This is for a fictional scenario, not financial advice.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setSalesForecast(response.text);
        } catch (e) {
            console.error(e);
            showToast("Failed to generate sales forecast.", 'error');
        } finally {
            setLoading(p => ({ ...p, salesForecast: false }));
        }
    };
    const handleAnalyzeMarket = async () => {
        if (!selectedBook) return;
        setLoading(p => ({...p, marketTrends: true})); setMarketTrends('');
        try {
            const prompt = `As a market analyst for authors, analyze current trends for the ${selectedBook.genre} genre. Provide insights on popular tropes, cover styles, and optimal book length. Format as a bulleted list.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setMarketTrends(response.text);
        } catch(e) { console.error(e); showToast("Failed to analyze market trends.", 'error'); } finally { setLoading(p => ({...p, marketTrends: false}));}
    };
    const handleGenerateMarketingAssets = async () => {
        if (!selectedBook || !selectedBook.blurb) {
            showToast("Please generate a blurb first.", 'error');
            return;
        }
        setLoading(p => ({...p, marketingAssets: true})); setMarketingAssets('');
        try {
            const prompt = `Generate a social media marketing package for a new book release. Title: '${selectedBook.title}', Author: '${selectedBook.author}', Blurb: '${selectedBook.blurb}'. Include a tweet, an Instagram caption with hashtags, and a short Facebook post.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setMarketingAssets(response.text);
        } catch(e) { console.error(e); showToast("Failed to generate marketing assets.", 'error'); } finally { setLoading(p => ({...p, marketingAssets: false}));}
    };

    const handleRightsToggle = (bookId: number, rightKey: keyof BookRights) => {
        const book = books.find(b => b.id === bookId);
        if (!book) return;
        const newRights = { ...book.rights, [rightKey]: !book.rights[rightKey] };
        updateBook(bookId, { rights: newRights });
    };

    const handleAddCollaborator = () => setCollaborators([...collaborators, { name: '', share: '' }]);
    const handleCollaboratorChange = (index: number, field: 'name' | 'share', value: string) => {
        const newCollaborators = [...collaborators];
        newCollaborators[index][field] = value;
        setCollaborators(newCollaborators);
    };
    const handleSaveSplits = () => {
        if (!selectedBook) return;
        updateBook(selectedBook.id, { splits: collaborators });
        showToast(`Splits for "${selectedBook.title}" have been updated.`, 'success');
    };
    const totalSplit = useMemo(() => collaborators.reduce((sum, collab) => sum + (parseFloat(collab.share) || 0), 0), [collaborators]);

    const handleGenerateAudiobook = async () => {
        if (!manuscriptText) return;
        setLoading(p => ({...p, audiobook: true})); setAudiobookSampleUrl('');
        try {
            const prompt = `Describe the tone of voice for an audiobook reading of this scene: ${manuscriptText.substring(0, 300)}`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            await new Promise(res => setTimeout(res, 2000)); // Simulate audio generation
            setAudiobookSampleUrl(`AI Voice Description: ${response.text}`);
        } catch(e) { console.error(e); showToast("Failed to generate audiobook sample.", 'error'); } finally { setLoading(p => ({...p, audiobook: false}));}
    };

    const handleCheckConsistency = async () => {
        if (!selectedBook || !worldBuildingEntry) return;
        setLoading(p => ({...p, worldConsistency: true})); setConsistencyResult('');
        const manuscript = selectedBook.chapters.map(c => c.content).join('\n');
        try {
            const prompt = `I am writing a book. Here is my world-building bible:\n\n${worldBuildingEntry}\n\nHere is my manuscript:\n\n${manuscript}\n\nPlease check for any inconsistencies and list them.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setConsistencyResult(response.text);
        } catch(e) { console.error(e); showToast("Failed to perform consistency check.", 'error'); } finally { setLoading(p => ({...p, worldConsistency: false}));}
    };
    
    const handleFindRightsMatch = async () => {
        if (!selectedBook) return;
        setLoading(p => ({...p, rightsMatch: true})); setRightsMatchResult('');
        try {
            const prompt = `My book is a "${selectedBook.genre}" titled "${selectedBook.title}". Based on its genre and blurb: "${selectedBook.blurb}", suggest one potential film or game adaptation concept.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setRightsMatchResult(response.text);
        } catch(e) { console.error(e); showToast("Failed to find rights-matching opportunities.", 'error'); } finally { setLoading(p => ({...p, rightsMatch: false}));}
    };

    const handleAddTask = (e: React.FormEvent, text: string, date: string) => {
        e.preventDefault();
        if (!text.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: text.trim(), dueDate: date, completed: false }]);
    };
    
    const handleToggleTask = (id: number) => {
        setTasks(tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
    };

    const handleCreateNewBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBookTitle.trim() || !newBookAuthor.trim()) return;

        const newBook: Book = {
            id: Date.now(),
            title: newBookTitle.trim(),
            author: newBookAuthor.trim(),
            genre: newBookGenre,
            status: 'Draft',
            rights: { territorial: true, translation: false, adaptation: false, audio: true, drm: true },
            splits: [{ name: newBookAuthor.trim(), share: '100' }],
            chapters: [{ title: 'Chapter 1', content: '' }],
            blurb: '',
            keywords: '',
            illustrations: [],
            coverImageUrl: '',
        };
        
        setBooks(prev => [...prev, newBook]);
        setSelectedBookId(newBook.id.toString());
        setActiveTab('studio');
        setCreateModalOpen(false);
        setNewBookTitle('');
        setNewBookAuthor('');
        showToast(`Book "${newBook.title}" created!`, 'success');
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedBook) return;
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setManuscriptText(text);
                updateChapterContent(selectedBook.id, activeChapterIndex, text);
                showToast(`Manuscript "${file.name}" uploaded.`, 'success');
            };
            reader.readAsText(file);
        }
    };


     const renderContent = () => {
        if (books.length === 0) {
            return (
                 <div className="empty-state-card large-span">
                    <h3>Your library is empty.</h3>
                    <p>Create your first book to get started.</p>
                    <button className="card-button" onClick={() => setCreateModalOpen(true)}>+ Create New Book</button>
                </div>
            )
        }
        if (!selectedBook) return (
             <div className="empty-state-card large-span">
                <h3>No book selected.</h3>
                <p>Please select a book from your library in the 'Distribution' tab to continue.</p>
                <button className="card-button" onClick={() => setActiveTab('distribution')}>Go to Library</button>
            </div>
        );
        
        switch (activeTab) {
            case 'studio': return (
                <div className="studio-layout large-span">
                    <div className="studio-editor">
                        <h3>{selectedBook.title} - {selectedBook.chapters[activeChapterIndex]?.title}</h3>
                        <textarea
                            className="manuscript-editor"
                            value={manuscriptText}
                            onChange={(e) => {
                                setManuscriptText(e.target.value);
                                updateChapterContent(selectedBook.id, activeChapterIndex, e.target.value);
                            }}
                            placeholder="Start writing your story here..."
                        />
                    </div>
                    <div className="studio-sidebar">
                        <div className="sidebar-section">
                            <h4>Chapters</h4>
                            <ul className="chapter-list">
                                {selectedBook.chapters.map((chap, index) => (
                                    <li key={index} onClick={() => setActiveChapterIndex(index)} className={activeChapterIndex === index ? 'active' : ''}>
                                        {chap.title}
                                    </li>
                                ))}
                            </ul>
                            <button className="add-collaborator-btn" style={{marginTop: '1rem'}} onClick={() => addChapter(selectedBook.id)}>+ Add Chapter</button>
                        </div>
                        <div className="sidebar-section">
                           <button className="card-button" onClick={() => fileInputRef.current?.click()}>
                                Upload Manuscript (.txt)
                           </button>
                           <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt" style={{ display: 'none' }} />
                        </div>
                        <div className="sidebar-section">
                            <h4>AI Writing Assistant</h4>
                            <div className="ai-assistant-tools">
                                <button onClick={() => handleAIAssistant('proofread')} disabled={loading.proofread || !manuscriptText}>
                                    {loading.proofread ? '...' : 'Proofread'}
                                </button>
                                <button onClick={() => handleAIAssistant('plot')} disabled={loading.plotAnalysis || !manuscriptText}>
                                    {loading.plotAnalysis ? '...' : 'Analyze Plot'}
                                </button>
                                <button onClick={() => handleAIAssistant('enrich')} disabled={loading.enrichment || !manuscriptText}>
                                    {loading.enrichment ? '...' : 'Enrich Prose'}
                                </button>
                            </div>
                        </div>
                        <div className="sidebar-section">
                             <h4>AI Cover Art</h4>
                            <div className="cover-preview">
                                {loading.bookCover ? <div className="loader"></div> :
                                    (selectedBook.coverImageUrl ? <img src={selectedBook.coverImageUrl} alt={`${selectedBook.title} cover`} /> : null)
                                }
                                <div className="cover-overlay">
                                    <div className="cover-title">{selectedBook.title}</div>
                                    <div className="cover-author">{selectedBook.author}</div>
                                </div>
                            </div>
                            <button className="card-button" onClick={handleGenerateCover} disabled={loading.bookCover}>
                                {loading.bookCover ? 'Generating...' : 'Generate Cover with AI'}
                            </button>
                        </div>
                        <AIToolCard title="AI Illustration Assistant" onGenerate={handleGenerateIllustration} isLoading={loading.illustration} buttonText="Generate Illustration">
                            <textarea className="world-building-editor" rows={3} value={illustrationPrompt} onChange={e => setIllustrationPrompt(e.target.value)} placeholder="e.g., A detective in a neon-lit city street..." />
                            <div className="result-area small">
                                {loading.illustration ? <div className="loader"/> : (generatedIllustration ? <img src={generatedIllustration.url} alt={generatedIllustration.prompt} /> : <p>Generated image will appear here.</p>)}
                            </div>
                             {selectedBook.illustrations.length > 0 && (
                                <div className="illustration-gallery">
                                    {selectedBook.illustrations.map((ill, index) => <img key={index} src={ill.url} alt={ill.prompt} title={ill.prompt} />)}
                                </div>
                            )}
                        </AIToolCard>
                    </div>
                </div>
            );
            case 'distribution':
                return (
                    <div className="module-content-grid large-span">
                       <div className="module-list-card">
                            <h3>Your Library</h3>
                            <button className="card-button" onClick={() => setCreateModalOpen(true)} style={{marginBottom: '1rem'}}>
                                + Create New Book
                            </button>
                             <ul className="item-list">
                                {books.map(book => (
                                    <li key={book.id} onClick={() => setSelectedBookId(book.id.toString())} className={selectedBookId === book.id.toString() ? 'active' : ''}>
                                        <div>
                                            <span className="item-title">{book.title}</span>
                                            <span className="item-subtitle">{book.author}</span>
                                        </div>
                                        <span className={`item-status status--${book.status.toLowerCase()}`}>{book.status}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="module-tool-card">
                            <h3>Formatting & Conversion</h3>
                            <p>One-click conversion of your manuscript to professional formats.</p>
                            <div className="format-converter">
                                <button onClick={() => showToast('Converted to EPUB!', 'success')}>Convert to EPUB</button>
                                <button onClick={() => showToast('Converted to MOBI!', 'success')}>Convert to MOBI</button>
                                <button onClick={() => showToast('Converted to PDF!', 'success')}>Convert to PDF</button>
                            </div>
                        </div>
                    </div>
                );
            case 'analytics': return (
                <div className="large-span">
                    <div className="module-info-grid">
                        <div className="module-info-card"><h4>Total Sales</h4><div className="stat">12,450</div></div>
                        <div className="module-info-card"><h4>Revenue</h4><div className="stat">$4,980</div></div>
                        <div className="module-info-card"><h4>Top Retailer</h4><div className="stat">Amazon</div></div>
                    </div>
                    <div className="module-content-grid">
                        <AIToolCard title="AI Sales Forecast" onGenerate={handleForecastSales} isLoading={loading.salesForecast} buttonText="Forecast Sales">
                            <p>Get a speculative sales forecast based on your book's genre and title.</p>
                            <div className="result-area">
                                {loading.salesForecast ? <div className="loader"/> : <pre>{salesForecast || 'Forecast will appear here.'}</pre>}
                            </div>
                        </AIToolCard>
                        <AIToolCard title="AI Market Trends" onGenerate={handleAnalyzeMarket} isLoading={loading.marketTrends} buttonText="Analyze Market Trends">
                            <p>Get AI-driven insights on popular trends for your genre.</p>
                            <div className="result-area">
                                {loading.marketTrends ? <div className="loader"/> : <pre>{marketTrends || 'Market analysis will appear here.'}</pre>}
                            </div>
                        </AIToolCard>
                    </div>
                </div>
             );
            case 'rights_splits':
                 return (
                    <div className="module-content-grid large-span">
                        <div className="module-tool-card">
                            <h3>Rights Management</h3>
                            <div className="rights-grid">
                                {RIGHTS_DEFINITIONS.map(({ key, label }) => (
                                    <div key={key} className="right-item">
                                        <span>{label}</span>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={selectedBook.rights[key]} onChange={() => handleRightsToggle(selectedBook.id, key)} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div className="module-tool-card">
                            <h3>Royalty Splits</h3>
                            <div className="split-sheet-editor">
                                {collaborators.map((collab, index) => (
                                    <div key={index} className="collaborator-row">
                                        <input type="text" placeholder="Collaborator Name" value={collab.name} onChange={e => handleCollaboratorChange(index, 'name', e.target.value)} />
                                        <input type="number" placeholder="%" className="share-input" value={collab.share} onChange={e => handleCollaboratorChange(index, 'share', e.target.value)} />
                                    </div>
                                ))}
                                <button onClick={handleAddCollaborator} className="add-collaborator-btn">+ Add Collaborator</button>
                                <div className={`total-percentage ${totalSplit !== 100 ? 'total-percentage--invalid' : ''}`}>
                                    Total: {totalSplit}%
                                </div>
                                <button onClick={handleSaveSplits} className="card-button" disabled={totalSplit !== 100}>Save Splits</button>
                            </div>
                        </div>
                        <AIToolCard title="AI Rights Matchmaker" onGenerate={handleFindRightsMatch} isLoading={loading.rightsMatch} buttonText="Find Licensing Opportunities">
                            <p>Discover potential film, TV, or game adaptation opportunities for your book.</p>
                            <div className="result-area">{loading.rightsMatch ? <div className="loader"/> : <pre>{rightsMatchResult || 'Opportunities will appear here.'}</pre>}</div>
                        </AIToolCard>
                    </div>
                );
            case 'marketing':
                 return (
                     <div className="large-span module-content-grid">
                        <AIToolCard title="AI Blurb Generator" onGenerate={() => handleGenerateMetadata('blurb')} isLoading={loading.blurb} buttonText="Generate Blurb from Manuscript">
                            <p>Uses your manuscript to generate a compelling book description.</p>
                            <div className="result-area">
                            {loading.blurb ? <div className="loader"/> : <pre>{selectedBook.blurb || 'Your blurb will appear here.'}</pre>}
                            </div>
                        </AIToolCard>
                        <AIToolCard title="AI Keyword Generator" onGenerate={() => handleGenerateMetadata('keywords')} isLoading={loading.keywords} buttonText="Generate SEO Keywords">
                            <p>Generates relevant keywords to improve your book's discoverability.</p>
                            <div className="result-area">
                            {loading.keywords ? <div className="loader"/> : <pre>{selectedBook.keywords || 'Keywords will appear here.'}</pre>}
                            </div>
                        </AIToolCard>
                        <AIToolCard title="AI Marketing Asset Generator" onGenerate={handleGenerateMarketingAssets} isLoading={loading.marketingAssets} buttonText="Generate Social Media Posts">
                            <p>Instantly create a marketing package based on your title and blurb.</p>
                             <div className="result-area">
                            {loading.marketingAssets ? <div className="loader"/> : <pre>{marketingAssets || 'Marketing assets will appear here.'}</pre>}
                            </div>
                        </AIToolCard>
                        <div className="module-tool-card">
                            <h3>Direct Sales & Special Editions</h3>
                            <p>Create a special edition of your book to sell directly to fans.</p>
                            <div className="direct-sales-creator">
                                <div className="form-section">
                                    <label>Edition Name (e.g., "Collector's Edition")</label>
                                    <input type="text" placeholder="Collector's Edition" />
                                </div>
                                <div className="form-section">
                                    <label>Bonus Content</label>
                                    <div className="checkbox-group">
                                        <label><input type="checkbox"/> Deleted Scenes</label>
                                        <label><input type="checkbox"/> Concept Art</label>
                                        <label><input type="checkbox"/> Author's Commentary</label>
                                    </div>
                                </div>
                                <button className="card-button" onClick={() => showToast('Sales page created!', 'success')}>Create Sales Page</button>
                            </div>
                        </div>
                     </div>
                 );
            case 'audiobook':
                return (
                    <AIToolCard title="AI Audiobook Generator" onGenerate={handleGenerateAudiobook} isLoading={loading.audiobook} buttonText="Generate Audio Sample from Chapter">
                         <p>Select a chapter in the 'Studio' tab, then choose a voice and generate a sample.</p>
                         <div className="audiobook-generator">
                            <div className="form-section">
                                <label>AI Voice</label>
                                <select className="styled-select">
                                    <option>Narrator (Male, Deep)</option>
                                    <option>Storyteller (Female, Warm)</option>
                                    <option>Announcer (Male, Neutral)</option>
                                </select>
                            </div>
                         </div>
                         <div className="result-area">{loading.audiobook ? <div className="loader"/> : <pre>{audiobookSampleUrl || 'Your audio sample will be generated here.'}</pre>}</div>
                    </AIToolCard>
                );
            case 'world_building':
                return (
                    <AIToolCard title="'Author Universe' World-building" onGenerate={handleCheckConsistency} isLoading={loading.worldConsistency} buttonText="Check for Consistency">
                        <p>Maintain your series bible and use AI to check for inconsistencies against your current manuscript.</p>
                        <textarea className="world-building-editor" rows={10} value={worldBuildingEntry} onChange={e => setWorldBuildingEntry(e.target.value)} />
                        <div className="result-area">{loading.worldConsistency ? <div className="loader"/> : <pre>{consistencyResult || 'Consistency report will appear here.'}</pre>}</div>
                    </AIToolCard>
                );
            case 'tasks':
                return <TaskManager tasks={tasks} onToggle={handleToggleTask} onAdd={handleAddTask} />;
            default: return null;
        }
    };

    return (
        <ModuleView title="Digital Publishing AI" onBack={onBack}>
            {isCreateModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Create New Book</h2>
                        <form onSubmit={handleCreateNewBook}>
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
                            <div className="modal-actions">
                                <button type="button" className="button-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                                <button type="submit" className="card-button">Save Book</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
             <Modal
                isOpen={isAnalysisModalOpen}
                onClose={() => setAnalysisModalOpen(false)}
                title="AI Plot Analysis"
            >
                <pre>{analysisResult}</pre>
            </Modal>
            <div className="tabs-container">
                <nav className="tab-nav">
                    {(['studio', 'distribution', 'analytics', 'rights_splits', 'marketing', 'audiobook', 'world_building', 'tasks'] as Tab[]).map(tab => (
                        <button key={tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                            {tab.replace('_', ' & ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </button>
                    ))}
                </nav>
                <div className="tab-content">{renderContent()}</div>
            </div>
        </ModuleView>
    );
};

const App = () => {
  const [loading, setLoading] = useState<LoadingState>({ 
    metadata: false, releaseDate: false, forecast: false, syncMatch: false, coverArt: false, aandrScout: false, funding: false, collabFinder: false, listenerAnalytics: false, splitAgreement: false,
    proofread: false, plotAnalysis: false, enrichment: false, illustration: false, blurb: false, keywords: false, salesForecast: false, marketTrends: false, marketingAssets: false, audiobook: false, worldConsistency: false, rightsMatch: false, bookCover: false,
  });
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  
  // Onboarding State
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const currentTourStep = TOUR_STEPS[onboardingStep];

  // Toast Notification State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 5000); // Auto-dismiss after 5 seconds
  };
  
  const removeToast = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };


  useEffect(() => {
    const onboardingComplete = localStorage.getItem('onboardingComplete');
    if (onboardingComplete !== 'true') {
        setShowOnboarding(true);
    }
  }, []);
  
  useEffect(() => {
    if (showOnboarding && currentTourStep) {
        setCurrentView(currentTourStep.view);
    }
  }, [showOnboarding, currentTourStep]);


  const handleNextOnboardingStep = () => {
    if (onboardingStep < TOUR_STEPS.length - 1) {
        setOnboardingStep(prev => prev + 1);
    } else {
        handleSkipOnboarding();
    }
  };

  const handleSkipOnboarding = () => {
    setShowOnboarding(false);
    setCurrentView('DASHBOARD');
    localStorage.setItem('onboardingComplete', 'true');
  };


 const renderContent = () => {
    switch (currentView) {
        case 'MUSIC':
            return <MusicPublishingView onBack={() => setCurrentView('DASHBOARD')} loading={loading} setLoading={setLoading} activeTabOverride={currentTourStep?.targetTab} showToast={showToast} />;
        case 'PUBLISHING':
            return <DigitalPublishingAIView onBack={() => setCurrentView('DASHBOARD')} loading={loading} setLoading={setLoading} activeTabOverride={currentTourStep?.targetTab} showToast={showToast} />;
        case 'DASHBOARD':
        default:
            return (
                <>
                    <div className="main-heading">
                        <h1>Your Creative Universe</h1>
                        <p>One platform to compose, publish, and distribute your work to the world. Powered by AI, driven by you.</p>
                    </div>
                    
                    <div className="dashboard-grid">
                        <DashboardCard
                            icon="🎵"
                            title="Music Publishing"
                            description="An AI-powered suite for production, distribution, and monetization."
                            onClick={() => setCurrentView('MUSIC')}
                        />
                        <DashboardCard
                            icon="📖"
                            title="Digital Publishing"
                            description="An AI-powered platform for authors to write, format, distribute, and monetize books."
                            onClick={() => setCurrentView('PUBLISHING')}
                        />
                    </div>
                </>
            );
    }
 };

  return (
    <>
      <Header />
      <main className="container">
       {renderContent()}
      </main>
      {showOnboarding && currentTourStep && (
            <OnboardingTour 
                stepConfig={currentTourStep} 
                onNext={handleNextOnboardingStep} 
                onSkip={handleSkipOnboarding}
                isLastStep={onboardingStep === TOUR_STEPS.length - 1}
            />
      )}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}