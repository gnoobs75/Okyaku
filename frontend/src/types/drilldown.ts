// Discriminated union for all drill-down types
export type DrillDownType =
  | 'contacts-list'
  | 'contact-detail'
  | 'companies-list'
  | 'company-detail'
  | 'deals-list'
  | 'deal-detail'
  | 'tasks-list'
  | 'task-detail'
  | 'activities-list'
  | 'activity-detail'
  | 'user-activities'
  | 'pipeline-stage'
  | 'forecast-month'
  | 'contacts-by-status';

export interface DrillDownItemBase {
  id: string;
  type: DrillDownType;
  title: string;
  parentId?: string;
}

export interface ContactsListDrillDown extends DrillDownItemBase {
  type: 'contacts-list';
  filters?: {
    status?: string;
    company_id?: string;
    search?: string;
  };
}

export interface ContactDetailDrillDown extends DrillDownItemBase {
  type: 'contact-detail';
  contactId: string;
}

export interface CompaniesListDrillDown extends DrillDownItemBase {
  type: 'companies-list';
  filters?: {
    search?: string;
  };
}

export interface CompanyDetailDrillDown extends DrillDownItemBase {
  type: 'company-detail';
  companyId: string;
}

export interface DealsListDrillDown extends DrillDownItemBase {
  type: 'deals-list';
  filters?: {
    stage_id?: string;
    contact_id?: string;
    company_id?: string;
    close_month?: string;
    status?: 'open' | 'closed';
  };
}

export interface DealDetailDrillDown extends DrillDownItemBase {
  type: 'deal-detail';
  dealId: string;
}

export interface TasksListDrillDown extends DrillDownItemBase {
  type: 'tasks-list';
  filters?: {
    status?: string;
    priority?: string;
    contact_id?: string;
    deal_id?: string;
    overdue?: boolean;
  };
}

export interface TaskDetailDrillDown extends DrillDownItemBase {
  type: 'task-detail';
  taskId: string;
}

export interface ActivitiesListDrillDown extends DrillDownItemBase {
  type: 'activities-list';
  filters?: {
    type?: string;
    contact_id?: string;
    deal_id?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
  };
}

export interface ActivityDetailDrillDown extends DrillDownItemBase {
  type: 'activity-detail';
  activityId: string;
}

export interface UserActivitiesDrillDown extends DrillDownItemBase {
  type: 'user-activities';
  userId: string;
  userName: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PipelineStageDrillDown extends DrillDownItemBase {
  type: 'pipeline-stage';
  stageId: string;
  stageName: string;
  pipelineId: string;
}

export interface ForecastMonthDrillDown extends DrillDownItemBase {
  type: 'forecast-month';
  month: string;
  monthLabel: string;
}

export interface ContactsByStatusDrillDown extends DrillDownItemBase {
  type: 'contacts-by-status';
  status: string;
}

// Union type for all drill-downs
export type DrillDownItem =
  | ContactsListDrillDown
  | ContactDetailDrillDown
  | CompaniesListDrillDown
  | CompanyDetailDrillDown
  | DealsListDrillDown
  | DealDetailDrillDown
  | TasksListDrillDown
  | TaskDetailDrillDown
  | ActivitiesListDrillDown
  | ActivityDetailDrillDown
  | UserActivitiesDrillDown
  | PipelineStageDrillDown
  | ForecastMonthDrillDown
  | ContactsByStatusDrillDown;

// Context type
export interface DrillDownContextType {
  stack: DrillDownItem[];
  push: (item: Omit<DrillDownItem, 'id' | 'parentId'>) => void;
  pop: () => void;
  popTo: (id: string) => void;
  clear: () => void;
  isOpen: boolean;
}
