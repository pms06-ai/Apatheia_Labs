import { useState, useMemo, memo, useCallback } from 'react'
import {
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  Copy,
  Scale,
  Shield,
  Building2,
  Users,
  Gavel,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ErrorCard } from '@/components/ui/error-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { useCaseStore } from '@/hooks/use-case-store'
import { useFindings } from '@/hooks/use-api'
import {
  useRegulatoryBodies,
  useComplaintTemplate,
  useGenerateComplaint,
  useExportComplaint,
} from '@/hooks/use-complaints'
import { isDesktop } from '@/lib/tauri'
import toast from 'react-hot-toast'
import type { RegulatoryBodyId, ComplaintFormat, Finding } from '@/CONTRACT'

// Regulatory body icons
const REGULATORY_ICONS: Record<string, React.ReactNode> = {
  ofcom: <Scale className="h-5 w-5" />,
  ico: <Shield className="h-5 w-5" />,
  hcpc: <Users className="h-5 w-5" />,
  lgo: <Building2 className="h-5 w-5" />,
  bps: <Users className="h-5 w-5" />,
  gmc: <Users className="h-5 w-5" />,
  nmc: <Users className="h-5 w-5" />,
  sra: <Gavel className="h-5 w-5" />,
  bsb: <Gavel className="h-5 w-5" />,
  swe: <Users className="h-5 w-5" />,
}

// Format options
const FORMAT_OPTIONS: { value: ComplaintFormat; label: string; description: string }[] = [
  { value: 'markdown', label: 'Markdown', description: 'Structured text format' },
  { value: 'text', label: 'Plain Text', description: 'Simple text format' },
  { value: 'html', label: 'HTML', description: 'Web-ready format' },
]

