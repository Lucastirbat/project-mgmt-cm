import type { AppData, Company } from './schema'

// ─── Personal Brand ───────────────────────────────────────────────────────────
// Exported so DataContext migrations can reference it without duplicating data.

export const PERSONAL_BRAND_COMPANY: Company = {
  id: 'personal-brand',
  name: 'Personal Brand',
  description: 'Personal visibility, content, networking, and public presence.',
  color: '#f472b6',
  emoji: '✨',
  projects: [
    {
      id: 'pb-founder-profile',
      name: 'Founder Profile',
      status: 'active',
      priority: 'high',
      description: 'Brand identity, positioning, and personal narrative.',
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: 'pb-b-statement',
          type: 'notes',
          title: 'Statement & Positioning',
          notes: `Every industry is like a video game. It has rules, hidden levels, mechanics you only discover by playing, and the full experience is what shapes you. That's how I think about building startups, designing events, and even creating games themselves. My work is about letting people live that experience instead of just reading the rulebook.

ROLES: Architect · Builder · Operator · Enabler → evolving into Capital Allocator

WORLD VIEW:
• Talent is equally distributed, opportunity is not
• The world should be run by young people
• Humans evolved through play

VALUE CREATED:
Shift your paradigm. The real question isn't 'how cool does this sound?' — it's 'who actually cares, and am I built for this?' I push you to ask the right questions so you can stop living in your head and start executing on what actually matters.

→ "We're reinventing X on paper" → "We're a company with users, traction, and a business model that works"
→ "I have the vision in my head" → "I have a real, working game"
→ "I think my Eastern European startup is strong" → "I've lived the SF benchmark and now know exactly where I stand"`,
        },
        {
          id: 'pb-b-recognition',
          type: 'notes',
          title: 'Recognition System',
          notes: `RECOGNITION SYSTEM PILLARS:
Pillars → craft ongoing questions → Input (main source) → Repurpose → timeline repurpose same info

1. EXPERTISE KEY ROLES
• Early stage startups (advice, tips, examples)
• Allocating capital (CEE/SF)
• Creating Experiences
• Building games

2. PROOF OF VALUE CREATED
• Advice → outcome for startups
• Results / Process Level 1
• Managing the YC for CEE startups → impact
• Outcome from talking with founders

3. REASONING / WORLD VIEW
• The world should be run by young people
• We learn by playing — don't chase the next Google

CONTENT THEMES:
• Evaluating New Startups (big potential / low potential)
• Discussing World/Startup Trends & News (good / bad for founders)
• Tools entrepreneurs should use (underrated / overrated)
• Good practices / bad practices

ONGOING CONTENT QUESTIONS:
1. What's a mistake I saw founders make today — and what is the fix?
2. What did I hear this week that's wrong / misleading?
3. What is a business model I found out about today?
4. What interesting product did I come across today?
5. What is a really good design I saw today?
6. What is a great event concept I encountered today?
7. What is an ad that caught my attention today?
8. Who did I talk to today that impressed me, and why?
9. Bonus: An acquisition / merger announcement you saw today?`,
        },
        {
          id: 'pb-b-inspiration',
          type: 'links',
          title: 'Instagram Examples',
          links: [
            { id: 'pb-l1', label: 'Reel — Industry as video game', url: 'https://www.instagram.com/reel/CJ6-xg2J3Zg/' },
            { id: 'pb-l2', label: 'Reel — Startup evaluation content', url: 'https://www.instagram.com/reel/DTWR4vPEj37/' },
            { id: 'pb-l3', label: 'Reel — World view content', url: 'https://www.instagram.com/reel/DT3X83OEsHt/' },
          ],
        },
      ],
    },
    {
      id: 'pb-content-calendar',
      name: 'Content Calendar',
      status: 'active',
      priority: 'high',
      description: 'Upcoming content by channel — LinkedIn, YouTube, and Newsletter.',
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: 'pb-b-linkedin',
          type: 'tasks',
          title: 'LinkedIn',
          tasks: [
            { id: 'pb-t-li1', text: 'Intro: from idea to traction', done: false, dueDate: '2026-01-06' },
            { id: 'pb-t-li2', text: 'Disclaimers: from Idea to traction', done: false, dueDate: '2026-01-08' },
            { id: 'pb-t-li3', text: 'Phase 1: Inspiration', done: false, dueDate: '2026-01-13' },
            { id: 'pb-t-li4', text: 'Phase 2: Postulation', done: false, dueDate: '2026-01-15' },
            { id: 'pb-t-li5', text: 'Phase 3: Ideation + Summary Next Phase', done: false, dueDate: '2026-01-21' },
            { id: 'pb-t-li6', text: 'Success metrics in experimentation', done: false },
            { id: 'pb-t-li7', text: 'Phase 4: persona and how might we approach', done: false },
            { id: 'pb-t-li8', text: 'Phase 5: explain the stages of validation and how to group insights', done: false },
            { id: 'pb-t-li9', text: 'Phase 6: validate the target and problem', done: false },
            { id: 'pb-t-li10', text: 'Phase 7: validate the problem-solution fit', done: false },
            { id: 'pb-t-li11', text: 'Validate Idea Stage', done: false, dueDate: '2026-01-25' },
            { id: 'pb-t-li12', text: 'Event Announcement', done: false, dueDate: '2026-01-26' },
            { id: 'pb-t-li13', text: 'About trip: connect me with people who...', done: false, dueDate: '2026-02-16' },
            { id: 'pb-t-li14', text: 'Correlation with ESE', done: false, dueDate: '2026-03-02' },
            { id: 'pb-t-li15', text: 'HMW Questions Event Concept', done: false, dueDate: '2026-03-04' },
            { id: 'pb-t-li16', text: 'Post Founders Compass NL', done: false, dueDate: '2026-03-05' },
          ],
        },
        {
          id: 'pb-b-youtube',
          type: 'tasks',
          title: 'YouTube',
          tasks: [
            { id: 'pb-t-yt1', text: 'How to build a startup in 48 hrs', done: false, dueDate: '2025-11-17' },
            { id: 'pb-t-yt2', text: 'Announcement series', done: false },
            { id: 'pb-t-yt3', text: 'Ideation Phase', done: false },
          ],
        },
        {
          id: 'pb-b-newsletter',
          type: 'tasks',
          title: 'NL Founders Compass',
          tasks: [
            { id: 'pb-t-nl1', text: 'WEEK 19-25 IAN', done: false },
            { id: 'pb-t-nl2', text: '11.01', done: false },
            { id: 'pb-t-nl3', text: '12.01', done: false },
            { id: 'pb-t-nl4', text: '13.01', done: false },
            { id: 'pb-t-nl5', text: '14.01', done: false },
            { id: 'pb-t-nl6', text: '15.01', done: false },
            { id: 'pb-t-nl7', text: '16.01', done: false },
            { id: 'pb-t-nl8', text: '17.01', done: false },
            { id: 'pb-t-nl9', text: '18.01', done: false },
            { id: 'pb-t-nl10', text: '19.0', done: false },
          ],
        },
      ],
    },
    {
      id: 'pb-content-pipeline',
      name: 'Content Pipeline',
      status: 'active',
      priority: 'high',
      description: 'Written pieces and video scripts in production.',
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: 'pb-b-written',
          type: 'tasks',
          title: 'Written',
          tasks: [
            { id: 'pb-t-w1', text: 'Level one Co-Founder', done: false },
            { id: 'pb-t-w2', text: 'Europeans need a culture of positivism to start', done: false },
            { id: 'pb-t-w3', text: 'Me building startups: what I learned from each', done: false },
            { id: 'pb-t-w4', text: 'Update Itinerary CEE', done: false },
            { id: 'pb-t-w5', text: 'CEE Ed System', done: false },
            { id: 'pb-t-w6', text: 'RX batch comes when investors are not in SF', done: false },
            { id: 'pb-t-w7', text: 'What happens after SF (RX)', done: false },
            { id: 'pb-t-w8', text: 'Hire Slow', done: false },
            { id: 'pb-t-w9', text: 'Announce the fund W Carta', done: false },
            { id: 'pb-t-w10', text: 'Conv with Marek', done: false },
            { id: 'pb-t-w11', text: 'Open AI raising money', done: false },
            { id: 'pb-t-w12', text: 'Lawsuit JacqueBox', done: true },
          ],
        },
        {
          id: 'pb-b-video',
          type: 'tasks',
          title: 'Video Scripts',
          tasks: [
            { id: 'pb-t-v1', text: 'HMW Questions Event Concept', done: false },
            { id: 'pb-t-v2', text: 'ReaktorX growth over the year (key milestones) and expectation this year', done: false },
            { id: 'pb-t-v3', text: 'Lovable x RX', done: false },
            { id: 'pb-t-v4', text: 'The process founders go through in Europe', done: false },
            { id: 'pb-t-v5', text: 'How to Live in Silicon Valley guide (1)', done: false },
            { id: 'pb-t-v6', text: 'Fundraising Brand VS Proof', done: false },
            { id: 'pb-t-v7', text: 'Overrated/underrated vibe coding', done: false },
            { id: 'pb-t-v8', text: 'Overrated/underrated automation tools', done: false },
            { id: 'pb-t-v9', text: 'Overrated/underrated internet glue', done: false },
            { id: 'pb-t-v10', text: 'Overrated/underrated visibility on the internet', done: false },
            { id: 'pb-t-v11', text: 'Selection Thought', done: false },
          ],
        },
      ],
    },
    {
      id: 'pb-resources',
      name: 'Resources',
      status: 'active',
      priority: 'medium',
      description: 'Media assets, brand files, and reference materials.',
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: 'pb-b-drive',
          type: 'sheets',
          title: 'Media & Assets (Drive)',
          sheetsUrl: 'https://drive.google.com/embeddedfolderview?id=12v6pd6eqYpzES6Pa0QgPgkMOulvEoS1E',
          sheetsEditUrl: 'https://drive.google.com/drive/folders/12v6pd6eqYpzES6Pa0QgPgkMOulvEoS1E',
        },
        {
          id: 'pb-b-links',
          type: 'links',
          title: 'Key Links',
          links: [
            { id: 'pb-kl1', label: 'Instagram Reel — Industry as video game', url: 'https://www.instagram.com/reel/CJ6-xg2J3Zg/' },
            { id: 'pb-kl2', label: 'Instagram Reel — Startup evaluation content', url: 'https://www.instagram.com/reel/DTWR4vPEj37/' },
            { id: 'pb-kl3', label: 'Instagram Reel — World view content', url: 'https://www.instagram.com/reel/DT3X83OEsHt/' },
          ],
        },
      ],
    },
  ],
}

