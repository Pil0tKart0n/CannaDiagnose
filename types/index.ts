export type GrowthPhase = 'Keimling' | 'Vegetativ' | 'Blüte' | 'Spätblüte';
export type SubstrateType = 'Erde' | 'Kokos' | 'Hydro' | 'Perlite-Mix' | 'Sonstige';
export type LightType = 'LED' | 'NDL/HPS' | 'MH' | 'CFL' | 'Sonnenlicht' | 'Sonstige';
export type AffectedArea = 'Obere Blätter' | 'Untere Blätter' | 'Mittlere Blätter' | 'Alle Blätter' | 'Stängel' | 'Wurzeln';
export type Severity = 'niedrig' | 'mittel' | 'hoch' | 'kritisch';

export interface QuestionnaireData {
  // Pflanze
  growthPhase: GrowthPhase | null;
  plantAgeWeeks: number | null;
  affectedAreas: AffectedArea[];

  // Substrat & Wasser
  substrateType: SubstrateType | null;
  substrateTempCelsius: number | null;
  phFeed: number | null;
  phRunoff: number | null;
  ecPpm: number | null;

  // Umgebung
  roomTempCelsius: number | null;
  humidityPercent: number | null;
  lightType: LightType | null;
  lightDistanceCm: number | null;

  // Kontext
  wateringFrequency: string | null;
  fertilizerDetails: string | null;
  symptomDurationDays: number | null;
  recentChanges: string | null;
}

export interface ContributingFactor {
  factor: string;
  impact: string;
}

export interface ActionStep {
  priority: number;
  action: string;
  details: string;
}

export interface DiagnosisResult {
  severity: Severity;
  primaryDiagnosis: string;
  confidence: number;
  rootCauseAnalysis: string;
  contributingFactors: ContributingFactor[];
  actionPlan: ActionStep[];
  preventiveTips: string[];
}

export interface DiagnosisEntry {
  id: string;
  date: string;
  imageUri: string;
  questionnaire: QuestionnaireData;
  result: DiagnosisResult;
}

export type QuestionType = 'select' | 'multi-select' | 'number' | 'text';

export interface Question {
  id: keyof QuestionnaireData;
  section: string;
  question: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
}
