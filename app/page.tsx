'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAIAgent } from '@/lib/aiAgent'
import { FiCheck, FiX, FiCopy, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { SiCoursera, SiYoutube } from 'react-icons/si'
import { HiOutlineDocumentSearch, HiOutlineAcademicCap, HiOutlineLightBulb, HiOutlineCode } from 'react-icons/hi'
import { BiBookOpen } from 'react-icons/bi'

// ─── TypeScript Interfaces ─────────────────────────────────────────────────

interface Course {
  skill: string
  course_name: string
  platform: string
  description: string
}

interface SkillGapResult {
  readiness_score: number
  matched_skills: string[]
  missing_skills: string[]
  recommended_courses: Course[]
  learning_roadmap: string
  resume_skills_extracted: string[]
  job_description_skills_extracted: string[]
}

// ─── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_RESUME = `John Doe — Full Stack Developer

Skills: JavaScript, TypeScript, React, Node.js, Express, HTML, CSS, Tailwind CSS, Git, GitHub, REST APIs, MongoDB, PostgreSQL, Agile/Scrum

Experience:
- Built scalable web applications using React and Node.js
- Designed RESTful APIs with Express and MongoDB
- Implemented CI/CD pipelines with GitHub Actions
- Collaborated in Agile teams using Scrum methodology

Education: B.S. Computer Science, State University`

const SAMPLE_JOB_DESC = `Senior Full Stack Engineer — Acme Corp

Requirements:
- 5+ years experience with JavaScript, TypeScript, React, and Node.js
- Proficiency in Python and Django for backend microservices
- Experience with AWS (EC2, S3, Lambda, CloudFormation)
- Knowledge of Docker and Kubernetes for container orchestration
- Familiarity with GraphQL APIs
- Experience with Redis caching and message queues (RabbitMQ/Kafka)
- Strong understanding of CI/CD, testing (Jest, Cypress), and monitoring
- Excellent communication and leadership skills`

const SAMPLE_RESULT: SkillGapResult = {
  readiness_score: 58,
  matched_skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'REST APIs', 'Git', 'CI/CD', 'Agile/Scrum'],
  missing_skills: ['Python', 'Django', 'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'Redis', 'RabbitMQ/Kafka', 'Cypress'],
  recommended_courses: [
    { skill: 'Python', course_name: 'Python for Everybody Specialization', platform: 'Coursera', description: 'Learn Python programming from basics to data structures with hands-on projects.' },
    { skill: 'AWS', course_name: 'AWS Cloud Practitioner Essentials', platform: 'Coursera', description: 'Understand AWS cloud fundamentals, core services, pricing, and architecture.' },
    { skill: 'Docker', course_name: 'Docker for Beginners', platform: 'YouTube', description: 'Comprehensive Docker tutorial covering images, containers, volumes, and networking.' },
    { skill: 'Kubernetes', course_name: 'Kubernetes for the Absolute Beginners', platform: 'YouTube', description: 'Learn Kubernetes architecture, pods, deployments, and services step by step.' },
    { skill: 'GraphQL', course_name: 'GraphQL Full Course', platform: 'freeCodeCamp', description: 'Build a full-stack application with GraphQL, Apollo Server, and React.' },
  ],
  learning_roadmap: '## Recommended Learning Path\n\n### Phase 1: Backend Expansion (Weeks 1-4)\n- **Python fundamentals** — Start with Python for Everybody on Coursera\n- **Django basics** — Build a REST API with Django REST Framework\n\n### Phase 2: Cloud & DevOps (Weeks 5-8)\n- **AWS essentials** — Complete AWS Cloud Practitioner certification path\n- **Docker** — Containerize your existing Node.js and new Django projects\n- **Kubernetes** — Learn orchestration with local Minikube clusters\n\n### Phase 3: Advanced Tools (Weeks 9-12)\n- **GraphQL** — Replace one REST API in your portfolio with GraphQL\n- **Redis & Message Queues** — Add caching and async processing to projects\n- **Cypress testing** — Write end-to-end tests for your React apps\n\n### Tips\n- Build a portfolio project that demonstrates ALL these skills together\n- Contribute to open-source projects using these technologies\n- Practice system design interviews focusing on microservices architecture',
  resume_skills_extracted: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'HTML', 'CSS', 'Tailwind CSS', 'Git', 'GitHub', 'REST APIs', 'MongoDB', 'PostgreSQL', 'Agile/Scrum', 'CI/CD'],
  job_description_skills_extracted: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Django', 'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'Redis', 'RabbitMQ/Kafka', 'CI/CD', 'Jest', 'Cypress', 'REST APIs', 'Communication', 'Leadership'],
}

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENT_ID = '699963050fc64800c899bb8f'

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1 text-[hsl(160,20%,95%)]">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1 text-[hsl(160,20%,95%)]">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2 text-[hsl(160,20%,95%)]">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm text-[hsl(160,15%,75%)]">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm text-[hsl(160,15%,75%)]">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm text-[hsl(160,15%,75%)]">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-[hsl(160,20%,95%)]">{part}</strong> : part
  )
}

function getPlatformInfo(platform: string): { color: string; bgColor: string; icon: React.ReactNode } {
  const p = (platform ?? '').toLowerCase()
  if (p.includes('coursera')) return { color: 'text-blue-400', bgColor: 'bg-blue-500/15 border-blue-500/30', icon: <SiCoursera className="w-3.5 h-3.5" /> }
  if (p.includes('edx')) return { color: 'text-purple-400', bgColor: 'bg-purple-500/15 border-purple-500/30', icon: <HiOutlineAcademicCap className="w-3.5 h-3.5" /> }
  if (p.includes('youtube')) return { color: 'text-red-400', bgColor: 'bg-red-500/15 border-red-500/30', icon: <SiYoutube className="w-3.5 h-3.5" /> }
  if (p.includes('freecodecamp')) return { color: 'text-green-400', bgColor: 'bg-green-500/15 border-green-500/30', icon: <HiOutlineCode className="w-3.5 h-3.5" /> }
  return { color: 'text-[hsl(160,15%,60%)]', bgColor: 'bg-[hsl(160,25%,12%)] border-[hsl(160,22%,15%)]', icon: <BiBookOpen className="w-3.5 h-3.5" /> }
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'hsl(160, 70%, 40%)'
  if (score >= 40) return 'hsl(40, 80%, 50%)'
  return 'hsl(0, 63%, 45%)'
}

// ─── SVG Circular Gauge ────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const radius = 70
  const strokeWidth = 10
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = 2 * Math.PI * normalizedRadius
  const safeScore = Math.max(0, Math.min(100, score))
  const progress = (safeScore / 100) * circumference
  const color = getScoreColor(safeScore)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width={radius * 2} height={radius * 2} className="-rotate-90">
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="hsl(160, 22%, 15%)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tracking-tight" style={{ color }}>{safeScore}</span>
          <span className="text-xs text-[hsl(160,15%,60%)] tracking-wide uppercase">Readiness</span>
        </div>
      </div>
      <p className="text-xs text-[hsl(160,15%,60%)] text-center max-w-[200px]">
        {safeScore >= 70 ? 'Strong match for this role' : safeScore >= 40 ? 'Moderate fit — some upskilling needed' : 'Significant skill gaps to address'}
      </p>
    </div>
  )
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-center">
        <div className="w-[140px] h-[140px] rounded-full bg-[hsl(160,22%,15%)]" />
      </div>
      <div className="space-y-3">
        <div className="h-5 w-40 rounded-lg bg-[hsl(160,22%,15%)]" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-7 w-24 rounded-full bg-[hsl(160,22%,15%)]" />)}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-36 rounded-lg bg-[hsl(160,22%,15%)]" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-7 w-20 rounded-full bg-[hsl(160,22%,15%)]" />)}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-52 rounded-lg bg-[hsl(160,22%,15%)]" />
        {[1, 2, 3].map(i => <div key={i} className="h-24 w-full rounded-xl bg-[hsl(160,22%,15%)]" />)}
      </div>
    </div>
  )
}

// ─── Error Boundary ─────────────────────────────────────────────────────────

class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(160,30%,4%)] text-[hsl(160,20%,95%)]">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-[hsl(160,15%,60%)] mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-[hsl(160,70%,40%)] text-[hsl(160,30%,4%)] rounded-lg text-sm font-medium hover:bg-[hsl(160,70%,45%)] transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Page() {
  const { callAgent, loading } = useAIAgent()

  // Input state
  const [resumeText, setResumeText] = useState('')
  const [jobDescText, setJobDescText] = useState('')

  // Result state
  const [result, setResult] = useState<SkillGapResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // UI state
  const [sampleDataOn, setSampleDataOn] = useState(false)
  const [roadmapOpen, setRoadmapOpen] = useState(false)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [extractedSkillsOpen, setExtractedSkillsOpen] = useState(false)

  // Sample data toggle
  useEffect(() => {
    if (sampleDataOn) {
      setResumeText(SAMPLE_RESUME)
      setJobDescText(SAMPLE_JOB_DESC)
      setResult(SAMPLE_RESULT)
      setErrorMsg(null)
    } else {
      setResumeText('')
      setJobDescText('')
      setResult(null)
      setErrorMsg(null)
    }
  }, [sampleDataOn])

  const canAnalyze = resumeText.trim().length > 0 && jobDescText.trim().length > 0

  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze || loading) return
    setErrorMsg(null)
    setResult(null)
    setRoadmapOpen(false)
    setJsonOpen(false)
    setExtractedSkillsOpen(false)
    setActiveAgentId(AGENT_ID)

    const message = `RESUME:\n${resumeText.trim()}\n\nJOB DESCRIPTION:\n${jobDescText.trim()}`

    try {
      const res = await callAgent(message, AGENT_ID)
      setActiveAgentId(null)

      if (res.success && res.response?.status === 'success') {
        let parsed: any = res.response.result
        // Handle string-wrapped JSON
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed) } catch { /* use as-is */ }
        }
        // Handle nested result
        if (parsed && typeof parsed === 'object' && parsed.readiness_score === undefined && parsed.result) {
          parsed = parsed.result
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed) } catch { /* use as-is */ }
          }
        }

        if (parsed && typeof parsed === 'object') {
          const data: SkillGapResult = {
            readiness_score: typeof parsed.readiness_score === 'number' ? parsed.readiness_score : 0,
            matched_skills: Array.isArray(parsed.matched_skills) ? parsed.matched_skills : [],
            missing_skills: Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [],
            recommended_courses: Array.isArray(parsed.recommended_courses) ? parsed.recommended_courses : [],
            learning_roadmap: typeof parsed.learning_roadmap === 'string' ? parsed.learning_roadmap : '',
            resume_skills_extracted: Array.isArray(parsed.resume_skills_extracted) ? parsed.resume_skills_extracted : [],
            job_description_skills_extracted: Array.isArray(parsed.job_description_skills_extracted) ? parsed.job_description_skills_extracted : [],
          }
          setResult(data)
        } else {
          setErrorMsg('Received an unexpected response format. Please try again.')
        }
      } else {
        setErrorMsg(res.error || res.response?.message || 'Analysis failed. Please try again.')
      }
    } catch (err) {
      setActiveAgentId(null)
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }
  }, [canAnalyze, loading, resumeText, jobDescText, callAgent])

  const handleClearAll = useCallback(() => {
    setResumeText('')
    setJobDescText('')
    setResult(null)
    setErrorMsg(null)
    setSampleDataOn(false)
    setRoadmapOpen(false)
    setJsonOpen(false)
    setExtractedSkillsOpen(false)
  }, [])

  const handleCopyJson = useCallback(async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      setCopiedJson(true)
      setTimeout(() => setCopiedJson(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = JSON.stringify(result, null, 2)
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedJson(true)
      setTimeout(() => setCopiedJson(false), 2000)
    }
  }, [result])

  const matchedSkills = Array.isArray(result?.matched_skills) ? result.matched_skills : []
  const missingSkills = Array.isArray(result?.missing_skills) ? result.missing_skills : []
  const courses = Array.isArray(result?.recommended_courses) ? result.recommended_courses : []
  const resumeExtracted = Array.isArray(result?.resume_skills_extracted) ? result.resume_skills_extracted : []
  const jobExtracted = Array.isArray(result?.job_description_skills_extracted) ? result.job_description_skills_extracted : []

  return (
    <PageErrorBoundary>
      <div className="min-h-screen bg-[hsl(160,30%,4%)] text-[hsl(160,20%,95%)] font-sans">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-[hsl(160,22%,15%)] bg-[hsl(160,30%,4%)]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[hsl(160,70%,40%)]/20 flex items-center justify-center flex-shrink-0">
                <HiOutlineDocumentSearch className="w-5 h-5 text-[hsl(160,70%,40%)]" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-[hsl(160,20%,95%)]">Career Skill Gap Analyzer</h1>
                <p className="text-xs text-[hsl(160,15%,60%)] hidden sm:block">Identify skill gaps and get personalized course recommendations</p>
              </div>
            </div>
            {/* Sample Data Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[hsl(160,15%,60%)]">Sample Data</span>
              <button
                onClick={() => setSampleDataOn(prev => !prev)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${sampleDataOn ? 'bg-[hsl(160,70%,40%)]' : 'bg-[hsl(160,22%,20%)]'}`}
                aria-label="Toggle sample data"
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${sampleDataOn ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </header>

        {/* ─── Main Content ───────────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
            {/* ─── Input Panel (Left) ─────────────────────────────── */}
            <div className="space-y-5">
              {/* Resume */}
              <div>
                <label className="block text-sm font-medium text-[hsl(160,20%,95%)] mb-2">Paste Your Resume</label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume content here..."
                  rows={8}
                  className="w-full px-4 py-3 bg-[hsl(160,22%,20%)] border border-[hsl(160,22%,15%)] rounded-xl text-sm text-[hsl(160,20%,95%)] placeholder:text-[hsl(160,15%,40%)] focus:outline-none focus:ring-2 focus:ring-[hsl(160,70%,40%)]/50 focus:border-[hsl(160,70%,40%)] resize-y transition-colors"
                />
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-[hsl(160,20%,95%)] mb-2">Paste Job Description</label>
                <textarea
                  value={jobDescText}
                  onChange={(e) => setJobDescText(e.target.value)}
                  placeholder="Paste the target job description here..."
                  rows={8}
                  className="w-full px-4 py-3 bg-[hsl(160,22%,20%)] border border-[hsl(160,22%,15%)] rounded-xl text-sm text-[hsl(160,20%,95%)] placeholder:text-[hsl(160,15%,40%)] focus:outline-none focus:ring-2 focus:ring-[hsl(160,70%,40%)]/50 focus:border-[hsl(160,70%,40%)] resize-y transition-colors"
                />
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || loading}
                className="w-full py-3 px-4 rounded-lg font-semibold text-sm tracking-tight transition-all duration-200 bg-[hsl(160,20%,95%)] text-[hsl(160,30%,10%)] hover:bg-[hsl(160,20%,90%)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Analyzing skills and finding courses...
                  </>
                ) : (
                  <>
                    <HiOutlineLightBulb className="w-4 h-4" />
                    Analyze Skill Gap
                  </>
                )}
              </button>

              {/* Clear All */}
              {(resumeText || jobDescText || result) && (
                <button
                  onClick={handleClearAll}
                  className="w-full text-center text-xs text-[hsl(160,15%,60%)] hover:text-[hsl(160,70%,40%)] transition-colors py-1"
                >
                  Clear All
                </button>
              )}

              {/* Agent Info */}
              <div className="mt-4 p-4 rounded-xl bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)]">
                <h3 className="text-xs font-semibold text-[hsl(160,15%,60%)] uppercase tracking-wider mb-3">Agent Status</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeAgentId === AGENT_ID ? 'bg-[hsl(160,70%,40%)] animate-pulse' : result ? 'bg-[hsl(160,70%,40%)]' : 'bg-[hsl(160,22%,20%)]'}`} />
                  <span className="text-xs text-[hsl(160,15%,75%)]">Skill Gap Analyzer Agent</span>
                  {activeAgentId === AGENT_ID && (
                    <span className="text-[10px] text-[hsl(160,70%,40%)] ml-auto">Processing...</span>
                  )}
                  {!activeAgentId && result && (
                    <span className="text-[10px] text-[hsl(160,70%,40%)] ml-auto">Complete</span>
                  )}
                </div>
                <p className="text-[10px] text-[hsl(160,15%,45%)] mt-2 leading-relaxed">Extracts skills, identifies gaps, and recommends courses from Coursera, edX, YouTube, and freeCodeCamp.</p>
              </div>
            </div>

            {/* ─── Results Panel (Right) ──────────────────────────── */}
            <div className="min-h-[500px]">
              {/* Loading state */}
              {loading && (
                <div className="p-6 rounded-xl bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)]">
                  <ResultsSkeleton />
                </div>
              )}

              {/* Error state */}
              {errorMsg && !loading && (
                <div className="p-6 rounded-xl bg-[hsl(0,30%,10%)] border border-[hsl(0,40%,25%)]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(0,63%,31%)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiX className="w-4 h-4 text-[hsl(0,63%,55%)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[hsl(0,63%,65%)] mb-1">Analysis Failed</h3>
                      <p className="text-xs text-[hsl(0,30%,60%)]">{errorMsg}</p>
                      <button
                        onClick={handleAnalyze}
                        disabled={!canAnalyze}
                        className="mt-3 text-xs font-medium text-[hsl(160,70%,40%)] hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        <FiRefreshCw className="w-3 h-3" /> Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!result && !loading && !errorMsg && (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[hsl(160,25%,12%)] flex items-center justify-center mb-4">
                    <HiOutlineDocumentSearch className="w-8 h-8 text-[hsl(160,15%,40%)]" />
                  </div>
                  <h3 className="text-base font-semibold text-[hsl(160,15%,60%)] mb-1 tracking-tight">No analysis yet</h3>
                  <p className="text-sm text-[hsl(160,15%,40%)] max-w-xs">Paste your resume and a job description to identify skill gaps and get course recommendations.</p>
                </div>
              )}

              {/* Results */}
              {result && !loading && (
                <div className="space-y-5">
                  {/* Readiness Score */}
                  <div className="p-6 rounded-xl bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)]">
                    <h2 className="text-sm font-semibold text-[hsl(160,15%,60%)] uppercase tracking-wider mb-4">Readiness Score</h2>
                    <ScoreGauge score={result.readiness_score ?? 0} />
                  </div>

                  {/* Matched & Missing Skills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Matched Skills */}
                    <div className="p-5 rounded-xl bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)]">
                      <h2 className="text-sm font-semibold text-[hsl(160,20%,95%)] mb-3 flex items-center gap-2">
                        <FiCheck className="w-4 h-4 text-[hsl(160,70%,40%)]" />
                        Matched Skills
                        <span className="ml-auto text-xs font-normal text-[hsl(160,15%,60%)] bg-[hsl(160,25%,12%)] px-2 py-0.5 rounded-full">{matchedSkills.length}</span>
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {matchedSkills.length > 0 ? matchedSkills.map((skill, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[hsl(160,70%,40%)]/15 text-[hsl(160,70%,50%)] border border-[hsl(160,70%,40%)]/25">
                            <FiCheck className="w-3 h-3" />
                            {skill}
                          </span>
                        )) : (
                          <p className="text-xs text-[hsl(160,15%,40%)]">No matched skills found.</p>
                        )}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div className="p-5 rounded-xl bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)]">
                      <h2 className="text-sm font-semibold text-[hsl(160,20%,95%)] mb-3 flex items-center gap-2">
                        <FiX className="w-4 h-4 text-[hsl(30,80%,50%)]" />
                        Missing Skills
                        <span className="ml-auto text-xs font-normal text-[hsl(160,15%,60%)] bg-[hsl(160,25%,12%)] px-2 py-0.5 rounded-full">{missingSkills.length}</span>
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {missingSkills.length > 0 ? missingSkills.map((skill, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[hsl(30,80%,50%)]/15 text-[hsl(30,80%,55%)] border border-[hsl(30,80%,50%)]/25">
                            <FiX className="w-3 h-3" />
                            {skill}
                          </span>
                        )) : (
                          <p className="text-xs text-[hsl(160,15%,40%)]">No missing skills -- great match!</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recommended Courses */}
                  {courses.length > 0 && (
                    <div className="p-5 rounded-xl bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)]">
                      <h2 className="text-sm font-semibold text-[hsl(160,20%,95%)] mb-4 flex items-center gap-2">
                        <HiOutlineAcademicCap className="w-4 h-4 text-[hsl(160,70%,40%)]" />
                        Recommended Courses
                        <span className="ml-auto text-xs font-normal text-[hsl(160,15%,60%)] bg-[hsl(160,25%,12%)] px-2 py-0.5 rounded-full">{courses.length}</span>
                      </h2>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {courses.map((course, i) => {
                          const pi = getPlatformInfo(course?.platform ?? '')
                          return (
                            <div key={i} className="p-4 rounded-lg bg-[hsl(160,25%,12%)]/50 border border-[hsl(160,22%,15%)] hover:border-[hsl(160,22%,22%)] transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(30,80%,55%)] bg-[hsl(30,80%,50%)]/10 px-2 py-0.5 rounded-full border border-[hsl(30,80%,50%)]/20">
                                      {course?.skill ?? 'Skill'}
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-semibold text-[hsl(160,20%,95%)] mb-1">{course?.course_name ?? 'Course'}</h3>
                                  <p className="text-xs text-[hsl(160,15%,60%)] leading-relaxed">{course?.description ?? ''}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-full border flex-shrink-0 ${pi.bgColor} ${pi.color}`}>
                                  {pi.icon}
                                  {course?.platform ?? 'Online'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Learning Roadmap (Collapsible) */}
                  {(result.learning_roadmap ?? '').length > 0 && (
                    <div className="rounded-xl bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] overflow-hidden">
                      <button
                        onClick={() => setRoadmapOpen(prev => !prev)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[hsl(160,25%,12%)]/30 transition-colors"
                      >
                        <span className="text-sm font-semibold text-[hsl(160,20%,95%)] flex items-center gap-2">
                          <BiBookOpen className="w-4 h-4 text-[hsl(160,70%,40%)]" />
                          Learning Roadmap
                        </span>
                        {roadmapOpen ? <FiChevronUp className="w-4 h-4 text-[hsl(160,15%,60%)]" /> : <FiChevronDown className="w-4 h-4 text-[hsl(160,15%,60%)]" />}
                      </button>
                      {roadmapOpen && (
                        <div className="px-5 pb-5 border-t border-[hsl(160,22%,15%)] pt-4">
                          {renderMarkdown(result.learning_roadmap)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Extracted Skills (Collapsible) */}
                  {(resumeExtracted.length > 0 || jobExtracted.length > 0) && (
                    <div className="rounded-xl bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] overflow-hidden">
                      <button
                        onClick={() => setExtractedSkillsOpen(prev => !prev)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[hsl(160,25%,12%)]/30 transition-colors"
                      >
                        <span className="text-sm font-semibold text-[hsl(160,20%,95%)] flex items-center gap-2">
                          <HiOutlineLightBulb className="w-4 h-4 text-[hsl(160,70%,40%)]" />
                          Extracted Skills Detail
                        </span>
                        {extractedSkillsOpen ? <FiChevronUp className="w-4 h-4 text-[hsl(160,15%,60%)]" /> : <FiChevronDown className="w-4 h-4 text-[hsl(160,15%,60%)]" />}
                      </button>
                      {extractedSkillsOpen && (
                        <div className="px-5 pb-5 border-t border-[hsl(160,22%,15%)] pt-4 space-y-4">
                          {resumeExtracted.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-[hsl(160,15%,60%)] uppercase tracking-wider mb-2">From Your Resume ({resumeExtracted.length})</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {resumeExtracted.map((s, i) => (
                                  <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-[hsl(160,25%,12%)] text-[hsl(160,15%,75%)] border border-[hsl(160,22%,15%)]">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {jobExtracted.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-[hsl(160,15%,60%)] uppercase tracking-wider mb-2">From Job Description ({jobExtracted.length})</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {jobExtracted.map((s, i) => (
                                  <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-[hsl(160,25%,12%)] text-[hsl(160,15%,75%)] border border-[hsl(160,22%,15%)]">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw JSON (Collapsible) */}
                  <div className="rounded-xl bg-[hsl(160,30%,6%)] border border-[hsl(160,22%,15%)] overflow-hidden">
                    <button
                      onClick={() => setJsonOpen(prev => !prev)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[hsl(160,25%,12%)]/30 transition-colors"
                    >
                      <span className="text-sm font-semibold text-[hsl(160,20%,95%)] flex items-center gap-2">
                        <HiOutlineCode className="w-4 h-4 text-[hsl(160,70%,40%)]" />
                        Raw JSON Response
                      </span>
                      {jsonOpen ? <FiChevronUp className="w-4 h-4 text-[hsl(160,15%,60%)]" /> : <FiChevronDown className="w-4 h-4 text-[hsl(160,15%,60%)]" />}
                    </button>
                    {jsonOpen && (
                      <div className="relative border-t border-[hsl(160,22%,15%)]">
                        <button
                          onClick={handleCopyJson}
                          className="absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded-md bg-[hsl(160,25%,12%)] text-[hsl(160,15%,60%)] hover:text-[hsl(160,20%,95%)] border border-[hsl(160,22%,15%)] transition-colors flex items-center gap-1.5 z-10"
                        >
                          <FiCopy className="w-3 h-3" />
                          {copiedJson ? 'Copied!' : 'Copy JSON'}
                        </button>
                        <pre className="p-5 text-xs text-[hsl(160,15%,65%)] overflow-x-auto max-h-[300px] overflow-y-auto leading-relaxed font-mono">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* New Analysis Button */}
                  <button
                    onClick={handleClearAll}
                    className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-[hsl(160,15%,60%)] bg-[hsl(160,25%,12%)] border border-[hsl(160,22%,15%)] hover:border-[hsl(160,22%,22%)] hover:text-[hsl(160,20%,95%)] transition-all flex items-center justify-center gap-2"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5" />
                    New Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </PageErrorBoundary>
  )
}
