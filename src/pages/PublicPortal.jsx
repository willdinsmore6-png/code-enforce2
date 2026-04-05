import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Globe, Search, CheckCircle, Clock, AlertTriangle, Upload, FileText, Eye, Download, Mail } from 'lucide-react';
import HelpTip from '@/components/shared/HelpTip';
import DocumentPreview from '../components/case/DocumentPreview';
import ClearableInput from '../components/shared/ClearableInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import StatusBadge from '../components/shared/StatusBadge';
import { format } from 'date-fns';

/** Match server: ignore spaces/dashes, uppercase (notices often group characters). */
function normalizePortalCode(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/[\s\-_]/g, '')
    .toUpperCase();
}

export default function PublicPortal() {
  const [accessCode, setAccessCode] = useState('');
  const [caseData, setCaseData] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showAbatementForm, setShowAbatementForm] = useState(false);
  const [abatementFile, setAbatementFile] = useState(null);
  const [abatementNotes, setAbatementNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchError, setSearchError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsLoggedIn);
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setSearching(true);
    setNotFound(false);
    setSearchError('');
    setCaseData(null);
    setDocuments([]);
    setNotices([]);

    try {
      const response = await base44.functions.invoke('lookupCaseByCode', {
        access_code: normalizePortalCode(accessCode),
      });
      if (response.data?.error) {
        setSearchError(response.data.error);
        setNotFound(true);
        return;
      }
      if (response.data?.found) {
        const foundCase = response.data.case;
        setCaseData(foundCase);
        setDocuments(response.data.documents || []);
        setNotices(response.data.notices || []);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Could not reach the lookup service. If you are on preview, deploy backend functions (lookupCaseByCode) or try again later.';
      setSearchError(msg);
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  }

  async function handleAbatementSubmit(e) {
    e.preventDefault();
    if (!caseData.town_id) {
      alert('Unable to submit: please look up your case again, then try once more.');
      return;
    }
    setSubmitting(true);
    let fileUrl = null;
    if (abatementFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: abatementFile });
      fileUrl = file_url;
    }
    if (!fileUrl) {
      alert('Please attach a photo or document showing compliance (required for upload).');
      setSubmitting(false);
      return;
    }
    const newDoc = await base44.entities.Document.create({
      case_id: caseData.id,
      town_id: caseData.town_id,
      title: `Owner Submission — ${format(new Date(), 'MMM d, yyyy')}`,
      document_type: 'abatement_proof',
      file_url: fileUrl,
      description: abatementNotes || 'Submitted by property owner via public portal',
    });
    setDocuments(prev => [...prev, newDoc]);
    setSubmitted(true);
    setSubmitting(false);
  }

  const statusMessages = {
    pending_review: { icon: Clock, text: 'Your report has been received and is pending review by code enforcement.', color: 'text-blue-700 bg-blue-50' },
    intake: { icon: Clock, text: 'Your case is being reviewed. A code enforcement officer will be assigned shortly.', color: 'text-blue-700 bg-blue-50' },
    investigation: { icon: Search, text: 'An investigation is underway. An officer will visit the property.', color: 'text-purple-700 bg-purple-50' },
    notice_sent: { icon: AlertTriangle, text: 'A Notice of Violation has been sent. Please review the notice carefully and comply by the abatement deadline.', color: 'text-amber-700 bg-amber-50' },
    awaiting_response: { icon: Clock, text: 'We are awaiting your response or compliance. Please take action before the abatement deadline.', color: 'text-orange-700 bg-orange-50' },
    in_compliance: { icon: CheckCircle, text: 'The property is currently in compliance. Thank you for resolving the issue.', color: 'text-green-700 bg-green-50' },
    citation_issued: { icon: AlertTriangle, text: 'A citation has been issued. Please review the citation and court appearance details.', color: 'text-red-700 bg-red-50' },
    court_action: { icon: AlertTriangle, text: 'This case is currently before the court. Please follow all court orders.', color: 'text-rose-700 bg-rose-50' },
    resolved: { icon: CheckCircle, text: 'This case has been resolved. No further action is required.', color: 'text-green-700 bg-green-50' },
    closed: { icon: CheckCircle, text: 'This case is closed.', color: 'text-slate-600 bg-slate-50' },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      {isLoggedIn && (
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          ← Back to App
        </button>
      )}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Globe className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-bold tracking-tight">Code-Enforce</h1>
            <HelpTip title="Public portal">
              <p>
                This page is for <strong>property owners and respondents</strong>. You do not log in here — use the access code printed on
                your notice to view your case summary, download notices, and (when offered) upload proof of compliance.
              </p>
              <p>Staff use the main app to manage cases; share only the access code you intend the recipient to use.</p>
            </HelpTip>
          </div>
          <p className="text-sm text-muted-foreground">Municipal Code Compliance System</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h2 className="font-semibold">Look Up Your Case</h2>
              <HelpTip title="Access code" align="start">
                <p>
                  Enter the <strong>public access code</strong> from your notice (spaces and dashes are optional). If that does not
                  work, try the <strong>case number</strong> shown in the staff app for the same case.
                </p>
                <p>If the code fails, check for typos and try again, or contact the code office — they can re-send or verify the code.</p>
              </HelpTip>
            </div>
            <p className="text-sm text-muted-foreground">Enter the access code from your Notice of Violation</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <ClearableInput
            value={accessCode}
            onChange={e => setAccessCode(e.target.value.toUpperCase())}
            placeholder="e.g. Y19BKLAV or case number"
            className="flex-1 uppercase"
            required
          />
          <Button type="submit" disabled={searching}>
            {searching ? 'Searching...' : 'Look Up'}
          </Button>
        </form>

        {notFound && (
          <p className="text-sm text-destructive mt-3">
            {searchError
              ? searchError
              : 'No case found with that access code. Please check and try again.'}
          </p>
        )}
      </div>

      {caseData && (
        <div className="space-y-4">
          {/* Status Message */}
          {(() => {
            const msg = statusMessages[caseData.status] || statusMessages.intake;
            const Icon = msg.icon;
            return (
              <div className={`rounded-xl border p-5 flex gap-3 ${msg.color}`}>
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold mb-1">Case Status: <StatusBadge status={caseData.status} /></p>
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            );
          })()}

          {/* Case Summary */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <h3 className="font-semibold">Case Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Case Number</p>
                <p className="font-medium">{caseData.case_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Property</p>
                <p className="font-medium">{caseData.property_address}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Violation Type</p>
                <p className="font-medium capitalize">{caseData.violation_type?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Code Cited</p>
                <p className="font-medium">{caseData.specific_code_violated || '—'}</p>
              </div>
              {caseData.abatement_deadline && (
                <div>
                  <p className="text-xs text-muted-foreground">Abatement Deadline</p>
                  <p className="font-medium">{format(new Date(caseData.abatement_deadline), 'MMMM d, yyyy')}</p>
                </div>
              )}
              {caseData.zba_appeal_deadline && (
                <div>
                  <p className="text-xs text-muted-foreground">ZBA Appeal Deadline</p>
                  <p className="font-medium">{format(new Date(caseData.zba_appeal_deadline), 'MMMM d, yyyy')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Your Rights */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Your Rights</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• You may appeal this decision to the Zoning Board of Adjustment (ZBA) within 30 days of receiving the NOV (RSA 676:5)</li>
              <li>• You have the right to a hearing before the ZBA</li>
              <li>• You may submit proof of compliance/abatement below</li>
            </ul>
          </div>

          {/* Official Notices */}
          {notices.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold mb-3">Official Notices</h3>
              <div className="space-y-3">
                {notices.map(n => {
                  const typeLabels = {
                    first_nov: 'First Notice of Violation',
                    second_nov: 'Second Notice of Violation',
                    cease_desist_676_17a: 'Cease & Desist (RSA 676:17-a)',
                    citation_676_17b: 'Citation (RSA 676:17-b)',
                    court_summons: 'Court Summons',
                  };
                  return (
                    <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                      <Mail className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800">{typeLabels[n.notice_type] || n.notice_type}</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Issued {n.date_issued ? format(new Date(n.date_issued), 'MMMM d, yyyy') : '—'}
                          {n.delivery_method ? ` · ${n.delivery_method.replace(/_/g, ' ')}` : ''}
                        </p>
                        {n.rsa_cited && <p className="text-xs text-amber-700">Citing: {n.rsa_cited}</p>}
                        {n.abatement_deadline && <p className="text-xs text-amber-700">Abatement deadline: {format(new Date(n.abatement_deadline), 'MMMM d, yyyy')}</p>}
                        {n.appeal_deadline && <p className="text-xs text-amber-700">Appeal deadline: {format(new Date(n.appeal_deadline), 'MMMM d, yyyy')}</p>}
                        {n.notice_content && <p className="text-xs text-amber-800 mt-2 leading-relaxed border-t border-amber-200 pt-2">{n.notice_content}</p>}
                        {n.document_url && (
                          <a href={n.document_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                            <Download className="w-3 h-3" /> Download Notice Document
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <DocumentPreview document={previewDoc} open={!!previewDoc} onClose={() => setPreviewDoc(null)} />
              <h3 className="font-semibold mb-3">Case Documents</h3>
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.document_type?.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.file_url && (
                        <button onClick={() => setPreviewDoc(doc)} className="text-muted-foreground hover:text-primary transition-colors" title="Preview">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Download">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Abatement Proof */}
          {!submitted ? (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAbatementForm(!showAbatementForm)}
                  className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <Upload className="h-4 w-4" />
                  Submit Proof of Abatement / Upload Document
                </button>
                <HelpTip title="Submitting proof" align="start">
                  <p>
                    Use this to send <strong>photos or documents</strong> that show the violation has been corrected. A file is required
                    before submit.
                  </p>
                  <p>Add short notes describing what was done. Staff will review and may follow up through the case.</p>
                </HelpTip>
              </div>
              {showAbatementForm && (
                <form onSubmit={handleAbatementSubmit} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Description / Notes</Label>
                    <div className="relative">
                      <Textarea value={abatementNotes} onChange={e => setAbatementNotes(e.target.value)} rows={3} placeholder="Describe what you've done to correct the violation..." className="pr-8" />
                      {abatementNotes && (
                        <button type="button" onClick={() => setAbatementNotes('')}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                          <span className="text-xs">✕</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Upload Evidence (photos, documents)</Label>
                    <Input type="file" onChange={e => setAbatementFile(e.target.files[0])} />
                  </div>
                  <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</Button>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-700 font-medium">Your document has been submitted. A code enforcement officer will review it.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
