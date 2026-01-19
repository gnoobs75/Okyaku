import { useState } from "react";
import {
  Book,
  ChevronRight,
  ChevronDown,
  Search,
  Home,
  Users,
  Building2,
  DollarSign,
  Activity,
  CheckSquare,
  Mail,
  Share2,
  Sparkles,
  Calendar,
  Shield,
  HelpCircle,
  Rocket,
  Settings,
  BarChart3,
  Brain,
  MessageSquare,
  FileText,
  Zap,
  Target,
  UserCircle,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: "introduction",
    title: "Introduction",
    icon: Book,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">What is Okyaku?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Okyaku is an AI-Native Customer Relationship Management (CRM) platform designed for businesses
            that prioritize data privacy while wanting cutting-edge AI capabilities. Unlike traditional CRMs
            with AI features added as an afterthought, Okyaku was built from the ground up with artificial
            intelligence at its core.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="font-semibold text-foreground mb-2">Complete Data Sovereignty</h3>
            <p className="text-sm text-muted-foreground">All data stays on your infrastructure</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="font-semibold text-foreground mb-2">Zero AI API Costs</h3>
            <p className="text-sm text-muted-foreground">Local AI inference using Ollama</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="font-semibold text-foreground mb-2">Privacy-First Design</h3>
            <p className="text-sm text-muted-foreground">No data sent to third-party services</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="font-semibold text-foreground mb-2">Comprehensive CRM</h3>
            <p className="text-sm text-muted-foreground">Full-featured contact, deal, and activity management</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">System Requirements</h3>
          <div className="bg-muted/30 rounded-lg p-4 border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground">Server</p>
                <ul className="text-muted-foreground mt-1 space-y-1">
                  <li>Python 3.11+</li>
                  <li>Node.js 18+</li>
                  <li>PostgreSQL 14+</li>
                  <li>Ollama (for AI)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Hardware</p>
                <ul className="text-muted-foreground mt-1 space-y-1">
                  <li>8GB RAM minimum</li>
                  <li>16GB recommended for AI</li>
                  <li>20GB disk space</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Getting Started</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Follow these steps to begin using Okyaku CRM effectively.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Creating Your Account</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Navigate to the login page</li>
            <li>Click <span className="font-medium text-foreground">"Create an account"</span></li>
            <li>Fill in the registration form:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><strong>Email</strong>: Your email address (must be unique)</li>
                <li><strong>Full Name</strong>: Your display name (optional)</li>
                <li><strong>Username</strong>: Your login username (must be unique)</li>
                <li><strong>Password</strong>: Your secure password</li>
              </ul>
            </li>
            <li>Click <span className="font-medium text-foreground">"Create Account"</span></li>
            <li>You will be automatically logged in</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Navigation Overview</h3>
          <p className="text-muted-foreground mb-3">The sidebar is organized into three main sections:</p>

          <div className="space-y-4">
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <h4 className="font-semibold text-primary mb-2">CRM Section</h4>
              <p className="text-sm text-muted-foreground">Dashboard, Contacts, Companies, Deals, Activities, Tasks</p>
            </div>
            <div className="bg-blue-500/5 rounded-lg p-4 border border-blue-500/20">
              <h4 className="font-semibold text-blue-600 mb-2">Marketing Section</h4>
              <p className="text-sm text-muted-foreground">Email Campaigns, Social Media Suite (13 features)</p>
            </div>
            <div className="bg-gray-500/5 rounded-lg p-4 border border-gray-500/20">
              <h4 className="font-semibold text-gray-600 mb-2">System Section</h4>
              <p className="text-sm text-muted-foreground">Calendar, Audit Log, Settings</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: Home,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Dashboard Overview</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Dashboard is your home screen providing a comprehensive overview of your CRM data.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">KPI Cards</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-semibold text-foreground">Metric</th>
                  <th className="text-left py-2 font-semibold text-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b"><td className="py-2">Total Contacts</td><td>Count of all contacts</td></tr>
                <tr className="border-b"><td className="py-2">Total Companies</td><td>Count of all companies</td></tr>
                <tr className="border-b"><td className="py-2">Pipeline Value</td><td>Total value of open deals</td></tr>
                <tr className="border-b"><td className="py-2">Conversion Rate</td><td>Contacts to customers %</td></tr>
                <tr className="border-b"><td className="py-2">Activities</td><td>Activities in period</td></tr>
                <tr className="border-b"><td className="py-2">Open Tasks</td><td>Pending tasks count</td></tr>
                <tr className="border-b"><td className="py-2">Overdue Tasks</td><td>Past due date (red)</td></tr>
                <tr><td className="py-2">Closed Deals</td><td>Value closed in period</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Charts & Visualizations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Pipeline Funnel</h4>
              <p className="text-sm text-muted-foreground">Visualizes deals across pipeline stages with counts and values</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Deal Forecast</h4>
              <p className="text-sm text-muted-foreground">Monthly projections showing expected vs. closed deals</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Date Range Selection</h3>
          <p className="text-muted-foreground">
            Use the date picker at the top right to filter all metrics by time period.
            Default is last 30 days. All KPIs update automatically when you change the range.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "contacts",
    title: "Contact Management",
    icon: Users,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Contact Management</h2>
          <p className="text-muted-foreground leading-relaxed">
            Manage all your business contacts with comprehensive profiles, lifecycle tracking, and easy import/export.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Contact Lifecycle</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">LEAD</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">PROSPECT</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">CUSTOMER</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">CHURNED</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Creating a Contact</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Click the <strong>"Add Contact"</strong> button</li>
            <li>Fill in the required fields:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>First Name, Last Name, Email</li>
              </ul>
            </li>
            <li>Add optional information: Phone, Mobile, Job Title, Department</li>
            <li>Select Company association (if applicable)</li>
            <li>Set Status and Source</li>
            <li>Click <strong>"Save"</strong></li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Search & Filter</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Search</strong>: Enter name, email, or phone in search bar</li>
            <li><strong>Filter by Status</strong>: Use dropdown to filter by lifecycle stage</li>
            <li><strong>Pagination</strong>: 20 contacts per page with navigation</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Import/Export</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Importing</h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Click "Import" button</li>
                <li>Download CSV template</li>
                <li>Fill in your data</li>
                <li>Upload and map fields</li>
                <li>Review and confirm</li>
              </ol>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Exporting</h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Apply desired filters</li>
                <li>Click "Export" button</li>
                <li>CSV downloads with all fields</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "companies",
    title: "Company Management",
    icon: Building2,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Company Management</h2>
          <p className="text-muted-foreground leading-relaxed">
            Manage business accounts with industry classification, size tracking, and contact associations.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Company Fields</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-semibold text-foreground">Field</th>
                  <th className="text-left py-2 font-semibold text-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b"><td className="py-2">Name</td><td>Company name (required)</td></tr>
                <tr className="border-b"><td className="py-2">Domain</td><td>Website domain</td></tr>
                <tr className="border-b"><td className="py-2">Industry</td><td>Industry classification</td></tr>
                <tr className="border-b"><td className="py-2">Size</td><td>1-10, 11-50, 51-200, 201-500, 500+</td></tr>
                <tr className="border-b"><td className="py-2">Description</td><td>Company overview</td></tr>
                <tr><td className="py-2">Address</td><td>Full location details</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Company-Contact Relationship</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>A contact can belong to one company</li>
            <li>A company can have many contacts</li>
            <li>Assign contacts via the contact form's Company dropdown</li>
            <li>View all company contacts from the company detail page</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "deals",
    title: "Deal Pipeline",
    icon: DollarSign,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Deal Pipeline Management</h2>
          <p className="text-muted-foreground leading-relaxed">
            Visualize and manage your sales process with a Kanban-style pipeline board.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Default Pipeline Stages</h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">Prospecting (20%)</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">Qualification (40%)</span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Proposal (60%)</span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded text-sm">Negotiation (80%)</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">Closed-Won (100%)</span>
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm">Closed-Lost</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Working with Deals</h3>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Creating a Deal</h4>
              <p className="text-sm text-muted-foreground">
                Click "Add Deal", enter name, value, select pipeline and stage,
                set expected close date, and associate with contact/company.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Moving Deals</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Drag-and-drop</strong>: Click and drag deal cards between stage columns.
                <br />
                <strong>Edit</strong>: Click deal, change Stage dropdown, save.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Stage History</h4>
              <p className="text-sm text-muted-foreground">
                All stage transitions are automatically tracked with timestamps and user attribution.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Forecasting</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Total Pipeline Value</strong>: Sum of all open deals</li>
            <li><strong>Weighted Value</strong>: Adjusted by stage win probability</li>
            <li><strong>Monthly Forecast</strong>: Expected closes by date</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "activities",
    title: "Activity Tracking",
    icon: Activity,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Activity Tracking</h2>
          <p className="text-muted-foreground leading-relaxed">
            Log and track all interactions with contacts including calls, emails, and meetings.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Activity Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="font-medium text-blue-800">Call</p>
              <p className="text-xs text-blue-600">Phone conversations</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="font-medium text-green-800">Email</p>
              <p className="text-xs text-green-600">Email communications</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <p className="font-medium text-purple-800">Meeting</p>
              <p className="text-xs text-purple-600">In-person or video</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="font-medium text-gray-800">Note</p>
              <p className="text-xs text-gray-600">General observations</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <p className="font-medium text-orange-800">Task</p>
              <p className="text-xs text-orange-600">Task-related updates</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="font-medium text-slate-800">Other</p>
              <p className="text-xs text-slate-600">Miscellaneous</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Logging Activities</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Use <strong>Quick Log</strong> buttons for Call, Email, Meeting</li>
            <li>Enter Subject (required) and Description</li>
            <li>Set Activity Date and Duration</li>
            <li>Record Outcome (e.g., "connected", "left voicemail")</li>
            <li>Link to Contact, Company, and/or Deal</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "tasks",
    title: "Task Management",
    icon: CheckSquare,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Task Management</h2>
          <p className="text-muted-foreground leading-relaxed">
            Create, assign, and track tasks with priorities, due dates, and reminders.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Task Status</h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">Pending</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">In Progress</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">Completed</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Priority Levels</h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-red-100 text-red-800 rounded text-sm font-medium">Urgent</div>
            <div className="text-center p-2 bg-orange-100 text-orange-800 rounded text-sm font-medium">High</div>
            <div className="text-center p-2 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">Medium</div>
            <div className="text-center p-2 bg-green-100 text-green-800 rounded text-sm font-medium">Low</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Features</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Quick Complete</strong>: Click checkmark to instantly complete</li>
            <li><strong>Overdue Detection</strong>: Red highlighting for past due tasks</li>
            <li><strong>Reminders</strong>: Set reminder date/time for notifications</li>
            <li><strong>Assignment</strong>: Assign tasks to team members</li>
            <li><strong>Entity Linking</strong>: Associate with Contact, Company, Deal</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "email",
    title: "Email Marketing",
    icon: Mail,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Email Marketing</h2>
          <p className="text-muted-foreground leading-relaxed">
            Create, schedule, and track email campaigns with templates and analytics.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Campaign Lifecycle</h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">Draft</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">Scheduled</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Sending</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">Sent</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Creating Campaigns</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Create or select an email template</li>
            <li>Configure campaign name and subject line</li>
            <li>Add recipients (manual or filter-based)</li>
            <li>Preview and test</li>
            <li>Schedule or send immediately</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Template Variables</h3>
          <div className="bg-muted/50 rounded-lg p-4 border font-mono text-sm">
            <p>{"{{first_name}}"} - Contact's first name</p>
            <p>{"{{last_name}}"} - Contact's last name</p>
            <p>{"{{email}}"} - Contact's email</p>
            <p>{"{{company_name}}"} - Associated company</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Tracking Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center border">
              <p className="text-sm text-muted-foreground">Delivered</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center border">
              <p className="text-sm text-muted-foreground">Opens</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center border">
              <p className="text-sm text-muted-foreground">Clicks</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center border">
              <p className="text-sm text-muted-foreground">Bounces</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "social",
    title: "Social Media",
    icon: Share2,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Social Media Management</h2>
          <p className="text-muted-foreground leading-relaxed">
            Complete social media suite with 13 integrated features for multi-platform management.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Supported Platforms</h3>
          <div className="flex gap-3">
            <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">LinkedIn</span>
            <span className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium">Twitter/X</span>
            <span className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">Facebook</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div className="p-2 bg-muted/50 rounded border">Social Calendar</div>
            <div className="p-2 bg-muted/50 rounded border">Account Management</div>
            <div className="p-2 bg-muted/50 rounded border">Social Inbox</div>
            <div className="p-2 bg-muted/50 rounded border">Analytics</div>
            <div className="p-2 bg-muted/50 rounded border">AI Content</div>
            <div className="p-2 bg-muted/50 rounded border">Content Library</div>
            <div className="p-2 bg-muted/50 rounded border">Social Listening</div>
            <div className="p-2 bg-muted/50 rounded border">Hashtag Research</div>
            <div className="p-2 bg-muted/50 rounded border">Competitors</div>
            <div className="p-2 bg-muted/50 rounded border">A/B Testing</div>
            <div className="p-2 bg-muted/50 rounded border">Automation</div>
            <div className="p-2 bg-muted/50 rounded border">Reports</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Social Calendar</h3>
          <p className="text-muted-foreground">
            Schedule and manage posts across platforms with month/week/day views,
            drag-and-drop scheduling, and multi-account support.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Social Inbox</h3>
          <p className="text-muted-foreground">
            Unified inbox for direct messages, mentions, comments, and replies.
            Assign to team members, link to CRM contacts, and reply directly.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "ai-features",
    title: "AI Features",
    icon: Brain,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">AI-Powered Intelligence</h2>
          <p className="text-muted-foreground leading-relaxed">
            Self-hosted AI features powered by Ollama and Llama 3.1 with zero API costs.
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-primary mb-2">Self-Hosted AI</h3>
          <p className="text-sm text-muted-foreground">
            All AI runs locally on your infrastructure. No data sent to external services.
            Complete privacy and zero recurring costs.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Lead Scoring</h3>
          <p className="text-muted-foreground mb-3">
            AI calculates scores (0-100) based on profile completeness, engagement, company fit, and timing.
          </p>
          <div className="grid grid-cols-4 gap-2 text-sm text-center">
            <div className="p-2 bg-red-100 text-red-800 rounded font-medium">80-100: HOT</div>
            <div className="p-2 bg-orange-100 text-orange-800 rounded font-medium">60-79: WARM</div>
            <div className="p-2 bg-blue-100 text-blue-800 rounded font-medium">40-59: COOL</div>
            <div className="p-2 bg-gray-100 text-gray-800 rounded font-medium">0-39: COLD</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Deal Forecasting</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Close probability calculation</li>
            <li>Predicted deal amount</li>
            <li>Days to close estimation</li>
            <li>Risk level assessment (LOW/MEDIUM/HIGH/CRITICAL)</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">AI Agent</h3>
          <p className="text-muted-foreground mb-2">
            Autonomous task execution with human-in-the-loop approval for write operations.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm"><strong>Auto-approved:</strong> Search, get details, summaries</p>
            <p className="text-sm"><strong>Requires approval:</strong> Create/update contacts, deals, activities, tasks</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Natural Language Queries</h3>
          <p className="text-muted-foreground mb-2">Ask questions in plain English:</p>
          <div className="bg-muted/50 rounded-lg p-4 border font-mono text-sm space-y-1">
            <p>"How many leads do we have?"</p>
            <p>"Show me deals over $50,000"</p>
            <p>"What's our pipeline value?"</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">AI Content Generation</h3>
          <p className="text-muted-foreground">
            Generate social media content optimized for each platform with tone selection,
            hashtag generation, and content variations.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "calendar",
    title: "Calendar & Scheduling",
    icon: Calendar,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Calendar & Scheduling</h2>
          <p className="text-muted-foreground leading-relaxed">
            Integrate external calendars and create public booking links for easy scheduling.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Supported Providers</h3>
          <div className="flex gap-3">
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">Google Calendar</span>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">Microsoft Outlook</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Calendar Integration</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>OAuth-based secure connection</li>
            <li>Two-way synchronization</li>
            <li>Link events to CRM contacts and deals</li>
            <li>Automatic activity logging</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Scheduling Links</h3>
          <p className="text-muted-foreground mb-3">
            Create public booking pages for prospects and customers to schedule meetings.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Configuration</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Custom duration (15, 30, 60 min)</li>
                <li>Buffer time before/after</li>
                <li>Availability windows</li>
                <li>Custom questions</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Meeting Types</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Video call (Zoom, Meet, Teams)</li>
                <li>Phone call</li>
                <li>In-person</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "analytics",
    title: "Reports & Analytics",
    icon: BarChart3,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Reports & Analytics</h2>
          <p className="text-muted-foreground leading-relaxed">
            Comprehensive reporting across CRM, marketing, and social media.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Dashboard Metrics</h3>
          <p className="text-muted-foreground">
            Real-time KPIs including contact/company counts, pipeline value,
            conversion rates, activities, and task status.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Social Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="p-2 bg-muted/50 rounded border">Overview metrics</div>
            <div className="p-2 bg-muted/50 rounded border">Platform breakdown</div>
            <div className="p-2 bg-muted/50 rounded border">Timeline trends</div>
            <div className="p-2 bg-muted/50 rounded border">Top posts</div>
            <div className="p-2 bg-muted/50 rounded border">Best times</div>
            <div className="p-2 bg-muted/50 rounded border">Content insights</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Data Export</h3>
          <p className="text-muted-foreground">
            Export data as CSV from most list views. Apply filters before export
            to get exactly the data you need.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "admin",
    title: "Administration",
    icon: Settings,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">System Administration</h2>
          <p className="text-muted-foreground leading-relaxed">
            Manage users, pipelines, audit logs, and system configuration.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Pipeline Configuration</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Create multiple pipelines for different processes</li>
            <li>Custom stage names and order</li>
            <li>Win probability per stage (0-100%)</li>
            <li>Set default pipeline</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Audit Log</h3>
          <p className="text-muted-foreground mb-3">
            Comprehensive tracking of all system changes for compliance.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Action Types</h4>
              <p className="text-sm text-muted-foreground">
                Create, Update, Delete, View, Export, Import, Login, Logout
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h4 className="font-medium text-foreground mb-2">Tracked Info</h4>
              <p className="text-sm text-muted-foreground">
                User, timestamp, old/new values, IP address
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">GDPR Compliance</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Export all user data</li>
            <li>Configurable data retention policies</li>
            <li>Complete data deletion capability</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "user-personas",
    title: "User Personas",
    icon: UserCircle,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">User Roles & Workflows</h2>
          <p className="text-muted-foreground leading-relaxed">
            How different team members use Okyaku in their daily work.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Sales Representative</h3>
            <p className="text-sm text-blue-700 mb-2">
              <strong>Key features:</strong> Contacts, Deals, Activities, Tasks, Lead Scores
            </p>
            <p className="text-sm text-blue-600">
              Daily: Check dashboard, review tasks, work deals, log activities, check lead scores
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2">Sales Manager</h3>
            <p className="text-sm text-purple-700 mb-2">
              <strong>Key features:</strong> Dashboard KPIs, Pipeline Funnel, Forecasts, Leaderboard
            </p>
            <p className="text-sm text-purple-600">
              Daily: Review pipeline health, check team activity, identify stalled deals, coach team
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">Marketing Manager</h3>
            <p className="text-sm text-green-700 mb-2">
              <strong>Key features:</strong> Email Campaigns, Social Media, AI Content, Analytics
            </p>
            <p className="text-sm text-green-600">
              Daily: Review inbox, check campaigns, schedule content, analyze engagement
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h3 className="font-semibold text-orange-800 mb-2">Customer Success Manager</h3>
            <p className="text-sm text-orange-700 mb-2">
              <strong>Key features:</strong> Churn Risk, Activities, Tasks, Conversation Intelligence
            </p>
            <p className="text-sm text-orange-600">
              Daily: Review churn alerts, check activity patterns, plan outreach, identify upsells
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: AlertTriangle,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Troubleshooting</h2>
          <p className="text-muted-foreground leading-relaxed">
            Common issues and how to resolve them.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="font-semibold text-foreground mb-2">Login Issues</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Verify username is correct (case-sensitive)</li>
              <li>Check password</li>
              <li>Clear browser cache</li>
              <li>Try incognito/private mode</li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="font-semibold text-foreground mb-2">AI Features Not Working</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Verify Ollama is running: <code className="bg-muted px-1 rounded">ollama list</code></li>
              <li>Check model is installed: <code className="bg-muted px-1 rounded">ollama pull llama3.1:8b</code></li>
              <li>Verify backend can reach Ollama</li>
              <li>First request may be slow (model loading)</li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="font-semibold text-foreground mb-2">Calendar Sync Issues</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Check connection status</li>
              <li>Refresh OAuth token</li>
              <li>Verify sync direction settings</li>
              <li>Check for error messages</li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="font-semibold text-foreground mb-2">Performance Issues</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Check database connection</li>
              <li>Review browser network tab</li>
              <li>Clear browser cache</li>
              <li>Check server resources (RAM, CPU)</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "glossary",
    title: "Glossary",
    icon: BookOpen,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Glossary</h2>
          <p className="text-muted-foreground leading-relaxed">
            Key terms and definitions used throughout Okyaku.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { term: "Activity", def: "A logged interaction with a contact (call, email, meeting, note)" },
            { term: "Churn", def: "When a customer stops using your product/service" },
            { term: "Churn Risk", def: "AI-calculated probability that a customer will churn" },
            { term: "CRM", def: "Customer Relationship Management system" },
            { term: "Deal", def: "A potential or in-progress sales opportunity" },
            { term: "Forecast", def: "Predicted future sales based on current pipeline" },
            { term: "Funnel", def: "Visual representation of deals moving through stages" },
            { term: "Human-in-the-Loop", def: "AI system requiring human approval before action" },
            { term: "Kanban", def: "Visual board methodology for managing workflow" },
            { term: "Lead", def: "A potential customer who has shown interest" },
            { term: "Lead Score", def: "AI-calculated score (0-100) indicating sales readiness" },
            { term: "LLM", def: "Large Language Model for natural language processing" },
            { term: "NBA", def: "Next-Best-Action - AI-recommended action to take" },
            { term: "OAuth", def: "Protocol for secure third-party access" },
            { term: "Ollama", def: "Local AI inference server" },
            { term: "Pipeline", def: "Series of stages deals progress through" },
            { term: "Prospect", def: "A qualified lead being actively pursued" },
            { term: "RAG", def: "Retrieval Augmented Generation - AI with document context" },
            { term: "Sentiment", def: "Emotional tone (positive, neutral, negative)" },
            { term: "Win Probability", def: "Likelihood of closing a deal at each stage" },
          ].map((item) => (
            <div key={item.term} className="flex border-b pb-2">
              <span className="font-semibold text-foreground w-40 shrink-0">{item.term}</span>
              <span className="text-muted-foreground">{item.def}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNav, setExpandedNav] = useState(true);

  const filteredSections = sections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSection = sections.find((s) => s.id === activeSection);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background">
      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "border-r bg-card transition-all duration-300 flex flex-col",
          expandedNav ? "w-72" : "w-16"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {expandedNav && (
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Documentation</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpandedNav(!expandedNav)}
            className="shrink-0"
          >
            {expandedNav ? (
              <ChevronDown className="h-4 w-4 rotate-90" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search */}
        {expandedNav && (
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <div className="space-y-1">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {expandedNav && <span className="truncate">{section.title}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Version */}
        {expandedNav && (
          <div className="p-4 border-t text-center">
            <p className="text-xs text-muted-foreground">Okyaku CRM v0.1.0</p>
          </div>
        )}
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {currentSection?.content}
        </div>
      </main>
    </div>
  );
}
