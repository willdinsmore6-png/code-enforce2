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
  }, [municipality]);

  // FIXED: Filter cases by active town context to prevent cross-town data leakage
  useEffect(() => {
    async function loadCases() {
      const activeTownId = municipality?.id || user?.town_id;
      if (!activeTownId) return;

      try {
        // Use filter instead of list to enforce town boundaries
        const c = await base44.entities.Case.filter({ 
          town_id: activeTownId 
        });
        // Filter out closed/resolved cases for the active selection
        setCases(c.filter(ca => !['resolved', 'closed'].includes(ca.status)));
      } catch (error) {
        console.error('Error loading town-specific cases:', error);
      }
    }
    loadCases();
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
      window.dispatchEvent(new CustomEvent('compass_new_conversation'));
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
    window.dispatchEvent(new CustomEvent('compass_new_conversation'));
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.