export const SEED_DATA: AppData = {
  companies: [
    {
      id: 'reaktorx',
      name: 'ReaktorX',
      description: 'VC fund investing in deep tech and frontier science.',
      color: '#a78bfa',
      emoji: '⚡',
      logoUrl: 'https://reaktorx.com/wp-content/uploads/2022/10/cropped-Group-1-5-1.png',
      projects: [
        {
          id: 'raising-fund',
          name: 'Raising the Fund',
          status: 'active',
          priority: 'high',
          description: 'Closing the pre-seed/seed fund. Targeting LPs, structuring the vehicle, finalising legal docs.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b1',
              type: 'kpi',
              title: 'Fund Metrics',
              kpis: [
                { id: 'k1', label: 'Target Size', value: '—', trend: 'flat' },
                { id: 'k2', label: 'Commitments', value: '—', trend: 'flat' },
                { id: 'k3', label: 'LPs in Pipeline', value: '—', trend: 'flat' },
              ],
            },
            {
              id: 'b2',
              type: 'tasks',
              title: 'Next Actions',
              tasks: [
                { id: 't1', text: 'Finalise fund structure with lawyers', done: false },
                { id: 't2', text: 'Prepare LP deck', done: false },
                { id: 't3', text: 'Outreach to anchor LPs', done: false },
              ],
            },
            {
              id: 'b3',
              type: 'links',
              title: 'Resources',
              links: [],
            },
            {
              id: 'b-sheet-rx',
              type: 'sheets',
              title: 'Fund Sheet',
              sheetsUrl:
                'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCXmGXeAkYg4yWrt20Y-bCY5CttBpBeXwwNTmSRAMFMCcCYOvTJR2RS0FiOqAu3iVjUdQn25vjR5Ty/pubhtml?widget=true&headers=false',
            },
          ],
        },
        {
          id: 'portfolio-companies',
          name: 'Portfolio Companies',
          status: 'active',
          priority: 'high',
          description: 'Supporting portfolio companies with fundraising, hiring, strategy, and introductions.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b1',
              type: 'tasks',
              title: 'Active Support',
              tasks: [
                { id: 't1', text: 'Add portfolio companies here', done: false },
              ],
            },
            {
              id: 'b2',
              type: 'notes',
              title: 'Notes',
              notes: 'Track portfolio companies and their current needs here.',
            },
          ],
        },
        {
          id: 'events-calendar',
          name: 'Events Calendar',
          status: 'active',
          priority: 'medium',
          description: 'Upcoming ReaktorX events.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b-cal-rx',
              type: 'calendar',
              title: 'Events',
              calendarUrl: 'https://luma.com/embed/calendar/cal-wX9FCql5TyxdFtJ/events',
            },
          ],
        },
        {
          id: 'website-redo',
          name: 'Website Redo',
          status: 'planning',
          priority: 'medium',
          description: 'Redesign and rebuild the ReaktorX website to reflect the fund identity.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b1',
              type: 'tasks',
              title: 'Tasks',
              tasks: [
                { id: 't1', text: 'Define brand guidelines', done: false },
                { id: 't2', text: 'Brief designer', done: false },
                { id: 't3', text: 'Review copy', done: false },
                { id: 't4', text: 'Build & launch', done: false },
              ],
            },
            {
              id: 'b2',
              type: 'links',
              title: 'References',
              links: [],
            },
          ],
        },
      ],
    },
    {
      id: 'creative-motion',
      name: 'Creative Motion',
      description: 'Creative studio building workshops, client projects, and original IP.',
      color: '#7c3aed',
      emoji: '⚙',
      projects: [
        {
          id: 'workshops',
          name: 'Workshops',
          status: 'active',
          priority: 'high',
          description: 'Planning, running, and iterating on public and corporate workshops.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b1',
              type: 'kpi',
              title: 'Workshop Stats',
              kpis: [
                { id: 'k1', label: 'Upcoming', value: '—' },
                { id: 'k2', label: 'Attendees YTD', value: '—' },
                { id: 'k3', label: 'Revenue YTD', value: '—', trend: 'flat' },
              ],
            },
            {
              id: 'b2',
              type: 'tasks',
              title: 'Next Up',
              tasks: [
                { id: 't1', text: 'Add upcoming workshop details', done: false },
              ],
            },
          ],
        },
        {
          id: 'clients',
          name: 'Clients',
          status: 'active',
          priority: 'high',
          description: 'Active client engagements — creative direction, production, brand strategy.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b1',
              type: 'tasks',
              title: 'Active Clients',
              tasks: [
                { id: 't1', text: 'Add active clients here', done: false },
              ],
            },
            {
              id: 'b2',
              type: 'notes',
              title: 'Notes',
              notes: '',
            },
          ],
        },
        {
          id: 'creating-ip',
          name: 'Creating IP',
          status: 'planning',
          priority: 'medium',
          description: 'Building original intellectual property — courses, frameworks, products.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b1',
              type: 'tasks',
              title: 'Ideas & Actions',
              tasks: [
                { id: 't1', text: 'List IP ideas', done: false },
                { id: 't2', text: 'Prioritise and pick one to start', done: false },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'eu-startup-embassy',
      name: 'European Startup Embassy',
      description: 'Community hub for European startups — events, programs, and the space itself.',
      color: '#4ade80',
      emoji: '🏛',
      logoUrl: 'https://europeanstartupembassy.com/wp-content/uploads/2025/09/ESE-Logo-Basic.svg',
      projects: [
        {
          id: 'events',
          name: 'Events',
          status: 'active',
          priority: 'high',
          description: 'Organising and running community events, meetups, and conferences.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b1',
              type: 'kpi',
              title: 'Event Stats',
              kpis: [
                { id: 'k1', label: 'Events This Quarter', value: '—' },
                { id: 'k2', label: 'Total Attendees', value: '—' },
              ],
            },
            {
              id: 'b2',
              type: 'tasks',
              title: 'Upcoming Events',
              tasks: [
                { id: 't1', text: 'Add upcoming events here', done: false },
              ],
            },
            {
              id: 'b-cal-eu',
              type: 'calendar',
              title: 'Events Calendar',
              calendarUrl: 'https://luma.com/embed/calendar/cal-04KinE3PojvsYbV/events',
            },
          ],
        },
        {
          id: 'projects',
          name: 'Programs & Projects',
          status: 'active',
          priority: 'medium',
          description: 'Startup programs, partnerships, and strategic initiatives.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b1',
              type: 'tasks',
              title: 'Active Initiatives',
              tasks: [
                { id: 't1', text: 'Add active programs and projects', done: false },
              ],
            },
            {
              id: 'b2',
              type: 'notes',
              title: 'Notes',
              notes: '',
            },
          ],
        },
        {
          id: 'house-improvements',
          name: 'House Improvements',
          status: 'planning',
          priority: 'low',
          description: 'Physical space upgrades, equipment, facilities, and maintenance.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b1',
              type: 'tasks',
              title: 'Improvement List',
              tasks: [
                { id: 't1', text: 'Add improvement items', done: false },
              ],
            },
            {
              id: 'b2',
              type: 'kpi',
              title: 'Budget',
              kpis: [
                { id: 'k1', label: 'Budget Available', value: '—' },
                { id: 'k2', label: 'Spent', value: '—' },
              ],
            },
          ],
        },
      ],
    },
    PERSONAL_BRAND_COMPANY,
    {
      id: 'jacquebox',
      name: 'Jacquebox',
      description: 'Startup — building the product, growing the team, shipping fast.',
      color: '#16a34a',
      emoji: '🚀',
      logoUrl: 'https://jacquebox.com/logo.png',
      projects: [
        {
          id: 'product-development',
          name: 'Product Development',
          status: 'active',
          priority: 'high',
          description: 'Core product development — features, bugs, roadmap, and shipping.',
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b1',
              type: 'github',
              title: 'GitHub',
              repoUrl: '',
              repoName: 'jacquebox/jacquebox',
            },
            {
              id: 'b2',
              type: 'kpi',
              title: 'Product Metrics',
              kpis: [
                { id: 'k1', label: 'Users', value: '—', trend: 'flat' },
                { id: 'k2', label: 'MRR', value: '—', trend: 'flat' },
                { id: 'k3', label: 'Open Issues', value: '—' },
              ],
            },
            {
              id: 'b3',
              type: 'tasks',
              title: 'Sprint',
              tasks: [
                { id: 't1', text: 'Add current sprint tasks', done: false },
              ],
            },
          ],
        },
      ],
    },
  ],
  socialMedia: {
    managerName: 'Social Media Manager',
    notionUrl: '',
    platforms: [
      { id: 'p1', companyId: 'reaktorx', platform: 'LinkedIn', handle: '', status: 'planned' },
      { id: 'p2', companyId: 'reaktorx', platform: 'X / Twitter', handle: '', status: 'planned' },
      { id: 'p3', companyId: 'creative-motion', platform: 'Instagram', handle: '', status: 'planned' },
      { id: 'p4', companyId: 'creative-motion', platform: 'LinkedIn', handle: '', status: 'planned' },
      { id: 'p5', companyId: 'creative-motion', platform: 'X / Twitter', handle: '', status: 'planned' },
      { id: 'p6', companyId: 'eu-startup-embassy', platform: 'LinkedIn', handle: '', status: 'planned' },
      { id: 'p7', companyId: 'eu-startup-embassy', platform: 'Instagram', handle: '', status: 'planned' },
      { id: 'p8', companyId: 'jacquebox', platform: 'LinkedIn', handle: '', status: 'planned' },
      { id: 'p9', companyId: 'jacquebox', platform: 'X / Twitter', handle: '', status: 'planned' },
    ],
  },
}
