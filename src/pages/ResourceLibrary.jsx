import { useState } from 'react';
import { BookOpen, Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import PageHeader from '../components/shared/PageHeader';

const resources = [
  {
    category: 'Key NH Statutes',
    items: [
      {
        term: 'RSA 676:15 — Injunctive Relief',
        definition: 'Allows a municipality to seek a court injunction in Superior Court to stop a land use violation and require abatement (cleanup). If the town prevails, it can recover attorney\'s fees and costs.',
        tip: 'Use this path (Path B) for serious or persistent violations where a court order is needed to compel compliance.',
      },
      {
        term: 'RSA 676:17 — Fines and Penalties',
        definition: 'Establishes civil penalties for violations of local land use regulations. Fines are $275 per day for a first offense and $550 per day for subsequent offenses.',
        tip: 'Penalties accrue daily once a citation is issued. The district court handles these cases.',
      },
      {
        term: 'RSA 676:17-a — Cease and Desist Orders',
        definition: 'Authorizes local officials to issue cease and desist orders when a violation is occurring. The violator must stop the illegal activity immediately upon receipt.',
        tip: 'A cease and desist is a powerful preliminary tool — it can be issued before formal court action.',
      },
      {
        term: 'RSA 676:17-b — Land Use Citations',
        definition: 'Allows code enforcement officers to issue citations directly, similar to a traffic ticket. The citation directs the violator to appear in District Court.',
        tip: 'This is Path A — a faster, more streamlined enforcement mechanism than Superior Court.',
      },
      {
        term: 'RSA 676:5 — Appeals to Zoning Board of Adjustment',
        definition: 'Property owners have 30 days from the date they receive a Notice of Violation to file an appeal with the local Zoning Board of Adjustment (ZBA).',
        tip: 'Always include ZBA appeal rights in every NOV. Failure to do so can invalidate enforcement action.',
      },
      {
        term: 'RSA 595-B — Administrative Inspection Warrants',
        definition: 'When a violation is not visible from a public right-of-way, an officer must obtain an administrative warrant from a court before entering private property to inspect.',
        tip: 'Document whether the violation is visible from public access. If not, apply for a warrant before any site inspection.',
      },
    ],
  },
  {
    category: 'Land Use Terms',
    items: [
      {
        term: 'Abutter',
        definition: 'A property owner whose land directly borders (abuts) the property in question. Abutters are typically entitled to notice of zoning actions and public hearings.',
        tip: 'Check your town\'s definition — some towns define abutters to include properties within a certain distance, not just direct borders.',
      },
      {
        term: 'Injunctive Relief',
        definition: 'A court order that requires a party to do (or stop doing) something. In land use, this typically means a court orders a property owner to stop violating and/or restore the property.',
        tip: 'Sought through Superior Court under RSA 676:15. More powerful than fines alone.',
      },
      {
        term: 'ZBA Appeal',
        definition: 'The Zoning Board of Adjustment (ZBA) is the local body that hears appeals of administrative decisions made by code enforcement officers and building inspectors.',
        tip: 'The ZBA can uphold, modify, or overturn a code enforcement decision.',
      },
      {
        term: 'Abatement',
        definition: 'The act of eliminating or correcting a violation. For example, removing an illegal structure or ceasing an unpermitted use.',
        tip: 'The NOV should clearly describe what the violator must do to achieve abatement.',
      },
      {
        term: 'Notice of Violation (NOV)',
        definition: 'A formal written notice informing a property owner that their property is in violation of a specific code or ordinance, and providing a deadline to correct the violation.',
        tip: 'Must be specific: cite the exact code, describe the violation, set a clear deadline, and include appeal rights.',
      },
      {
        term: 'Setback',
        definition: 'The minimum required distance between a building or structure and a property line, road, or other boundary as specified in the local zoning ordinance.',
        tip: 'Setback violations are among the most common issues in NH towns.',
      },
      {
        term: 'Variance',
        definition: 'Permission from the ZBA to use property in a way that deviates from the zoning ordinance. Granted only when strict application of the ordinance would cause unnecessary hardship.',
        tip: 'A violator may apply for a variance as an alternative to abatement.',
      },
      {
        term: 'Cease and Desist',
        definition: 'An order requiring immediate cessation of an illegal activity. In NH land use, authorized under RSA 676:17-a.',
        tip: 'More urgent than an NOV — demands immediate stop, not just compliance within a deadline.',
      },
    ],
  },
  {
    category: 'Process Guides',
    items: [
      {
        term: 'Complaint-to-Resolution Lifecycle',
        definition: '1. Receive complaint → 2. Investigate → 3. Issue NOV → 4. Monitor compliance → 5. If non-compliant, choose Path A (Citation) or Path B (Court) → 6. Resolve',
        tip: 'Use the Action Wizard for step-by-step guidance at each stage.',
      },
      {
        term: 'Dual Delivery Requirement',
        definition: 'NH best practice recommends sending the NOV via both Certified Mail (provides proof of delivery) and First Class Mail (in case certified mail is refused). This ensures the violator cannot claim non-receipt.',
        tip: 'Always track certified mail return receipts and log them in the system.',
      },
      {
        term: 'Penalty Calculation (RSA 676:17)',
        definition: 'First offense: $275 per day. Subsequent offense (same violator, same or similar violation): $550 per day. Penalties begin accruing from the date of citation.',
        tip: 'Track penalty start date carefully. Total accrued fines are calculated as: (number of days) × (daily rate).',
      },
    ],
  },
];

export default function ResourceLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  const toggleItem = (key) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredResources = resources.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !searchTerm ||
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Resource Library"
        description="Plain-English explanations of NH land use terms, statutes, and processes"
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search terms, statutes, or definitions..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-8">
        {filteredResources.map(category => (
          <div key={category.category}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {category.category}
            </h2>
            <div className="space-y-2">
              {category.items.map(item => {
                const key = `${category.category}-${item.term}`;
                const isExpanded = expandedItems[key];
                return (
                  <div key={key} className="bg-card rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm font-semibold">{item.term}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.definition}</p>
                        {item.tip && (
                          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                            <p className="text-xs font-semibold text-primary mb-0.5">💡 Practical Tip</p>
                            <p className="text-xs text-muted-foreground">{item.tip}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}