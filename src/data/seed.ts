import type { AppData } from './schema'

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
