import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { mergeActingTownPayload } from '@/lib/actingTownInvoke';

export default function CaseNotes({ caseId, caseNumber }) {
  const { user, impersonatedMunicipality } = useAuth();
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AuditLog.filter({ case_id: caseId, action: 'User note' })
      .then(results => {
        setNotes(results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        setLoading(false);
      });
  }, [caseId]);

  async function handleSave() {
    if (!input.trim()) return;
    setSaving(true);
    const note = await base44.functions.invoke(
      'logAudit',
      mergeActingTownPayload(user, impersonatedMunicipality, {
        case_id: caseId,
        case_number: caseNumber,
        entity_type: 'Case',
        entity_id: caseId,
        action: 'User note',
        changes: JSON.stringify({ note: input.trim() }),
      })
    );
    // Optimistic add
    const newNote = {
      id: Date.now(),
      case_id: caseId,
      action: 'User note',
      user_name: user?.full_name || user?.email || 'Unknown',
      user_email: user?.email,
      changes: JSON.stringify({ note: input.trim() }),
      timestamp: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    setInput('');
    setSaving(false);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <StickyNote className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold">Case Notes</h3>
        <span className="text-xs text-muted-foreground">({notes.length})</span>
      </div>

      {/* Input */}
      <div className="space-y-2 mb-5">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add a note or minor update to this case..."
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving || !input.trim()} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Add Note'}
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map(n => {
            let noteText = n.changes;
            try {
              const parsed = JSON.parse(n.changes);
              noteText = parsed.note || n.changes;
            } catch {}
            return (
              <div key={n.id} className="border-l-2 border-amber-300 pl-3 py-1">
                <p className="text-sm leading-relaxed">{noteText}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {n.user_name || n.user_email || 'Unknown'} · {n.timestamp ? format(new Date(n.timestamp), 'MMM d, yyyy h:mm a') : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}