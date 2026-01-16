import type { DrillDownItem } from '@/types/drilldown';
import { ContactListView } from './views/ContactListView';
import { ContactDetailView } from './views/ContactDetailView';
import { CompanyListView } from './views/CompanyListView';
import { CompanyDetailView } from './views/CompanyDetailView';
import { DealListView } from './views/DealListView';
import { DealDetailView } from './views/DealDetailView';
import { TaskListView } from './views/TaskListView';
import { TaskDetailView } from './views/TaskDetailView';
import { ActivityListView } from './views/ActivityListView';
import { ActivityDetailView } from './views/ActivityDetailView';
import { UserActivityView } from './views/UserActivityView';
import { PipelineStageView } from './views/PipelineStageView';
import { ForecastMonthView } from './views/ForecastMonthView';

interface DrillDownContentProps {
  item: DrillDownItem;
}

export function DrillDownContent({ item }: DrillDownContentProps) {
  switch (item.type) {
    case 'contacts-list':
      return <ContactListView filters={item.filters} />;

    case 'contact-detail':
      return <ContactDetailView contactId={item.contactId} />;

    case 'contacts-by-status':
      return <ContactListView filters={{ status: item.status }} />;

    case 'companies-list':
      return <CompanyListView filters={item.filters} />;

    case 'company-detail':
      return <CompanyDetailView companyId={item.companyId} />;

    case 'deals-list':
      return <DealListView filters={item.filters} />;

    case 'deal-detail':
      return <DealDetailView dealId={item.dealId} />;

    case 'tasks-list':
      return <TaskListView filters={item.filters} />;

    case 'task-detail':
      return <TaskDetailView taskId={item.taskId} />;

    case 'activities-list':
      return <ActivityListView filters={item.filters} />;

    case 'activity-detail':
      return <ActivityDetailView activityId={item.activityId} />;

    case 'user-activities':
      return (
        <UserActivityView
          userId={item.userId}
          userName={item.userName}
          dateFrom={item.dateFrom}
          dateTo={item.dateTo}
        />
      );

    case 'pipeline-stage':
      return (
        <PipelineStageView
          stageId={item.stageId}
          stageName={item.stageName}
          pipelineId={item.pipelineId}
        />
      );

    case 'forecast-month':
      return (
        <ForecastMonthView
          month={item.month}
          monthLabel={item.monthLabel}
        />
      );

    default:
      return (
        <div className="text-center text-muted-foreground py-8">
          Unknown drill-down type
        </div>
      );
  }
}
