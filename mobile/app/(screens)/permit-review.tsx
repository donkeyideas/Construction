import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  Shield,
  Upload,
  FileText,
  X,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  ClipboardCheck,
  BarChart3,
  ExternalLink,
  Loader2,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuthStore } from '@/lib/auth';
import { supabase, apiCall } from '@/lib/supabase';

type Phase = 'input' | 'analyzing' | 'results';
type Tab = 'review' | 'analytics';

const BUILDING_TYPES = [
  'Commercial Office',
  'Residential Single-Family',
  'Residential Multi-Family',
  'Industrial / Warehouse',
  'Retail / Restaurant',
  'Mixed-Use',
  'Healthcare / Medical',
  'Educational',
  'Hospitality / Hotel',
  'Infrastructure / Public Works',
];

const ANALYSIS_STEPS = [
  { key: 'structural', label: 'Structural Systems' },
  { key: 'fire', label: 'Fire Safety & Egress' },
  { key: 'electrical', label: 'Electrical Systems' },
  { key: 'plumbing', label: 'Plumbing & Water' },
  { key: 'mechanical', label: 'Mechanical / HVAC' },
  { key: 'zoning', label: 'Zoning & Land Use' },
  { key: 'ada', label: 'ADA / Accessibility' },
  { key: 'environmental', label: 'Environmental' },
];

interface UploadedFile {
  path: string;
  originalName: string;
  size: number;
  mimeType: string;
  ocrStatus: 'pending' | 'extracting' | 'done' | 'error';
  extractedText?: string;
}

interface PermitSection {
  name: string;
  status: 'pass' | 'flag' | 'fail';
  confidence: number;
  findings: string[];
  code_references: string[];
}

interface PermitIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: string;
  title: string;
  description: string;
  code_reference: string;
  recommendation: string;
}

interface ReviewResult {
  id: string | null;
  overallStatus: 'likely_compliant' | 'needs_review' | 'issues_found';
  overallConfidence: number;
  summary: string;
  sections: PermitSection[];
  issues: PermitIssue[];
  recommendations: string[];
  processingTimeMs: number;
  providerName: string;
  modelId: string;
}

interface ChecklistItem {
  id: string;
  document_name: string;
  description: string;
  required: boolean;
  status: string;
  category: string;
  checked: boolean;
}

interface JurisdictionOption {
  id: string;
  jurisdiction_name: string;
  state: string;
  city: string | null;
  building_codes: string[] | null;
  portal_name: string | null;
  portal_url: string | null;
  typical_review_days: number | null;
}

