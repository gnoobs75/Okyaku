import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { DrillDownProvider } from "@/context/DrillDownContext";
import { TutorialProvider } from "@/context/TutorialContext";
import { DrillDownModalStack } from "@/components/drilldown/DrillDownModalStack";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ContactsListPage } from "@/pages/contacts/ContactsListPage";
import { ContactFormPage } from "@/pages/contacts/ContactFormPage";
import { CompaniesListPage } from "@/pages/companies/CompaniesListPage";
import { CompanyFormPage } from "@/pages/companies/CompanyFormPage";
import { PipelineBoardPage } from "@/pages/deals/PipelineBoardPage";
import { ActivitiesPage } from "@/pages/activities/ActivitiesPage";
import { TasksPage } from "@/pages/tasks/TasksPage";
import { EmailCampaignsPage } from "@/pages/email/EmailCampaignsPage";
import { CampaignFormPage } from "@/pages/email/CampaignFormPage";
import { EmailTemplatesPage } from "@/pages/email/EmailTemplatesPage";
import { SocialCalendarPage } from "@/pages/social/SocialCalendarPage";
import { SocialAccountsPage } from "@/pages/social/SocialAccountsPage";
import { SocialInboxPage } from "@/pages/social/SocialInboxPage";
import { SocialAnalyticsPage } from "@/pages/social/SocialAnalyticsPage";
import { AIContentPage } from "@/pages/social/AIContentPage";
import { ContentLibraryPage } from "@/pages/social/ContentLibraryPage";
import { SocialListeningPage } from "@/pages/social/SocialListeningPage";
import { HashtagResearchPage } from "@/pages/social/HashtagResearchPage";
import { CompetitorTrackingPage } from "@/pages/social/CompetitorTrackingPage";
import { ABTestingPage } from "@/pages/social/ABTestingPage";
import { EngagementAutomationPage } from "@/pages/social/EngagementAutomationPage";
import { ReportingPage } from "@/pages/social/ReportingPage";
import { CalendarSettingsPage } from "@/pages/calendar/CalendarSettingsPage";
import { AuditLogPage } from "@/pages/settings/AuditLogPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TutorialProvider>
        <DrillDownProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Contacts */}
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <Layout>
                  <ContactsListPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <ContactFormPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ContactFormPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Companies */}
          <Route
            path="/companies"
            element={
              <ProtectedRoute>
                <Layout>
                  <CompaniesListPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <CompanyFormPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <CompanyFormPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Deals */}
          <Route
            path="/deals"
            element={
              <ProtectedRoute>
                <Layout>
                  <PipelineBoardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Activities */}
          <Route
            path="/activities"
            element={
              <ProtectedRoute>
                <Layout>
                  <ActivitiesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Tasks */}
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Layout>
                  <TasksPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Email Campaigns */}
          <Route
            path="/email/campaigns"
            element={
              <ProtectedRoute>
                <Layout>
                  <EmailCampaignsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/email/campaigns/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <CampaignFormPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/email/campaigns/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <CampaignFormPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/email/templates"
            element={
              <ProtectedRoute>
                <Layout>
                  <EmailTemplatesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Social Media */}
          <Route
            path="/social"
            element={
              <ProtectedRoute>
                <Layout>
                  <SocialCalendarPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/accounts"
            element={
              <ProtectedRoute>
                <Layout>
                  <SocialAccountsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/inbox"
            element={
              <ProtectedRoute>
                <Layout>
                  <SocialInboxPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <SocialAnalyticsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/ai"
            element={
              <ProtectedRoute>
                <Layout>
                  <AIContentPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/library"
            element={
              <ProtectedRoute>
                <Layout>
                  <ContentLibraryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/listening"
            element={
              <ProtectedRoute>
                <Layout>
                  <SocialListeningPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/hashtags"
            element={
              <ProtectedRoute>
                <Layout>
                  <HashtagResearchPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/competitors"
            element={
              <ProtectedRoute>
                <Layout>
                  <CompetitorTrackingPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/ab-testing"
            element={
              <ProtectedRoute>
                <Layout>
                  <ABTestingPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/automation"
            element={
              <ProtectedRoute>
                <Layout>
                  <EngagementAutomationPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <ReportingPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Calendar */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Layout>
                  <CalendarSettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Audit Log */}
          <Route
            path="/audit-log"
            element={
              <ProtectedRoute>
                <Layout>
                  <AuditLogPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <DrillDownModalStack />
        </DrillDownProvider>
        </TutorialProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
