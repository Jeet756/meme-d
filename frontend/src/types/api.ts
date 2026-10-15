// Response shapes returned by the Meme'd API. Money is always an integer number of paise.

export type Role = 'brand' | 'creator';
export type Platform = 'instagram' | 'youtube';
export type CampaignStatus = 'draft' | 'live' | 'completed';
export type PayoutStatus = 'no_milestone_yet' | 'earned' | 'waiting_for_budget' | 'campaign_not_live';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Milestone {
  id: string;
  minViews: number;
  payoutPaise: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  status: CampaignStatus;
  brand: { id?: string; name: string };
  budgetPaise: number;
  remainingPaise: number;
  /** Only present when the caller owns the campaign. */
  spentPaise?: number;
  milestones: Milestone[];
  submissionCount: number;
  createdAt: string;
}

export interface Submission {
  id: string;
  postUrl: string;
  viewCount: number;
  earnedPaise: number;
  payoutStatus: PayoutStatus;
  pendingPaise: number;
  nextMilestone: { minViews: number; payoutPaise: number } | null;
  progressToNext: number;
  campaign: {
    id: string;
    name: string;
    platform: Platform;
    status: CampaignStatus;
    remainingPaise: number;
    milestones: Milestone[];
  };
  creator?: { id: string; name: string };
  suspicious?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignBudget {
  campaignId: string;
  status: CampaignStatus;
  budgetPaise: number;
  spentPaise: number;
  remainingPaise: number;
  utilization: number;
  ledgerEntryCount: number;
  ledgerTotalPaise: number;
  ledgerMatchesSpend: boolean;
  submissionCount: number;
  suspiciousSubmissionCount: number;
  submissionsWaitingForBudget: number;
  owedButUnfundedPaise: number;
}

export interface DailyAmount {
  day: string;
  amountPaise: number;
}

export interface CreatorEarnings {
  totalEarnedPaise: number;
  blockedPaise: number;
  submissionsWaitingForBudget: number;
  activeCampaigns: number;
  submissionCount: number;
  totalViews: number;
  earningsByDay: DailyAmount[];
}

export interface PayoutEntry {
  id: string;
  amountPaise: number;
  previousEarnedPaise: number;
  newEarnedPaise: number;
  viewsAtAward: number;
  createdAt: string;
  campaign: { id: string; name: string; platform: Platform };
  submission: { id: string; postUrl: string };
  milestone: { minViews: number; payoutPaise: number };
}

export interface BrandOverview {
  campaignCount: number;
  allocatedPaise: number;
  spentPaise: number;
  remainingPaise: number;
  payoutCount: number;
  suspiciousSubmissionCount: number;
  campaigns: {
    id: string;
    name: string;
    platform: Platform;
    status: CampaignStatus;
    budgetPaise: number;
    spentPaise: number;
    submissionCount: number;
    totalViews: number;
  }[];
  recentSubmissions: Submission[];
  spendByDay: DailyAmount[];
}

export interface ViewUpdateResponse {
  submission: {
    id: string;
    viewCount: number;
    earnedPaise: number;
    payoutStatus: PayoutStatus;
    pendingPaise: number;
    nextMilestone: { minViews: number; payoutPaise: number } | null;
    progressToNext: number;
  };
  payout: {
    outcome: 'no_milestone' | 'up_to_date' | 'awarded' | 'insufficient_budget' | 'campaign_not_live';
    awardedPaise: number;
    blockedPaise: number;
    viewsDecreased: boolean;
  };
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
