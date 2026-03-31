import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { 
  Globe, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Upload, 
  FileText, 
  Eye, 
  Download, 
  Mail, 
  ShieldCheck, 
  Lock, 
  ChevronRight,
  Camera,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import DocumentPreview from '../components/case/DocumentPreview';
import ClearableInput from '../components/shared/ClearableInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import StatusBadge from '../components/shared/StatusBadge';
import { format } from 'date-fns';

export default function PublicPortal() {
  const [accessCode, setAccessCode] = useState('');
  const [caseData, setCaseData] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [abatementFile, setAbatementFile] = useState(null);
  const [abatementNotes, setAbatementNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsLoggedIn);
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setSearching(true);
    setNotFound(false);
    
    try {
      const response = await base44.functions.invoke('lookupCaseByCode', { 
        access_code: accessCode.trim().toUpperCase() 
      });
      
      if (response.data?.found) {
        setCaseData(response.data.case);
        setDocuments(response.data.documents || []);
        setNotices(response.data.notices || []);
      } else {
        setNotFound(true);
      }
    } catch (err) {
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
    await base44.entities.Document.create({
      case_id: caseData.id,
      name: `Owner Proof — ${format(new Date(), 'MMM d, yyyy')}`,
      file_type: abatementFile?.type || 'text/plain',
      url: fileUrl || '',
      description: abatementNotes || 'Submitted via Public Portal',
      town_id: caseData.town_id
    });
    setSubmitted(true);
    setSubmitting(false);
  }

  const statusMap = {
    intake: { icon: Clock, label: 'Under Review', color: 'bg-blue-500' },
    investigation: { icon: Search, label: 'Active Investigation', color: 'bg-purple-500' },
    notice_sent: { icon: AlertTriangle, label: 'Action Required', color: 'bg-amber-500' },
    awaiting_response: { icon: Mail, label: 'Awaiting Response', color: 'bg-orange-500' },
    citation_issued: { icon: Gavel, label: 'Citation Issued', color: 'bg-red-500' },
    resolved: { icon: CheckCircle, label: 'Resolved', color: 'bg-green-500' },
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-700">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Navigation & Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">Code-Enforce</h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Public Compliance Portal</p>
            </div>
          </div>
          {isLoggedIn && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-xs font-bold gap-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Staff App
            </Button>
          )}
        </div>

        {/* --- STEP 1: ACCESS CODE ENTRY --- */}
        {!caseData && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Lock className="w-32 h-32" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-black text-slate-900 mb-2">Secure Case Access</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Enter the 8-character access code found on the physical notice sent to your property to view status and submit proof of compliance.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4 relative z-10">
              <div className="relative">
                <Input 
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3D4"
                  className="h-16 text-2xl font-black tracking-[0.2em] text-center uppercase border-2 focus-visible:ring-primary border-slate-100 rounded-2xl placeholder:text-slate-200 placeholder:tracking-normal placeholder:font-medium"
                  required
                  maxLength={10}
                />
              </div>
              <Button type="submit" disabled={searching} className="w-full h-14 text-md font-black uppercase tracking-widest shadow-lg shadow-primary/20 group">
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Access Case File <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" /></>}
              </Button>
            </form>

            {notFound && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 animate-in shake-in duration-300">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-xs font-bold text-red-800">Invalid Code. Please verify the code on your notice and try again.</p>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 2: CASE DASHBOARD --- */}
        {caseData && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            {/* Urgency Banner */}
            <div className={`rounded-3xl p-6 border-2 flex items-center gap-4 ${caseData.status === 'resolved' ? 'bg-green-50 border-green-100 text-green-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${caseData.status === 'resolved' ? 'bg-green-500' : 'bg-amber-500'} text-white`}>
                    {caseData.status === 'resolved' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Current Status</p>
                    <h3 className="text-lg font-black leading-none uppercase tracking-tight">
                        {statusMap[caseData.status]?.label || caseData.status.replace('_', ' ')}
                    </h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCaseData(null)} className="opacity-40 hover:opacity-100">Exit</Button>
            </div>

            {/* Case Details Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Property Information</h3>
                    <span className="text-[10px] font-mono font-bold bg-white border border-slate-200 px-2 py-1 rounded tracking-tighter">
                        REF: {caseData.case_number}
                    </span>
                </div>
                <div className="p-6 grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400">Address</p>
                        <p className="text-sm font-bold text-slate-700">{caseData.property_address}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400">Type</p>
                        <p className="text-sm font-bold text-slate-700 uppercase tracking-tighter">{caseData.violation_type?.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>

            {/* Abatement Submission */}
            {!submitted ? (
              <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden ring-4 ring-primary/10">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                
                <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary" /> Resolve Violation
                </h3>
                <p className="text-sm text-white/50 mb-6 leading-relaxed">
                    If you have corrected the violation (e.g. removed debris, fixed structure), upload proof below for the officer to review.
                </p>

                <form onSubmit={handleAbatementSubmit} className="space-y-4 relative z-10">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-white/40">Abatement Notes</Label>
                    <Textarea 
                        value={abatementNotes}
                        onChange={e => setAbatementNotes(e.target.value)}
                        placeholder="Explain what steps you took to achieve compliance..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 min-h-[100px] resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer">
                        <div className="h-12 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                            <Upload className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold text-white/60">{abatementFile ? 'File Selected' : 'Attach Photo'}</span>
                        </div>
                        <input type="file" className="hidden" onChange={e => setAbatementFile(e.target.files[0])} />
                    </label>
                    <Button type="submit" disabled={submitting} className="h-12 font-black uppercase text-xs tracking-widest">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Proof'}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-green-600 rounded-3xl p-8 text-white text-center animate-in zoom-in-95 duration-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-xl font-black mb-2">Submission Received</h3>
                <p className="text-sm text-white/80">
                    Your proof of abatement has been filed. An officer will review the submission and update the case status shortly.
                </p>
              </div>
            )}

            {/* Official Notices */}
            {notices.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">Official Documents</h3>
                    {notices.map(n => (
                        <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{n.title || 'Official Notice'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{format(new Date(n.created_at), 'MMM d, yyyy')}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-primary">
                                <Download className="w-5 h-5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {/* Footer Support */}
        <div className="text-center pt-8">
            <p className="text-[10px] font-black uppercase tracking-tighter text-slate-300">
                System Managed by {municipality?.town_name || 'Town'} Enforcement Department
            </p>
        </div>
      </div>
    </div>
  );
}
