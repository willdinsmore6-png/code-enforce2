import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { mergeActingTownPayload } from '@/lib/actingTownInvoke';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, impersonatedMunicipality, checkAppState } = useAuth();
  const [full_name, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const payload =
          user.role === 'superadmin'
            ? { all: true }
            : mergeActingTownPayload(user, impersonatedMunicipality, {});
        const res = await base44.functions.invoke('getUsers', payload);
        const row = (res.data?.users || []).find((u) => u.id === user.id);
        if (!cancelled && row) {
          setFullName(row.full_name || '');
          setPhone(row.phone || '');
          setTitle(row.title || '');
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, impersonatedMunicipality]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await base44.functions.invoke('updateUserProfile', {
        full_name: full_name.trim(),
        phone: phone.trim(),
        title: title.trim(),
      });
      if (res.data?.error) throw new Error(res.data.error);
      await checkAppState();
    } catch (err) {
      alert(err.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My profile"
        description="Your name and contact details appear when you are assigned as the officer on a case and in internal lists."
        helpTitle="Profile"
        helpContent={
          <p>
            <strong>Assigned officer</strong> on cases still stores your login email for automated reminders; the app shows your display
            name in dropdowns and the timeline when set.
          </p>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <Label>Email</Label>
          <Input value={user?.email || ''} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Email is managed by your sign-in provider.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="full_name">Display name</Label>
          <Input
            id="full_name"
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Jane Smith, Code Enforcement Officer"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="title">Job title (optional)</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Zoning Administrator" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Work or mobile" />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </form>
    </div>
  );
}
