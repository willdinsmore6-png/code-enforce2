import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { auditTownId, logAuditEntry } from '@/lib/logAuditClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function EditCaseModal({ caseData, open, onClose, onSave }) {
  const { user, impersonatedMunicipality, municipality } = useAuth();
  const [form, setForm] = useState({});
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (caseData) {
      setForm({
        property_address: caseData.property_address || '',
        property_owner_name: caseData.property_owner_name || '',
        property_owner_email: caseData.property_owner_email || '',
        property_owner_phone: caseData.property_owner_phone || '',
        violation_type: caseData.violation_type || '',
        violation_description: caseData.violation_description || '',
        specific_code_violated: caseData.specific_code_violated || '',
        abatement_deadline: caseData.abatement_deadline || '',
        zba_appeal_deadline: caseData.zba_appeal_deadline || '',
        priority: caseData.priority || 'medium',
        assigned_officer: caseData.assigned_officer || '',
        resolution_notes: caseData.resolution_notes || '',
      });
    }
  }, [caseData]);

  useEffect(() => {
    base44.functions
      .invoke('getUsers', mergeActingTownPayload(user, impersonatedMunicipality, {}))
      .then(res => setUsers(res.data?.users || []));
  }, [user, impersonatedMunicipality]);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    // Compute changed fields for audit log
    const changes = {};
    Object.keys(form).forEach(key => {
      if (form[key] !== (caseData[key] || '')) changes[key] = { from: caseData[key], to: form[key] };
    });
    const assigned_officer =
      !form.assigned_officer || form.assigned_officer === 'unassigned' || form.assigned_officer === '_none'
        ? null
        : form.assigned_officer;
    await base44.entities.Case.update(caseData.id, { ...form, assigned_officer });
    if (Object.keys(changes).length > 0) {
      logAuditEntry(user, impersonatedMunicipality, {
        case_id: caseData.id,
        case_number: caseData.case_number,
        town_id: auditTownId(caseData, municipality),
        entity_type: 'Case',
        entity_id: caseData.id,
        action: 'Updated case',
        changes,
      }).catch((err) => console.warn('Audit log failed', err));
    }
    onSave({ ...caseData, ...form, assigned_officer });
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Case Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-5">
          {/* Property Info */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Property</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Property Address</Label>
                <Input value={form.property_address} onChange={e => update('property_address', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Owner Name</Label>
                <Input value={form.property_owner_name} onChange={e => update('property_owner_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Owner Email</Label>
                <Input type="email" value={form.property_owner_email} onChange={e => update('property_owner_email', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Owner Phone</Label>
                <Input value={form.property_owner_phone} onChange={e => update('property_owner_phone', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Violation */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Violation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Violation Type</Label>
                <Select value={form.violation_type} onValueChange={v => update('violation_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoning">Zoning</SelectItem>
                    <SelectItem value="building_code">Building Code</SelectItem>
                    <SelectItem value="health_safety">Health & Safety</SelectItem>
                    <SelectItem value="signage">Signage</SelectItem>
                    <SelectItem value="setback">Setback</SelectItem>
                    <SelectItem value="use_violation">Use Violation</SelectItem>
                    <SelectItem value="junkyard">Junkyard</SelectItem>
                    <SelectItem value="septic">Septic</SelectItem>
                    <SelectItem value="wetlands">Wetlands</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Specific Code / RSA Cited</Label>
                <Input value={form.specific_code_violated} onChange={e => update('specific_code_violated', e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Violation Description</Label>
                <Textarea rows={3} value={form.violation_description} onChange={e => update('violation_description', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Deadlines & Assignment */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Deadlines & Assignment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Abatement Deadline</Label>
                <Input type="date" value={form.abatement_deadline} onChange={e => update('abatement_deadline', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ZBA Appeal Deadline</Label>
                <Input type="date" value={form.zba_appeal_deadline} onChange={e => update('zba_appeal_deadline', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => update('priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Officer</Label>
                <Select value={form.assigned_officer || '_none'} onValueChange={(v) => update('assigned_officer', v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select officer..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Unassigned —</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {(u.full_name || u.name || u.email) + (u.full_name || u.name ? ` (${u.email})` : '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">This officer will receive automated deadline reminder emails.</p>
              </div>
            </div>
          </div>

          {/* Resolution Notes */}
          <div className="space-y-1.5">
            <Label>Resolution Notes</Label>
            <Textarea rows={2} value={form.resolution_notes} onChange={e => update('resolution_notes', e.target.value)} placeholder="Notes on resolution or ongoing actions..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}