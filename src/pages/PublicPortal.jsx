import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Globe, Search, CheckCircle, Clock, AlertTriangle, Upload, FileText, Eye, Download } from 'lucide-react';
import DocumentPreview from '../components/case/DocumentPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';
import { format } from 'date-fns';

export default function PublicPortal() {
  const [accessCode, setAccessCode] = useState('');
  const [caseData, setCaseData] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showAbatementForm, setShowAbatementForm] = useState(false);
  const [abatementFile, setAbatementFile] = useState(null);
  const [abatementNotes, setAbatementNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    setSearching(true);
    setNotFound(false);
    setCaseData(null);

    const response = await base44.functions.invoke('lookupCaseByCode', { access_code: accessCode.trim().toUpperCase() });
    if (response.data?.found) {
      setCaseData(response.data.case);
      setDocuments(response.data.documents || []);
    } else {
      setNotFound(true);
    }
    setSearching(false);
  }

  async function handleAbatementSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    let fileUrl = null;
    if (abatementFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: abatementFile });
      fileUrl = file_url;
    }
    const newDoc = await base44.entities.Document.create({
      case_id: caseData.id,
      title: `Owner Submission — ${format(new Date(), 'MMM d, yyyy')}`,
      document_type: 'abatement_proof',
      file_url: fileUrl || '',
      description: abatementNotes || 'Submitted by property owner via public portal',
    });
    setDocuments(prev => [...prev, newDoc]);
    setSubmitted(true);
    setSubmitting(false);
  }

  const statusMessages = {
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
      <PageHeader
        title="Public Portal"
        description="Check your compliance status or submit proof of abatement"
      />

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Look Up Your Case</h2>
            <p className="text-sm text-muted-foreground">Enter the access code from your Notice of Violation</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <Input
            value={accessCode}
            onChange={e => setAccessCode(e.target.value)}
            placeholder="Enter access code (e.g., A1B2C3D4)"
            className="flex-1 uppercase"
            required
          />
          <Button type="submit" disabled={searching}>
            {searching ? 'Searching...' : 'Look Up'}
          </Button>
        </form>

        {notFound && (
          <p className="text-sm text-destructive mt-3">No case found with that access code. Please check and try again.</p>
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
              <button
                onClick={() => setShowAbatementForm(!showAbatementForm)}
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <Upload className="w-4 h-4" />
                Submit Proof of Abatement / Upload Document
              </button>
              {showAbatementForm && (
                <form onSubmit={handleAbatementSubmit} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Description / Notes</Label>
                    <Textarea value={abatementNotes} onChange={e => setAbatementNotes(e.target.value)} rows={3} placeholder="Describe what you've done to correct the violation..." />
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