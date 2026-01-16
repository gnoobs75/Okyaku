// Tutorial Mode Content - All tutorials for the Okyaku CRM application

// ============================================================================
// TYPES
// ============================================================================

export interface TutorialStep {
  title: string;
  description: string;
  tip?: string;
}

export interface TerminologyItem {
  term: string;
  definition: string;
  example?: string;
}

export interface CommonIssue {
  problem: string;
  solution: string;
}

export interface TutorialSection {
  title: string;
  content: string;
  steps: TutorialStep[];
  terminology?: TerminologyItem[];
  tips?: string[];
  warnings?: string[];
}

export interface StageTutorial {
  id: string;
  stageName: string;
  title: string;
  introduction: string;
  sections: TutorialSection[];
  quickStart: string[];
  commonIssues: CommonIssue[];
}

// ============================================================================
// CRM TUTORIALS
// ============================================================================

export const dashboardTutorial: StageTutorial = {
  id: 'dashboard',
  stageName: 'Dashboard',
  title: 'Dashboard Overview',
  introduction: 'Your central command center for monitoring CRM performance, tracking key metrics, and accessing quick insights across your contacts, deals, and activities.',

  quickStart: [
    'Review your key metrics at the top of the dashboard',
    'Check the pipeline chart for deal distribution across stages',
    'Review recent activities and upcoming tasks',
    'Click on any metric card to drill down for details',
    'Use the sidebar navigation to access other CRM areas',
    'Check notifications for important updates',
  ],

  sections: [
    {
      title: 'Key Metrics Overview',
      content: 'The top section displays your most important CRM metrics at a glance.',
      steps: [
        {
          title: 'View Contact Count',
          description: 'See your total number of contacts in the system.',
          tip: 'Click the card to navigate to your contacts list.',
        },
        {
          title: 'Track Company Count',
          description: 'Monitor how many companies you\'re managing.',
        },
        {
          title: 'Check Deal Value',
          description: 'See the total value of deals in your pipeline.',
          tip: 'This includes deals in all stages except lost.',
        },
        {
          title: 'Monitor Activity Count',
          description: 'Track the number of activities logged.',
        },
      ],
      terminology: [
        {
          term: 'Pipeline Value',
          definition: 'The total monetary value of all active deals currently in your sales pipeline.',
          example: 'If you have 3 deals worth $10K, $25K, and $15K, your pipeline value is $50K.',
        },
        {
          term: 'Conversion Rate',
          definition: 'The percentage of leads or deals that successfully convert to customers.',
        },
      ],
      tips: [
        'Check your dashboard daily to stay on top of your sales performance.',
        'Use the metrics to identify areas that need attention.',
      ],
    },
    {
      title: 'Pipeline Visualization',
      content: 'Visual charts showing your deal distribution and sales funnel.',
      steps: [
        {
          title: 'Review Pipeline Chart',
          description: 'See how many deals are in each stage of your pipeline.',
        },
        {
          title: 'Analyze Trends',
          description: 'Look for patterns in your deal progression.',
          tip: 'A healthy pipeline should have more deals in early stages than late stages.',
        },
      ],
      tips: [
        'A balanced pipeline helps predict future revenue.',
        'Look for bottlenecks where deals get stuck.',
      ],
    },
    {
      title: 'Recent Activities',
      content: 'Quick view of the latest activities across your CRM.',
      steps: [
        {
          title: 'View Activity Feed',
          description: 'See recent calls, meetings, notes, and emails.',
        },
        {
          title: 'Quick Actions',
          description: 'Click on activities to view details or follow up.',
        },
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Metrics show zero values',
      solution: 'Add some contacts, companies, or deals to see your metrics update.',
    },
    {
      problem: 'Charts not loading',
      solution: 'Refresh the page. If the issue persists, check your internet connection.',
    },
  ],
};

export const contactsTutorial: StageTutorial = {
  id: 'contacts',
  stageName: 'Contacts',
  title: 'Contact Management',
  introduction: 'Manage all your business contacts in one place. Add, edit, search, and organize contact information efficiently.',

  quickStart: [
    'Click "Add Contact" to create a new contact',
    'Fill in the contact details (name, email, phone)',
    'Optionally link the contact to a company',
    'Use the search bar to find existing contacts',
    'Click on a contact to view or edit their details',
    'Use filters to segment your contact list',
  ],

  sections: [
    {
      title: 'Adding Contacts',
      content: 'Create new contacts with all their relevant information.',
      steps: [
        {
          title: 'Click Add Contact',
          description: 'Use the "Add Contact" button in the top right.',
        },
        {
          title: 'Enter Basic Information',
          description: 'Fill in first name, last name, email, and phone number.',
          tip: 'Email is important for sending campaigns later.',
        },
        {
          title: 'Add Company Association',
          description: 'Link the contact to an existing company.',
          tip: 'Create the company first if it doesn\'t exist.',
        },
        {
          title: 'Set Job Title and Role',
          description: 'Add their position for context in communications.',
        },
        {
          title: 'Save the Contact',
          description: 'Click Save to create the contact.',
        },
      ],
      terminology: [
        {
          term: 'Lead',
          definition: 'A potential customer who has shown interest but hasn\'t been qualified yet.',
        },
        {
          term: 'Contact',
          definition: 'A person in your CRM with whom you have a business relationship.',
        },
        {
          term: 'Company Association',
          definition: 'Linking a contact to the organization they work for.',
        },
      ],
      tips: [
        'Keep contact information up to date for better communication.',
        'Add notes about interactions for context in future conversations.',
        'Use tags or custom fields to segment contacts.',
      ],
      warnings: [
        'Deleting a contact also removes their activity history.',
        'Ensure email addresses are correct before sending campaigns.',
      ],
    },
    {
      title: 'Searching and Filtering',
      content: 'Find contacts quickly using search and filters.',
      steps: [
        {
          title: 'Use the Search Bar',
          description: 'Type a name, email, or company to find contacts.',
        },
        {
          title: 'Apply Filters',
          description: 'Filter by company, status, or other attributes.',
        },
        {
          title: 'Sort Results',
          description: 'Click column headers to sort the list.',
        },
      ],
      tips: [
        'Search works on names, emails, and company names.',
        'Combine multiple filters for precise results.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Cannot find a contact',
      solution: 'Try searching by email or company name instead of just the name.',
    },
    {
      problem: 'Duplicate contacts appearing',
      solution: 'Search before adding new contacts. Consider merging duplicates.',
    },
  ],
};

export const companiesTutorial: StageTutorial = {
  id: 'companies',
  stageName: 'Companies',
  title: 'Company Management',
  introduction: 'Organize business accounts and track company-level information. Link contacts and deals to companies for comprehensive account management.',

  quickStart: [
    'Click "Add Company" to create a new company',
    'Enter company name and website',
    'Add industry and company size',
    'Link existing contacts to the company',
    'Use search to find companies by name',
    'Click a company to view all related contacts and deals',
  ],

  sections: [
    {
      title: 'Creating Companies',
      content: 'Add new companies to organize your accounts.',
      steps: [
        {
          title: 'Click Add Company',
          description: 'Use the "Add Company" button to start.',
        },
        {
          title: 'Enter Company Details',
          description: 'Add name, website, industry, and size.',
          tip: 'The website helps identify the company later.',
        },
        {
          title: 'Add Address Information',
          description: 'Include location details if relevant.',
        },
        {
          title: 'Save the Company',
          description: 'Click Save to create the company record.',
        },
      ],
      terminology: [
        {
          term: 'Account',
          definition: 'Another term for a company in CRM terminology. Represents a business entity.',
        },
        {
          term: 'Industry',
          definition: 'The business sector the company operates in (e.g., Technology, Healthcare).',
        },
      ],
      tips: [
        'Companies help you organize contacts by organization.',
        'Track deal value per company to identify key accounts.',
      ],
    },
    {
      title: 'Managing Company Relationships',
      content: 'View and manage all contacts and deals associated with a company.',
      steps: [
        {
          title: 'View Company Profile',
          description: 'Click a company to see its full profile.',
        },
        {
          title: 'See Related Contacts',
          description: 'View all contacts that work at this company.',
        },
        {
          title: 'Track Company Deals',
          description: 'See all deals associated with this company.',
        },
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Contacts not showing under company',
      solution: 'Edit the contact and select the company in the company field.',
    },
    {
      problem: 'Cannot delete a company',
      solution: 'First remove or reassign all contacts associated with the company.',
    },
  ],
};

export const dealsTutorial: StageTutorial = {
  id: 'deals',
  stageName: 'Pipeline',
  title: 'Sales Pipeline Management',
  introduction: 'Track and manage your sales opportunities through a visual Kanban board. Move deals through stages, track values, and forecast revenue.',

  quickStart: [
    'View all your deals organized by pipeline stage',
    'Drag and drop deals to move them between stages',
    'Click "Add Deal" to create a new opportunity',
    'Set deal value and expected close date',
    'Click a deal card to view full details',
    'Track your total pipeline value at the top',
  ],

  sections: [
    {
      title: 'Understanding the Pipeline',
      content: 'The pipeline board shows your deals organized by sales stage.',
      steps: [
        {
          title: 'View Pipeline Stages',
          description: 'Deals are organized into columns: Lead, Qualified, Proposal, Negotiation, Won, Lost.',
        },
        {
          title: 'Read Deal Cards',
          description: 'Each card shows deal name, value, and associated contact/company.',
        },
        {
          title: 'Move Deals',
          description: 'Drag and drop cards to move deals between stages.',
          tip: 'This automatically updates the deal status.',
        },
      ],
      terminology: [
        {
          term: 'Pipeline',
          definition: 'A visual representation of all your active sales opportunities and their stages.',
        },
        {
          term: 'Pipeline Stage',
          definition: 'A step in your sales process (e.g., Lead, Qualified, Proposal, Won).',
        },
        {
          term: 'Deal Value',
          definition: 'The potential revenue from a deal if closed successfully.',
        },
        {
          term: 'Close Date',
          definition: 'The expected date when a deal will be won or lost.',
        },
        {
          term: 'Win Rate',
          definition: 'The percentage of deals that close successfully.',
        },
      ],
      tips: [
        'Keep deals updated as they progress through stages.',
        'Set realistic close dates for better forecasting.',
        'Add notes when moving deals to track the reason.',
      ],
    },
    {
      title: 'Creating Deals',
      content: 'Add new sales opportunities to your pipeline.',
      steps: [
        {
          title: 'Click Add Deal',
          description: 'Use the "Add Deal" button to start.',
        },
        {
          title: 'Enter Deal Details',
          description: 'Add deal name, value, and select the starting stage.',
        },
        {
          title: 'Link to Contact/Company',
          description: 'Associate the deal with a contact or company.',
          tip: 'This helps track relationships and history.',
        },
        {
          title: 'Set Expected Close Date',
          description: 'Enter when you expect to close this deal.',
        },
      ],
      tips: [
        'Use descriptive deal names that include the opportunity type.',
        'Always associate deals with contacts for better tracking.',
      ],
      warnings: [
        'Moving a deal to "Lost" removes it from pipeline value calculations.',
        'Deleted deals cannot be recovered.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Drag and drop not working',
      solution: 'Make sure you\'re clicking on the deal card itself, not the action buttons.',
    },
    {
      problem: 'Deal value not updating total',
      solution: 'Refresh the page. Won and Lost deals don\'t count toward active pipeline.',
    },
  ],
};

export const activitiesTutorial: StageTutorial = {
  id: 'activities',
  stageName: 'Activities',
  title: 'Activity Tracking',
  introduction: 'Log and track all your customer interactions including calls, meetings, emails, and notes. Keep a complete history of your communications.',

  quickStart: [
    'View all activities in chronological order',
    'Click "Log Activity" to record a new interaction',
    'Select the activity type (call, meeting, email, note)',
    'Link the activity to a contact or deal',
    'Add notes about the outcome or next steps',
    'Filter activities by type or date range',
  ],

  sections: [
    {
      title: 'Logging Activities',
      content: 'Record your customer interactions for future reference.',
      steps: [
        {
          title: 'Click Log Activity',
          description: 'Use the button to create a new activity.',
        },
        {
          title: 'Select Activity Type',
          description: 'Choose from call, meeting, email, or note.',
        },
        {
          title: 'Add Activity Details',
          description: 'Enter subject, description, and outcome.',
        },
        {
          title: 'Link to Contact',
          description: 'Associate with the relevant contact or company.',
        },
      ],
      terminology: [
        {
          term: 'Activity',
          definition: 'Any recorded interaction with a contact (call, meeting, email, note).',
        },
        {
          term: 'Activity Log',
          definition: 'The chronological history of all interactions.',
        },
      ],
      tips: [
        'Log activities immediately after they happen for accuracy.',
        'Include actionable next steps in your notes.',
        'Use consistent activity types for better reporting.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Activities not showing for contact',
      solution: 'Make sure the activity was linked to the correct contact when created.',
    },
  ],
};

export const tasksTutorial: StageTutorial = {
  id: 'tasks',
  stageName: 'Tasks',
  title: 'Task Management',
  introduction: 'Create and manage tasks to stay organized. Set due dates, priorities, and track completion of your to-do items.',

  quickStart: [
    'View all your tasks organized by status',
    'Click "Add Task" to create a new task',
    'Set a due date and priority level',
    'Link tasks to contacts or deals',
    'Mark tasks complete when finished',
    'Filter by priority or due date',
  ],

  sections: [
    {
      title: 'Creating Tasks',
      content: 'Add tasks to track your follow-ups and action items.',
      steps: [
        {
          title: 'Click Add Task',
          description: 'Use the button to create a new task.',
        },
        {
          title: 'Enter Task Details',
          description: 'Add title, description, and due date.',
        },
        {
          title: 'Set Priority',
          description: 'Choose low, medium, or high priority.',
          tip: 'High priority tasks appear at the top.',
        },
        {
          title: 'Link to Record',
          description: 'Associate with a contact, company, or deal.',
        },
      ],
      tips: [
        'Set realistic due dates to avoid overdue tasks.',
        'Review tasks daily to stay on top of your work.',
        'Use priorities to focus on what matters most.',
      ],
    },
    {
      title: 'Managing Tasks',
      content: 'Keep track of your task progress.',
      steps: [
        {
          title: 'Mark Complete',
          description: 'Check off tasks when finished.',
        },
        {
          title: 'Edit Tasks',
          description: 'Update details or change due dates as needed.',
        },
        {
          title: 'Filter Tasks',
          description: 'View by status, priority, or due date.',
        },
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Overdue tasks not highlighted',
      solution: 'Check that the due date was set correctly when creating the task.',
    },
  ],
};

// ============================================================================
// EMAIL MARKETING TUTORIALS
// ============================================================================

export const emailCampaignsTutorial: StageTutorial = {
  id: 'email-campaigns',
  stageName: 'Email Campaigns',
  title: 'Email Campaign Management',
  introduction: 'Create and manage email marketing campaigns. Design emails, select recipients, and track performance.',

  quickStart: [
    'View all your email campaigns and their status',
    'Click "New Campaign" to create a campaign',
    'Choose or create an email template',
    'Select your target audience',
    'Schedule or send immediately',
    'Track opens, clicks, and conversions',
  ],

  sections: [
    {
      title: 'Creating Campaigns',
      content: 'Build email campaigns to reach your contacts.',
      steps: [
        {
          title: 'Start New Campaign',
          description: 'Click "New Campaign" to begin.',
        },
        {
          title: 'Set Campaign Details',
          description: 'Enter campaign name and subject line.',
          tip: 'Subject lines under 50 characters perform better.',
        },
        {
          title: 'Select Template',
          description: 'Choose from existing templates or create new.',
        },
        {
          title: 'Choose Recipients',
          description: 'Select contacts or segments to receive the email.',
        },
        {
          title: 'Schedule Delivery',
          description: 'Set send time or send immediately.',
          tip: 'Test sending to yourself first.',
        },
      ],
      terminology: [
        {
          term: 'Campaign',
          definition: 'A coordinated email marketing effort sent to a group of contacts.',
        },
        {
          term: 'Open Rate',
          definition: 'Percentage of recipients who opened your email.',
        },
        {
          term: 'Click Rate',
          definition: 'Percentage of recipients who clicked a link in your email.',
        },
        {
          term: 'Bounce Rate',
          definition: 'Percentage of emails that couldn\'t be delivered.',
        },
      ],
      tips: [
        'Personalize emails with recipient names for better engagement.',
        'Send at optimal times (Tuesday-Thursday, mid-morning).',
        'Always include an unsubscribe link.',
      ],
      warnings: [
        'Test your campaign before sending to the full list.',
        'Sending to purchased lists may harm your sender reputation.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Low open rates',
      solution: 'Improve subject lines and sender name. A/B test different approaches.',
    },
    {
      problem: 'Emails going to spam',
      solution: 'Ensure proper email authentication (SPF, DKIM) is configured.',
    },
  ],
};

export const emailTemplatesTutorial: StageTutorial = {
  id: 'email-templates',
  stageName: 'Email Templates',
  title: 'Email Template Library',
  introduction: 'Create and manage reusable email templates for your campaigns. Build professional emails once and use them repeatedly.',

  quickStart: [
    'Browse existing templates in the library',
    'Click "New Template" to create a template',
    'Design your email layout and content',
    'Use variables for personalization',
    'Save and categorize your template',
    'Use templates when creating campaigns',
  ],

  sections: [
    {
      title: 'Creating Templates',
      content: 'Build reusable email designs.',
      steps: [
        {
          title: 'Start New Template',
          description: 'Click "New Template" to begin.',
        },
        {
          title: 'Enter Template Name',
          description: 'Give it a descriptive name for easy finding.',
        },
        {
          title: 'Design Content',
          description: 'Create your email layout and add content.',
        },
        {
          title: 'Add Personalization',
          description: 'Use {{first_name}} and similar variables.',
        },
      ],
      terminology: [
        {
          term: 'Template',
          definition: 'A reusable email design that can be used across multiple campaigns.',
        },
        {
          term: 'Merge Fields',
          definition: 'Variables like {{first_name}} that get replaced with contact data.',
        },
      ],
      tips: [
        'Create templates for common email types (welcome, follow-up, newsletter).',
        'Keep designs mobile-friendly.',
        'Test templates on different email clients.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Template looks different in email clients',
      solution: 'Use inline CSS and test across multiple email clients.',
    },
  ],
};

// ============================================================================
// SOCIAL MEDIA TUTORIALS
// ============================================================================

export const socialCalendarTutorial: StageTutorial = {
  id: 'social-calendar',
  stageName: 'Social Calendar',
  title: 'Social Media Calendar',
  introduction: 'Plan and schedule your social media content. View all your upcoming posts in a calendar layout and maintain a consistent posting schedule.',

  quickStart: [
    'View your scheduled posts in calendar format',
    'Click on a date to schedule a new post',
    'Create posts for multiple platforms at once',
    'Drag posts to reschedule them',
    'Color-coded by platform for easy viewing',
    'Switch between month, week, and day views',
  ],

  sections: [
    {
      title: 'Scheduling Posts',
      content: 'Plan and schedule social media content in advance.',
      steps: [
        {
          title: 'Select a Date',
          description: 'Click on the calendar date for your post.',
        },
        {
          title: 'Choose Platforms',
          description: 'Select which social networks to post on.',
        },
        {
          title: 'Create Content',
          description: 'Write your post and add images or videos.',
          tip: 'Use AI Content tool for writing assistance.',
        },
        {
          title: 'Set Time',
          description: 'Choose the exact time for publishing.',
          tip: 'Check analytics for optimal posting times.',
        },
        {
          title: 'Schedule',
          description: 'Confirm and add to your content calendar.',
        },
      ],
      terminology: [
        {
          term: 'Content Calendar',
          definition: 'A planning tool showing all scheduled social media posts.',
        },
        {
          term: 'Publishing Schedule',
          definition: 'The planned dates and times for posting content.',
        },
      ],
      tips: [
        'Maintain a consistent posting schedule for better engagement.',
        'Plan content at least a week in advance.',
        'Balance promotional and value-adding content.',
      ],
      warnings: [
        'Connected accounts must be authorized to post.',
        'Some platforms have specific content requirements.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Post failed to publish',
      solution: 'Check that your social account is still connected and authorized.',
    },
    {
      problem: 'Images not uploading',
      solution: 'Verify image meets platform size requirements.',
    },
  ],
};

export const socialAccountsTutorial: StageTutorial = {
  id: 'social-accounts',
  stageName: 'Social Accounts',
  title: 'Social Account Management',
  introduction: 'Connect and manage your social media accounts. Link your profiles to enable posting, monitoring, and analytics.',

  quickStart: [
    'View all your connected social accounts',
    'Click "Connect Account" to add a new platform',
    'Authorize Okyaku to manage your account',
    'Check connection status for each account',
    'Reconnect if authorization expires',
    'Remove accounts you no longer need',
  ],

  sections: [
    {
      title: 'Connecting Accounts',
      content: 'Link your social media profiles to Okyaku.',
      steps: [
        {
          title: 'Click Connect Account',
          description: 'Choose the platform you want to add.',
        },
        {
          title: 'Sign In',
          description: 'Log into your social media account.',
        },
        {
          title: 'Authorize Access',
          description: 'Grant Okyaku permission to post and read.',
          tip: 'We only request necessary permissions.',
        },
        {
          title: 'Verify Connection',
          description: 'Check that the account shows as connected.',
        },
      ],
      terminology: [
        {
          term: 'OAuth',
          definition: 'Secure authorization method that connects accounts without sharing passwords.',
        },
        {
          term: 'Access Token',
          definition: 'The credential that allows posting on your behalf.',
        },
      ],
      tips: [
        'Connect all your brand social accounts for unified management.',
        'Business accounts have more features available.',
        'Re-authorize if you change your password.',
      ],
      warnings: [
        'Disconnecting removes scheduled posts for that account.',
        'Some features require business/creator accounts.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Cannot connect account',
      solution: 'Ensure you have admin access to the account and pop-ups are allowed.',
    },
    {
      problem: 'Account shows as disconnected',
      solution: 'Tokens expire; click reconnect to re-authorize.',
    },
  ],
};

export const socialInboxTutorial: StageTutorial = {
  id: 'social-inbox',
  stageName: 'Social Inbox',
  title: 'Social Media Inbox',
  introduction: 'Manage all your social media messages and comments in one unified inbox. Respond to customers across platforms without switching apps.',

  quickStart: [
    'View messages from all connected platforms',
    'Filter by platform or message type',
    'Click a conversation to view and reply',
    'Mark messages as read or important',
    'Use templates for common responses',
    'Assign conversations to team members',
  ],

  sections: [
    {
      title: 'Managing Messages',
      content: 'Handle social media conversations efficiently.',
      steps: [
        {
          title: 'View Inbox',
          description: 'See all incoming messages and comments.',
        },
        {
          title: 'Filter Messages',
          description: 'Focus on specific platforms or message types.',
        },
        {
          title: 'Reply to Messages',
          description: 'Respond directly from the inbox.',
          tip: 'Responses post to the original platform.',
        },
        {
          title: 'Mark Status',
          description: 'Track which messages need attention.',
        },
      ],
      terminology: [
        {
          term: 'Unified Inbox',
          definition: 'Single view combining messages from all connected social platforms.',
        },
        {
          term: 'Response Time',
          definition: 'How quickly you reply to messages (tracked for analytics).',
        },
      ],
      tips: [
        'Respond promptly to improve customer satisfaction.',
        'Use saved replies for common questions.',
        'Check inbox regularly throughout the day.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Messages not appearing',
      solution: 'Verify accounts are connected and have messaging permissions.',
    },
  ],
};

export const socialAnalyticsTutorial: StageTutorial = {
  id: 'social-analytics',
  stageName: 'Social Analytics',
  title: 'Social Media Analytics',
  introduction: 'Track your social media performance with detailed analytics. Measure engagement, reach, and growth across all your platforms.',

  quickStart: [
    'View overall performance metrics at a glance',
    'Select date range for analysis',
    'Compare performance across platforms',
    'Track follower growth over time',
    'Identify your best-performing content',
    'Export reports for stakeholders',
  ],

  sections: [
    {
      title: 'Understanding Metrics',
      content: 'Learn what each metric means for your social strategy.',
      steps: [
        {
          title: 'Review Engagement Rate',
          description: 'See how your audience interacts with content.',
        },
        {
          title: 'Track Reach',
          description: 'Monitor how many people see your posts.',
        },
        {
          title: 'Analyze Growth',
          description: 'Check follower trends over time.',
        },
        {
          title: 'Identify Top Posts',
          description: 'Find your highest-performing content.',
        },
      ],
      terminology: [
        {
          term: 'Engagement Rate',
          definition: 'Percentage of people who interact (like, comment, share) with your content.',
          example: '100 engagements on a post seen by 1,000 people = 10% engagement rate.',
        },
        {
          term: 'Reach',
          definition: 'The number of unique people who see your content.',
        },
        {
          term: 'Impressions',
          definition: 'Total number of times content is displayed (includes repeat views).',
        },
        {
          term: 'Click-Through Rate (CTR)',
          definition: 'Percentage of people who click links in your posts.',
        },
      ],
      tips: [
        'Focus on engagement rate rather than just follower count.',
        'Compare your metrics to industry benchmarks.',
        'Analyze which content types perform best.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Analytics not updating',
      solution: 'Social platforms may delay data by 24-48 hours.',
    },
    {
      problem: 'Low reach despite many followers',
      solution: 'Algorithm changes may affect visibility; focus on engagement.',
    },
  ],
};

export const aiContentTutorial: StageTutorial = {
  id: 'ai-content',
  stageName: 'AI Content',
  title: 'AI Content Generation',
  introduction: 'Generate social media content using AI assistance. Get content ideas, write posts, and optimize your messaging for better engagement.',

  quickStart: [
    'Enter a topic or idea for content',
    'Select the target platform and tone',
    'Click Generate to get AI suggestions',
    'Review and edit the generated content',
    'Copy to use in your posts',
    'Save favorites for later use',
  ],

  sections: [
    {
      title: 'Generating Content',
      content: 'Use AI to help create social media posts.',
      steps: [
        {
          title: 'Enter Your Topic',
          description: 'Describe what you want to post about.',
          tip: 'Be specific for better results.',
        },
        {
          title: 'Select Platform',
          description: 'Choose which social network the content is for.',
          tip: 'AI adjusts length and style per platform.',
        },
        {
          title: 'Choose Tone',
          description: 'Select professional, casual, or other tones.',
        },
        {
          title: 'Generate Content',
          description: 'Click generate and review options.',
        },
        {
          title: 'Refine if Needed',
          description: 'Edit or regenerate for better results.',
        },
      ],
      terminology: [
        {
          term: 'Prompt',
          definition: 'The instructions or topic you provide to the AI.',
        },
        {
          term: 'Tone',
          definition: 'The style of writing (professional, casual, humorous, etc.).',
        },
      ],
      tips: [
        'Always review and personalize AI-generated content.',
        'Use AI as a starting point, not final content.',
        'Experiment with different prompts for variety.',
      ],
      warnings: [
        'AI content should be reviewed for accuracy.',
        'Ensure content matches your brand voice.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Generated content is off-topic',
      solution: 'Provide more specific prompts with context.',
    },
    {
      problem: 'Content sounds generic',
      solution: 'Add specific details about your brand or industry.',
    },
  ],
};

export const contentLibraryTutorial: StageTutorial = {
  id: 'content-library',
  stageName: 'Content Library',
  title: 'Content Asset Library',
  introduction: 'Store and organize your content assets. Keep templates, images, and approved content ready for quick use in your social posts.',

  quickStart: [
    'Browse your content library by type',
    'Click "Add Asset" to upload new content',
    'Organize assets into collections',
    'Mark favorites for quick access',
    'Copy content directly to posts',
    'Filter by type, category, or tags',
  ],

  sections: [
    {
      title: 'Managing Assets',
      content: 'Build your library of reusable content.',
      steps: [
        {
          title: 'Add New Asset',
          description: 'Upload images, templates, or text snippets.',
        },
        {
          title: 'Categorize Assets',
          description: 'Assign types and categories for organization.',
        },
        {
          title: 'Create Collections',
          description: 'Group related assets together.',
          tip: 'Use collections for campaigns or themes.',
        },
        {
          title: 'Mark Favorites',
          description: 'Star frequently used assets.',
        },
      ],
      terminology: [
        {
          term: 'Asset',
          definition: 'Any piece of content (image, template, text snippet) stored in the library.',
        },
        {
          term: 'Collection',
          definition: 'A group of related assets organized together.',
        },
        {
          term: 'Template',
          definition: 'Pre-written content that can be customized for specific posts.',
        },
      ],
      tips: [
        'Build a library of approved brand assets.',
        'Keep templates for common post types.',
        'Use consistent naming for easy searching.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Cannot find an asset',
      solution: 'Use search or filter by type and category.',
    },
  ],
};

export const socialListeningTutorial: StageTutorial = {
  id: 'social-listening',
  stageName: 'Social Listening',
  title: 'Social Media Listening',
  introduction: 'Monitor brand mentions and track keywords across social media. Stay informed about what people are saying about your brand and industry.',

  quickStart: [
    'Add keywords to track (brand name, products, competitors)',
    'View mentions in the main feed',
    'Filter by sentiment (positive, negative, neutral)',
    'Set up alerts for important keywords',
    'Track mention trends over time',
    'Respond to mentions directly',
  ],

  sections: [
    {
      title: 'Setting Up Tracking',
      content: 'Configure what to monitor across social media.',
      steps: [
        {
          title: 'Add Keywords',
          description: 'Enter brand names, products, or topics to track.',
        },
        {
          title: 'Configure Alerts',
          description: 'Set notification preferences for mentions.',
        },
        {
          title: 'Review Mentions',
          description: 'Monitor the feed for relevant conversations.',
        },
        {
          title: 'Analyze Sentiment',
          description: 'Track how people feel about your brand.',
        },
      ],
      terminology: [
        {
          term: 'Mention',
          definition: 'A social media post that includes your tracked keyword.',
        },
        {
          term: 'Sentiment Analysis',
          definition: 'AI analysis of whether a mention is positive, negative, or neutral.',
        },
        {
          term: 'Social Listening',
          definition: 'Monitoring social media for mentions and conversations about your brand.',
        },
      ],
      tips: [
        'Track competitor names to stay informed.',
        'Respond to negative mentions promptly.',
        'Use insights to improve your strategy.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Not seeing expected mentions',
      solution: 'Some platforms limit access to historical data.',
    },
  ],
};

export const hashtagResearchTutorial: StageTutorial = {
  id: 'hashtag-research',
  stageName: 'Hashtag Research',
  title: 'Hashtag Research Tool',
  introduction: 'Research and analyze hashtags to improve your content reach. Find trending hashtags and build hashtag sets for your posts.',

  quickStart: [
    'Search for hashtags related to your content',
    'View popularity and engagement metrics',
    'Discover related hashtags',
    'Create hashtag sets for different topics',
    'Copy hashtag sets to your posts',
    'Track hashtag performance over time',
  ],

  sections: [
    {
      title: 'Researching Hashtags',
      content: 'Find the best hashtags for your content.',
      steps: [
        {
          title: 'Search Hashtags',
          description: 'Enter a keyword to find related hashtags.',
        },
        {
          title: 'Analyze Popularity',
          description: 'Review usage stats and engagement.',
          tip: 'Mix popular and niche hashtags.',
        },
        {
          title: 'Build Hashtag Sets',
          description: 'Save groups of hashtags for different topics.',
        },
        {
          title: 'Apply to Posts',
          description: 'Copy sets when creating content.',
        },
      ],
      terminology: [
        {
          term: 'Hashtag',
          definition: 'A word or phrase preceded by # used to categorize content.',
        },
        {
          term: 'Hashtag Set',
          definition: 'A saved group of related hashtags for easy reuse.',
        },
        {
          term: 'Trending Hashtag',
          definition: 'A hashtag currently popular and widely used.',
        },
      ],
      tips: [
        'Use 5-15 hashtags per Instagram post.',
        'Use 1-3 hashtags on Twitter/X.',
        'Research competitor hashtags for ideas.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Hashtags not improving reach',
      solution: 'Use more specific, relevant hashtags rather than only popular ones.',
    },
  ],
};

export const competitorTrackingTutorial: StageTutorial = {
  id: 'competitor-tracking',
  stageName: 'Competitor Tracking',
  title: 'Competitor Analysis',
  introduction: 'Monitor competitor social media activity. Track their content, engagement, and strategy to inform your own approach.',

  quickStart: [
    'Add competitors to track',
    'View their posting frequency and content',
    'Compare engagement metrics',
    'Analyze their best-performing content',
    'Track their follower growth',
    'Get insights for your strategy',
  ],

  sections: [
    {
      title: 'Tracking Competitors',
      content: 'Set up monitoring for competitor accounts.',
      steps: [
        {
          title: 'Add Competitor',
          description: 'Enter competitor social media handles.',
        },
        {
          title: 'Review Activity',
          description: 'See their recent posts and frequency.',
        },
        {
          title: 'Analyze Engagement',
          description: 'Compare their metrics to yours.',
        },
        {
          title: 'Identify Trends',
          description: 'Find what works for them.',
        },
      ],
      terminology: [
        {
          term: 'Competitive Analysis',
          definition: 'Studying competitor strategies to inform your own.',
        },
        {
          term: 'Share of Voice',
          definition: 'Your brand mentions compared to competitors.',
        },
      ],
      tips: [
        'Don\'t just copy - learn and adapt.',
        'Track 3-5 key competitors.',
        'Note successful content types and themes.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Limited competitor data',
      solution: 'Only public profile data is available.',
    },
  ],
};

export const abTestingTutorial: StageTutorial = {
  id: 'ab-testing',
  stageName: 'A/B Testing',
  title: 'Social Media A/B Testing',
  introduction: 'Test different content variations to optimize performance. Compare headlines, images, and copy to find what resonates best with your audience.',

  quickStart: [
    'Create a new A/B test',
    'Define your test variants (A and B)',
    'Set test duration and success metrics',
    'Launch your test',
    'Monitor results in real-time',
    'Apply learnings to future content',
  ],

  sections: [
    {
      title: 'Running Tests',
      content: 'Set up and manage content experiments.',
      steps: [
        {
          title: 'Create Test',
          description: 'Define what you want to test.',
        },
        {
          title: 'Create Variants',
          description: 'Build version A and version B.',
          tip: 'Change only one element per test.',
        },
        {
          title: 'Set Parameters',
          description: 'Choose duration and audience size.',
        },
        {
          title: 'Launch Test',
          description: 'Start the experiment.',
        },
        {
          title: 'Analyze Results',
          description: 'Review which variant won.',
        },
      ],
      terminology: [
        {
          term: 'A/B Test',
          definition: 'An experiment comparing two versions to see which performs better.',
        },
        {
          term: 'Variant',
          definition: 'One version of the content being tested.',
        },
        {
          term: 'Statistical Significance',
          definition: 'Confidence that results are not due to chance.',
        },
      ],
      tips: [
        'Test one element at a time for clear results.',
        'Run tests long enough for reliable data.',
        'Document and apply your learnings.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Results are inconclusive',
      solution: 'Increase sample size or test more significant differences.',
    },
  ],
};

export const engagementAutomationTutorial: StageTutorial = {
  id: 'engagement-automation',
  stageName: 'Engagement Automation',
  title: 'Social Engagement Automation',
  introduction: 'Automate routine engagement tasks. Set up rules for auto-responses, welcome messages, and engagement workflows.',

  quickStart: [
    'View existing automation rules',
    'Create new automation rules',
    'Define triggers (new follower, mention, etc.)',
    'Set up actions (send message, like, etc.)',
    'Test rules before activating',
    'Monitor automation performance',
  ],

  sections: [
    {
      title: 'Creating Automation Rules',
      content: 'Set up automated responses and actions.',
      steps: [
        {
          title: 'Create Rule',
          description: 'Start a new automation.',
        },
        {
          title: 'Define Trigger',
          description: 'Select what starts the automation.',
        },
        {
          title: 'Set Action',
          description: 'Choose what happens when triggered.',
        },
        {
          title: 'Add Conditions',
          description: 'Optional filters for the rule.',
        },
        {
          title: 'Activate Rule',
          description: 'Turn on the automation.',
        },
      ],
      terminology: [
        {
          term: 'Trigger',
          definition: 'The event that starts an automation (e.g., new follower).',
        },
        {
          term: 'Action',
          definition: 'What happens when triggered (e.g., send welcome message).',
        },
        {
          term: 'Automation Rule',
          definition: 'A defined trigger-action pair that runs automatically.',
        },
      ],
      tips: [
        'Start with simple automations.',
        'Personalize automated messages.',
        'Don\'t over-automate engagement.',
      ],
      warnings: [
        'Some platforms limit automation.',
        'Overly aggressive automation may be flagged.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Automation not triggering',
      solution: 'Check that the rule is active and conditions are met.',
    },
  ],
};

export const socialReportingTutorial: StageTutorial = {
  id: 'social-reports',
  stageName: 'Social Reports',
  title: 'Social Media Reporting',
  introduction: 'Generate comprehensive reports on your social media performance. Create custom reports, schedule delivery, and share insights with stakeholders.',

  quickStart: [
    'View available report templates',
    'Generate a new report',
    'Select date range and metrics',
    'Customize report sections',
    'Export as PDF, CSV, or Excel',
    'Schedule recurring reports',
  ],

  sections: [
    {
      title: 'Creating Reports',
      content: 'Build and customize performance reports.',
      steps: [
        {
          title: 'Choose Report Type',
          description: 'Select the type of report to generate.',
        },
        {
          title: 'Set Date Range',
          description: 'Choose the time period to analyze.',
        },
        {
          title: 'Select Metrics',
          description: 'Choose which metrics to include.',
        },
        {
          title: 'Generate Report',
          description: 'Create and review the report.',
        },
        {
          title: 'Export or Share',
          description: 'Download or send to stakeholders.',
        },
      ],
      terminology: [
        {
          term: 'KPI',
          definition: 'Key Performance Indicator - a measurable value showing progress.',
        },
        {
          term: 'Scheduled Report',
          definition: 'A report that generates and sends automatically at set intervals.',
        },
      ],
      tips: [
        'Create monthly reports for consistent tracking.',
        'Focus on metrics that align with goals.',
        'Include context and recommendations.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Report missing data',
      solution: 'Ensure accounts were connected during the report period.',
    },
  ],
};

// ============================================================================
// SYSTEM TUTORIALS
// ============================================================================

export const settingsTutorial: StageTutorial = {
  id: 'settings',
  stageName: 'Settings',
  title: 'Application Settings',
  introduction: 'Configure your Okyaku account and application preferences. Manage your profile, notifications, and integrations.',

  quickStart: [
    'Update your profile information',
    'Configure notification preferences',
    'Manage connected integrations',
    'Set your timezone and locale',
    'Update security settings',
    'Customize your dashboard layout',
  ],

  sections: [
    {
      title: 'Profile Settings',
      content: 'Manage your account information.',
      steps: [
        {
          title: 'Edit Profile',
          description: 'Update name, email, and profile picture.',
        },
        {
          title: 'Change Password',
          description: 'Update your account password.',
        },
        {
          title: 'Set Timezone',
          description: 'Ensure dates and times are correct.',
        },
      ],
      tips: [
        'Keep your profile information current.',
        'Use a strong, unique password.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Changes not saving',
      solution: 'Refresh the page and try again. Check your internet connection.',
    },
  ],
};

export const auditLogTutorial: StageTutorial = {
  id: 'audit-log',
  stageName: 'Audit Log',
  title: 'Activity Audit Log',
  introduction: 'Review all user actions and system changes. Track who did what and when for compliance and troubleshooting.',

  quickStart: [
    'View all system activities chronologically',
    'Filter by user, action type, or date',
    'Search for specific events',
    'Export logs for compliance',
    'Track login and security events',
    'Monitor data changes',
  ],

  sections: [
    {
      title: 'Using the Audit Log',
      content: 'Navigate and search the activity log.',
      steps: [
        {
          title: 'View Recent Activity',
          description: 'See the latest actions in the system.',
        },
        {
          title: 'Filter Events',
          description: 'Narrow down by user or action type.',
        },
        {
          title: 'Search Logs',
          description: 'Find specific events by keyword.',
        },
        {
          title: 'Export Data',
          description: 'Download logs for external analysis.',
        },
      ],
      terminology: [
        {
          term: 'Audit Log',
          definition: 'A chronological record of all system activities and changes.',
        },
        {
          term: 'Event',
          definition: 'A recorded action or change in the system.',
        },
      ],
      tips: [
        'Review logs regularly for security.',
        'Export logs for compliance requirements.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Cannot find specific event',
      solution: 'Adjust date range filters or search terms.',
    },
  ],
};

export const calendarSettingsTutorial: StageTutorial = {
  id: 'calendar-settings',
  stageName: 'Calendar Settings',
  title: 'Calendar Integration',
  introduction: 'Configure calendar integrations for scheduling and task management. Connect external calendars and set scheduling preferences.',

  quickStart: [
    'Connect your calendar (Google, Outlook)',
    'Set your working hours',
    'Configure scheduling availability',
    'Enable calendar sync',
    'Set reminder preferences',
    'Test the integration',
  ],

  sections: [
    {
      title: 'Calendar Integration',
      content: 'Connect and configure calendar services.',
      steps: [
        {
          title: 'Connect Calendar',
          description: 'Link Google Calendar or Outlook.',
        },
        {
          title: 'Set Working Hours',
          description: 'Define when you\'re available.',
        },
        {
          title: 'Configure Sync',
          description: 'Choose what to sync between systems.',
        },
      ],
      tips: [
        'Keep calendars synced for accurate scheduling.',
        'Set buffer time between meetings.',
      ],
    },
  ],

  commonIssues: [
    {
      problem: 'Calendar not syncing',
      solution: 'Re-authorize the calendar connection.',
    },
  ],
};

// ============================================================================
// TUTORIAL REGISTRY
// ============================================================================

export const allTutorials: Record<string, StageTutorial> = {
  // CRM
  'dashboard': dashboardTutorial,
  'contacts': contactsTutorial,
  'companies': companiesTutorial,
  'deals': dealsTutorial,
  'activities': activitiesTutorial,
  'tasks': tasksTutorial,
  // Email
  'email-campaigns': emailCampaignsTutorial,
  'email-templates': emailTemplatesTutorial,
  // Social
  'social-calendar': socialCalendarTutorial,
  'social-accounts': socialAccountsTutorial,
  'social-inbox': socialInboxTutorial,
  'social-analytics': socialAnalyticsTutorial,
  'ai-content': aiContentTutorial,
  'content-library': contentLibraryTutorial,
  'social-listening': socialListeningTutorial,
  'hashtag-research': hashtagResearchTutorial,
  'competitor-tracking': competitorTrackingTutorial,
  'ab-testing': abTestingTutorial,
  'engagement-automation': engagementAutomationTutorial,
  'social-reports': socialReportingTutorial,
  // System
  'settings': settingsTutorial,
  'audit-log': auditLogTutorial,
  'calendar-settings': calendarSettingsTutorial,
};

// Helper function to get tutorial for a stage
export function getTutorialForStage(stageId: string): StageTutorial | undefined {
  return allTutorials[stageId];
}

// Get all terminology from all tutorials (for global glossary)
export function getAllTerminology(): TerminologyItem[] {
  const terms: TerminologyItem[] = [];
  const seen = new Set<string>();

  Object.values(allTutorials).forEach(tutorial => {
    tutorial.sections.forEach(section => {
      section.terminology?.forEach(term => {
        if (!seen.has(term.term.toLowerCase())) {
          seen.add(term.term.toLowerCase());
          terms.push(term);
        }
      });
    });
  });

  return terms.sort((a, b) => a.term.localeCompare(b.term));
}
