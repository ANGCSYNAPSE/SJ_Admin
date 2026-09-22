import { useEffect, useState } from 'react'
import {
  Building,
  Calendar,
  FileText,
  Heart,
  MessageSquare,
  SquarePen,
  User,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchDashboard } from '../../api/dashboard'
import { apiErrorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { StatCard } from '../../components/dashboard/StatCard'
import { DonationTrendChart } from '../../components/dashboard/DonationTrendChart'
import { ActivityFeed } from '../../components/dashboard/ActivityFeed'
import { formatCount, formatRupeesShort } from '../../lib/format'
import type { DashboardPayload } from '../../types/api'

export function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchDashboard()
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load dashboard data.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return <p className="text-sm text-muted">Loading dashboard…</p>
  }

  if (error || !data) {
    return <p className="text-sm text-red-600">{error ?? 'Failed to load dashboard data.'}</p>
  }

  const { stats, donationTrends, activity } = data
  const donationGrowth =
    stats.donations.lastMonthRupees > 0
      ? Math.round(
          ((stats.donations.thisMonthRupees - stats.donations.lastMonthRupees) / stats.donations.lastMonthRupees) *
            100,
        )
      : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[28px] font-bold text-maroon">
            Jai Shree Shyam, {user?.fullName?.split(' ')[0] ?? 'Admin'}
          </p>
          <p className="text-[13px] text-body">System status normal. All operations synced.</p>
        </div>
        <div className="flex items-start gap-3">
          <Link
            to="/blog-posts/new"
            className="rounded-lg bg-orange px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            Add Blog Post
          </Link>
          <Link
            to="/events/new"
            className="rounded-lg bg-maroon px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            Create Event
          </Link>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="cursor-not-allowed rounded-lg border border-header-border bg-white px-4 py-2.5 text-xs font-semibold text-heading opacity-60"
          >
            Sync Live Aarti
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <StatCard
            label="Total Temples Registered"
            value={formatCount(stats.temples.total)}
            icon={Building}
            delta={`↑ ${stats.temples.newThisWeek} new this week`}
          />
          <StatCard
            label="Total Artists Listed"
            value={formatCount(stats.artists.total)}
            icon={Users}
            delta={`↑ ${stats.artists.pendingApproval} pending approval`}
          />
          <StatCard
            label="Total Donations"
            value={formatRupeesShort(stats.donations.totalRupees)}
            icon={Heart}
            delta={donationGrowth !== null ? `${donationGrowth >= 0 ? '↑' : '↓'} ${Math.abs(donationGrowth)}% vs last month` : undefined}
            caption={donationGrowth === null ? 'No prior month data yet' : undefined}
          />
          <StatCard
            label="Active Communities"
            value={`${formatCount(stats.communities.total)} Groups`}
            icon={MessageSquare}
            caption={`${formatCount(stats.communities.dailyDiscussions)} active daily discussions`}
          />
        </div>

        <div className="flex gap-4">
          <StatCard
            label="Active Events"
            value={`${formatCount(stats.events.activeOrUpcoming)} Live`}
            icon={Calendar}
          />
          <StatCard
            label="Blog Posts Published"
            value={`${formatCount(stats.blogPosts.published)} Articles`}
            icon={SquarePen}
          />
          <StatCard label="Registered Users" value={formatCount(stats.users.total)} icon={User} />
          <StatCard
            label="Pending Registrations"
            value={`${formatCount(stats.registrations.pending)} Verification`}
            icon={FileText}
            caption="Requires manual audit"
          />
        </div>

        <div className="flex gap-4">
          <StatCard
            label="Dharamshalas"
            value={`${formatCount(stats.dharamshalas.total)} Listed`}
            icon={Calendar}
          />
          <StatCard
            label="Organisations"
            value={`${formatCount(stats.organisations.total)} Active`}
            icon={SquarePen}
            delta={`↑ ${stats.organisations.newThisMonth} new partnerships this month`}
          />
          <StatCard
            label="Advertisements"
            value={`${formatCount(stats.ads.active)} Active`}
            icon={User}
            delta={`↑ ${stats.ads.newThisWeek} new campaigns this week`}
          />
          <StatCard
            label="Volunteers"
            value={formatCount(stats.volunteers.total)}
            icon={FileText}
            delta={`↑ ${stats.volunteers.newThisQuarter} joined this quarter`}
          />
        </div>
      </div>

      <div className="flex gap-6">
        <DonationTrendChart data={donationTrends} />
        <ActivityFeed items={activity} />
      </div>
    </div>
  )
}
