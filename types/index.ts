export type SubstrateType = 'Erde' | 'Kokos' | 'Perlite-Mix' | 'DWC / Hydro' | 'Aeroponik' | 'Sonstige';
export type Severity = 'niedrig' | 'mittel' | 'hoch' | 'kritisch';

export interface QuestionnaireData {
  plantAgeWeeks: string | null;
  substrateType: string | null;
  waterTempCelsius: string | null;
  substrateTempCelsius: string | null;
  phFeed: string | null;
  ecPpm: string | null;
  lightType: string | null;
  lightDistanceCm: string | null;
  roomTempCelsius: string | null;
  humidityPercent: string | null;
  symptomDurationDays: string | null;
  recentChanges: string[];
  [key: string]: string | string[] | null;
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
  followUpDays?: number;
}

export interface DiagnosisEntry {
  id: string;
  date: string;
  imageUri: string;
  questionnaire: QuestionnaireData;
  result: DiagnosisResult;
  plantId?: string;
}

export interface Plant {
  id: string;
  name: string;
  createdAt: string;
  imageUri?: string;
  strain?: string;
  entries: string[]; // DiagnosisEntry IDs
}

export type QuestionType = 'select' | 'multi-select' | 'number' | 'text';

export interface ConditionalRule {
  field: string;
  values: string[];
}

export interface Question {
  id: string;
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
  conditional?: ConditionalRule;
}
