// Domain-grounded AI over the clinic's own records (wave 14A).
// A provider call is made only when OPENROUTER_API_KEY or OPENAI_API_KEY is
// configured; otherwise a clearly labelled deterministic fallback computed
// from the same records is returned (aiGenerated:false) — never fake success.
// Administrative summaries only: no diagnosis or treatment recommendation.

export type AiSection = { label: string; value: string | number | boolean | null };

export interface RecallFacts {
  firstName: string;
  lastName: string;
  completedVisits: number;
  upcomingAppointments: number;
  plannedTreatments: number;
  completedTreatments: number;
  hasInsuranceOnFile: boolean;
  notes?: string | null;
}

export interface ScheduleFacts {
  firstName: string;
  lastName: string;
  nextAppointmentType: string | null;
  nextAppointmentAt: string | null;
  openTasks: number;
  hasInsuranceOnFile: boolean;
}

export function recallSections(f: RecallFacts): AiSection[] {
  return [
    { label: 'Patient', value: `${f.firstName} ${f.lastName}` },
    { label: 'Completed visits', value: f.completedVisits },
    { label: 'Upcoming appointments', value: f.upcomingAppointments },
    { label: 'Planned treatments on record', value: f.plannedTreatments },
    { label: 'Completed treatments on record', value: f.completedTreatments },
    { label: 'Insurance on file', value: f.hasInsuranceOnFile },
    { label: 'Notes', value: f.notes ?? '' },
    { label: 'Staff check', value: 'Confirm contact details and recall timing as recorded. This summary makes no diagnosis or treatment recommendation.' },
  ];
}

export function scheduleSections(f: ScheduleFacts): AiSection[] {
  return [
    { label: 'Patient', value: `${f.firstName} ${f.lastName}` },
    { label: 'Next appointment type', value: f.nextAppointmentType },
    { label: 'Next appointment at', value: f.nextAppointmentAt },
    { label: 'Open tasks', value: f.openTasks },
    { label: 'Insurance on file', value: f.hasInsuranceOnFile },
    { label: 'Staff check', value: 'Confirm identity, insurance, and the recorded reason for visit. This brief makes no diagnosis or treatment recommendation.' },
  ];
}

export function sectionsText(sections: AiSection[]): string {
  return sections
    .map((s) => `${s.label}: ${s.value === null ? 'Not supplied' : s.value === '' ? '(empty)' : s.value}`)
    .join('\n');
}

export async function runGroundedAi(
  prompt: string,
  sections: AiSection[],
  fetchImpl: typeof fetch = fetch,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ aiGenerated: boolean; source: 'provider' | 'deterministic-fallback'; label?: string; sections: AiSection[]; text: string }> {
  const fallback = sectionsText(sections);
  const key = env.OPENROUTER_API_KEY?.trim() || env.OPENAI_API_KEY?.trim();
  if (!key) {
    return {
      aiGenerated: false,
      source: 'deterministic-fallback',
      label: 'Deterministic summary (no AI provider configured)',
      sections,
      text: fallback,
    };
  }
  try {
    const useOpenRouter = Boolean(env.OPENROUTER_API_KEY?.trim());
    const url = useOpenRouter ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    const model = useOpenRouter ? env.OPENROUTER_MODEL || 'openai/gpt-4o-mini' : env.OPENAI_MODEL || 'gpt-4o-mini';
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          { role: 'system', content: 'You prepare administrative dental-practice summaries only. Never diagnose or recommend treatment. Use only the supplied recorded facts.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Provider returned ${res.status}`);
    const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = (payload?.choices?.[0]?.message?.content || '').trim();
    if (!text) throw new Error('Provider returned empty content');
    return { aiGenerated: true, source: 'provider', sections, text };
  } catch {
    return {
      aiGenerated: false,
      source: 'deterministic-fallback',
      label: 'Deterministic summary (AI provider unavailable)',
      sections,
      text: fallback,
    };
  }
}
