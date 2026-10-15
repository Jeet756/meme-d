'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatViews, platformLabel } from '@/lib/format';
import { findLadderProblems } from '@/lib/ladder';
import { formatPaise, rupeesInputToPaise } from '@/lib/money';
import type { Campaign, Platform } from '@/types/api';
import { MilestoneStaircase } from './MilestoneStaircase';

interface Draft {
  name: string;
  description: string;
  platform: Platform;
  budget: string;
  milestones: { views: string; payout: string }[];
}

const MAX_BUDGET_PAISE = 1_00_00_000 * 100;
const steps = ['Basics', 'Milestones', 'Review'] as const;

const initialDraft: Draft = {
  name: '',
  description: '',
  platform: 'instagram',
  budget: '',
  milestones: [
    { views: '10000', payout: '500' },
    { views: '50000', payout: '2000' },
  ],
};

function parseMilestones(draft: Draft) {
  return draft.milestones.map((row) => ({
    minViews: /^\d+$/.test(row.views.replace(/,/g, '')) ? Number(row.views.replace(/,/g, '')) : NaN,
    payoutPaise: rupeesInputToPaise(row.payout) ?? NaN,
  }));
}

export function CampaignForm() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ladderProblems, setLadderProblems] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<'live' | 'draft' | null>(null);

  const budgetPaise = rupeesInputToPaise(draft.budget);
  const milestones = parseMilestones(draft);
  const validMilestones = milestones.filter((m) => Number.isFinite(m.minViews) && Number.isFinite(m.payoutPaise));

  function validateBasics(): boolean {
    const next: Record<string, string> = {};
    if (draft.name.trim().length < 3) next.name = 'Give the campaign a name (3+ characters).';
    if (draft.description.trim().length < 10) next.description = 'Describe what creators should make (10+ characters).';
    if (budgetPaise === null || budgetPaise < 100) next.budget = 'Enter a budget of at least ₹1, using digits only.';
    else if (budgetPaise > MAX_BUDGET_PAISE) next.budget = 'Budget cannot exceed ₹1,00,00,000.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateLadder(): boolean {
    const problems =
      milestones.some((m) => Number.isNaN(m.minViews) || Number.isNaN(m.payoutPaise))
        ? ['Fill in every milestone with a whole number of views and a payout in rupees.']
        : findLadderProblems(milestones, budgetPaise ?? undefined);
    setLadderProblems(problems);
    return problems.length === 0;
  }

  function goNext() {
    if (step === 0 && !validateBasics()) return;
    if (step === 1 && !validateLadder()) return;
    setStep((current) => Math.min(2, current + 1));
  }

  function updateMilestone(index: number, key: 'views' | 'payout', value: string) {
    setDraft((current) => ({
      ...current,
      milestones: current.milestones.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  }

  async function submit(status: 'live' | 'draft') {
    if (!validateBasics() || !validateLadder() || budgetPaise === null) return;
    setSubmitting(status);
    try {
      const { data } = await api.post<Campaign>('/campaigns', {
        name: draft.name.trim(),
        description: draft.description.trim(),
        platform: draft.platform,
        budgetPaise,
        status,
        milestones,
      });
      toast.push({ tone: 'success', title: status === 'live' ? 'Campaign launched' : 'Draft saved', body: data.name });
      router.push(`/brand/campaigns/${data.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.push({ tone: 'error', title: 'Campaign not saved', body: error.message });
        const details = Object.entries(error.fieldErrors);
        if (details.length > 0) {
          setErrors(Object.fromEntries(details));
          setStep(details.some(([key]) => key === 'milestones') ? 1 : 0);
          if (error.fieldErrors.milestones) setLadderProblems([error.fieldErrors.milestones]);
        }
      } else {
        toast.push({ tone: 'error', title: 'Campaign not saved', body: 'Please try again.' });
      }
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-6">
      <ol className="flex gap-2" aria-label="Progress">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={cn(
              'flex-1 rounded-control border px-3 py-2 text-sm',
              index === step ? 'border-violet-400 bg-violet-500/10 text-fog-50' : index < step ? 'border-white/10 text-fog-200' : 'border-white/[0.06] text-fog-500',
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <Panel className="p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <TextField label="Campaign name" value={draft.name} error={errors.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <TextAreaField
              label="What should creators make?"
              value={draft.description}
              error={errors.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label="Platform" value={draft.platform} onChange={(e) => setDraft({ ...draft, platform: e.target.value as Platform })}>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
              </SelectField>
              <TextField
                label="Total budget (₹)"
                inputMode="decimal"
                placeholder="50,000"
                value={draft.budget}
                error={errors.budgetPaise ?? errors.budget}
                hint="Payouts can never exceed this."
                onChange={(e) => setDraft({ ...draft, budget: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <p className="text-sm text-fog-300">
              A post earns the payout of the <strong className="text-fog-50">highest</strong> milestone it reaches. Payouts are not added together, so each rung should pay more than the one below.
            </p>
            <div className="space-y-3">
              {draft.milestones.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                  <TextField label={`Views (milestone ${index + 1})`} inputMode="numeric" value={row.views} onChange={(e) => updateMilestone(index, 'views', e.target.value)} />
                  <TextField label="Payout (₹)" inputMode="decimal" value={row.payout} onChange={(e) => updateMilestone(index, 'payout', e.target.value)} />
                  <Button
                    variant="ghost"
                    aria-label={`Remove milestone ${index + 1}`}
                    disabled={draft.milestones.length === 1}
                    onClick={() => setDraft({ ...draft, milestones: draft.milestones.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" disabled={draft.milestones.length >= 12} onClick={() => setDraft({ ...draft, milestones: [...draft.milestones, { views: '', payout: '' }] })}>
              <Plus className="h-4 w-4" aria-hidden /> Add milestone
            </Button>
            {ladderProblems.length > 0 && (
              <ul role="alert" className="space-y-1 rounded-control border border-signal-red/30 bg-signal-red/10 p-3 text-sm text-signal-red">
                {ladderProblems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
            {validMilestones.length > 0 && (
              <div className="rounded-control bg-ink-900/60 p-4">
                <p className="mb-3 text-sm text-fog-400">Preview</p>
                <MilestoneStaircase milestones={validMilestones} />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-sm text-fog-400">Campaign</dt><dd className="text-fog-50">{draft.name}</dd></div>
              <div><dt className="text-sm text-fog-400">Platform</dt><dd className="text-fog-50">{platformLabel(draft.platform)}</dd></div>
              <div><dt className="text-sm text-fog-400">Total budget</dt><dd className="tabular text-fog-50">{budgetPaise === null ? '-' : formatPaise(budgetPaise)}</dd></div>
              <div><dt className="text-sm text-fog-400">Milestones</dt><dd className="text-fog-50">{milestones.length}</dd></div>
            </dl>
            <ul className="divide-y divide-white/[0.06] rounded-control border border-white/[0.06]">
              {milestones.map((m, i) => (
                <li key={i} className="tabular flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-fog-300">{formatViews(m.minViews)} views</span>
                  <span className="text-fog-50">{formatPaise(m.payoutPaise)}</span>
                </li>
              ))}
            </ul>
            <p className="rounded-control bg-violet-500/10 p-4 text-sm text-fog-200">
              If the remaining budget cannot cover a creator&rsquo;s whole next payout, that payout waits. Meme&rsquo;d never pays part of a milestone and never overspends.
            </p>
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="ghost" disabled={step === 0 || submitting !== null} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        {step < 2 ? (
          <Button onClick={goNext}>Continue</Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="secondary" loading={submitting === 'draft'} disabled={submitting !== null} onClick={() => submit('draft')}>
              Save as draft
            </Button>
            <Button variant="accent" loading={submitting === 'live'} disabled={submitting !== null} onClick={() => submit('live')}>
              Launch campaign
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
