"use client"

import { useState } from "react"
import { Gavel as GavelIcon, Bell, Users } from "lucide-react"

// Sub-tab components
import { ReviewerAssignment } from "./reviewer-assignment"
import { AuthorNotificationWizard } from "./author-notification-wizard"
import { BiddingManagement } from "./bidding-management"

interface ReviewManagementProps {
    conferenceId: number
}

type SubTab = "manage-reviewers" | "bidding-assignment" | "aggregates"

const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: "manage-reviewers", label: "Manage Reviewers", icon: <Users className="h-4 w-4" /> },
    { key: "bidding-assignment", label: "Bidding & Assignment", icon: <GavelIcon className="h-4 w-4" /> },
    { key: "aggregates", label: "Assessment & Notification", icon: <Bell className="h-4 w-4" /> },
]

export function ReviewManagement({ conferenceId }: ReviewManagementProps) {
    const [activeTab, setActiveTab] = useState<SubTab>("manage-reviewers")

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold mb-1">Review Management</h2>
                <p className="text-sm text-muted-foreground">
                    Manage reviewers, bidding, assign reviewers, and handle assessment notifications.
                </p>
            </div>

            {/* Horizontal sub-tabs */}
            <div className="flex gap-1 border-b pb-0">
                {SUB_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === tab.key
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === "manage-reviewers" && (
                    <BiddingManagement conferenceId={conferenceId} />
                )}
                {activeTab === "bidding-assignment" && (
                    <ReviewerAssignment conferenceId={conferenceId} />
                )}
                {activeTab === "aggregates" && (
                    <AuthorNotificationWizard conferenceId={conferenceId} />
                )}
            </div>
        </div>
    )
}