export default function ComplaintsPage() {
  const { activeCase } = useCaseStore()
  const caseId = activeCase?.id || ''

  // Data queries
  const {
    data: regulatoryBodies,
    isLoading: bodiesLoading,
    error: bodiesError,
  } = useRegulatoryBodies()
  const { data: findings, isLoading: findingsLoading, error: findingsError } = useFindings(caseId)

  // Form state
  const [selectedBody, setSelectedBody] = useState<RegulatoryBodyId | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<ComplaintFormat>('markdown')
  const [selectedFindings, setSelectedFindings] = useState<string[]>([])
  const [complainantName, setComplainantName] = useState('')
  const [complainantAddress, setComplainantAddress] = useState('')
  const [complainantEmail, setComplainantEmail] = useState('')
  const [complainantPhone, setComplainantPhone] = useState('')
  const [respondentName, setRespondentName] = useState('')
  const [respondentAddress, setRespondentAddress] = useState('')
  const [subject, setSubject] = useState('')
  const [summary, setSummary] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')

  // Template query (depends on selected body)
  const { data: template, isLoading: templateLoading } = useComplaintTemplate(selectedBody)

  // Mutations
  const generateMutation = useGenerateComplaint()
  const exportMutation = useExportComplaint()

  // Generated complaint content
  const [generatedComplaint, setGeneratedComplaint] = useState<string | null>(null)

  // Filtered findings by severity for easy selection
  const findingsBySeverity = useMemo(() => {
    if (!findings) return { critical: [], high: [], medium: [], low: [], info: [] }
    return {
      critical: findings.filter(f => f.severity === 'critical'),
      high: findings.filter(f => f.severity === 'high'),
      medium: findings.filter(f => f.severity === 'medium'),
      low: findings.filter(f => f.severity === 'low'),
      info: findings.filter(f => f.severity === 'info' || !f.severity),
    }
  }, [findings])

  const handleToggleFinding = (findingId: string) => {
    setSelectedFindings(prev =>
      prev.includes(findingId) ? prev.filter(id => id !== findingId) : [...prev, findingId]
    )
  }

  const handleSelectAllSeverity = (severity: keyof typeof findingsBySeverity) => {
    const ids = findingsBySeverity[severity].map(f => f.id)
    setSelectedFindings(prev => {
      const existing = new Set(prev)
      const allSelected = ids.every(id => existing.has(id))
      if (allSelected) {
        // Deselect all
        return prev.filter(id => !ids.includes(id))
      } else {
        // Select all
        return [...new Set([...prev, ...ids])]
      }
    })
  }

  const handleGenerate = async () => {
    if (!selectedBody || !caseId || selectedFindings.length === 0) {
      toast.error('Please select a regulatory body and at least one finding')
      return
    }

    if (!complainantName || !respondentName || !subject) {
      toast.error('Please fill in complainant name, respondent name, and subject')
      return
    }

    try {
      const result = await generateMutation.mutateAsync({
        case_id: caseId,
        regulatory_body: selectedBody,
        format: selectedFormat,
        complainant_name: complainantName,
        complainant_address: complainantAddress || null,
        complainant_email: complainantEmail || null,
        complainant_phone: complainantPhone || null,
        respondent_name: respondentName,
        respondent_address: respondentAddress || null,
        subject,
        summary: summary || null,
        finding_ids: selectedFindings,
        additional_context: additionalContext || null,
        events_from: null,
        events_to: null,
      })

      if (result.success && result.complaint) {
        setGeneratedComplaint(result.complaint.content)
        toast.success('Complaint generated successfully')
      } else {
        toast.error(result.error || 'Failed to generate complaint')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate complaint')
    }
  }

  const handleExport = async (format: 'pdf' | 'docx' | 'markdown') => {
    if (!generatedComplaint) {
      toast.error('No complaint to export')
      return
    }

    const filename = `complaint-${selectedBody}-${new Date().toISOString().split('T')[0]}`

    try {
      await exportMutation.mutateAsync({
        content: generatedComplaint,
        format,
        filename,
      })
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed')
    }
  }

  const handleCopyToClipboard = async () => {
    if (!generatedComplaint) return
    try {
      await navigator.clipboard.writeText(generatedComplaint)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  if (!activeCase) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="No Case Selected"
        description="Select a case from the sidebar to generate regulatory complaints."
      />
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-charcoal-100">
            Complaint Generator
          </h1>
          <p className="mt-1 text-sm text-charcoal-400">
            Generate formal regulatory complaints from analysis findings
          </p>
        </div>
        {!isDesktop() && (
          <Badge variant="default" className="bg-amber-900/50 text-amber-400">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Limited in browser mode
          </Badge>
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-6">
        {/* Left Panel - Configuration */}
        <div className="flex w-96 shrink-0 flex-col gap-4 overflow-y-auto pr-2">
          {/* Regulatory Body Selection */}
          <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-charcoal-100">Regulatory Body</h3>
            {bodiesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : bodiesError ? (
              <ErrorCard
                title="Failed to load regulatory bodies"
                message={bodiesError instanceof Error ? bodiesError.message : 'Unknown error'}
                variant="inline"
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {regulatoryBodies?.map(body => {
                  const isSelected = selectedBody === body.id
                  return (
                    <button
                      key={body.id}
                      onClick={() => setSelectedBody(body.id)}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-bronze-500 bg-bronze-500/10 text-bronze-400'
                          : 'border-charcoal-700 bg-charcoal-800 text-charcoal-300 hover:border-charcoal-600'
                      }`}
                    >
                      <span className={isSelected ? 'text-bronze-500' : 'text-charcoal-500'}>
                        {REGULATORY_ICONS[body.id] || <Shield className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{body.name}</div>
                        <div className="truncate text-xs text-charcoal-500">{body.full_name}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Template Info */}
          {selectedBody && (
            <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
              <h3 className="mb-3 text-sm font-medium text-charcoal-100">Template Requirements</h3>
              {templateLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : template ? (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wider text-charcoal-500">
                      Required Sections
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.required_sections.map(section => (
                        <Badge key={section} variant="default" className="text-xs">
                          {section}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wider text-charcoal-500">
                      Relevant Codes
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.relevant_codes.map(code => (
                        <Badge key={code} variant="info" className="text-xs">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          )}

          {/* Format Selection */}
          <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-charcoal-100">Output Format</h3>
            <Select
              value={selectedFormat}
              onValueChange={v => setSelectedFormat(v as ComplaintFormat)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      <span className="text-xs text-charcoal-500">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {/* Complainant Details */}
          <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-charcoal-100">Complainant Details</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-charcoal-400">Name *</label>
                <Input
                  value={complainantName}
                  onChange={e => setComplainantName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-charcoal-400">Address</label>
                <Input
                  value={complainantAddress}
                  onChange={e => setComplainantAddress(e.target.value)}
                  placeholder="Address"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-charcoal-400">Email</label>
                <Input
                  type="email"
                  value={complainantEmail}
                  onChange={e => setComplainantEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-charcoal-400">Phone</label>
                <Input
                  type="tel"
                  value={complainantPhone}
                  onChange={e => setComplainantPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>
          </Card>

          {/* Respondent Details */}
          <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-charcoal-100">Respondent Details</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-charcoal-400">Name *</label>
                <Input
                  value={respondentName}
                  onChange={e => setRespondentName(e.target.value)}
                  placeholder="Organization or individual name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-charcoal-400">Address</label>
                <Input
                  value={respondentAddress}
                  onChange={e => setRespondentAddress(e.target.value)}
                  placeholder="Address"
                />
              </div>
            </div>
          </Card>

          {/* Subject and Summary */}
          <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-charcoal-100">Complaint Subject</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-charcoal-400">Subject *</label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Brief subject line"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-charcoal-400">Summary</label>
                <textarea
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Brief summary of the complaint (optional)"
                  className="h-24 w-full rounded-lg border border-charcoal-600 bg-charcoal-800 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-500 focus:border-bronze-500 focus:outline-none focus:ring-2 focus:ring-bronze-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-charcoal-400">Additional Context</label>
                <textarea
                  value={additionalContext}
                  onChange={e => setAdditionalContext(e.target.value)}
                  placeholder="Any additional context or background (optional)"
                  className="h-20 w-full rounded-lg border border-charcoal-600 bg-charcoal-800 px-3 py-2 text-sm text-charcoal-100 placeholder:text-charcoal-500 focus:border-bronze-500 focus:outline-none focus:ring-2 focus:ring-bronze-500/30"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Center Panel - Findings Selection */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card className="flex-1 border-charcoal-700 bg-charcoal-800/30 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-charcoal-700/50 p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-bronze-500" />
                <h3 className="font-medium text-charcoal-100">Evidence Selection</h3>
                <Badge variant="outline" className="border-charcoal-600 text-charcoal-400">
                  {selectedFindings.length} selected
                </Badge>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedFindings(findings?.map(f => f.id) || [])}
                  className="text-xs font-medium text-bronze-500 transition-colors hover:text-bronze-400"
                >
                  Select All
                </button>
                <div className="h-4 w-px bg-charcoal-700" />
                <button
                  onClick={() => setSelectedFindings([])}
                  className="text-xs text-charcoal-400 transition-colors hover:text-charcoal-300"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {findingsLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner size="lg" />
                </div>
              ) : findingsError ? (
                <ErrorCard
                  title="Failed to load findings"
                  message={findingsError instanceof Error ? findingsError.message : 'Unknown error'}
                  variant="card"
                />
              ) : !findings || findings.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-12 w-12" />}
                  title="No Findings Available"
                  description="Run analysis engines to generate findings that can be included in complaints."
                />
              ) : (
                <Tabs defaultValue="critical" className="h-full">
                  <TabsList className="border border-charcoal-700 bg-charcoal-800">
                    <TabsTrigger
                      value="critical"
                      className="gap-2 data-[state=active]:bg-charcoal-700"
                    >
                      Critical
                      <Badge variant="critical" className="px-1.5 py-0 text-[10px]">
                        {findingsBySeverity.critical.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="high" className="gap-2 data-[state=active]:bg-charcoal-700">
                      High
                      <Badge variant="high" className="px-1.5 py-0 text-[10px]">
                        {findingsBySeverity.high.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                      value="medium"
                      className="gap-2 data-[state=active]:bg-charcoal-700"
                    >
                      Medium
                      <Badge variant="medium" className="px-1.5 py-0 text-[10px]">
                        {findingsBySeverity.medium.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-charcoal-700">
                      All
                      <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                        {findings.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="critical" className="mt-4 space-y-2">
                    <FindingsList
                      findings={findingsBySeverity.critical}
                      selectedIds={selectedFindings}
                      onToggle={handleToggleFinding}
                      onSelectAll={() => handleSelectAllSeverity('critical')}
                    />
                  </TabsContent>
                  <TabsContent value="high" className="mt-4 space-y-2">
                    <FindingsList
                      findings={findingsBySeverity.high}
                      selectedIds={selectedFindings}
                      onToggle={handleToggleFinding}
                      onSelectAll={() => handleSelectAllSeverity('high')}
                    />
                  </TabsContent>
                  <TabsContent value="medium" className="mt-4 space-y-2">
                    <FindingsList
                      findings={findingsBySeverity.medium}
                      selectedIds={selectedFindings}
                      onToggle={handleToggleFinding}
                      onSelectAll={() => handleSelectAllSeverity('medium')}
                    />
                  </TabsContent>
                  <TabsContent value="all" className="mt-4 space-y-2">
                    <FindingsList
                      findings={findings}
                      selectedIds={selectedFindings}
                      onToggle={handleToggleFinding}
                      onSelectAll={() =>
                        setSelectedFindings(prev =>
                          prev.length === findings.length ? [] : findings.map(f => f.id)
                        )
                      }
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>

            {/* Generate Button */}
            <div className="border-t border-charcoal-700/50 bg-charcoal-900/50 p-4">
              <Button
                onClick={handleGenerate}
                disabled={
                  !selectedBody ||
                  selectedFindings.length === 0 ||
                  !complainantName ||
                  !respondentName ||
                  !subject ||
                  generateMutation.isPending
                }
                loading={generateMutation.isPending}
                className="w-full"
                size="lg"
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate Complaint'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex w-96 shrink-0 flex-col gap-4">
          <Card className="flex-1 border-charcoal-700 bg-charcoal-800/30 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-charcoal-700/50 p-4">
              <h3 className="font-medium text-charcoal-100">Preview</h3>
              {generatedComplaint && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyToClipboard}
                    className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700 hover:text-charcoal-200"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {generatedComplaint ? (
                <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-charcoal-300">
                  {generatedComplaint}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center text-charcoal-500">
                    <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p className="text-sm">Complaint preview will appear here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Export Buttons */}
            {generatedComplaint && (
              <div className="border-t border-charcoal-700/50 p-4">
                <div className="mb-2 text-xs uppercase tracking-wider text-charcoal-500">
                  Export As
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExport('markdown')}
                    disabled={exportMutation.isPending}
                    className="flex-1"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Markdown
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExport('pdf')}
                    disabled={exportMutation.isPending || !isDesktop()}
                    title={!isDesktop() ? 'PDF export requires desktop mode' : undefined}
                    className="flex-1"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    PDF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExport('docx')}
                    disabled={exportMutation.isPending || !isDesktop()}
                    title={!isDesktop() ? 'DOCX export requires desktop mode' : undefined}
                    className="flex-1"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    DOCX
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Status Card */}
          <Card className="border-charcoal-700 bg-gradient-to-br from-charcoal-800 to-charcoal-900 p-4">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-charcoal-400">
              Complaint Status
            </h4>
            <div className="space-y-3">
              <StatusItem
                label="Regulatory Body"
                value={selectedBody?.toUpperCase() || 'Not selected'}
                isComplete={!!selectedBody}
              />
              <StatusItem
                label="Findings"
                value={`${selectedFindings.length} selected`}
                isComplete={selectedFindings.length > 0}
              />
              <StatusItem
                label="Complainant"
                value={complainantName || 'Not entered'}
                isComplete={!!complainantName}
              />
              <StatusItem
                label="Respondent"
                value={respondentName || 'Not entered'}
                isComplete={!!respondentName}
              />
              <StatusItem label="Subject" value={subject || 'Not entered'} isComplete={!!subject} />
              <div className="h-px bg-charcoal-700" />
              <StatusItem
                label="Generated"
                value={generatedComplaint ? 'Ready to export' : 'Not yet'}
                isComplete={!!generatedComplaint}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Helper components

interface FindingItemProps {
  finding: Finding
  isSelected: boolean
  onToggle: (id: string) => void
}

/**
 * Individual finding item - memoized to prevent re-renders in large finding lists
 */
const FindingItem = memo(function FindingItem({ finding, isSelected, onToggle }: FindingItemProps) {
  const handleClick = useCallback(() => {
    onToggle(finding.id)
  }, [onToggle, finding.id])

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer rounded-lg border p-3 transition-all ${
        isSelected
          ? 'border-bronze-500/50 bg-bronze-500/10'
          : 'border-charcoal-700 bg-charcoal-800/50 hover:border-charcoal-600'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            isSelected ? 'border-bronze-500 bg-bronze-500' : 'border-charcoal-600 bg-transparent'
          }`}
        >
          {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-charcoal-100">{finding.title}</span>
            <Badge
              variant={
                finding.severity === 'critical'
                  ? 'critical'
                  : finding.severity === 'high'
                    ? 'high'
                    : finding.severity === 'medium'
                      ? 'medium'
                      : 'low'
              }
              className="shrink-0 text-[10px]"
            >
              {finding.severity || 'info'}
            </Badge>
          </div>
          {finding.description && (
            <p className="mt-1 line-clamp-2 text-xs text-charcoal-400">{finding.description}</p>
          )}
          <div className="mt-1 text-[10px] uppercase tracking-wider text-charcoal-500">
            {finding.engine.replace(/_/g, ' ')}
          </div>
        </div>
      </div>
    </div>
  )
})
FindingItem.displayName = 'FindingItem'

interface FindingsListProps {
  findings: Finding[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: () => void
}

/**
 * Findings list component - uses memoized FindingItem for each finding
 */
function FindingsList({ findings, selectedIds, onToggle, onSelectAll }: FindingsListProps) {
  // Memoize the allSelected calculation
  const allSelected = useMemo(
    () => findings.every(f => selectedIds.includes(f.id)),
    [findings, selectedIds]
  )

  if (findings.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-charcoal-500">No findings in this category</div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onSelectAll}
        className="mb-2 text-xs font-medium text-bronze-500 hover:text-bronze-400"
      >
        {allSelected ? 'Deselect all' : 'Select all'} ({findings.length})
      </button>
      {findings.map(finding => (
        <FindingItem
          key={finding.id}
          finding={finding}
          isSelected={selectedIds.includes(finding.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

interface StatusItemProps {
  label: string
  value: string
  isComplete: boolean
}

function StatusItem({ label, value, isComplete }: StatusItemProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-charcoal-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${isComplete ? 'text-charcoal-100' : 'text-charcoal-500'}`}>
          {value}
        </span>
        {isComplete ? (
          <CheckCircle className="h-4 w-4 text-status-success" />
        ) : (
          <div className="h-4 w-4 rounded-full border border-charcoal-600" />
        )}
      </div>
    </div>
  )
}
