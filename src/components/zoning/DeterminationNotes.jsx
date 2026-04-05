import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { logAuditEntry } from '@/lib/logAuditClient';

function parseNoteBody(changes) {
  if (changes == null) return '';
  if (typeof changes === 'object' && changes !== null && 'note' in changes) {
    return String(changes.note ?? '');
  }
  if (typeof changes === 'string') {
    try {
      const p = JSON.parse(changes);
      if (p && typeof p === 'object' && 'note' in p) return String(p.note ?? '');
    } catch {
      return changes;
    }
  }
  return String(changes);
}

export default function DeterminationNotes({ zoningDeterminationId, fileNumber, townId }) {
  const { user, impersonatedMunicipality } = useAuth();
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const results = await base44.entities.AuditLog.filter({ zoning_determination_id: zoningDeterminationId });
        if (cancelled) return;
        const filtered = (results || []).filter((r) => r.action === 'User note' || r.action === 'note_added');
        setNotes(filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } catch (e) {
        console.error(e);
        setNotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [zoningDeterminationId]);

  async function handleSave() {
    if (!input.trim()) return;
    setSaving(true);
    await logAuditEntry(user, impersonatedMunicipality, {
      case_id: '',
      zoning_determination_id: zoningDeterminationId,
      case_number: fileNumber || '',
      town_id: townId || '',
      entity_type: 'ZoningDetermination',
      entity_id: zoningDeterminationId,
      action: 'User note',
      changes: JSON.stringify({ note: input.trim() }),
    }).catch((err) => console.warn('Audit log failed', err));
    const newNote = {
      id: Date.now(),
      zoning_determination_id: zoningDeterminationId,
      action: 'User note',
      user_name: user?.full_name || user?.email || 'Unknown',
      user_email: user?.email,
      changes: JSON.stringify({ note: input.trim() }),
      timestamp: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setInput('');
    setSaving(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold">File notes</h3>
        <span className="text-xs text-muted-foreground">({notes.length})</span>
      </div>
      <div className="mb-5 space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Internal notes, research, or draft language…"
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving || !input.trim()} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add note
          </Button>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border/80 bg-muted/20 p-3 text-sm">
              <div className="mb-1 flex justify-between gap-2 text-xs text-muted-foreground">
                <span>{n.user_name || n.user_email || 'Staff'}</span>
                <span>{n.timestamp ? format(new Date(n.timestamp), 'MMM d, yyyy h:mm a') : ''}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{parseNoteBody(n.changes)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
