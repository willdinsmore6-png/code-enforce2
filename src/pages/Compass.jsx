import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Compass, Send, Upload, Settings, MessageSquare, Loader2, Building2, FileText, Trash2, CheckCircle, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/AuthContext';

export default function CompassPage() {
  const { user, municipality } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [townConfig, setTownConfig] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ town_name: '', state: 'NH', compliance_days_zoning: 30, compliance_days_building: 30, zba_appeal_days: 30, penalty_first_offense: 275, penalty_subsequent: 550, specific_regulations: '', notes: '' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocNames, setUploadedDocNames] = useState([]);
  const [lastUploadedDoc, setLastUploadedDoc] = useState(null);
  const [docsSharedWithAgent, setDocsSharedWithAgent] = useState(false);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const messagesEndRef = useRef(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (municipality) {
      setTownConfig(municipality);
      setConfigForm(f => ({ ...f, ...municipality }));
      setUploadedDocNames(municipality.ordinance_doc_names || []);
    } else {
      setShowConfig(isAdmin);
    }
  }, [municipality, isAdmin]);

  // FIXED: Logic to ensure Super Admins only see cases for the town they are currently managing
  useEffect(() => {
    async function loadFilteredCases() {
      const activeTownId = municipality?.id || user?.town_id;
      if (!activeTownId) return;

      try {
        const c = await base44.entities.Case.filter({ 
          town_id: activeTownId 
        });
        setCases(c.filter(ca => !['resolved', 'closed'].includes(ca.status)));
      } catch (error) {
        console.error('Error loading cases:', error);
      }
    }
    loadFilteredCases();
  }, [municipality, user]);

  useEffect(() => {
    async function initConversation() {
      const savedId = sessionStorage.getItem('compass_conversation_id');
      if (savedId) {
        try {
          const existing = await base44.agents.getConversation(savedId);
          if (existing?.id) {
            setConversation(existing);
            const cached = sessionStorage.getItem('compass_messages');
            if (cached) {
              try { setMessages(JSON.parse(cached)); } catch (e) { setMessages(existing.messages || []); }
            } else {
              setMessages(existing.messages || []);
            }
            if (existing.messages?.length > 0) setDocsSharedWithAgent(true);
            return;
          }
        } catch (e) {
          sessionStorage.removeItem('compass_conversation_id');
          sessionStorage.removeItem('compass_messages');
        }
      }
      const conv = await base44.agents.createConversation({
        agent_name: 'compass',
        metadata: { name: 'Compass Session' },
      });
      sessionStorage.setItem('compass_conversation_id', conv.id);
      sessionStorage.removeItem('compass_messages');
      setConversation(conv);
      setMessages(conv.messages || []);
    }
    initConversation();
  }, []);

  useEffect(() => {
    const handler = (e) => setMessages(e.detail.messages || []);
    window.addEventListener('compass_update', handler);
    return () => window.removeEventListener('compass_update', handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startNewChat() {
    sessionStorage.removeItem('compass_conversation_id');
    sessionStorage.removeItem('compass_messages');
    setConversation(null);
    setMessages([]);
    setDocsSharedWithAgent(false);
    const conv = await base44.agents.createConversation({ agent_name: 'compass', metadata: { name: 'Compass Session' } });
    sessionStorage.setItem('compass_conversation_id', conv.id);
    setConversation(conv);
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || !conversation || sending) return;
    
    const msg = input.trim();
    setInput('');
    setSending(true);
    
    const caseContext = selectedCase ? ` [Analyzing case ID: ${selectedCase}]` : '';
    const messagePayload = { role: 'user', content: msg + caseContext };
    
    const docUrls = townConfig?.ordinance_docs || [];
    if (docUrls.length > 0 && !docsSharedWithAgent) {
      messagePayload.file_urls = docUrls;
      setDocsSharedWithAgent(true);
    }
    
    try {
      await base44.agents.addMessage(conversation, messagePayload);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  async function saveConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    try {
      if (townConfig?.id) {
        const updated = await base44.entities.TownConfig.update(townConfig.id, configForm);
        setTownConfig(updated);
      } else {
        const created = await base44.entities.TownConfig.create({ ...configForm, is_active: true });
        setTownConfig(created);
      }
      setShowConfig(false);
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleDocUpload(e) {
    const file = e.target.files[0];
    if (!file || !townConfig?.id) return;
    
    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const existingDocs = townConfig.ordinance_docs || [];
      const existingNames = townConfig.ordinance_doc_names || [];
      const newDocEntry = { url: file_url, name: file.name, uploaded_at: new Date().toISOString() };
      
      const updated = await base44.entities.TownConfig.update(townConfig.id, {
        ordinance_docs: [...existingDocs, file_url],
        ordinance_doc_names: [...existingNames, newDocEntry],
      });
      
      setTownConfig(updated);
      setUploadedDocNames(updated.ordinance_doc_names);
      setLastUploadedDoc(file.name);
      setTimeout(() => setLastUploadedDoc(null), 4000);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadingDoc(false);
    }
  }

  async function removeDocument(index) {
    if (!townConfig?.id) return;
    const docNames = townConfig.ordinance_doc_names || [];
    const docs = townConfig.ordinance_docs || [];
    const newDocNames = docNames.filter((_, i) => i !== index);
    const newDocs = docs.filter((_, i) => i !== index);
    
    const updated = await base44.entities.TownConfig.update(townConfig.id, {
      ordinance_docs: newDocs,
      ordinance_doc_names: newDocNames,
    });
    setTownConfig(updated);
    setUploadedDocNames(newDocNames);
  }

  async function askWithCase() {
    if (!selectedCase) return;
    const c = cases.find(ca => ca.id === selectedCase);
    if (!c) return;
    setInput(`Please analyze case ${c.case_number || c.id.slice(0, 8)} at ${c.property_address}. Review the investigation notes and any photos, then tell me: (1) Does a violation exist? (2) What specific RSA or local ordinance applies? (3) What is the recommended enforcement path given the current status of "${c.status.replace(/_/g, ' ')}"?`);
  }

  const isLoading = messages.length > 0 && messages[messages.length - 1]?.role === 'user' && sending;

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Compass AI</h1>
              <p className="text-xs text-muted-foreground">
                NH Land Use & Zoning Advisor
                {townConfig && <span className="text-indigo-600 font-medium"> · {townConfig.town_name}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={startNewChat} className="gap-1.5 text-muted-foreground hover:text-destructive">
              <RotateCcw className="w-3.5 h-3.5" /> New Chat
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)} className="gap-1.5">
                <Settings className="w-3.5 h-3.5" /> Settings
              </Button>
            )}
          </div>
        </div>

        {showConfig && isAdmin && (
          <div className="mt-4 max-w-5xl mx-auto bg-indigo-50 border border-indigo-200 rounded-xl p-5">
            <form onSubmit={saveConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Town Name</Label>
                  <Input value={configForm.town_name} onChange={e => setConfigForm(f => ({ ...f, town_name: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">State</Label>
