import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