export default function PermitReviewScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { userCompany } = useAuthStore();

  const [tab, setTab] = useState<Tab>('review');
  const [phase, setPhase] = useState<Phase>('input');

  // Form state
  const [buildingType, setBuildingType] = useState('');
  const [showBuildingTypes, setShowBuildingTypes] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('');
  const [jurisdictionOptions, setJurisdictionOptions] = useState<JurisdictionOption[]>([]);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<JurisdictionOption | null>(null);
  const [showJurisdictions, setShowJurisdictions] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  // Analyzing state
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  // Results state
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[] | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Past reviews
  const [pastReviews, setPastReviews] = useState<any[]>([]);

  // Load initial data
  useEffect(() => {
    if (!userCompany) return;
    const companyId = userCompany.companyId;

    Promise.all([
      supabase.from('projects').select('id, name, code, city, state, project_type')
        .eq('company_id', companyId).in('status', ['active', 'pre_construction']).order('name'),
      supabase.from('ai_provider_configs').select('id, provider_name, model_id, is_default')
        .eq('company_id', companyId).eq('is_active', true),
    ]).then(([projRes, provRes]) => {
      setProjects(projRes.data ?? []);
      const provs = provRes.data ?? [];
      setProviders(provs);
      const def = provs.find((p: any) => p.is_default);
      if (def) setSelectedProviderId(def.id);
    });

    // Load past reviews
    apiCall<any[]>('/api/ai/permit-review').then(({ data }) => {
      setPastReviews(data ?? []);
    });
  }, [userCompany]);

  // Jurisdiction search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleJurisdictionSearch(text: string) {
    setJurisdiction(text);
    setSelectedJurisdiction(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.length < 2) { setJurisdictionOptions([]); setShowJurisdictions(false); return; }

    searchTimeout.current = setTimeout(async () => {
      const { data } = await apiCall<any[]>(`/api/ai/permit-review/jurisdictions?search=${encodeURIComponent(text)}`);
      setJurisdictionOptions(data ?? []);
      setShowJurisdictions(true);
    }, 300);
  }

  function selectJurisdiction(j: JurisdictionOption) {
    setSelectedJurisdiction(j);
    setJurisdiction(j.jurisdiction_name);
    setShowJurisdictions(false);
  }

  // Project selection
  function selectProject(p: any) {
    setSelectedProjectId(p.id);
    setShowProjects(false);
    setReviewTitle(`${p.name} Permit Review`);
    if (p.city && p.state) {
      setJurisdiction(`${p.city}, ${p.state}`);
    }
    const typeMap: Record<string, string> = {
      commercial: 'Commercial Office',
      residential: 'Residential Multi-Family',
      industrial: 'Industrial / Warehouse',
      retail: 'Retail / Restaurant',
      mixed_use: 'Mixed-Use',
      healthcare: 'Healthcare / Medical',
      educational: 'Educational',
      hospitality: 'Hospitality / Hotel',
      infrastructure: 'Infrastructure / Public Works',
    };
    if (p.project_type && typeMap[p.project_type]) {
      setBuildingType(typeMap[p.project_type]);
    }
  }

  // File upload
  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      multiple: true,
    });
    if (result.canceled) return;

    for (const asset of result.assets) {
      if (asset.size && asset.size > 20 * 1024 * 1024) {
        Alert.alert('Too Large', `${asset.name} exceeds 20MB limit`);
        continue;
      }

      const file: UploadedFile = {
        path: asset.uri,
        originalName: asset.name ?? 'document',
        size: asset.size ?? 0,
        mimeType: asset.mimeType ?? 'application/pdf',
        ocrStatus: 'pending',
      };

      setUploadedFiles((prev) => [...prev, file]);

      // Upload then OCR
      uploadAndOCR(file);
    }
  }

  async function uploadAndOCR(file: UploadedFile) {
    setUploadedFiles((prev) => prev.map((f) => f.path === file.path ? { ...f, ocrStatus: 'extracting' } : f));

    const formData = new FormData();
    formData.append('file', {
      uri: file.path,
      name: file.originalName,
      type: file.mimeType,
    } as any);

    try {
      const uploadRes = await apiCall<any>('/api/ai/permit-review/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData as any,
      });

      if (uploadRes.error || !uploadRes.data) {
        setUploadedFiles((prev) => prev.map((f) => f.path === file.path ? { ...f, ocrStatus: 'error' } : f));
        return;
      }

      // OCR
      const ocrRes = await apiCall<{ extractedText: string }>('/api/ai/permit-review/ocr', {
        method: 'POST',
        body: JSON.stringify({
          companyId: userCompany?.companyId,
          fileUrl: uploadRes.data.signedUrl ?? uploadRes.data.path,
          mimeType: file.mimeType,
          selectedProviderId,
        }),
      });

      if (ocrRes.data?.extractedText) {
        setUploadedFiles((prev) => prev.map((f) =>
          f.path === file.path ? { ...f, ocrStatus: 'done', extractedText: ocrRes.data!.extractedText } : f
        ));
        setDocumentText((prev) => prev + (prev ? '\n\n---\n\n' : '') + ocrRes.data!.extractedText);
      } else {
        setUploadedFiles((prev) => prev.map((f) => f.path === file.path ? { ...f, ocrStatus: 'error' } : f));
      }
    } catch {
      setUploadedFiles((prev) => prev.map((f) => f.path === file.path ? { ...f, ocrStatus: 'error' } : f));
    }
  }

  function removeFile(path: string) {
    setUploadedFiles((prev) => prev.filter((f) => f.path !== path));
  }

  // Analyze
  async function handleAnalyze() {
    if (!documentText.trim() && uploadedFiles.every((f) => f.ocrStatus !== 'done')) {
      Alert.alert('Missing Input', 'Please upload documents or paste permit text');
      return;
    }

    setPhase('analyzing');
    setCurrentStep(0);
    setElapsedMs(0);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Elapsed timer
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);

    // Step animation
    const stepTimer = setInterval(() => {
      setCurrentStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1));
    }, 1500);

    try {
      const { data, error } = await apiCall<ReviewResult>('/api/ai/permit-review', {
        method: 'POST',
        body: JSON.stringify({
          companyId: userCompany?.companyId,
          documentText: documentText.trim(),
          jurisdiction: jurisdiction || undefined,
          buildingType: buildingType || undefined,
          projectId: selectedProjectId || undefined,
          title: reviewTitle || 'Permit Review',
          selectedProviderId: selectedProviderId || undefined,
          jurisdictionId: selectedJurisdiction?.id || undefined,
          uploadedFiles: uploadedFiles
            .filter((f) => f.ocrStatus === 'done')
            .map((f) => ({ path: f.path, originalName: f.originalName, size: f.size, mimeType: f.mimeType })),
        }),
      });

      clearInterval(timer);
      clearInterval(stepTimer);
      pulseAnim.stopAnimation();

      if (error || !data) {
        Alert.alert('Error', error ?? 'Failed to analyze permit');
        setPhase('input');
        return;
      }

      setResult(data);
      setCurrentStep(ANALYSIS_STEPS.length);
      setPhase('results');
    } catch (err: any) {
      clearInterval(timer);
      clearInterval(stepTimer);
      pulseAnim.stopAnimation();
      Alert.alert('Error', err.message ?? 'Analysis failed');
      setPhase('input');
    }
  }

  // Checklist
  async function generateChecklist() {
    if (!result?.id) return;
    setChecklistLoading(true);
    const { data } = await apiCall<{ items: ChecklistItem[] }>(`/api/ai/permit-review/${result.id}/checklist`, { method: 'POST' });
    setChecklist(data?.items ?? []);
    setChecklistLoading(false);
  }

  async function toggleChecklistItem(itemId: string, checked: boolean) {
    if (!result?.id) return;
    await apiCall(`/api/ai/permit-review/${result.id}/checklist`, {
      method: 'PATCH',
      body: JSON.stringify({ itemId, checked }),
    });
    setChecklist((prev) => prev?.map((i) => i.id === itemId ? { ...i, checked } : i) ?? null);
  }

  // Analytics
  async function loadAnalytics() {
    setAnalyticsLoading(true);
    const { data } = await apiCall<any>('/api/ai/permit-review/analytics');
    setAnalytics(data);
    setAnalyticsLoading(false);
  }

  useEffect(() => {
    if (tab === 'analytics' && !analytics) loadAnalytics();
  }, [tab]);

  // New review
  function startNewReview() {
    setPhase('input');
    setResult(null);
    setChecklist(null);
    setDocumentText('');
    setUploadedFiles([]);
    setReviewTitle('');
  }

  // Load past review
  async function loadReview(id: string) {
    const { data } = await apiCall<any>(`/api/ai/permit-review/${id}`);
    if (data) {
      setResult({
        id: data.id,
        overallStatus: data.overall_status,
        overallConfidence: data.overall_confidence,
        summary: data.summary,
        sections: data.sections ?? [],
        issues: data.issues ?? [],
        recommendations: data.recommendations ?? [],
        processingTimeMs: data.processing_time_ms ?? 0,
        providerName: data.provider_name ?? '',
        modelId: data.model_id ?? '',
      });
      setPhase('results');
      if (data.submission_checklist?.items) {
        setChecklist(data.submission_checklist.items);
      }
    }
  }

  const hasInput = documentText.trim().length > 0 || uploadedFiles.some((f) => f.ocrStatus === 'done');
  const hasPendingOCR = uploadedFiles.some((f) => f.ocrStatus === 'extracting');

  const statusColor = (s: string) =>
    s === 'likely_compliant' ? colors.green : s === 'needs_review' ? colors.amber : colors.red;
  const statusLabel = (s: string) =>
    s === 'likely_compliant' ? 'Likely Compliant' : s === 'needs_review' ? 'Needs Review' : 'Issues Found';
  const severityColor = (s: string) =>
    s === 'critical' ? colors.red : s === 'major' ? colors.red : s === 'minor' ? colors.amber : colors.blue;
  const sectionStatusColor = (s: string) =>
    s === 'pass' ? colors.green : s === 'flag' ? colors.amber : colors.red;
  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Shield size={20} color={colors.blue} />
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>AI Permit Review</Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => setTab('review')} style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === 'review' ? colors.blue : 'transparent', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: tab === 'review' ? '600' : '400', color: tab === 'review' ? colors.blue : colors.muted }}>Review</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('analytics')} style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === 'analytics' ? colors.blue : 'transparent', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: tab === 'analytics' ? '600' : '400', color: tab === 'analytics' ? colors.blue : colors.muted }}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {tab === 'review' && phase === 'input' && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          {/* Building Type */}
          <View>
            <Text style={lbl(colors)}>BUILDING TYPE</Text>
            <TouchableOpacity onPress={() => setShowBuildingTypes(!showBuildingTypes)} style={[inputBox(colors, radii), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={{ fontSize: 14, color: buildingType ? colors.text : colors.muted }}>
                {buildingType || 'Select type...'}
              </Text>
              <ChevronDown size={16} color={colors.muted} />
            </TouchableOpacity>
            {showBuildingTypes && (
              <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginTop: 4, maxHeight: 200 }}>
                <ScrollView nestedScrollEnabled>
                  {BUILDING_TYPES.map((t) => (
                    <TouchableOpacity key={t} onPress={() => { setBuildingType(t); setShowBuildingTypes(false); }} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 14, color: colors.text }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Jurisdiction */}
          <View>
            <Text style={lbl(colors)}>JURISDICTION</Text>
            <TextInput
              style={inputBox(colors, radii)}
              placeholder="Search jurisdictions..."
              placeholderTextColor={colors.muted}
              value={jurisdiction}
              onChangeText={handleJurisdictionSearch}
            />
            {showJurisdictions && jurisdictionOptions.length > 0 && (
              <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginTop: 4, maxHeight: 200 }}>
                <ScrollView nestedScrollEnabled>
                  {jurisdictionOptions.map((j) => (
                    <TouchableOpacity key={j.id} onPress={() => selectJurisdiction(j)} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{j.jurisdiction_name}</Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        {[j.city, j.state].filter(Boolean).join(', ')}
                        {j.building_codes?.length ? ` · ${j.building_codes.join(', ')}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {selectedJurisdiction?.portal_name && (
              <TouchableOpacity
                onPress={() => selectedJurisdiction.portal_url && Linking.openURL(selectedJurisdiction.portal_url)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}
              >
                <ExternalLink size={12} color={colors.blue} />
                <Text style={{ fontSize: 11, color: colors.blue }}>{selectedJurisdiction.portal_name}</Text>
                {selectedJurisdiction.typical_review_days && (
                  <Text style={{ fontSize: 11, color: colors.muted }}> · ~{selectedJurisdiction.typical_review_days} days</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Link to Project */}
          <View>
            <Text style={lbl(colors)}>LINK TO PROJECT (OPTIONAL)</Text>
            <TouchableOpacity onPress={() => setShowProjects(!showProjects)} style={[inputBox(colors, radii), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={{ fontSize: 14, color: selectedProjectId ? colors.text : colors.muted }}>
                {projects.find((p) => p.id === selectedProjectId)?.name ?? 'None'}
              </Text>
              <ChevronDown size={16} color={colors.muted} />
            </TouchableOpacity>
            {showProjects && (
              <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginTop: 4, maxHeight: 200 }}>
                <ScrollView nestedScrollEnabled>
                  <TouchableOpacity onPress={() => { setSelectedProjectId(null); setShowProjects(false); }} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ fontSize: 14, color: colors.muted }}>None</Text>
                  </TouchableOpacity>
                  {projects.map((p: any) => (
                    <TouchableOpacity key={p.id} onPress={() => selectProject(p)} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>{p.code}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Review Title */}
          <View>
            <Text style={lbl(colors)}>REVIEW TITLE</Text>
            <TextInput
              style={inputBox(colors, radii)}
              placeholder="e.g. Office Remodel Permit"
              placeholderTextColor={colors.muted}
              value={reviewTitle}
              onChangeText={setReviewTitle}
            />
          </View>

          {/* AI Provider */}
          {providers.length > 0 && (
            <View>
              <Text style={lbl(colors)}>AI PROVIDER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {providers.map((p: any) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedProviderId(p.id)}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.md, borderWidth: 1, borderColor: selectedProviderId === p.id ? colors.blue : colors.border, backgroundColor: colors.cardBg }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: selectedProviderId === p.id ? '600' : '400', color: selectedProviderId === p.id ? colors.blue : colors.text }}>
                      {p.provider_name} / {p.model_id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* File Upload */}
          <View>
            <Text style={lbl(colors)}>UPLOAD DOCUMENTS (PDF, JPG, PNG)</Text>
            <TouchableOpacity onPress={pickDocument} style={{ borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radii.md, padding: 24, alignItems: 'center', gap: 8, backgroundColor: colors.cardBg }}>
              <Upload size={28} color={colors.muted} />
              <Text style={{ fontSize: 13, color: colors.muted }}>Tap to select files (max 20MB)</Text>
            </TouchableOpacity>
            {uploadedFiles.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, backgroundColor: colors.cardBg, padding: 10, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border }}>
                <FileText size={16} color={colors.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.text }} numberOfLines={1}>{f.originalName}</Text>
                  <Text style={{ fontSize: 10, color: colors.muted }}>{(f.size / 1024).toFixed(0)} KB</Text>
                </View>
                <Text style={{
                  fontSize: 10, fontWeight: '600',
                  color: f.ocrStatus === 'done' ? colors.green : f.ocrStatus === 'error' ? colors.red : colors.amber,
                }}>
                  {f.ocrStatus === 'done' ? 'Extracted' : f.ocrStatus === 'extracting' ? 'Extracting...' : f.ocrStatus === 'error' ? 'Error' : 'Pending'}
                </Text>
                <TouchableOpacity onPress={() => removeFile(f.path)}>
                  <X size={16} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Permit Text */}
          <View>
            <Text style={lbl(colors)}>PERMIT APPLICATION TEXT</Text>
            <TextInput
              style={[inputBox(colors, radii), { height: 150, textAlignVertical: 'top' }]}
              placeholder="Paste permit application text..."
              placeholderTextColor={colors.muted}
              value={documentText}
              onChangeText={setDocumentText}
              multiline
            />
            <Text style={{ fontSize: 10, color: documentText.length > 90000 ? colors.red : colors.muted, textAlign: 'right', marginTop: 2 }}>
              {documentText.length.toLocaleString()} / 100,000
            </Text>
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            onPress={handleAnalyze}
            disabled={!hasInput || hasPendingOCR}
            style={{
              backgroundColor: hasInput && !hasPendingOCR ? colors.blue : colors.border,
              padding: 16, borderRadius: radii.md,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
            activeOpacity={0.8}
          >
            <Shield size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Analyze Permit</Text>
          </TouchableOpacity>

          {/* Past Reviews */}
          {pastReviews.length > 0 && (
            <View>
              <Text style={lbl(colors)}>PAST REVIEWS</Text>
              {pastReviews.slice(0, 5).map((r: any) => (
                <TouchableOpacity key={r.id} onPress={() => loadReview(r.id)} style={{ backgroundColor: colors.cardBg, borderRadius: radii.sm, padding: 12, borderWidth: 1, borderColor: colors.border, marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{r.title ?? 'Untitled Review'}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: statusColor(r.overall_status), textTransform: 'uppercase' }}>
                    {r.overall_status?.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* ANALYZING PHASE */}
      {tab === 'review' && phase === 'analyzing' && (
        <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <Shield size={64} color={colors.blue} />
          </Animated.View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 20 }}>Reviewing Compliance</Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>{formatTime(elapsedMs)}</Text>

          <View style={{ width: '100%', marginTop: 24, gap: 6 }}>
            {ANALYSIS_STEPS.map((step, i) => (
              <View key={step.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, width: 20 }}>{i + 1}</Text>
                {i < currentStep ? (
                  <CheckCircle size={16} color={colors.green} />
                ) : i === currentStep ? (
                  <ActivityIndicator size="small" color={colors.blue} />
                ) : (
                  <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border }} />
                )}
                <Text style={{ fontSize: 13, color: i <= currentStep ? colors.text : colors.muted, fontWeight: i === currentStep ? '600' : '400' }}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* RESULTS PHASE */}
      {tab === 'review' && phase === 'results' && result && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, gap: 14 }}>
          {/* New Review button */}
          <TouchableOpacity onPress={startNewReview} style={{ alignSelf: 'flex-end' }}>
            <Text style={{ fontSize: 13, color: colors.blue, fontWeight: '600' }}>New Review</Text>
          </TouchableOpacity>

          {/* Status KPIs */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[card(colors, radii), { flex: 1, alignItems: 'center' }]}>
              <Text style={{ fontSize: 11, color: statusColor(result.overallStatus), fontWeight: '700', textTransform: 'uppercase' }}>
                {statusLabel(result.overallStatus)}
              </Text>
            </View>
            <View style={[card(colors, radii), { flex: 1, alignItems: 'center' }]}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{result.overallConfidence}%</Text>
              <Text style={{ fontSize: 10, color: colors.muted }}>Confidence</Text>
            </View>
            <View style={[card(colors, radii), { flex: 1, alignItems: 'center' }]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{formatTime(result.processingTimeMs)}</Text>
              <Text style={{ fontSize: 10, color: colors.muted }}>Time</Text>
            </View>
          </View>

          {/* Summary */}
          <View style={card(colors, radii)}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.5, marginBottom: 6 }}>SUMMARY</Text>
            <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{result.summary}</Text>
          </View>

          {/* Sections */}
          {result.sections.length > 0 && (
            <View style={card(colors, radii)}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.5, marginBottom: 8 }}>COMPLIANCE SECTIONS</Text>
              {result.sections.map((sec, i) => (
                <View key={i} style={{ paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{sec.name}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: sectionStatusColor(sec.status), textTransform: 'uppercase' }}>{sec.status}</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: colors.surface, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: sectionStatusColor(sec.status), width: `${sec.confidence}%` }} />
                  </View>
                  {sec.findings.length > 0 && (
                    <View style={{ marginTop: 6, gap: 2 }}>
                      {sec.findings.map((f, j) => (
                        <Text key={j} style={{ fontSize: 12, color: colors.muted, lineHeight: 16 }}>• {f}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Issues */}
          {result.issues.length > 0 && (
            <View style={card(colors, radii)}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.5, marginBottom: 8 }}>
                ISSUES ({result.issues.length})
              </Text>
              {result.issues.map((issue, i) => {
                const SevIcon = issue.severity === 'critical' || issue.severity === 'major' ? AlertTriangle :
                  issue.severity === 'minor' ? AlertCircle : Info;
                return (
                  <View key={i} style={{ paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <SevIcon size={14} color={severityColor(issue.severity)} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: severityColor(issue.severity), textTransform: 'uppercase' }}>{issue.severity}</Text>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text }}>{issue.title}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 16 }}>{issue.description}</Text>
                    {issue.code_reference && (
                      <Text style={{ fontSize: 11, color: colors.blue, marginTop: 2 }}>{issue.code_reference}</Text>
                    )}
                    {issue.recommendation && (
                      <Text style={{ fontSize: 12, color: colors.green, marginTop: 4 }}>Rec: {issue.recommendation}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <View style={card(colors, radii)}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.5, marginBottom: 8 }}>RECOMMENDATIONS</Text>
              {result.recommendations.map((rec, i) => (
                <Text key={i} style={{ fontSize: 13, color: colors.text, lineHeight: 18, paddingVertical: 3 }}>
                  {i + 1}. {rec}
                </Text>
              ))}
            </View>
          )}

          {/* Checklist */}
          {!checklist && result.id && (
            <TouchableOpacity onPress={generateChecklist} disabled={checklistLoading} style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.blue, borderRadius: radii.md, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }} activeOpacity={0.7}>
              {checklistLoading ? <ActivityIndicator color={colors.blue} /> : <ClipboardCheck size={18} color={colors.blue} />}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.blue }}>Generate Submission Checklist</Text>
            </TouchableOpacity>
          )}

          {checklist && (
            <View style={card(colors, radii)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.5 }}>SUBMISSION CHECKLIST</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {checklist.filter((c) => c.checked).length}/{checklist.length}
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: colors.surface, borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.green, width: `${checklist.length ? (checklist.filter((c) => c.checked).length / checklist.length) * 100 : 0}%` }} />
              </View>
              {checklist.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => toggleChecklistItem(item.id, !item.checked)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: item.checked ? colors.green : colors.border, backgroundColor: item.checked ? colors.greenLight : 'transparent', justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                    {item.checked && <CheckCircle size={12} color={colors.green} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text, textDecorationLine: item.checked ? 'line-through' : 'none' }}>
                      {item.document_name}{item.required ? ' *' : ''}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{item.description}</Text>
                  </View>
                  <Text style={{
                    fontSize: 9, fontWeight: '600', textTransform: 'uppercase',
                    color: item.status === 'ready' ? colors.green : item.status === 'missing' ? colors.red : colors.amber,
                  }}>
                    {item.status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {analyticsLoading ? (
            <ActivityIndicator size="large" color={colors.blue} style={{ marginTop: 40 }} />
          ) : analytics?.stats ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={[card(colors, radii), { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{analytics.stats.totalReviews}</Text>
                  <Text style={{ fontSize: 10, color: colors.muted, textTransform: 'uppercase' }}>Total Reviews</Text>
                </View>
                <View style={[card(colors, radii), { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{analytics.stats.avgConfidence?.toFixed(0)}%</Text>
                  <Text style={{ fontSize: 10, color: colors.muted, textTransform: 'uppercase' }}>Avg Confidence</Text>
                </View>
                <View style={[card(colors, radii), { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{analytics.stats.avgTimeSeconds?.toFixed(1)}s</Text>
                  <Text style={{ fontSize: 10, color: colors.muted, textTransform: 'uppercase' }}>Avg Time</Text>
                </View>
                <View style={[card(colors, radii), { flex: 1, minWidth: '45%', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{analytics.stats.mostFlaggedSection ?? 'N/A'}</Text>
                  <Text style={{ fontSize: 10, color: colors.muted, textTransform: 'uppercase' }}>Most Flagged</Text>
                </View>
              </View>

              {/* Status Distribution */}
              {analytics.charts?.statusDistribution?.length > 0 && (
                <View style={card(colors, radii)}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.5, marginBottom: 10 }}>STATUS DISTRIBUTION</Text>
                  {analytics.charts.statusDistribution.map((d: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color ?? colors.muted }} />
                      <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{d.name}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{d.value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Section Flag Rates */}
              {analytics.charts?.sectionFlagRates?.length > 0 && (
                <View style={card(colors, radii)}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.5, marginBottom: 10 }}>SECTION FLAG RATES</Text>
                  {analytics.charts.sectionFlagRates.map((s: any, i: number) => (
                    <View key={i} style={{ paddingVertical: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: colors.text }}>{s.name}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: s.flagRate > 50 ? colors.red : colors.muted }}>{s.flagRate?.toFixed(0)}%</Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: colors.surface, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                        <View style={{ height: 4, borderRadius: 2, backgroundColor: s.flagRate > 50 ? colors.red : colors.amber, width: `${Math.min(s.flagRate ?? 0, 100)}%` }} />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>No analytics data yet</Text>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function card(colors: any, radii: any) {
  return { backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.border } as const;
}
function lbl(colors: any) { return { fontSize: 11, fontWeight: '600' as const, color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }; }
function inputBox(colors: any, radii: any) { return { padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, fontSize: 14, color: colors.text, backgroundColor: colors.cardBg } as const; }
